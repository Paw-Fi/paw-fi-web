import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { getCorsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { sendEmail } from "../shared/email-service.ts";

interface FollowupQueueRow {
  id: string;
  user_id: string;
  subscription_id: string | null;
  event_type: "subscription_welcome" | "subscription_cancellation_followup";
  recipient_email: string;
  recipient_name: string | null;
  plan_label: string | null;
  subject: string;
  body_text: string;
  send_after: string;
  status: "pending" | "processing" | "retrying" | "sent" | "failed";
  dedupe_key: string;
  attempt_count: number;
  max_attempts: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SUPABASE_SERVICE_ROLE_KEY =
  (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
const SERVICE_ROLE_KEY = (Deno.env.get("SERVICE_ROLE_KEY") ?? "").trim();

const QUEUE_TABLE = "subscription_followup_email_queue";
const FOUNDER_FROM = "Yifan from Moneko <yifan.lim@moneko.io>";
const FOUNDER_REPLY_TO = "yifan.lim@moneko.io";
const MAX_BATCH_SIZE = 50;
const RETRY_DELAY_MINUTES = 15;

function reportProcessSubscriptionFollowupEmailsError(
  phase: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  void reportEdgeFunctionError({
    functionName: "process-subscription-followup-emails",
    error,
    context: {
      phase,
      ...context,
    },
  });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? undefined);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse(
      { success: false, error: "Method not allowed. Use GET or POST." },
      405,
      corsHeaders,
    );
  }

  if (!SUPABASE_URL || !hasConfiguredServiceRoleKey()) {
    reportProcessSubscriptionFollowupEmailsError(
      "config_validation",
      new Error(
        "Missing SUPABASE_URL and/or service role key (SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY)",
      ),
    );
    return jsonResponse(
      {
        success: false,
        error:
          "Missing SUPABASE_URL and/or service role key (SUPABASE_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY)",
      },
      500,
      corsHeaders,
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = extractBearerToken(authHeader);
  const acceptedKeys = getAcceptedServiceRoleKeys();


  if (!bearerToken || !isAuthorizedServiceToken(bearerToken)) {
    reportProcessSubscriptionFollowupEmailsError(
      "authorization",
      new Error("Unauthorized"),
      {
        hasBearerToken: Boolean(bearerToken),
        bearerTokenLength: bearerToken?.length ?? 0,
        bearerTokenKind: detectTokenKind(bearerToken),
        bearerTokenPreview: bearerToken ? bearerToken.substring(0, 15) + "..." + bearerToken.substring(Math.max(0, bearerToken.length - 5)) : null,
        acceptedKeyCount: acceptedKeys.length,
        acceptedKeyLengths: acceptedKeys.map((key) => key.length),
        acceptedKeyKinds: acceptedKeys.map((key) => detectTokenKind(key)),
        hasSupabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY.length > 0,
        hasServiceRoleKey: SERVICE_ROLE_KEY.length > 0,
      },
    );

    console.error("[process-subscription-followup-emails] unauthorized request", {
      hasBearerToken: Boolean(bearerToken),
      bearerTokenLength: bearerToken?.length ?? 0,
      bearerTokenKind: detectTokenKind(bearerToken),
      acceptedKeyCount: acceptedKeys.length,
      acceptedKeyLengths: acceptedKeys.map((key) => key.length),
      acceptedKeyKinds: acceptedKeys.map((key) => detectTokenKind(key)),
      hasSupabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY.length > 0,
      hasServiceRoleKey: SERVICE_ROLE_KEY.length > 0,
      projectRefHeader: req.headers.get("x-forwarded-host") ?? null,
    });
    return jsonResponse(
      { success: false, error: "Unauthorized" },
      401,
      corsHeaders,
    );
  }

  try {
    const result = await processDueEmails();

    return jsonResponse(
      {
        success: true,
        ...result,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    reportProcessSubscriptionFollowupEmailsError("process_due_emails", error, {
      message,
    });

    console.error("[process-subscription-followup-emails] fatal error", {
      error: message,
    });

    return jsonResponse(
      {
        success: false,
        error: message,
      },
      500,
      corsHeaders,
    );
  }
});

async function processDueEmails(): Promise<{
  fetched: number;
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  skipped: number;
}> {
  const nowIso = new Date().toISOString();

  const { data: dueRows, error: dueRowsError } = await supabase
    .from(QUEUE_TABLE)
    .select("*")
    .in("status", ["pending", "retrying"])
    .lte("send_after", nowIso)
    .order("send_after", { ascending: true })
    .limit(MAX_BATCH_SIZE);

  if (dueRowsError) {
    throw new Error(`Failed to fetch due queue rows: ${dueRowsError.message}`);
  }

  const queueRows = (dueRows ?? []) as FollowupQueueRow[];

  let claimed = 0;
  let sent = 0;
  let retried = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of queueRows) {
    const claimedRow = await claimQueueRow(row, nowIso);
    if (!claimedRow) {
      skipped += 1;
      continue;
    }

    claimed += 1;

    const emailResult = await sendEmail({
      to: claimedRow.recipient_email,
      subject: claimedRow.subject,
      text: claimedRow.body_text,
      html: textToSimpleHtml(claimedRow.body_text),
      from: FOUNDER_FROM,
      replyTo: FOUNDER_REPLY_TO,
    });

    if (emailResult.success) {
      await markQueueRowSent(claimedRow.id);
      sent += 1;
      continue;
    }

    const nextStatus =
      claimedRow.attempt_count >= claimedRow.max_attempts ? "failed" : "retrying";

    await markQueueRowAttemptFailed({
      rowId: claimedRow.id,
      status: nextStatus,
      errorMessage: emailResult.error ?? "Unknown email sending error",
    });

    if (nextStatus === "failed") {
      failed += 1;
    } else {
      retried += 1;
    }
  }

  return {
    fetched: queueRows.length,
    claimed,
    sent,
    retried,
    failed,
    skipped,
  };
}

async function claimQueueRow(
  row: FollowupQueueRow,
  nowIso: string,
): Promise<FollowupQueueRow | null> {
  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .update({
      status: "processing",
      attempt_count: row.attempt_count + 1,
      last_attempt_at: nowIso,
      updated_at: nowIso,
      error_message: null,
    })
    .eq("id", row.id)
    .in("status", ["pending", "retrying"])
    .lte("send_after", nowIso)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to claim queue row ${row.id}: ${error.message}`);
  }

  return (data as FollowupQueueRow | null) ?? null;
}

async function markQueueRowSent(rowId: string): Promise<void> {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from(QUEUE_TABLE)
    .update({
      status: "sent",
      sent_at: nowIso,
      updated_at: nowIso,
      error_message: null,
    })
    .eq("id", rowId);

  if (error) {
    throw new Error(`Failed to mark queue row ${rowId} as sent: ${error.message}`);
  }
}

async function markQueueRowAttemptFailed(params: {
  rowId: string;
  status: "retrying" | "failed";
  errorMessage: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const retryAtIso = new Date(
    Date.now() + RETRY_DELAY_MINUTES * 60 * 1000,
  ).toISOString();

  const updatePayload: Record<string, unknown> = {
    status: params.status,
    error_message: params.errorMessage,
    updated_at: nowIso,
  };

  if (params.status === "retrying") {
    updatePayload.send_after = retryAtIso;
  }

  const { error } = await supabase
    .from(QUEUE_TABLE)
    .update(updatePayload)
    .eq("id", params.rowId);

  if (error) {
    throw new Error(
      `Failed to mark queue row ${params.rowId} as ${params.status}: ${error.message}`,
    );
  }
}

function textToSimpleHtml(text: string): string {
  return `<div>${escapeHtml(text).split("\n").join("<br />")}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#39;");
}

function extractBearerToken(authHeader: string): string | null {
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function getAcceptedServiceRoleKeys(): string[] {
  return [SUPABASE_SERVICE_ROLE_KEY, SERVICE_ROLE_KEY].filter((key) => key.length > 0);
}

function hasConfiguredServiceRoleKey(): boolean {
  return getAcceptedServiceRoleKeys().length > 0;
}

function isAuthorizedServiceToken(token: string): boolean {
  const normalized = token.trim();
  return getAcceptedServiceRoleKeys().some((key) => key === normalized);
}

function detectTokenKind(token: string | null): "jwt" | "sb_secret" | "other" | "missing" {
  if (!token) {
    return "missing";
  }

  if (token.startsWith("eyJ")) {
    return "jwt";
  }

  if (token.startsWith("sb_secret_") || token.startsWith("sb_sec")) {
    return "sb_secret";
  }

  return "other";
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}
