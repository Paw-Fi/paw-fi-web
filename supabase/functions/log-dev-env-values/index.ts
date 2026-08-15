import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../shared/cors.ts";

const requestedEnvKeys = [
  "GEMINI_API_KEY",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
  "ALLOWED_ORIGINS",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_MONTHLY_PLUS_PLAN_ID",
  "STRIPE_YEARLY_PLUS_PLAN_ID",
  "STRIPE_LIFETIME_PRICE_ID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WEBHOOK_URL",
  "DEBUG_LOG",
  "TWILIO_ACCOUNT_SID",
  "HELP_IMAGE_URL",
  "TWILIO_MESSAGING_SERVICE_SID",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "FIREBASE_PROJECT_ID",
  "IOS_BUNDLE_ID",
  "STRIPE_REFERRAL_PROMO_CODE_ID",
  "WHATSAPP_DEBUG",
  "SECRET_API_KEY",
  "PLAID_CLIENT_ID",
  "PLAID_SECRET",
  "PLAID_ENV",
  "PLAID_ENCRYPTION_KEY",
  "PLAID_COUNTRY_CODES",
  "APP_STORE_SHARED_SECRET",
  "APPLE_BUNDLE_ID",
  "APPLE_APP_ID",
  "APPLE_APP_STORE_ISSUER_ID",
  "APPLE_APP_STORE_KEY_ID",
  "APPLE_APP_STORE_PRIVATE_KEY",
  "ENV",
  "GOOGLE_CLOUD_SERVICE_ACCOUNT",
  "ANALYZE_EXPENSE_DEBUG",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "TELEGRAM_VERIFICATION_BASE_URL",
  "ANALYZE_PREF_DEBUG",
  "DEBUG_WHATSAPP_RATE_LIMIT",
  "PAYWALL_RETURN_THRESHOLD_MINUTES",
  "SUBSCRIPTION_FOLLOWUP_DELAY_MINUTES",
  "INTERNAL_SERVICE_SECRET",
  "SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
  "MONEKO_DEBUG_LOGS",
  "RESEND_WEBHOOK_SECRET",
  "EMAIL_IMPORT_INBOX_EMAIL",
] as const;

const keysToLog = requestedEnvKeys.filter(
  (key) => !key.startsWith("SUPABASE_"),
);

function shellQuote(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");

  return `$'${escaped}'`;
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const envDump: Record<string, string | null> = {};

    for (const key of keysToLog) {
      const value = Deno.env.get(key) ?? null;
      envDump[key] = value;
      console.log(`[log-dev-env-values] ${key}=`, value);
    }

    const secretPairs = keysToLog
      .map((key) => `${key}=${shellQuote(envDump[key] ?? "")}`)
      .join(" ");

    const secretsSetCommand = `supabase secrets set --project-ref qbuynyxyemigtnvdujts ${secretPairs}`;

    console.log("[log-dev-env-values] copy/paste command:");
    console.log(secretsSetCommand);

    return new Response(
      JSON.stringify({
        success: true,
        loggedCount: keysToLog.length,
        secretsSetCommand,
        missingKeys: Object.entries(envDump)
          .filter(([, value]) => value === null)
          .map(([key]) => key),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[log-dev-env-values] unexpected error", error);

    return new Response(
      JSON.stringify({ error: "Failed to log environment values" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
