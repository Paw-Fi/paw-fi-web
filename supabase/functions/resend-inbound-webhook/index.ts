import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { Webhook } from "https://esm.sh/svix@1.24.0?target=deno";

import { corsHeaders } from "../shared/cors.ts";
import {
  buildInternalInvokeHeaders,
  resolveInternalFunctionKey,
} from "../shared/auth.ts";
import { sendEmail } from "../shared/email-service.ts";
import { pluralize } from "../shared/email-utils.ts";
import { buildImportSemanticKey } from "../shared/import-dedupe.ts";
import {
  filterSupportedImportAttachments,
  normalizeEmailAddress,
  resolveInboundEmailText,
  resolveNewestSenderOwner,
  shouldProcessInboundRecipients,
} from "../shared/email-import.ts";
import {
  type AnalyzeRequestBody,
  extractLabeledTransactionFallback,
  runAnalyzeExpense,
} from "../shared/analyze-core.ts";
import {
  decideEmailImportGrounding,
  type ImportGroundingDecision,
} from "../shared/email-import-grounding-decision.ts";
import {
  classifyEmailImportWithAi,
  shouldEscalateEmailImportAiFailure,
} from "../shared/email-import-ai-decision.ts";
import {
  createEmailImportReviewToken,
  hashEmailImportReviewToken,
} from "../shared/email-import-review.ts";
import { localDateTimeToUtcIso } from "../shared/timezone.ts";
import {
  fetchUserCategoryPreferences,
  fetchUserCustomCategories,
  fetchUserHiddenCategories,
  mergeAllowedCategories,
} from "../shared/user-categories.ts";
import {
  applyOwnedInboundEventUpdate,
  buildEmailImportDebugTraceId,
  type InboundEventLeaseOwner,
  resolveDuplicateWebhookStatusCode,
} from "../shared/email-import-event-state.ts";
import { saveTransactionsBatchInternal } from "../save-transactions-batch/index.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { createFollowupEmailBuilder } from "./email-templates/import-followup-email.ts";
import { buildImportReviewRequiredEmail } from "./email-templates/import-review-required-email.ts";
import {
  createImportUnavailableEmailBuilder,
  importUnavailableReasons,
} from "./email-templates/import-unavailable-email.ts";
import {
  hasPlusEntitlement,
  loadLatestSubscriptionForUser,
} from "../shared/plus-entitlement.ts";

const APP_URL = Deno.env.get("APP_URL") || "https://moneko.io";
const DEFAULT_IMPORT_INBOX_EMAIL = "files@inbound.moneko.io";
const SUPPORT_EMAIL = "hello@moneko.io";
const EMAIL_FROM = "Moneko <no-reply@moneko.io>";
const APP_TRANSACTIONS_URL = "moneko://home";
const MAX_SUPPORTED_ATTACHMENTS = 5;
const MAX_SUPPORTED_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FIREBASE_SERVICE_ACCOUNT_JSON =
  Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || "";
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "";
const APNS_BUNDLE_ID = Deno.env.get("IOS_BUNDLE_ID") || "com.moneko.mobile";
const NETWORK_TIMEOUT_MS = Number.parseInt(
  Deno.env.get("EMAIL_IMPORT_NETWORK_TIMEOUT_MS") || "50000",
  10,
);
const PROCESSING_LEASE_MS = Number.parseInt(
  Deno.env.get("EMAIL_IMPORT_PROCESSING_LEASE_MS") || "360000",
  10,
);
const MAX_PROCESSING_ATTEMPTS = Number.parseInt(
  Deno.env.get("EMAIL_IMPORT_MAX_PROCESSING_ATTEMPTS") || "8",
  10,
);
const ACTIVE_LEASE_TAKEOVER_ATTEMPTS = Number.parseInt(
  Deno.env.get("EMAIL_IMPORT_ACTIVE_LEASE_TAKEOVER_ATTEMPTS") || "3",
  10,
);
const REQUEST_SOFT_DEADLINE_MS = Number.parseInt(
  Deno.env.get("EMAIL_IMPORT_REQUEST_SOFT_DEADLINE_MS") || "300000",
  10,
);

interface ResendReceivedEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    subject?: string;
    to?: string[];
    attachments?: Array<Record<string, unknown>>;
  };
}

interface ResolvedOwner {
  userId: string;
  fullName: string | null;
  defaultEmail: string;
  enabled: boolean;
  preferredCurrency: string;
  preferredTimezone: string | null;
  householdId: string | null;
  isPortfolio: boolean;
  accountId: string | null;
}

interface AttachmentProcessingResult {
  filename: string;
  success: boolean;
  itemCount: number;
  error?: string;
  items?: Array<Record<string, unknown>>;
}

type InboundEventStatus =
  | "received"
  | "processing"
  | "awaiting_review"
  | "ignored"
  | "processed"
  | "failed";

interface ExistingInboundEvent {
  id: string;
  status: InboundEventStatus;
  user_id: string | null;
  error_text: string | null;
  processed_at: string | null;
  created_at: string | null;
  processing_attempt_count: number;
  lock_expires_at: string | null;
  last_svix_id: string | null;
  last_svix_timestamp: string | null;
}

type ClaimInboundEventResult =
  | {
    kind: "claimed";
    owner: InboundEventLeaseOwner;
    recovered: boolean;
  }
  | {
    kind: "duplicate";
    rowId: string | null;
    status: InboundEventStatus | null;
    processedAt: string | null;
    inProgress: boolean;
    reason: string;
  };

function chunkDiagnosticText(value: string): string[] {
  return value.match(/[\s\S]{1,450}/g) ?? [];
}

function validPositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.trunc(value);
}

function addMillisecondsIso(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function isFinalInboundStatus(status: InboundEventStatus | null): boolean {
  return (
    status === "processed" ||
    status === "awaiting_review" ||
    status === "ignored" ||
    status === "failed"
  );
}

function normalizeConfiguredEmailList(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => normalizeEmailAddress(item))
    .filter((item): item is string => item != null);
}

function resolveImportInboxEmails(): string[] {
  const configuredList = normalizeConfiguredEmailList(
    Deno.env.get("EMAIL_IMPORT_INBOX_EMAILS"),
  );
  if (configuredList.length > 0) return configuredList;

  const single = normalizeEmailAddress(
    Deno.env.get("EMAIL_IMPORT_INBOX_EMAIL"),
  );
  if (single) return [single];

  return [DEFAULT_IMPORT_INBOX_EMAIL];
}

const IMPORT_INBOX_EMAILS = resolveImportInboxEmails();
const PRIMARY_IMPORT_INBOX_EMAIL = IMPORT_INBOX_EMAILS[0] ||
  DEFAULT_IMPORT_INBOX_EMAIL;
const buildFollowupEmail = createFollowupEmailBuilder({
  appTransactionsUrl: APP_TRANSACTIONS_URL,
  importInboxEmail: PRIMARY_IMPORT_INBOX_EMAIL,
  supportEmail: SUPPORT_EMAIL,
});
const buildUnavailableEmail = createImportUnavailableEmailBuilder({
  importInboxEmail: PRIMARY_IMPORT_INBOX_EMAIL,
  supportEmail: SUPPORT_EMAIL,
});

function shouldProcessInboundToConfiguredInboxes(
  recipients?: string[] | null,
): boolean {
  return IMPORT_INBOX_EMAILS.some((inbox) =>
    shouldProcessInboundRecipients(recipients ?? undefined, inbox)
  );
}

function ensureSoftDeadline(startedAtMs: number, stage: string): void {
  const deadlineMs = validPositiveInt(REQUEST_SOFT_DEADLINE_MS, 130000);
  if (Date.now() - startedAtMs > deadlineMs) {
    throw new Error(`SOFT_DEADLINE_EXCEEDED:${stage}`);
  }
}

function matchesRetryableFailurePattern(message: string): boolean {
  return /(SOFT_DEADLINE_EXCEEDED|timeout|timed out|abort|429|500|502|503|504|overloaded|temporarily unavailable|resource_exhausted|ATTACHMENT_FETCH_FAILED)/i
    .test(
      message,
    );
}

function isRetryableAnalyzeFailure(result: {
  status?: number;
  code?: string;
  error?: string;
}): boolean {
  if (typeof result.status === "number" && result.status >= 500) {
    return true;
  }

  if (result.code === "AI_TEMPORARILY_UNAVAILABLE") {
    return true;
  }

  return matchesRetryableFailurePattern(String(result.error || ""));
}

function isRetryableAttachmentError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return matchesRetryableFailurePattern(message);
}

function summarizeAttachmentFailures(
  attachmentResults: AttachmentProcessingResult[],
): string {
  const uniqueErrors = Array.from(
    new Set(
      attachmentResults
        .filter((item) => item.success === false)
        .map((item) => String(item.error || "").trim())
        .filter((value) => value.length > 0),
    ),
  );

  if (uniqueErrors.length === 0) {
    return "NO_TRANSACTIONS_FOUND";
  }

  return uniqueErrors.join(" | ").slice(0, 500);
}

function scheduleBackgroundTask(
  promise: Promise<unknown>,
  label: string,
): void {
  const observed = promise.catch((error) => {
    console.error("[resend-inbound-webhook] background task failed", {
      label,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  const edgeRuntime = (
    globalThis as unknown as {
      EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
    }
  ).EdgeRuntime;

  if (typeof edgeRuntime?.waitUntil === "function") {
    edgeRuntime.waitUntil(observed);
    return;
  }

  void observed;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const safeTimeoutMs = validPositiveInt(timeoutMs, 25000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), safeTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400, code?: string) {
  return jsonResponse({ success: false, error: message, code }, status);
}

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(
        trimmed,
      )
    ? trimmed
    : null;
}

function buildSyntheticRequest(): Request {
  const internalKey = resolveInternalFunctionKey();
  if (!internalKey) {
    throw new Error("Internal function key is not configured");
  }

  return new Request("https://moneko.internal/save-transactions-batch", {
    method: "POST",
    headers: buildInternalInvokeHeaders(internalKey),
  });
}

async function claimInboundEvent(params: {
  supabase: any;
  emailId: string;
  senderEmail: string;
  normalizedSenderEmail: string;
  svixId: string | null;
  svixTimestamp: string | null;
}): Promise<ClaimInboundEventResult> {
  const {
    supabase,
    emailId,
    senderEmail,
    normalizedSenderEmail,
    svixId,
    svixTimestamp,
  } = params;
  const lockExpiresAt = addMillisecondsIso(
    validPositiveInt(PROCESSING_LEASE_MS, 180000),
  );

  const { data, error } = await supabase
    .from("email_import_events")
    .insert({
      provider_email_id: emailId,
      sender_email: senderEmail,
      normalized_sender_email: normalizedSenderEmail,
      status: "processing",
      lock_expires_at: lockExpiresAt,
      processing_attempt_count: 1,
      last_svix_id: svixId,
      last_svix_timestamp: svixTimestamp,
    })
    .select("id, processing_attempt_count")
    .single();

  if (!error && data?.id) {
    return {
      kind: "claimed",
      owner: {
        rowId: data.id as string,
        attemptCount: typeof data.processing_attempt_count === "number"
          ? data.processing_attempt_count
          : 1,
      },
      recovered: false,
    };
  }

  if (error?.code !== "23505") {
    throw new Error(error?.message || "Failed to claim inbound event");
  }

  const existing = await getInboundEventByEmailId({ supabase, emailId });
  if (!existing) {
    return {
      kind: "duplicate",
      rowId: null,
      status: null,
      processedAt: null,
      inProgress: false,
      reason: "MISSING_EXISTING_EVENT",
    };
  }

  if (isFinalInboundStatus(existing.status)) {
    return {
      kind: "duplicate",
      rowId: existing.id,
      status: existing.status,
      processedAt: existing.processed_at,
      inProgress: false,
      reason: "FINALIZED",
    };
  }

  const currentAttempts = validPositiveInt(
    existing.processing_attempt_count,
    0,
  );

  if (existing.status === "processing" && existing.lock_expires_at) {
    const lockExpiresAtMs = Date.parse(existing.lock_expires_at);
    const activeTakeoverThreshold = validPositiveInt(
      ACTIVE_LEASE_TAKEOVER_ATTEMPTS,
      3,
    );
    if (
      Number.isFinite(lockExpiresAtMs) &&
      lockExpiresAtMs > Date.now() &&
      currentAttempts < activeTakeoverThreshold
    ) {
      return {
        kind: "duplicate",
        rowId: existing.id,
        status: existing.status,
        processedAt: existing.processed_at,
        inProgress: true,
        reason: "IN_PROGRESS",
      };
    }
  }

  if (currentAttempts >= validPositiveInt(MAX_PROCESSING_ATTEMPTS, 8)) {
    await finalizeInboundEventById({
      supabase,
      rowId: existing.id,
      status: "failed",
      errorText: "MAX_PROCESSING_ATTEMPTS_EXCEEDED",
    });
    return {
      kind: "duplicate",
      rowId: existing.id,
      status: "failed",
      processedAt: new Date().toISOString(),
      inProgress: false,
      reason: "MAX_ATTEMPTS_EXCEEDED",
    };
  }

  if (existing.status === "processing" && existing.lock_expires_at) {
    const lockExpiresAtMs = Date.parse(existing.lock_expires_at);
    if (Number.isFinite(lockExpiresAtMs) && lockExpiresAtMs > Date.now()) {
      console.warn("[resend-inbound-webhook] taking over active lease", {
        emailId,
        rowId: existing.id,
        currentAttempts,
        lockExpiresAt: existing.lock_expires_at,
      });
    }
  }

  const recovered = await tryTakeoverInboundEvent({
    supabase,
    row: existing,
    svixId,
    svixTimestamp,
  });

  if (!recovered) {
    return {
      kind: "duplicate",
      rowId: existing.id,
      status: existing.status,
      processedAt: existing.processed_at,
      inProgress: true,
      reason: "TAKEOVER_RACE_LOST",
    };
  }

  return {
    kind: "claimed",
    owner: recovered,
    recovered: true,
  };
}

function mapInboundEventRow(row: any): ExistingInboundEvent | null {
  const statusCandidate = typeof row?.status === "string" ? row.status : null;
  const status: InboundEventStatus | null = statusCandidate === "received" ||
      statusCandidate === "processing" ||
      statusCandidate === "awaiting_review" ||
      statusCandidate === "ignored" ||
      statusCandidate === "processed" ||
      statusCandidate === "failed"
    ? statusCandidate
    : null;

  if (!row?.id || !status) return null;

  return {
    id: String(row.id),
    status,
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    error_text: typeof row.error_text === "string" ? row.error_text : null,
    processed_at: typeof row.processed_at === "string"
      ? row.processed_at
      : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    processing_attempt_count: typeof row.processing_attempt_count === "number"
      ? Math.max(0, Math.trunc(row.processing_attempt_count))
      : 0,
    lock_expires_at: typeof row.lock_expires_at === "string"
      ? row.lock_expires_at
      : null,
    last_svix_id: typeof row.last_svix_id === "string"
      ? row.last_svix_id
      : null,
    last_svix_timestamp: typeof row.last_svix_timestamp === "string"
      ? row.last_svix_timestamp
      : null,
  };
}

async function getInboundEventByEmailId(params: {
  supabase: any;
  emailId: string;
}): Promise<ExistingInboundEvent | null> {
  const { supabase, emailId } = params;
  const { data, error } = await supabase
    .from("email_import_events")
    .select(
      "id, status, user_id, error_text, processed_at, created_at, processing_attempt_count, lock_expires_at, last_svix_id, last_svix_timestamp",
    )
    .eq("provider_email_id", emailId)
    .maybeSingle();

  if (error || !data) return null;
  return mapInboundEventRow(data);
}

async function tryTakeoverInboundEvent(params: {
  supabase: any;
  row: ExistingInboundEvent;
  svixId: string | null;
  svixTimestamp: string | null;
}): Promise<InboundEventLeaseOwner | null> {
  const { supabase, row, svixId, svixTimestamp } = params;
  const nextAttempts = validPositiveInt(row.processing_attempt_count, 0) + 1;

  let query = supabase
    .from("email_import_events")
    .update({
      status: "processing",
      lock_expires_at: addMillisecondsIso(
        validPositiveInt(PROCESSING_LEASE_MS, 180000),
      ),
      processed_at: null,
      error_text: null,
      processing_attempt_count: nextAttempts,
      last_svix_id: svixId,
      last_svix_timestamp: svixTimestamp,
    })
    .eq("id", row.id)
    .eq(
      "processing_attempt_count",
      validPositiveInt(row.processing_attempt_count, 0),
    );

  if (row.status === "processing") {
    query = query.eq("status", "processing");
    query = row.lock_expires_at
      ? query.eq("lock_expires_at", row.lock_expires_at)
      : query.is("lock_expires_at", null);
  } else {
    query = query.eq("status", "received");
  }

  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data?.id) return null;
  return {
    rowId: data.id as string,
    attemptCount: nextAttempts,
  };
}

async function heartbeatInboundEvent(params: {
  supabase: any;
  owner: InboundEventLeaseOwner;
  svixId: string | null;
  svixTimestamp: string | null;
}): Promise<void> {
  const { supabase, owner, svixId, svixTimestamp } = params;
  await applyOwnedInboundEventUpdate({
    supabase,
    owner,
    patch: {
      status: "processing",
      lock_expires_at: addMillisecondsIso(
        validPositiveInt(PROCESSING_LEASE_MS, 180000),
      ),
      last_svix_id: svixId,
      last_svix_timestamp: svixTimestamp,
    },
  });
}

async function finalizeInboundEvent(params: {
  supabase: any;
  owner: InboundEventLeaseOwner;
  userId?: string | null;
  status: "ignored" | "processed" | "failed" | "awaiting_review";
  errorText?: string;
  result?: Record<string, unknown>;
}) {
  await applyOwnedInboundEventUpdate({
    supabase: params.supabase,
    owner: params.owner,
    patch: {
      user_id: params.userId ?? null,
      status: params.status,
      error_text: params.errorText ?? null,
      result: params.result ?? null,
      processed_at: new Date().toISOString(),
      lock_expires_at: null,
    },
  });
}

async function finalizeInboundEventById(params: {
  supabase: any;
  rowId: string;
  userId?: string | null;
  status: "ignored" | "processed" | "failed" | "awaiting_review";
  errorText?: string;
  result?: Record<string, unknown>;
}) {
  const { data, error } = await params.supabase
    .from("email_import_events")
    .update({
      user_id: params.userId ?? null,
      status: params.status,
      error_text: params.errorText ?? null,
      result: params.result ?? null,
      processed_at: new Date().toISOString(),
      lock_expires_at: null,
    })
    .eq("id", params.rowId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`INBOUND_EVENT_UPDATE_FAILED:${error.message}`);
  }
  if (!data?.id) {
    throw new Error("INBOUND_EVENT_UPDATE_MISSING");
  }
}

async function markInboundEventRetryableFailure(params: {
  supabase: any;
  owner: InboundEventLeaseOwner;
  userId?: string | null;
  errorText: string;
}): Promise<void> {
  await applyOwnedInboundEventUpdate({
    supabase: params.supabase,
    owner: params.owner,
    patch: {
      user_id: params.userId ?? null,
      status: "processing",
      error_text: params.errorText,
      processed_at: null,
      lock_expires_at: addMillisecondsIso(-1000),
    },
  });
}

async function updateInboundEvent(params: {
  supabase: any;
  owner: InboundEventLeaseOwner | null;
  userId?: string | null;
  status: "ignored" | "processed" | "failed" | "awaiting_review";
  errorText?: string;
  result?: Record<string, unknown>;
}) {
  if (!params.owner) return;
  await finalizeInboundEvent({
    supabase: params.supabase,
    owner: params.owner,
    userId: params.userId ?? null,
    status: params.status,
    ...(typeof params.errorText === "string"
      ? { errorText: params.errorText }
      : {}),
    ...(params.result ? { result: params.result } : {}),
  });
}

async function resolveOwnerBySender(params: {
  supabase: any;
  normalizedSenderEmail: string;
}): Promise<ResolvedOwner | null> {
  const { supabase, normalizedSenderEmail } = params;

  const [{ data: matchingUsers }, { data: whitelistRows }] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, full_name, created_at")
      .eq("email", normalizedSenderEmail),
    supabase
      .from("email_import_sender_whitelist")
      .select("user_id, created_at")
      .eq("normalized_sender_email", normalizedSenderEmail),
  ]);

  const candidates = [
    ...(Array.isArray(matchingUsers)
      ? matchingUsers.map((row: any) => ({
        userId: String(row.id),
        normalizedSenderEmail,
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
        source: "default" as const,
      }))
      : []),
    ...(Array.isArray(whitelistRows)
      ? whitelistRows.map((row: any) => ({
        userId: String(row.user_id),
        normalizedSenderEmail,
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
        source: "whitelist" as const,
      }))
      : []),
  ];

  const resolved = resolveNewestSenderOwner(candidates);
  if (!resolved) return null;

  const [{ data: user }, { data: contact, error: contactError }] = await Promise
    .all([
      supabase
        .from("users")
        .select("email, full_name")
        .eq("id", resolved.userId)
        .maybeSingle(),
      supabase
        .from("user_contacts")
        .select(
          "email_import_enabled, email_import_household_id, email_import_is_portfolio, email_import_account_id, preferred_currency, preferred_timezone",
        )
        .eq("user_id", resolved.userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (contactError) {
    await reportEdgeFunctionError({
      functionName: "resend-inbound-webhook",
      error: contactError,
      context: {
        operation: "user_contacts.select_email_import_settings",
        userId: resolved.userId,
      },
    });
  }

  const defaultEmail = normalizeEmailAddress(user?.email) ||
    normalizedSenderEmail;
  const accountId = sanitizeUuid(contact?.email_import_account_id ?? null);

  return {
    userId: resolved.userId,
    fullName: typeof user?.full_name === "string" ? user.full_name : null,
    defaultEmail,
    enabled: contact?.email_import_enabled === true,
    preferredCurrency: typeof contact?.preferred_currency === "string" &&
        contact.preferred_currency.trim().length > 0
      ? contact.preferred_currency.trim().toUpperCase()
      : "USD",
    preferredTimezone: typeof contact?.preferred_timezone === "string" &&
        contact.preferred_timezone.trim().length > 0
      ? contact.preferred_timezone.trim()
      : null,
    householdId: sanitizeUuid(contact?.email_import_household_id ?? null),
    isPortfolio: contact?.email_import_is_portfolio === true,
    accountId,
  };
}

function hasVerifiedSender(headers?: Record<string, string>): boolean {
  if (!headers) return false;

  const combined = Object.entries(headers)
    .filter((entry) =>
      [
        "authentication-results",
        "arc-authentication-results",
        "received-spf",
      ].includes(entry[0].toLowerCase())
    )
    .map((entry) => entry[1].toLowerCase())
    .join(" ");

  if (!combined) return false;

  return (
    combined.includes("spf=pass") ||
    combined.includes("dkim=pass") ||
    combined.includes("dmarc=pass") ||
    combined.includes("sender spf authorized")
  );
}

async function loadCategoryContext(params: { supabase: any; userId: string }) {
  const { supabase, userId } = params;
  const [customCategories, hiddenCategories, preferences] = await Promise.all([
    fetchUserCustomCategories({ supabase, userId }),
    fetchUserHiddenCategories({ supabase, userId }),
    fetchUserCategoryPreferences({ supabase, userId, limit: 60 }),
  ]);

  const merged = mergeAllowedCategories({
    customCategories,
    hiddenCategories,
  });

  return {
    allowedExpenseCategories: merged.expenseCategories,
    allowedIncomeCategories: merged.incomeCategories,
    categoryPreferences: preferences,
  };
}

function deduplicateImportedTransactions(params: {
  items: Array<Record<string, unknown>>;
  userId: string;
  householdId: string | null;
  accountId: string | null;
}): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const unique: Array<Record<string, unknown>> = [];

  for (const item of params.items) {
    const amount = Number(item.amount);
    const date = typeof item.date === "string" ? item.date : "";
    if (!Number.isFinite(amount) || amount <= 0 || !date) {
      unique.push(item);
      continue;
    }

    const key = buildImportSemanticKey({
      userId: params.userId,
      householdId: params.householdId,
      accountId: params.accountId,
      type: item.type === "income" ? "income" : "expense",
      amountCents: Math.round(amount * 100),
      currency: typeof item.currency === "string" ? item.currency : null,
      date,
      category: typeof item.category === "string" ? item.category : null,
      description: typeof item.description === "string" ? item.description : "",
    });
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

async function createInboundReview(params: {
  supabase: any;
  eventId: string;
  eventAttemptCount: number;
  userId: string;
  eventResult: Record<string, unknown>;
  candidates: Array<{
    candidate: Record<string, unknown>;
    issues: unknown;
    evidenceText: string;
  }>;
}): Promise<{ reviewId: string; token: string } | null> {
  if (params.candidates.length === 0) return null;
  const token = createEmailImportReviewToken();
  const tokenHash = await hashEmailImportReviewToken(token);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const { data: reviewId, error } = await params.supabase.rpc(
    "create_email_import_review",
    {
      p_event_id: params.eventId,
      p_processing_attempt_count: params.eventAttemptCount,
      p_user_id: params.userId,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
      p_items: params.candidates,
      p_event_result: params.eventResult,
    },
  );
  if (error || !reviewId) throw new Error("EMAIL_IMPORT_REVIEW_CREATE_FAILED");
  return { reviewId, token };
}

async function releaseInboundReviewAfterDeliveryFailure(params: {
  supabase: any;
  reviewId: string;
  eventId: string;
  eventAttemptCount: number;
}): Promise<boolean> {
  const { data: released, error } = await params.supabase.rpc(
    "release_email_import_review_delivery",
    {
      p_review_id: params.reviewId,
      p_event_id: params.eventId,
      p_processing_attempt_count: params.eventAttemptCount,
    },
  );
  if (error) {
    throw new Error("EMAIL_IMPORT_REVIEW_RELEASE_FAILED");
  }
  return released === true;
}

function boundedReviewEvidence(
  sourceText: string,
  candidate: Record<string, unknown>,
  issues: Array<{
    choices?: Array<{ evidence?: unknown }>;
  }> = [],
): string {
  const terms = [
    candidate.amount,
    candidate.currency,
    candidate.date,
    candidate.merchant,
    candidate.description,
    ...issues.flatMap((issue) =>
      (issue.choices ?? []).map((choice) => choice.evidence)
    ),
  ]
    .filter(
      (value): value is string | number =>
        typeof value === "string" || typeof value === "number",
    )
    .map((value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return Array.from(
    new Set(
      terms.flatMap(
        (term) =>
          sourceText.match(new RegExp(`.{0,180}${term}.{0,180}`, "i"))?.[0] ??
            [],
      ),
    ),
  )
    .join("\n")
    .slice(0, 1200);
}

function sortImportedTransactions(
  items: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return [...items].sort((left, right) => {
    const leftDate = typeof left.date === "string" ? left.date : "";
    const rightDate = typeof right.date === "string" ? right.date : "";
    if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);

    const leftType = left.type === "income" ? "income" : "expense";
    const rightType = right.type === "income" ? "income" : "expense";
    if (leftType !== rightType) return leftType.localeCompare(rightType);

    const leftAmount = Number(left.amount ?? 0);
    const rightAmount = Number(right.amount ?? 0);
    if (leftAmount !== rightAmount) return leftAmount - rightAmount;

    const leftDescription = typeof left.description === "string"
      ? left.description
      : typeof left.merchant === "string"
      ? left.merchant
      : "";
    const rightDescription = typeof right.description === "string"
      ? right.description
      : typeof right.merchant === "string"
      ? right.merchant
      : "";
    return leftDescription.localeCompare(rightDescription);
  });
}

function buildImportFollowupAppUrl(
  saveResults: Array<{ id?: string; success?: boolean; duplicate?: boolean }>,
): string {
  const savedResults = saveResults.filter(
    (item) =>
      item.success === true &&
      item.duplicate !== true &&
      typeof item.id === "string" &&
      item.id.trim().length > 0,
  );

  if (savedResults.length === 1) {
    return `moneko://expense/${encodeURIComponent(savedResults[0].id!.trim())}`;
  }

  return APP_TRANSACTIONS_URL;
}

async function getFcmAccessToken(): Promise<string | null> {
  if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: serviceAccount.private_key_id,
    };
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    };

    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const encodedClaims = btoa(JSON.stringify(claims))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const unsignedToken = `${encodedHeader}.${encodedClaims}`;

    const privateKeyPem = String(serviceAccount.private_key || "")
      .replace(/\\n/g, "\n")
      .trim();
    const match = privateKeyPem.match(
      /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/,
    );
    if (!match?.[1]) return null;

    const binaryKey = Uint8Array.from(
      atob(match[1].replace(/\r|\n/g, "")),
      (c) => c.charCodeAt(0),
    );
    const key = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(unsignedToken),
    );
    const encodedSignature = btoa(
      String.fromCharCode(...Array.from(new Uint8Array(signature))),
    )
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsignedToken}.${encodedSignature}`,
      }),
    });
    if (!response.ok) return null;

    const payload = await response.json();
    return payload.access_token as string;
  } catch {
    return null;
  }
}

async function fetchActiveDevices(
  supabase: any,
  userId: string,
): Promise<Array<{ token: string; platform: string | null }>> {
  const { data, error } = await supabase
    .from("devices")
    .select("push_token, platform")
    .eq("user_id", userId)
    .eq("is_active", true)
    .not("push_token", "is", null);

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data
    .map((row: any) => ({
      token: typeof row?.push_token === "string" ? row.push_token.trim() : "",
      platform: typeof row?.platform === "string" ? row.platform : null,
    }))
    .filter((row: { token: string }) => row.token.length > 0)
    .filter(
      (row, index, rows) =>
        rows.findIndex((item) => item.token === row.token) === index,
    );
}

async function sendFcmV1Notification(params: {
  supabase: any;
  deviceToken: string;
  title: string;
  body: string;
  data: Record<string, string>;
  accessToken: string;
  platform?: string;
}): Promise<boolean> {
  const { supabase, deviceToken, title, body, data, accessToken, platform } =
    params;

  if (!FIREBASE_PROJECT_ID) return false;

  try {
    const isWeb = typeof platform === "string" &&
      /^(web|webpush|web_push|browser)$/i.test(platform);
    const message = {
      message: {
        token: deviceToken,
        notification: { title, body },
        data: {
          ...data,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          headers: {
            "apns-topic": APNS_BUNDLE_ID,
            "apns-push-type": "alert",
            "apns-priority": "10",
          },
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            deep_link: data.deep_link || "moneko://home",
          },
        },
        ...(isWeb
          ? {
            webpush: {
              data: {
                ...data,
                deep_link: data.deep_link || "moneko://home",
              },
              fcm_options: {
                link: APP_URL,
              },
            },
          }
          : {}),
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      },
    );

    if (response.ok) return true;

    const errorText = await response.text();
    if (
      errorText.includes("UNREGISTERED") ||
      errorText.includes("INVALID_ARGUMENT")
    ) {
      await supabase
        .from("devices")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("push_token", deviceToken);
    }

    return false;
  } catch {
    return false;
  }
}

async function sendImportProcessedNotification(params: {
  supabase: any;
  owner: ResolvedOwner;
  senderEmail: string;
  savedCount: number;
}): Promise<void> {
  const { supabase, owner, senderEmail, savedCount } = params;

  const devices = await fetchActiveDevices(supabase, owner.userId);
  if (!devices.length) return;

  const accessToken = await getFcmAccessToken();
  if (!accessToken) return;

  const title = `Your files are ready!`;
  const body = `${savedCount} ${
    pluralize(
      savedCount,
      "transaction",
    )
  } have been added to your account`;
  const data = {
    event_type: "email_import_processed",
    notification_type: "email_import_processed",
    sender_email: senderEmail,
    saved_count: String(savedCount),
    deep_link: "moneko://home",
  };

  await Promise.allSettled(
    devices.map((device) =>
      sendFcmV1Notification({
        supabase,
        deviceToken: device.token,
        title,
        body,
        data,
        accessToken,
        platform: device.platform ?? undefined,
      })
    ),
  );
}

async function fetchResendJson(path: string): Promise<any> {
  const response = await fetchWithTimeout(
    `https://api.resend.com${path}`,
    {
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
    },
    NETWORK_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Resend API ${response.status}: ${errorText}`);
  }

  return await response.json();
}

export async function handleResendInboundWebhook(
  req: Request,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, "METHOD_NOT_ALLOWED");
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");

  const missingConfig = [
    !SUPABASE_URL ? "SUPABASE_URL" : null,
    !SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    !GEMINI_API_KEY ? "GEMINI_API_KEY" : null,
    !RESEND_WEBHOOK_SECRET ? "RESEND_WEBHOOK_SECRET" : null,
    !RESEND_API_KEY ? "RESEND_API_KEY" : null,
  ].filter((value): value is string => value !== null);

  if (missingConfig.length > 0) {
    console.error("[resend-inbound-webhook] missing configuration", {
      missingConfig,
    });
    return errorResponse(
      `Server configuration error: missing ${missingConfig.join(", ")}`,
      500,
      "SERVER_ERROR",
    );
  }

  const requiredSupabaseUrl = SUPABASE_URL!;
  const requiredServiceRoleKey = SUPABASE_SERVICE_ROLE_KEY!;
  const requiredGeminiApiKey = GEMINI_API_KEY!;
  const requiredWebhookSecret = RESEND_WEBHOOK_SECRET!;
  const processingStartedAtMs = Date.now();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  const rawPayload = await req.text();

  let event: ResendReceivedEvent;
  try {
    const webhook = new Webhook(requiredWebhookSecret);
    event = webhook.verify(rawPayload, {
      "svix-id": svixId || "",
      "svix-timestamp": svixTimestamp || "",
      "svix-signature": svixSignature || "",
    }) as ResendReceivedEvent;
  } catch (error) {
    console.error("[resend-inbound-webhook] verification failed", error);
    return errorResponse("Invalid webhook", 401, "UNAUTHORIZED");
  }

  console.log("[resend-inbound-webhook] webhook verified", {
    type: event.type,
    emailId: event.data?.email_id ?? null,
  });

  if (event.type !== "email.received" || !event.data?.email_id) {
    return jsonResponse({ success: true, ignored: true });
  }
  const emailData = event.data as NonNullable<ResendReceivedEvent["data"]> & {
    email_id: string;
  };

  console.log("[resend-inbound-webhook] received email", {
    emailId: emailData.email_id,
    createdAt: emailData.created_at ?? event.created_at ?? null,
    from: emailData.from ?? null,
    to: Array.isArray(emailData.to) ? emailData.to : [],
    subject: emailData.subject ?? null,
    attachmentCount: Array.isArray(emailData.attachments)
      ? emailData.attachments.length
      : null,
  });

  if (!shouldProcessInboundToConfiguredInboxes(emailData.to)) {
    console.log("[resend-inbound-webhook] ignored recipient mismatch", {
      emailId: emailData.email_id,
      to: Array.isArray(emailData.to) ? emailData.to : [],
      expectedInboxes: IMPORT_INBOX_EMAILS,
    });
    return jsonResponse({
      success: true,
      ignored: true,
      reason: "RECIPIENT_MISMATCH",
    });
  }

  const senderEmail = normalizeEmailAddress(emailData.from);
  if (!senderEmail) {
    return errorResponse("Invalid sender email", 400, "INVALID_EMAIL");
  }

  const supabase = createClient(requiredSupabaseUrl, requiredServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "moneko-resend-inbound-webhook" },
    },
  });

  const claim = await claimInboundEvent({
    supabase,
    emailId: emailData.email_id,
    senderEmail,
    normalizedSenderEmail: senderEmail,
    svixId,
    svixTimestamp,
  });
  if (claim.kind === "duplicate") {
    const duplicatePayload = {
      success: true,
      duplicate: true,
      status: claim.status,
      in_progress: claim.inProgress,
      processed_at: claim.processedAt,
      reason: claim.reason,
    };
    return jsonResponse(
      duplicatePayload,
      resolveDuplicateWebhookStatusCode(claim.inProgress),
    );
  }
  const leaseOwner = claim.owner;

  const processingPromise = (async () => {
    const backgroundStartedAtMs = Date.now();
    let currentStage = "started";
    const setStage = (
      stage: string,
      detail?: Record<string, unknown>,
    ): void => {
      currentStage = stage;
      console.log("[resend-inbound-webhook] background stage", {
        emailId: emailData.email_id,
        stage,
        elapsedMs: Date.now() - backgroundStartedAtMs,
        ...(detail ?? {}),
      });
    };
    const heartbeat = setInterval(() => {
      console.log("[resend-inbound-webhook] background heartbeat", {
        emailId: emailData.email_id,
        stage: currentStage,
        elapsedMs: Date.now() - backgroundStartedAtMs,
        attemptCount: leaseOwner.attemptCount,
      });
    }, 30000);

    console.log("[resend-inbound-webhook] background processing started", {
      emailId: emailData.email_id,
      recovered: claim.recovered,
      attemptCount: leaseOwner.attemptCount,
    });

    try {
      setStage("owner_lookup_start");
      ensureSoftDeadline(processingStartedAtMs, "owner_lookup");
      const owner = await resolveOwnerBySender({
        supabase,
        normalizedSenderEmail: senderEmail,
      });
      setStage("owner_lookup_complete", {
        resolvedUserId: owner?.userId ?? null,
        enabled: owner?.enabled ?? null,
      });

      console.log("[resend-inbound-webhook] owner lookup", {
        emailId: emailData.email_id,
        senderEmail,
        resolvedUserId: owner?.userId ?? null,
        enabled: owner?.enabled ?? null,
        householdId: owner?.householdId ?? null,
        isPortfolio: owner?.isPortfolio ?? null,
        accountId: owner?.accountId ?? null,
      });

      if (!owner) {
        const unavailable = buildUnavailableEmail({
          senderEmail,
          reason: importUnavailableReasons.senderNotWhitelisted,
        });
        await updateInboundEvent({
          supabase,
          owner: leaseOwner,
          status: "ignored",
          errorText: "SENDER_NOT_WHITELISTED",
        });
        try {
          await sendEmail({
            to: senderEmail,
            from: EMAIL_FROM,
            subject: unavailable.subject,
            html: unavailable.html,
            text: unavailable.text,
          });
        } catch (sideEffectError) {
          console.error(
            "[resend-inbound-webhook] unavailable email failed after finalization",
            sideEffectError,
          );
        }
        return jsonResponse({ success: true, ignored: true });
      }

      if (!owner.enabled) {
        const unavailable = buildUnavailableEmail({
          senderEmail,
          reason: importUnavailableReasons.importDisabled,
        });
        await updateInboundEvent({
          supabase,
          owner: leaseOwner,
          userId: owner.userId,
          status: "ignored",
          errorText: "EMAIL_IMPORT_DISABLED",
        });
        try {
          await sendEmail({
            to: senderEmail,
            from: EMAIL_FROM,
            subject: unavailable.subject,
            html: unavailable.html,
            text: unavailable.text,
          });
        } catch (sideEffectError) {
          console.error(
            "[resend-inbound-webhook] unavailable email failed after finalization",
            sideEffectError,
          );
        }
        return jsonResponse({ success: true, ignored: true });
      }

      try {
        const subscription = await loadLatestSubscriptionForUser(
          supabase,
          owner.userId,
        );
        if (!hasPlusEntitlement(subscription)) {
          const unavailable = buildUnavailableEmail({
            senderEmail,
            reason: importUnavailableReasons.subscriptionRequired,
          });
          await updateInboundEvent({
            supabase,
            owner: leaseOwner,
            userId: owner.userId,
            status: "ignored",
            errorText: "SUBSCRIPTION_REQUIRED",
          });
          try {
            await sendEmail({
              to: senderEmail,
              from: EMAIL_FROM,
              subject: unavailable.subject,
              html: unavailable.html,
              text: unavailable.text,
            });
          } catch (sideEffectError) {
            console.error(
              "[resend-inbound-webhook] subscription email failed after finalization",
              sideEffectError,
            );
          }
          return jsonResponse({ success: true, ignored: true });
        }
      } catch (subscriptionError) {
        await reportEdgeFunctionError({
          functionName: "resend-inbound-webhook",
          error: subscriptionError,
          context: {
            operation: "subscriptions.select_entitlement",
            userId: owner.userId,
          },
        });
        await updateInboundEvent({
          supabase,
          owner: leaseOwner,
          userId: owner.userId,
          status: "failed",
          errorText: "SUBSCRIPTION_CHECK_FAILED",
        });
        return jsonResponse(
          { success: false, error: "Failed to verify subscription" },
          500,
        );
      }

      setStage("initial_heartbeat_start");
      await heartbeatInboundEvent({
        supabase,
        owner: leaseOwner,
        svixId,
        svixTimestamp,
      });
      setStage("initial_heartbeat_complete");
      ensureSoftDeadline(processingStartedAtMs, "resend_fetch_metadata");

      setStage("resend_fetch_metadata_start");
      const [emailContentResult, attachmentListResponse] = await Promise.all([
        fetchResendJson(`/emails/receiving/${emailData.email_id}`),
        fetchResendJson(`/emails/receiving/${emailData.email_id}/attachments`)
          .then((value) => ({ data: value, error: null }))
          .catch((error) => ({ data: null, error })),
      ]);
      setStage("resend_fetch_metadata_complete", {
        attachmentFetchFailed: attachmentListResponse.error != null,
      });

      console.log("[resend-inbound-webhook] fetched email metadata", {
        emailId: emailData.email_id,
        hasText:
          typeof (emailContentResult as { text?: string | null })?.text ===
            "string",
        attachmentFetchFailed: attachmentListResponse.error != null,
      });

      const emailContent = emailContentResult as {
        text?: string;
        html?: string;
        headers?: Record<string, string>;
      } | null;

      if (!hasVerifiedSender(emailContent?.headers)) {
        const unavailable = buildUnavailableEmail({
          senderEmail,
          reason: importUnavailableReasons.senderNotVerified,
        });
        await updateInboundEvent({
          supabase,
          owner: leaseOwner,
          userId: owner.userId,
          status: "ignored",
          errorText: "SENDER_NOT_VERIFIED",
        });
        try {
          await sendEmail({
            to: senderEmail,
            from: EMAIL_FROM,
            subject: unavailable.subject,
            html: unavailable.html,
            text: unavailable.text,
          });
        } catch (sideEffectError) {
          console.error(
            "[resend-inbound-webhook] unavailable email failed after finalization",
            sideEffectError,
          );
        }
        return jsonResponse({ success: true, ignored: true });
      }

      if (
        attachmentListResponse.error != null &&
        !emailContent?.text &&
        !emailContent?.html
      ) {
        throw new Error("ATTACHMENT_FETCH_FAILED");
      }
      if (attachmentListResponse.error != null) {
        console.warn(
          "[resend-inbound-webhook] attachment list unavailable; processing email body only",
          { emailId: emailData.email_id },
        );
      }

      const supportedAttachments = filterSupportedImportAttachments(
        Array.isArray((attachmentListResponse.data as any)?.data)
          ? (attachmentListResponse.data as any).data
          : [],
      ).slice(0, MAX_SUPPORTED_ATTACHMENTS);
      const resolvedEmailBody = resolveInboundEmailText({
        text: emailContent?.text,
        html: emailContent?.html,
      });
      const emailBodyText = resolvedEmailBody.text;

      console.log("[resend-inbound-webhook] supported attachments", {
        emailId: emailData.email_id,
        attachmentCount: supportedAttachments.length,
        emailBodyTextLength: emailBodyText.length,
        emailBodySource: resolvedEmailBody.source,
        attachments: supportedAttachments.map((attachment) => ({
          filename: attachment.filename,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
        })),
      });

      if (supportedAttachments.length === 0 && !emailBodyText) {
        const unavailable = buildUnavailableEmail({
          senderEmail,
          reason: importUnavailableReasons.noSupportedContent,
        });
        await updateInboundEvent({
          supabase,
          owner: leaseOwner,
          userId: owner.userId,
          status: "ignored",
          errorText: "NO_SUPPORTED_IMPORT_CONTENT",
        });
        try {
          await sendEmail({
            to: senderEmail,
            from: EMAIL_FROM,
            subject: unavailable.subject,
            html: unavailable.html,
            text: unavailable.text,
          });
        } catch (sideEffectError) {
          console.error(
            "[resend-inbound-webhook] unavailable email failed after finalization",
            sideEffectError,
          );
        }
        return jsonResponse({ success: true, ignored: true });
      }

      setStage("load_category_context_start");
      const categoryContext = await loadCategoryContext({
        supabase,
        userId: owner.userId,
      });
      setStage("load_category_context_complete", {
        expenseCategoryCount: categoryContext.allowedExpenseCategories.length,
        incomeCategoryCount: categoryContext.allowedIncomeCategories.length,
        preferenceCount: categoryContext.categoryPreferences.length,
      });

      const attachmentResults: AttachmentProcessingResult[] = [];
      const analyzedItems: Array<Record<string, unknown>> = [];
      let rejectedItemCount = 0;
      const reviewCandidates: Array<{
        candidate: Record<string, unknown>;
        issues: unknown;
        evidenceText: string;
      }> = [];
      const unresolvedAiItems: Array<{
        item: Record<string, unknown>;
        reasons: string[];
      }> = [];

      for (
        let attachmentIndex = 0;
        attachmentIndex < supportedAttachments.length;
        attachmentIndex++
      ) {
        const attachment = supportedAttachments[attachmentIndex];
        try {
          setStage("attachment_start", {
            attachmentIndex: attachmentIndex + 1,
            attachmentCount: supportedAttachments.length,
            filename: attachment.filename,
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
          });
          ensureSoftDeadline(processingStartedAtMs, "attachment_processing");
          setStage("attachment_heartbeat_start", {
            filename: attachment.filename,
          });
          await heartbeatInboundEvent({
            supabase,
            owner: leaseOwner,
            svixId,
            svixTimestamp,
          });
          setStage("attachment_heartbeat_complete", {
            filename: attachment.filename,
          });
          console.log("[resend-inbound-webhook] processing attachment", {
            emailId: emailData.email_id,
            filename: attachment.filename,
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
          });
          if (
            attachment.sizeBytes != null &&
            attachment.sizeBytes > MAX_SUPPORTED_ATTACHMENT_BYTES
          ) {
            attachmentResults.push({
              filename: attachment.filename,
              success: false,
              itemCount: 0,
              error:
                "Attachment is too large. The current limit is 20 MB per file.",
            });
            continue;
          }

          setStage("attachment_download_start", {
            filename: attachment.filename,
          });
          const response = await fetchWithTimeout(
            attachment.downloadUrl,
            {},
            NETWORK_TIMEOUT_MS,
          );
          setStage("attachment_download_response", {
            filename: attachment.filename,
            status: response.status,
            contentLength: response.headers.get("content-length") ?? null,
          });
          if (!response.ok) {
            throw new Error(
              `Failed to download attachment (${response.status})`,
            );
          }
          const contentLengthHeader = response.headers.get("content-length") ||
            "";
          const contentLength = Number.parseInt(contentLengthHeader, 10);
          if (
            Number.isFinite(contentLength) &&
            contentLength > MAX_SUPPORTED_ATTACHMENT_BYTES
          ) {
            attachmentResults.push({
              filename: attachment.filename,
              success: false,
              itemCount: 0,
              error:
                "Attachment is too large. The current limit is 20 MB per file.",
            });
            continue;
          }
          setStage("attachment_read_bytes_start", {
            filename: attachment.filename,
          });
          const bytes = new Uint8Array(await response.arrayBuffer());
          setStage("attachment_read_bytes_complete", {
            filename: attachment.filename,
            bytesLength: bytes.length,
          });
          if (bytes.length > MAX_SUPPORTED_ATTACHMENT_BYTES) {
            attachmentResults.push({
              filename: attachment.filename,
              success: false,
              itemCount: 0,
              error:
                "Attachment is too large. The current limit is 20 MB per file.",
            });
            continue;
          }
          const analyzeBody: AnalyzeRequestBody = {
            userId: owner.userId,
            date: (
              emailData.created_at ||
              event.created_at ||
              new Date().toISOString()
            ).slice(0, 10),
            currency: owner.preferredCurrency,
            attachments: [
              {
                filename: attachment.filename,
                contentType: attachment.contentType,
                data: encodeBase64(bytes),
              },
            ],
            allowedExpenseCategories: categoryContext.allowedExpenseCategories,
            allowedIncomeCategories: categoryContext.allowedIncomeCategories,
            categoryPreferences: categoryContext.categoryPreferences,
          };

          setStage("attachment_analyze_start", {
            filename: attachment.filename,
            bytesLength: bytes.length,
          });
          const result = await runAnalyzeExpense(
            analyzeBody,
            requiredGeminiApiKey,
            (progress) => {
              console.log("[resend-inbound-webhook] analyze progress", {
                emailId: emailData.email_id,
                filename: attachment.filename,
                elapsedMs: Date.now() - backgroundStartedAtMs,
                type: progress.type,
                current: progress.current ?? null,
                total: progress.total ?? null,
                message: progress.message ?? null,
              });
            },
          );
          setStage("attachment_analyze_complete", {
            filename: attachment.filename,
            success: result.success,
            itemCount: Array.isArray(result.items) ? result.items.length : 0,
            status: result.status ?? null,
            code: result.code ?? null,
          });
          const resultCurrencies = Array.isArray(result.items)
            ? Array.from(
              new Set(
                result.items
                  .map((item) =>
                    typeof item?.currency === "string"
                      ? item.currency.trim().toUpperCase()
                      : ""
                  )
                  .filter((currency) => currency.length > 0),
              ),
            )
            : [];
          console.log("[resend-inbound-webhook] analyze result", {
            emailId: emailData.email_id,
            filename: attachment.filename,
            success: result.success,
            itemCount: Array.isArray(result.items) ? result.items.length : 0,
            requestCurrency: owner.preferredCurrency,
            resultCurrencies,
            status: result.status ?? null,
            code: result.code ?? null,
            error: result.success ? null : (result.error ?? null),
          });
          if (!result.success && isRetryableAnalyzeFailure(result)) {
            throw new Error(
              result.error ||
                result.code ||
                "RETRYABLE_ATTACHMENT_ANALYSIS_FAILURE",
            );
          }
          if (
            !result.success ||
            !Array.isArray(result.items) ||
            result.items.length === 0
          ) {
            attachmentResults.push({
              filename: attachment.filename,
              success: false,
              itemCount: 0,
              error: result.error || "No transactions found",
            });
            continue;
          }

          const mappedItems = result.items.map((item) => ({
            type: item.type,
            amount: item.amount,
            category: item.category,
            currency: item.currency,
            date: item.date,
            ...(typeof item.description === "string" &&
                item.description.trim().length > 0
              ? { description: item.description.trim() }
              : {}),
            ...(typeof item.merchant === "string" &&
                item.merchant.trim().length > 0
              ? { merchant: item.merchant.trim() }
              : {}),
            ...(Array.isArray(item.breakdown) && item.breakdown.length > 0
              ? { breakdown: item.breakdown }
              : {}),
            ...(item.payerUserId ? { payerUserId: item.payerUserId } : {}),
            ...(item.customSplits ? { customSplits: item.customSplits } : {}),
            ...(owner.accountId ? { accountId: owner.accountId } : {}),
          }));

          analyzedItems.push(...mappedItems);
          attachmentResults.push({
            filename: attachment.filename,
            success: true,
            itemCount: mappedItems.length,
            items: mappedItems,
          });
          setStage("attachment_complete", {
            filename: attachment.filename,
            mappedItemCount: mappedItems.length,
            aggregateItemCount: analyzedItems.length,
          });
        } catch (error) {
          setStage("attachment_error", {
            filename: attachment.filename,
            retryable: isRetryableAttachmentError(error),
            error: error instanceof Error ? error.message : String(error),
          });
          if (isRetryableAttachmentError(error)) {
            throw error;
          }
          console.error(
            "[resend-inbound-webhook] attachment processing failed",
            {
              emailId: emailData.email_id,
              filename: attachment.filename,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          attachmentResults.push({
            filename: attachment.filename,
            success: false,
            itemCount: 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (emailBodyText) {
        try {
          setStage("email_body_analyze_start", {
            textLength: emailBodyText.length,
          });
          ensureSoftDeadline(processingStartedAtMs, "email_body_processing");
          await heartbeatInboundEvent({
            supabase,
            owner: leaseOwner,
            svixId,
            svixTimestamp,
          });
          const result = await runAnalyzeExpense(
            {
              userId: owner.userId,
              date: (
                emailData.created_at ||
                event.created_at ||
                new Date().toISOString()
              ).slice(0, 10),
              currency: owner.preferredCurrency,
              text: emailBodyText,
              allowDeterministicTextFallback: false,
              allowedExpenseCategories:
                categoryContext.allowedExpenseCategories,
              allowedIncomeCategories: categoryContext.allowedIncomeCategories,
              categoryPreferences: categoryContext.categoryPreferences,
            },
            requiredGeminiApiKey,
            (progress) => {
              console.log(
                "[resend-inbound-webhook] email body analyze progress",
                {
                  emailId: emailData.email_id,
                  elapsedMs: Date.now() - backgroundStartedAtMs,
                  type: progress.type,
                  current: progress.current ?? null,
                  total: progress.total ?? null,
                  message: progress.message ?? null,
                },
              );
            },
          );
          if (!result.success && isRetryableAnalyzeFailure(result)) {
            const retryableError = new Error(
              result.error ||
                result.code ||
                "RETRYABLE_EMAIL_BODY_ANALYSIS_FAILURE",
            );
            await reportEdgeFunctionError({
              functionName: "resend-inbound-webhook",
              error: retryableError,
              context: {
                operation: "email_body_analysis_retryable_failure",
                providerEmailId: emailData.email_id,
                emailBodySource: resolvedEmailBody.source,
                resultCode: result.code || null,
                resultStatus: result.status || null,
              },
            });
            throw retryableError;
          }
          let bodyItems = Array.isArray(result.items) ? result.items : [];
          if (bodyItems.length > 0) {
            const firstPassItems = bodyItems;
            bodyItems = [];
            for (const item of firstPassItems) {
              const grounding = decideEmailImportGrounding({
                sourceText: emailBodyText,
                item: item as unknown as Record<string, unknown>,
              });
              if (grounding.kind === "review") {
                unresolvedAiItems.push({
                  item: grounding.candidate,
                  reasons: ["REQUIRES_AI_SEMANTIC_GROUNDING"],
                });
                continue;
              }
              if (grounding.kind === "reject") {
                unresolvedAiItems.push({
                  item: item as unknown as Record<string, unknown>,
                  reasons: grounding.reasons,
                });
                continue;
              }
              unresolvedAiItems.push({
                item: grounding.transaction,
                reasons: ["REQUIRES_AI_SEMANTIC_GROUNDING"],
              });
            }
          }
          if (
            unresolvedAiItems.length > 0 ||
            (bodyItems.length === 0 && reviewCandidates.length === 0)
          ) {
            let aiDecisions: ImportGroundingDecision[] = [];
            try {
              aiDecisions = await classifyEmailImportWithAi({
                sourceText: emailBodyText,
                receivedDate: emailData.created_at ||
                  event.created_at ||
                  new Date().toISOString(),
                preferredCurrency: owner.preferredCurrency,
                allowedExpenseCategories:
                  categoryContext.allowedExpenseCategories,
                allowedIncomeCategories:
                  categoryContext.allowedIncomeCategories,
                rejectedCandidates: unresolvedAiItems,
              });
            } catch (error) {
              if (
                shouldEscalateEmailImportAiFailure(unresolvedAiItems.length)
              ) {
                throw error;
              }
              console.info(
                "[resend-inbound-webhook] no-candidate AI classifier unavailable",
                { providerEmailId: emailData.email_id },
              );
            }
            const decisionCounts = {
              accept: 0,
              autoRepair: 0,
              review: 0,
              reject: 0,
            };
            for (const decision of aiDecisions) {
              if (decision.kind === "accept") {
                decisionCounts.accept += 1;
                bodyItems.push(
                  decision.transaction as unknown as (typeof bodyItems)[number],
                );
              } else if (decision.kind === "auto_repair") {
                decisionCounts.autoRepair += 1;
                bodyItems.push(
                  decision.transaction as unknown as (typeof bodyItems)[number],
                );
              } else if (decision.kind === "review") {
                decisionCounts.review += 1;
                reviewCandidates.push({
                  candidate: decision.candidate,
                  issues: decision.issues,
                  evidenceText: boundedReviewEvidence(
                    emailBodyText,
                    decision.candidate,
                    decision.issues,
                  ),
                });
              } else {
                decisionCounts.reject += 1;
                rejectedItemCount += 1;
              }
            }
            if (aiDecisions.length === 0) {
              rejectedItemCount += Math.max(1, unresolvedAiItems.length);
            }
            console.info(
              "[resend-inbound-webhook] email import AI review classified",
              {
                providerEmailId: emailData.email_id,
                decisionCounts,
              },
            );
          }
          if (bodyItems.length === 0) {
            const fallback = extractLabeledTransactionFallback({
              sourceText: emailBodyText,
              receivedDate: emailData.created_at ||
                event.created_at ||
                new Date().toISOString(),
            });
            if (fallback) {
              bodyItems = [
                {
                  ...fallback,
                  category: "other",
                  currencySymbol: "",
                },
              ];
              console.info(
                "[resend-inbound-webhook] labeled fallback recovered email import",
                { providerEmailId: emailData.email_id },
              );
            }
          }

          if (bodyItems.length === 0) {
            // A note accompanying a file is valid even when it does not
            // describe another transaction, so only surface this result when
            // the body was the sole import source.
            if (supportedAttachments.length === 0) {
              const failureMessage = result.error || "No transactions found";
              console.info(
                "[resend-inbound-webhook] email body contained no importable transaction",
                {
                  providerEmailId: emailData.email_id,
                  resultCode: result.code || null,
                },
              );
              attachmentResults.push({
                filename: "Email body",
                success: false,
                itemCount: 0,
                error: failureMessage,
              });
            }
          } else {
            const mappedItems = bodyItems.map((item) => {
              const clientCreatedAt =
                typeof item.transactionTime === "string" &&
                  owner.preferredTimezone
                  ? localDateTimeToUtcIso({
                    date: item.date,
                    time: item.transactionTime,
                    timeZone: owner.preferredTimezone,
                    referenceInstant: emailData.created_at ||
                      event.created_at || null,
                  })
                  : null;
              return {
                type: item.type,
                amount: item.amount,
                category: item.category,
                currency: item.currency,
                date: item.date,
                ...(typeof item.description === "string" &&
                    item.description.trim().length > 0
                  ? { description: item.description.trim() }
                  : {}),
                ...(typeof item.merchant === "string" &&
                    item.merchant.trim().length > 0
                  ? { merchant: item.merchant.trim() }
                  : {}),
                ...(Array.isArray(item.breakdown) && item.breakdown.length > 0
                  ? { breakdown: item.breakdown }
                  : {}),
                ...(item.payerUserId ? { payerUserId: item.payerUserId } : {}),
                ...(item.customSplits
                  ? { customSplits: item.customSplits }
                  : {}),
                ...(clientCreatedAt ? { clientCreatedAt } : {}),
                ...(owner.accountId ? { accountId: owner.accountId } : {}),
              };
            });
            analyzedItems.push(...mappedItems);
            attachmentResults.push({
              filename: "Email body",
              success: true,
              itemCount: mappedItems.length,
              items: mappedItems,
            });
          }
          setStage("email_body_analyze_complete", {
            success: result.success,
            itemCount: Array.isArray(result.items) ? result.items.length : 0,
          });
        } catch (error) {
          if (isRetryableAttachmentError(error)) throw error;
          console.error(
            "[resend-inbound-webhook] email body processing failed",
            {
              emailId: emailData.email_id,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          if (supportedAttachments.length === 0) {
            await reportEdgeFunctionError({
              functionName: "resend-inbound-webhook",
              error,
              context: {
                operation: "email_body_processing_exception",
                providerEmailId: emailData.email_id,
                emailBodySource: resolvedEmailBody.source,
              },
            });
          }
          attachmentResults.push({
            filename: "Email body",
            success: false,
            itemCount: 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      setStage("aggregate_analyze_complete", {
        analyzedItemCount: analyzedItems.length,
        attachmentResultCount: attachmentResults.length,
      });
      console.log("[resend-inbound-webhook] aggregate analyze summary", {
        emailId: emailData.email_id,
        analyzedItemCount: analyzedItems.length,
        analyzedCurrencies: Array.from(
          new Set(
            analyzedItems
              .map((item) =>
                typeof item.currency === "string"
                  ? item.currency.trim().toUpperCase()
                  : ""
              )
              .filter((currency) => currency.length > 0),
          ),
        ),
        attachmentResults: attachmentResults.map((item) => ({
          filename: item.filename,
          success: item.success,
          itemCount: item.itemCount,
          error: item.error ?? null,
        })),
      });

      if (analyzedItems.length === 0 && reviewCandidates.length === 0) {
        const followup = buildFollowupEmail({
          senderEmail,
          subjectLine: emailData.subject || "",
          savedCount: 0,
          duplicateCount: 0,
          failedCount: attachmentResults.length,
          transactions: [],
          attachmentResults,
        });
        await updateInboundEvent({
          supabase,
          owner: leaseOwner,
          userId: owner.userId,
          status: "failed",
          errorText: summarizeAttachmentFailures(attachmentResults),
          result: {
            emailSummary: {
              providerEmailId: emailData.email_id,
              senderEmail,
              subjectLine: emailData.subject || "",
              recipients: Array.isArray(emailData.to) ? emailData.to : [],
              receivedAt: emailData.created_at || event.created_at || null,
            },
            attachmentResults,
          },
        });
        try {
          await sendEmail({
            to: senderEmail,
            from: EMAIL_FROM,
            subject: followup.subject,
            html: followup.html,
            text: followup.text,
          });
        } catch (sideEffectError) {
          console.error(
            "[resend-inbound-webhook] follow-up email failed after finalization",
            sideEffectError,
          );
        }
        return jsonResponse({ success: true, failed: true });
      }

      const uniqueAnalyzedItems = deduplicateImportedTransactions({
        items: analyzedItems,
        userId: owner.userId,
        householdId: owner.householdId,
        accountId: owner.accountId,
      });
      const sortedAnalyzedItems = sortImportedTransactions(uniqueAnalyzedItems);
      if (sortedAnalyzedItems.length !== analyzedItems.length) {
        console.log("[resend-inbound-webhook] removed duplicate import items", {
          emailId: emailData.email_id,
          duplicateCount: analyzedItems.length - sortedAnalyzedItems.length,
        });
      }

      if (sortedAnalyzedItems.length === 0) {
        const eventResult = {
          savedCount: 0,
          duplicateCount: 0,
          needsReviewCount: reviewCandidates.length,
          rejectedCount: rejectedItemCount,
          failedCount: 0,
        };
        const review = await createInboundReview({
          supabase,
          eventId: leaseOwner.rowId,
          eventAttemptCount: leaseOwner.attemptCount,
          userId: owner.userId,
          eventResult,
          candidates: reviewCandidates,
        });
        if (!review) throw new Error("EMAIL_IMPORT_REVIEW_MISSING_CANDIDATES");
        const email = buildImportReviewRequiredEmail({
          reviewUrl:
            `${APP_URL}/import-review/${review.reviewId}#${review.token}`,
          savedCount: 0,
          reviewCount: reviewCandidates.length,
        });
        try {
          await sendEmail({
            to: owner.defaultEmail,
            from: EMAIL_FROM,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });
        } catch (error) {
          await releaseInboundReviewAfterDeliveryFailure({
            supabase,
            reviewId: review.reviewId,
            eventId: leaseOwner.rowId,
            eventAttemptCount: leaseOwner.attemptCount,
          });
          await reportEdgeFunctionError({
            functionName: "resend-inbound-webhook",
            error,
            context: {
              operation: "email_import_review_delivery_failed",
              providerEmailId: emailData.email_id,
            },
          });
          console.error("[resend-inbound-webhook] review delivery failed", {
            emailId: emailData.email_id,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
        return jsonResponse({ success: true, awaitingReview: true });
      }

      ensureSoftDeadline(processingStartedAtMs, "save_transactions");
      setStage("pre_save_heartbeat_start", {
        transactionCount: sortedAnalyzedItems.length,
      });
      await heartbeatInboundEvent({
        supabase,
        owner: leaseOwner,
        svixId,
        svixTimestamp,
      });
      setStage("pre_save_heartbeat_complete", {
        transactionCount: sortedAnalyzedItems.length,
      });

      setStage("save_transactions_start", {
        transactionCount: sortedAnalyzedItems.length,
      });
      const saveResult = await saveTransactionsBatchInternal(
        buildSyntheticRequest(),
        {
          debugTraceId: buildEmailImportDebugTraceId(emailData.email_id),
          userId: owner.userId,
          manualImportMode: true,
          skipSemanticDuplicates: true,
          ...(owner.householdId ? { householdId: owner.householdId } : {}),
          ...(owner.householdId ? { isPortfolio: owner.isPortfolio } : {}),
          transactions: sortedAnalyzedItems as any,
        },
      );
      setStage("save_transactions_complete", {
        resultCount: saveResult.results.length,
        succeeded: saveResult.summary.succeeded,
        failed: saveResult.summary.failed,
      });

      console.log("[resend-inbound-webhook] batch save result", {
        emailId: emailData.email_id,
        resultCount: saveResult.results.length,
        succeeded: saveResult.summary.succeeded,
        failed: saveResult.summary.failed,
        duplicateCount: saveResult.results.filter(
          (item) => item.duplicate === true,
        ).length,
      });

      const duplicateCount = saveResult.results.filter(
        (item) => item.duplicate === true,
      ).length;
      const failedCount = saveResult.results.filter(
        (item) => item.success === false && item.duplicate !== true,
      ).length;
      const savedCount = saveResult.results.filter(
        (item) => item.success === true,
      ).length;
      const failureReasons = Array.from(
        new Set(
          saveResult.results
            .filter((item) => item.success === false && item.duplicate !== true)
            .map((item) => String(item.error || "").trim())
            .filter((reason) => reason.length > 0),
        ),
      );
      const savedTransactions = saveResult.results
        .filter((item) => item.success === true)
        .map((item) => sortedAnalyzedItems[item.index])
        .filter((item): item is Record<string, unknown> => item != null);
      const appTransactionsUrl = buildImportFollowupAppUrl(saveResult.results);

      const followup = buildFollowupEmail({
        senderEmail,
        subjectLine: emailData.subject || "",
        savedCount,
        duplicateCount,
        failedCount,
        failureReasons,
        transactions: savedTransactions,
        attachmentResults,
        appTransactionsUrl,
      });
      const eventResult = {
        emailSummary: {
          providerEmailId: emailData.email_id,
          senderEmail,
          subjectLine: emailData.subject || "",
          recipients: Array.isArray(emailData.to) ? emailData.to : [],
          receivedAt: emailData.created_at || event.created_at || null,
        },
        savedCount,
        duplicateCount,
        needsReviewCount: reviewCandidates.length,
        rejectedCount: rejectedItemCount,
        failedCount,
        failureReasons,
        attachmentResults,
      };
      const review = reviewCandidates.length > 0
        ? await createInboundReview({
          supabase,
          eventId: leaseOwner.rowId,
          eventAttemptCount: leaseOwner.attemptCount,
          userId: owner.userId,
          eventResult,
          candidates: reviewCandidates,
        })
        : null;
      if (reviewCandidates.length > 0 && !review) {
        throw new Error("EMAIL_IMPORT_REVIEW_MISSING_CANDIDATES");
      }
      setStage("finalize_processed_start", {
        savedCount,
        duplicateCount,
        failedCount,
      });
      if (reviewCandidates.length === 0) {
        await updateInboundEvent({
          supabase,
          owner: leaseOwner,
          userId: owner.userId,
          status: "processed",
          result: eventResult,
        });
      }
      setStage("finalize_processed_complete", {
        savedCount,
        duplicateCount,
        failedCount,
      });

      if (reviewCandidates.length > 0) {
        const email = buildImportReviewRequiredEmail({
          reviewUrl: `${APP_URL}/import-review/${review!.reviewId}#${
            review!.token
          }`,
          savedCount,
          reviewCount: reviewCandidates.length,
        });
        try {
          await sendEmail({
            to: owner.defaultEmail,
            from: EMAIL_FROM,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });
        } catch (error) {
          await releaseInboundReviewAfterDeliveryFailure({
            supabase,
            reviewId: review!.reviewId,
            eventId: leaseOwner.rowId,
            eventAttemptCount: leaseOwner.attemptCount,
          });
          await reportEdgeFunctionError({
            functionName: "resend-inbound-webhook",
            error,
            context: {
              operation: "email_import_review_delivery_failed",
              providerEmailId: emailData.email_id,
            },
          });
          console.error("[resend-inbound-webhook] review delivery failed", {
            emailId: emailData.email_id,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }

      try {
        ensureSoftDeadline(processingStartedAtMs, "send_followup_email");
        setStage("send_followup_email_start");
        await sendEmail({
          to: owner.defaultEmail,
          from: EMAIL_FROM,
          subject: followup.subject,
          html: followup.html,
          text: followup.text,
        });
        setStage("send_followup_email_complete");
      } catch (sideEffectError) {
        setStage("send_followup_email_error", {
          error: sideEffectError instanceof Error
            ? sideEffectError.message
            : String(sideEffectError),
        });
        console.error(
          "[resend-inbound-webhook] follow-up email failed after finalization",
          sideEffectError,
        );
      }

      try {
        ensureSoftDeadline(processingStartedAtMs, "push_notification");
        setStage("push_notification_start");
        await sendImportProcessedNotification({
          supabase,
          owner,
          senderEmail,
          savedCount,
        });
        setStage("push_notification_complete");
      } catch (sideEffectError) {
        setStage("push_notification_error", {
          error: sideEffectError instanceof Error
            ? sideEffectError.message
            : String(sideEffectError),
        });
        console.error(
          "[resend-inbound-webhook] push notification failed after finalization",
          sideEffectError,
        );
      }

      return jsonResponse({
        success: true,
        data: {
          savedCount,
          duplicateCount,
          failedCount,
        },
      });
    } catch (error) {
      setStage("background_error", {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("[resend-inbound-webhook] failed", error);
      try {
        await markInboundEventRetryableFailure({
          supabase,
          owner: leaseOwner,
          errorText: error instanceof Error ? error.message : String(error),
        });
      } catch (updateError) {
        console.error(
          "[resend-inbound-webhook] failed to mark retryable failure",
          updateError,
        );
      }
      return errorResponse(
        "Failed to process inbound email",
        500,
        "SERVER_ERROR",
      );
    } finally {
      clearInterval(heartbeat);
      console.log("[resend-inbound-webhook] background processing finished", {
        emailId: emailData.email_id,
        finalStage: currentStage,
        elapsedMs: Date.now() - backgroundStartedAtMs,
        attemptCount: leaseOwner.attemptCount,
      });
    }
  })();

  scheduleBackgroundTask(
    processingPromise,
    `email-import:${emailData.email_id}`,
  );

  console.log("[resend-inbound-webhook] acknowledged webhook", {
    emailId: emailData.email_id,
    rowId: leaseOwner.rowId,
    attemptCount: leaseOwner.attemptCount,
    recovered: claim.recovered,
  });

  return jsonResponse({
    success: true,
    accepted: true,
    processing: true,
    recovered: claim.recovered,
  });
}

if (import.meta.main) {
  Deno.serve(handleResendInboundWebhook);
}
