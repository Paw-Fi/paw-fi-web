// Supabase Edge Function: verify-telegram-binding
// Verifies OTP and binds Telegram chat to user account

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../shared/cors.ts";
import { isFreeUser } from "../shared/is-free-user.ts";

interface UserContactRow {
  id: string;
  user_id: string | null;
  phone_e164: string | null;
  telegram_chat_id: string | null;
  telegram_user_id: string | null;
  whatsapp_user_id: string | null;
  verified: boolean | null;
}

async function selectBestContactForUser(
  supabase: any,
  userId: string,
): Promise<UserContactRow | null> {
  // Prefer a contact row that already has a phone_e164 (it is the WhatsApp lookup key).
  const preferred = await supabase
    .from("user_contacts")
    .select(
      "id, user_id, phone_e164, telegram_chat_id, telegram_user_id, whatsapp_user_id, verified",
    )
    .eq("user_id", userId)
    .not("phone_e164", "is", null)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (preferred.error) {
    console.error(
      "[verify-telegram-binding] contact select error",
      preferred.error,
    );
    return null;
  }
  if (preferred.data) return preferred.data as UserContactRow;

  const fallback = await supabase
    .from("user_contacts")
    .select(
      "id, user_id, phone_e164, telegram_chat_id, telegram_user_id, whatsapp_user_id, verified",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallback.error) {
    console.error(
      "[verify-telegram-binding] contact select error",
      fallback.error,
    );
    return null;
  }
  return (fallback.data as UserContactRow) ?? null;
}

async function mergeContacts(
  supabase: any,
  primaryContactId: string,
  secondaryContactId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("merge_user_contacts", {
    p_primary_contact_id: primaryContactId,
    p_secondary_contact_id: secondaryContactId,
  });

  if (error) {
    console.error("[verify-telegram-binding] merge_user_contacts error", error);
    return false;
  }

  if (data && (data as any).success === false) {
    console.error(
      "[verify-telegram-binding] merge_user_contacts failed",
      (data as any).error,
    );
    return false;
  }

  return true;
}

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

async function sendTelegramPhoto(
  token: string,
  chatId: number,
  photoUrl: string,
  caption?: string,
) {
  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      ...(caption ? { caption } : {}),
    }),
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

    const { data: claimedVerification, error: claimError } = await supabase
      .from("whatsapp_verifications")
      .update({ verified: true, user_id: user.id })
      .eq("id", verification.id)
      .eq("verified", false)
      .select("id, subject")
      .maybeSingle();

    if (claimError || !claimedVerification) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const subject = String(
      claimedVerification.subject || verification.subject || "",
    );
    const chatId = Number(subject.replace("telegram:", ""));

    let upsertError: unknown = null;
    if (Number.isFinite(chatId)) {
      const chatIdText = String(chatId);
      const { data: chatBinding } = await supabase
        .from("user_contacts")
        .select(
          "id, user_id, phone_e164, telegram_chat_id, telegram_user_id, whatsapp_user_id, verified",
        )
        .eq("telegram_chat_id", chatIdText)
        .maybeSingle();

      const existingContact = await selectBestContactForUser(supabase, user.id);

      // Choose a primary row that already owns phone_e164 (avoids unique conflicts)
      // and merge the other row into it.
      const chatRow = (chatBinding as UserContactRow) ?? null;
      const userRow = existingContact;
      const nowIso = new Date().toISOString();

      if (userRow?.id && chatRow?.id && userRow.id !== chatRow.id) {
        const primary = userRow.phone_e164 ? userRow : chatRow;
        const secondary = primary.id === userRow.id ? chatRow : userRow;

        // Ensure the primary contact is linked and carries the telegram chat id.
        const updatePrimary = await supabase
          .from("user_contacts")
          .update({
            user_id: user.id,
            telegram_chat_id: chatIdText,
            verified: true,
            updated_at: nowIso,
          })
          .eq("id", primary.id);

        if (updatePrimary.error) {
          upsertError = updatePrimary.error;
        } else {
          const merged = await mergeContacts(
            supabase,
            primary.id,
            secondary.id,
          );
          if (!merged) {
            upsertError = { message: "Failed to merge user contacts" };
          }
        }
      } else if (userRow?.id) {
        // Update existing user contact row (Telegram first/only).
        const res = await supabase
          .from("user_contacts")
          .update({
            telegram_chat_id: chatIdText,
            verified: true,
            updated_at: nowIso,
          })
          .eq("id", userRow.id);
        upsertError = res.error;
      } else if (chatRow?.id) {
        // Allow rebind: attach this chat to the current user.
        const res = await supabase
          .from("user_contacts")
          .update({
            user_id: user.id,
            verified: true,
            updated_at: nowIso,
          })
          .eq("id", chatRow.id);
        upsertError = res.error;
      } else {
        // No contact exists yet; create one for Telegram.
        const res = await supabase.from("user_contacts").insert({
          user_id: user.id,
          telegram_chat_id: chatIdText,
          verified: true,
          updated_at: nowIso,
        });
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
        const onboardingText =
          "👋 Hi! I’m Moneko, your personal budgeting assistant.\n\n" +
          "Snap a photo of your receipt or\n" +
          "type something like “spent 3 on coffee” — I’ll handle the rest!";

        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, onboardingText);

        // Best-effort: include a receipt-upload example image (Telegram supports URL photos).
        await sendTelegramPhoto(
          TELEGRAM_BOT_TOKEN,
          chatId,
          "https://pbopcsmrcykdzbilpilf.supabase.co/storage/v1/object/public/web/Image_20251009092544_21_329.png",
          "📸 Receipt upload\nLog your expenses by simply snapping a photo of your receipt!",
        );

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
