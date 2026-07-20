/// <reference lib="deno.ns" />

// Supabase Edge Function: twilio-whatsapp-ai-bot
// Handles WhatsApp messages via Twilio, using Gemini AI and MCP-style tools.

import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import {
  buildVerificationPrompt,
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
} from "../shared/whatsapp-helpers.ts";
import {
  buildSubscriptionRequiredMessage,
  hasPlusEntitlement,
} from "../shared/plus-entitlement.ts";
import { TWILIO_TEMPLATES } from "../shared/twilio-templates.ts";
import { fetchExpensesDirect } from "../shared/expenses-helpers.ts";
import type { CustomSplits } from "../shared/expenses-helpers.ts";
import {
  createOrUpdateBudget,
  getBudgetStatusDirect,
  resolveFinancialPeriodStartForUser,
  upsertEnvelope,
  upsertEnvelopeAllocation,
  upsertEnvelopeCategoryLink,
} from "../shared/budgets-helpers.ts";
import { insertChatMessage } from "../shared/chat-helpers.ts";
import {
  buildCategoryChart,
  debugLog,
  formatAmount,
  formatInvokeError,
  normalizeExpensesForTool,
} from "../shared/formatting-helpers.ts";
import { reportVertexAiFailure } from "../shared/report-vertex-ai-failure.ts";
import {
  isRetryableGeminiError,
  sendGeminiMessageWithRetry,
} from "../shared/gemini-retry.ts";
import {
  createVertexBotChatSession,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import { upsertUserCustomCategory } from "../shared/user-categories.ts";
import {
  buildLanguageOverride,
  getReplyLanguagePromptLabel,
  resolvePreferredReplyLanguage,
} from "../shared/detect-language.ts";
import {
  buildInternalInvokeHeaders,
  resolveInternalFunctionKey,
  resolveInternalFunctionKeyWithSource,
} from "../shared/auth.ts";
import {
  buildRecurrenceRule,
  formatDateInTimeZone,
  normalizeDateInput,
} from "../shared/bot/date-utils.ts";
import {
  getInvokeHttpStatus,
  reportBotBackendError,
  reportBotToolInvokeFailure,
} from "../shared/bot/error-reporting.ts";
import {
  buildGeminiHighDemandMessage,
  buildProcessingFailureMessage,
  createQuickChartShortUrl,
  decodeBase64,
  extractChartMediaUrlFromToolResult,
  extractQuickChartUrl,
  normalizeQuickChartMediaUrl,
  runAnalyzeExpenseWithTimeout,
  runBackgroundTask,
  truncateTextByCodePoints,
  uint8ToBase64,
} from "../shared/bot/media-utils.ts";
import {
  loadBotPreferredSpaceId,
  setBotPreferredCurrency,
  setBotPreferredLanguage,
  setBotPreferredSpace,
} from "../shared/bot/preference-tools.ts";
import { setBotPocketFromToolCall } from "../shared/bot/pocket-tools.ts";
import {
  invokeTransactionDelete,
  invokeTransactionSave,
  normalizeTransactionToolArgs,
} from "../shared/bot/transaction-tool.ts";
import { resolveBotTransactionSelection } from "../shared/bot/transaction-selection.ts";
import {
  buildAddTransactionsBatchTool,
  buildAddTransactionTool,
  buildConfirmBudgetTool,
  buildCreateCustomCategoryTool,
  buildCreateSpaceInviteTool,
  buildCreateSpaceTool,
  buildDeletePocketTool,
  buildDeleteTransactionTool,
  buildDraftBudgetTool,
  buildFinancialInsightTool,
  buildGenerateChartUrlTool,
  buildGetBudgetTool,
  buildGetSpaceInfoTool,
  buildListExpensesTool,
  buildManageRecurringTool,
  buildSetBudgetTool,
  buildSetCurrencyTool,
  buildSetDefaultSpaceTool,
  buildSetLanguageTool,
  buildSetPocketTool,
  buildUpdateSpaceSettingsTool,
  buildUpdateTransactionTool,
  buildWalletTools,
  cloneBotToolDeclarations,
} from "../shared/bot/tool-definitions.ts";
import {
  hasExplicitTransactionCurrency,
  resolveWalletForTransactionToolCall,
  resolveWalletIdInScope,
  resolveWalletTransactionCurrency,
} from "../shared/bot/wallet-scope.ts";
import {
  createBotWalletFromToolCall,
  createBotWalletTransferFromToolCall,
  listBotWallets,
  updateBotWalletFromToolCall,
} from "../shared/bot/wallet-tools.ts";
import { routeWalletMutationToolCall } from "../shared/bot/wallet-intent.ts";
import { buildBotSystemInstruction } from "../shared/bot/system-instruction.ts";
import {
  createBotSpace,
  createBotSpaceInvite,
  getBotSpaceInfo,
  updateBotSpaceSettings,
} from "../shared/bot/space-tools.ts";
import {
  buildUnsafeMutationClaimFallback,
  diagnoseUnsafeTransactionMutationClaim,
  isWriteMutationToolName,
  WRITE_MUTATION_FORCED_FUNCTION_CALLING_CONFIG,
} from "../shared/bot/mutation-claim-guard.ts";
import {
  consolidateDuplicateEnvelopesForBudget,
  normalizeEnvelopeName,
} from "../shared/bot/budget-utils.ts";
import {
  applyPreferredSpaceDefaultToToolCall,
  ensureHouseholdMember,
  resolveBotSpaceScope,
  resolveHouseholdSplitConfig,
  upsertBotSpaceMetaFromToolResult,
} from "../shared/bot/household-utils.ts";
import { jsonResponse } from "../shared/bot/http-utils.ts";
import {
  loadBotCategoryContext,
  loadGeminiChatHistory,
} from "../shared/bot/conversation-context.ts";
import { finalizeBotResponseText } from "../shared/bot/response-finalization.ts";
import {
  clearLastListedTransactions,
  type LastListedTransaction,
  loadSessionState,
  normalizeLastListedTransactionFromRow,
  normalizeSessionState,
  type PendingBudgetDraft,
  readLastListedTransactions,
  resolveLastListedSelection,
  saveSessionState,
  type SessionState,
  setLastListedTransactions,
} from "../shared/bot/session-state.ts";
import {
  loadLatestUserPreferredCurrency,
  normalizePreferredCurrency,
} from "../shared/user-preferred-currency.ts";

// --- Constants & Types ---

const MODEL_NAME = "gemini-3.1-flash-lite";
const FALLBACK_MODEL_NAME = "gemini-2.5-flash";
const SYSTEM_INSTRUCTION = buildBotSystemInstruction({
  channel: "WhatsApp",
  toneRule:
    "Enthusiastic, encouraging, concise, and proactive (suitable for WhatsApp). Use light emojis, and close with a quick follow-up offer to help further (e.g., suggest related actions like totals, budgets, or recurring setup).",
  spaceFollowUpRule:
    "Always refer to these exact names (personal account, private space, shared space) when responding.",
  bulkImportRule:
    "When the user uploads a receipt, bank statement, or file with multiple transactions, use 'add_transactions_batch' to save them all at once (more efficient than multiple add_transaction calls). Present a summary of all items for confirmation before saving.",
  financialSnapshotRule:
    'For asks like "current financial situation/health/status": provide one concise snapshot for the current month/pay-period: verdict, income vs spending (or say income not tracked), net, top 3–5 categories with % of spend, budget status (remaining/over/under + days left), upcoming recurring (next ~7 days), and 1–2 actions. Only treat "status" as financial when the user explicitly mentions finances, money, budget, spending, income, or health. For bot status checks or greetings, answer directly without tools or charts. If you send a chart, prefer a radar or donut of spending by category (not gauges). Always include the text summary; the chart is optional/secondary.',
  messageFormattingRules: `MESSAGE FORMATTING (WhatsApp-specific):
- WhatsApp renders these formatting symbols natively — use them:
  • *bold* (wrap with asterisks) — use for key amounts, confirmations, category names.
  • _italic_ (wrap with underscores) — use for secondary info or gentle emphasis.
  • ~strikethrough~ (wrap with tildes) — use sparingly for corrections.
  • \`\`\`code\`\`\` (wrap with triple backticks) — use for tabular data or fixed-width output.
- Do NOT use Markdown syntax like **bold**, # headings, or [links](url) — WhatsApp will not render them.
- Do NOT use HTML tags (<b>, <i>, etc.).
- Use emoji bullets (✅, 📊, 💰, •) and line breaks for visual structure.
- For numbered lists, use "1. ", "2. ", etc.
- Use blank lines between logical sections for readability.
- Keep messages mobile-friendly: short paragraphs, no walls of text.
`,
  commonUserIntents: true,
});
const WHATSAPP_BUDGET_FLOW = `
WHATSAPP BUDGET FLOW (WhatsApp only):
- When the user asks to set/create a budget or pockets, call "draft_budget" with the proposed amount and pockets, then ask for confirmation.
- When the user confirms (e.g., yes/ok/sounds good), call "confirm_budget" to finalize without re-asking for amounts unless missing.
- Only call "set_budget" directly if the user explicitly asks to set it now and the full amount is present in the same message.
`;
const WHATSAPP_SYSTEM_INSTRUCTION = `${SYSTEM_INSTRUCTION}\n${WHATSAPP_BUDGET_FLOW}`;

const PROCESSING_ACK_DELAY_MS = 1000;
const IDEMPOTENCY_TTL_MINUTES = 60;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const TYPING_FOLLOW_UP_DELAY_MS = 24000;
const GEMINI_PRE_REQUEST_DELAY_MS = 1200;
const GEMINI_MAX_RETRIES = 1;
const GEMINI_REQUEST_TIMEOUT_MS = 30000;
const WHATSAPP_CHUNK_TARGET_CHARS = 1450;
const DELIVERY_FAILURE_MESSAGE =
  "I wasn’t able to deliver the full response just now. Could you please try again with a smaller request?";

type IdempotencyRecord = {
  status: "processing" | "done" | "failed";
  response_text?: string;
  media_url?: string;
  delivery?: "twiml" | "api" | "template";
  error?: string;
};

function xmlResponse(xml: string, status = 200) {
  return new Response(xml, {
    status,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(value: string): string {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTwimlMessage(message?: string | null, mediaUrl?: string | null) {
  const body = (message || "").trim();
  const media = (mediaUrl || "").trim();
  if (!body && !media) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  }

  if (!media) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
      body,
    )}</Message></Response>`;
  }

  const bodyXml = body ? `<Body>${escapeXml(body)}</Body>` : "";
  const mediaXml = `<Media>${escapeXml(media)}</Media>`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${bodyXml}${mediaXml}</Message></Response>`;
}

async function sendTwilioWhatsAppTypingIndicator(
  accountSid: string,
  authToken: string,
  messageId?: string | null,
) {
  if (!accountSid || !authToken || !messageId) return false;
  try {
    const formData = new URLSearchParams();
    formData.append("messageId", messageId);
    formData.append("channel", "whatsapp");

    const response = await fetch(
      "https://messaging.twilio.com/v2/Indicators/Typing.json",
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        "[twilio-whatsapp-ai-bot] Failed to send typing indicator:",
        body,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "[twilio-whatsapp-ai-bot] Error while sending typing indicator:",
      error,
    );
    return false;
  }
}

function scheduleTwilioTypingFollowUp(
  accountSid: string,
  authToken: string,
  messageId?: string | null,
  delayMs: number = TYPING_FOLLOW_UP_DELAY_MS,
) {
  if (!accountSid || !authToken || !messageId) {
    return () => {};
  }

  let active = true;
  const timeoutId = setTimeout(() => {
    if (!active) return;
    void sendTwilioWhatsAppTypingIndicator(
      accountSid,
      authToken,
      messageId,
    ).catch((error) => {
      console.error("[twilio-whatsapp-ai-bot] Typing follow-up failed:", error);
    });
  }, delayMs);

  return () => {
    active = false;
    clearTimeout(timeoutId);
  };
}

function splitWhatsAppMessage(
  text: string,
  maxChars: number = WHATSAPP_CHUNK_TARGET_CHARS,
): string[] {
  const normalized = (text || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const codePoints = Array.from(normalized);
  if (codePoints.length <= maxChars) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < codePoints.length) {
    let end = Math.min(start + maxChars, codePoints.length);

    if (end < codePoints.length) {
      const minBreak = Math.max(start + Math.floor(maxChars * 0.5), start + 1);
      for (let i = end - 1; i >= minBreak; i--) {
        const marker = codePoints[i];
        if (marker === "\n" || marker === " ") {
          end = i + 1;
          break;
        }
      }
    }

    const part = codePoints.slice(start, end).join("").trim();
    if (part) chunks.push(part);
    start = end;
  }

  return chunks;
}

async function sendWhatsAppMessageInChunks(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  text: string,
): Promise<
  | { success: true; totalChunks: number }
  | { success: false; error: string; sentChunks: number; totalChunks: number }
> {
  const chunks = splitWhatsAppMessage(text);
  if (!chunks.length) {
    return {
      success: false,
      error: "empty_message",
      sentChunks: 0,
      totalChunks: 0,
    };
  }
  for (let i = 0; i < chunks.length; i++) {
    const sendResult = await sendWhatsAppMessage(
      accountSid,
      authToken,
      from,
      to,
      chunks[i],
    );
    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error || "unknown",
        sentChunks: i,
        totalChunks: chunks.length,
      };
    }
  }
  return { success: true, totalChunks: chunks.length };
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/%/g, "");
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePercentage(value: unknown): number | null {
  const raw = coerceNumber(value);
  if (raw == null) return null;
  if (raw > 0 && raw <= 1) return raw * 100;
  return raw;
}

function normalizeCategories(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

type NormalizedPocket = {
  name: string;
  percentage: number;
  categories: string[];
  color?: string;
  icon?: string;
};

function normalizePockets(input: unknown): NormalizedPocket[] {
  const rawList: any[] = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? Object.entries(input as Record<string, unknown>).map(
          ([name, percentage]) => ({
            name,
            percentage,
          }),
        )
      : [];

  const pockets: NormalizedPocket[] = [];
  for (const entry of rawList) {
    if (!entry || typeof entry !== "object") continue;
    const rawName = (entry as any).name ?? (entry as any).label ?? "";
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) continue;

    const rawPercent =
      (entry as any).percentage ??
      (entry as any).percent ??
      (entry as any).pct ??
      (entry as any).ratio;
    const percent = normalizePercentage(rawPercent);
    if (percent == null) continue;

    const clamped = Math.max(0, Math.min(100, percent));
    const categories = normalizeCategories((entry as any).categories);
    const colorRaw =
      (entry as any).color ?? (entry as any).hex ?? (entry as any).hex_color;
    const iconRaw = (entry as any).icon ?? (entry as any).symbol;
    const color =
      typeof colorRaw === "string" && colorRaw.trim().length > 0
        ? colorRaw.trim()
        : undefined;
    const icon =
      typeof iconRaw === "string" && iconRaw.trim().length > 0
        ? iconRaw.trim()
        : undefined;
    pockets.push({ name, percentage: clamped, categories, color, icon });
  }
  return pockets;
}

const BUDGET_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getPendingBudget(
  state: SessionState | null,
): PendingBudgetDraft | null {
  const draft = state?.moneko_state?.pending_budget;
  if (!draft || typeof draft !== "object") return null;
  if (
    typeof draft.amount !== "number" ||
    !Number.isFinite(draft.amount) ||
    draft.amount <= 0
  ) {
    return null;
  }
  if (!draft.currency || typeof draft.currency !== "string") return null;
  if (!draft.period_month || typeof draft.period_month !== "string") {
    return null;
  }
  if (draft.created_at) {
    const ts = Date.parse(draft.created_at);
    if (!Number.isNaN(ts)) {
      const ageMs = Date.now() - ts;
      if (ageMs > BUDGET_DRAFT_MAX_AGE_MS) return null;
    }
  }
  return draft;
}

function setPendingBudget(
  state: SessionState | null,
  draft: PendingBudgetDraft,
): SessionState {
  const base = normalizeSessionState(state);
  return {
    ...base,
    moneko_state: {
      ...(base.moneko_state || {}),
      pending_budget: draft,
    },
  };
}

function clearPendingBudget(state: SessionState | null): SessionState {
  const base = normalizeSessionState(state);
  if (!base.moneko_state?.pending_budget) return base;
  const { pending_budget: _pending, ...rest } = base.moneko_state;
  if (Object.keys(rest).length === 0) {
    const { moneko_state: _state, ...withoutState } = base;
    return withoutState;
  }
  return { ...base, moneko_state: rest };
}

async function resolveBudgetForScope(
  supabase: SupabaseJsClient,
  userId: string,
  householdId: string | null,
  period_month: string,
  currency: string,
  _isPortfolio: boolean,
) {
  const budgetMonth = `${period_month.slice(0, 7)}-01`;
  let query = supabase
    .from("budgets")
    .select("id, total_budget_cents, currency, period_month")
    .eq("currency", currency)
    .eq("period_month", budgetMonth)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (householdId) {
    query = query.eq("household_id", householdId);
  } else {
    query = query.eq("user_id", userId).is("household_id", null);
  }

  return query.maybeSingle();
}

async function resolveEnvelopeByName(
  supabase: SupabaseJsClient,
  budgetId: string,
  name: string,
) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return { data: null, error: null } as const;
  const { data, error } = await supabase
    .from("budget_envelopes")
    .select("id, name, budget_percentage, budget_amount_cents")
    .eq("budget_id", budgetId);
  if (error || !data) return { data: null, error } as const;
  const found = (data as any[]).find(
    (row) =>
      typeof row?.name === "string" && row.name.toLowerCase() === normalized,
  );
  return { data: found ?? null, error: null } as const;
}

async function reportTwilioToolInvokeFailure(params: {
  toolName: string;
  targetFunction: string;
  formatted: string;
  error?: unknown;
  context?: Record<string, unknown>;
}) {
  await reportBotToolInvokeFailure({
    functionName: "twilio-whatsapp-ai-bot",
    ...params,
  });
}

function fingerprintSecret(secret: string): string {
  if (!secret) return "missing";
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    hash = ((hash << 5) - hash + secret.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

function decodeJwtPayloadMeta(token: string | null | undefined): {
  role: string | null;
  iss: string | null;
  projectRef: string | null;
} {
  const raw = (token || "").trim();
  if (!raw) return { role: null, iss: null, projectRef: null };
  let jwt = raw;
  if (
    (jwt.startsWith('"') && jwt.endsWith('"')) ||
    (jwt.startsWith("'") && jwt.endsWith("'"))
  ) {
    jwt = jwt.slice(1, -1).trim();
  }
  while (/^bearer\s+/i.test(jwt)) {
    jwt = jwt.replace(/^bearer\s+/i, "").trim();
  }
  const parts = jwt.split(".");
  if (parts.length < 2) return { role: null, iss: null, projectRef: null };
  try {
    const payloadSegment = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      payloadSegment + "=".repeat((4 - (payloadSegment.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    const iss = typeof payload?.iss === "string" ? payload.iss : null;
    const role = typeof payload?.role === "string" ? payload.role : null;
    let projectRef: string | null = null;
    if (iss) {
      const match = iss.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
      projectRef = match?.[1] || null;
    }
    return { role, iss, projectRef };
  } catch {
    return { role: null, iss: null, projectRef: null };
  }
}

function getTwilioMessageSid(formData: FormData): string | null {
  const candidates = ["MessageSid", "SmsMessageSid", "SmsSid"];
  for (const key of candidates) {
    const value = formData.get(key)?.toString();
    if (value) return value;
  }
  return null;
}

async function reserveTwilioIdempotency(
  supabase: SupabaseJsClient,
  key: string,
  ttlMinutes: number = IDEMPOTENCY_TTL_MINUTES,
): Promise<{ status: "new" | "duplicate"; result?: IdempotencyRecord | null }> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const result: IdempotencyRecord = { status: "processing" };

  const { error } = await supabase
    .from("idempotency_keys")
    .insert({ key, result, expires_at: expiresAt });

  if (!error) {
    return { status: "new" };
  }
  if (error.code === "23505") {
    const { data } = await supabase
      .from("idempotency_keys")
      .select("result")
      .eq("key", key)
      .maybeSingle();
    return {
      status: "duplicate",
      result: (data?.result as IdempotencyRecord) || null,
    };
  }
  console.error("[twilio-whatsapp-ai-bot] idempotency reserve error:", error);
  return { status: "new" };
}

async function updateTwilioIdempotency(
  supabase: SupabaseJsClient,
  key: string,
  result: IdempotencyRecord,
  ttlMinutes: number = IDEMPOTENCY_TTL_MINUTES,
) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("idempotency_keys")
    .update({ result, expires_at: expiresAt })
    .eq("key", key);
  if (error) {
    console.error("[twilio-whatsapp-ai-bot] idempotency update error:", error);
  }
}

type FinancialSnapshot = {
  totalExpense: number;
  totalIncome: number;
  net: number;
  startDate: string;
  endDate: string;
  categories: { category: string; amount_cents: number }[];
  budget_cents: number | null;
  chart_url?: string;
};

async function buildFinancialSnapshot(
  supabase: SupabaseJsClient,
  contactId: string,
  userId: string,
  currency: string,
  timezone?: string | null,
): Promise<FinancialSnapshot | { error: unknown }> {
  const endDate = formatDateInTimeZone(timezone);
  const startDate = await resolveFinancialPeriodStartForUser(
    supabase,
    userId,
    endDate,
  );

  // Expenses and incomes
  const { data: rows, error } = await supabase
    .from("expenses")
    .select(
      "amount_cents, type, category, date, currency, analytics_is_final, analytics_spending_multiplier, analytics_counts_toward_income",
    )
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("currency", currency)
    .eq("contact_id", contactId)
    .is("deleted_at", null);
  if (error) return { error };

  let totalExpense = 0;
  let totalIncome = 0;
  const catMap = new Map<string, number>();
  for (const r of rows || []) {
    if (r.analytics_is_final === false) continue;
    const absoluteAmount = Math.abs(Number(r.amount_cents) || 0);
    if (r.analytics_counts_toward_income === true) {
      totalIncome += absoluteAmount;
    }
    const amt = absoluteAmount * Number(r.analytics_spending_multiplier || 0);
    if (amt !== 0) {
      totalExpense += amt;
      const cat = (r.category || "other").toString().toLowerCase();
      catMap.set(cat, (catMap.get(cat) || 0) + amt);
    }
  }
  const catEntries = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const catLabels = catEntries.map(([c]) => c);
  const catData = catEntries.map(([, v]) => Math.round(v / 100));

  const { data: budgetRows } = await supabase
    .from("budgets")
    .select("total_budget_cents")
    .eq("user_id", userId)
    .eq("currency", currency)
    .eq("period_month", `${startDate.slice(0, 7)}-01`)
    .limit(1);
  const budgetCents = budgetRows?.[0]?.total_budget_cents || null;

  const chartConfig = {
    type: "radar",
    data: {
      labels: catLabels,
      datasets: [
        {
          label: "Spend",
          data: catData,
          backgroundColor: "rgba(75,192,192,0.3)",
          borderColor: "#4BC0C0",
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Top spending categories" },
      },
    },
  };
  const chartUrl = catData.length
    ? `https://quickchart.io/chart?c=${encodeURIComponent(
        JSON.stringify(chartConfig),
      )}`
    : undefined;

  return {
    totalExpense,
    totalIncome,
    net: totalIncome - totalExpense,
    startDate,
    endDate,
    categories: catEntries.map(([cat, v]) => ({
      category: cat,
      amount_cents: v,
    })),
    budget_cents: budgetCents,
    chart_url: chartUrl,
  };
}

// Twilio Signature Validation
async function validateTwilioRequest(
  req: Request,
  authToken: string,
): Promise<boolean> {
  const signatureHeader =
    req.headers.get("X-Twilio-Signature") ||
    req.headers.get("x-twilio-signature");
  if (!signatureHeader) return false;

  const url = Deno.env.get("TWILIO_WEBHOOK_URL") || req.url;
  const rawBody = await req.clone().text();
  const params = new URLSearchParams(rawBody);

  const keys = Array.from(params.keys()).sort();
  let concatenated = url;
  for (const k of keys) concatenated += k + (params.get(k) ?? "");

  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    enc.encode(concatenated),
  );
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const expected = btoa(binary);

  return expected === signatureHeader;
}

// --- Main Handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get(
    "TWILIO_MESSAGING_SERVICE_SID",
  );
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const WHATSAPP_DEBUG =
    (Deno.env.get("WHATSAPP_DEBUG") || "").toUpperCase() === "TRUE";
  const INTERNAL_FUNCTION_KEY = resolveInternalFunctionKey();
  const internalKeyMeta = resolveInternalFunctionKeyWithSource();
  const TWILIO_SKIP_SIGNATURE =
    (Deno.env.get("TWILIO_SKIP_SIGNATURE") || "").toLowerCase() === "true";

  const twilioAccountSid = TWILIO_ACCOUNT_SID || "";
  const twilioAuthToken = TWILIO_AUTH_TOKEN || "";
  let vertexConfig: ReturnType<typeof getVertexAiConfigFromEnv>;

  try {
    vertexConfig = getVertexAiConfigFromEnv();
  } catch (error) {
    console.error("[twilio-whatsapp-ai-bot] Vertex AI config error", error);
    await reportBotBackendError({
      functionName: "twilio-whatsapp-ai-bot",
      phase: "vertex_config",
      error,
    });
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !INTERNAL_FUNCTION_KEY) {
    console.error("Missing environment variables");
    await reportBotBackendError({
      functionName: "twilio-whatsapp-ai-bot",
      phase: "missing_environment",
      error: new Error("Missing required environment variables"),
      context: {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
        hasInternalFunctionKey: !!INTERNAL_FUNCTION_KEY,
      },
    });
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  if (WHATSAPP_DEBUG) {
    const secretSupabaseServiceRoleApiKey =
      Deno.env.get("SECRET_SUPABASE_SERVICE_ROLE_API_KEY") || "";
    const activeInvokeJwt =
      secretSupabaseServiceRoleApiKey || SUPABASE_SERVICE_ROLE_KEY || "";
    const serviceRoleMeta = decodeJwtPayloadMeta(activeInvokeJwt);
  }

  // 1. Determine channel and optionally validate Twilio signature
  const contentType = req.headers.get("content-type") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const isJsonApp = contentType.includes("application/json") && !!authHeader;

  // --- Supabase clients (used by both channels) ---
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const supabaseAuthed = SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      })
    : null;

  if (isJsonApp) {
    // App mode: expects JSON { session_id?, message?, attachments?: [{filename, contentType, data(base64)}] }
    let payload: any;
    try {
      payload = await req.json();
    } catch (e) {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!supabaseAuthed) {
      return jsonResponse({ error: "Auth client not configured" }, 500);
    }
    const { data: userData, error: userErr } =
      await supabaseAuthed.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // Resolve contact_id for this user (fallback to userId)
    const { data: contactRow } = await supabase
      .from("user_contacts")
      .select("id, preferred_currency, preferred_language, preferred_timezone")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const contactId = contactRow?.id || userId;
    const userCurrency = normalizePreferredCurrency(
      contactRow?.preferred_currency,
    );
    const userLang = resolvePreferredReplyLanguage(
      contactRow?.preferred_language,
      contactRow?.preferred_currency,
    );
    const userLangLabel = getReplyLanguagePromptLabel(userLang);
    const userTimezone = contactRow?.preferred_timezone || "UTC";

    const {
      categoryPreferences,
      categoryRemaps,
      allowedExpenseCategories,
      allowedIncomeCategories,
      categoryGuideForUser,
    } = await loadBotCategoryContext({ supabase, userId });

    const spaceMap = new Map<
      string,
      { id: string; name: string; isPortfolio: boolean }
    >();
    const seenPortfolioIds: Record<string, true> = {};
    const portfolioSpaceIds: string[] = [];
    try {
      const { data: ownedSpaces } = await supabase
        .from("households")
        .select("id, name, is_portfolio")
        .eq("owner_id", userId);
      for (const s of ownedSpaces || []) {
        const id = (s as any)?.id;
        const name =
          typeof (s as any)?.name === "string" ? (s as any).name : "";
        if (typeof id === "string" && name) {
          const record = {
            id,
            name,
            isPortfolio: (s as any)?.is_portfolio === true,
          };
          spaceMap.set(id, record);
          spaceMap.set(name.toLowerCase(), record);
        }
        if (
          (s as any)?.is_portfolio === true &&
          typeof id === "string" &&
          !seenPortfolioIds[id]
        ) {
          seenPortfolioIds[id] = true;
          portfolioSpaceIds.push(id);
        }
      }

      const { data: memberRows } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userId);
      const memberIds = (memberRows || [])
        .map((r: any) => r?.household_id)
        .filter((id: any) => typeof id === "string" && id.length > 0);
      if (memberIds.length) {
        const { data: memberSpaces } = await supabase
          .from("households")
          .select("id, name, is_portfolio")
          .in("id", memberIds);
        for (const s of memberSpaces || []) {
          const id = (s as any)?.id;
          const name =
            typeof (s as any)?.name === "string" ? (s as any).name : "";
          if (typeof id === "string" && name) {
            const record = {
              id,
              name,
              isPortfolio: (s as any)?.is_portfolio === true,
            };
            spaceMap.set(id, record);
            spaceMap.set(name.toLowerCase(), record);
          }
          if (
            (s as any)?.is_portfolio === true &&
            typeof id === "string" &&
            !seenPortfolioIds[id]
          ) {
            seenPortfolioIds[id] = true;
            portfolioSpaceIds.push(id);
          }
        }
      }
    } catch {
      // best-effort
    }

    let preferredSpaceId = await loadBotPreferredSpaceId({
      supabase,
      userId,
      contactId,
      spaceMap,
    });

    const resolveAppRequestedWalletId = async (
      walletName: unknown,
      householdId: string | null,
    ) => resolveWalletIdInScope(supabase, userId, householdId, walletName);

    const sessionId = payload.session_id || `app:${userId}`;
    const messageText = payload.message?.toString() || "";
    const attachments: any[] = Array.isArray(payload.attachments)
      ? payload.attachments
      : [];
    const debugNotes: string[] = [];

    // Ensure chat session
    let { data: session } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) {
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({ user_id: userId, session_id: sessionId, model: MODEL_NAME })
        .select()
        .single();
      if (sessionError || !newSession) {
        return jsonResponse(
          { error: "Failed to initialize chat session" },
          500,
        );
      }
      session = newSession;
    }

    if (!session) {
      return jsonResponse({ error: "Failed to initialize chat session" }, 500);
    }

    // Handle attachments: store to storage bucket "chat-attachments" (best-effort)
    const attachmentNotes: string[] = [];
    if (attachments.length) {
      const bucket = "chat-attachments";
      for (const att of attachments.slice(0, 5)) {
        if (!att?.data || !att?.filename) continue;
        try {
          const dataBytes = decodeBase64(att.data.toString());
          const path = `${userId}/${Date.now()}_${att.filename}`;
          const { data: upRes, error: upErr } = await supabase.storage
            .from(bucket)
            .upload(path, dataBytes, {
              contentType: att.contentType || "application/octet-stream",
              upsert: false,
            });
          if (upErr) {
            attachmentNotes.push(`Upload failed for ${att.filename}`);
            continue;
          }
          const { data: publicUrl } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);
          attachmentNotes.push(
            `Stored ${att.filename}: ${publicUrl.publicUrl}`,
          );
        } catch (e) {
          attachmentNotes.push(`Upload exception for ${att.filename}`);
        }
      }
    }

    // Build user content text
    const userMessageContent = [messageText, attachmentNotes.join("\n")]
      .filter(Boolean)
      .join("\n");

    // History
    const rawHistory = await loadGeminiChatHistory({
      supabase,
      sessionId: session.id,
    });

    // Persist the incoming user message AFTER loading history so Gemini doesn't see it twice.
    await insertChatMessage(
      supabase,
      session.id,
      "user",
      userMessageContent,
      debugNotes,
      WHATSAPP_DEBUG,
    );

    const appSystemInstruction =
      SYSTEM_INSTRUCTION.replace("{{DATE}}", formatDateInTimeZone(userTimezone))
        .replace("{{CURRENCY}}", userCurrency)
        .replace("{{HOUSEHOLDS}}", "None")
        .replace(
          "{{WALLETS}}",
          "Available on request for the selected space only",
        )
        .replace("{{CATEGORIES}}", categoryGuideForUser)
        .replace("{{LANGUAGE}}", userLangLabel) +
      buildLanguageOverride(userLang);
    const toolsApp = [
      {
        name: "analyze_expense",
        description:
          "Extract one or more transactions from text or an attached receipt/audio/file. Call this only if you need structured items.",
        parameters: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING" },
          },
        },
      },
      buildCreateCustomCategoryTool(),
      buildAddTransactionTool({ includeMerchant: true }),
      buildAddTransactionsBatchTool({ includeMerchant: true }),
      buildCreateSpaceTool(),
      buildCreateSpaceInviteTool(),
      buildGetSpaceInfoTool(),
      buildUpdateSpaceSettingsTool(),
      ...buildWalletTools(),
      buildUpdateTransactionTool({ includeMerchant: true }),
      buildDeleteTransactionTool(),
      buildListExpensesTool(),
      buildGenerateChartUrlTool(),
      buildSetDefaultSpaceTool(),
      buildFinancialInsightTool(),
    ];

    let activeChat = createVertexBotChatSession({
      modelName: MODEL_NAME,
      systemInstruction: appSystemInstruction,
      history: rawHistory as any,
      tools: [
        { function_declarations: cloneBotToolDeclarations(toolsApp) },
      ] as any,
      vertexConfig,
    });
    let response: any = null;
    let functionCalls: any[] = [];
    let finalResponseText = "";
    let mediaUrl: string | undefined;
    let lastToolResult: any = null;
    let lastToolCallName: string | null = null;
    let toolIterations = 0;

    try {
      const result = await sendGeminiMessageWithRetry(
        activeChat as any,
        userMessageContent,
        {
          preRequestDelayMs: GEMINI_PRE_REQUEST_DELAY_MS,
          maxRetries: GEMINI_MAX_RETRIES,
          logPrefix: "twilio-whatsapp-ai-bot",
          fallbackModelName: FALLBACK_MODEL_NAME,
          fallbackChatFactory: (modelName, history) => {
            return createVertexBotChatSession({
              modelName,
              systemInstruction: appSystemInstruction,
              history,
              tools: [
                { function_declarations: cloneBotToolDeclarations(toolsApp) },
              ] as any,
              vertexConfig,
            });
          },
          onChatSwitched: (chatSession) => {
            activeChat = chatSession as any;
          },
        },
      );
      response = await result.response;
      functionCalls = (response.functionCalls() as any[]) || [];
      finalResponseText = response.text();
    } catch (error) {
      console.error(
        "[twilio-whatsapp-ai-bot] Failed to get initial AI response:",
        error,
      );

      await reportVertexAiFailure({
        functionName: "twilio-whatsapp-ai-bot",
        error,
        phase: "initial_ai_response",
        modelName: MODEL_NAME,
        context: {
          message: messageText,
          hasAttachment: attachments.length > 0,
        },
      });

      if (WHATSAPP_DEBUG) {
        debugNotes.push(`initial-ai-error: ${String(error)}`);
      }
      finalResponseText = isRetryableGeminiError(error)
        ? buildGeminiHighDemandMessage(userLang)
        : buildProcessingFailureMessage(userLang);
    }

    while (functionCalls && functionCalls.length > 0 && toolIterations < 3) {
      const toolResponses: any[] = [];
      for (const call of functionCalls) {
        let toolResult = {};
        applyPreferredSpaceDefaultToToolCall(call, preferredSpaceId);
        try {
          if (call.name === "analyze_expense") {
            const text =
              typeof call.args?.text === "string" ? call.args.text.trim() : "";
            const hasMedia =
              !!call.args?.media && typeof call.args.media === "object";

            if (hasMedia) {
              toolResult = {
                error:
                  "Media analysis is not available in app mode. Provide text to analyze.",
              };
            } else if (!text) {
              toolResult = { error: "No text provided to analyze." };
            } else {
              toolResult = await runAnalyzeExpenseWithTimeout(
                {
                  userId,
                  text,
                  currency: userCurrency,
                  allowedExpenseCategories,
                  allowedIncomeCategories,
                  categoryPreferences,
                  categoryRemaps,
                },
                GEMINI_API_KEY,
                30000,
                "Analysis is taking longer than expected. Please try again.",
              );
            }
          } else if (call.name === "list_expenses") {
            const { data, error } = await fetchExpensesDirect(
              supabase,
              contactId,
              {
                limit: call.args.limit || 50,
                startDate: call.args.start_date,
                endDate: call.args.end_date,
                householdId:
                  call.args.space_id || call.args.household_id || null,
                portfolioHouseholdIds:
                  call.args.space_id || call.args.household_id
                    ? undefined
                    : portfolioSpaceIds,
                currency: call.args.currency || undefined,
                type: call.args.type || undefined,
              },
            );
            if (error) {
              toolResult = { error };
            } else {
              const memoryItems = (data || [])
                .map((row: any) => normalizeLastListedTransactionFromRow(row))
                .filter(Boolean) as LastListedTransaction[];

              let state = await loadSessionState(
                supabase,
                String(session.id),
                debugNotes,
                WHATSAPP_DEBUG,
              );
              state = setLastListedTransactions(state, memoryItems);
              await saveSessionState(
                supabase,
                String(session.id),
                state,
                debugNotes,
                WHATSAPP_DEBUG,
              );

              const normalized = normalizeExpensesForTool(
                data || [],
                userCurrency,
              );
              const chartUrl = buildCategoryChart(normalized);
              if (chartUrl) mediaUrl = chartUrl;
              const safeExpenses = memoryItems.slice(0, 25).map((item, i) => ({
                index: i + 1,
                amountMajor: item.amountMajor,
                currency: item.currency,
                date: item.date,
                category: item.category,
                description: item.description,
                type: item.type || "expense",
              }));
              toolResult = {
                expenses: safeExpenses,
                chart_url: chartUrl,
                has_selection_memory: true,
              };
            }
          } else if (call.name === "create_space") {
            toolResult = await createBotSpace({
              supabase,
              userId,
              args: call.args || {},
              defaultCurrency: userCurrency,
            });
            upsertBotSpaceMetaFromToolResult(toolResult, spaceMap);
          } else if (call.name === "set_default_space") {
            const preferenceResult = await setBotPreferredSpace({
              supabase,
              userId,
              contactId,
              args: call.args || {},
              spaceMap,
            });
            toolResult = preferenceResult.result;
            if ((toolResult as any)?.success) {
              preferredSpaceId =
                ((toolResult as any).preferred_space_id as string | null) ||
                null;
            }
          } else if (call.name === "create_space_invite") {
            toolResult = await createBotSpaceInvite({
              supabase,
              userId,
              args: call.args || {},
              spaceMap,
            });
          } else if (call.name === "get_space_info") {
            toolResult = await getBotSpaceInfo({
              supabase,
              userId,
              args: call.args || {},
              spaceMap,
            });
          } else if (call.name === "update_space_settings") {
            toolResult = await updateBotSpaceSettings({
              supabase,
              userId,
              args: call.args || {},
              spaceMap,
            });
            upsertBotSpaceMetaFromToolResult(toolResult, spaceMap);
          } else if (call.name === "update_transaction") {
            const updatesArgs =
              call.args?.updates &&
              typeof call.args.updates === "object" &&
              !Array.isArray(call.args.updates)
                ? call.args.updates
                : null;
            if (!updatesArgs) {
              toolResult = { error: "updates is required" };
            } else {
              let state = await loadSessionState(
                supabase,
                String(session.id),
                debugNotes,
                WHATSAPP_DEBUG,
              );
              const lastRead = readLastListedTransactions(state);
              if (!lastRead.items && lastRead.expired) {
                state = clearLastListedTransactions(state);
                await saveSessionState(
                  supabase,
                  String(session.id),
                  state,
                  debugNotes,
                  WHATSAPP_DEBUG,
                );
              }

              const items = lastRead.items || [];
              const resolved = resolveLastListedSelection(items, call.args);
              if ("needs_disambiguation" in resolved) {
                toolResult = resolved;
              } else if ("error" in resolved) {
                toolResult = { error: resolved.error };
              } else {
                const updates: Record<string, unknown> = {};
                if (updatesArgs.amount != null) {
                  const amount = Number(updatesArgs.amount);
                  if (Number.isFinite(amount)) {
                    updates.amount_cents = Math.round(amount * 100);
                  }
                }
                if (updatesArgs.category != null) {
                  updates.category = updatesArgs.category;
                }
                if (updatesArgs.description != null) {
                  updates.raw_text = updatesArgs.description;
                }
                if (updatesArgs.currency != null) {
                  updates.currency = updatesArgs.currency;
                }
                if (updatesArgs.date != null) {
                  updates.date = normalizeDateInput(
                    updatesArgs.date,
                    formatDateInTimeZone(userTimezone),
                  );
                }
                if (updatesArgs.source != null) {
                  updates.source = updatesArgs.source;
                }

                const updateRequestBody: Record<string, unknown> = {
                  userId,
                  expenseId: resolved.candidate.id,
                  updates,
                };
                const hasScopeUpdate =
                  Object.prototype.hasOwnProperty.call(
                    updatesArgs,
                    "household_id",
                  ) ||
                  Object.prototype.hasOwnProperty.call(
                    updatesArgs,
                    "household_name",
                  ) ||
                  Object.prototype.hasOwnProperty.call(
                    updatesArgs,
                    "householdName",
                  );
                const scopeResult = hasScopeUpdate
                  ? resolveBotSpaceScope(updatesArgs, spaceMap)
                  : {
                      householdId: resolved.candidate.household_id || null,
                      spaceMeta: undefined,
                    };
                if (hasScopeUpdate) {
                  updates.household_id = scopeResult.householdId;
                  updateRequestBody.householdId = scopeResult.householdId;
                }

                if (
                  (updatesArgs as any).wallet_id !== undefined ||
                  (updatesArgs as any).account_id !== undefined ||
                  (updatesArgs as any).wallet_name !== undefined
                ) {
                  const walletResolution =
                    await resolveWalletForTransactionToolCall(
                      supabase,
                      userId,
                      scopeResult.householdId,
                      updatesArgs as Record<string, unknown>,
                      "twilio-whatsapp-ai-bot",
                    );
                  if (walletResolution.error) {
                    toolResult = { error: walletResolution.error };
                  } else {
                    updates.account_id = walletResolution.accountId || null;
                    const currencyResult = resolveWalletTransactionCurrency({
                      wallet: walletResolution,
                      walletName:
                        (updatesArgs as any).wallet_name ||
                        (updatesArgs as any).wallet_id ||
                        (updatesArgs as any).account_id,
                      transactionCurrency:
                        updates.currency || resolved.candidate.currency,
                      fallbackCurrency: userCurrency,
                      hasExplicitCurrency: hasExplicitTransactionCurrency(
                        updatesArgs as Record<string, unknown>,
                      ),
                    });
                    if (currencyResult.error || !currencyResult.currency) {
                      toolResult = { error: currencyResult.error };
                    } else if (walletResolution.accountId) {
                      updates.currency = currencyResult.currency;
                    }
                  }
                }

                const targetHouseholdId = scopeResult.householdId;
                if (
                  !(toolResult as any)?.error &&
                  targetHouseholdId &&
                  ((updatesArgs as any).payer_name !== undefined ||
                    (updatesArgs as any).paid_by !== undefined ||
                    Array.isArray((updatesArgs as any).member_splits))
                ) {
                  const splitConfig = await resolveHouseholdSplitConfig(
                    supabase,
                    targetHouseholdId,
                    userId,
                    typeof updatesArgs.amount === "number"
                      ? Number(updatesArgs.amount)
                      : resolved.candidate.amountMajor || 0,
                    updatesArgs,
                  );
                  if (splitConfig.payerUserId) {
                    updates.payer_user_id = splitConfig.payerUserId;
                    updateRequestBody.payerUserId = splitConfig.payerUserId;
                  }
                  if (splitConfig.customSplits) {
                    const isScopeMove =
                      targetHouseholdId !==
                      (resolved.candidate.household_id || null);
                    if (isScopeMove) {
                      updateRequestBody.customSplits = splitConfig.customSplits;
                      updateRequestBody.householdId = targetHouseholdId;
                    } else {
                      updateRequestBody.splitUpdate = splitConfig.customSplits;
                    }
                  }
                }
                if (updatesArgs.is_recurring === true) {
                  updates.is_recurring = true;
                  updates.recurrence_rule = buildRecurrenceRule(
                    updatesArgs,
                    typeof updates.date === "string"
                      ? updates.date
                      : resolved.candidate.date ||
                          formatDateInTimeZone(userTimezone),
                  ) || {
                    frequency: "monthly",
                    interval: 1,
                    anchor_date:
                      typeof updates.date === "string"
                        ? updates.date
                        : resolved.candidate.date ||
                          formatDateInTimeZone(userTimezone),
                  };
                } else if (updatesArgs.is_recurring === false) {
                  updates.is_recurring = false;
                  updates.recurrence_rule = null;
                } else if (updatesArgs.recurrence_rule) {
                  updates.is_recurring = true;
                  updates.recurrence_rule = updatesArgs.recurrence_rule;
                }

                if (
                  !(toolResult as any)?.error &&
                  Object.keys(updates).length === 0 &&
                  !(updateRequestBody as any).customSplits &&
                  !(updateRequestBody as any).splitUpdate &&
                  !(updateRequestBody as any).payerUserId
                ) {
                  toolResult = { error: "No updates provided" };
                } else if (!(toolResult as any)?.error) {
                  const candidateSummary = [
                    resolved.candidate.date,
                    `${resolved.candidate.amountMajor || 0} ${
                      resolved.candidate.currency || ""
                    }`.trim(),
                    resolved.candidate.category,
                    resolved.candidate.description,
                  ]
                    .filter((v) => String(v || "").trim().length > 0)
                    .join(" | ")
                    .slice(0, 180);

                  if (!INTERNAL_FUNCTION_KEY) {
                    console.error(
                      "[twilio-whatsapp-ai-bot] update-expense invoke skipped: missing internal key",
                      {
                        updatesKeys: Object.keys(updates),
                        candidateSummary,
                      },
                    );
                    toolResult = { error: "Internal key not configured" };
                  } else {
                    const { data, error } = await supabase.functions.invoke(
                      "update-expense",
                      {
                        body: updateRequestBody,
                        headers: buildInternalInvokeHeaders(
                          INTERNAL_FUNCTION_KEY,
                        ),
                      },
                    );
                    const success = !error && data?.success === true;

                    if (success) {
                      toolResult = { success: true };
                    } else {
                      const status = (error as any)?.status;
                      const formattedBase = error
                        ? formatInvokeError(error)
                        : typeof (data as any)?.error === "string"
                          ? (data as any).error
                          : "Failed to update transaction";
                      const code = (data as any)?.code;
                      const formatted = code
                        ? `${formattedBase} (code: ${code})`
                        : formattedBase;

                      console.error(
                        "[twilio-whatsapp-ai-bot] update-expense invoke failed",
                        {
                          status,
                          formatted,
                          hasData: !!data,
                          code: (data as any)?.code,
                          message: (data as any)?.error,
                          updatesKeys: Object.keys(updates),
                          candidateSummary,
                        },
                      );
                      if (WHATSAPP_DEBUG && Array.isArray(debugNotes)) {
                        debugNotes.push(
                          `update_transaction update-expense failed: ${formattedBase} (status: ${
                            status ?? "unknown"
                          }, code: ${code ?? "none"})`,
                        );
                      }
                      toolResult = { error: formatted };
                    }
                  }
                }
              }
            }
          } else if (call.name === "delete_transaction") {
            let state = await loadSessionState(
              supabase,
              String(session.id),
              debugNotes,
              WHATSAPP_DEBUG,
            );
            const lastRead = readLastListedTransactions(state);
            if (!lastRead.items && lastRead.expired) {
              state = clearLastListedTransactions(state);
              await saveSessionState(
                supabase,
                String(session.id),
                state,
                debugNotes,
                WHATSAPP_DEBUG,
              );
            }

            const items = lastRead.items || [];
            const resolved = resolveLastListedSelection(items, call.args);
            if ("needs_disambiguation" in resolved) {
              toolResult = resolved;
            } else if ("error" in resolved) {
              toolResult = { error: resolved.error };
            } else {
              const deleteResult = await invokeTransactionDelete(
                supabase,
                INTERNAL_FUNCTION_KEY,
                userId,
                resolved.candidate.id,
              );
              toolResult = deleteResult.success
                ? { success: true }
                : {
                    error: deleteResult.formatted,
                  };
            }
          } else if (call.name === "create_custom_category") {
            const transactionType =
              String(call.args?.transaction_type || "expense").toLowerCase() ===
              "income"
                ? "income"
                : "expense";
            try {
              const created = await upsertUserCustomCategory({
                supabase,
                userId,
                categoryName: String(call.args?.name || ""),
                transactionType,
                colorArgb: Number.isFinite(Number(call.args?.color_argb))
                  ? Number(call.args?.color_argb)
                  : null,
                iconKey:
                  typeof call.args?.icon_key === "string"
                    ? call.args.icon_key
                    : null,
              });
              const targetList =
                transactionType === "income"
                  ? allowedIncomeCategories
                  : allowedExpenseCategories;
              if (!targetList.includes(created.name)) {
                targetList.push(created.name);
                targetList.sort();
              }
              toolResult = {
                success: true,
                category: created.name,
                transaction_type: created.transactionType,
              };
            } catch (error) {
              toolResult = { error: formatInvokeError(error) };
            }
          } else if (call.name === "add_transaction") {
            let householdId = (call.args.space_id ||
              call.args.household_id ||
              null) as string | null;
            const householdName = (
              call.args.space_name ||
              call.args.household_name ||
              ""
            )
              .toString()
              .toLowerCase();
            if (!householdId && householdName) {
              const matchingSpace = Array.from(spaceMap.values()).find(
                (space) => space.name.toLowerCase() === householdName,
              );
              householdId = matchingSpace?.id ?? null;
            }
            const spaceMeta = householdId
              ? spaceMap.get(householdId)
              : undefined;
            const transactionResult = normalizeTransactionToolArgs(call.args, {
              date: call.args.date || formatDateInTimeZone(userTimezone),
              currency: userCurrency,
              currencyEvidenceText: userMessageContent,
            });
            if (!transactionResult.ok) {
              toolResult = { error: transactionResult.error };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }
            const transaction = transactionResult.transaction;
            const canUseHouseholdSplits =
              !!householdId && spaceMeta?.isPortfolio !== true;
            const splitConfig = canUseHouseholdSplits
              ? await resolveHouseholdSplitConfig(
                  supabase,
                  householdId!,
                  userId,
                  transaction.amount,
                  call.args,
                )
              : {};
            const requestedWallet = await resolveWalletForTransactionToolCall(
              supabase,
              userId,
              householdId,
              call.args,
              "twilio-whatsapp-ai-bot",
            );
            if (requestedWallet.error) {
              toolResult = { error: requestedWallet.error };
              continue;
            }
            const currencyResult = resolveWalletTransactionCurrency({
              wallet: requestedWallet,
              walletName: call.args.wallet_name,
              transactionCurrency: transaction.currency,
              fallbackCurrency: userCurrency,
              hasExplicitCurrency: hasExplicitTransactionCurrency(call.args),
            });
            if (currencyResult.error || !currencyResult.currency) {
              toolResult = { error: currencyResult.error };
              continue;
            }
            console.log(
              "[twilio-whatsapp-ai-bot] add_transaction: invoking save",
              {
                type: transaction.type,
                amount: transaction.amount,
                category: transaction.category,
                currency: currencyResult.currency,
                householdId,
                isPortfolio:
                  spaceMeta?.isPortfolio ??
                  (call.args.space_type === "private_space" ||
                    call.args.is_portfolio === true),
              },
            );
            const { data, error } = await invokeTransactionSave(
              supabase,
              INTERNAL_FUNCTION_KEY,
              userId,
              {
                type: transaction.type,
                amount: transaction.amount,
                category: transaction.category,
                date: transaction.date!,
                currency: currencyResult.currency,
                description: transaction.description,
                merchant: transaction.merchant,
                householdId,
                isPortfolio:
                  spaceMeta?.isPortfolio ??
                  (call.args.space_type === "private_space" ||
                    call.args.is_portfolio === true),
                accountId: requestedWallet.accountId ?? undefined,
                payerUserId: splitConfig.payerUserId,
                customSplits: splitConfig.customSplits,
                isRecurring: call.args.is_recurring === true,
                recurrence_rule:
                  call.args.is_recurring === true
                    ? buildRecurrenceRule(call.args, transaction.date!) || {
                        frequency: "monthly",
                        interval: 1,
                        anchor_date: transaction.date!,
                      }
                    : undefined,
                source: call.args.source,
                ownerType: call.args.owner_type,
                privacyScope: call.args.privacy_scope,
              },
            );
            console.log(
              "[twilio-whatsapp-ai-bot] add_transaction: save result",
              {
                success: !error,
                hasData: !!data,
                error: error ? String(error) : null,
              },
            );
            toolResult = error ? { error } : { success: true, data };
          } else if (call.name === "add_transactions_batch") {
            // Batch save for multiple transactions
            const rawTransactions = Array.isArray(call.args.transactions)
              ? call.args.transactions
              : [];

            if (rawTransactions.length === 0) {
              toolResult = { error: "No transactions provided" };
            } else {
              let householdId = (call.args.space_id ||
                call.args.household_id ||
                null) as string | null;
              const householdName = (
                call.args.space_name ||
                call.args.household_name ||
                ""
              )
                .toString()
                .toLowerCase();
              if (!householdId && householdName) {
                const matchingSpace = Array.from(spaceMap.values()).find(
                  (space) => space.name.toLowerCase() === householdName,
                );
                householdId = matchingSpace?.id ?? null;
              }
              const spaceMeta = householdId
                ? spaceMap.get(householdId)
                : undefined;
              const isPortfolio =
                spaceMeta?.isPortfolio ??
                (call.args.space_type === "private_space" ||
                  call.args.is_portfolio === true);

              // Build transactions array for the batch endpoint
              const batchTransactions: any[] = [];
              const defaultDate = formatDateInTimeZone(userTimezone);

              for (const [index, tx] of rawTransactions.entries()) {
                const transactionResult = normalizeTransactionToolArgs(tx, {
                  date: tx.date || defaultDate,
                  currency: userCurrency,
                  currencyEvidenceText: userMessageContent,
                });
                if (!transactionResult.ok) {
                  toolResult = {
                    error: `Transaction ${
                      index + 1
                    }: ${transactionResult.error}`,
                  };
                  break;
                }
                const transaction = transactionResult.transaction;
                const requestedWallet =
                  await resolveWalletForTransactionToolCall(
                    supabase,
                    userId,
                    householdId,
                    tx,
                    "twilio-whatsapp-ai-bot",
                  );
                if (requestedWallet.error) {
                  toolResult = { error: requestedWallet.error };
                  break;
                }
                const currencyResult = resolveWalletTransactionCurrency({
                  wallet: requestedWallet,
                  walletName: tx.wallet_name,
                  transactionCurrency: transaction.currency,
                  fallbackCurrency: userCurrency,
                  hasExplicitCurrency: hasExplicitTransactionCurrency(tx),
                });
                if (currencyResult.error || !currencyResult.currency) {
                  toolResult = { error: currencyResult.error };
                  break;
                }

                // Resolve splits for shared-space transactions.
                let payerUserId: string | undefined;
                let customSplits: CustomSplits | undefined;

                if (householdId && !isPortfolio) {
                  const splitConfig = await resolveHouseholdSplitConfig(
                    supabase,
                    householdId,
                    userId,
                    transaction.amount,
                    tx,
                  );
                  payerUserId = splitConfig.payerUserId;
                  customSplits = splitConfig.customSplits;
                }

                batchTransactions.push({
                  type: transaction.type,
                  amount: transaction.amount,
                  category: transaction.category,
                  currency: currencyResult.currency,
                  accountId: requestedWallet.accountId ?? undefined,
                  date: transaction.date!,
                  description: transaction.description,
                  merchant: transaction.merchant,
                  source: tx.source,
                  ownerType: tx.owner_type || "me",
                  privacyScope: tx.privacy_scope || "full",
                  payerUserId,
                  customSplits,
                  isRecurring: tx.is_recurring === true,
                  recurrence_rule:
                    tx.is_recurring === true
                      ? tx.recurrence_rule || {
                          frequency: (tx.frequency || "monthly")
                            .toString()
                            .toLowerCase(),
                          interval: 1,
                          anchor_date: transaction.date!,
                        }
                      : undefined,
                });
              }

              if ((toolResult as any)?.error) {
                continue;
              }

              // Call save-transactions-batch via direct function invoke.
              const internalKey = INTERNAL_FUNCTION_KEY;

              const { data, error } = await supabase.functions.invoke(
                "save-transactions-batch",
                {
                  body: {
                    userId,
                    householdId,
                    isPortfolio,
                    transactions: batchTransactions,
                  },
                  headers: internalKey
                    ? buildInternalInvokeHeaders(internalKey)
                    : {},
                },
              );

              const success = !error && data?.success === true;
              if (success) {
                const summary = data?.summary || {};
                toolResult = {
                  success: true,
                  message: `Saved ${
                    summary.succeeded || batchTransactions.length
                  } of ${
                    summary.total || batchTransactions.length
                  } transactions`,
                  succeeded: summary.succeeded,
                  failed: summary.failed,
                };
              } else {
                toolResult = {
                  error:
                    formatInvokeError(error ?? data?.error) ||
                    "Failed to save transactions",
                };
              }
            }
          } else if (call.name === "list_wallets") {
            const { householdId } = resolveBotSpaceScope(call.args, spaceMap);
            toolResult = (
              await listBotWallets({
                supabase,
                internalFunctionKey: INTERNAL_FUNCTION_KEY,
                userId,
                householdId,
                includeArchived: call.args.include_archived === true,
              })
            ).result;
          } else if (call.name === "create_wallet") {
            const { householdId } = resolveBotSpaceScope(call.args, spaceMap);
            const walletResult = await createBotWalletFromToolCall({
              supabase,
              internalFunctionKey: INTERNAL_FUNCTION_KEY,
              userId,
              householdId,
              args: call.args,
            });
            toolResult = walletResult.result;
            if (walletResult.failure) {
              await reportTwilioToolInvokeFailure({
                toolName: "create_wallet",
                targetFunction: walletResult.failure.targetFunction,
                formatted: walletResult.failure.formatted,
                error: walletResult.failure.error,
                context: walletResult.failure.context,
              });
            }
          } else {
            toolResult = { error: "Tool not supported in app mode" };
          }
        } catch (e) {
          toolResult = { error: String(e) };
        }

        lastToolResult = toolResult;
        lastToolCallName = typeof call?.name === "string" ? call.name : null;
        toolResponses.push({
          functionResponse: { name: call.name, response: toolResult },
        });
      }
      try {
        const finalResult = await sendGeminiMessageWithRetry(
          activeChat as any,
          toolResponses,
          {
            preRequestDelayMs: GEMINI_PRE_REQUEST_DELAY_MS,
            maxRetries: GEMINI_MAX_RETRIES,
            logPrefix: "twilio-whatsapp-ai-bot",
            fallbackModelName: FALLBACK_MODEL_NAME,
            fallbackChatFactory: (modelName, history) => {
              return createVertexBotChatSession({
                modelName,
                systemInstruction: appSystemInstruction,
                history,
                tools: [
                  { function_declarations: cloneBotToolDeclarations(toolsApp) },
                ] as any,
                vertexConfig,
              });
            },
            onChatSwitched: (chatSession) => {
              activeChat = chatSession as any;
            },
          },
        );
        response = await finalResult.response;
        functionCalls = (response.functionCalls() as any[]) || [];
        const candidate = response.text();
        if (candidate && candidate.trim()) {
          finalResponseText = candidate;
        }
      } catch (error) {
        console.error(
          "[twilio-whatsapp-ai-bot] Failed to get final AI response:",
          error,
        );

        await reportVertexAiFailure({
          functionName: "twilio-whatsapp-ai-bot",
          error,
          phase: "final_ai_response",
          modelName: MODEL_NAME,
          context: {
            toolIterations,
            lastToolCalls: functionCalls?.length || 0,
          },
        });

        if (WHATSAPP_DEBUG) {
          debugNotes.push(`final-ai-error: ${String(error)}`);
        }
        finalResponseText = isRetryableGeminiError(error)
          ? buildGeminiHighDemandMessage(userLang)
          : buildProcessingFailureMessage(userLang);
        functionCalls = [];
      }
      toolIterations++;
    }

    if (
      (!finalResponseText || !finalResponseText.trim()) &&
      lastToolCallName === "update_transaction" &&
      typeof lastToolResult?.error === "string" &&
      lastToolResult.error.trim()
    ) {
      const errorSnippet = lastToolResult.error.trim().slice(0, 180);
      finalResponseText = `I couldn't update that transaction. ${errorSnippet}`;
    }

    await insertChatMessage(
      supabase,
      session.id,
      "assistant",
      finalResponseText,
      debugNotes,
      WHATSAPP_DEBUG,
    );

    return jsonResponse({ text: finalResponseText, mediaUrl });
  }

  // Twilio form-encoded webhooks (WhatsApp) should be validated when signature is present
  const isFormUrlEncoded = contentType.includes(
    "application/x-www-form-urlencoded",
  );
  const hasTwilioSignature = !!(
    req.headers.get("X-Twilio-Signature") ||
    req.headers.get("x-twilio-signature")
  );

  if (
    !TWILIO_SKIP_SIGNATURE &&
    TWILIO_AUTH_TOKEN &&
    isFormUrlEncoded &&
    hasTwilioSignature
  ) {
    const isValid = await validateTwilioRequest(req, TWILIO_AUTH_TOKEN);
    if (!isValid) {
      console.error(
        "[twilio-whatsapp-ai-bot] Invalid Twilio signature. Check TWILIO_WEBHOOK_URL configuration.",
        {
          requestUrl: req.url,
          configuredWebhookUrl: Deno.env.get("TWILIO_WEBHOOK_URL") || "unset",
        },
      );
      return jsonResponse({ error: "Invalid signature" }, 403);
    }
  }

  // Safe to consume body after optional validation
  const formData = await req.formData();
  const from = formData.get("From")?.toString().replace("whatsapp:", "") || "";
  const body = formData.get("Body")?.toString() || "";
  const numMedia = Number(formData.get("NumMedia")?.toString() || "0") || 0;
  const to = formData.get("To")?.toString() || ""; // Our number

  // Basic visibility log so we can confirm WhatsApp webhooks are hitting this function
  console.log("[twilio-whatsapp-ai-bot] Incoming WhatsApp webhook", {
    from,
    to,
    hasBody: !!body,
    numMedia,
  });

  if (!from) return jsonResponse({ error: "Missing 'From' number" }, 400);

  const messageSid = getTwilioMessageSid(formData);
  const idempotencyKey = messageSid ? `twilio_whatsapp:${messageSid}` : null;
  const shouldAckEarly = numMedia > 0;

  if (idempotencyKey) {
    const reserve = await reserveTwilioIdempotency(supabase, idempotencyKey);
    if (reserve.status === "duplicate") {
      const existing = reserve.result;
      if (existing?.status === "failed") {
        await updateTwilioIdempotency(supabase, idempotencyKey, {
          status: "processing",
        });
      } else {
        if (existing?.status === "processing") {
          await sendTwilioWhatsAppTypingIndicator(
            twilioAccountSid,
            twilioAuthToken,
            messageSid,
          );
          return xmlResponse(buildTwimlMessage(null));
        }
        return xmlResponse(buildTwimlMessage(null));
      }
    }
  }

  const trimmedBody = body.trim();
  if (!trimmedBody && numMedia === 0) {
    if (idempotencyKey) {
      await updateTwilioIdempotency(supabase, idempotencyKey, {
        status: "done",
        delivery: "twiml",
        response_text: "empty_payload",
      });
    }
    return xmlResponse(buildTwimlMessage(null));
  }

  await sendTwilioWhatsAppTypingIndicator(
    twilioAccountSid,
    twilioAuthToken,
    messageSid,
  );

  const whatsappSessionId = `whatsapp:${from}`;
  const debugNotes: string[] = [];
  debugLog(WHATSAPP_DEBUG, "incoming form data", {
    from,
    to,
    body,
    numMedia,
    whatsappSessionId,
  });

  // 2. Fetch all user context in a single optimized call
  const { data: contextDataRaw, error: contextError } = await supabase
    .rpc("get_whatsapp_context", { p_phone_e164: from })
    .maybeSingle();

  const contextData: any = contextDataRaw as any;

  debugLog(WHATSAPP_DEBUG, "context lookup", { contextData, contextError });

  // Map the context data to maintain backward compatibility
  let contact = contextData
    ? {
        id: contextData.contact_id,
        user_id: contextData.user_id,
        verified: contextData.verified,
        preferred_currency: contextData.preferred_currency,
        preferred_language: contextData.preferred_language,
        preferred_timezone: contextData.preferred_timezone,
      }
    : null;
  let contactError = contextError;

  // Self-heal: if a user was previously verified (whatsapp_verifications) but their
  // phone-bound user_contacts row is missing, recreate/merge it so WhatsApp doesn't
  // incorrectly fall back to the verification prompt.
  if (!contact && !contactError) {
    try {
      const { data: verifiedRow, error: verifiedRowError } = await supabase
        .from("whatsapp_verifications")
        .select("user_id")
        .eq("channel", "whatsapp")
        .eq("subject", from)
        .eq("verified", true)
        .not("user_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!verifiedRowError && verifiedRow?.user_id) {
        const verifiedUserId = String(verifiedRow.user_id);
        const nowIso = new Date().toISOString();

        const { data: phoneContact } = await supabase
          .from("user_contacts")
          .select("id, user_id, telegram_chat_id")
          .eq("phone_e164", from)
          .maybeSingle();

        const { data: userContact } = await supabase
          .from("user_contacts")
          .select("id, phone_e164, telegram_chat_id")
          .eq("user_id", verifiedUserId)
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (phoneContact?.id) {
          const shouldMergeUserContact = Boolean(
            userContact?.id && userContact.id !== phoneContact.id,
          );
          // Allow rebind: attach this phone to the verified user.
          await supabase
            .from("user_contacts")
            .update({
              ...(shouldMergeUserContact ? {} : { user_id: verifiedUserId }),
              verified: true,
              whatsapp_user_id: from,
              updated_at: nowIso,
            })
            .eq("id", phoneContact.id);

          if (shouldMergeUserContact && userContact?.id) {
            await supabase.rpc("merge_user_contacts", {
              p_primary_contact_id: phoneContact.id,
              p_secondary_contact_id: userContact.id,
            });
          }
        } else if (userContact?.id) {
          await supabase
            .from("user_contacts")
            .update({
              phone_e164: from,
              whatsapp_user_id: from,
              verified: true,
              updated_at: nowIso,
            })
            .eq("id", userContact.id);
        } else {
          await supabase.from("user_contacts").upsert(
            {
              phone_e164: from,
              whatsapp_user_id: from,
              user_id: verifiedUserId,
              verified: true,
              updated_at: nowIso,
            },
            { onConflict: "user_id" },
          );
        }

        // Re-fetch context after repair.
        const { data: repairedRaw, error: repairedError } = await supabase
          .rpc("get_whatsapp_context", { p_phone_e164: from })
          .maybeSingle();
        const repaired: any = repairedRaw as any;
        if (!repairedError && repaired) {
          contact = {
            id: repaired.contact_id,
            user_id: repaired.user_id,
            verified: repaired.verified,
            preferred_currency: repaired.preferred_currency,
            preferred_language: repaired.preferred_language,
            preferred_timezone: repaired.preferred_timezone,
          };
          contactError = null;
        }
      }
    } catch (e) {
      console.error("[twilio-whatsapp-ai-bot] self-heal failed", e);
    }
  }

  // Handle "Start Verification" command (Unauthenticated flow)
  if (body.trim().toLowerCase() === "start verification") {
    // Generate OTP.
    // 6-digit codes can theoretically collide at scale; we do a small best-effort
    // check against currently-active, unverified codes to reduce collision odds.
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    let code = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = Math.floor(100000 + Math.random() * 900000).toString();
      const { data: existing, error: existingError } = await supabase
        .from("whatsapp_verifications")
        .select("id")
        .eq("channel", "whatsapp")
        .eq("verification_code", candidate)
        .eq("verified", false)
        .gt("expires_at", nowIso)
        .limit(1);

      if (!existingError && (!existing || existing.length === 0)) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }

    await supabase
      .from("whatsapp_verifications")
      .delete()
      .eq("channel", "whatsapp")
      .eq("subject", from)
      .eq("verified", false);
    await supabase.from("whatsapp_verifications").insert({
      channel: "whatsapp",
      subject: from,
      phone_e164: from,
      verification_code: code,
      expires_at: expiresAt.toISOString(),
    });

    await sendWhatsAppTemplate(
      twilioAccountSid,
      twilioAuthToken,
      to,
      from,
      TWILIO_TEMPLATES.VERIFICATION_CODE,
      JSON.stringify({ "1": code, CODE: code }),
      TWILIO_MESSAGING_SERVICE_SID || undefined,
    );

    if (idempotencyKey) {
      await updateTwilioIdempotency(supabase, idempotencyKey, {
        status: "done",
        delivery: "template",
        response_text: "verification_code",
      });
    }
    return xmlResponse(buildTwimlMessage(null));
  }

  if (!contact || !contact.verified || !contact.user_id) {
    // Not verified: Send prompt template, fallback to TwiML if it fails
    const templateResult = await sendWhatsAppTemplate(
      twilioAccountSid,
      twilioAuthToken,
      to,
      from,
      TWILIO_TEMPLATES.VERIFICATION_PROMPT,
      undefined,
      TWILIO_MESSAGING_SERVICE_SID || undefined,
    );
    if (!templateResult.success) {
      console.error(
        "[twilio-whatsapp-ai-bot] verification template failed",
        templateResult.error,
      );
      if (idempotencyKey) {
        await updateTwilioIdempotency(supabase, idempotencyKey, {
          status: "done",
          delivery: "twiml",
          response_text: "verification_prompt_fallback",
        });
      }
      return xmlResponse(buildTwimlMessage(buildVerificationPrompt()));
    }
    if (idempotencyKey) {
      await updateTwilioIdempotency(supabase, idempotencyKey, {
        status: "done",
        delivery: "template",
        response_text: "verification_prompt",
      });
    }
    return xmlResponse(buildTwimlMessage(null));
  }

  // Use subscription data from context
  const subscription = contextData
    ? {
        plan: contextData.subscription_plan,
        status: contextData.subscription_status,
        currentPeriodEnd: contextData.subscription_current_period_end ?? null,
      }
    : null;
  debugLog(WHATSAPP_DEBUG, "subscription", { subscription });

  if (!hasPlusEntitlement(subscription)) {
    const subscriptionRequiredMessage =
      buildSubscriptionRequiredMessage("WhatsApp capture");
    await sendWhatsAppMessage(
      twilioAccountSid,
      twilioAuthToken,
      to,
      from,
      subscriptionRequiredMessage,
    );
    if (idempotencyKey) {
      await updateTwilioIdempotency(supabase, idempotencyKey, {
        status: "done",
        delivery: "api",
        response_text: "subscription_required",
      });
    }
    return xmlResponse(buildTwimlMessage(null));
  }

  const userId = contact.user_id;
  let userCurrency = normalizePreferredCurrency(contact.preferred_currency);
  const userLang = resolvePreferredReplyLanguage(
    contact.preferred_language,
    contact.preferred_currency,
  );
  const userLangLabel = getReplyLanguagePromptLabel(userLang);
  const userTimezone = contact.preferred_timezone || "UTC";
  const contactId = contact.id;

  userCurrency = await loadLatestUserPreferredCurrency({
    supabase,
    userId,
    fallbackCurrency: userCurrency,
    onError: (error) =>
      debugLog(WHATSAPP_DEBUG, "preferred currency refresh failed", { error }),
  });

  const {
    categoryPreferences,
    categoryRemaps,
    allowedExpenseCategories,
    allowedIncomeCategories,
    categoryGuideForUser,
  } = await loadBotCategoryContext({ supabase, userId });

  // 3. Session Management - use session from context or create new
  let session = contextData?.chat_session_id
    ? { id: contextData.chat_session_id }
    : null;
  debugLog(WHATSAPP_DEBUG, "session from context", { session });

  if (!session) {
    const { data: newSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: userId,
        session_id: whatsappSessionId,
        model: MODEL_NAME,
        channel: "whatsapp",
      })
      .select()
      .single();

    if (sessionError || !newSession) {
      console.error("Failed to create chat session:", sessionError);
      return jsonResponse({ error: "Failed to initialize chat session" }, 500);
    }
    session = newSession;
  }

  const sessionId = session?.id;
  if (!sessionId) {
    console.error("Session ID is missing");
    return jsonResponse({ error: "Failed to get session ID" }, 500);
  }
  debugLog(WHATSAPP_DEBUG, "session ready", { sessionId });

  const computeTwilioResponse = async () => {
    // 4. Handle Input (Text vs Image)
    let userMessageContent = body;
    const caption = (body || "").trim();
    // Text-only messages: always pass raw caption to Gemini and let it decide.
    if (numMedia === 0) {
      userMessageContent = caption;
    }

    // If Image is present
    if (numMedia > 0) {
      console.log("[twilio-whatsapp-ai-bot] Media message detected", {
        from,
        numMedia,
      });
      const mediaUrl = formData.get("MediaUrl0")?.toString();
      const mediaType = formData.get("MediaContentType0")?.toString();

      if (mediaUrl && /^image\//i.test(mediaType || "")) {
        userMessageContent = `[User sent an image receipt.${
          caption ? ` Caption: "${caption}".` : ""
        } If you need to extract transactions, call analyze_expense with media { kind: "image", index: 0 }.]`;
      } else if (mediaUrl && /^audio\//i.test(mediaType || "")) {
        userMessageContent = `[User sent an audio message.${
          caption ? ` Caption: "${caption}".` : ""
        } If you need to extract transactions, call analyze_expense with media { kind: "audio", index: 0 }.]`;
      } else if (mediaUrl) {
        userMessageContent = `[User sent a file attachment.${
          caption ? ` Caption: "${caption}".` : ""
        } If you need to extract transactions, call analyze_expense with media { kind: "file", index: 0 }.]`;
      }
    }

    // 5. Prepare Context & History - use spaces from context
    const spaces = contextData?.spaces || contextData?.households || [];
    debugLog(WHATSAPP_DEBUG, "spaces", { spaces });

    const portfolioSpaceIds = (spaces || [])
      .filter((h: any) => !!h?.is_portfolio)
      .map((h: any) => h?.household_id)
      .filter((value: any) => typeof value === "string" && value.length > 0);

    const householdContext =
      spaces
        ?.map(
          (h: any) =>
            `${h.name || "Space"}${
              h.is_portfolio ? " (private space)" : " (shared space)"
            }`,
        )
        .join("; ") || "None";

    const spaceMap = new Map<
      string,
      { id: string; name: string; isPortfolio: boolean }
    >();
    spaces?.forEach((h: any) => {
      if (!h?.household_id) return;
      const record = {
        id: h.household_id,
        name: h.name || h.household_id,
        isPortfolio: !!h.is_portfolio,
      };
      spaceMap.set(h.household_id, record);
      if (record.name) {
        spaceMap.set(record.name.toLowerCase(), record);
      }
    });

    let preferredSpaceId = await loadBotPreferredSpaceId({
      supabase,
      userId,
      contactId,
      spaceMap,
    });

    const resolveRequestedAccountId = async (
      walletName: unknown,
      householdId: string | null,
    ) => resolveWalletIdInScope(supabase, userId, householdId, walletName);

    let sessionState = await loadSessionState(
      supabase,
      sessionId,
      debugNotes,
      WHATSAPP_DEBUG,
    );
    const pendingBudgetDraft = getPendingBudget(sessionState);
    if (!pendingBudgetDraft && sessionState?.moneko_state?.pending_budget) {
      sessionState = clearPendingBudget(sessionState);
      await saveSessionState(
        supabase,
        sessionId,
        sessionState,
        debugNotes,
        WHATSAPP_DEBUG,
      );
    }

    const lastListedRead = readLastListedTransactions(sessionState);
    if (!lastListedRead.items && lastListedRead.expired) {
      sessionState = clearLastListedTransactions(sessionState);
      await saveSessionState(
        supabase,
        sessionId,
        sessionState,
        debugNotes,
        WHATSAPP_DEBUG,
      );
    }

    const resolveBudgetScope = (
      args: any,
      fallback?: PendingBudgetDraft | null,
    ) => {
      let householdId = (args.space_id ??
        args.spaceId ??
        args.household_id ??
        fallback?.household_id ??
        null) as string | null;
      const householdName = (
        args.space_name ||
        args.spaceName ||
        args.household_name ||
        args.householdName ||
        fallback?.household_name ||
        ""
      )
        .toString()
        .toLowerCase();
      let spaceMeta = householdId ? spaceMap.get(householdId) : undefined;
      if (!spaceMeta && householdName && spaceMap.has(householdName)) {
        spaceMeta = spaceMap.get(householdName);
        householdId = spaceMeta?.id ?? null;
      }
      const resolvedName = spaceMeta?.name || householdName || undefined;
      const isPortfolio = householdId
        ? (spaceMeta?.isPortfolio ?? fallback?.is_portfolio ?? false)
        : false;
      return { householdId, resolvedName, isPortfolio };
    };

    const buildBudgetDraftFromArgs = async (
      args: any,
      fallback?: PendingBudgetDraft | null,
    ) => {
      const amountCandidate = coerceNumber(args.amount);
      const amountMajor =
        amountCandidate != null && amountCandidate > 0
          ? amountCandidate
          : (fallback?.amount ?? null);
      if (!amountMajor || amountMajor <= 0) {
        return { error: "Invalid budget amount" };
      }
      const rawDate =
        typeof args.date === "string" && args.date.trim()
          ? args.date.trim()
          : fallback?.date || formatDateInTimeZone(userTimezone);
      const dateStr = rawDate.slice(0, 10);
      const period_month = await resolveFinancialPeriodStartForUser(
        supabase,
        userId,
        dateStr,
      );
      const { householdId, resolvedName, isPortfolio } = resolveBudgetScope(
        args,
        fallback,
      );
      const pockets = normalizePockets(
        args.pockets ??
          args.pocket_splits ??
          args.envelopes ??
          fallback?.pockets ??
          [],
      );
      const draft: PendingBudgetDraft = {
        amount: amountMajor,
        currency: userCurrency,
        date: dateStr,
        period_month,
        household_id: householdId,
        household_name: resolvedName,
        is_portfolio: isPortfolio,
        pockets: pockets.length ? pockets : undefined,
        created_at: new Date().toISOString(),
      };
      return { draft };
    };

    const applyBudgetDraft = async (draft: PendingBudgetDraft) => {
      if (
        draft.household_id &&
        !(await ensureHouseholdMember(supabase, draft.household_id, userId))
      ) {
        return { error: "You do not have access to that space" };
      }

      const total_cents = Math.round(draft.amount * 100);
      const { data: budgetRow, error: budgetErr } = await createOrUpdateBudget(
        supabase,
        userId,
        draft.household_id,
        draft.period_month,
        draft.currency || userCurrency,
        total_cents,
        draft.household_id ? draft.is_portfolio === true : false,
      );
      if (budgetErr || !budgetRow) {
        return { error: budgetErr ?? "Failed to save budget" };
      }

      // Case-insensitive mapping + automatic consolidation of duplicate envelopes.
      const envelopeNameMap = await consolidateDuplicateEnvelopesForBudget(
        supabase,
        budgetRow.id,
        draft.period_month,
        debugNotes,
        WHATSAPP_DEBUG,
      );

      const pockets = Array.isArray(draft.pockets) ? draft.pockets : [];
      const created: any[] = [];
      for (const p of pockets) {
        const canonical = envelopeNameMap.get(normalizeEnvelopeName(p.name));
        const pocketName = canonical?.name || p.name;
        const { data: env, error: envErr } = await upsertEnvelope(
          supabase,
          budgetRow.id,
          userId,
          draft.household_id,
          pocketName,
          p.percentage,
          draft.currency || userCurrency,
        );
        if (env && env.id) {
          created.push({ name: pocketName, percentage: p.percentage });
          if (p.color || p.icon) {
            await supabase
              .from("budget_envelopes")
              .update({
                ...(p.color ? { color: p.color } : {}),
                ...(p.icon ? { icon: p.icon } : {}),
                updated_at: new Date().toISOString(),
              })
              .eq("id", env.id);
          }
          for (const cat of p.categories || []) {
            await upsertEnvelopeCategoryLink(supabase, env.id, cat);
          }
          const alloc_cents = Math.round((p.percentage / 100) * total_cents);
          await upsertEnvelopeAllocation(
            supabase,
            env.id,
            draft.period_month,
            alloc_cents,
          );
        } else if (envErr) {
          const formatted = formatInvokeError(envErr);
          if (WHATSAPP_DEBUG) {
            debugNotes.push(`envelope upsert error: ${formatted}`);
          }
        }
      }
      return { budgetRow, pockets: created };
    };

    const historyParts = await loadGeminiChatHistory({ supabase, sessionId });

    const whatsappSystemInstruction =
      WHATSAPP_SYSTEM_INSTRUCTION.replace(
        "{{DATE}}",
        formatDateInTimeZone(userTimezone),
      )
        .replace("{{CURRENCY}}", userCurrency)
        .replace("{{HOUSEHOLDS}}", householdContext)
        .replace(
          "{{WALLETS}}",
          "Available on request for the selected space only",
        )
        .replace("{{CATEGORIES}}", categoryGuideForUser)
        .replace("{{LANGUAGE}}", userLangLabel) +
      buildLanguageOverride(userLang);
    // Define Tools
    const tools = [
      {
        name: "analyze_expense",
        description:
          "Extract one or more transactions from text or an attached receipt/audio/file. Call this only if you need structured items.",
        parameters: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING" },
            media: {
              type: "OBJECT",
              properties: {
                kind: {
                  type: "STRING",
                  enum: ["image", "audio", "file"],
                },
                index: {
                  type: "NUMBER",
                  description: "0-based index of the WhatsApp media attachment",
                },
              },
            },
          },
        },
      },
      buildCreateCustomCategoryTool(),
      buildAddTransactionTool(),
      buildAddTransactionsBatchTool(),
      ...buildWalletTools(),
      buildCreateSpaceTool(),
      buildCreateSpaceInviteTool(),
      buildGetSpaceInfoTool(),
      buildUpdateSpaceSettingsTool(),
      buildUpdateTransactionTool(),
      buildDeleteTransactionTool(),
      buildListExpensesTool(),
      buildGetBudgetTool(),
      buildDraftBudgetTool({ includePocketDetails: true }),
      buildConfirmBudgetTool({ includePocketDetails: true }),
      buildSetBudgetTool({ includePocketDetails: true }),
      buildSetPocketTool({ includeNewName: true, includeColorIcon: true }),
      buildDeletePocketTool(),
      buildSetCurrencyTool(),
      buildSetLanguageTool(),
      buildSetDefaultSpaceTool(),
      buildGenerateChartUrlTool(),
      buildFinancialInsightTool(),
      buildManageRecurringTool({ includeScheduleFields: true }),
    ];

    // 6. Chat Loop (Model Turn)
    // Image/receipt analysis on Vertex (Gemini) routinely takes 30-60s, and
    // can spike past 60s under load. Use a longer timeout when the user
    // attached media; keep the default for fast text-only chats.
    const hasAttachment = numMedia > 0;
    const aiInnerTimeoutMs = hasAttachment ? 110000 : 60000;
    const aiOuterTimeoutMs = hasAttachment ? 120000 : 60000;

    let activeChat = createVertexBotChatSession({
      modelName: MODEL_NAME,
      systemInstruction: whatsappSystemInstruction,
      history: historyParts as any,
      tools: [
        { function_declarations: cloneBotToolDeclarations(tools) },
      ] as any,
      timeoutMs: aiInnerTimeoutMs,
      vertexConfig,
    });

    // Send message with timeout and error handling
    let response: any | null = null;
    let finalResponseText = "";
    try {
      const messagePromise = sendGeminiMessageWithRetry(
        activeChat as any,
        userMessageContent,
        {
          preRequestDelayMs: GEMINI_PRE_REQUEST_DELAY_MS,
          maxRetries: GEMINI_MAX_RETRIES,
          logPrefix: "twilio-whatsapp-ai-bot",
          fallbackModelName: FALLBACK_MODEL_NAME,
          fallbackChatFactory: (modelName, history) => {
            return createVertexBotChatSession({
              modelName,
              systemInstruction: whatsappSystemInstruction,
              history,
              tools: [
                { function_declarations: cloneBotToolDeclarations(tools) },
              ] as any,
              timeoutMs: aiInnerTimeoutMs,
              vertexConfig,
            });
          },
          onChatSwitched: (chatSession) => {
            activeChat = chatSession as any;
          },
        },
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `AI response timed out after ${Math.round(
                  aiOuterTimeoutMs / 1000,
                )} seconds`,
              ),
            ),
          aiOuterTimeoutMs,
        ),
      );

      const result = await Promise.race([messagePromise, timeoutPromise]);
      response = await result.response;
    } catch (e) {
      console.error("[twilio-whatsapp-ai-bot] Initial AI call failed:", e);
      await reportVertexAiFailure({
        functionName: "twilio-whatsapp-ai-bot",
        error: e,
        phase: "initial_ai_response",
        modelName: MODEL_NAME,
        context: {
          hasAttachment: numMedia > 0,
          message:
            typeof userMessageContent === "string"
              ? userMessageContent
              : "[non-string-message]",
        },
      });
      finalResponseText = isRetryableGeminiError(e)
        ? buildGeminiHighDemandMessage(userLang)
        : buildProcessingFailureMessage(userLang);
      if (WHATSAPP_DEBUG) {
        debugNotes.push(`initial-ai-error: ${String(e)}`);
      }
    }

    let functionCalls: any[] | null = response
      ? (response.functionCalls() as any[])
      : null;
    try {
      const walletRouting = await routeWalletMutationToolCall({
        chat: activeChat as any,
        response,
        functionCalls,
      });
      response = walletRouting.response;
      functionCalls = walletRouting.functionCalls || [];
      if (walletRouting.routed && functionCalls && functionCalls.length > 0) {
        finalResponseText = "";
        debugLog(WHATSAPP_DEBUG, "wallet mutation tool routed", {
          routeMethod: walletRouting.routeMethod,
          reason: walletRouting.reason,
          allowedToolNames: walletRouting.allowedToolNames,
          functionCalls: functionCalls.map((call: any) => call?.name),
        });
      }
    } catch (error) {
      console.error(
        "[twilio-whatsapp-ai-bot] wallet tool routing failed:",
        error,
      );
      if (WHATSAPP_DEBUG) {
        debugNotes.push(`wallet-routing-error: ${String(error)}`);
      }
    }
    let persistedContent: string | undefined;

    // Tool-call loop (bounded) to support multi-round function calling.
    let toolSucceededAny = false;
    let writeMutationSucceededAny = false;
    let lastToolResult: any = null;
    let lastToolCallName: string | null = null;
    let lastGeneratedChartUrl: string | null = null;
    let lastBudgetPockets: Array<{ name: string; percentage: number }> | null =
      null;
    let toolIterations = 0;

    if (!finalResponseText) {
      finalResponseText = response
        ? response.text()
        : buildProcessingFailureMessage(userLang);
    }
    if (functionCalls && functionCalls.length > 0) {
      // Ignore optimistic model text while tools are still pending. The durable
      // source of truth for write actions is the tool result, not the first
      // model draft.
      finalResponseText = "";
    } else {
      // Defense against AI hallucinating a save without calling a tool.
      // Intent stays model-driven; only an unsafe model claim can trigger repair.
      const claimDiag = diagnoseUnsafeTransactionMutationClaim({
        responseText: finalResponseText,
        writeMutationSucceeded: writeMutationSucceededAny,
      });
      const shouldForceToolCall = claimDiag.blocked;

      console.log("[twilio-whatsapp-ai-bot] initial-response tool-call guard", {
        userMessage: body,
        claimBlocked: claimDiag.blocked,
        claimReason: claimDiag.reason,
        hasFunctionCalls: false,
        willForceToolCall: shouldForceToolCall,
      });

      if (shouldForceToolCall) {
        try {
          const repairPrompt =
            `Your previous response did not call a save tool. ` +
            `The user's message ("${body}") requires a write action. ` +
            `Call add_transaction now with the details you can extract. ` +
            `Do not reply with text claiming a save happened.`;
          const repairResult = await (activeChat as any).sendMessage(
            repairPrompt,
            {
              toolConfig: {
                functionCallingConfig:
                  WRITE_MUTATION_FORCED_FUNCTION_CALLING_CONFIG,
              },
            },
          );
          response = await repairResult.response;
          functionCalls = (response.functionCalls() as any[]) || [];
          const repairText = response.text();
          console.log(
            "[twilio-whatsapp-ai-bot] forced-tool-call retry result",
            {
              forcedCallCount: functionCalls.length,
              forcedCallNames: functionCalls.map((c: any) => c?.name),
              hadTextFallback: !!repairText,
            },
          );
          if (functionCalls.length > 0) {
            finalResponseText = "";
          } else {
            // Model still refused to emit a tool call. Never echo its text if
            // it looks like a save claim.
            const repairDiag = diagnoseUnsafeTransactionMutationClaim({
              responseText: repairText,
              writeMutationSucceeded: false,
            });
            finalResponseText = repairDiag.blocked
              ? buildUnsafeMutationClaimFallback()
              : repairText || buildUnsafeMutationClaimFallback();
          }
        } catch (error) {
          console.error(
            "[twilio-whatsapp-ai-bot] forced-tool-call retry failed:",
            error,
          );
          if (WHATSAPP_DEBUG) {
            debugNotes.push(`forced-tool-call-retry-error: ${String(error)}`);
          }
          finalResponseText = buildUnsafeMutationClaimFallback();
          functionCalls = null;
        }
      }
    }
    while (functionCalls && functionCalls.length > 0 && toolIterations < 3) {
      const toolResponses: any[] = [];
      for (const call of functionCalls) {
        let toolResult = {};
        applyPreferredSpaceDefaultToToolCall(call, preferredSpaceId);
        debugLog(WHATSAPP_DEBUG, "tool call", {
          name: call.name,
          args: call.args,
        });
        try {
          if (call.name === "analyze_expense") {
            const text =
              typeof call.args?.text === "string" ? call.args.text.trim() : "";
            const media =
              call.args?.media && typeof call.args.media === "object"
                ? call.args.media
                : null;
            const kindRaw = typeof media?.kind === "string" ? media.kind : "";
            const kind = ["image", "audio", "file"].includes(kindRaw)
              ? kindRaw
              : "";
            const index = Number.isFinite(media?.index)
              ? Math.max(0, Math.trunc(Number(media.index)))
              : 0;

            if (!kind && !text) {
              toolResult = {
                error:
                  "Provide either text, or media.kind (+ optional media.index), to analyze.",
              };
            } else if (!kind) {
              toolResult = await runAnalyzeExpenseWithTimeout(
                {
                  userId,
                  text,
                  currency: userCurrency,
                  allowedExpenseCategories,
                  allowedIncomeCategories,
                  categoryPreferences,
                  categoryRemaps,
                },
                GEMINI_API_KEY,
                30000,
                "Analysis is taking longer than expected. Please try again.",
              );
            } else {
              const mediaUrl = formData.get(`MediaUrl${index}`)?.toString();
              const mediaType = (
                formData.get(`MediaContentType${index}`)?.toString() || ""
              )
                .split(";")[0]
                .trim();

              if (!mediaUrl) {
                toolResult = {
                  error: `Missing MediaUrl${index}. Ask the user to resend the attachment.`,
                };
              } else {
                const accountSid =
                  formData.get("AccountSid")?.toString() ||
                  TWILIO_ACCOUNT_SID ||
                  "";
                const token = TWILIO_AUTH_TOKEN || "";
                if (!accountSid || !token) {
                  toolResult = { error: "Twilio credentials not configured" };
                } else {
                  const authHeader = "Basic " + btoa(`${accountSid}:${token}`);
                  const res = await fetch(mediaUrl, {
                    headers: { Authorization: authHeader },
                  });
                  if (!res.ok) {
                    toolResult = {
                      error: `Failed to download media (status ${res.status}).`,
                    };
                  } else {
                    const headerContentType =
                      res.headers.get("content-type") || mediaType || "";
                    const contentType = headerContentType.split(";")[0].trim();
                    const buf = new Uint8Array(await res.arrayBuffer());
                    if (buf.byteLength > MAX_MEDIA_BYTES) {
                      toolResult = {
                        error: `Media is too large to process (${buf.byteLength} bytes).`,
                      };
                    } else {
                      const base64Data = uint8ToBase64(buf);
                      const cleanContentType =
                        contentType ||
                        (kind === "image"
                          ? "image/jpeg"
                          : kind === "audio"
                            ? "audio/ogg"
                            : "application/octet-stream");

                      const guessExtension = (ct: string) => {
                        const lower = ct.toLowerCase();
                        if (lower.includes("pdf")) return "pdf";
                        if (lower.includes("spreadsheetml")) return "xlsx";
                        if (lower.includes("csv")) return "csv";
                        if (lower.includes("json")) return "json";
                        if (lower.startsWith("image/")) {
                          const ext = lower.split("/")[1] || "jpg";
                          return ext === "jpeg" ? "jpg" : ext;
                        }
                        if (lower.startsWith("audio/")) {
                          return lower.split("/")[1] || "ogg";
                        }
                        if (lower.startsWith("text/")) return "txt";
                        return "bin";
                      };

                      if (kind === "image") {
                        toolResult = await runAnalyzeExpenseWithTimeout(
                          {
                            userId,
                            ...(text ? { text } : {}),
                            image: {
                              data: base64Data,
                              contentType: cleanContentType,
                              bytes: buf,
                            },
                            currency: userCurrency,
                            allowedExpenseCategories,
                            allowedIncomeCategories,
                            categoryPreferences,
                            categoryRemaps,
                          },
                          GEMINI_API_KEY,
                          30000,
                          "The image is taking longer than expected to process. Please try again with a clearer photo.",
                        );
                      } else if (kind === "audio") {
                        toolResult = await runAnalyzeExpenseWithTimeout(
                          {
                            userId,
                            ...(text ? { text } : {}),
                            audio: {
                              data: base64Data,
                              contentType: cleanContentType,
                              bytes: buf,
                            },
                            currency: userCurrency,
                            allowedExpenseCategories,
                            allowedIncomeCategories,
                            categoryPreferences,
                            categoryRemaps,
                          },
                          GEMINI_API_KEY,
                          30000,
                          "The audio is taking longer than expected to process. Please try again by speaking clearly.",
                        );
                      } else {
                        const ext = guessExtension(cleanContentType);
                        const filename = `attachment.${ext}`;
                        toolResult = await runAnalyzeExpenseWithTimeout(
                          {
                            userId,
                            text,
                            currency: userCurrency,
                            allowedExpenseCategories,
                            allowedIncomeCategories,
                            categoryPreferences,
                            categoryRemaps,
                            attachments: [
                              {
                                filename,
                                contentType: cleanContentType,
                                data: base64Data,
                              },
                            ],
                          },
                          GEMINI_API_KEY,
                          30000,
                          "The file is taking longer than expected to process. Please try again with a smaller file or send a clear photo instead.",
                        );
                      }
                    }
                  }
                }
              }
            }
          } else if (call.name === "create_custom_category") {
            const transactionType =
              String(call.args?.transaction_type || "expense").toLowerCase() ===
              "income"
                ? "income"
                : "expense";
            try {
              const created = await upsertUserCustomCategory({
                supabase,
                userId,
                categoryName: String(call.args?.name || ""),
                transactionType,
                colorArgb: Number.isFinite(Number(call.args?.color_argb))
                  ? Number(call.args?.color_argb)
                  : null,
                iconKey:
                  typeof call.args?.icon_key === "string"
                    ? call.args.icon_key
                    : null,
              });
              const targetList =
                transactionType === "income"
                  ? allowedIncomeCategories
                  : allowedExpenseCategories;
              if (!targetList.includes(created.name)) {
                targetList.push(created.name);
                targetList.sort();
              }
              toolResult = {
                success: true,
                category: created.name,
                transaction_type: created.transactionType,
              };
            } catch (error) {
              toolResult = { error: formatInvokeError(error) };
            }
          } else if (call.name === "add_transaction") {
            let householdId = (call.args.space_id || call.args.household_id) as
              | string
              | null;
            const householdName = (
              call.args.space_name ||
              call.args.household_name ||
              call.args.householdName ||
              ""
            )
              .toString()
              .toLowerCase();
            let spaceMeta = householdId ? spaceMap.get(householdId) : undefined;
            if (!spaceMeta && householdName && spaceMap.has(householdName)) {
              spaceMeta = spaceMap.get(householdName);
              householdId = spaceMeta?.id ?? null;
            }
            if (!spaceMeta && !householdName && spaceMap.size === 1) {
              spaceMeta = Array.from(spaceMap.values())[0];
              householdId = spaceMeta?.id ?? null;
            }

            if (
              householdId &&
              !(await ensureHouseholdMember(supabase, householdId, userId))
            ) {
              toolResult = { error: "You do not have access to that space" };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }

            const requestedAccount = await resolveWalletForTransactionToolCall(
              supabase,
              userId,
              householdId,
              call.args,
              "twilio-whatsapp-ai-bot",
            );
            if (requestedAccount.error) {
              toolResult = { error: requestedAccount.error };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }

            const dateStr = normalizeDateInput(
              call.args.date,
              formatDateInTimeZone(userTimezone),
            );
            const normalizedTransaction = normalizeTransactionToolArgs(
              call.args,
              {
                date: dateStr,
                currency: userCurrency,
                currencyEvidenceText: userMessageContent,
              },
            );
            if (!normalizedTransaction.ok) {
              toolResult = { error: normalizedTransaction.error };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }
            const transaction = normalizedTransaction.transaction;
            const currencyResult = resolveWalletTransactionCurrency({
              wallet: requestedAccount,
              walletName: call.args.wallet_name,
              transactionCurrency: transaction.currency,
              fallbackCurrency: userCurrency,
              hasExplicitCurrency: hasExplicitTransactionCurrency(call.args),
            });
            if (currencyResult.error || !currencyResult.currency) {
              toolResult = { error: currencyResult.error };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }
            const recurrenceRule = call.args.is_recurring
              ? buildRecurrenceRule(call.args, transaction.date!) || {
                  frequency: "monthly",
                  interval: 1,
                  anchor_date: transaction.date!,
                }
              : null;
            const type = transaction.type;
            const canUseHouseholdSplits =
              !!householdId && spaceMeta?.isPortfolio !== true;
            const splitConfig = canUseHouseholdSplits
              ? await resolveHouseholdSplitConfig(
                  supabase,
                  householdId!,
                  userId,
                  transaction.amount,
                  call.args,
                )
              : {};

            const { data, error } = await invokeTransactionSave(
              supabase,
              INTERNAL_FUNCTION_KEY,
              userId,
              {
                amount: transaction.amount,
                category: transaction.category,
                currency: currencyResult.currency,
                date: transaction.date!,
                description: transaction.description,
                merchant: transaction.merchant,
                type,
                householdId,
                isPortfolio: spaceMeta?.isPortfolio ?? false,
                accountId: requestedAccount.accountId ?? undefined,
                payerUserId: splitConfig.payerUserId,
                customSplits: splitConfig.customSplits,
                isRecurring: !!call.args.is_recurring,
                recurrence_rule: recurrenceRule || undefined,
                source: call.args.source,
                ownerType: call.args.owner_type,
                privacyScope: call.args.privacy_scope,
              },
            );
            const success = !error && data?.success === true;
            const formatted = success
              ? ""
              : formatInvokeError(error ?? data?.error) ||
                "Failed to save transaction";
            toolResult = success
              ? { success: true, data: data?.data ?? data }
              : { error: formatted };
            if (!success) {
              if (WHATSAPP_DEBUG) {
                debugNotes.push(`add-transaction error: ${formatted}`);
              }
              console.error("[twilio-whatsapp-ai-bot] add-transaction error", {
                error,
                formatted,
                internalAuth: {
                  source: internalKeyMeta.source,
                  fingerprint: fingerprintSecret(INTERNAL_FUNCTION_KEY),
                  keyLength: INTERNAL_FUNCTION_KEY.length,
                  httpStatus: getInvokeHttpStatus(error),
                },
              });
              await reportTwilioToolInvokeFailure({
                toolName: "add_transaction",
                targetFunction:
                  type === "income" ? "save-income" : "save-expense",
                formatted,
                error: error ?? data?.error,
                context: {
                  type,
                  amount: transaction.amount,
                  category: transaction.category,
                  householdId,
                },
              });
            }
          } else if (call.name === "add_transactions_batch") {
            // Batch save for multiple transactions (from receipts, bank statements, etc.)
            const rawTransactions = Array.isArray(call.args.transactions)
              ? call.args.transactions
              : [];

            if (rawTransactions.length === 0) {
              toolResult = { error: "No transactions provided" };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }

            // Resolve household context
            const { householdId, spaceMeta } = resolveBotSpaceScope(
              call.args,
              spaceMap,
            );
            if (
              householdId &&
              !(await ensureHouseholdMember(supabase, householdId, userId))
            ) {
              toolResult = { error: "You do not have access to that space" };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }
            const isPortfolio =
              spaceMeta?.isPortfolio ??
              (call.args.space_type === "private_space" ||
                call.args.is_portfolio === true);

            // Build transactions array for the batch endpoint
            const batchTransactions: any[] = [];
            const defaultDate = formatDateInTimeZone(userTimezone);

            for (const [index, tx] of rawTransactions.entries()) {
              const transactionResult = normalizeTransactionToolArgs(tx, {
                date: tx.date || defaultDate,
                currency: userCurrency,
                currencyEvidenceText: userMessageContent,
              });
              if (!transactionResult.ok) {
                toolResult = {
                  error: `Transaction ${index + 1}: ${transactionResult.error}`,
                };
                break;
              }
              const transaction = transactionResult.transaction;
              const requestedWallet = await resolveWalletForTransactionToolCall(
                supabase,
                userId,
                householdId,
                tx,
                "twilio-whatsapp-ai-bot",
              );
              if (requestedWallet.error) {
                toolResult = { error: requestedWallet.error };
                break;
              }
              const currencyResult = resolveWalletTransactionCurrency({
                wallet: requestedWallet,
                walletName: tx.wallet_name,
                transactionCurrency: transaction.currency,
                fallbackCurrency: userCurrency,
                hasExplicitCurrency: hasExplicitTransactionCurrency(tx),
              });
              if (currencyResult.error || !currencyResult.currency) {
                toolResult = { error: currencyResult.error };
                break;
              }

              // Resolve splits for shared-space transactions.
              let payerUserId: string | undefined;
              let customSplits: CustomSplits | undefined;

              if (householdId && !isPortfolio) {
                const splitConfig = await resolveHouseholdSplitConfig(
                  supabase,
                  householdId,
                  userId,
                  transaction.amount,
                  tx,
                );
                payerUserId = splitConfig.payerUserId;
                customSplits = splitConfig.customSplits;
              }

              batchTransactions.push({
                type: transaction.type,
                amount: transaction.amount,
                category: transaction.category,
                currency: currencyResult.currency,
                accountId: requestedWallet.accountId ?? undefined,
                date: transaction.date!,
                description: transaction.description,
                merchant: transaction.merchant,
                source: tx.source,
                ownerType: tx.owner_type || "me",
                privacyScope: tx.privacy_scope || "full",
                payerUserId,
                customSplits,
                isRecurring: tx.is_recurring === true,
                recurrence_rule:
                  tx.is_recurring === true
                    ? tx.recurrence_rule || {
                        frequency: (tx.frequency || "monthly")
                          .toString()
                          .toLowerCase(),
                        interval: 1,
                        anchor_date: transaction.date!,
                      }
                    : undefined,
              });
            }

            if ((toolResult as any)?.error) {
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }

            // Call save-transactions-batch
            const batchPayload = {
              userId,
              householdId,
              isPortfolio,
              transactions: batchTransactions,
            };

            console.log(
              `[twilio-whatsapp-ai-bot] add_transactions_batch: saving ${batchTransactions.length} transactions`,
              { householdId, isPortfolio },
            );

            const { data, error } = await supabase.functions.invoke(
              "save-transactions-batch",
              {
                body: batchPayload,
                headers: buildInternalInvokeHeaders(INTERNAL_FUNCTION_KEY),
              },
            );

            const success = !error && data?.success === true;
            console.log(
              "[twilio-whatsapp-ai-bot] add_transactions_batch: save result",
              {
                success,
                count: batchTransactions.length,
                succeeded: data?.summary?.succeeded,
                failed: data?.summary?.failed,
                error: error ? String(error) : null,
              },
            );
            if (success) {
              const summary = data?.summary || {};
              toolResult = {
                success: true,
                message: `Saved ${
                  summary.succeeded || batchTransactions.length
                } of ${summary.total || batchTransactions.length} transactions`,
                succeeded: summary.succeeded,
                failed: summary.failed,
              };
            } else {
              const formatted = formatInvokeError(error ?? data?.error);
              if (WHATSAPP_DEBUG) {
                debugNotes.push(`add_transactions_batch error: ${formatted}`);
              }
              console.error(
                "[twilio-whatsapp-ai-bot] add_transactions_batch error",
                { error, formatted },
              );
              await reportTwilioToolInvokeFailure({
                toolName: "add_transactions_batch",
                targetFunction: "save-transactions-batch",
                formatted,
                error: error ?? data?.error,
                context: {
                  count: batchTransactions.length,
                  householdId,
                  isPortfolio,
                },
              });
              toolResult = {
                error: formatted || "Failed to save transactions",
              };
            }
          } else if (call.name === "list_wallets") {
            const { householdId } = resolveBotSpaceScope(call.args, spaceMap);
            const walletResult = await listBotWallets({
              supabase,
              internalFunctionKey: INTERNAL_FUNCTION_KEY,
              userId,
              householdId,
              includeArchived: call.args.include_archived === true,
            });
            toolResult = walletResult.result;
            if (walletResult.failure) {
              await reportTwilioToolInvokeFailure({
                toolName: "list_wallets",
                targetFunction: walletResult.failure.targetFunction,
                formatted: walletResult.failure.formatted,
                error: walletResult.failure.error,
                context: walletResult.failure.context,
              });
            }
          } else if (call.name === "create_wallet") {
            const { householdId } = resolveBotSpaceScope(call.args, spaceMap);
            const walletResult = await createBotWalletFromToolCall({
              supabase,
              internalFunctionKey: INTERNAL_FUNCTION_KEY,
              userId,
              householdId,
              args: call.args,
            });
            toolResult = walletResult.result;
            if (walletResult.failure) {
              await reportTwilioToolInvokeFailure({
                toolName: "create_wallet",
                targetFunction: walletResult.failure.targetFunction,
                formatted: walletResult.failure.formatted,
                error: walletResult.failure.error,
                context: walletResult.failure.context,
              });
            }
          } else if (call.name === "update_wallet") {
            const { householdId } = resolveBotSpaceScope(call.args, spaceMap);
            const walletResult = await updateBotWalletFromToolCall({
              supabase,
              internalFunctionKey: INTERNAL_FUNCTION_KEY,
              userId,
              householdId,
              args: call.args || {},
              logPrefix: "twilio-whatsapp-ai-bot",
            });
            toolResult = walletResult.result;
            if (walletResult.failure) {
              await reportTwilioToolInvokeFailure({
                toolName: "update_wallet",
                targetFunction: walletResult.failure.targetFunction,
                formatted: walletResult.failure.formatted,
                error: walletResult.failure.error,
                context: walletResult.failure.context,
              });
            }
          } else if (call.name === "create_wallet_transfer") {
            const { householdId } = resolveBotSpaceScope(call.args, spaceMap);
            const walletResult = await createBotWalletTransferFromToolCall({
              supabase,
              internalFunctionKey: INTERNAL_FUNCTION_KEY,
              userId,
              householdId,
              args: call.args || {},
              defaultDate: formatDateInTimeZone(userTimezone),
              logPrefix: "twilio-whatsapp-ai-bot",
            });
            toolResult = walletResult.result;
            if (walletResult.failure) {
              await reportTwilioToolInvokeFailure({
                toolName: "create_wallet_transfer",
                targetFunction: walletResult.failure.targetFunction,
                formatted: walletResult.failure.formatted,
                error: walletResult.failure.error,
                context: walletResult.failure.context,
              });
            }
          } else if (call.name === "create_space") {
            toolResult = await createBotSpace({
              supabase,
              userId,
              args: call.args || {},
              defaultCurrency: userCurrency,
            });
            upsertBotSpaceMetaFromToolResult(toolResult, spaceMap);
          } else if (call.name === "create_space_invite") {
            toolResult = await createBotSpaceInvite({
              supabase,
              userId,
              args: call.args || {},
              spaceMap,
            });
          } else if (call.name === "get_space_info") {
            toolResult = await getBotSpaceInfo({
              supabase,
              userId,
              args: call.args || {},
              spaceMap,
            });
          } else if (call.name === "update_space_settings") {
            toolResult = await updateBotSpaceSettings({
              supabase,
              userId,
              args: call.args || {},
              spaceMap,
            });
            upsertBotSpaceMetaFromToolResult(toolResult, spaceMap);
          } else if (call.name === "update_transaction") {
            const updatesArgs =
              call.args?.updates &&
              typeof call.args.updates === "object" &&
              !Array.isArray(call.args.updates)
                ? call.args.updates
                : null;
            if (!updatesArgs) {
              toolResult = { error: "updates is required" };
            } else {
              const lastRead = readLastListedTransactions(sessionState);
              if (!lastRead.items && lastRead.expired) {
                sessionState = clearLastListedTransactions(sessionState);
                await saveSessionState(
                  supabase,
                  sessionId,
                  sessionState,
                  debugNotes,
                  WHATSAPP_DEBUG,
                );
              }

              const spaceNameByHouseholdId = (
                householdId: string | null | undefined,
              ) =>
                householdId ? spaceMap.get(householdId)?.name || null : null;

              const resolved = await resolveBotTransactionSelection({
                supabase,
                userId,
                args: call.args,
                items: lastRead.items || [],
                spaceNameByHouseholdId,
              });

              if ("needs_disambiguation" in resolved) {
                toolResult = resolved;
              } else if ("error" in resolved) {
                toolResult = { error: resolved.error };
              } else {
                const expenseId = resolved.candidate.id;
                const { data: expenseRow, error: expenseFetchError } =
                  await supabase
                    .from("expenses")
                    .select("id, user_id, household_id")
                    .eq("id", expenseId)
                    .is("deleted_at", null)
                    .maybeSingle();

                if (expenseFetchError || !expenseRow) {
                  toolResult = {
                    error:
                      "No matching transaction found. Ask user to list recent transactions first or provide more details.",
                  };
                } else {
                  const expenseHouseholdId = (expenseRow as any)
                    .household_id as string | null;
                  if (!expenseHouseholdId) {
                    if ((expenseRow as any).user_id !== userId) {
                      toolResult = {
                        error:
                          "You don't have permission to edit this transaction.",
                      };
                    }
                  } else {
                    const isMember = await ensureHouseholdMember(
                      supabase,
                      expenseHouseholdId,
                      userId,
                    );
                    if (!isMember) {
                      toolResult = {
                        error:
                          "You don't have permission to edit this transaction.",
                      };
                    }
                  }

                  if (!(toolResult as any).error) {
                    const updates: Record<string, unknown> = {};
                    if (updatesArgs.amount != null) {
                      const amount = Number((updatesArgs as any).amount);
                      if (Number.isFinite(amount)) {
                        updates.amount_cents = Math.round(amount * 100);
                      }
                    }
                    if ((updatesArgs as any).category != null) {
                      updates.category = (updatesArgs as any).category;
                    }
                    if ((updatesArgs as any).description != null) {
                      updates.raw_text = (updatesArgs as any).description;
                    }
                    if ((updatesArgs as any).merchant !== undefined) {
                      updates.merchant = (updatesArgs as any).merchant;
                    }
                    if ((updatesArgs as any).currency != null) {
                      updates.currency = (updatesArgs as any).currency;
                    }
                    if ((updatesArgs as any).date != null) {
                      updates.date = normalizeDateInput(
                        (updatesArgs as any).date,
                        formatDateInTimeZone(userTimezone),
                      );
                    }
                    if ((updatesArgs as any).source != null) {
                      updates.source = (updatesArgs as any).source;
                    }

                    const updateRequestBody: Record<string, unknown> = {
                      userId,
                      expenseId,
                      updates,
                    };
                    const hasScopeUpdate =
                      Object.prototype.hasOwnProperty.call(
                        updatesArgs,
                        "household_id",
                      ) ||
                      Object.prototype.hasOwnProperty.call(
                        updatesArgs,
                        "household_name",
                      ) ||
                      Object.prototype.hasOwnProperty.call(
                        updatesArgs,
                        "householdName",
                      );
                    const scopeResult = hasScopeUpdate
                      ? resolveBotSpaceScope(updatesArgs, spaceMap)
                      : {
                          householdId: resolved.candidate.household_id || null,
                          spaceMeta: undefined,
                        };
                    if (hasScopeUpdate) {
                      updates.household_id = scopeResult.householdId;
                      updateRequestBody.householdId = scopeResult.householdId;
                    }

                    if (
                      (updatesArgs as any).wallet_id !== undefined ||
                      (updatesArgs as any).account_id !== undefined ||
                      (updatesArgs as any).wallet_name !== undefined
                    ) {
                      const walletResolution =
                        await resolveWalletForTransactionToolCall(
                          supabase,
                          userId,
                          scopeResult.householdId,
                          updatesArgs as Record<string, unknown>,
                          "twilio-whatsapp-ai-bot",
                        );
                      if (walletResolution.error) {
                        toolResult = { error: walletResolution.error };
                      } else {
                        updates.account_id = walletResolution.accountId || null;
                        const currencyResult = resolveWalletTransactionCurrency(
                          {
                            wallet: walletResolution,
                            walletName:
                              (updatesArgs as any).wallet_name ||
                              (updatesArgs as any).wallet_id ||
                              (updatesArgs as any).account_id,
                            transactionCurrency:
                              updates.currency || resolved.candidate.currency,
                            fallbackCurrency: userCurrency,
                            hasExplicitCurrency: hasExplicitTransactionCurrency(
                              updatesArgs as Record<string, unknown>,
                            ),
                          },
                        );
                        if (currencyResult.error || !currencyResult.currency) {
                          toolResult = { error: currencyResult.error };
                        } else if (walletResolution.accountId) {
                          updates.currency = currencyResult.currency;
                        }
                      }
                    }

                    const targetHouseholdId = scopeResult.householdId;
                    if (
                      !(toolResult as any)?.error &&
                      targetHouseholdId &&
                      ((updatesArgs as any).payer_name !== undefined ||
                        (updatesArgs as any).paid_by !== undefined ||
                        Array.isArray((updatesArgs as any).member_splits))
                    ) {
                      const splitConfig = await resolveHouseholdSplitConfig(
                        supabase,
                        targetHouseholdId,
                        userId,
                        typeof (updatesArgs as any).amount === "number"
                          ? Number((updatesArgs as any).amount)
                          : resolved.candidate.amountMajor || 0,
                        updatesArgs,
                      );
                      if (splitConfig.payerUserId) {
                        updates.payer_user_id = splitConfig.payerUserId;
                        updateRequestBody.payerUserId = splitConfig.payerUserId;
                      }
                      if (splitConfig.customSplits) {
                        const isScopeMove =
                          targetHouseholdId !==
                          (resolved.candidate.household_id || null);
                        if (isScopeMove) {
                          updateRequestBody.customSplits =
                            splitConfig.customSplits;
                          updateRequestBody.householdId = targetHouseholdId;
                        } else {
                          updateRequestBody.splitUpdate =
                            splitConfig.customSplits;
                        }
                      }
                    }
                    if ((updatesArgs as any).is_recurring === true) {
                      updates.is_recurring = true;
                      updates.recurrence_rule = buildRecurrenceRule(
                        updatesArgs,
                        typeof updates.date === "string"
                          ? updates.date
                          : resolved.candidate.date ||
                              formatDateInTimeZone(userTimezone),
                      ) || {
                        frequency: "monthly",
                        interval: 1,
                        anchor_date:
                          typeof updates.date === "string"
                            ? updates.date
                            : resolved.candidate.date ||
                              formatDateInTimeZone(userTimezone),
                      };
                    } else if ((updatesArgs as any).is_recurring === false) {
                      updates.is_recurring = false;
                      updates.recurrence_rule = null;
                    } else if ((updatesArgs as any).recurrence_rule) {
                      updates.is_recurring = true;
                      updates.recurrence_rule = (
                        updatesArgs as any
                      ).recurrence_rule;
                    }

                    if (
                      !(toolResult as any)?.error &&
                      Object.keys(updates).length === 0 &&
                      !(updateRequestBody as any).customSplits &&
                      !(updateRequestBody as any).splitUpdate &&
                      !(updateRequestBody as any).payerUserId
                    ) {
                      toolResult = { error: "No updates provided" };
                    } else if (!(toolResult as any)?.error) {
                      const candidateSummary = [
                        resolved.candidate.date,
                        `${resolved.candidate.amountMajor || 0} ${
                          resolved.candidate.currency || ""
                        }`.trim(),
                        resolved.candidate.category,
                        resolved.candidate.description,
                        resolved.candidate.household_id
                          ? `(${
                              spaceMap.get(resolved.candidate.household_id)
                                ?.name || ""
                            })`
                          : "",
                      ]
                        .filter((v) => String(v || "").trim().length > 0)
                        .join(" | ")
                        .slice(0, 180);

                      if (!INTERNAL_FUNCTION_KEY) {
                        console.error(
                          "[twilio-whatsapp-ai-bot] update-expense invoke skipped: missing internal key",
                          {
                            updatesKeys: Object.keys(updates),
                            candidateSummary,
                          },
                        );
                        toolResult = { error: "Internal key not configured" };
                      } else {
                        const { data, error } = await supabase.functions.invoke(
                          "update-expense",
                          {
                            body: updateRequestBody,
                            headers: buildInternalInvokeHeaders(
                              INTERNAL_FUNCTION_KEY,
                            ),
                          },
                        );
                        const success = !error && data?.success === true;

                        if (success) {
                          toolResult = { success: true };
                        } else {
                          const status = (error as any)?.status;
                          const formattedBase = error
                            ? formatInvokeError(error)
                            : typeof (data as any)?.error === "string"
                              ? (data as any).error
                              : "Failed to update transaction";
                          const code = (data as any)?.code;
                          const formatted = code
                            ? `${formattedBase} (code: ${code})`
                            : formattedBase;

                          console.error(
                            "[twilio-whatsapp-ai-bot] update-expense invoke failed",
                            {
                              status,
                              formatted,
                              hasData: !!data,
                              code: (data as any)?.code,
                              message: (data as any)?.error,
                              updatesKeys: Object.keys(updates),
                              candidateSummary,
                            },
                          );
                          if (WHATSAPP_DEBUG && Array.isArray(debugNotes)) {
                            debugNotes.push(
                              `update_transaction update-expense failed: ${formattedBase} (status: ${
                                status ?? "unknown"
                              }, code: ${code ?? "none"})`,
                            );
                          }
                          toolResult = { error: formatted };
                        }
                      }
                    }
                  }
                }
              }
            }
          } else if (call.name === "delete_transaction") {
            const lastRead = readLastListedTransactions(sessionState);
            if (!lastRead.items && lastRead.expired) {
              sessionState = clearLastListedTransactions(sessionState);
              await saveSessionState(
                supabase,
                sessionId,
                sessionState,
                debugNotes,
                WHATSAPP_DEBUG,
              );
            }

            const spaceNameByHouseholdId = (
              householdId: string | null | undefined,
            ) => (householdId ? spaceMap.get(householdId)?.name || null : null);

            const resolved = resolveLastListedSelection(
              lastRead.items || [],
              call.args,
              spaceNameByHouseholdId,
            );
            if ("needs_disambiguation" in resolved) {
              toolResult = resolved;
            } else if ("error" in resolved) {
              toolResult = { error: resolved.error };
            } else {
              const expenseId = resolved.candidate.id;
              const deleteResult = await invokeTransactionDelete(
                supabase,
                INTERNAL_FUNCTION_KEY,
                userId,
                expenseId,
              );
              toolResult = deleteResult.success
                ? { success: true }
                : { error: deleteResult.formatted };
            }
          } else if (call.name === "list_expenses") {
            const { householdId, spaceMeta } = resolveBotSpaceScope(
              call.args,
              spaceMap,
            );
            if (
              householdId &&
              !(await ensureHouseholdMember(supabase, householdId, userId))
            ) {
              toolResult = { error: "You do not have access to that space" };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }
            const type = call.args.type || "expense";
            const listPayload = {
              limit: call.args.limit || 10,
              startDate: call.args.start_date,
              endDate: call.args.end_date,
              householdId,
              isPortfolio: spaceMeta?.isPortfolio ?? false,
              portfolioHouseholdIds: householdId
                ? undefined
                : portfolioSpaceIds,
              currency: call.args.currency,
              type,
            };
            debugLog(WHATSAPP_DEBUG, "list-expenses payload", listPayload);
            // fetchExpensesDirect returns snake_case fields from DB (amount_cents, raw_text, etc.)
            // normalizeExpensesForTool handles both snake_case and camelCase field names
            const { data, error } = await fetchExpensesDirect(
              supabase,
              contactId,
              listPayload,
            );
            if (error) {
              const formatted = formatInvokeError(error);
              if (WHATSAPP_DEBUG) {
                debugNotes.push(`list-expenses direct error: ${formatted}`);
              }
              console.error(
                "[twilio-whatsapp-ai-bot] list-expenses direct query error",
                { error, formatted },
              );
              toolResult = { error };
            } else {
              const memoryItems = (data || [])
                .map((row: any) => normalizeLastListedTransactionFromRow(row))
                .filter(Boolean) as LastListedTransaction[];

              sessionState = setLastListedTransactions(
                sessionState,
                memoryItems,
              );
              await saveSessionState(
                supabase,
                sessionId,
                sessionState,
                debugNotes,
                WHATSAPP_DEBUG,
              );

              const normalized = normalizeExpensesForTool(
                data || [],
                userCurrency,
              );
              const chartUrl = buildCategoryChart(normalized);
              const safeExpenses = memoryItems.slice(0, 25).map((item, i) => {
                const spaceName = item.household_id
                  ? spaceMap.get(item.household_id)?.name || null
                  : null;
                return {
                  index: i + 1,
                  amountMajor: item.amountMajor,
                  currency: item.currency,
                  date: item.date,
                  category: item.category,
                  description: item.description,
                  type: item.type || "expense",
                  ...(spaceName ? { space: spaceName } : {}),
                };
              });
              toolResult = {
                expenses: safeExpenses,
                chart_url: chartUrl,
                has_selection_memory: true,
              };
            }
          } else if (call.name === "get_budget") {
            const dateStr = (
              call.args.date || formatDateInTimeZone(userTimezone)
            ).slice(0, 10);
            const period_month = await resolveFinancialPeriodStartForUser(
              supabase,
              userId,
              dateStr,
            );
            const { householdId, spaceMeta } = resolveBotSpaceScope(
              call.args,
              spaceMap,
            );
            if (
              householdId &&
              !(await ensureHouseholdMember(supabase, householdId, userId))
            ) {
              toolResult = { error: "You do not have access to that space" };
            } else {
              const res = await getBudgetStatusDirect(
                supabase,
                userId,
                householdId,
                period_month,
                userCurrency,
                spaceMeta?.isPortfolio ?? false,
                contactId,
              );
              if (res.error) {
                const formatted = formatInvokeError(res.error);
                if (WHATSAPP_DEBUG) {
                  debugNotes.push(`get-budget direct error: ${formatted}`);
                }
                console.error(
                  "[twilio-whatsapp-ai-bot] get-budget direct error",
                  { error: res.error, formatted },
                );
                toolResult = { error: res.error };
              } else {
                toolResult = {
                  budget: res.budget,
                  pockets: res.envelopes,
                  totals: res.totals,
                  chart: res.chart,
                };
              }
            }
          } else if (call.name === "set_currency") {
            const currency = (call.args.currency || "")
              .toString()
              .toUpperCase();
            const preferenceResult = await setBotPreferredCurrency({
              supabase,
              contactId,
              currency,
            });
            toolResult = preferenceResult.result;
            if ((toolResult as any)?.success) {
              userCurrency = normalizePreferredCurrency(
                (toolResult as any).currency || currency || userCurrency,
                userCurrency,
              );
            }
            if (preferenceResult.failure) {
              if (WHATSAPP_DEBUG) {
                debugNotes.push(
                  `set-currency error: ${preferenceResult.failure.formatted}`,
                );
              }
              console.error("[twilio-whatsapp-ai-bot] set-currency error", {
                error: preferenceResult.failure.error,
                formatted: preferenceResult.failure.formatted,
              });
            }
          } else if (call.name === "set_language") {
            const language = (call.args.language || "").toString().trim();
            const preferenceResult = await setBotPreferredLanguage({
              supabase,
              internalFunctionKey: INTERNAL_FUNCTION_KEY,
              userId,
              language,
            });
            toolResult = preferenceResult.result;
            if (preferenceResult.failure) {
              if (WHATSAPP_DEBUG) {
                debugNotes.push(
                  `set-language error: ${preferenceResult.failure.formatted}`,
                );
              }
              console.error("[twilio-whatsapp-ai-bot] set-language error", {
                error: preferenceResult.failure.error,
                formatted: preferenceResult.failure.formatted,
              });
            }
          } else if (call.name === "set_default_space") {
            const preferenceResult = await setBotPreferredSpace({
              supabase,
              userId,
              contactId,
              args: call.args || {},
              spaceMap,
            });
            toolResult = preferenceResult.result;
            if ((toolResult as any)?.success) {
              preferredSpaceId =
                ((toolResult as any).preferred_space_id as string | null) ||
                null;
            }
          } else if (call.name === "draft_budget") {
            const { draft, error } = await buildBudgetDraftFromArgs(call.args);
            if (!draft || error) {
              toolResult = { error: error || "Invalid budget draft" };
            } else {
              sessionState = setPendingBudget(sessionState, draft);
              await saveSessionState(
                supabase,
                sessionId,
                sessionState,
                debugNotes,
                WHATSAPP_DEBUG,
              );
              toolResult = {
                success: true,
                pending_budget: {
                  amount: draft.amount,
                  currency: draft.currency,
                  period_month: draft.period_month,
                  pockets: draft.pockets || [],
                  household_name: draft.household_name,
                },
              };
            }
          } else if (call.name === "confirm_budget") {
            if (call.args.confirm === false) {
              toolResult = { error: "Confirmation required" };
            } else {
              const pending = getPendingBudget(sessionState);
              const { draft, error } = await buildBudgetDraftFromArgs(
                call.args,
                pending,
              );
              if (!draft || error) {
                toolResult = {
                  error: pending
                    ? error || "Invalid budget draft"
                    : "No pending budget to confirm",
                };
              } else {
                const res = await applyBudgetDraft(draft);
                if (res.error) {
                  const formatted = formatInvokeError(res.error);
                  toolResult = { error: res.error ?? "Failed to save budget" };
                  if (WHATSAPP_DEBUG) {
                    debugNotes.push(`confirm-budget error: ${formatted}`);
                  }
                  console.error(
                    "[twilio-whatsapp-ai-bot] confirm-budget error",
                    { error: res.error, formatted },
                  );
                } else {
                  toolResult = {
                    success: true,
                    budget: res.budgetRow,
                    pockets: res.pockets,
                  };
                  sessionState = clearPendingBudget(sessionState);
                  await saveSessionState(
                    supabase,
                    sessionId,
                    sessionState,
                    debugNotes,
                    WHATSAPP_DEBUG,
                  );
                }
              }
            }
          } else if (call.name === "set_budget") {
            // Create or update budget + envelopes/pockets
            const pending = getPendingBudget(sessionState);
            const { draft, error } = await buildBudgetDraftFromArgs(
              call.args,
              pending,
            );
            if (!draft || error) {
              toolResult = { error: error || "Invalid budget amount" };
            } else {
              const res = await applyBudgetDraft(draft);
              if (res.error) {
                const formatted = formatInvokeError(res.error);
                toolResult = { error: res.error ?? "Failed to save budget" };
                if (WHATSAPP_DEBUG) {
                  debugNotes.push(`set-budget error: ${formatted}`);
                }
                console.error("[twilio-whatsapp-ai-bot] set-budget error", {
                  error: res.error,
                  formatted,
                });
              } else {
                toolResult = {
                  success: true,
                  budget: res.budgetRow,
                  pockets: res.pockets,
                };
                sessionState = clearPendingBudget(sessionState);
                await saveSessionState(
                  supabase,
                  sessionId,
                  sessionState,
                  debugNotes,
                  WHATSAPP_DEBUG,
                );
              }
            }
          } else if (call.name === "set_pocket") {
            const pocketResult = await setBotPocketFromToolCall({
              supabase,
              userId,
              contactId,
              userCurrency,
              currentDate: formatDateInTimeZone(userTimezone),
              args: call.args,
              spaceMap,
              debugNotes,
              debugEnabled: WHATSAPP_DEBUG,
            });
            toolResult = pocketResult.result;
          } else if (call.name === "delete_pocket") {
            const dateStr = normalizeDateInput(
              call.args.date,
              formatDateInTimeZone(userTimezone),
            );
            const period_month = await resolveFinancialPeriodStartForUser(
              supabase,
              userId,
              dateStr,
            );
            const { householdId, isPortfolio } = resolveBudgetScope(call.args);
            if (
              householdId &&
              !(await ensureHouseholdMember(supabase, householdId, userId))
            ) {
              toolResult = { error: "You do not have access to that space" };
            } else {
              const { data: budgetRow, error: budgetErr } =
                await resolveBudgetForScope(
                  supabase,
                  userId,
                  householdId,
                  period_month,
                  userCurrency,
                  isPortfolio,
                );
              if (budgetErr || !budgetRow) {
                toolResult = {
                  error: "Please set a budget first for this month",
                };
              } else {
                const name = (call.args.name || "").toString().trim();
                if (!name) {
                  toolResult = { error: "Pocket name is required" };
                } else {
                  const { data: envelope } = await resolveEnvelopeByName(
                    supabase,
                    budgetRow.id,
                    name,
                  );
                  if (!envelope?.id) {
                    toolResult = { error: "Pocket not found" };
                  } else {
                    const { error: deleteErr } = await supabase
                      .from("budget_envelopes")
                      .delete()
                      .eq("id", envelope.id);
                    if (deleteErr) {
                      toolResult = { error: deleteErr };
                    } else {
                      toolResult = { success: true };
                    }
                  }
                }
              }
            }
          } else if (call.name === "generate_chart_url") {
            // Generate QuickChart URL
            const chartConfig = {
              type: call.args.chart_type,
              data: {
                labels: call.args.labels,
                datasets: [
                  {
                    label: call.args.title || "Data",
                    data: call.args.data,
                    backgroundColor: [
                      "#FF6384",
                      "#36A2EB",
                      "#FFCE56",
                      "#4BC0C0",
                      "#9966FF",
                    ],
                  },
                ],
              },
              options: { title: { display: true, text: call.args.title } },
            };
            const longUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
              JSON.stringify(chartConfig),
            )}`;
            const url =
              (await createQuickChartShortUrl(chartConfig)) || longUrl;
            toolResult = { url };
            lastGeneratedChartUrl = url;
          } else if (call.name === "manage_recurring") {
            // Use update-expense or save-expense
            const action = (call.args.action || "").toString().toLowerCase();
            if (action === "add") {
              let householdId = (call.args.space_id ||
                call.args.household_id) as string | null;
              const householdName = (
                call.args.space_name ||
                call.args.household_name ||
                ""
              )
                .toString()
                .toLowerCase();
              let spaceMeta = householdId
                ? spaceMap.get(householdId)
                : undefined;
              if (!spaceMeta && householdName && spaceMap.has(householdName)) {
                spaceMeta = spaceMap.get(householdName);
                householdId = spaceMeta?.id ?? null;
              }
              if (!spaceMeta && !householdName && spaceMap.size === 1) {
                spaceMeta = Array.from(spaceMap.values())[0];
                householdId = spaceMeta?.id ?? null;
              }

              const dateStr = normalizeDateInput(
                call.args.anchor_date ?? call.args.date,
                formatDateInTimeZone(userTimezone),
              );
              const transactionResult = normalizeTransactionToolArgs(
                call.args,
                {
                  date: dateStr,
                  currency: userCurrency,
                  currencyEvidenceText: userMessageContent,
                },
              );
              if (!transactionResult.ok) {
                toolResult = { error: transactionResult.error };
                toolResponses.push({
                  functionResponse: { name: call.name, response: toolResult },
                });
                continue;
              }
              const transaction = transactionResult.transaction;
              const recurrenceRule = buildRecurrenceRule(
                call.args,
                transaction.date!,
              ) || {
                frequency: (call.args.frequency || "monthly")
                  .toString()
                  .toLowerCase(),
                interval: 1,
                anchor_date: transaction.date!,
              };
              const type = transaction.type;
              const canUseHouseholdSplits =
                !!householdId && spaceMeta?.isPortfolio !== true;
              const splitConfig = canUseHouseholdSplits
                ? await resolveHouseholdSplitConfig(
                    supabase,
                    householdId!,
                    userId,
                    transaction.amount,
                    call.args,
                  )
                : {};
              const requestedWallet = await resolveWalletForTransactionToolCall(
                supabase,
                userId,
                householdId,
                call.args,
                "twilio-whatsapp-ai-bot",
              );
              if (requestedWallet.error) {
                toolResult = { error: requestedWallet.error };
                toolResponses.push({
                  functionResponse: { name: call.name, response: toolResult },
                });
                continue;
              }
              const currencyResult = resolveWalletTransactionCurrency({
                wallet: requestedWallet,
                walletName: call.args.wallet_name || call.args.wallet_id,
                transactionCurrency: transaction.currency,
                fallbackCurrency: userCurrency,
                hasExplicitCurrency: hasExplicitTransactionCurrency(call.args),
              });
              if (currencyResult.error || !currencyResult.currency) {
                toolResult = { error: currencyResult.error };
                toolResponses.push({
                  functionResponse: { name: call.name, response: toolResult },
                });
                continue;
              }
              const { data, error } = await invokeTransactionSave(
                supabase,
                INTERNAL_FUNCTION_KEY,
                userId,
                {
                  amount: transaction.amount,
                  category: transaction.category,
                  currency: currencyResult.currency,
                  date: transaction.date!,
                  description: transaction.description,
                  merchant: transaction.merchant,
                  type,
                  householdId,
                  isPortfolio: spaceMeta?.isPortfolio ?? false,
                  accountId: requestedWallet.accountId ?? undefined,
                  payerUserId: splitConfig.payerUserId,
                  customSplits: splitConfig.customSplits,
                  isRecurring: true,
                  recurrence_rule: recurrenceRule,
                  source: call.args.source,
                  ownerType: call.args.owner_type,
                  privacyScope: call.args.privacy_scope,
                },
              );
              const success = !error && data?.success === true;
              const formatted = success
                ? ""
                : formatInvokeError(error ?? data?.error) ||
                  "Failed to save recurring transaction";
              toolResult = success
                ? { success: true, data: data?.data ?? data }
                : { error: formatted };
              if (!success) {
                if (WHATSAPP_DEBUG) {
                  debugNotes.push(`manage_recurring add error: ${formatted}`);
                }
                console.error("[twilio-whatsapp-ai-bot] recurring add error", {
                  error,
                  formatted,
                  internalAuth: {
                    source: internalKeyMeta.source,
                    fingerprint: fingerprintSecret(INTERNAL_FUNCTION_KEY),
                    keyLength: INTERNAL_FUNCTION_KEY.length,
                    httpStatus: getInvokeHttpStatus(error),
                  },
                });
                await reportTwilioToolInvokeFailure({
                  toolName: "manage_recurring",
                  targetFunction:
                    type === "income" ? "save-income" : "save-expense",
                  formatted,
                  error: error ?? data?.error,
                  context: {
                    action,
                    type,
                    amount: transaction.amount,
                    category: transaction.category,
                    householdId,
                  },
                });
              }
            } else if (action === "update") {
              const expenseIdDirect =
                typeof call.args.expense_id === "string"
                  ? call.args.expense_id.trim()
                  : "";

              const spaceNameByHouseholdId = (
                householdId: string | null | undefined,
              ) =>
                householdId ? spaceMap.get(householdId)?.name || null : null;

              const resolvedSelection = !expenseIdDirect
                ? resolveLastListedSelection(
                    readLastListedTransactions(sessionState).items || [],
                    call.args,
                    spaceNameByHouseholdId,
                  )
                : null;

              if (
                resolvedSelection &&
                "needs_disambiguation" in resolvedSelection
              ) {
                toolResult = resolvedSelection;
              } else if (resolvedSelection && "error" in resolvedSelection) {
                toolResult = { error: resolvedSelection.error };
              } else {
                const resolvedExpenseId =
                  expenseIdDirect ||
                  (resolvedSelection && "candidate" in resolvedSelection
                    ? resolvedSelection.candidate.id
                    : "");

                if (!resolvedExpenseId) {
                  toolResult = {
                    error:
                      "No matching transaction found. Ask user to list recent transactions first or provide more details.",
                  };
                } else {
                  let householdId = (call.args.space_id ||
                    call.args.household_id) as string | null;
                  const householdName = (
                    call.args.space_name ||
                    call.args.household_name ||
                    ""
                  )
                    .toString()
                    .toLowerCase();
                  let spaceMeta = householdId
                    ? spaceMap.get(householdId)
                    : undefined;
                  if (
                    !spaceMeta &&
                    householdName &&
                    spaceMap.has(householdName)
                  ) {
                    spaceMeta = spaceMap.get(householdName);
                    householdId = spaceMeta?.id ?? null;
                  }

                  const dateStr = normalizeDateInput(
                    call.args.anchor_date ?? call.args.date,
                    formatDateInTimeZone(userTimezone),
                  );
                  const recurrenceRule = buildRecurrenceRule(
                    call.args,
                    dateStr,
                  );

                  let expenseRow: any = null;
                  const hasSplitHints =
                    Array.isArray(call.args.member_splits) &&
                    call.args.member_splits.length > 0;
                  const hasPayerHint =
                    typeof call.args.payer_name === "string" &&
                    call.args.payer_name.trim().length > 0;
                  if (
                    hasSplitHints ||
                    hasPayerHint ||
                    !householdId ||
                    call.args.amount == null
                  ) {
                    const { data: row } = await supabase
                      .from("expenses")
                      .select("id, amount_cents, household_id, split_group_id")
                      .eq("id", resolvedExpenseId)
                      .is("deleted_at", null)
                      .maybeSingle();
                    expenseRow = row;
                    if (!householdId && row?.household_id) {
                      householdId = row.household_id as string;
                      spaceMeta = householdId
                        ? spaceMap.get(householdId)
                        : spaceMeta;
                    }
                  }

                  const updates: Record<string, unknown> = {};
                  if (call.args.amount != null) {
                    const amount = Number(call.args.amount);
                    if (Number.isFinite(amount)) {
                      updates.amount_cents = Math.round(amount * 100);
                    }
                  }
                  if (call.args.category != null) {
                    updates.category = call.args.category;
                  }
                  if (call.args.description != null) {
                    updates.raw_text = call.args.description;
                  }
                  if (call.args.merchant !== undefined) {
                    updates.merchant = call.args.merchant;
                  }
                  if (call.args.currency != null) {
                    updates.currency = call.args.currency;
                  }
                  if (call.args.date != null) updates.date = dateStr;
                  updates.is_recurring = true;
                  if (call.args.source != null) {
                    updates.source = call.args.source;
                  }
                  if (recurrenceRule) updates.recurrence_rule = recurrenceRule;

                  const totalForSplits = (() => {
                    if (
                      call.args.amount != null &&
                      Number.isFinite(Number(call.args.amount))
                    ) {
                      return Number(call.args.amount);
                    }
                    const cents = expenseRow?.amount_cents;
                    return typeof cents === "number" ? cents / 100 : 0;
                  })();

                  const splitConfig =
                    householdId &&
                    !spaceMeta?.isPortfolio &&
                    (hasSplitHints || hasPayerHint)
                      ? await resolveHouseholdSplitConfig(
                          supabase,
                          householdId,
                          userId,
                          totalForSplits,
                          call.args,
                        )
                      : {};

                  if (splitConfig.payerUserId) {
                    updates.payer_user_id = splitConfig.payerUserId;
                  }

                  const extraBody: Record<string, unknown> = {};
                  const hasCustomSplits =
                    !!splitConfig.customSplits &&
                    Array.isArray(splitConfig.customSplits.memberSplits) &&
                    splitConfig.customSplits.memberSplits.length > 0;
                  if (householdId && hasCustomSplits) {
                    extraBody.householdId = householdId;
                    if (expenseRow?.split_group_id) {
                      extraBody.splitUpdate = splitConfig.customSplits;
                    } else {
                      extraBody.customSplits = splitConfig.customSplits;
                    }
                  }
                  if (splitConfig.payerUserId) {
                    extraBody.payerUserId = splitConfig.payerUserId;
                  }

                  if (
                    Object.keys(updates).length === 0 &&
                    Object.keys(extraBody).length === 0
                  ) {
                    toolResult = { error: "No updates provided" };
                  } else {
                    const requestBody: Record<string, unknown> = {
                      userId,
                      expenseId: resolvedExpenseId,
                      updates,
                    };
                    if (Object.keys(extraBody).length > 0) {
                      Object.assign(requestBody, extraBody);
                    }
                    const { data, error } = await supabase.functions.invoke(
                      "update-expense",
                      {
                        body: requestBody,
                        headers: buildInternalInvokeHeaders(
                          INTERNAL_FUNCTION_KEY,
                        ),
                      },
                    );
                    const success = !error && data?.success === true;
                    const formatted = success
                      ? ""
                      : formatInvokeError(error ?? data?.error) ||
                        "Failed to update expense";
                    toolResult = success
                      ? { success: true }
                      : { error: formatted };
                    if (!success) {
                      if (WHATSAPP_DEBUG) {
                        debugNotes.push(`update-expense error: ${formatted}`);
                      }
                      console.error(
                        "[twilio-whatsapp-ai-bot] update-expense error",
                        { error, formatted },
                      );
                      await reportTwilioToolInvokeFailure({
                        toolName: "update_transaction",
                        targetFunction: "update-expense",
                        formatted,
                        error: error ?? data?.error,
                        context: {
                          expenseId: resolvedExpenseId,
                          updateKeys: Object.keys(updates),
                        },
                      });
                    }
                  }
                }
              }
            } else {
              const expenseIdDirect =
                typeof call.args.expense_id === "string"
                  ? call.args.expense_id.trim()
                  : "";
              const spaceNameByHouseholdId = (
                householdId: string | null | undefined,
              ) =>
                householdId ? spaceMap.get(householdId)?.name || null : null;
              const resolved = !expenseIdDirect
                ? resolveLastListedSelection(
                    readLastListedTransactions(sessionState).items || [],
                    call.args,
                    spaceNameByHouseholdId,
                  )
                : null;
              if (resolved && "needs_disambiguation" in resolved) {
                toolResult = resolved;
              } else if (resolved && "error" in resolved) {
                toolResult = { error: resolved.error };
              } else {
                const expenseId =
                  expenseIdDirect ||
                  (resolved && "candidate" in resolved
                    ? resolved.candidate.id
                    : "");
                if (!expenseId) {
                  toolResult = {
                    error:
                      "No matching transaction found. Ask user to list recent transactions first or provide more details.",
                  };
                } else {
                  const deleteResult = await invokeTransactionDelete(
                    supabase,
                    INTERNAL_FUNCTION_KEY,
                    userId,
                    expenseId,
                    "Failed to delete expense",
                  );
                  toolResult = deleteResult.success
                    ? { success: true }
                    : { error: deleteResult.formatted };
                  if (!deleteResult.success) {
                    if (WHATSAPP_DEBUG) {
                      debugNotes.push(
                        `delete-expense error: ${deleteResult.formatted}`,
                      );
                    }
                    console.error(
                      "[twilio-whatsapp-ai-bot] delete-expense error",
                      {
                        error: deleteResult.error,
                        formatted: deleteResult.formatted,
                      },
                    );
                    await reportTwilioToolInvokeFailure({
                      toolName: "delete_transaction",
                      targetFunction: "delete-expense",
                      formatted: deleteResult.formatted,
                      error: deleteResult.error,
                      context: { expenseId },
                    });
                  }
                }
              }
            }
          } else if (call.name === "financial_insight") {
            const snap = await buildFinancialSnapshot(
              supabase,
              contactId,
              userId,
              userCurrency,
              userTimezone,
            );
            if ("error" in snap) {
              toolResult = { error: snap.error };
            } else {
              let summary = `Snapshot ${snap.startDate} to ${snap.endDate}\n`;
              const income = snap.totalIncome / 100;
              const expense = snap.totalExpense / 100;
              const net = snap.net / 100;
              summary += `Income: ${formatAmount(income, userCurrency)}\n`;
              summary += `Spending: ${formatAmount(expense, userCurrency)}\n`;
              summary += `Net: ${formatAmount(
                net,
                userCurrency,
              )}\n\nTop categories:\n`;
              snap.categories.forEach((c, idx) => {
                summary += `${idx + 1}. ${c.category}: ${formatAmount(
                  c.amount_cents / 100,
                  userCurrency,
                )}\n`;
              });
              if (snap.budget_cents) {
                const remain = (snap.budget_cents - snap.totalExpense) / 100;
                summary += `\nBudget: ${formatAmount(
                  snap.budget_cents / 100,
                  userCurrency,
                )} | Remaining: ${formatAmount(remain, userCurrency)}`;
              }
              toolResult = {
                snapshot: snap,
                chart_url: snap.chart_url,
                summary,
              };
            }
          }
        } catch (e) {
          toolResult = { error: String(e) };
          if (WHATSAPP_DEBUG) {
            debugNotes.push(`tool exception (${call.name}): ${String(e)}`);
          }
        }

        lastToolResult = toolResult;
        lastToolCallName = typeof call?.name === "string" ? call.name : null;
        // Promote chart URLs from tool payloads so media still attaches when
        // the model follows instructions and does not echo the URL in text.
        const chartFromTool = extractChartMediaUrlFromToolResult(toolResult);
        if (chartFromTool) {
          lastGeneratedChartUrl = chartFromTool;
        }

        const succeeded = (toolResult as any)?.success === true;
        if (succeeded) {
          toolSucceededAny = true;
          if (isWriteMutationToolName(call.name)) {
            writeMutationSucceededAny = true;
          }
          if (call.name === "confirm_budget" || call.name === "set_budget") {
            const pocketsRaw = Array.isArray((toolResult as any)?.pockets)
              ? ((toolResult as any).pockets as any[])
              : [];
            lastBudgetPockets = pocketsRaw.map((p) => ({
              name: String(p?.name || "").trim(),
              percentage: Number(p?.percentage) || 0,
            }));
          }
        }
        toolResponses.push({
          functionResponse: {
            name: call.name,
            response: toolResult,
          },
        });
      }

      // Send tool outputs back to Gemini with error handling
      try {
        const nextResult = await sendGeminiMessageWithRetry(
          activeChat as any,
          toolResponses,
          {
            preRequestDelayMs: GEMINI_PRE_REQUEST_DELAY_MS,
            maxRetries: GEMINI_MAX_RETRIES,
            logPrefix: "twilio-whatsapp-ai-bot",
            fallbackModelName: FALLBACK_MODEL_NAME,
            fallbackChatFactory: (modelName, history) => {
              return createVertexBotChatSession({
                modelName,
                systemInstruction: whatsappSystemInstruction,
                history,
                tools: [
                  { function_declarations: cloneBotToolDeclarations(tools) },
                ] as any,
                vertexConfig,
              });
            },
            onChatSwitched: (chatSession) => {
              activeChat = chatSession as any;
            },
          },
        );
        response = await nextResult.response;
        functionCalls = (response.functionCalls() as any[]) || [];
        const candidate = response.text();
        if (candidate && candidate.trim()) {
          finalResponseText = candidate;
        }
      } catch (e) {
        console.error(
          "[twilio-whatsapp-ai-bot] Failed to get final AI response:",
          e,
        );
        await reportVertexAiFailure({
          functionName: "twilio-whatsapp-ai-bot",
          error: e,
          phase: "final_ai_response",
          modelName: MODEL_NAME,
          context: {
            toolIterations,
            lastToolCalls: functionCalls?.length || 0,
          },
        });
        finalResponseText = isRetryableGeminiError(e)
          ? buildGeminiHighDemandMessage(userLang)
          : buildProcessingFailureMessage(userLang);
        if (WHATSAPP_DEBUG) debugNotes.push(`AI response error: ${String(e)}`);
        functionCalls = null;
      }

      toolIterations++;
    }

    // 7. Finalize Response
    finalResponseText = finalizeBotResponseText({
      finalResponseText,
      toolSucceededAny,
      lastBudgetPockets,
      lastToolCallName,
      lastToolResult,
      writeMutationSucceededAny,
      emptyFallbackText: buildProcessingFailureMessage(userLang),
      onMutationClaimBlocked: (kind, context) => {
        const label =
          kind === "transaction"
            ? "[twilio-whatsapp-ai-bot] final-response mutation-claim blocked"
            : kind === "wallet"
              ? "[twilio-whatsapp-ai-bot] final-response wallet mutation-claim blocked"
              : "[twilio-whatsapp-ai-bot] final-response generic mutation-claim blocked";
        console.log(label, context);
      },
    });
    const chartFromText = extractQuickChartUrl(finalResponseText);
    let mediaUrl: string | null = chartFromText.url || lastGeneratedChartUrl;
    let cleanedText = chartFromText.cleanedText || finalResponseText;

    if (mediaUrl) {
      mediaUrl = await normalizeQuickChartMediaUrl(mediaUrl);
    }

    if (mediaUrl && !cleanedText) {
      cleanedText = "Chart attached. 📊";
    }

    persistedContent = cleanedText;
    const bodyToSend = truncateTextByCodePoints(
      cleanedText,
      Math.min(WHATSAPP_CHUNK_TARGET_CHARS, 1500),
    );

    // Persist the incoming user message AFTER model/tool flow so Gemini doesn't see it twice.
    await insertChatMessage(
      supabase,
      sessionId,
      "user",
      userMessageContent,
      debugNotes,
      WHATSAPP_DEBUG,
    );

    // Save assistant message with final content (for context)
    await insertChatMessage(
      supabase,
      sessionId,
      "assistant",
      persistedContent,
      debugNotes,
      WHATSAPP_DEBUG,
    );

    // If we're sending a chart, respond quickly then send media via Twilio API asynchronously
    const immediateText = bodyToSend;
    debugLog(WHATSAPP_DEBUG, "final response", {
      immediateText,
      persistedContent,
    });

    return {
      bodyToSend,
      persistedContent,
      immediateText,
      finalResponseText: cleanedText,
      mediaUrl,
    };
  };

  const deliverTwilioResponse = async (
    computed: {
      bodyToSend: string;
      persistedContent: string;
      immediateText: string;
      mediaUrl?: string | null;
    },
    deliveryMode: "twiml" | "api",
  ): Promise<Response> => {
    const { bodyToSend, persistedContent, immediateText, mediaUrl } = computed;

    if (mediaUrl) {
      // Always deliver media through the Twilio Messages API path so we can
      // observe send failures and apply a deterministic fallback/idempotency state.
      await sendTwilioWhatsAppTypingIndicator(
        twilioAccountSid,
        twilioAuthToken,
        messageSid,
      );
      const mediaBody = truncateTextByCodePoints(
        bodyToSend || immediateText,
        Math.min(WHATSAPP_CHUNK_TARGET_CHARS, 1500),
      );
      const sendResult = await sendWhatsAppMessage(
        twilioAccountSid,
        twilioAuthToken,
        to,
        from,
        mediaBody,
        mediaUrl,
      );

      if (!sendResult.success) {
        console.error(
          "[twilio-whatsapp-ai-bot] Failed to send media WhatsApp message:",
          { error: sendResult.error, deliveryMode },
        );
        const fallbackResult = await sendWhatsAppMessage(
          twilioAccountSid,
          twilioAuthToken,
          to,
          from,
          DELIVERY_FAILURE_MESSAGE,
        );
        if (!fallbackResult.success) {
          console.error(
            "[twilio-whatsapp-ai-bot] Failed to send fallback WhatsApp message:",
            fallbackResult.error,
          );
        }
        if (idempotencyKey) {
          await updateTwilioIdempotency(supabase, idempotencyKey, {
            status: "failed",
            delivery: "api",
            response_text: persistedContent,
            media_url: mediaUrl || undefined,
            error: sendResult.error || "unknown",
          });
        }
        return xmlResponse(buildTwimlMessage(null));
      }

      if (idempotencyKey) {
        await updateTwilioIdempotency(supabase, idempotencyKey, {
          status: "done",
          delivery: "api",
          response_text: persistedContent,
          media_url: mediaUrl || undefined,
        });
      }

      return xmlResponse(buildTwimlMessage(null));
    }

    if (deliveryMode === "api") {
      const sendResult = await sendWhatsAppMessageInChunks(
        twilioAccountSid,
        twilioAuthToken,
        to,
        from,
        bodyToSend,
      );
      if (!sendResult.success) {
        console.error(
          "[twilio-whatsapp-ai-bot] Failed to send WhatsApp message:",
          {
            error: sendResult.error,
            sentChunks: (sendResult as any).sentChunks,
            totalChunks: (sendResult as any).totalChunks,
          },
        );
        const fallbackResult = await sendWhatsAppMessage(
          twilioAccountSid,
          twilioAuthToken,
          to,
          from,
          DELIVERY_FAILURE_MESSAGE,
        );
        if (!fallbackResult.success) {
          console.error(
            "[twilio-whatsapp-ai-bot] Failed to send fallback WhatsApp message:",
            fallbackResult.error,
          );
        }
        if (idempotencyKey) {
          await updateTwilioIdempotency(supabase, idempotencyKey, {
            status: "failed",
            delivery: "api",
            response_text: persistedContent,
            media_url: mediaUrl || undefined,
            error: sendResult.error || "unknown",
          });
        }
        return xmlResponse(buildTwimlMessage(null));
      }
      if (idempotencyKey) {
        await updateTwilioIdempotency(supabase, idempotencyKey, {
          status: "done",
          delivery: "api",
          response_text: persistedContent,
          media_url: mediaUrl || undefined,
        });
      }
      return xmlResponse(buildTwimlMessage(null));
    }

    if (Array.from(immediateText).length > WHATSAPP_CHUNK_TARGET_CHARS) {
      const sendResult = await sendWhatsAppMessageInChunks(
        twilioAccountSid,
        twilioAuthToken,
        to,
        from,
        immediateText,
      );
      if (!sendResult.success) {
        console.error(
          "[twilio-whatsapp-ai-bot] Failed to send long TwiML response via API:",
          {
            error: sendResult.error,
            sentChunks: sendResult.sentChunks,
            totalChunks: sendResult.totalChunks,
          },
        );
        const fallbackResult = await sendWhatsAppMessage(
          twilioAccountSid,
          twilioAuthToken,
          to,
          from,
          DELIVERY_FAILURE_MESSAGE,
        );
        if (!fallbackResult.success) {
          console.error(
            "[twilio-whatsapp-ai-bot] Failed to send fallback WhatsApp message:",
            fallbackResult.error,
          );
        }
        if (idempotencyKey) {
          await updateTwilioIdempotency(supabase, idempotencyKey, {
            status: "failed",
            delivery: "api",
            response_text: persistedContent,
            media_url: mediaUrl || undefined,
            error: sendResult.error || "unknown",
          });
        }
        return xmlResponse(buildTwimlMessage(null));
      }

      if (idempotencyKey) {
        await updateTwilioIdempotency(supabase, idempotencyKey, {
          status: "done",
          delivery: "api",
          response_text: persistedContent,
          media_url: mediaUrl || undefined,
        });
      }
      return xmlResponse(buildTwimlMessage(null));
    }

    if (idempotencyKey) {
      await updateTwilioIdempotency(supabase, idempotencyKey, {
        status: "done",
        delivery: "twiml",
        response_text: persistedContent,
        media_url: mediaUrl || undefined,
      });
    }

    // Return TwiML with immediate response (no media)
    return xmlResponse(buildTwimlMessage(immediateText, mediaUrl || null));
  };

  if (shouldAckEarly) {
    await sendTwilioWhatsAppTypingIndicator(
      twilioAccountSid,
      twilioAuthToken,
      messageSid,
    );
    const cancelTypingFollowUp = scheduleTwilioTypingFollowUp(
      twilioAccountSid,
      twilioAuthToken,
      messageSid,
    );
    runBackgroundTask(
      (async () => {
        try {
          const computed = await computeTwilioResponse();
          await deliverTwilioResponse(computed, "api");
        } catch (error) {
          console.error(
            "[twilio-whatsapp-ai-bot] Async processing failed:",
            error,
          );
          const errorMessage = isRetryableGeminiError(error)
            ? buildGeminiHighDemandMessage(userLang)
            : buildProcessingFailureMessage(userLang);
          await sendWhatsAppMessage(
            twilioAccountSid,
            twilioAuthToken,
            to,
            from,
            errorMessage,
          );
          if (idempotencyKey) {
            await updateTwilioIdempotency(supabase, idempotencyKey, {
              status: "failed",
              delivery: "api",
              response_text: "async_processing_failed",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        } finally {
          cancelTypingFollowUp();
        }
      })(),
    );
    return xmlResponse(buildTwimlMessage(null));
  }

  const computePromise = computeTwilioResponse()
    .then((data) => ({ type: "done" as const, data }))
    .catch((error) => ({ type: "error" as const, error }));

  const timeoutPromise = new Promise<{ type: "timeout" }>((resolve) =>
    setTimeout(() => resolve({ type: "timeout" }), PROCESSING_ACK_DELAY_MS),
  );

  const raceResult = await Promise.race([computePromise, timeoutPromise]);

  if (raceResult.type === "done") {
    try {
      return await deliverTwilioResponse(raceResult.data, "twiml");
    } catch (error) {
      console.error("[twilio-whatsapp-ai-bot] Delivery failed:", error);
      await reportBotBackendError({
        functionName: "twilio-whatsapp-ai-bot",
        phase: "deliver_twiml_response",
        error,
        context: {
          idempotencyKey,
        },
      });
      if (idempotencyKey) {
        await updateTwilioIdempotency(supabase, idempotencyKey, {
          status: "failed",
          delivery: "twiml",
          response_text: "processing_failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return xmlResponse(
        buildTwimlMessage(
          isRetryableGeminiError(error)
            ? buildGeminiHighDemandMessage(userLang)
            : buildProcessingFailureMessage(userLang),
        ),
      );
    }
  }

  if (raceResult.type === "error") {
    console.error(
      "[twilio-whatsapp-ai-bot] Processing failed:",
      raceResult.error,
    );
    await reportBotBackendError({
      functionName: "twilio-whatsapp-ai-bot",
      phase: "process_request",
      error: raceResult.error,
      context: {
        idempotencyKey,
      },
    });
    if (idempotencyKey) {
      await updateTwilioIdempotency(supabase, idempotencyKey, {
        status: "failed",
        delivery: "twiml",
        response_text: "processing_failed",
        error:
          raceResult.error instanceof Error
            ? raceResult.error.message
            : String(raceResult.error),
      });
    }
    return xmlResponse(
      buildTwimlMessage(
        isRetryableGeminiError(raceResult.error)
          ? buildGeminiHighDemandMessage(userLang)
          : buildProcessingFailureMessage(userLang),
      ),
    );
  }

  await sendTwilioWhatsAppTypingIndicator(
    twilioAccountSid,
    twilioAuthToken,
    messageSid,
  );
  const cancelTypingFollowUp = scheduleTwilioTypingFollowUp(
    twilioAccountSid,
    twilioAuthToken,
    messageSid,
  );
  runBackgroundTask(
    (async () => {
      try {
        const result = await computePromise;
        if (result.type === "done") {
          await deliverTwilioResponse(result.data, "api");
        } else {
          const errorMessage = isRetryableGeminiError(result.error)
            ? buildGeminiHighDemandMessage(userLang)
            : buildProcessingFailureMessage(userLang);
          await sendWhatsAppMessage(
            twilioAccountSid,
            twilioAuthToken,
            to,
            from,
            errorMessage,
          );
          if (idempotencyKey) {
            await updateTwilioIdempotency(supabase, idempotencyKey, {
              status: "failed",
              delivery: "api",
              response_text: "processing_failed",
              error:
                result.error instanceof Error
                  ? result.error.message
                  : String(result.error),
            });
          }
        }
      } catch (error) {
        console.error("[twilio-whatsapp-ai-bot] Async delivery failed:", error);
        await reportBotBackendError({
          functionName: "twilio-whatsapp-ai-bot",
          phase: "deliver_async_response",
          error,
          context: {
            idempotencyKey,
          },
        });
        if (idempotencyKey) {
          await updateTwilioIdempotency(supabase, idempotencyKey, {
            status: "failed",
            delivery: "api",
            response_text: "processing_failed",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        cancelTypingFollowUp();
      }
    })(),
  );

  return xmlResponse(buildTwimlMessage(null));
});
