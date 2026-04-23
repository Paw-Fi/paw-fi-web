import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { getCorsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";

interface SubscriptionRecord {
  id?: string | null;
  user_id?: string | null;
  plan?: string | null;
  status?: string | null;
  billing_interval?: string | null;
  canceled_at?: string | null;
  ended_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

interface BaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
}

interface InsertWebhookPayload extends BaseWebhookPayload {
  type: "INSERT";
  record: SubscriptionRecord;
  old_record: null;
}

interface UpdateWebhookPayload extends BaseWebhookPayload {
  type: "UPDATE";
  record: SubscriptionRecord;
  old_record: SubscriptionRecord;
}

interface DeleteWebhookPayload extends BaseWebhookPayload {
  type: "DELETE";
  record: null;
  old_record: SubscriptionRecord;
}

interface UserContact {
  email: string;
  full_name: string | null;
}

interface QueueEnqueueResult {
  status: "queued" | "deduped";
  sendAfter: string | null;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const QUEUE_TABLE = "subscription_followup_email_queue";
const DEFAULT_SEND_DELAY_MINUTES = 60;
const SEND_DELAY_MINUTES = readPositiveIntegerEnv(
  "SUBSCRIPTION_FOLLOWUP_DELAY_MINUTES",
  DEFAULT_SEND_DELAY_MINUTES,
);
const SEND_DELAY_MS = SEND_DELAY_MINUTES * 60 * 1000;

function reportSubscriptionFounderFollowupError(
  phase: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  void reportEdgeFunctionError({
    functionName: "subscription-founder-followup",
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

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed. Use POST." },
      405,
      corsHeaders,
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    reportSubscriptionFounderFollowupError(
      "config_validation",
      new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"),
    );
    return jsonResponse(
      { success: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      500,
      corsHeaders,
    );
  }

  let payload: InsertWebhookPayload | UpdateWebhookPayload | DeleteWebhookPayload;

  try {
    payload = (await req.json()) as
      | InsertWebhookPayload
      | UpdateWebhookPayload
      | DeleteWebhookPayload;
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON payload" },
      400,
      corsHeaders,
    );
  }

  if (!isSubscriptionsWebhook(payload)) {
    return jsonResponse(
      { success: true, status: "ignored", reason: "Not a subscriptions webhook payload" },
      200,
      corsHeaders,
    );
  }

  try {
    if (payload.type === "INSERT") {
      return await handleInsert(payload, corsHeaders);
    }

    if (payload.type === "UPDATE") {
      return await handleUpdate(payload, corsHeaders);
    }

    return jsonResponse(
      { success: true, status: "ignored", reason: "Event type not handled" },
      200,
      corsHeaders,
    );
  } catch (error) {
    reportSubscriptionFounderFollowupError("process_webhook", error, {
      webhookType: payload.type,
      table: payload.table,
      schema: payload.schema,
      subscriptionId: payload.record?.id ?? null,
      userId: payload.record?.user_id ?? null,
    });

    console.error("[subscription-founder-followup] processing error", {
      error: error instanceof Error ? error.message : String(error),
      webhookType: payload.type,
      table: payload.table,
      schema: payload.schema,
      subscriptionId: payload.record?.id ?? null,
      userId: payload.record?.user_id ?? null,
    });

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process subscription webhook",
      },
      500,
      corsHeaders,
    );
  }
});

async function handleInsert(
  payload: InsertWebhookPayload,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const subscription = payload.record;

  if (!shouldSendWelcomeOnInsert(subscription)) {
    return jsonResponse(
      { success: true, status: "ignored", reason: "Insert did not match welcome criteria" },
      200,
      corsHeaders,
    );
  }

  const userId = asNonEmptyString(subscription.user_id);
  if (!userId) {
    return jsonResponse(
      { success: true, status: "ignored", reason: "Missing user_id on subscription insert" },
      200,
      corsHeaders,
    );
  }

  const user = await loadUserContact(userId);
  if (!user?.email) {
    return jsonResponse(
      { success: true, status: "ignored", reason: "User contact not found" },
      200,
      corsHeaders,
    );
  }

  const recipientName = resolveRecipientName(user.full_name, user.email);
  const planLabel = resolvePlanLabel(subscription);
const text = buildWelcomeEmailText(
  recipientName,
  planLabel,
  subscription.status as "trialing" | "active",
);  const subject = buildWelcomeEmailSubject(user.full_name);
  const dedupeKey = buildInsertDedupeKey(subscription);

  const queueResult = await enqueueFounderFollowupEmail({
    userId,
    subscriptionId: asNonEmptyString(subscription.id),
    eventType: "subscription_welcome",
    recipientEmail: user.email,
    recipientName,
    planLabel,
    subject,
    bodyText: text,
    dedupeKey,
  });

  return jsonResponse(
    {
      success: true,
      status: queueResult.status,
      emailType: "subscription_welcome",
      sendAfter: queueResult.sendAfter,
    },
    200,
    corsHeaders,
  );
}

async function handleUpdate(
  payload: UpdateWebhookPayload,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!didTransitionToCanceled(payload.record, payload.old_record)) {
    return jsonResponse(
      { success: true, status: "ignored", reason: "No cancellation transition detected" },
      200,
      corsHeaders,
    );
  }

  const userId = asNonEmptyString(payload.record.user_id);
  if (!userId) {
    return jsonResponse(
      { success: true, status: "ignored", reason: "Missing user_id on subscription update" },
      200,
      corsHeaders,
    );
  }

  const user = await loadUserContact(userId);
  if (!user?.email) {
    return jsonResponse(
      { success: true, status: "ignored", reason: "User contact not found" },
      200,
      corsHeaders,
    );
  }

  const recipientName = resolveRecipientName(user.full_name, user.email);
  const planLabel = resolvePlanLabel(payload.record);
  const text = buildCancellationEmailText(recipientName);
  const subject = buildCancellationEmailSubject(user.full_name);
  const dedupeKey = buildCancellationDedupeKey(payload.record);

  const queueResult = await enqueueFounderFollowupEmail({
    userId,
    subscriptionId: asNonEmptyString(payload.record.id),
    eventType: "subscription_cancellation_followup",
    recipientEmail: user.email,
    recipientName,
    planLabel,
    subject,
    bodyText: text,
    dedupeKey,
  });

  return jsonResponse(
    {
      success: true,
      status: queueResult.status,
      emailType: "subscription_cancellation_followup",
      sendAfter: queueResult.sendAfter,
    },
    200,
    corsHeaders,
  );
}

async function loadUserContact(userId: string): Promise<UserContact | null> {
  const { data, error } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user contact: ${error.message}`);
  }

  if (!data?.email) {
    return null;
  }

  return {
    email: data.email,
    full_name: data.full_name ?? null,
  };
}

function shouldSendWelcomeOnInsert(subscription: SubscriptionRecord): boolean {
  const status = asNonEmptyString(subscription.status)?.toLowerCase() ?? "";
  const plan = asNonEmptyString(subscription.plan)?.toLowerCase() ?? "";

  if (!status || !plan) {
    return false;
  }

  const shouldDisplayWelcomeStatus = status === "active" || status === "trialing";
  const isPaidPlan = plan !== "free";

  return shouldDisplayWelcomeStatus && isPaidPlan;
}

function didTransitionToCanceled(
  nextRecord: SubscriptionRecord,
  previousRecord: SubscriptionRecord,
): boolean {
  const nextStatus = asNonEmptyString(nextRecord.status)?.toLowerCase() ?? "";
  const previousStatus = asNonEmptyString(previousRecord.status)?.toLowerCase() ?? "";

  if (nextStatus === "canceled" && previousStatus !== "canceled") {
    return true;
  }

  const nextCanceledAt = asNonEmptyString(nextRecord.canceled_at);
  const previousCanceledAt = asNonEmptyString(previousRecord.canceled_at);

  if (nextCanceledAt && !previousCanceledAt) {
    return true;
  }

  const nextEndedAt = asNonEmptyString(nextRecord.ended_at);
  const previousEndedAt = asNonEmptyString(previousRecord.ended_at);

  if (nextEndedAt && !previousEndedAt) {
    return true;
  }

  return false;
}

function resolveRecipientName(fullName: string | null, email: string): string {
  const name = asNonEmptyString(fullName);
  if (name) {
    const [firstSegment] = name.trim().split(/\s+/);
    return firstSegment || "there";
  }

  const [emailPrefix] = email.split("@");
  if (!emailPrefix) {
    return "there";
  }

  const cleaned = emailPrefix
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return cleaned || "there";
}

function resolvePlanLabel(subscription: SubscriptionRecord): string {
  const plan = asNonEmptyString(subscription.plan)?.toLowerCase();
  const billingInterval = asNonEmptyString(subscription.billing_interval)?.toLowerCase();

  if (plan === "lifetime") {
    return "lifetime plan";
  }

  if (billingInterval === "monthly") {
    return "monthly plan";
  }

  if (billingInterval === "yearly") {
    return "yearly plan";
  }

  if (!plan) {
    return "your plan";
  }

  return `${plan} plan`;
}

function buildWelcomeEmailText(
  name: string,
  planLabel: string,
  status: "trialing" | "active",
): string {
  // Trialing → onboarding / friction discovery
  if (status === "trialing") {
    return [
      `Hi ${name},`,
      "",
      "Yifan here, one of the co-founders at Moneko.",
      "",
      "I saw you just started your free trial, so I wanted to reach out early.",
      "",
      "If anything feels confusing, missing, or harder than it should be, just hit reply and let me know. I read every message myself.",
      "",
      "I’d also love to know what made you decide to try Moneko.",
      "",
      "Thanks for giving it a shot.",
      "",
      "Yifan",
      "Co-Founder and CTO, Moneko",
    ].join("\n");
  }

  // Active → paid confirmation (your original tone)
  return [
    `Hi ${name},`,
    "",
    `Really appreciate you choosing the ${planLabel}. That means a lot to us.`,
    "",
    "I’m Yifan, one of the co-founders at Moneko.",
    "",
    "We’re building Moneko closely with our early users, so feedback like yours genuinely helps shape what we improve next.",
    "",
    "If anything feels confusing, missing, or not quite right, just hit reply and tell me. I read every message myself.",
    "",
    "I’d also love to know what made you decide to give Moneko a try.",
    "",
    "Thanks again for being here early.",
    "",
    "Yifan",
    "Co-Founder and CTO, Moneko",
  ].join("\n");
}

function buildWelcomeEmailSubject(fullName: string | null): string {
  const name = asNonEmptyString(fullName) ?? "";
  return name ? `${name} — We appreciate your support` : "We appreciate your support";
}

function buildCancellationEmailSubject(fullName: string | null): string {
  const name = asNonEmptyString(fullName) ?? "";
  return name ? `${name} — I’d love your feedback on Moneko` : "I’d love your feedback on Moneko";
}

function buildCancellationEmailText(name: string): string {
  return [
    `Hi ${name},`,
    "",
    "Yifan here, one of the co-founders at Moneko.",
    "",
    "I saw your plan was canceled and wanted to reach out.",
    "",
    "If you don’t mind sharing, what made you decide to leave? Even a short reply helps us a lot.",
    "",
    "No hard feelings at all. If it just wasn’t the right fit, that’s completely fair.",
    "",
    "If you ever want to give it another try, I can set you up with a free year. Just let me know.",
    "",
    "Either way, thanks for giving Moneko a try.",
    "",
    "Yifan",
  ].join("\n");
}

async function enqueueFounderFollowupEmail(params: {
  userId: string;
  subscriptionId: string | null;
  eventType: "subscription_welcome" | "subscription_cancellation_followup";
  recipientEmail: string;
  recipientName: string;
  planLabel: string;
  subject: string;
  bodyText: string;
  dedupeKey: string;
}): Promise<QueueEnqueueResult> {
  const sendAfter = new Date(Date.now() + SEND_DELAY_MS).toISOString();

  const { error } = await supabase
    .from(QUEUE_TABLE)
    .insert({
      user_id: params.userId,
      subscription_id: params.subscriptionId,
      event_type: params.eventType,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName,
      plan_label: params.planLabel,
      subject: params.subject,
      body_text: params.bodyText,
      send_after: sendAfter,
      dedupe_key: params.dedupeKey,
    });

  if (!error) {
    return {
      status: "queued",
      sendAfter,
    };
  }

  if (error.code === "23505") {
    return {
      status: "deduped",
      sendAfter: null,
    };
  }

  throw new Error(`Failed to enqueue delayed email: ${error.message}`);
}

function buildInsertDedupeKey(subscription: SubscriptionRecord): string {
  return [
    "subscription_welcome",
    asNonEmptyString(subscription.id) ?? "no-subscription-id",
    asNonEmptyString(subscription.user_id) ?? "no-user-id",
    asNonEmptyString(subscription.plan) ?? "no-plan",
    asNonEmptyString(subscription.status) ?? "no-status",
    asNonEmptyString(subscription.billing_interval) ?? "no-interval",
    asNonEmptyString(subscription.updated_at) ?? "no-updated-at",
  ].join("|");
}

function buildCancellationDedupeKey(subscription: SubscriptionRecord): string {
  return [
    "subscription_cancellation_followup",
    asNonEmptyString(subscription.id) ?? "no-subscription-id",
    asNonEmptyString(subscription.user_id) ?? "no-user-id",
    asNonEmptyString(subscription.status) ?? "no-status",
    asNonEmptyString(subscription.canceled_at) ?? "no-canceled-at",
    asNonEmptyString(subscription.ended_at) ?? "no-ended-at",
    asNonEmptyString(subscription.updated_at) ?? "no-updated-at",
  ].join("|");
}

function isSubscriptionsWebhook(
  payload: InsertWebhookPayload | UpdateWebhookPayload | DeleteWebhookPayload,
): boolean {
  return payload.table === "subscriptions" && payload.schema === "public";
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `[subscription-founder-followup] Invalid ${name} value \"${raw}\", using fallback ${fallback}`,
    );
    return fallback;
  }

  return Math.floor(parsed);
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
