import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TwilioSMSWebhookParams {
  MessageSid: string;
  SmsSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  NumSegments: string;
  // Media parameters (if present)
  MediaContentType0?: string;
  MediaUrl0?: string;
  // Geographic data
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
  ToCity?: string;
  ToState?: string;
  ToZip?: string;
  ToCountry?: string;
  // Additional fields
  SmsStatus?: string;
  ApiVersion?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Twilio SMS Receiver Webhook ===");
    console.log("Method:", req.method);
    console.log("URL:", req.url);

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse the form data from Twilio
    const formData = await req.formData();
    const params: Record<string, string> = {};

    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    console.log("=== INCOMING SMS MESSAGE ===");
    console.log("MessageSid:", params.MessageSid);
    console.log("From:", params.From);
    console.log("To:", params.To);
    console.log("Body:", params.Body);
    console.log("NumMedia:", params.NumMedia);
    console.log("NumSegments:", params.NumSegments);
    console.log("AccountSid:", params.AccountSid);
    console.log("MessagingServiceSid:", params.MessagingServiceSid || "N/A");
    console.log("SmsStatus:", params.SmsStatus || "N/A");

    // Log geographic data if available
    if (params.FromCity || params.FromState || params.FromCountry) {
      console.log("=== Geographic Data (From) ===");
      console.log("City:", params.FromCity || "N/A");
      console.log("State:", params.FromState || "N/A");
      console.log("Zip:", params.FromZip || "N/A");
      console.log("Country:", params.FromCountry || "N/A");
    }

    if (params.ToCity || params.ToState || params.ToCountry) {
      console.log("=== Geographic Data (To) ===");
      console.log("City:", params.ToCity || "N/A");
      console.log("State:", params.ToState || "N/A");
      console.log("Zip:", params.ToZip || "N/A");
      console.log("Country:", params.ToCountry || "N/A");
    }

    // Log media if present
    if (params.NumMedia && parseInt(params.NumMedia) > 0) {
      console.log("=== Media Attachments ===");
      for (let i = 0; i < parseInt(params.NumMedia); i++) {
        console.log(`Media ${i}:`);
        console.log(`  ContentType: ${params[`MediaContentType${i}`] || "N/A"}`);
        console.log(`  URL: ${params[`MediaUrl${i}`] || "N/A"}`);
      }
    }

    // Log all parameters for debugging
    console.log("=== All Parameters ===");
    console.log(JSON.stringify(params, null, 2));

    // Check if this is a 2FA code (common patterns)
    const body = params.Body || "";
    const is2FACode = /\b\d{4,8}\b/.test(body) || 
                      /verification code/i.test(body) ||
                      /authentication code/i.test(body) ||
                      /OTP/i.test(body) ||
                      /one-time password/i.test(body);

    if (is2FACode) {
      console.log("🔐 POTENTIAL 2FA CODE DETECTED!");
      console.log("Message Body:", body);
      
      // Extract potential codes
      const codeMatches = body.match(/\b\d{4,8}\b/g);
      if (codeMatches) {
        console.log("Extracted Codes:", codeMatches.join(", "));
      }
    }

    // Respond to Twilio with TwiML (empty response = no reply)
    // You can uncomment below to send an auto-reply
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

    // Alternative: Send a reply message
    // const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
    // <Response>
    //   <Message>Message received: ${params.Body}</Message>
    // </Response>`;

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("Error processing SMS webhook:", error);
    
    // Always return 200 to Twilio to prevent retries
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/xml",
        },
      }
    );
  }
});
