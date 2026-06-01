/**
 * Supabase Edge Function: save-wallet-transaction
 *
 * Single backend for automatic transaction capture from:
 *   - iOS Apple Wallet (via Shortcuts + App Intents)
 *   - Android notification listener
 *
 * Responsibilities:
 *   1. Authenticate caller (JWT or internal secret)
 *   2. Validate + normalize payload
 *   3. Categorize via Gemini AI (same approach as analyze-expense)
 *   4. Resolve category using the SAME pipeline as analyze-expense
 *   5. Deduplicate (fingerprint-based, recent window)
 *   6. Save expense row
 *   7. Handle household splits when applicable
 *   8. Learn category preference for future captures
 *   9. Return saved row or duplicate result
 */

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { normalizeCalendarDateString } from "../shared/date-normalization.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { isRetryableGeminiError } from "../shared/gemini-retry.ts";
import { reportVertexAiFailure } from "../shared/report-vertex-ai-failure.ts";
import { formatMoney } from "../shared/currency-symbols.ts";
import {
  ensureUserCategory,
  learnUserCategoryPreference,
} from "../shared/user-categories.ts";
import {
  loadCategoryContext,
  resolveCategory,
} from "../shared/category-resolution.ts";
import { normalizeCategoryForStorage } from "../shared/category-colors.ts";
import { assertAccountInScope } from "../shared/accounts.ts";
import {
  buildWalletCaptureIdempotencyKey,
  getLocalYyyyMmDdInTimeZone,
  isWalletCaptureIdempotencyClaimStale,
  normalizeWalletCaptureSource,
  resolveWalletCaptureCurrency,
  resolveWalletCaptureScope,
  resolveWalletTransactionCurrency,
  resolveWalletTransactionDate,
  resolveWalletTransactionPackageName,
} from "../shared/wallet-capture.ts";
import {
  createVertexGenerativeAI,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import { normalizePreferredCurrency } from "../shared/user-preferred-currency.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_CAPTURE_SOURCES = new Set([
  "ios_wallet_shortcut",
  "android_notification_listener",
]);

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CATEGORIZE_FUNCTION_CALLING_CONFIG = {
  mode: "ANY",
  allowedFunctionNames: ["categorize_transactions"],
};

const IDEMPOTENCY_PROCESSING_TTL_MS = 10 * 60 * 1000;
const IDEMPOTENCY_KEY_TTL_HOURS = 24;
const GEMINI_CATEGORIZATION_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
] as const;

type GenerativeAIClient = ReturnType<typeof createVertexGenerativeAI>;
const GEMINI_RETRY_DELAYS_MS = [300] as const;
const readRuntimeEnv = (name: string): string | null => {
  const env = (
    globalThis as {
      Deno?: { env?: { get?: (key: string) => string | undefined } };
    }
  ).Deno?.env;
  if (!env?.get) return null;
  return env.get(name) ?? null;
};

const iosBundleId = readRuntimeEnv("IOS_BUNDLE_ID") || "com.moneko.mobile";
const firebaseServiceAccount = readRuntimeEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
const firebaseProjectId = readRuntimeEnv("FIREBASE_PROJECT_ID");

// ─── Types ──────────────────────────────────────────────────────────────────

interface TransactionPayload {
  merchantName?: string | null;
  rawMerchant?: string | null;
  type?: string | null;
  amount: number;
  currency?: string | null;
  currencyCode?: string | null;
  date?: string | null;
  transactionDate?: string | null;
  cardLabel?: string | null;
  network?: string | null;
  note?: string | null;
  externalSourceId?: string | null;
  packageName?: string | null;
  sourcePackage?: string | null;
  notificationKey?: string | null;
  notificationPostTime?: string | null;
  sourceAppLabel?: string | null;
}

interface RequestBody {
  captureSource: string;
  userId?: string | null;
  householdId?: string | null;
  isPortfolio?: boolean;
  accountId?: string | null;
  idempotencyKey?: string | null;
  clientCreatedAt?: string | null;
  transaction: TransactionPayload;
}

interface WalletCaptureIdempotencyRow {
  id: string;
  result?: Record<string, unknown> | null;
  created_at?: string | null;
}

interface WalletCaptureClaimResult {
  status: "claimed" | "cached" | "processing";
  claimId?: string;
  cachedResponse?: Record<string, unknown>;
}

interface AndroidWalletCaptureClaimResult {
  status: "claimed" | "duplicate" | "processing";
  claimId?: string;
  duplicateResponse?: Record<string, unknown>;
}

type WalletBudgetScope = "personal" | "portfolio" | "household";

interface PocketSummary {
  id: string;
  name: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
}

interface WalletPocketInsight {
  scenario: "no_budget" | "no_pockets" | "category_unlinked" | "linked";
  monthTotalBudgetCents: number;
  monthTotalSpentCents: number;
  monthTotalRemainingCents: number;
  pocket?: PocketSummary;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function truncateForLog(
  value: string | null | undefined,
  maxLength = 160,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}...`;
}

function buildWalletCaptureRequestLogContext(
  req: Request,
  body: RequestBody,
): Record<string, unknown> {
  const tx =
    body?.transaction && typeof body.transaction === "object"
      ? body.transaction
      : null;

  const safeHeaders = Object.fromEntries(
    [
      "content-type",
      "user-agent",
      "x-client-platform",
      "x-client-version",
      "x-request-id",
      "cf-ray",
    ]
      .map((key) => [key, req.headers.get(key)] as const)
      .filter(([, value]) => typeof value === "string" && value.length > 0),
  );

  return {
    captureSource: body?.captureSource ?? null,
    userId: truncateForLog(body?.userId ?? null, 80),
    householdId: truncateForLog(body?.householdId ?? null, 80),
    isPortfolio: body?.isPortfolio === true,
    clientCreatedAt: body?.clientCreatedAt ?? null,
    idempotencyKey: truncateForLog(body?.idempotencyKey ?? null, 120),
    headers: safeHeaders,
    transaction: tx
      ? {
          type: truncateForLog(tx.type ?? null, 16),
          amount: typeof tx.amount === "number" ? tx.amount : null,
          currency: truncateForLog(resolveWalletTransactionCurrency(tx), 12),
          date: truncateForLog(resolveWalletTransactionDate(tx), 32),
          merchantName: truncateForLog(tx.merchantName ?? null, 120),
          rawMerchant: truncateForLog(tx.rawMerchant ?? null, 120),
          note: truncateForLog(tx.note ?? null, 200),
          cardLabel: truncateForLog(tx.cardLabel ?? null, 80),
          packageName: truncateForLog(
            resolveWalletTransactionPackageName(tx),
            160,
          ),
          externalSourceId: truncateForLog(tx.externalSourceId ?? null, 120),
          notificationKey: truncateForLog(tx.notificationKey ?? null, 160),
          notificationPostTime: truncateForLog(
            tx.notificationPostTime ?? null,
            80,
          ),
          sourceAppLabel: truncateForLog(tx.sourceAppLabel ?? null, 120),
        }
      : null,
  };
}

function logWalletCaptureValidationFailure(
  reason: string,
  requestContext: Record<string, unknown> | null,
  details?: Record<string, unknown>,
): void {
  console.warn("[save-wallet-transaction] Validation failed", {
    reason,
    ...(details ? { details } : {}),
    ...(requestContext ? { request: requestContext } : {}),
  });
}

function errorResponse(message: string, status = 400, code?: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code: code ?? "VALIDATION_ERROR",
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

function successResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Build a deterministic description string for the expense `raw_text` column.
 * Falls back through available text fields so we always store something useful.
 */
function buildDescription(tx: TransactionPayload): string {
  const parts: string[] = [];

  const merchant = (tx.merchantName ?? tx.rawMerchant ?? "").trim();
  if (merchant) parts.push(merchant);

  if (tx.note && tx.note.trim()) parts.push(tx.note.trim());

  if (parts.length === 0) return "Wallet auto capture";
  return parts.join(" – ");
}

function normalizePocketCategory(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function resolveWalletBudgetScope(
  householdId: string | null,
  isPortfolio: boolean,
): WalletBudgetScope {
  if (!householdId) return "personal";
  return isPortfolio ? "portfolio" : "household";
}

function applyWalletScopeFilter(params: {
  query: any;
  scope: WalletBudgetScope;
  userId: string;
  householdId: string | null;
}): any {
  const { query, scope, userId, householdId } = params;
  if (scope === "personal") {
    return query.eq("user_id", userId).is("household_id", null);
  }
  if (scope === "portfolio") {
    return query.eq("user_id", userId).eq("household_id", householdId);
  }
  return query.eq("household_id", householdId);
}

function getMonthWindowFromDate(dateYmd: string): {
  periodMonth: string;
  monthStart: string;
  monthEndExclusive: string;
} {
  const [yearPart, monthPart] = dateYmd.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const monthStart = `${yearPart}-${monthPart}-01`;

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthPart = String(nextMonth).padStart(2, "0");
  const monthEndExclusive = `${nextYear}-${nextMonthPart}-01`;

  return {
    periodMonth: monthStart,
    monthStart,
    monthEndExclusive,
  };
}

function formatCurrencyAmount(cents: number, currency: string): string {
  return formatMoney(cents, currency);
}

function formatWalletNotificationCategory(value: string): string {
  const normalized = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  if (!normalized) return "Other";

  return normalized
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractCalendarDatePrefix(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return normalizeCalendarDateString(trimmed);
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFcmAccessToken(): Promise<string | null> {
  if (!firebaseServiceAccount) {
    console.warn(
      "[save-wallet-transaction] FIREBASE_SERVICE_ACCOUNT_JSON not configured",
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(firebaseServiceAccount);

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

    const encoder = new TextEncoder();
    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const encodedClaims = btoa(JSON.stringify(claims))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const unsignedToken = `${encodedHeader}.${encodedClaims}`;

    let privateKeyPem: string = serviceAccount.private_key as string;
    if (!privateKeyPem) {
      return null;
    }
    privateKeyPem = privateKeyPem.replace(/\\n/g, "\n").trim();
    const match = privateKeyPem.match(
      /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/,
    );
    if (!match || !match[1]) {
      return null;
    }

    const pemBody = match[1].replace(/\r|\n/g, "");
    const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

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
      encoder.encode(unsignedToken),
    );

    const encodedSignature = btoa(
      String.fromCharCode(...Array.from(new Uint8Array(signature))),
    )
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const jwt = `${unsignedToken}.${encodedSignature}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token as string;
  } catch (error) {
    console.error("[save-wallet-transaction] FCM token error:", error);
    return null;
  }
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

  if (!firebaseProjectId) {
    console.warn(
      "[save-wallet-transaction] FIREBASE_PROJECT_ID not configured",
    );
    return false;
  }

  try {
    const deepLink = data.deep_link || "";
    const isWeb =
      typeof platform === "string" &&
      /^(web|webpush|web_push|browser)$/i.test(platform);
    const message = {
      message: {
        token: deviceToken,
        notification: {
          title,
          body,
        },
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
            "apns-topic": iosBundleId,
            "apns-push-type": "alert",
            "apns-priority": "10",
          },
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
            ...(deepLink ? { deep_link: deepLink } : {}),
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        ...(isWeb
          ? {
              webpush: {
                data: {
                  ...data,
                  deep_link: deepLink,
                },
                fcm_options: {
                  link: "https://moneko.io/dashboard",
                },
              },
            }
          : {}),
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      },
    );

    if (response.ok) {
      return true;
    }

    const errorText = await response.text();
    if (
      errorText.includes("UNREGISTERED") ||
      errorText.includes("INVALID_ARGUMENT")
    ) {
      try {
        await supabase
          .from("devices")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("push_token", deviceToken);
      } catch (deactivateError) {
        console.error(
          "[save-wallet-transaction] Failed to deactivate invalid token:",
          deactivateError,
        );
      }
    }

    console.error(
      "[save-wallet-transaction] FCM send failed:",
      response.status,
      errorText,
    );
    return false;
  } catch (error) {
    console.error("[save-wallet-transaction] FCM send error:", error);
    return false;
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

async function buildWalletPocketInsight(params: {
  supabase: any;
  userId: string;
  householdId: string | null;
  isPortfolio: boolean;
  category: string;
  currency: string;
  dateYmd: string;
}): Promise<WalletPocketInsight> {
  const {
    supabase,
    userId,
    householdId,
    isPortfolio,
    category,
    currency,
    dateYmd,
  } = params;
  const scope = resolveWalletBudgetScope(householdId, isPortfolio);
  const normalizedCategory = normalizePocketCategory(category);
  const { periodMonth, monthStart, monthEndExclusive } =
    getMonthWindowFromDate(dateYmd);

  let budgetQuery = supabase
    .from("budgets")
    .select("id,total_budget_cents,currency")
    .eq("period_month", periodMonth)
    .eq("currency", currency);
  budgetQuery = applyWalletScopeFilter({
    query: budgetQuery,
    scope,
    userId,
    householdId,
  });

  const { data: matchedBudget, error: matchedBudgetError } =
    await budgetQuery.maybeSingle();
  if (matchedBudgetError) {
    console.error(
      "[save-wallet-transaction] Failed to load scoped budget by currency:",
      matchedBudgetError,
    );
  }

  const budget = matchedBudget;

  if (!budget?.id) {
    return {
      scenario: "no_budget",
      monthTotalBudgetCents: 0,
      monthTotalSpentCents: 0,
      monthTotalRemainingCents: 0,
    };
  }

  const budgetCurrency =
    typeof budget.currency === "string" && budget.currency.trim().length > 0
      ? budget.currency.trim().toUpperCase()
      : currency;
  const monthTotalBudgetCents = Number(budget.total_budget_cents ?? 0);

  let envelopeQuery = supabase
    .from("budget_envelopes")
    .select("id,name,budget_amount_cents")
    .eq("budget_id", budget.id)
    .eq("currency", budgetCurrency);
  envelopeQuery = applyWalletScopeFilter({
    query: envelopeQuery,
    scope,
    userId,
    householdId,
  });

  const { data: envelopesData, error: envelopesError } = await envelopeQuery;
  if (envelopesError) {
    console.error(
      "[save-wallet-transaction] Failed to load budget envelopes:",
      envelopesError,
    );
  }
  const envelopes = (
    Array.isArray(envelopesData) ? envelopesData : []
  ) as Array<any>;
  if (envelopes.length === 0) {
    return {
      scenario: "no_pockets",
      monthTotalBudgetCents,
      monthTotalSpentCents: 0,
      monthTotalRemainingCents: monthTotalBudgetCents,
    };
  }

  const envelopeIds = envelopes
    .map((row) => (typeof row?.id === "string" ? row.id : null))
    .filter((id): id is string => Boolean(id));

  const { data: allocationRowsData, error: allocationRowsError } =
    await supabase
      .from("envelope_allocations")
      .select("envelope_id,amount_cents")
      .eq("period_month", periodMonth)
      .in("envelope_id", envelopeIds);
  if (allocationRowsError) {
    console.error(
      "[save-wallet-transaction] Failed to load envelope allocations:",
      allocationRowsError,
    );
  }
  const allocationRows = (
    Array.isArray(allocationRowsData) ? allocationRowsData : []
  ) as Array<any>;
  const allocationByEnvelopeId = new Map<string, number>();
  for (const row of allocationRows) {
    const envelopeId =
      typeof row?.envelope_id === "string" ? row.envelope_id : "";
    if (!envelopeId) continue;
    const amountCents = Number(row?.amount_cents ?? 0);
    if (Number.isFinite(amountCents) && amountCents > 0) {
      allocationByEnvelopeId.set(envelopeId, Math.trunc(amountCents));
    }
  }

  const { data: categoryLinksData, error: categoryLinksError } = await supabase
    .from("envelope_category_links")
    .select("envelope_id,category")
    .in("envelope_id", envelopeIds);
  if (categoryLinksError) {
    console.error(
      "[save-wallet-transaction] Failed to load envelope category links:",
      categoryLinksError,
    );
  }
  const categoryLinks = (
    Array.isArray(categoryLinksData) ? categoryLinksData : []
  ) as Array<any>;
  const categoriesByEnvelopeId = new Map<string, string[]>();
  for (const row of categoryLinks) {
    const envelopeId =
      typeof row?.envelope_id === "string" ? row.envelope_id : "";
    const linkedCategory = normalizePocketCategory(row?.category);
    if (!envelopeId || !linkedCategory) continue;
    const current = categoriesByEnvelopeId.get(envelopeId) ?? [];
    current.push(linkedCategory);
    categoriesByEnvelopeId.set(envelopeId, current);
  }

  let expenseQuery = supabase
    .from("expenses")
    .select("amount_cents,category,type")
    .eq("currency", budgetCurrency)
    .gte("date", monthStart)
    .lt("date", monthEndExclusive);
  expenseQuery = applyWalletScopeFilter({
    query: expenseQuery,
    scope,
    userId,
    householdId,
  });
  const { data: expenseRowsData, error: expenseRowsError } = await expenseQuery;
  if (expenseRowsError) {
    console.error(
      "[save-wallet-transaction] Failed to load scoped expenses for pocket insight:",
      expenseRowsError,
    );
  }
  const expenseRows = (
    Array.isArray(expenseRowsData) ? expenseRowsData : []
  ) as Array<any>;

  let monthTotalSpentCents = 0;
  const spendByCategory = new Map<string, number>();
  for (const row of expenseRows) {
    const type = normalizePocketCategory(row?.type);
    if (type === "income") continue;

    const amountCents = Number(row?.amount_cents ?? 0);
    if (!Number.isFinite(amountCents) || amountCents <= 0) continue;

    const normalized = normalizePocketCategory(
      row?.category || "uncategorized",
    );
    monthTotalSpentCents += Math.trunc(amountCents);
    spendByCategory.set(
      normalized,
      (spendByCategory.get(normalized) ?? 0) + Math.trunc(amountCents),
    );
  }

  const pocketSummaries: PocketSummary[] = envelopes.map((row) => {
    const id = String(row.id);
    const linkedCategories = categoriesByEnvelopeId.get(id) ?? [];
    const spentCents = linkedCategories.reduce(
      (sum, linked) => sum + (spendByCategory.get(linked) ?? 0),
      0,
    );
    const baseLimit = Number(row?.budget_amount_cents ?? 0);
    const limitCents =
      allocationByEnvelopeId.get(id) ??
      (Number.isFinite(baseLimit) ? Math.trunc(baseLimit) : 0);
    return {
      id,
      name:
        typeof row?.name === "string" && row.name.trim().length > 0
          ? row.name.trim()
          : "Pocket",
      limitCents,
      spentCents,
      remainingCents: limitCents - spentCents,
    };
  });

  const linkedPocketSummaries = pocketSummaries.filter((summary) => {
    const categories = categoriesByEnvelopeId.get(summary.id) ?? [];
    return categories.includes(normalizedCategory);
  });

  const monthTotalRemainingCents = monthTotalBudgetCents - monthTotalSpentCents;

  if (linkedPocketSummaries.length === 0) {
    return {
      scenario: "category_unlinked",
      monthTotalBudgetCents,
      monthTotalSpentCents,
      monthTotalRemainingCents,
    };
  }

  linkedPocketSummaries.sort((a, b) => a.remainingCents - b.remainingCents);
  return {
    scenario: "linked",
    monthTotalBudgetCents,
    monthTotalSpentCents,
    monthTotalRemainingCents,
    pocket: linkedPocketSummaries[0],
  };
}

async function resolveWalletNotificationSpaceLabel(params: {
  supabase: any;
  householdId: string | null;
  isPortfolio: boolean;
}): Promise<string> {
  const { supabase, householdId, isPortfolio } = params;

  if (!householdId) {
    return "your personal space";
  }

  try {
    const { data: household, error } = await supabase
      .from("households")
      .select("name")
      .eq("id", householdId)
      .maybeSingle();

    if (!error && typeof household?.name === "string") {
      const trimmedName = household.name.replace(/\s+/g, " ").trim();
      if (trimmedName.length > 0) {
        const displayName =
          trimmedName.length <= 40
            ? trimmedName
            : `${trimmedName.slice(0, 37)}...`;
        return displayName;
      }
    }
  } catch (_) {
    // Non-blocking best-effort lookup only.
  }

  return isPortfolio ? "your private space" : "your shared space";
}

function buildWalletPocketNotificationMessage(params: {
  insight: WalletPocketInsight;
  amountCents: number;
  currency: string;
  category: string;
  spaceLabel: string;
}): { title: string; body: string; scenario: string } {
  const { insight, amountCents, currency, category, spaceLabel } = params;
  const amountLabel = formatCurrencyAmount(amountCents, currency);
  const prettyCategory = category.trim().length > 0 ? category : "other";
  const displayCategory = formatWalletNotificationCategory(prettyCategory);
  const title = `Moneko captured ${amountLabel}`;
  const headerLine = `💸 ${amountLabel} -> ${spaceLabel}`;
  const categoryLine = `🏷️ ${displayCategory}`;
  const buildBody = (thirdLine: string) =>
    `${headerLine}\n${categoryLine}\n${thirdLine}`;

  if (insight.scenario === "no_budget") {
    return {
      title,
      body: buildBody(`💰 No budget set for ${spaceLabel}`),
      scenario: insight.scenario,
    };
  }

  if (insight.scenario === "no_pockets") {
    const budgetLabel = formatCurrencyAmount(
      insight.monthTotalBudgetCents,
      currency,
    );
    return {
      title,
      body: buildBody(`💰 ${budgetLabel} budget this month`),
      scenario: insight.scenario,
    };
  }

  if (insight.scenario === "category_unlinked") {
    return {
      title,
      body: buildBody("🎯 Link this category to a pocket"),
      scenario: insight.scenario,
    };
  }

  const pocket = insight.pocket;
  if (!pocket) {
    return {
      title,
      body: buildBody("👝 Pocket status updated"),
      scenario: "linked",
    };
  }

  if (pocket.limitCents <= 0) {
    return {
      title,
      body: buildBody(`🎯 Set a limit on ${pocket.name}`),
      scenario: "linked_no_limit",
    };
  }

  if (pocket.remainingCents < 0) {
    const overLabel = formatCurrencyAmount(
      Math.abs(pocket.remainingCents),
      currency,
    );
    return {
      title,
      body: buildBody(`⚠️ ${overLabel} over on ${pocket.name}`),
      scenario: "linked_over",
    };
  }

  const remainingLabel = formatCurrencyAmount(pocket.remainingCents, currency);
  return {
    title,
    body: buildBody(`🪙 ${remainingLabel} left on ${pocket.name}`),
    scenario: "linked",
  };
}

function buildWalletPocketNotificationDeepLink(params: {
  scenario: string;
  expenseId: string;
  householdId: string | null;
}): string {
  const { expenseId } = params;
  return `moneko://expense/${expenseId}`;
}

async function sendWalletPocketNotificationBestEffort(params: {
  supabase: any;
  userId: string;
  householdId: string | null;
  isPortfolio: boolean;
  amountCents: number;
  currency: string;
  category: string;
  dateYmd: string;
  expenseId: string;
}): Promise<void> {
  const {
    supabase,
    userId,
    householdId,
    isPortfolio,
    amountCents,
    currency,
    category,
    dateYmd,
    expenseId,
  } = params;

  try {
    const devices = await fetchActiveDevices(supabase, userId);
    if (!devices.length) return;

    const accessToken = await getFcmAccessToken();
    if (!accessToken) return;

    const spaceLabel = await resolveWalletNotificationSpaceLabel({
      supabase,
      householdId,
      isPortfolio,
    });

    const insight = await buildWalletPocketInsight({
      supabase,
      userId,
      householdId,
      isPortfolio,
      category,
      currency,
      dateYmd,
    });
    const message = buildWalletPocketNotificationMessage({
      insight,
      amountCents,
      currency,
      category,
      spaceLabel,
    });
    const deepLink = buildWalletPocketNotificationDeepLink({
      scenario: message.scenario,
      expenseId,
      householdId,
    });

    const scope = resolveWalletBudgetScope(householdId, isPortfolio);
    const payloadData: Record<string, string> = {
      event_type: "expense_added",
      notification_type: "wallet_pocket_update",
      expense_id: expenseId,
      scope,
      scenario: message.scenario,
      currency,
      category,
      amount_cents: String(amountCents),
      household_id: householdId ?? "",
      deep_link: deepLink,
    };

    await Promise.allSettled(
      devices.map((device) =>
        sendFcmV1Notification({
          supabase,
          deviceToken: device.token,
          title: message.title,
          body: message.body,
          data: payloadData,
          accessToken,
          platform: device.platform ?? undefined,
        }),
      ),
    );
  } catch (error) {
    console.error(
      "[save-wallet-transaction] Wallet pocket notification failed (non-blocking):",
      error,
    );
  }
}

async function storeWalletCaptureIdempotencyResult(
  supabase: any,
  claimId: string,
  key: string,
  result: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const expiresAt = new Date(
    Date.now() + IDEMPOTENCY_KEY_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("idempotency_keys")
    .update({ result, expires_at: expiresAt })
    .eq("id", claimId)
    .is("result", null)
    .select("result")
    .maybeSingle();

  if (!error && data?.result) {
    return data.result as Record<string, unknown>;
  }

  if (error) {
    console.error(
      "[save-wallet-transaction] Failed to persist idempotency result:",
      error,
    );
  }

  const existing = await readWalletCaptureIdempotencyRow(supabase, key);
  if (existing?.result) {
    return existing.result;
  }

  return result;
}

function buildDuplicateWalletCaptureResponse(
  cached: Record<string, unknown>,
  captureSource: string,
): Record<string, unknown> {
  const cachedMeta =
    cached["meta"] && typeof cached["meta"] === "object"
      ? (cached["meta"] as Record<string, unknown>)
      : {};

  return {
    ...cached,
    success: true,
    duplicate: true,
    meta: {
      ...cachedMeta,
      captureSource,
      deduplicatedAt: new Date().toISOString(),
    },
  };
}

async function readWalletCaptureIdempotencyRow(
  supabase: any,
  key: string,
): Promise<WalletCaptureIdempotencyRow | null> {
  const { data, error } = await supabase
    .from("idempotency_keys")
    .select("id, result, created_at")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id as string,
    result: (data.result ?? null) as Record<string, unknown> | null,
    created_at: data.created_at as string | null,
  };
}

async function releaseWalletCaptureIdempotencyClaim(
  supabase: any,
  claimId: string | null,
): Promise<void> {
  if (!claimId) return;

  const { error } = await supabase
    .from("idempotency_keys")
    .delete()
    .eq("id", claimId)
    .is("result", null);

  if (error) {
    console.error(
      "[save-wallet-transaction] Failed to release idempotency claim:",
      error,
    );
  }
}

async function claimWalletCaptureIdempotencyKey(
  supabase: any,
  key: string,
  captureSource: string,
  allowStaleTakeover = true,
): Promise<WalletCaptureClaimResult> {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + IDEMPOTENCY_PROCESSING_TTL_MS,
  ).toISOString();

  const { data, error } = await supabase
    .from("idempotency_keys")
    .insert({
      key,
      result: null,
      created_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (!error && data?.id) {
    return {
      status: "claimed",
      claimId: data.id as string,
    };
  }

  if (error?.code !== "23505") {
    throw error ?? new Error("Failed to claim idempotency key");
  }

  const existing = await readWalletCaptureIdempotencyRow(supabase, key);
  if (existing?.result) {
    return {
      status: "cached",
      cachedResponse: buildDuplicateWalletCaptureResponse(
        existing.result,
        captureSource,
      ),
    };
  }

  if (
    allowStaleTakeover &&
    existing?.id &&
    isWalletCaptureIdempotencyClaimStale(
      existing.created_at,
      Date.now(),
      IDEMPOTENCY_PROCESSING_TTL_MS,
    )
  ) {
    const { error: deleteError } = await supabase
      .from("idempotency_keys")
      .delete()
      .eq("id", existing.id)
      .is("result", null);

    if (!deleteError) {
      return claimWalletCaptureIdempotencyKey(
        supabase,
        key,
        captureSource,
        false,
      );
    }
  }

  return { status: "processing" };
}

function normalizeAndroidCaptureMerchantKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b(?:usd|eur|gbp|aud|cad|inr|rs)\b/g, " ")
    .replace(/\b\d{1,4}(?:[.,]\d{2})?\b/g, " ")
    .replace(
      /\b(?:google|wallet|pay|card|visa|mastercard|debit|credit|purchase|payment|spent|paid|approved|transaction|notification|with|using|ending|account|bank)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .split(" ")
    .filter((part) => part.length > 1)
    .slice(0, 6)
    .join(" ");
}

function buildWalletCaptureScopeKey(
  householdId: string | null,
  isPortfolio: boolean,
): string {
  return householdId
    ? `${householdId}:${isPortfolio ? "portfolio" : "household"}`
    : "personal";
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveAndroidNotificationPostedAt(
  tx: TransactionPayload,
  clientCreatedAt: string | null | undefined,
): Date {
  return (
    parseOptionalDate(tx.notificationPostTime) ??
    parseOptionalDate(clientCreatedAt) ??
    new Date()
  );
}

function buildAndroidLogicalFingerprint(params: {
  userId: string;
  scopeKey: string;
  accountId: string | null;
  transactionType: "expense" | "income";
  amountCents: number;
  currency: string;
  date: string;
  merchantKey: string;
}): string {
  return [
    "android_wallet_capture",
    params.userId,
    params.scopeKey,
    params.accountId ?? "no-account",
    params.transactionType,
    String(params.amountCents),
    params.currency,
    params.date,
    params.merchantKey,
  ].join("|");
}

function buildServerScopedAndroidIdempotencyKey(params: {
  explicitKey?: string | null;
  userId: string;
}): string | null {
  const explicitKey = (params.explicitKey ?? "").trim();
  if (!explicitKey) return null;
  return ["wallet_capture", "android", params.userId, explicitKey].join("|");
}

function buildAndroidLogicalDuplicateResponse(
  row: Record<string, unknown>,
  captureSource: string,
): Record<string, unknown> | null {
  const expenseId = typeof row.expenseId === "string" ? row.expenseId : null;
  if (!expenseId) return null;

  const amountCents = Number(row.amountCents);
  const currency = typeof row.currency === "string" ? row.currency : null;
  const category = typeof row.category === "string" ? row.category : "other";
  const reason =
    typeof row.reason === "string" ? row.reason : "android_logical_duplicate";

  return {
    success: true,
    duplicate: true,
    data: {
      id: expenseId,
      category,
      amount_cents: Number.isFinite(amountCents) ? amountCents : null,
      currency,
    },
    meta: {
      captureSource,
      resolvedCategory: category,
      deduplicatedAt: new Date().toISOString(),
      deduplicationReason: reason,
    },
  };
}

async function claimAndroidWalletCaptureEvent(params: {
  supabase: any;
  userId: string;
  householdId: string | null;
  isPortfolio: boolean;
  accountId: string | null;
  captureSource: string;
  sourcePackage: string | null;
  sourceAppLabel: string | null;
  exactEventKey: string;
  transactionType: "expense" | "income";
  merchantDisplay: string;
  amountCents: number;
  currency: string;
  date: string;
  notificationPostedAt: Date;
}): Promise<AndroidWalletCaptureClaimResult> {
  const scopeKey = buildWalletCaptureScopeKey(
    params.householdId,
    params.isPortfolio,
  );
  const merchantKey = normalizeAndroidCaptureMerchantKey(
    params.merchantDisplay,
  );
  const logicalFingerprint = buildAndroidLogicalFingerprint({
    userId: params.userId,
    scopeKey,
    accountId: params.accountId,
    transactionType: params.transactionType,
    amountCents: params.amountCents,
    currency: params.currency,
    date: params.date,
    merchantKey,
  });

  const { data, error } = await params.supabase.rpc(
    "claim_android_wallet_capture_event",
    {
      p_user_id: params.userId,
      p_scope_key: scopeKey,
      p_household_id: params.householdId,
      p_is_portfolio: params.isPortfolio,
      p_account_id: params.accountId,
      p_capture_source: params.captureSource,
      p_source_package: params.sourcePackage,
      p_source_app_label: params.sourceAppLabel,
      p_exact_event_key: params.exactEventKey,
      p_logical_fingerprint: logicalFingerprint,
      p_merchant_key: merchantKey || null,
      p_transaction_type: params.transactionType,
      p_amount_cents: params.amountCents,
      p_currency: params.currency,
      p_transaction_date: params.date,
      p_notification_posted_at: params.notificationPostedAt.toISOString(),
    },
  );

  if (error) {
    throw new Error(`ANDROID_CAPTURE_DEDUP_FAILED:${error.message}`);
  }

  const result =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const status = typeof result.status === "string" ? result.status : null;
  const claimId =
    typeof result.claimId === "string" ? result.claimId : undefined;

  if (status === "duplicate") {
    return {
      status: "duplicate",
      claimId,
      duplicateResponse:
        buildAndroidLogicalDuplicateResponse(result, params.captureSource) ??
        undefined,
    };
  }

  if (status === "processing") {
    return { status: "processing", claimId };
  }

  if (status === "claimed" && claimId) {
    return { status: "claimed", claimId };
  }

  throw new Error("ANDROID_CAPTURE_DEDUP_INVALID_RESPONSE");
}

async function finalizeAndroidWalletCaptureEvent(
  supabase: any,
  claimId: string | null,
  expenseId: string,
  result: Record<string, unknown>,
): Promise<void> {
  if (!claimId) return;
  const { error } = await supabase.rpc(
    "finalize_android_wallet_capture_event",
    {
      p_claim_id: claimId,
      p_expense_id: expenseId,
      p_result: result,
    },
  );
  if (error) {
    console.error(
      "[save-wallet-transaction] Failed to finalize Android capture event:",
      error,
    );
  }
}

async function releaseAndroidWalletCaptureEvent(
  supabase: any,
  claimId: string | null,
  errorText: string,
): Promise<void> {
  if (!claimId) return;
  const { error } = await supabase.rpc("release_android_wallet_capture_event", {
    p_claim_id: claimId,
    p_error: errorText,
  });
  if (error) {
    console.error(
      "[save-wallet-transaction] Failed to release Android capture event:",
      error,
    );
  }
}

async function cleanupExpenseInsert(
  supabase: any,
  expenseId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    console.error(
      "[save-wallet-transaction] Failed to cleanup incomplete expense:",
      error,
    );
    return false;
  }

  return true;
}

function requireWalletCaptureClaimId(claimId: string | null): string {
  if (!claimId) {
    throw new Error("Missing idempotency claim id");
  }
  return claimId;
}

// ─── Gemini AI helpers (adapted from analyze-core.ts) ───────────────────────

/**
 * Extract function calls from a Gemini response.
 * Mirrors the getFunctionCalls pattern in analyze-core.ts (line 1489).
 */
function getFunctionCalls(response: any): any[] {
  const direct = response?.response?.functionCalls?.();
  const calls: any[] = Array.isArray(direct) ? [...direct] : [];
  const candidates = response?.response?.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part?.functionCall) calls.push(part.functionCall);
      }
    }
  }

  if (calls.length <= 1) return calls;

  const deduped: any[] = [];
  const seen = new Set<string>();
  for (const call of calls) {
    const key = `${call?.name ?? ""}:${JSON.stringify(call?.args ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(call);
  }
  return deduped;
}

/**
 * Use Gemini AI to categorize a single wallet transaction.
 * Adapted from `resolveCandidateCategories` in analyze-core.ts (line 1119).
 *
 * @returns The AI-suggested category (normalized for storage), or "other" on failure.
 */
async function categorizeWithAI(params: {
  genAI?: GenerativeAIClient | null;
  merchantName: string;
  transactionType: "expense" | "income";
  amount: number;
  currency: string;
  date: string;
  note?: string | null;
  expenseCategories: string[];
  incomeCategories: string[];
}): Promise<string> {
  try {
    const {
      genAI,
      merchantName,
      transactionType,
      amount,
      currency,
      date,
      note,
      expenseCategories,
      incomeCategories,
    } = params;

    if (!genAI) {
      return "other";
    }

    const tools: any = [
      {
        functionDeclarations: [
          {
            name: "categorize_transactions",
            description: "Return categories for each transaction in order.",
            parameters: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["categories"],
            },
          },
        ],
      },
    ];

    const descriptionParts = [merchantName];
    if (note) descriptionParts.push(note);
    const description = descriptionParts.join(" – ");

    const request = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are a transaction categorization engine.
Return exactly 1 category for the transaction below.
Use only the allowed categories listed.

Expense categories: ${expenseCategories.join(", ")}
Income categories: ${incomeCategories.join(", ")}

Transactions:
1. ${transactionType.toUpperCase()} | ${date} | ${description} | ${amount} ${currency}`,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: CATEGORIZE_FUNCTION_CALLING_CONFIG,
      },
      generationConfig: { maxOutputTokens: 256 },
    } as any;

    for (let index = 0; index < GEMINI_CATEGORIZATION_MODELS.length; index++) {
      const modelName = GEMINI_CATEGORIZATION_MODELS[index];
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          tools: tools as any,
        });

        let response: any = null;
        for (
          let attempt = 0;
          attempt <= GEMINI_RETRY_DELAYS_MS.length;
          attempt++
        ) {
          try {
            response = await model.generateContent(request);
            break;
          } catch (error) {
            const retryable = isRetryableGeminiError(error);
            const hasRetryLeft = attempt < GEMINI_RETRY_DELAYS_MS.length;
            if (!retryable || !hasRetryLeft) {
              throw error;
            }
            const waitMs = GEMINI_RETRY_DELAYS_MS[attempt];
            console.warn(
              `[save-wallet-transaction] ${modelName} transient categorization failure (attempt ${
                attempt + 1
              }/${GEMINI_RETRY_DELAYS_MS.length + 1}), retrying in ${waitMs}ms`,
            );
            await sleepMs(waitMs);
          }
        }

        const toolCalls = getFunctionCalls(response).filter(
          (call: any) => call && call.name === "categorize_transactions",
        );

        if (toolCalls.length > 0) {
          for (const call of toolCalls) {
            const categories = Array.isArray(call.args?.categories)
              ? call.args.categories
              : [];
            if (categories.length >= 1) {
              return normalizeCategoryForStorage(categories[0]);
            }
          }
        }

        const text = response?.response?.text?.();
        if (text) {
          const normalized = normalizeCategoryForStorage(text.trim());
          if (normalized !== "other") return normalized;
        }

        return "other";
      } catch (error) {
        const retryable = isRetryableGeminiError(error);
        const hasNextModel = index < GEMINI_CATEGORIZATION_MODELS.length - 1;
        if (retryable && hasNextModel) {
          console.warn(
            `[save-wallet-transaction] ${modelName} transient categorization failure, switching to ${
              GEMINI_CATEGORIZATION_MODELS[index + 1]
            }`,
            error,
          );
          continue;
        }
        throw error;
      }
    }

    return "other";
  } catch (error) {
    console.error("[save-wallet-transaction] AI categorization failed:", error);

    await reportVertexAiFailure({
      functionName: "save-wallet-transaction",
      error,
      phase: "ai_categorization",
      modelName: GEMINI_CATEGORIZATION_MODELS[0],
      context: {
        fallbackModelName: GEMINI_CATEGORIZATION_MODELS.slice(1).join(","),
        merchantName: params.merchantName,
        transactionType: params.transactionType,
        amount: params.amount,
        currency: params.currency,
      },
    });

    return "other";
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // ── CORS preflight ────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let idempotencyClaimId: string | null = null;
  let androidCaptureClaimId: string | null = null;
  let requestDebugContext: Record<string, unknown> | null = null;

  try {
    // ── Method gate ───────────────────────────────────────────────────
    if (req.method !== "POST") {
      return errorResponse("Method not allowed. Use POST.", 405);
    }

    // ── Parse body ────────────────────────────────────────────────────
    const rawBodyText = await req.text();
    let body: RequestBody;
    try {
      body = JSON.parse(rawBodyText) as RequestBody;
    } catch (parseError) {
      console.error("[save-wallet-transaction] Invalid JSON payload", {
        error: parseError,
        headers: {
          contentType: req.headers.get("content-type"),
          userAgent: req.headers.get("user-agent"),
          requestId: req.headers.get("x-request-id"),
        },
        rawBodyLength: rawBodyText.length,
        rawBodyPreview: truncateForLog(rawBodyText, 1200),
      });
      return errorResponse("Invalid JSON payload", 400, "INVALID_JSON");
    }

    requestDebugContext = buildWalletCaptureRequestLogContext(req, body);
    console.log(
      "[save-wallet-transaction] Incoming wallet capture payload",
      requestDebugContext,
    );

    // ── Validate captureSource ────────────────────────────────────────
    const captureSource = normalizeWalletCaptureSource(body.captureSource);
    if (!captureSource) {
      logWalletCaptureValidationFailure(
        "invalid_capture_source",
        requestDebugContext,
        {
          receivedCaptureSource: body.captureSource ?? null,
          allowedCaptureSources: Array.from(VALID_CAPTURE_SOURCES),
        },
      );
      return errorResponse(
        `captureSource must be one of: ${Array.from(VALID_CAPTURE_SOURCES).join(
          ", ",
        )}`,
        400,
      );
    }

    // ── Validate transaction object ───────────────────────────────────
    const tx = body.transaction;
    if (!tx || typeof tx !== "object") {
      logWalletCaptureValidationFailure(
        "missing_transaction_object",
        requestDebugContext,
      );
      return errorResponse("transaction object is required", 400);
    }

    // Amount
    if (
      typeof tx.amount !== "number" ||
      !Number.isFinite(tx.amount) ||
      tx.amount <= 0
    ) {
      logWalletCaptureValidationFailure("invalid_amount", requestDebugContext, {
        amount: tx.amount ?? null,
      });
      return errorResponse("transaction.amount must be a positive number", 400);
    }

    // Date
    const rawDate = resolveWalletTransactionDate(tx);
    const normalizedProvidedDate = rawDate
      ? normalizeCalendarDateString(rawDate)
      : null;
    if (rawDate && !normalizedProvidedDate) {
      logWalletCaptureValidationFailure(
        "invalid_date_using_fallback",
        requestDebugContext,
        {
          receivedDate: rawDate,
          fallbackDateSource: body.clientCreatedAt ? "clientCreatedAt" : "now",
        },
      );
    } else if (rawDate && rawDate.trim().startsWith("00")) {
      console.log(
        "[save-wallet-transaction] Coerced short-year transaction date",
        {
          rawDate,
          normalizedDate: normalizedProvidedDate,
        },
      );
    }

    // Merchant — allow note/package fallback for notification-based captures.
    const merchantDisplay = (
      tx.merchantName ??
      tx.rawMerchant ??
      tx.note ??
      resolveWalletTransactionPackageName(tx) ??
      ""
    ).trim();
    if (!merchantDisplay) {
      logWalletCaptureValidationFailure(
        "missing_transaction_descriptor",
        requestDebugContext,
      );
      return errorResponse(
        "At least one transaction descriptor is required",
        400,
      );
    }

    // ── Environment ───────────────────────────────────────────────────
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse("Server configuration error", 500, "SERVER_ERROR");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "X-Client-Info": "moneko-save-wallet-transaction" },
      },
    });

    let genAI: GenerativeAIClient | null = null;
    try {
      genAI = createVertexGenerativeAI(getVertexAiConfigFromEnv());
    } catch (error) {
      console.warn(
        "[save-wallet-transaction] Vertex AI not configured; using fallback category 'other'",
        error,
      );
    }

    // ── Authenticate ──────────────────────────────────────────────────
    const authResult = await authenticateUserOrInternalSecret(req, supabase);
    if (!authResult.success) {
      console.warn("[save-wallet-transaction] Authentication failed", {
        request: requestDebugContext,
        statusCode: authResult.statusCode ?? 401,
        error: authResult.error ?? "Unauthorized",
      });
      return errorResponse(
        authResult.error || "Unauthorized",
        authResult.statusCode ?? 401,
        "UNAUTHORIZED",
      );
    }

    let userId: string | null = null;

    if (authResult.isInternalService) {
      // Internal callers must provide userId in body
      userId = sanitizeUuid(body.userId);
      if (!userId) {
        logWalletCaptureValidationFailure(
          "missing_internal_user_id",
          requestDebugContext,
          { providedUserId: body.userId ?? null },
        );
        return errorResponse(
          "userId is required for internal service calls",
          400,
        );
      }
    } else {
      // JWT-authenticated: use the user from the token, never trust body
      userId = authResult.userId ?? null;
    }

    if (!userId) {
      logWalletCaptureValidationFailure(
        "unable_to_resolve_user_identity",
        requestDebugContext,
      );
      return errorResponse("Unable to resolve user identity", 400);
    }

    // ── Normalize inputs ──────────────────────────────────────────────
    const amountCents = Math.round(tx.amount * 100);
    const isPortfolio = body.isPortfolio === true;
    const householdId = sanitizeUuid(body.householdId);
    const requestedAccountId = sanitizeUuid(body.accountId);
    const description = buildDescription(tx);
    const transactionType =
      typeof tx.type === "string" && tx.type.trim().toLowerCase() === "income"
        ? "income"
        : "expense";

    let householdMembers: Array<{ user_id: string }> = [];
    let requiresHouseholdSplit = false;
    if (householdId) {
      const { data: membership, error: membershipError } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError || !membership?.id) {
        return errorResponse(
          "Unauthorized household scope",
          403,
          "UNAUTHORIZED",
        );
      }

      if (!isPortfolio) {
        const { data: members, error: membersError } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", householdId);

        householdMembers =
          membersError || !Array.isArray(members) ? [] : members;
      }

      try {
        const scopeResolution = resolveWalletCaptureScope({
          requestedHouseholdId: householdId,
          isPortfolio,
          hasMembership: !!membership?.id,
          householdMemberCount: householdMembers.length,
        });
        requiresHouseholdSplit = scopeResolution.requiresHouseholdSplit;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "UNAUTHORIZED_HOUSEHOLD_SCOPE") {
          return errorResponse(
            "Unauthorized household scope",
            403,
            "UNAUTHORIZED",
          );
        }
        if (message === "NO_ACTIVE_HOUSEHOLD_MEMBERS") {
          return errorResponse("No active household members", 400);
        }
        throw error;
      }
    }

    let accountId: string | null = null;
    if (requestedAccountId) {
      const isAccountInScope = await assertAccountInScope(
        supabase,
        requestedAccountId,
        { userId, householdId },
      );
      if (isAccountInScope) {
        accountId = requestedAccountId;
      } else {
        return errorResponse(
          "Provided accountId does not belong to this scope or currency",
          400,
          "VALIDATION_ERROR",
        );
      }
    }

    // ── Resolve user contact ──────────────────────────────────────────
    let contactId: string | null = null;
    let preferredCurrency: string | null = null;
    let preferredTimezone: string | null = null;
    {
      const { data: contact, error: contactError } = await supabase
        .from("user_contacts")
        .select(
          "id, preferred_currency, preferred_timezone, wallet_capture_enabled",
        )
        .eq("user_id", userId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contactError) {
        console.error(
          "[save-wallet-transaction] Failed to look up user contact:",
          contactError,
        );
        return errorResponse(
          "Failed to resolve user contact",
          500,
          "SERVER_ERROR",
        );
      }

      if (contact && contact.wallet_capture_enabled === false) {
        console.log(
          "[save-wallet-transaction] Wallet capture disabled for user:",
          userId,
        );
        return errorResponse(
          "Wallet capture is disabled",
          403,
          "WALLET_CAPTURE_DISABLED",
        );
      }

      if (contact) {
        contactId = contact.id;
        preferredCurrency =
          typeof contact.preferred_currency === "string"
            ? normalizePreferredCurrency(contact.preferred_currency)
            : null;
        preferredTimezone =
          typeof contact.preferred_timezone === "string"
            ? contact.preferred_timezone.trim() || null
            : null;
      } else {
        console.log(
          "[save-wallet-transaction] No user_contact row found; proceeding with null contact_id.",
          { userId },
        );
      }
    }

    const payloadCurrency = resolveWalletTransactionCurrency(tx);

    if (!payloadCurrency && !preferredCurrency) {
      await reportEdgeFunctionError({
        functionName: "save-wallet-transaction",
        error: new Error(
          "Wallet capture missing currency on both payload and user contact",
        ),
        context: {
          step: "resolve_currency",
          captureSource,
          userId,
          householdId,
          payloadCurrency,
          preferredCurrency,
          fallbackCurrency: "USD",
          transaction: requestDebugContext?.transaction ?? null,
        },
      });
      logWalletCaptureValidationFailure(
        "missing_currency_fallback_to_usd",
        requestDebugContext,
        { preferredCurrency, payloadCurrency, fallbackCurrency: "USD" },
      );
    }

    const resolvedCaptureCurrency = resolveWalletCaptureCurrency({
      tx,
      preferredCurrency,
      captureSource,
    });
    const currency = validateCurrency(resolvedCaptureCurrency ?? "USD");

    if (accountId) {
      const isAccountCurrencyInScope = await assertAccountInScope(
        supabase,
        accountId,
        { userId, householdId, currency },
      );
      if (!isAccountCurrencyInScope) {
        return errorResponse(
          "Provided accountId does not belong to this scope or currency",
          400,
          "VALIDATION_ERROR",
        );
      }
    }

    const clientCreatedAtPrefix = extractCalendarDatePrefix(
      body.clientCreatedAt,
    );
    const fallbackDateBase = body.clientCreatedAt
      ? new Date(body.clientCreatedAt)
      : new Date();
    const fallbackDate = Number.isNaN(fallbackDateBase.getTime())
      ? new Date()
      : fallbackDateBase;
    const normalizedClientCreatedDate =
      clientCreatedAtPrefix ??
      (body.clientCreatedAt && !Number.isNaN(fallbackDateBase.getTime())
        ? getLocalYyyyMmDdInTimeZone(preferredTimezone, fallbackDateBase)
        : null);
    const normalizedDate =
      normalizedProvidedDate ??
      normalizedClientCreatedDate ??
      getLocalYyyyMmDdInTimeZone(preferredTimezone, fallbackDate);

    if (!normalizedDate) {
      logWalletCaptureValidationFailure(
        "missing_or_invalid_date",
        requestDebugContext,
        {
          receivedDate: rawDate ?? null,
          clientCreatedAt: body.clientCreatedAt ?? null,
          preferredTimezone,
        },
      );
      return errorResponse(
        "transaction.date must be a valid calendar date",
        400,
      );
    }

    console.log("[save-wallet-transaction] Processing:", {
      userId,
      captureSource,
      transactionType,
      merchant: merchantDisplay,
      amount: tx.amount,
      currency,
      date: normalizedDate,
      householdId,
      isPortfolio,
      accountId,
      preferredTimezone,
      usedProvidedDate: Boolean(normalizedProvidedDate),
      usedClientCreatedAtDate:
        !normalizedProvidedDate && Boolean(normalizedClientCreatedDate),
    });

    const requestIdempotencyKey = buildWalletCaptureIdempotencyKey({
      explicitKey:
        captureSource === "android_notification_listener"
          ? buildServerScopedAndroidIdempotencyKey({
              explicitKey: body.idempotencyKey,
              userId,
            })
          : body.idempotencyKey,
      captureSource,
      userId,
      householdId,
      isPortfolio,
      transactionType,
      merchantName: merchantDisplay,
      amountCents,
      currency,
      date: normalizedDate,
      cardLabel: tx.cardLabel,
      externalSourceId: tx.externalSourceId,
      packageName: resolveWalletTransactionPackageName(tx),
    });

    const claimResult = await claimWalletCaptureIdempotencyKey(
      supabase,
      requestIdempotencyKey,
      captureSource,
    );
    if (claimResult.status === "cached" && claimResult.cachedResponse) {
      return successResponse(claimResult.cachedResponse);
    }
    if (claimResult.status === "processing") {
      return errorResponse(
        "An identical wallet capture is already being processed",
        409,
        "REQUEST_IN_PROGRESS",
      );
    }
    idempotencyClaimId = claimResult.claimId ?? null;

    if (captureSource === "android_notification_listener") {
      try {
        const androidClaim = await claimAndroidWalletCaptureEvent({
          supabase,
          userId,
          householdId,
          isPortfolio,
          accountId,
          captureSource,
          sourcePackage: resolveWalletTransactionPackageName(tx),
          sourceAppLabel: tx.sourceAppLabel ?? null,
          exactEventKey: requestIdempotencyKey,
          transactionType,
          merchantDisplay,
          amountCents,
          currency,
          date: normalizedDate,
          notificationPostedAt: resolveAndroidNotificationPostedAt(
            tx,
            body.clientCreatedAt,
          ),
        });

        if (androidClaim.status === "duplicate") {
          const duplicateResponse = androidClaim.duplicateResponse;
          if (!duplicateResponse) {
            throw new Error("ANDROID_CAPTURE_DUPLICATE_MISSING_RESPONSE");
          }
          return successResponse(
            await storeWalletCaptureIdempotencyResult(
              supabase,
              requireWalletCaptureClaimId(idempotencyClaimId),
              requestIdempotencyKey,
              duplicateResponse,
            ),
          );
        }

        if (androidClaim.status === "processing") {
          await releaseWalletCaptureIdempotencyClaim(
            supabase,
            idempotencyClaimId,
          );
          return errorResponse(
            "An identical wallet capture is already being processed",
            409,
            "REQUEST_IN_PROGRESS",
          );
        }

        androidCaptureClaimId = androidClaim.claimId ?? null;
      } catch (dedupError) {
        console.error(
          "[save-wallet-transaction] Android logical deduplication failed:",
          dedupError,
        );
        await releaseWalletCaptureIdempotencyClaim(
          supabase,
          idempotencyClaimId,
        );
        return errorResponse(
          "Failed to deduplicate wallet capture",
          500,
          "SERVER_ERROR",
        );
      }
    }

    // ── Category resolution ───────────────────────────────────────────
    // Step 1: Load user category context (custom categories, preferences, remaps)
    let resolvedCategory = "other";
    try {
      const ctx = await loadCategoryContext({ supabase, userId });

      // Convert allowed category sets to sorted arrays for the AI prompt
      const expenseCategoryList = Array.from(ctx.allowedExpenseSet).sort();
      const incomeCategoryList = Array.from(ctx.allowedIncomeSet).sort();

      // Step 2: Call Gemini AI to categorize the transaction
      const aiCategory = await categorizeWithAI({
        genAI,
        merchantName: merchantDisplay,
        transactionType,
        amount: tx.amount,
        currency,
        date: normalizedDate,
        note: tx.note,
        expenseCategories: expenseCategoryList,
        incomeCategories: incomeCategoryList,
      });

      console.log("[save-wallet-transaction] AI categorization result:", {
        merchant: merchantDisplay,
        aiCategory,
      });

      // Step 3: Run full resolution pipeline (remap → preference → remap → coerce)
      resolvedCategory = resolveCategory({
        initialGuess: aiCategory,
        description: merchantDisplay,
        transactionType,
        ctx,
      });

      console.log("[save-wallet-transaction] Category resolution:", {
        merchant: merchantDisplay,
        aiCategory,
        resolved: resolvedCategory,
      });
    } catch (catError) {
      console.error(
        "[save-wallet-transaction] Category resolution failed (using 'other'):",
        catError,
      );
      // Graceful degradation: proceed with "other"
    }

    // ── Save expense ──────────────────────────────────────────────────
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        contact_id: contactId,
        user_id: userId,
        type: transactionType,
        amount_cents: amountCents,
        category: resolvedCategory,
        date: normalizedDate,
        raw_text: description,
        currency,
        breakdown: null,
        receipt_image_url: null,
        created_at: body.clientCreatedAt || new Date().toISOString(),
        is_recurring: false,
        recurrence_rule: null,
        household_id: householdId,
        account_id: accountId,
        wallet_capture_idempotency_key: requestIdempotencyKey,
      })
      .select()
      .single();

    if (expenseError) {
      if (expenseError.code === "23505") {
        const { data: existingExpense } = await supabase
          .from("expenses")
          .select("id, category, amount_cents, currency")
          .eq("wallet_capture_idempotency_key", requestIdempotencyKey)
          .maybeSingle();

        if (existingExpense) {
          const duplicateResponse = {
            success: true,
            duplicate: true,
            data: {
              id: existingExpense.id,
              category: existingExpense.category ?? resolvedCategory,
              amount_cents: existingExpense.amount_cents ?? amountCents,
              currency: existingExpense.currency ?? currency,
            },
            meta: {
              captureSource,
              resolvedCategory: existingExpense.category ?? resolvedCategory,
              deduplicatedAt: new Date().toISOString(),
            },
          };

          await finalizeAndroidWalletCaptureEvent(
            supabase,
            androidCaptureClaimId,
            existingExpense.id,
            duplicateResponse,
          );

          return successResponse(
            await storeWalletCaptureIdempotencyResult(
              supabase,
              requireWalletCaptureClaimId(idempotencyClaimId),
              requestIdempotencyKey,
              duplicateResponse,
            ),
          );
        }
      }

      console.error(
        "[save-wallet-transaction] Error saving expense:",
        expenseError,
      );
      await releaseAndroidWalletCaptureEvent(
        supabase,
        androidCaptureClaimId,
        "expense_insert_failed",
      );
      await releaseWalletCaptureIdempotencyClaim(supabase, idempotencyClaimId);
      return errorResponse("Failed to save expense", 500, "SERVER_ERROR");
    }

    console.log("[save-wallet-transaction] Expense saved:", expense.id);

    // ── Learn category preference ─────────────────────────────────────
    try {
      await ensureUserCategory({
        supabase,
        userId,
        categoryName: resolvedCategory,
        transactionType,
      });
      await learnUserCategoryPreference({
        supabase,
        userId,
        transactionType,
        categoryName: resolvedCategory,
        descriptionText: description,
      });
    } catch (learnError) {
      console.error(
        "[save-wallet-transaction] Failed to learn category preference (non-blocking):",
        learnError,
      );
    }

    // ── Household split ───────────────────────────────────────────────
    let responseExpense = expense;

    if (householdId && isPortfolio) {
      // Portfolio: save with household_id but no split
      const responseBody = {
        success: true,
        duplicate: false,
        data: {
          id: expense.id,
          category: resolvedCategory,
          amount_cents: amountCents,
          currency,
        },
        meta: {
          captureSource,
          resolvedCategory,
        },
      };
      const storedResponse = await storeWalletCaptureIdempotencyResult(
        supabase,
        requireWalletCaptureClaimId(idempotencyClaimId),
        requestIdempotencyKey,
        responseBody,
      );
      await finalizeAndroidWalletCaptureEvent(
        supabase,
        androidCaptureClaimId,
        expense.id,
        storedResponse,
      );
      await sendWalletPocketNotificationBestEffort({
        supabase,
        userId,
        householdId,
        isPortfolio,
        amountCents,
        currency,
        category: resolvedCategory,
        dateYmd: normalizedDate,
        expenseId: expense.id,
      });
      return successResponse(storedResponse);
    }

    if (
      householdId &&
      requiresHouseholdSplit &&
      transactionType === "expense"
    ) {
      console.log(
        "[save-wallet-transaction] Creating household split for:",
        householdId,
      );

      // Equal split (wallet captures always use equal split)
      const { data: splitGroup, error: splitGroupError } = await supabase
        .from("expense_split_groups")
        .insert({
          household_id: householdId,
          expense_id: expense.id,
          payer_user_id: userId,
          split_type: "equal",
          currency,
          total_amount_cents: amountCents,
          description: description || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (splitGroupError) {
        console.error(
          "[save-wallet-transaction] Error creating split group:",
          splitGroupError,
        );
        const didCleanupExpense = await cleanupExpenseInsert(
          supabase,
          expense.id,
        );
        if (didCleanupExpense) {
          await releaseAndroidWalletCaptureEvent(
            supabase,
            androidCaptureClaimId,
            "split_group_insert_failed",
          );
          await releaseWalletCaptureIdempotencyClaim(
            supabase,
            idempotencyClaimId,
          );
        }
        return errorResponse(
          "Failed to save household split",
          500,
          "SERVER_ERROR",
        );
      }

      // Create equal split lines
      const amountPerMember = Math.floor(amountCents / householdMembers.length);
      const remainder = amountCents - amountPerMember * householdMembers.length;
      const splitLines = householdMembers.map(
        (member: { user_id: string }, index: number) => ({
          split_group_id: splitGroup.id,
          user_id: member.user_id,
          amount_cents: amountPerMember + (index === 0 ? remainder : 0),
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }),
      );

      const { error: splitLinesError } = await supabase
        .from("expense_split_lines")
        .insert(splitLines);

      if (splitLinesError) {
        console.error(
          "[save-wallet-transaction] Error creating split lines:",
          splitLinesError,
        );
        const didCleanupExpense = await cleanupExpenseInsert(
          supabase,
          expense.id,
        );
        if (didCleanupExpense) {
          await releaseAndroidWalletCaptureEvent(
            supabase,
            androidCaptureClaimId,
            "split_lines_insert_failed",
          );
          await releaseWalletCaptureIdempotencyClaim(
            supabase,
            idempotencyClaimId,
          );
        }
        return errorResponse(
          "Failed to save household split",
          500,
          "SERVER_ERROR",
        );
      } else {
        console.log(
          "[save-wallet-transaction] Split lines created for",
          householdMembers.length,
          "members",
        );
      }

      // Update expense with split_group_id and household_id
      const { error: expenseUpdateError } = await supabase
        .from("expenses")
        .update({
          split_group_id: splitGroup.id,
          household_id: householdId,
        })
        .eq("id", expense.id);

      if (expenseUpdateError) {
        console.error(
          "[save-wallet-transaction] Error updating split expense:",
          expenseUpdateError,
        );
        const didCleanupExpense = await cleanupExpenseInsert(
          supabase,
          expense.id,
        );
        if (didCleanupExpense) {
          await releaseAndroidWalletCaptureEvent(
            supabase,
            androidCaptureClaimId,
            "split_expense_update_failed",
          );
          await releaseWalletCaptureIdempotencyClaim(
            supabase,
            idempotencyClaimId,
          );
        }
        return errorResponse(
          "Failed to save household split",
          500,
          "SERVER_ERROR",
        );
      }

      // Refresh expense data
      const { data: refreshedExpense } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", expense.id)
        .single();

      if (refreshedExpense) {
        responseExpense = refreshedExpense;
      }

      // Notify household members
      let actorName = "Someone";
      try {
        const { data: appUser } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();
        if (appUser?.full_name && String(appUser.full_name).trim().length > 0) {
          actorName = appUser.full_name as string;
        }
      } catch (_) {
        /* non-critical */
      }

      const { error: notifyError } = await supabase.rpc(
        "notify_household_members_expense",
        {
          p_household_id: householdId,
          p_expense_id: expense.id,
          p_actor_user_id: userId,
          p_event_type: "expense_added",
          p_expense_data: {
            actor_name: actorName,
            amount_cents: amountCents,
            currency,
            category: resolvedCategory,
            note: description,
            is_recurring: false,
          },
        },
      );

      if (notifyError) {
        console.error(
          "[save-wallet-transaction] Error notifying household:",
          notifyError,
        );
      }

      console.log(
        "[save-wallet-transaction] Household split created successfully",
      );
    }

    // ── Success response ──────────────────────────────────────────────
    const responseBody = {
      success: true,
      duplicate: false,
      data: {
        id: responseExpense.id,
        category: responseExpense.category ?? resolvedCategory,
        amount_cents: amountCents,
        currency,
      },
      meta: {
        captureSource,
        resolvedCategory,
      },
    };
    const storedResponse = await storeWalletCaptureIdempotencyResult(
      supabase,
      requireWalletCaptureClaimId(idempotencyClaimId),
      requestIdempotencyKey,
      responseBody,
    );
    await finalizeAndroidWalletCaptureEvent(
      supabase,
      androidCaptureClaimId,
      responseExpense.id,
      storedResponse,
    );

    await sendWalletPocketNotificationBestEffort({
      supabase,
      userId,
      householdId,
      isPortfolio,
      amountCents,
      currency,
      category: resolvedCategory,
      dateYmd: normalizedDate,
      expenseId: responseExpense.id,
    });

    return successResponse(storedResponse);
  } catch (error) {
    console.error("[save-wallet-transaction] Unhandled error:", {
      error,
      request: requestDebugContext,
    });
    if (
      typeof Deno.env.get("SUPABASE_URL") === "string" &&
      typeof Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") === "string" &&
      idempotencyClaimId
    ) {
      try {
        const cleanupClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
              detectSessionInUrl: false,
            },
          },
        );
        await releaseAndroidWalletCaptureEvent(
          cleanupClient,
          androidCaptureClaimId,
          "unhandled_error",
        );
        await releaseWalletCaptureIdempotencyClaim(
          cleanupClient,
          idempotencyClaimId,
        );
      } catch (_) {
        // Best-effort cleanup only.
      }
    }
    await reportEdgeFunctionError({
      functionName: "save-wallet-transaction",
      error,
      context: requestDebugContext
        ? { step: "unhandled", request: requestDebugContext }
        : { step: "unhandled" },
    });
    return errorResponse(
      "Failed to save wallet transaction",
      500,
      "SERVER_ERROR",
    );
  }
});
