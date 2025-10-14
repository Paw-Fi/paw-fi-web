// Supabase Edge Function: verify-whatsapp-binding
// Verifies OTP and binds WhatsApp number to user account

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../shared/cors.ts";
import { TWILIO_TEMPLATES } from "../shared/twilio-templates.ts";
import { isFreeUser } from "../shared/is-free-user.ts";

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req.headers.get("Origin") ?? undefined);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

  try {
    const { code } = await req.json();

    // Convert code to string and validate
    const codeStr = code ? String(code).trim() : '';
    
    if (!codeStr) {
      return new Response(JSON.stringify({ error: "Verification code is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Find valid verification (user_id is null when created from WhatsApp)
    const { data: verification, error: verifyError } = await supabase
      .from("whatsapp_verifications")
      .select("*")
      .eq("verification_code", codeStr)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (verifyError || !verification) {
      console.error('Verification lookup error:', verifyError);
      return new Response(JSON.stringify({ error: "Invalid or expired verification code" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Mark verification as used and link to user
    await supabase
      .from("whatsapp_verifications")
      .update({ 
        verified: true,
        user_id: user.id 
      })
      .eq("id", verification.id);

    // Bind phone to user in user_contacts
    const { error: upsertError } = await supabase
      .from("user_contacts")
      .upsert(
        {
          phone_e164: verification.phone_e164,
          user_id: user.id,
          verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone_e164" }
      );

    if (upsertError) {
      console.error("Failed to bind phone:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to bind WhatsApp number" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Send onboarding message to WhatsApp after successful verification
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

      // Send onboarding message using Twilio Content Template
      const twilioParams: Record<string, string> = {
        To: `whatsapp:${verification.phone_e164}`,
        ContentSid: TWILIO_TEMPLATES.ONBOARDING,
      };

      if (TWILIO_MESSAGING_SERVICE_SID) {
        twilioParams.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
      } else {
        return new Response(JSON.stringify({ error: "Missing Messaging Service SID" }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const twilioBody = new URLSearchParams(twilioParams);

      await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: twilioBody.toString(),
      });

      // Check if user is on free plan and send NON_SUBSCRIBER message
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (isFreeUser(subscription)) {
        console.log(`[verify-whatsapp-binding] User ${user.id} is on free plan, sending NON_SUBSCRIBER template`);

        // Send NON_SUBSCRIBER template using the same method as onboarding
        const nonSubscriberParams: Record<string, string> = {
          To: `whatsapp:${verification.phone_e164}`,
          ContentSid: TWILIO_TEMPLATES.NON_SUBSCRIBER,
          MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        };

        const nonSubscriberBody = new URLSearchParams(nonSubscriberParams);

        const nonSubscriberResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${twilioAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: nonSubscriberBody.toString(),
        });

        if (nonSubscriberResponse.ok) {
          const result = await nonSubscriberResponse.json();
          console.log(`[verify-whatsapp-binding] NON_SUBSCRIBER template sent successfully: ${result.sid}`);
        } else {
          const errorText = await nonSubscriberResponse.text();
          console.error(`[verify-whatsapp-binding] Failed to send NON_SUBSCRIBER template:`, errorText);
        }
      } else {
        console.log(`[verify-whatsapp-binding] User ${user.id} is not on free plan, skipping NON_SUBSCRIBER template`);
      }
    } catch (twilioError) {
      // Don't fail the verification if message sending fails
      console.error("Failed to send onboarding message:", twilioError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        phone: verification.phone_e164,
        message: "WhatsApp number verified and linked successfully",
      }),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
