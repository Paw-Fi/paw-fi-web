import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { Webhook } from "https://esm.sh/svix@1.24.0?target=deno";

import { corsHeaders } from "../shared/cors.ts";
import {
  buildInternalInvokeHeaders,
  resolveInternalFunctionKey,
} from "../shared/auth.ts";
import { sendEmail } from "../shared/email-service.ts";
import { baseTemplate, renderFooter } from "../shared/email-layout.ts";
import {
  escapeHtml,
  formatCurrency,
  pluralize,
  sanitizeSubject,
} from "../shared/email-utils.ts";
import {
  filterSupportedImportAttachments,
  normalizeEmailAddress,
  resolveNewestSenderOwner,
  shouldProcessInboundRecipients,
} from "../shared/email-import.ts";
import {
  type AnalyzeRequestBody,
  runAnalyzeExpense,
} from "../shared/analyze-core.ts";
import {
  fetchUserCategoryPreferences,
  fetchUserCustomCategories,
  fetchUserHiddenCategories,
  mergeAllowedCategories,
} from "../shared/user-categories.ts";
import { saveTransactionsBatchInternal } from "../save-transactions-batch/index.ts";

const APP_URL = Deno.env.get("APP_URL") || "https://moneko.io";
const IMPORT_INBOX_EMAIL = "files@inbound.moneko.io";
const SUPPORT_EMAIL = "hello@moneko.io";
const EMAIL_FROM = "Moneko <no-reply@moneko.io>";
const MAX_SUPPORTED_ATTACHMENTS = 5;
const MAX_SUPPORTED_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FIREBASE_SERVICE_ACCOUNT_JSON =
  Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || "";
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "";
const APNS_BUNDLE_ID = Deno.env.get("IOS_BUNDLE_ID") || "com.moneko.mobile";

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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
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
}): Promise<{ duplicate: boolean; rowId: string | null }> {
  const { supabase, emailId, senderEmail, normalizedSenderEmail } = params;

  const { data, error } = await supabase
    .from("email_import_events")
    .insert({
      provider_email_id: emailId,
      sender_email: senderEmail,
      normalized_sender_email: normalizedSenderEmail,
    })
    .select("id")
    .single();

  if (!error && data?.id) {
    return { duplicate: false, rowId: data.id as string };
  }

  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("email_import_events")
      .select("id")
      .eq("provider_email_id", emailId)
      .maybeSingle();
    return { duplicate: true, rowId: existing?.id as string | null };
  }

  throw new Error(error?.message || "Failed to claim inbound event");
}

async function updateInboundEvent(params: {
  supabase: any;
  rowId: string | null;
  userId?: string | null;
  status: "ignored" | "processed" | "failed";
  errorText?: string;
  result?: Record<string, unknown>;
}) {
  if (!params.rowId) return;

  await params.supabase
    .from("email_import_events")
    .update({
      user_id: params.userId ?? null,
      status: params.status,
      error_text: params.errorText ?? null,
      result: params.result ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", params.rowId);
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

  const [{ data: user }, { data: contact }] = await Promise.all([
    supabase
      .from("users")
      .select("email, full_name")
      .eq("id", resolved.userId)
      .maybeSingle(),
    supabase
      .from("user_contacts")
      .select(
        "email_import_enabled, email_import_household_id, email_import_is_portfolio, email_import_account_id, preferred_currency",
      )
      .eq("user_id", resolved.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const defaultEmail =
    normalizeEmailAddress(user?.email) || normalizedSenderEmail;

  return {
    userId: resolved.userId,
    fullName: typeof user?.full_name === "string" ? user.full_name : null,
    defaultEmail,
    enabled: contact?.email_import_enabled === true,
    preferredCurrency:
      typeof contact?.preferred_currency === "string" &&
      contact.preferred_currency.trim().length > 0
        ? contact.preferred_currency.trim().toUpperCase()
        : "USD",
    householdId: sanitizeUuid(contact?.email_import_household_id ?? null),
    isPortfolio: contact?.email_import_is_portfolio === true,
    accountId: sanitizeUuid(contact?.email_import_account_id ?? null),
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
      ].includes(entry[0].toLowerCase()),
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

function buildUnavailableEmail(params: {
  senderEmail: string;
  reason: string;
}) {
  const { senderEmail, reason } = params;
  const content = `
    <h1 class="title">Email import not processed</h1>
    <p class="subtitle">We couldn't process the files sent from ${escapeHtml(
      senderEmail,
    )}.</p>
    <p>${escapeHtml(reason)}</p>
    <p>To import files, forward supported attachments to <strong>${escapeHtml(IMPORT_INBOX_EMAIL)}</strong>.</p>
    <p>This address does not monitor replies. If you need help, contact <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#7458FF;">${escapeHtml(SUPPORT_EMAIL)}</a>.</p>
    <p>Open Moneko, go to Settings, and configure Email File Import to allow this sender.</p>
    <p><a href="${APP_URL}" style="color:#7458FF;">Open Moneko</a></p>
  `;

  return {
    subject: sanitizeSubject("Moneko email import needs setup"),
    html: baseTemplate(
      content,
      renderFooter({
        customReason: `You're receiving this email because someone sent files to ${IMPORT_INBOX_EMAIL}. Replies are not monitored; contact ${SUPPORT_EMAIL} if you need help.`,
      }),
    ),
    text: `Moneko could not process the files sent from ${senderEmail}. ${reason} To import files, forward them to ${IMPORT_INBOX_EMAIL}. Replies are not monitored; contact ${SUPPORT_EMAIL} if you need help. Open Moneko settings to configure Email File Import: ${APP_URL}`,
  };
}

function buildFollowupEmail(params: {
  senderEmail: string;
  subjectLine: string;
  savedCount: number;
  duplicateCount: number;
  failedCount: number;
  transactions: Array<Record<string, unknown>>;
  attachmentResults: AttachmentProcessingResult[];
}) {
  const {
    senderEmail,
    subjectLine,
    savedCount,
    duplicateCount,
    failedCount,
    transactions,
    attachmentResults,
  } = params;

  const transactionLines = transactions
    .slice(0, 20)
    .map((item) => {
      const type = item.type === "income" ? "Income" : "Expense";
      const amount = Number(item.amount ?? 0);
      const currency =
        typeof item.currency === "string" ? item.currency : "USD";
      const category =
        typeof item.category === "string" ? item.category : "other";
      const description =
        typeof item.description === "string" &&
        item.description.trim().length > 0
          ? item.description.trim()
          : typeof item.merchant === "string" && item.merchant.trim().length > 0
            ? item.merchant.trim()
            : "Imported transaction";
      const date = typeof item.date === "string" ? item.date : "";

      return `<li><strong>${escapeHtml(type)}</strong>: ${escapeHtml(
        description,
      )} · ${escapeHtml(category)} · ${escapeHtml(
        formatCurrency(amount, currency),
      )}${date ? ` · ${escapeHtml(date)}` : ""}</li>`;
    })
    .join("");

  const attachmentLines = attachmentResults
    .map(
      (item) =>
        `<li>${escapeHtml(item.filename)}: ${
          item.success
            ? `${item.itemCount} ${pluralize(
                item.itemCount,
                "transaction",
              )} found`
            : escapeHtml(item.error || "analysis failed")
        }</li>`,
    )
    .join("");

  const content = `
    <h1 class="title">Your files were processed</h1>
    <p class="subtitle">We finished processing the files forwarded from ${escapeHtml(
      senderEmail,
    )}.</p>
    <p><strong>Import inbox:</strong> ${escapeHtml(IMPORT_INBOX_EMAIL)}</p>
    <p><strong>Email subject:</strong> ${escapeHtml(
      subjectLine || "(no subject)",
    )}</p>
    <p><strong>Saved:</strong> ${savedCount} ${pluralize(
      savedCount,
      "transaction",
    )}</p>
    <p><strong>Duplicates skipped:</strong> ${duplicateCount}</p>
    <p><strong>Failed:</strong> ${failedCount}</p>
    <p><strong>Attachment summary</strong></p>
    <ul>${attachmentLines}</ul>
    <p>This mailbox does not monitor replies. If you need help, contact <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#7458FF;">${escapeHtml(SUPPORT_EMAIL)}</a>.</p>
    ${
      transactionLines
        ? `<p><strong>Saved transactions</strong></p><ul>${transactionLines}</ul>`
        : ""
    }
  `;

  return {
    subject: sanitizeSubject("Moneko import report"),
    html: baseTemplate(
      content,
      renderFooter({
        customReason: `You're receiving this email because you used Moneko Email File Import at ${IMPORT_INBOX_EMAIL}. Replies are not monitored; contact ${SUPPORT_EMAIL} if you need help.`,
      }),
    ),
    text: `Moneko processed files from ${senderEmail}. Import inbox: ${IMPORT_INBOX_EMAIL}. Saved: ${savedCount}. Duplicates skipped: ${duplicateCount}. Failed: ${failedCount}. Replies are not monitored; contact ${SUPPORT_EMAIL} if you need help.`,
  };
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
    const isWeb =
      typeof platform === "string" &&
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
                  link: `${APP_URL}/dashboard`,
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

  const title = `Files processed from ${senderEmail}`;
  const body = `${savedCount} ${pluralize(savedCount, "transaction")} saved`;
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
      }),
    ),
  );
}

async function fetchResendJson(path: string): Promise<any> {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Resend API ${response.status}: ${errorText}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
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

  const rawPayload = await req.text();

  let event: ResendReceivedEvent;
  try {
    const webhook = new Webhook(requiredWebhookSecret);
    event = webhook.verify(rawPayload, {
      "svix-id": req.headers.get("svix-id") || "",
      "svix-timestamp": req.headers.get("svix-timestamp") || "",
      "svix-signature": req.headers.get("svix-signature") || "",
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

  console.log("[resend-inbound-webhook] received email", {
    emailId: event.data.email_id,
    createdAt: event.data.created_at ?? event.created_at ?? null,
    from: event.data.from ?? null,
    to: Array.isArray(event.data.to) ? event.data.to : [],
    subject: event.data.subject ?? null,
    attachmentCount: Array.isArray(event.data.attachments)
      ? event.data.attachments.length
      : null,
  });

  if (!shouldProcessInboundRecipients(event.data.to, IMPORT_INBOX_EMAIL)) {
    console.log("[resend-inbound-webhook] ignored recipient mismatch", {
      emailId: event.data.email_id,
      to: Array.isArray(event.data.to) ? event.data.to : [],
      expectedInbox: IMPORT_INBOX_EMAIL,
    });
    return jsonResponse({
      success: true,
      ignored: true,
      reason: "RECIPIENT_MISMATCH",
    });
  }

  const senderEmail = normalizeEmailAddress(event.data.from);
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
    emailId: event.data.email_id,
    senderEmail,
    normalizedSenderEmail: senderEmail,
  });
  console.log("[resend-inbound-webhook] inbound event claim", {
    emailId: event.data.email_id,
    duplicate: claim.duplicate,
    rowId: claim.rowId,
  });
  if (claim.duplicate) {
    return jsonResponse({ success: true, duplicate: true });
  }

  try {
    const owner = await resolveOwnerBySender({
      supabase,
      normalizedSenderEmail: senderEmail,
    });

    console.log("[resend-inbound-webhook] owner lookup", {
      emailId: event.data.email_id,
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
        reason:
          "This sender email is not on any Moneko Email File Import whitelist yet.",
      });
      await sendEmail({
        to: senderEmail,
        from: EMAIL_FROM,
        subject: unavailable.subject,
        html: unavailable.html,
        text: unavailable.text,
      });
      await updateInboundEvent({
        supabase,
        rowId: claim.rowId,
        status: "ignored",
        errorText: "SENDER_NOT_WHITELISTED",
      });
      return jsonResponse({ success: true, ignored: true });
    }

    if (!owner.enabled) {
      const unavailable = buildUnavailableEmail({
        senderEmail,
        reason: "Email File Import is currently disabled for this account.",
      });
      await sendEmail({
        to: senderEmail,
        from: EMAIL_FROM,
        subject: unavailable.subject,
        html: unavailable.html,
        text: unavailable.text,
      });
      await updateInboundEvent({
        supabase,
        rowId: claim.rowId,
        userId: owner.userId,
        status: "ignored",
        errorText: "EMAIL_IMPORT_DISABLED",
      });
      return jsonResponse({ success: true, ignored: true });
    }

    const [emailContentResult, attachmentListResponse] = await Promise.all([
      fetchResendJson(`/emails/receiving/${event.data.email_id}`),
      fetchResendJson(`/emails/receiving/${event.data.email_id}/attachments`)
        .then((value) => ({ data: value, error: null }))
        .catch((error) => ({ data: null, error })),
    ]);

    console.log("[resend-inbound-webhook] fetched email metadata", {
      emailId: event.data.email_id,
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
        reason: "We could not verify the sender authentication for this email.",
      });
      await sendEmail({
        to: senderEmail,
        from: EMAIL_FROM,
        subject: unavailable.subject,
        html: unavailable.html,
        text: unavailable.text,
      });
      await updateInboundEvent({
        supabase,
        rowId: claim.rowId,
        userId: owner.userId,
        status: "ignored",
        errorText: "SENDER_NOT_VERIFIED",
      });
      return jsonResponse({ success: true, ignored: true });
    }

    if (attachmentListResponse.error != null) {
      const unavailable = buildUnavailableEmail({
        senderEmail,
        reason:
          "We could not retrieve the email attachments from Resend. Please try forwarding the files again.",
      });
      await sendEmail({
        to: senderEmail,
        from: EMAIL_FROM,
        subject: unavailable.subject,
        html: unavailable.html,
        text: unavailable.text,
      });
      await updateInboundEvent({
        supabase,
        rowId: claim.rowId,
        userId: owner.userId,
        status: "failed",
        errorText: "ATTACHMENT_FETCH_FAILED",
      });
      return jsonResponse({ success: true, ignored: true });
    }

    const supportedAttachments = filterSupportedImportAttachments(
      Array.isArray((attachmentListResponse.data as any)?.data)
        ? (attachmentListResponse.data as any).data
        : [],
    ).slice(0, MAX_SUPPORTED_ATTACHMENTS);

    console.log("[resend-inbound-webhook] supported attachments", {
      emailId: event.data.email_id,
      attachmentCount: supportedAttachments.length,
      attachments: supportedAttachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
      })),
    });

    if (supportedAttachments.length === 0) {
      const unavailable = buildUnavailableEmail({
        senderEmail,
        reason:
          "No supported PDF, CSV, or Excel attachments were found in the forwarded email.",
      });
      await sendEmail({
        to: senderEmail,
        from: EMAIL_FROM,
        subject: unavailable.subject,
        html: unavailable.html,
        text: unavailable.text,
      });
      await updateInboundEvent({
        supabase,
        rowId: claim.rowId,
        userId: owner.userId,
        status: "ignored",
        errorText: "NO_SUPPORTED_ATTACHMENTS",
      });
      return jsonResponse({ success: true, ignored: true });
    }

    const categoryContext = await loadCategoryContext({
      supabase,
      userId: owner.userId,
    });

    const attachmentResults: AttachmentProcessingResult[] = [];
    const analyzedItems: Array<Record<string, unknown>> = [];

    for (const attachment of supportedAttachments) {
      try {
        console.log("[resend-inbound-webhook] processing attachment", {
          emailId: event.data.email_id,
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

        const response = await fetch(attachment.downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download attachment (${response.status})`);
        }
        const contentLengthHeader =
          response.headers.get("content-length") || "";
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
        const bytes = new Uint8Array(await response.arrayBuffer());
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
          text:
            typeof emailContent?.text === "string"
              ? emailContent.text
              : undefined,
          date: (
            event.data.created_at ||
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

        const result = await runAnalyzeExpense(
          analyzeBody,
          requiredGeminiApiKey,
        );
        console.log("[resend-inbound-webhook] analyze result", {
          emailId: event.data.email_id,
          filename: attachment.filename,
          success: result.success,
          itemCount: Array.isArray(result.items) ? result.items.length : 0,
          error: result.success ? null : (result.error ?? null),
        });
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
      } catch (error) {
        console.error("[resend-inbound-webhook] attachment processing failed", {
          emailId: event.data.email_id,
          filename: attachment.filename,
          error: error instanceof Error ? error.message : String(error),
        });
        attachmentResults.push({
          filename: attachment.filename,
          success: false,
          itemCount: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log("[resend-inbound-webhook] aggregate analyze summary", {
      emailId: event.data.email_id,
      analyzedItemCount: analyzedItems.length,
      attachmentResults: attachmentResults.map((item) => ({
        filename: item.filename,
        success: item.success,
        itemCount: item.itemCount,
        error: item.error ?? null,
      })),
    });

    if (analyzedItems.length === 0) {
      const followup = buildFollowupEmail({
        senderEmail,
        subjectLine: event.data.subject || "",
        savedCount: 0,
        duplicateCount: 0,
        failedCount: attachmentResults.length,
        transactions: [],
        attachmentResults,
      });
      await sendEmail({
        to: senderEmail,
        from: EMAIL_FROM,
        subject: followup.subject,
        html: followup.html,
        text: followup.text,
      });
      await updateInboundEvent({
        supabase,
        rowId: claim.rowId,
        userId: owner.userId,
        status: "ignored",
        errorText: "NO_TRANSACTIONS_FOUND",
        result: {
          attachmentResults,
        },
      });
      return jsonResponse({ success: true, ignored: true });
    }

    const saveResult = await saveTransactionsBatchInternal(
      buildSyntheticRequest(),
      {
        userId: owner.userId,
        manualImportMode: true,
        skipSemanticDuplicates: true,
        ...(owner.householdId ? { householdId: owner.householdId } : {}),
        ...(owner.householdId ? { isPortfolio: owner.isPortfolio } : {}),
        transactions: analyzedItems as any,
      },
    );

    console.log("[resend-inbound-webhook] batch save result", {
      emailId: event.data.email_id,
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
      (item) => item.success === false,
    ).length;
    const savedCount = saveResult.results.filter(
      (item) => item.success === true,
    ).length;

    const followup = buildFollowupEmail({
      senderEmail,
      subjectLine: event.data.subject || "",
      savedCount,
      duplicateCount,
      failedCount,
      transactions: analyzedItems,
      attachmentResults,
    });
    await sendEmail({
      to: senderEmail,
      from: EMAIL_FROM,
      subject: followup.subject,
      html: followup.html,
      text: followup.text,
    });

    await sendImportProcessedNotification({
      supabase,
      owner,
      senderEmail,
      savedCount,
    });

    await updateInboundEvent({
      supabase,
      rowId: claim.rowId,
      userId: owner.userId,
      status: "processed",
      result: {
        savedCount,
        duplicateCount,
        failedCount,
        attachmentResults,
      },
    });

    return jsonResponse({
      success: true,
      data: {
        savedCount,
        duplicateCount,
        failedCount,
      },
    });
  } catch (error) {
    console.error("[resend-inbound-webhook] failed", error);
    await updateInboundEvent({
      supabase,
      rowId: claim.rowId,
      status: "failed",
      errorText: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(
      "Failed to process inbound email",
      500,
      "SERVER_ERROR",
    );
  }
});
