// Supabase Edge Function: verify-telegram-binding
// Verifies OTP and binds Telegram chat to user account

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../shared/cors.ts";
import { isFreeUser } from "../shared/is-free-user.ts";

async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return res.ok;
}

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
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

  try {
    const { code } = await req.json();
    const codeStr = code ? String(code).trim() : "";
    if (!codeStr) {
      return new Response(
        JSON.stringify({ error: "Verification code is required" }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: verification, error: verifyError } = await supabase
      .from("whatsapp_verifications")
      .select("*")
      .eq("channel", "telegram")
      .eq("verification_code", codeStr)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (verifyError || !verification) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    await supabase
      .from("whatsapp_verifications")
      .update({ verified: true, user_id: user.id })
      .eq("id", verification.id);

    const subject = String(verification.subject || "");
    const chatId = Number(subject.replace("telegram:", ""));

    let upsertError: any = null;
    if (Number.isFinite(chatId)) {
      const { data: existingContact } = await supabase
        .from("user_contacts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingContact?.id) {
        const res = await supabase
          .from("user_contacts")
          .update({
            telegram_chat_id: String(chatId),
            verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingContact.id);
        upsertError = res.error;
      } else {
        const res = await supabase.from("user_contacts").upsert(
          {
            user_id: user.id,
            telegram_chat_id: String(chatId),
            verified: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "telegram_chat_id" },
        );
        upsertError = res.error;
      }
    } else {
      upsertError = { message: "Invalid telegram chat id" };
    }

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: "Failed to bind Telegram chat" }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    try {
      if (Number.isFinite(chatId)) {
        const onboarding =
          "✅ You're verified! You can now message me with expenses, budgets, and more.";
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, onboarding);

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user.id)
          .maybeSingle();
        if (isFreeUser(subscription)) {
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            "You're on the free plan. Upgrade to unlock full features.",
          );
        }
      }
    } catch (error) {
      console.error("Failed to send Telegram onboarding:", error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Telegram chat verified and linked successfully",
      }),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
