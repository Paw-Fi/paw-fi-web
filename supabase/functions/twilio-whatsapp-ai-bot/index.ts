// Supabase Edge Function: twilio-whatsapp-ai-bot
// Handles WhatsApp messages via Twilio, using Gemini AI and MCP-style tools.

import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { corsHeaders } from "../shared/cors.ts";
import {
  buildVerificationPrompt,
  sendWhatsAppTemplate,
  sendWhatsAppMessage,
} from "../shared/whatsapp-helpers.ts";
import { isFreeUser } from "../shared/is-free-user.ts";
import { TWILIO_TEMPLATES } from "../shared/twilio-templates.ts";
import {
  fetchExpensesDirect,
  saveExpenseDirect,
} from "../shared/expenses-helpers.ts";
import type { CustomSplits, MemberSplit } from "../shared/expenses-helpers.ts";
import {
  createOrUpdateBudget,
  upsertEnvelope,
  upsertEnvelopeAllocation,
  upsertEnvelopeCategoryLink,
  getBudgetStatusDirect,
} from "../shared/budgets-helpers.ts";
import { insertChatMessage } from "../shared/chat-helpers.ts";
import { updatePreferredCurrency } from "../shared/currency-helpers.ts";
import {
  debugLog,
  formatInvokeError,
  normalizeExpensesForTool,
  buildCategoryChart,
  CATEGORY_GUIDE,
  formatAmount,
} from "../shared/formatting-helpers.ts";
import {
  runAnalyzeExpense,
  buildXlsxPreview,
  summarizePdfWithGemini,
} from "../shared/analyze-core.ts";

// --- Constants & Types ---

const MODEL_NAME = "gemini-2.5-flash"; // Fast and capable
const SYSTEM_INSTRUCTION = `You are Moneko, a helpful and friendly financial assistant on WhatsApp.
Your goal is to help users track expenses, manage budgets, and view their financial health.
You can handle personal finances and shared spaces.

CRITICAL RULES:
1.  **Currency**: Always use the user's preferred currency or the currency detected in the text. If ambiguous, ask.
    - Use currency symbols (€, $, £, ₦, etc.) when replying instead of ISO codes.
2.  **Spaces**: If the user asks about “spaces” (e.g., family, roommates, portfolio), clarify which space if they have multiple, or use the household_id + is_portfolio provided in context.
3.  **Confirmation**: For ambiguous requests (e.g., "5 coffee"), ask for clarification (Personal or which space? Which category?).
    - Infer a category from the text and propose it (e.g., "latte" -> "food & drink"). Ask for quick confirmation before saving.
4.  **Charts**: If the user asks for a chart or graph, use the 'generate_chart_url' tool and provide the URL in your response. Explain that you are sending an image.
5.  **Recurring**: If the user says "monthly", "weekly", "every month", etc., set 'is_recurring' to true.
6.  **Tone**: Enthusiastic, encouraging, concise, and proactive (suitable for WhatsApp). Use light emojis, and close with a quick follow-up offer to help further (e.g., suggest related actions like totals, budgets, or recurring setup).
7.  **Totals**: When listing or summarizing expenses, always include a total spent for the requested range and mention how many items are shown.
8.  **Safety**: Do not reveal sensitive IDs. Refer to each space by its name only.
9.  **Budgets/Pockets**: Budgets live in the budgets table. They can be split across pockets (envelopes) with percentage shares. When setting a budget, propose a total and how to split it across relevant pockets; create multiple pocket budgets if the user asks for splits.
10. **Pockets/Envelopes Actions**: You can create/update/delete envelopes via set_pocket/delete_pocket, set monthly allocations, link categories to envelopes, and show envelope status (alloc/spent/remaining) for a month.
11. **Reminders/Recurring**: Recurring transactions can include reminders; ask for frequency and whether to set a reminder if the user hints at it.
12. **Income vs Expense**: All transactions live in the "expenses" table with type = "expense" or "income". Default to expense if unclear. Always set the type when listing, adding, updating, or recurring. For space queries, use household_id to include transactions from all members; for personal, use contact_id with household_id IS NULL.
12. **Tooling discipline**: For add/update/delete/recurring/budget/envelope requests, call the appropriate tool. For recurring requests without a frequency, default to monthly. For incomes, set type="income".
13. **Bulk imports**: When the user uploads a receipt, bank statement, or file with multiple transactions, use 'add_transactions_batch' to save them all at once (more efficient than multiple add_transaction calls). Present a summary of all items for confirmation before saving.
14. **Privacy**: Never show raw IDs (household_id, expense_id, etc.) to the user. Refer to spaces by name only; if multiple, offer names, not IDs.
15. **Currency updates**: Preferred currency is stored in user_contacts.preferred_currency. When the user asks to change currency, call the currency tool to update that column and confirm.
16. **Options**: When offering choices (spaces, pockets, budgets, follow-up options), list them as numbered text and ask the user to reply with the number or name.
17. **Splits**: For space expenses, support who paid + how to split. If the user says "paid by X" and/or provides per-member splits, call 'add_transaction' with 'payer_name', 'split_type', and 'member_splits'. If split is not specified, default to an equal split among space members.
18. **Financial snapshot**: For asks like "current financial situation/health/status": provide one concise snapshot for the current month/pay-period: verdict, income vs spending (or say income not tracked), net, top 3–5 categories with % of spend, budget status (remaining/over/under + days left), upcoming recurring (next ~7 days), and 1–2 actions. If you send a chart, prefer a radar or donut of spending by category (not gauges). Always include the text summary; the chart is optional/secondary.
19. **Language**: Respond in the user's preferred language: {{LANGUAGE}}.

COMMON USER INTENTS (answer directly, propose next steps):
- Spending clarity: where money goes, why cash runs out, breakdowns by category, spot leaks, compare to norms.
- Cut costs: subscriptions, coffee, shopping, bills; suggest easy wins and alerts on jumps.
- Budgets: simple weekly/monthly limits, paycheck-aligned resets, category caps, envelopes, unpredictable expense cushions.
- Debt/overspending: payoff order, overdraft awareness, guardrails against impulse buys, nudges before risky spends.
- Emotional spending: cool-off rules, goal reminders before purchases, takeaway caps.
- Savings: emergency fund pace, holiday savings, “what if I cut X”, realistic monthly save targets.

CURRENT CONTEXT:
- Date: {{DATE}}
- User Currency: {{CURRENCY}}
- Spaces: {{HOUSEHOLDS}}
- Categories (with brand colors): {{CATEGORIES}}
`;
const WHATSAPP_BUDGET_FLOW = `
WHATSAPP BUDGET FLOW (WhatsApp only):
- When the user asks to set/create a budget or pockets, call "draft_budget" with the proposed amount and pockets, then ask for confirmation.
- When the user confirms (e.g., yes/ok/sounds good), call "confirm_budget" to finalize without re-asking for amounts unless missing.
- Only call "set_budget" directly if the user explicitly asks to set it now and the full amount is present in the same message.
`;
const WHATSAPP_SYSTEM_INSTRUCTION = `${SYSTEM_INSTRUCTION}\n${WHATSAPP_BUDGET_FLOW}`;

const PROCESSING_ACK_MESSAGES = [
      "I’m looking into that for you now.",
    "One moment while I process your request.",
    "I am gathering the information you requested.",
    "Just a moment while I review those details.",
    "Processing your inquiry. Stand by, please.",
    "I’m working on a response for you.",
    "Checking my records for the most accurate information.",
    "I’m analyzing your request now.",
    "One second while I pull up that information.",
    "I am currently formulating your answer.",
    "Retrieving the requested data. One moment.",
    "I'm reviewing the specifics of your message.",
    "Stand by while I finalize your request.",
    "I am cross-referencing that for you now.",
    "Just a moment while I prepare the details.",
    "I’m prioritizing your request. Please wait.",
    "Searching for the most relevant information.",
    "I will have an answer for you in just a moment.",
    "Thank you for your patience; I'm looking into this.",
    "I am currently processing your input.",
    "Just a quick second while I verify those details.",
    "Reviewing your request to ensure accuracy.",
    "I’m pulling together the information you need.",
    "One moment while I sync with the database.",
    "Briefly reviewing your input now.",
    "I am preparing a detailed response for you.",
    "Just a moment while I look into that.",
    "Processing... I'll be with you in a second.",
    "Checking the available data to assist you.",
    "I am currently working on your request."
];
const PROCESSING_ACK_DELAY_MS = 3000;
const IDEMPOTENCY_TTL_MINUTES = 60;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

type IdempotencyRecord = {
  status: "processing" | "done" | "failed";
  ack_text?: string;
  response_text?: string;
  media_url?: string;
  delivery?: "twiml" | "api" | "template";
  error?: string;
};

// --- Helper Functions ---
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function xmlResponse(xml: string, status = 200) {
  return new Response(xml, {
    status,
    headers: { "Content-Type": "text/xml" },
  });
}

function buildTwimlMessage(message?: string | null) {
  if (!message) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>`;
  }
  const textEsc = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${textEsc}</Message></Response>`;
}

function runBackgroundTask(task: Promise<unknown>) {
  const edgeRuntime = (globalThis as any)?.EdgeRuntime;
  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(task);
    return;
  }
  void task;
}

async function runAnalyzeExpenseWithTimeout(
  payload: any,
  apiKey: string,
  timeoutMs: number,
  timeoutError: string,
): Promise<any> {
  try {
    const analysisPromise = runAnalyzeExpense(payload, apiKey);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });

    return await Promise.race([analysisPromise, timeoutPromise]);
  } catch (error) {
    console.error(
      "[twilio-whatsapp-ai-bot] analyze-expense timeout/error:",
      error,
    );
    return {
      success: false,
      error: timeoutError,
      language: "en",
    };
  }
}

function pickProcessingMessage(seed?: string | null) {
  if (!PROCESSING_ACK_MESSAGES.length) {
    return "Processing your request now. ⏳";
  }
  if (!seed) {
    const idx = Math.floor(Math.random() * PROCESSING_ACK_MESSAGES.length);
    return PROCESSING_ACK_MESSAGES[idx];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PROCESSING_ACK_MESSAGES.length;
  return PROCESSING_ACK_MESSAGES[idx];
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

function normalizeDateInput(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
}

const BUDGET_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type PendingBudgetDraft = {
  amount: number;
  currency: string;
  date: string;
  period_month: string;
  household_id: string | null;
  household_name?: string;
  is_portfolio?: boolean;
  pockets?: NormalizedPocket[];
  created_at: string;
};

type SessionState = {
  moneko_state?: {
    pending_budget?: PendingBudgetDraft;
  };
};

function normalizeSessionState(raw: unknown): SessionState {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as SessionState;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as SessionState;
      }
    } catch {
      // ignore parse errors
    }
  }
  return {};
}

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
  if (!draft.period_month || typeof draft.period_month !== "string")
    return null;
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

async function loadSessionState(
  supabase: SupabaseJsClient,
  sessionId: string,
  debugNotes: string[],
  debugEnabled: boolean,
): Promise<SessionState> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("system_prompt")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) {
    const formatted = formatInvokeError(error);
    if (debugEnabled)
      debugNotes.push(`chat_sessions load state error: ${formatted}`);
    console.error("[twilio-whatsapp-ai-bot] chat_sessions state load error", {
      error,
      formatted,
    });
    return {};
  }
  return normalizeSessionState((data as any)?.system_prompt);
}

async function saveSessionState(
  supabase: SupabaseJsClient,
  sessionId: string,
  state: SessionState,
  debugNotes: string[],
  debugEnabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      system_prompt: state,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) {
    const formatted = formatInvokeError(error);
    if (debugEnabled)
      debugNotes.push(`chat_sessions save state error: ${formatted}`);
    console.error("[twilio-whatsapp-ai-bot] chat_sessions state save error", {
      error,
      formatted,
    });
  }
}

async function ensureHouseholdMember(
  supabase: SupabaseJsClient,
  householdId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

async function resolveBudgetForScope(
  supabase: SupabaseJsClient,
  userId: string,
  householdId: string | null,
  period_month: string,
  currency: string,
  isPortfolio: boolean,
) {
  let query = supabase
    .from("budgets")
    .select("id, total_budget_cents, currency, period_month")
    .eq("user_id", userId)
    .eq("currency", currency)
    .eq("period_month", period_month)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (householdId) {
    query = query
      .eq("household_id", householdId)
      .eq("is_portfolio", isPortfolio === true);
  } else {
    query = query.is("household_id", null).is("is_portfolio", null);
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

function rebalancePocketPercentages(
  desiredPct: number,
  others: Array<{ id: string; percentage: number }>,
): Record<string, number> {
  const precision = 4;
  const roundedDesired = Number(desiredPct.toFixed(precision));
  const totalOther = others.reduce((sum, p) => sum + (p.percentage || 0), 0);
  const currentTotal = roundedDesired + totalOther;
  const updated: Record<string, number> = {};

  if (currentTotal > 100 + 0.0001) {
    const available = Math.max(0, 100 - roundedDesired);
    if (totalOther <= 0 || available <= 0) {
      return updated;
    }
    const factor = available / totalOther;
    let remaining = available;
    for (let i = 0; i < others.length; i++) {
      const raw = Math.max(0, (others[i].percentage || 0) * factor);
      const pct =
        i === others.length - 1 ? remaining : Number(raw.toFixed(precision));
      remaining -= pct;
      updated[others[i].id] = Number(pct.toFixed(precision));
    }
  } else {
    for (const p of others) {
      updated[p.id] = Number((p.percentage || 0).toFixed(precision));
    }
  }

  return updated;
}

function buildRecurrenceRule(args: any, fallbackAnchor: string) {
  const provided = args?.recurrence_rule;
  if (provided && typeof provided === "object" && !Array.isArray(provided)) {
    return provided as Record<string, unknown>;
  }

  const frequency =
    typeof args?.frequency === "string" && args.frequency.trim()
      ? args.frequency.trim().toLowerCase()
      : null;
  const interval = Number.isFinite(args?.interval)
    ? Math.trunc(args.interval)
    : null;
  const anchor_date = normalizeDateInput(args?.anchor_date, fallbackAnchor);
  const end_date =
    typeof args?.end_date === "string" && args.end_date.trim()
      ? normalizeDateInput(args.end_date, "")
      : "";
  const reminderValue = Number.isFinite(args?.reminder_value)
    ? Math.trunc(args.reminder_value)
    : null;
  const reminderUnit =
    typeof args?.reminder_unit === "string" ? args.reminder_unit : null;

  if (!frequency) return null;

  const rule: Record<string, unknown> = {
    frequency,
    anchor_date,
  };

  if (interval && interval > 0) rule.interval = interval;
  if (end_date) rule.end_date = end_date;
  if (reminderValue && reminderUnit) {
    rule.reminder = { enabled: true, value: reminderValue, unit: reminderUnit };
  }

  return rule;
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
  ackText?: string | null,
  ttlMinutes: number = IDEMPOTENCY_TTL_MINUTES,
): Promise<{ status: "new" | "duplicate"; result?: IdempotencyRecord | null }> {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const result: IdempotencyRecord = { status: "processing" };
  if (ackText) result.ack_text = ackText;

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

function decodeBase64(data: string): Uint8Array {
  const cleaned = data.replace(/^data:.*;base64,/, "");
  const bin = atob(cleaned);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// Safe Uint8Array -> base64 encoder that avoids spreading large buffers into String.fromCharCode
function uint8ToBase64(buf: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // 32k chunk to avoid large argument lists
  for (let i = 0; i < buf.length; i += chunkSize) {
    const subarray = buf.subarray(i, Math.min(i + chunkSize, buf.length));
    binary += String.fromCharCode.apply(null, Array.from(subarray));
  }
  return btoa(binary);
}

function getDatePartsInTimeZone(
  tz: string | null | undefined,
  date = new Date(),
) {
  const timezone = (tz || "UTC").trim();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const map = new Map(parts.map((p) => [p.type, p.value]));
    return {
      year: Number(map.get("year")),
      month: Number(map.get("month")),
      day: Number(map.get("day")),
    };
  } catch {
    const match = timezone
      .toUpperCase()
      .match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (match) {
      const sign = match[1] === "-" ? -1 : 1;
      const hours = Number(match[2]);
      const minutes = Number(match[3] || "0");
      const offsetMinutes = sign * (hours * 60 + minutes);
      const shifted = new Date(date.getTime() + offsetMinutes * 60 * 1000);
      return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
      };
    }
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDateInTimeZone(
  tz: string | null | undefined,
  date = new Date(),
) {
  const { year, month, day } = getDatePartsInTimeZone(tz, date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatMonthStartInTimeZone(
  tz: string | null | undefined,
  date = new Date(),
) {
  const { year, month } = getDatePartsInTimeZone(tz, date);
  return `${year}-${pad2(month)}-01`;
}

function nextMonthStart(dateStr: string) {
  const [yearStr, monthStr] = dateStr.split("-").slice(0, 2);
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // JS months 0-based
  const dt = new Date(Date.UTC(year, month, 1));
  dt.setUTCMonth(dt.getUTCMonth() + 1);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-01`;
}

function normalizeNameForMatch(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/@.*/, "") // drop email domain
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveMemberIdByName(
  members: Array<{
    user_id: string;
    users?: { full_name?: string | null; email?: string | null } | null;
  }>,
  query: string,
): string | null {
  const q = normalizeNameForMatch(query);
  if (!q) return null;

  const matches: string[] = [];
  for (const m of members) {
    const name = normalizeNameForMatch(m.users?.full_name || "");
    const email = normalizeNameForMatch(m.users?.email || "");
    if (!m.user_id) continue;
    if (name === q || email === q) matches.push(m.user_id);
    else if (name.includes(q) || email.includes(q)) matches.push(m.user_id);
  }
  const unique = Array.from(new Set(matches));
  if (unique.length !== 1) return null;
  return unique[0];
}

async function resolveHouseholdSplitConfig(
  supabase: SupabaseJsClient,
  householdId: string,
  actorUserId: string,
  totalAmount: number,
  args: any,
): Promise<{ payerUserId?: string; customSplits?: CustomSplits }> {
  const payerName = (args.payer_name || args.paid_by || "").toString().trim();
  const splitTypeHint = (args.split_type || "").toString().trim().toLowerCase();
  const memberSplitsRaw = Array.isArray(args.member_splits)
    ? args.member_splits
    : [];

  const { data: members, error } = await supabase
    .from("household_members")
    .select("user_id, users(full_name, email)")
    .eq("household_id", householdId);
  if (error || !members || members.length === 0) return {};

  const memberIds = members
    .map((m: any) => m.user_id as string)
    .filter(Boolean);
  if (memberIds.length === 0) return {};

  const payerUserId = payerName
    ? resolveMemberIdByName(members as any, payerName) || actorUserId
    : actorUserId;

  if (!memberSplitsRaw.length) {
    // No split specified: default equal split (omit customSplits).
    return { payerUserId };
  }

  const inferredType = (() => {
    if (["equal", "amount", "percentage", "shares"].includes(splitTypeHint))
      return splitTypeHint;
    const hasPct = memberSplitsRaw.some(
      (s: any) => typeof s?.percentage === "number",
    );
    const hasShares = memberSplitsRaw.some(
      (s: any) => typeof s?.shares === "number",
    );
    return hasPct ? "percentage" : hasShares ? "shares" : "amount";
  })();

  const byId = new Map<string, any>();
  for (const s of memberSplitsRaw) {
    const memberName = (s?.member_name || s?.member || s?.name || "")
      .toString()
      .trim();
    if (!memberName) continue;
    const memberId = resolveMemberIdByName(members as any, memberName);
    if (!memberId) continue;
    byId.set(memberId, s);
  }

  const total = Number.isFinite(totalAmount) ? Math.max(0, totalAmount) : 0;

  const fullSplits: MemberSplit[] = [];
  if (inferredType === "amount") {
    let specifiedSum = 0;
    const missing: string[] = [];
    for (const id of memberIds) {
      const s = byId.get(id);
      const amt = typeof s?.amount === "number" ? Math.max(0, s.amount) : null;
      if (amt == null) missing.push(id);
      else specifiedSum += amt;
    }
    const remaining = Math.max(0, total - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;
    for (const id of memberIds) {
      const s = byId.get(id);
      const amt =
        typeof s?.amount === "number" ? Math.max(0, s.amount) : perMissing;
      fullSplits.push({ userId: id, amount: amt });
    }
    const sum = fullSplits.reduce((acc, s) => acc + (s.amount || 0), 0);
    const diff = total - sum;
    if (fullSplits.length && Math.abs(diff) > 1e-6) {
      fullSplits[fullSplits.length - 1].amount = Math.max(
        0,
        (fullSplits[fullSplits.length - 1].amount || 0) + diff,
      );
    }
  } else if (inferredType === "percentage") {
    let specifiedSum = 0;
    const missing: string[] = [];
    for (const id of memberIds) {
      const s = byId.get(id);
      const pct =
        typeof s?.percentage === "number"
          ? Math.max(0, Math.min(100, s.percentage))
          : null;
      if (pct == null) missing.push(id);
      else specifiedSum += pct;
    }
    const remaining = Math.max(0, 100 - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;
    for (const id of memberIds) {
      const s = byId.get(id);
      const pct =
        typeof s?.percentage === "number"
          ? Math.max(0, Math.min(100, s.percentage))
          : perMissing;
      fullSplits.push({ userId: id, percentage: pct });
    }
    const sum = fullSplits.reduce((acc, s) => acc + (s.percentage || 0), 0);
    const diff = 100 - sum;
    if (fullSplits.length && Math.abs(diff) > 1e-6) {
      fullSplits[fullSplits.length - 1].percentage = Math.max(
        0,
        (fullSplits[fullSplits.length - 1].percentage || 0) + diff,
      );
    }
  } else if (inferredType === "shares") {
    for (const id of memberIds) {
      const s = byId.get(id);
      const shares =
        typeof s?.shares === "number" ? Math.max(1, Math.trunc(s.shares)) : 1;
      fullSplits.push({ userId: id, shares });
    }
  }

  return {
    payerUserId,
    customSplits: {
      splitType: inferredType as CustomSplits["splitType"],
      memberSplits: fullSplits,
    },
  };
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
  const startDate = formatMonthStartInTimeZone(timezone);
  const endDate = formatDateInTimeZone(timezone);

  // Expenses and incomes
  const { data: rows, error } = await supabase
    .from("expenses")
    .select("amount_cents, type, category, date, currency")
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("currency", currency)
    .eq("contact_id", contactId);
  if (error) return { error };

  let totalExpense = 0;
  let totalIncome = 0;
  const catMap = new Map<string, number>();
  for (const r of rows || []) {
    const amt = Number(r.amount_cents) || 0;
    if ((r.type || "expense") === "income") {
      totalIncome += amt;
    } else {
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
    .gte("period_month", startDate.slice(0, 7) + "-01")
    .lt("period_month", nextMonthStart(startDate))
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
    ? `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`
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
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
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
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const SECRET_API_KEY = Deno.env.get("SECRET_API_KEY");
  const WHATSAPP_DEBUG =
    (Deno.env.get("WHATSAPP_DEBUG") || "").toUpperCase() === "TRUE";
  const EDGE_FUNCTION_KEY = (SECRET_API_KEY || "").trim();
  const TWILIO_SKIP_SIGNATURE =
    (Deno.env.get("TWILIO_SKIP_SIGNATURE") || "").toLowerCase() === "true";

  const twilioAccountSid = TWILIO_ACCOUNT_SID || "";
  const twilioAuthToken = TWILIO_AUTH_TOKEN || "";

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !GEMINI_API_KEY ||
    !EDGE_FUNCTION_KEY
  ) {
    console.error("Missing environment variables");
    return jsonResponse({ error: "Server configuration error" }, 500);
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
    const userCurrency = contactRow?.preferred_currency || "USD";
    const userLang = contactRow?.preferred_language || "en";
    const userTimezone = contactRow?.preferred_timezone || "UTC";

    const seenPortfolioIds: Record<string, true> = {};
    const portfolioSpaceIds: string[] = [];
    try {
      const { data: ownedSpaces } = await supabase
        .from("households")
        .select("id, is_portfolio")
        .eq("owner_id", userId);
      for (const s of ownedSpaces || []) {
        const id = (s as any)?.id;
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
          .select("id, is_portfolio")
          .in("id", memberIds);
        for (const s of memberSpaces || []) {
          const id = (s as any)?.id;
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

    await insertChatMessage(
      supabase,
      session.id,
      "user",
      userMessageContent,
      debugNotes,
      WHATSAPP_DEBUG,
    );

    // History
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("chat_session_id", session.id)
      .order("timestamp", { ascending: false })
      .limit(20);
    const rawHistory = (history || []).reverse().map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    while (rawHistory.length > 0 && rawHistory[0].role === "model")
      rawHistory.shift();

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION.replace(
        "{{DATE}}",
        formatDateInTimeZone(userTimezone),
      )
        .replace("{{CURRENCY}}", userCurrency)
        .replace("{{HOUSEHOLDS}}", "None")
        .replace("{{CATEGORIES}}", CATEGORY_GUIDE)
        .replace("{{LANGUAGE}}", userLang),
    });

    const toolsApp = [
      {
        name: "add_transaction",
        description:
          "Add an expense or income transaction. Use this for both personal and shared spaces.",
        parameters: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["expense", "income"] },
            amount: {
              type: "NUMBER",
              description: "Amount in major units (e.g. 10.50)",
            },
            category: { type: "STRING", description: "Category name" },
            description: { type: "STRING", description: "Description/Note" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            currency: { type: "STRING", description: "ISO Currency Code" },
            household_id: {
              type: "STRING",
              description: "Optional: Space ID if it is a shared expense",
            },
            household_name: {
              type: "STRING",
              description: "Optional: Space name if user provided it",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
            payer_name: {
              type: "STRING",
              description:
                "Shared space only: who paid (member name/email). Example: 'paid by B'.",
            },
            split_type: {
              type: "STRING",
              enum: ["equal", "amount", "percentage", "shares"],
              description:
                "Shared space only: how to split. If omitted, infer from member_splits fields.",
            },
            member_splits: {
              type: "ARRAY",
              description:
                "Shared space only: per-member split instructions (by name/email).",
              items: {
                type: "OBJECT",
                properties: {
                  member_name: {
                    type: "STRING",
                    description: "Member name/email reference",
                  },
                  amount: { type: "NUMBER" },
                  percentage: { type: "NUMBER" },
                  shares: { type: "NUMBER" },
                },
                required: ["member_name"],
              },
            },
            is_recurring: {
              type: "BOOLEAN",
              description: "True if this is a recurring transaction",
            },
            frequency: {
              type: "STRING",
              description: "Frequency for recurring (monthly, weekly, etc.)",
            },
          },
          required: ["type", "amount", "category"],
        },
      },
      {
        name: "add_transactions_batch",
        description:
          "Add multiple transactions at once. Use this when the user uploads a receipt/statement with multiple transactions or explicitly lists several transactions to save. More efficient than calling add_transaction multiple times.",
        parameters: {
          type: "OBJECT",
          properties: {
            household_id: {
              type: "STRING",
              description:
                "Optional: Space ID if these are shared transactions",
            },
            household_name: {
              type: "STRING",
              description: "Optional: Space name if user provided it",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
            transactions: {
              type: "ARRAY",
              description: "Array of transactions to save",
              items: {
                type: "OBJECT",
                properties: {
                  type: { type: "STRING", enum: ["expense", "income"] },
                  amount: {
                    type: "NUMBER",
                    description: "Amount in major units",
                  },
                  category: { type: "STRING", description: "Category name" },
                  description: {
                    type: "STRING",
                    description: "Description/Note",
                  },
                  date: { type: "STRING", description: "YYYY-MM-DD" },
                  currency: {
                    type: "STRING",
                    description: "ISO Currency Code",
                  },
                  payer_name: {
                    type: "STRING",
                    description:
                      "Shared space only: who paid (member name/email)",
                  },
                  split_type: {
                    type: "STRING",
                    enum: ["equal", "amount", "percentage", "shares"],
                  },
                  member_splits: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        member_name: { type: "STRING" },
                        amount: { type: "NUMBER" },
                        percentage: { type: "NUMBER" },
                        shares: { type: "NUMBER" },
                      },
                      required: ["member_name"],
                    },
                  },
                  source: {
                    type: "STRING",
                    description: "Income only: source label",
                  },
                  owner_type: {
                    type: "STRING",
                    enum: ["me", "partner", "household"],
                    description: "Income only",
                  },
                  privacy_scope: {
                    type: "STRING",
                    enum: ["private", "balances_only", "full"],
                    description: "Income only",
                  },
                },
                required: ["type", "amount", "category"],
              },
            },
          },
          required: ["transactions"],
        },
      },
      {
        name: "list_expenses",
        description: "List recent transactions (expenses or income).",
        parameters: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["expense", "income"] },
            currency: {
              type: "STRING",
              description: "Optional: filter by currency",
            },
            limit: { type: "NUMBER" },
            start_date: { type: "STRING" },
            end_date: { type: "STRING" },
            household_id: {
              type: "STRING",
              description: "Optional: Filter by space",
            },
            household_name: {
              type: "STRING",
              description: "Optional: Space name filter",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
          },
        },
      },
      {
        name: "generate_chart_url",
        description:
          "Generate a URL for a chart (bar/pie/donut/radar) to visualize expenses.",
        parameters: {
          type: "OBJECT",
          properties: {
            chart_type: {
              type: "STRING",
              enum: ["bar", "pie", "donut", "radar"],
            },
            labels: { type: "ARRAY", items: { type: "STRING" } },
            data: { type: "ARRAY", items: { type: "NUMBER" } },
            title: { type: "STRING" },
          },
          required: ["chart_type", "labels", "data"],
        },
      },
      {
        name: "financial_insight",
        description:
          "Generate a financial health snapshot with verdict, income vs spending, net, top categories, budget status, upcoming recurring, and 1–2 actions. Use when the user asks about financial situation/health/status.",
        parameters: {
          type: "OBJECT",
          properties: {
            scope: {
              type: "STRING",
              description: "Optional scope (e.g., month)",
            },
          },
        },
      },
    ];

    const chat = model.startChat({
      history: rawHistory,
      tools: [{ function_declarations: toolsApp }] as any,
    });
    const result = await chat.sendMessage(userMessageContent);
    const response = await result.response;
    let functionCalls = (response.functionCalls() as any[]) || [];
    let finalResponseText = response.text();
    let mediaUrl: string | undefined;
    if (functionCalls && functionCalls.length > 0) {
      const toolResponses: any[] = [];
      for (const call of functionCalls) {
        let toolResult = {};
        try {
          if (call.name === "list_expenses") {
            const { data, error } = await fetchExpensesDirect(
              supabase,
              contactId,
              {
                limit: call.args.limit || 50,
                startDate: call.args.start_date,
                endDate: call.args.end_date,
                householdId: call.args.household_id || null,
                portfolioHouseholdIds: call.args.household_id
                  ? undefined
                  : portfolioSpaceIds,
                currency: call.args.currency || undefined,
                type: call.args.type || undefined,
              },
            );
            if (error) {
              toolResult = { error };
            } else {
              const normalized = normalizeExpensesForTool(
                data || [],
                userCurrency,
              );
              const chartUrl = buildCategoryChart(normalized);
              if (chartUrl) mediaUrl = chartUrl;
              toolResult = { expenses: normalized, chart_url: chartUrl };
            }
          } else if (call.name === "add_transaction") {
            const householdId = (call.args.household_id || null) as
              | string
              | null;
            const isHouseholdExpense =
              !!householdId && (call.args.type || "expense") === "expense";
            const splitConfig = isHouseholdExpense
              ? await resolveHouseholdSplitConfig(
                  supabase,
                  householdId!,
                  userId,
                  Number(call.args.amount || 0),
                  call.args,
                )
              : {};
            const { data, error } = await saveExpenseDirect(
              supabase,
              contactId,
              userId,
              {
                type: call.args.type || "expense",
                amount: call.args.amount,
                category: call.args.category,
                date: call.args.date || formatDateInTimeZone(userTimezone),
                currency: call.args.currency || userCurrency,
                description: call.args.description,
                householdId,
                payerUserId: splitConfig.payerUserId,
                customSplits: splitConfig.customSplits,
                isRecurring: call.args.is_recurring,
                recurrence_rule: call.args.is_recurring
                  ? {
                      frequency: (
                        call.args.frequency || "MONTHLY"
                      ).toUpperCase(),
                      interval: 1,
                      anchor_date:
                        call.args.date || formatDateInTimeZone(userTimezone),
                    }
                  : undefined,
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
              const householdId = (call.args.household_id || null) as
                | string
                | null;
              const isPortfolio = call.args.is_portfolio ?? false;

              // Build transactions array for the batch endpoint
              const batchTransactions: any[] = [];
              const defaultDate = formatDateInTimeZone(userTimezone);

              for (const tx of rawTransactions) {
                const txType =
                  typeof tx.type === "string" && tx.type
                    ? tx.type.toLowerCase()
                    : "expense";
                const dateStr = normalizeDateInput(tx.date, defaultDate);

                // Resolve splits for household expenses
                let payerUserId: string | undefined;
                let customSplits: CustomSplits | undefined;

                if (householdId && !isPortfolio && txType === "expense") {
                  const splitConfig = await resolveHouseholdSplitConfig(
                    supabase,
                    householdId,
                    userId,
                    Number(tx.amount || 0),
                    tx,
                  );
                  payerUserId = splitConfig.payerUserId;
                  customSplits = splitConfig.customSplits;
                }

                batchTransactions.push({
                  type: txType,
                  amount: tx.amount,
                  category: tx.category,
                  currency: tx.currency || userCurrency,
                  date: dateStr,
                  description: tx.description,
                  source: tx.source,
                  ownerType: tx.owner_type || "me",
                  privacyScope: tx.privacy_scope || "full",
                  payerUserId,
                  customSplits,
                });
              }

              // Call save-transactions-batch via direct function invoke
              // Note: App mode doesn't have EDGE_FUNCTION_KEY context, use direct DB access
              const SECRET_API_KEY = Deno.env.get("SECRET_API_KEY");
              const internalKey = (SECRET_API_KEY || "").trim();

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
                    ? { "X-Moneko-Internal-Key": internalKey }
                    : {},
                },
              );

              const success = !error && data?.success === true;
              if (success) {
                const summary = data?.summary || {};
                toolResult = {
                  success: true,
                  message: `Saved ${summary.succeeded || batchTransactions.length} of ${summary.total || batchTransactions.length} transactions`,
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
          } else {
            toolResult = { error: "Tool not supported in app mode" };
          }
        } catch (e) {
          toolResult = { error: String(e) };
        }
        toolResponses.push({
          functionResponse: { name: call.name, response: toolResult },
        });
      }
      const finalResult = await chat.sendMessage(toolResponses);
      finalResponseText = finalResult.response.text();
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
  const processingAckMessage = pickProcessingMessage(
    messageSid || `${from}-${Date.now()}`,
  );
  const shouldAckEarly = numMedia > 0;

  if (idempotencyKey) {
    const reserve = await reserveTwilioIdempotency(
      supabase,
      idempotencyKey,
      processingAckMessage,
    );
    if (reserve.status === "duplicate") {
      const existing = reserve.result;
      if (existing?.status === "failed") {
        await updateTwilioIdempotency(supabase, idempotencyKey, {
          status: "processing",
          ack_text: processingAckMessage || undefined,
        });
      } else {
        if (existing?.status === "processing") {
          const ackText =
            existing.ack_text ||
            processingAckMessage ||
            "Still processing your request. ⏳";
          return xmlResponse(buildTwimlMessage(ackText));
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
    .single();

  const contextData: any = contextDataRaw as any;

  debugLog(WHATSAPP_DEBUG, "context lookup", { contextData, contextError });

  // Map the context data to maintain backward compatibility
  const contact = contextData
    ? {
        id: contextData.contact_id,
        user_id: contextData.user_id,
        verified: contextData.verified,
        preferred_currency: contextData.preferred_currency,
        preferred_language: contextData.preferred_language,
        preferred_timezone: contextData.preferred_timezone,
      }
    : null;
  const contactError = contextError;

  // Handle "Start Verification" command (Unauthenticated flow)
  if (body.trim().toLowerCase() === "start verification") {
    // Generate OTP logic (Copied from original webhook)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

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
      JSON.stringify({ CODE: code }),
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
    // Not verified: Send prompt template, fallback only if it fails
    const templateResult = await sendWhatsAppTemplate(
      twilioAccountSid,
      twilioAuthToken,
      to,
      from,
      TWILIO_TEMPLATES.VERIFICATION_PROMPT,
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
      }
    : null;
  debugLog(WHATSAPP_DEBUG, "subscription", { subscription });

  if (isFreeUser(subscription)) {
    // Optional: Enforce paid-only features here if needed.
    // For now, proceed or send warning? Original webhook sends NON_SUBSCRIBER template.
    await sendWhatsAppTemplate(
      twilioAccountSid,
      twilioAuthToken,
      to,
      from,
      TWILIO_TEMPLATES.NON_SUBSCRIBER,
    );
    if (idempotencyKey) {
      await updateTwilioIdempotency(supabase, idempotencyKey, {
        status: "done",
        delivery: "template",
        response_text: "non_subscriber",
      });
    }
    return xmlResponse(buildTwimlMessage(null));
  }

  const userId = contact.user_id;
  const userCurrency = contact.preferred_currency || "USD";
  const userLang = contact.preferred_language || "en";
  const userTimezone = contact.preferred_timezone || "UTC";
  const contactId = contact.id;

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

    // If we only have text (no media), attempt direct transaction extraction via analyze-core
    if (numMedia === 0 && caption) {
      console.log(
        "[twilio-whatsapp-ai-bot] Text-only message, attempting analyze-core extraction",
        {
          from,
          preview: caption.slice(0, 120),
        },
      );
      let analysis: any = null;
      try {
        analysis = await runAnalyzeExpenseWithTimeout(
          {
            userId,
            text: caption,
            currency: userCurrency,
          },
          GEMINI_API_KEY,
          30000,
          "The text is taking longer than expected to process. Please try again or shorten the message.",
        );
      } catch (error) {
        analysis = {
          success: false,
          error:
            "The text is taking longer than expected to process. Please try again or shorten the message.",
          language: "en",
        };
      }

      if (!analysis || !analysis.success || !analysis.items) {
        if (WHATSAPP_DEBUG)
          debugNotes.push(
            `text analyze-expense error: ${analysis?.error || "unknown"}`,
          );
        // When analysis fails (e.g., for intent messages like "edit my expenses", "show budget"),
        // just pass the raw message to the AI - it can handle intents directly with its tools
        userMessageContent = caption;
      } else {
        userMessageContent = `[User message: "${caption}". Successfully extracted from text: ${JSON.stringify(
          analysis.items!,
        )}. Please confirm with the user and ask if they want to save these transactions.]`;
      }
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
        // Download image with Twilio Basic auth (matches legacy webhook), then run local analyze-core
        const accountSid =
          formData.get("AccountSid")?.toString() || TWILIO_ACCOUNT_SID || "";
        const authHeader =
          "Basic " + btoa(`${accountSid}:${TWILIO_AUTH_TOKEN}`);
        const imgRes = await fetch(mediaUrl, {
          headers: { Authorization: authHeader },
        });

        if (!imgRes.ok) {
          if (WHATSAPP_DEBUG)
            debugNotes.push(`media fetch failed status=${imgRes.status}`);
          userMessageContent = `[User uploaded an image, but download failed status=${imgRes.status}]`;
        } else {
          const contentType =
            imgRes.headers.get("content-type") || mediaType || "";

          if (!/^image\/(jpeg|jpg|png|gif|bmp|webp)$/i.test(contentType)) {
            if (WHATSAPP_DEBUG)
              debugNotes.push(`unsupported image type ${contentType}`);
            userMessageContent = `[User sent unsupported image type: ${contentType}]`;
          } else {
            const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
            if (imgBuf.byteLength > MAX_MEDIA_BYTES) {
              userMessageContent = `[User uploaded an image${caption ? ` with caption "${caption}"` : ""}, but the file is too large to process (${imgBuf.byteLength} bytes). Please ask them to send a smaller or clearer photo, or type the expense manually.]`;
            } else {
              const base64Data = uint8ToBase64(imgBuf);

              // Don't send immediate acknowledgment - let the AI handle all responses
              // to avoid duplicate messages

              // Attempt analysis with timeout and retry
              let analysis: any = null;
              try {
                analysis = await runAnalyzeExpenseWithTimeout(
                  {
                    userId,
                    image: { data: base64Data, contentType, bytes: imgBuf },
                    currency: userCurrency,
                  },
                  GEMINI_API_KEY,
                  30000,
                  "The image is taking longer than expected to process. Please try again with a clearer photo.",
                );
              } catch (error) {
                analysis = {
                  success: false,
                  error:
                    "The image is taking longer than expected to process. Please try again with a clearer photo.",
                  language: "en",
                };
              }

              if (!analysis || !analysis.success || !analysis.items) {
                if (WHATSAPP_DEBUG)
                  debugNotes.push(
                    `analyze-expense error: ${analysis?.error || "unknown"}`,
                  );

                // Don't send error directly - let AI handle the response to maintain context
                // Include the error details in the message content for the AI
                userMessageContent = `[User uploaded an image${caption ? ` with caption "${caption}"` : ""}, but analysis failed: ${
                  analysis?.error ||
                  "Could not extract expense information. The image may be unclear or have poor lighting."
                }. Please help the user by suggesting they try again with better lighting, holding camera steady, ensuring text is in focus, avoiding shadows/glare, or typing the expense manually like "Spent 45 on groceries"]`;
              } else {
                // Success - let AI handle the response with the extracted data
                userMessageContent = `[User uploaded an image${caption ? ` with caption "${caption}"` : ""}. Successfully extracted from receipt: ${JSON.stringify(
                  analysis.items!,
                )}. Please confirm with the user and ask if they want to save these transactions.]`;
              }
            }
          }
        }
      } else if (mediaUrl && /^audio\//i.test(mediaType || "")) {
        // WhatsApp voice message / audio note: download and run analyze-core audio extraction
        const accountSid =
          formData.get("AccountSid")?.toString() || TWILIO_ACCOUNT_SID || "";
        const authHeader =
          "Basic " + btoa(`${accountSid}:${TWILIO_AUTH_TOKEN}`);
        const audioRes = await fetch(mediaUrl, {
          headers: { Authorization: authHeader },
        });

        if (!audioRes.ok) {
          if (WHATSAPP_DEBUG)
            debugNotes.push(`audio fetch failed status=${audioRes.status}`);
          userMessageContent = `[User sent a voice message, but download failed status=${audioRes.status}${
            caption ? ` | caption: "${caption}"` : ""
          }]`;
        } else {
          const rawContentType =
            audioRes.headers.get("content-type") || mediaType || "";
          const contentType = rawContentType.split(";")[0].trim();
          const audioBuf = new Uint8Array(await audioRes.arrayBuffer());
          if (audioBuf.byteLength > MAX_MEDIA_BYTES) {
            userMessageContent = `[User sent a voice message${caption ? ` with caption "${caption}"` : ""}, but the file is too large to process (${audioBuf.byteLength} bytes). Please ask them to send a shorter clip or type the expense manually.]`;
          } else {
            const base64Data = uint8ToBase64(audioBuf);

            // Attempt audio analysis with a hard timeout, similar to text/image flows
            let analysis: any = null;
            try {
              analysis = await runAnalyzeExpenseWithTimeout(
                {
                  userId,
                  audio: { data: base64Data, contentType, bytes: audioBuf },
                  currency: userCurrency,
                },
                GEMINI_API_KEY,
                30000,
                "The audio is taking longer than expected to process. Please try again by speaking clearly and mentioning the amount, currency, and date.",
              );
            } catch (error) {
              analysis = {
                success: false,
                error:
                  "The audio is taking longer than expected to process. Please try again by speaking clearly and mentioning the amount, currency, and date.",
                language: "en",
              };
            }

            if (!analysis || !analysis.success || !analysis.items) {
              if (WHATSAPP_DEBUG)
                debugNotes.push(
                  `audio analyze-expense error: ${analysis?.error || "unknown"}`,
                );

              userMessageContent = `[User sent a voice message${
                caption ? ` with caption "${caption}"` : ""
              }, but analysis failed: ${
                analysis?.error ||
                "Could not extract expense information from the audio. Please try again by clearly describing what you spent, how much, in which currency, and when."
              }. Please help the user by suggesting they try again or type the expense manually like "Spent 45 on groceries yesterday".]`;
            } else {
              userMessageContent = `[User sent a voice message${
                caption ? ` with caption "${caption}"` : ""
              }. Successfully extracted from audio: ${JSON.stringify(
                analysis.items!,
              )}. Please confirm with the user and ask if they want to save these transactions.]`;
            }
          }
        }
      } else if (mediaUrl) {
        // Non-image file: fetch and include a small preview so AI keeps context
        console.log(
          "[twilio-whatsapp-ai-bot] Non-image media detected, building preview",
          {
            from,
            mediaUrl,
            mediaType,
          },
        );

        const accountSid =
          formData.get("AccountSid")?.toString() || TWILIO_ACCOUNT_SID || "";
        const authHeader =
          "Basic " + btoa(`${accountSid}:${TWILIO_AUTH_TOKEN}`);
        const fileRes = await fetch(mediaUrl, {
          headers: { Authorization: authHeader },
        });

        if (!fileRes.ok) {
          if (WHATSAPP_DEBUG)
            debugNotes.push(`file fetch failed status=${fileRes.status}`);
          userMessageContent = `[User sent a file but download failed status=${fileRes.status}${caption ? ` | caption: "${caption}"` : ""}]`;
        } else {
          const contentType =
            fileRes.headers.get("content-type") || mediaType || "";
          const buf = new Uint8Array(await fileRes.arrayBuffer());
          if (buf.byteLength > MAX_MEDIA_BYTES) {
            userMessageContent = `[User sent a file (${contentType || "unknown"}, ${buf.length} bytes)${
              caption ? ` with caption "${caption}"` : ""
            }, but it is too large to process. Please ask them to send a smaller file or summarize the expense manually.]`;
          } else {
            const cleanContentType = contentType.split(";")[0].trim();
            let preview = "";
            let parsed = false;

            const textLike =
              /^(text\/|application\/(json|csv|xml|javascript))/i.test(
                cleanContentType,
              ) || /\.(csv|txt|json|xml)$/i.test(mediaUrl || "");
            const isXlsx =
              /spreadsheetml|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i.test(
                cleanContentType,
              ) || /\.xlsx$/i.test(mediaUrl || "");
            const isPdf =
              /application\/pdf/i.test(cleanContentType) ||
              /\.pdf$/i.test(mediaUrl || "");

            let fileName = "attachment";
            try {
              const url = new URL(mediaUrl);
              const last = url.pathname.split("/").pop() || "";
              if (last && last.includes(".")) {
                fileName = last;
              }
            } catch (_) {}

            if (fileName === "attachment") {
              if (isPdf) fileName = "attachment.pdf";
              else if (isXlsx) fileName = "attachment.xlsx";
              else if (textLike) fileName = "attachment.txt";
              else fileName = "attachment.bin";
            }

            const base64Data = uint8ToBase64(buf);
            let analysis: any = null;
            try {
              analysis = await runAnalyzeExpenseWithTimeout(
                {
                  userId,
                  text: caption || "",
                  currency: userCurrency,
                  attachments: [
                    {
                      filename: fileName,
                      contentType:
                        cleanContentType || "application/octet-stream",
                      data: base64Data,
                    },
                  ],
                },
                GEMINI_API_KEY,
                30000,
                "The file is taking longer than expected to process. Please try again with a smaller file or send a clear photo instead.",
              );
            } catch (error) {
              analysis = {
                success: false,
                error:
                  "The file is taking longer than expected to process. Please try again with a smaller file or send a clear photo instead.",
                language: "en",
              };
            }

            const analysisSucceeded =
              analysis && analysis.success && Array.isArray(analysis.items);
            if (analysisSucceeded) {
              userMessageContent = `[User sent a file (${cleanContentType || "unknown"}, ${buf.length} bytes)${caption ? ` with caption "${caption}"` : ""}. Successfully extracted from file: ${JSON.stringify(
                analysis.items,
              )}. Please confirm with the user and ask if they want to save these transactions.]`;
            } else {
              if (textLike) {
                try {
                  preview = new TextDecoder("utf-8", { fatal: false }).decode(
                    buf.slice(0, 12000),
                  );
                  parsed = true;
                } catch {
                  parsed = false;
                }
              } else if (isXlsx) {
                const xlsxPreview = buildXlsxPreview(buf);
                if (xlsxPreview) {
                  preview = xlsxPreview;
                  parsed = true;
                }
              } else if (isPdf) {
                const pdfSummary = await summarizePdfWithGemini(
                  base64Data,
                  "application/pdf",
                  GEMINI_API_KEY,
                );
                if (pdfSummary) {
                  preview = `PDF summary:\n${pdfSummary}`;
                  parsed = true;
                }
              }

              if (parsed) {
                userMessageContent = `[User sent a file (${contentType || "unknown"}, ${buf.length} bytes)${caption ? ` with caption "${caption}"` : ""}. Preview: ${preview}]`;
              } else {
                userMessageContent = `[User sent a file (${contentType || "unknown"}, ${buf.length} bytes)${caption ? ` with caption "${caption}"` : ""}. Content not parsed (binary).]`;
              }
            }
          }
        }
      }
    }

    // Save User Message
    await insertChatMessage(
      supabase,
      sessionId,
      "user",
      userMessageContent,
      debugNotes,
      WHATSAPP_DEBUG,
    );

    // 5. Prepare Context & History - use households from context
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
            `${h.name || "Space"}${h.is_portfolio ? " (Portfolio)" : ""}`,
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

    const resolveBudgetScope = (
      args: any,
      fallback?: PendingBudgetDraft | null,
    ) => {
      let householdId = (args.household_id ??
        fallback?.household_id ??
        null) as string | null;
      const householdName = (
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

    const buildBudgetDraftFromArgs = (
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
      const period_month = dateStr.slice(0, 7) + "-01";
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
      const pockets = Array.isArray(draft.pockets) ? draft.pockets : [];
      const created: any[] = [];
      for (const p of pockets) {
        const { data: env, error: envErr } = await upsertEnvelope(
          supabase,
          budgetRow.id,
          userId,
          draft.household_id,
          p.name,
          p.percentage,
          draft.currency || userCurrency,
        );
        if (env && env.id) {
          created.push({ name: p.name, percentage: p.percentage });
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
          if (WHATSAPP_DEBUG)
            debugNotes.push(`envelope upsert error: ${formatted}`);
        }
      }
      return { budgetRow, envelopes: created };
    };

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("chat_session_id", sessionId)
      .order("timestamp", { ascending: false }) // Get latest first
      .limit(20); // Last 20 messages for better context

    const rawHistory = (history || []).reverse().map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    // Ensure history starts with user per Gemini requirement
    const historyParts = [...rawHistory];
    while (historyParts.length > 0 && historyParts[0].role === "model") {
      historyParts.shift();
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: WHATSAPP_SYSTEM_INSTRUCTION.replace(
        "{{DATE}}",
        formatDateInTimeZone(userTimezone),
      )
        .replace("{{CURRENCY}}", userCurrency)
        .replace("{{HOUSEHOLDS}}", householdContext)
        .replace("{{CATEGORIES}}", CATEGORY_GUIDE)
        .replace("{{LANGUAGE}}", userLang),
    });

    // Define Tools
    const tools = [
      {
        name: "add_transaction",
        description:
          "Add an expense or income transaction. Use this for both personal and shared spaces.",
        parameters: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["expense", "income"] },
            amount: {
              type: "NUMBER",
              description: "Amount in major units (e.g. 10.50)",
            },
            category: { type: "STRING", description: "Category name" },
            description: { type: "STRING", description: "Description/Note" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            currency: { type: "STRING", description: "ISO Currency Code" },
            household_id: {
              type: "STRING",
              description: "Optional: Space ID if it is a shared transaction",
            },
            household_name: {
              type: "STRING",
              description: "Optional: Space name if user provided it",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
            payer_name: {
              type: "STRING",
              description:
                "Shared space only: who paid (member name/email). Example: 'paid by B'.",
            },
            split_type: {
              type: "STRING",
              enum: ["equal", "amount", "percentage", "shares"],
              description:
                "Shared space only: how to split. If omitted, infer from member_splits fields.",
            },
            member_splits: {
              type: "ARRAY",
              description:
                "Shared space only: per-member split instructions (by name/email).",
              items: {
                type: "OBJECT",
                properties: {
                  member_name: {
                    type: "STRING",
                    description: "Member name/email reference",
                  },
                  amount: { type: "NUMBER" },
                  percentage: { type: "NUMBER" },
                  shares: { type: "NUMBER" },
                },
                required: ["member_name"],
              },
            },
            owner_type: {
              type: "STRING",
              enum: ["me", "partner", "household"],
              description: "Income only: owner type",
            },
            privacy_scope: {
              type: "STRING",
              enum: ["private", "balances_only", "full"],
              description: "Income only: privacy scope",
            },
            source: {
              type: "STRING",
              description: "Income only: source label",
            },
            is_recurring: {
              type: "BOOLEAN",
              description: "True if this is a recurring transaction",
            },
            frequency: {
              type: "STRING",
              description: "Frequency for recurring (monthly, weekly, etc.)",
            },
          },
          required: ["type", "amount", "category"],
        },
      },
      {
        name: "add_transactions_batch",
        description:
          "Add multiple transactions at once. Use this when the user uploads a receipt/statement with multiple transactions or explicitly lists several transactions to save. More efficient than calling add_transaction multiple times.",
        parameters: {
          type: "OBJECT",
          properties: {
            household_id: {
              type: "STRING",
              description:
                "Optional: Space ID if these are shared transactions",
            },
            household_name: {
              type: "STRING",
              description: "Optional: Space name if user provided it",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
            transactions: {
              type: "ARRAY",
              description: "Array of transactions to save",
              items: {
                type: "OBJECT",
                properties: {
                  type: { type: "STRING", enum: ["expense", "income"] },
                  amount: {
                    type: "NUMBER",
                    description: "Amount in major units",
                  },
                  category: { type: "STRING", description: "Category name" },
                  description: {
                    type: "STRING",
                    description: "Description/Note",
                  },
                  date: { type: "STRING", description: "YYYY-MM-DD" },
                  currency: {
                    type: "STRING",
                    description: "ISO Currency Code",
                  },
                  payer_name: {
                    type: "STRING",
                    description:
                      "Shared space only: who paid (member name/email)",
                  },
                  split_type: {
                    type: "STRING",
                    enum: ["equal", "amount", "percentage", "shares"],
                  },
                  member_splits: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        member_name: { type: "STRING" },
                        amount: { type: "NUMBER" },
                        percentage: { type: "NUMBER" },
                        shares: { type: "NUMBER" },
                      },
                      required: ["member_name"],
                    },
                  },
                  source: {
                    type: "STRING",
                    description: "Income only: source label",
                  },
                  owner_type: {
                    type: "STRING",
                    enum: ["me", "partner", "household"],
                    description: "Income only",
                  },
                  privacy_scope: {
                    type: "STRING",
                    enum: ["private", "balances_only", "full"],
                    description: "Income only",
                  },
                },
                required: ["type", "amount", "category"],
              },
            },
          },
          required: ["transactions"],
        },
      },
      {
        name: "update_transaction",
        description: "Update an existing expense transaction.",
        parameters: {
          type: "OBJECT",
          properties: {
            expense_id: {
              type: "STRING",
              description: "ID of the expense to update",
            },
            amount: { type: "NUMBER" },
            category: { type: "STRING" },
            description: { type: "STRING" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            currency: { type: "STRING" },
            household_id: { type: "STRING" },
            household_name: { type: "STRING" },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
            payer_name: {
              type: "STRING",
              description: "Shared space only: who paid (member name/email).",
            },
            split_type: {
              type: "STRING",
              enum: ["equal", "amount", "percentage", "shares"],
            },
            member_splits: {
              type: "ARRAY",
              description:
                "Shared space only: per-member split instructions (by name/email).",
              items: {
                type: "OBJECT",
                properties: {
                  member_name: {
                    type: "STRING",
                    description: "Member name/email reference",
                  },
                  amount: { type: "NUMBER" },
                  percentage: { type: "NUMBER" },
                  shares: { type: "NUMBER" },
                },
                required: ["member_name"],
              },
            },
            source: {
              type: "STRING",
              description: "Income only: source label",
            },
            is_recurring: { type: "BOOLEAN" },
            frequency: { type: "STRING" },
            interval: { type: "NUMBER" },
            end_date: { type: "STRING", description: "YYYY-MM-DD" },
            anchor_date: { type: "STRING", description: "YYYY-MM-DD" },
            recurrence_rule: { type: "OBJECT" },
          },
          required: ["expense_id"],
        },
      },
      {
        name: "delete_transaction",
        description: "Delete an existing expense transaction.",
        parameters: {
          type: "OBJECT",
          properties: {
            expense_id: {
              type: "STRING",
              description: "ID of the expense to delete",
            },
          },
          required: ["expense_id"],
        },
      },
      {
        name: "list_expenses",
        description: "List recent transactions (expenses or income).",
        parameters: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["expense", "income"] },
            currency: {
              type: "STRING",
              description: "Optional: filter by currency",
            },
            limit: { type: "NUMBER" },
            start_date: { type: "STRING" },
            end_date: { type: "STRING" },
            household_id: {
              type: "STRING",
              description: "Optional: Filter by space",
            },
            household_name: {
              type: "STRING",
              description: "Optional: Space name filter",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
          },
        },
      },
      {
        name: "get_budget",
        description:
          "Get budget status for the current month (includes envelopes/pockets).",
        parameters: {
          type: "OBJECT",
          properties: {
            date: { type: "STRING", description: "YYYY-MM-DD" },
            household_id: {
              type: "STRING",
              description: "Optional: Check space budget",
            },
            household_name: {
              type: "STRING",
              description: "Optional: Space name",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
          },
        },
      },
      {
        name: "draft_budget",
        description:
          "Draft a budget proposal (amount and pockets) and store it for confirmation.",
        parameters: {
          type: "OBJECT",
          properties: {
            amount: { type: "NUMBER" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            household_id: {
              type: "STRING",
              description: "Optional: space scope",
            },
            household_name: {
              type: "STRING",
              description: "Optional: space name",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
            pockets: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  percentage: { type: "NUMBER" },
                  categories: { type: "ARRAY", items: { type: "STRING" } },
                },
                required: ["name", "percentage"],
              },
              description:
                "Optional: envelope splits with percentages and categories",
            },
          },
          required: ["amount"],
        },
      },
      {
        name: "confirm_budget",
        description:
          "Confirm and apply the last drafted budget (can include overrides).",
        parameters: {
          type: "OBJECT",
          properties: {
            confirm: { type: "BOOLEAN", description: "Set true to confirm" },
            amount: { type: "NUMBER" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            household_id: {
              type: "STRING",
              description: "Optional: space scope",
            },
            household_name: {
              type: "STRING",
              description: "Optional: space name",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
            pockets: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  percentage: { type: "NUMBER" },
                  categories: { type: "ARRAY", items: { type: "STRING" } },
                },
                required: ["name", "percentage"],
              },
              description:
                "Optional: envelope splits with percentages and categories",
            },
          },
        },
      },
      {
        name: "set_budget",
        description:
          "Set the budget amount for the month (supports pockets/envelopes split).",
        parameters: {
          type: "OBJECT",
          properties: {
            amount: { type: "NUMBER" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            household_id: {
              type: "STRING",
              description: "Optional: space scope",
            },
            household_name: {
              type: "STRING",
              description: "Optional: space name",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
            pockets: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  percentage: { type: "NUMBER" },
                  categories: { type: "ARRAY", items: { type: "STRING" } },
                  color: { type: "STRING" },
                  icon: { type: "STRING" },
                },
                required: ["name", "percentage"],
              },
              description:
                "Optional: envelope splits with percentages and categories",
            },
          },
          required: ["amount"],
        },
      },
      {
        name: "set_pocket",
        description:
          "Create or update a pocket/envelope for the current budget.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: {
              type: "STRING",
              description: "Pocket name to create/update",
            },
            new_name: { type: "STRING", description: "Optional new name" },
            percentage: {
              type: "NUMBER",
              description: "Allocation percentage (0-100)",
            },
            categories: { type: "ARRAY", items: { type: "STRING" } },
            color: { type: "STRING", description: "Hex color (e.g. #FF0000)" },
            icon: { type: "STRING", description: "Material icon name" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            household_id: {
              type: "STRING",
              description: "Optional: space scope",
            },
            household_name: {
              type: "STRING",
              description: "Optional: space name",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "delete_pocket",
        description: "Delete a pocket/envelope by name.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Pocket name to delete" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            household_id: {
              type: "STRING",
              description: "Optional: space scope",
            },
            household_name: {
              type: "STRING",
              description: "Optional: space name",
            },
            is_portfolio: {
              type: "BOOLEAN",
              description: "Optional: Whether the target space is a portfolio",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "set_currency",
        description:
          "Update the user's preferred currency (user_contacts.preferred_currency).",
        parameters: {
          type: "OBJECT",
          properties: {
            currency: {
              type: "STRING",
              description: "ISO currency code, e.g. USD, EUR, GBP",
            },
          },
          required: ["currency"],
        },
      },
      {
        name: "generate_chart_url",
        description:
          "Generate a URL for a chart (bar/pie/donut/radar) to visualize expenses.",
        parameters: {
          type: "OBJECT",
          properties: {
            chart_type: {
              type: "STRING",
              enum: ["bar", "pie", "donut", "radar"],
            },
            labels: { type: "ARRAY", items: { type: "STRING" } },
            data: { type: "ARRAY", items: { type: "NUMBER" } },
            title: { type: "STRING" },
          },
          required: ["chart_type", "labels", "data"],
        },
      },
      {
        name: "financial_insight",
        description:
          "Generate a financial health snapshot with verdict, income vs spending, net, top categories, budget status, upcoming recurring, and 1–2 actions. Use when the user asks about financial situation/health/status.",
        parameters: {
          type: "OBJECT",
          properties: {
            scope: {
              type: "STRING",
              description: "Optional scope (e.g., month)",
            },
          },
        },
      },
      {
        name: "manage_recurring",
        description: "Add or modify a recurring transaction.",
        parameters: {
          type: "OBJECT",
          properties: {
            action: { type: "STRING", enum: ["add", "update", "delete"] },
            expense_id: {
              type: "STRING",
              description: "Required for update/delete",
            },
            amount: { type: "NUMBER" },
            category: { type: "STRING" },
            currency: { type: "STRING" },
            description: { type: "STRING" },
            source: { type: "STRING", description: "Income only: source" },
            frequency: {
              type: "STRING",
              enum: ["weekly", "monthly", "yearly"],
            },
            interval: { type: "NUMBER" },
            anchor_date: { type: "STRING", description: "YYYY-MM-DD" },
            end_date: { type: "STRING", description: "YYYY-MM-DD" },
            reminder_value: { type: "NUMBER" },
            reminder_unit: { type: "STRING", enum: ["days", "hours"] },
            owner_type: {
              type: "STRING",
              enum: ["me", "partner", "household"],
            },
            privacy_scope: {
              type: "STRING",
              enum: ["private", "balances_only", "full"],
            },
            household_id: { type: "STRING" },
            household_name: { type: "STRING" },
            is_portfolio: { type: "BOOLEAN" },
            payer_name: { type: "STRING" },
            split_type: {
              type: "STRING",
              enum: ["equal", "amount", "percentage", "shares"],
            },
            member_splits: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  member_name: { type: "STRING" },
                  amount: { type: "NUMBER" },
                  percentage: { type: "NUMBER" },
                  shares: { type: "NUMBER" },
                },
                required: ["member_name"],
              },
            },
            type: {
              type: "STRING",
              enum: ["expense", "income"],
              description: "Recurring transaction type",
            },
          },
          required: ["action"],
        },
      },
    ];

    // 6. Chat Loop (Model Turn)
    const chat = model.startChat({
      history: historyParts,
      tools: [{ function_declarations: tools }] as any,
    });

    // Send message with timeout and error handling
    let response: any | null = null;
    let finalResponseText = "";
    try {
      const messagePromise = chat.sendMessage(userMessageContent);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("AI response timed out after 60 seconds")),
          60000,
        ),
      );

      const result = await Promise.race([messagePromise, timeoutPromise]);
      response = await result.response;
    } catch (e) {
      console.error("[twilio-whatsapp-ai-bot] Initial AI call failed:", e);
      finalResponseText =
        "I'm having trouble processing your request right now. Please try again in a moment.";
      if (WHATSAPP_DEBUG) {
        debugNotes.push(`initial-ai-error: ${String(e)}`);
      }
    }

    let functionCalls: any[] | null = response
      ? (response.functionCalls() as any[])
      : null;
    if (!finalResponseText) {
      finalResponseText = response
        ? response.text()
        : "I'm having trouble processing your request right now. Please try again in a moment.";
    }
    let persistedContent: string | undefined;

    // Loop for tool calls (handle sequential calls)
    // For simplicity, we handle one batch of calls then get final text.
    if (functionCalls && functionCalls.length > 0) {
      const toolResponses: any[] = [];
      for (const call of functionCalls) {
        let toolResult = {};
        debugLog(WHATSAPP_DEBUG, "tool call", {
          name: call.name,
          args: call.args,
        });
        try {
          if (call.name === "add_transaction") {
            let householdId = call.args.household_id as string | null;
            const householdName = (
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

            const dateStr = normalizeDateInput(
              call.args.date,
              formatDateInTimeZone(userTimezone),
            );
            const recurrenceRule = call.args.is_recurring
              ? buildRecurrenceRule(call.args, dateStr) || {
                  frequency: "monthly",
                  interval: 1,
                  anchor_date: dateStr,
                }
              : null;
            const type =
              typeof call.args.type === "string" && call.args.type
                ? call.args.type.toLowerCase()
                : "expense";

            if (type === "income") {
              const payload = {
                userId,
                amount: call.args.amount,
                category: call.args.category,
                currency: call.args.currency || userCurrency,
                date: dateStr,
                description: call.args.description,
                source: call.args.source,
                ownerType: call.args.owner_type || "me",
                privacyScope: call.args.privacy_scope || "full",
                householdId,
                isRecurring: !!call.args.is_recurring,
                recurrence_rule: recurrenceRule || undefined,
                clientCreatedAt: new Date().toISOString(),
              };
              const { data, error } = await supabase.functions.invoke(
                "save-income",
                {
                  body: payload,
                  headers: { "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY },
                },
              );
              const success = !error && data?.success === true;
              toolResult = success
                ? { success: true, data: data?.data ?? data }
                : { error: error ?? data?.error };
              if (!success) {
                const formatted = formatInvokeError(error ?? data?.error);
                if (WHATSAPP_DEBUG)
                  debugNotes.push(`add-income error: ${formatted}`);
                console.error("[twilio-whatsapp-ai-bot] add-income error", {
                  error,
                  formatted,
                });
              }
            } else {
              const isHouseholdExpense = !!householdId && type === "expense";
              const splitConfig = isHouseholdExpense
                ? await resolveHouseholdSplitConfig(
                    supabase,
                    householdId!,
                    userId,
                    Number(call.args.amount || 0),
                    call.args,
                  )
                : {};

              const payload = {
                userId,
                amount: call.args.amount,
                category: call.args.category,
                currency: call.args.currency || userCurrency,
                date: dateStr,
                description: call.args.description,
                householdId,
                isPortfolio: spaceMeta?.isPortfolio ?? false,
                payerUserId: splitConfig.payerUserId,
                customSplits: splitConfig.customSplits,
                isRecurring: !!call.args.is_recurring,
                recurrence_rule: recurrenceRule || undefined,
                clientCreatedAt: new Date().toISOString(),
                type: "expense",
              };
              const { data, error } = await supabase.functions.invoke(
                "save-expense",
                {
                  body: payload,
                  headers: { "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY },
                },
              );
              const success = !error && data?.success === true;
              toolResult = success
                ? { success: true, data: data?.data ?? data }
                : { error: error ?? data?.error };
              if (!success) {
                const formatted = formatInvokeError(error ?? data?.error);
                if (WHATSAPP_DEBUG)
                  debugNotes.push(`add-expense error: ${formatted}`);
                console.error("[twilio-whatsapp-ai-bot] add-expense error", {
                  error,
                  formatted,
                });
              }
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
            let householdId = call.args.household_id as string | null;
            const householdName = (
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
            const isPortfolio =
              call.args.is_portfolio ?? spaceMeta?.isPortfolio ?? false;

            // Build transactions array for the batch endpoint
            const batchTransactions: any[] = [];
            const defaultDate = formatDateInTimeZone(userTimezone);

            for (const tx of rawTransactions) {
              const txType =
                typeof tx.type === "string" && tx.type
                  ? tx.type.toLowerCase()
                  : "expense";
              const dateStr = normalizeDateInput(tx.date, defaultDate);

              // Resolve splits for household expenses
              let payerUserId: string | undefined;
              let customSplits: CustomSplits | undefined;

              if (householdId && !isPortfolio && txType === "expense") {
                const splitConfig = await resolveHouseholdSplitConfig(
                  supabase,
                  householdId,
                  userId,
                  Number(tx.amount || 0),
                  tx,
                );
                payerUserId = splitConfig.payerUserId;
                customSplits = splitConfig.customSplits;
              }

              batchTransactions.push({
                type: txType,
                amount: tx.amount,
                category: tx.category,
                currency: tx.currency || userCurrency,
                date: dateStr,
                description: tx.description,
                source: tx.source,
                ownerType: tx.owner_type || "me",
                privacyScope: tx.privacy_scope || "full",
                payerUserId,
                customSplits,
              });
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
                headers: { "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY },
              },
            );

            const success = !error && data?.success === true;
            if (success) {
              const summary = data?.summary || {};
              toolResult = {
                success: true,
                message: `Saved ${summary.succeeded || batchTransactions.length} of ${summary.total || batchTransactions.length} transactions`,
                succeeded: summary.succeeded,
                failed: summary.failed,
              };
            } else {
              const formatted = formatInvokeError(error ?? data?.error);
              if (WHATSAPP_DEBUG)
                debugNotes.push(`add_transactions_batch error: ${formatted}`);
              console.error(
                "[twilio-whatsapp-ai-bot] add_transactions_batch error",
                { error, formatted },
              );
              toolResult = {
                error: formatted || "Failed to save transactions",
              };
            }
          } else if (call.name === "update_transaction") {
            // First validate the expense_id exists and belongs to this user
            const rawExpenseId = call.args.expense_id;
            if (
              !rawExpenseId ||
              typeof rawExpenseId !== "string" ||
              rawExpenseId.trim().length === 0
            ) {
              toolResult = {
                error:
                  "expense_id is required. Please use list_expenses first to get the expense ID you want to update.",
              };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }

            // Always fetch the expense to validate ownership before attempting update
            const { data: expenseRow, error: expenseFetchError } =
              await supabase
                .from("expenses")
                .select(
                  "id, user_id, amount_cents, household_id, split_group_id",
                )
                .eq("id", rawExpenseId)
                .maybeSingle();

            if (expenseFetchError || !expenseRow) {
              console.warn(
                "[twilio-whatsapp-ai-bot] update_transaction: expense not found",
                { expenseId: rawExpenseId, error: expenseFetchError },
              );
              toolResult = {
                error:
                  "Expense not found. Please use list_expenses first to see your expenses and get the correct expense ID.",
              };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }

            // Validate ownership - expense must belong to this user (for personal) or user must be household member
            const expenseUserId = (expenseRow as any).user_id;
            const expenseHouseholdId = (expenseRow as any).household_id;

            if (!expenseHouseholdId) {
              // Personal expense - must be owned by this user
              if (expenseUserId !== userId) {
                console.warn(
                  "[twilio-whatsapp-ai-bot] update_transaction: unauthorized - expense belongs to different user",
                  {
                    expenseId: rawExpenseId,
                    expenseUserId,
                    requestUserId: userId,
                  },
                );
                toolResult = {
                  error:
                    "You don't have permission to edit this expense. Please use list_expenses to see your own expenses.",
                };
                toolResponses.push({
                  functionResponse: { name: call.name, response: toolResult },
                });
                continue;
              }
            } else {
              // Household expense - verify user is a member
              const { data: membership } = await supabase
                .from("household_members")
                .select("user_id")
                .eq("household_id", expenseHouseholdId)
                .eq("user_id", userId)
                .maybeSingle();

              if (!membership) {
                console.warn(
                  "[twilio-whatsapp-ai-bot] update_transaction: unauthorized - user not in household",
                  {
                    expenseId: rawExpenseId,
                    householdId: expenseHouseholdId,
                    userId,
                  },
                );
                toolResult = {
                  error:
                    "You don't have permission to edit this household expense.",
                };
                toolResponses.push({
                  functionResponse: { name: call.name, response: toolResult },
                });
                continue;
              }
            }

            let householdId = call.args.household_id as string | null;
            const householdName = (
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
            // Use household from expense if not provided in args
            if (!householdId && expenseHouseholdId) {
              householdId = expenseHouseholdId;
              spaceMeta = householdId ? spaceMap.get(householdId) : spaceMeta;
            }

            const dateStr = normalizeDateInput(
              call.args.date,
              formatDateInTimeZone(userTimezone),
            );
            const recurrenceRule = buildRecurrenceRule(call.args, dateStr);
            const hasSplitHints =
              Array.isArray(call.args.member_splits) &&
              call.args.member_splits.length > 0;
            const hasPayerHint =
              typeof call.args.payer_name === "string" &&
              call.args.payer_name.trim().length > 0;

            const updates: Record<string, unknown> = {};
            if (call.args.amount != null) {
              const amount = Number(call.args.amount);
              if (Number.isFinite(amount)) {
                updates.amount_cents = Math.round(amount * 100);
              }
            }
            if (call.args.category != null)
              updates.category = call.args.category;
            if (call.args.description != null)
              updates.raw_text = call.args.description;
            if (call.args.currency != null)
              updates.currency = call.args.currency;
            if (call.args.date != null) updates.date = dateStr;
            if (call.args.is_recurring != null) {
              updates.is_recurring = !!call.args.is_recurring;
            }
            if (call.args.source != null) updates.source = call.args.source;
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
                expenseId: call.args.expense_id,
                updates,
              };
              if (Object.keys(extraBody).length > 0) {
                Object.assign(requestBody, extraBody);
              }

              const { data, error } = await supabase.functions.invoke(
                "update-expense",
                {
                  body: requestBody,
                  headers: { "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY },
                },
              );
              const success = !error && data?.success === true;
              toolResult = success
                ? { success: true, data: data?.data ?? data }
                : { error: error ?? data?.error };
              if (!success) {
                const formatted = formatInvokeError(error ?? data?.error);
                if (WHATSAPP_DEBUG)
                  debugNotes.push(`update-expense error: ${formatted}`);
                console.error("[twilio-whatsapp-ai-bot] update-expense error", {
                  error,
                  formatted,
                });
              }
            }
          } else if (call.name === "delete_transaction") {
            // First validate the expense_id exists and belongs to this user
            const rawExpenseId = call.args.expense_id;
            if (
              !rawExpenseId ||
              typeof rawExpenseId !== "string" ||
              rawExpenseId.trim().length === 0
            ) {
              toolResult = {
                error:
                  "expense_id is required. Please use list_expenses first to get the expense ID you want to delete.",
              };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }

            // Fetch the expense to validate ownership before attempting delete
            const { data: expenseToDelete, error: deleteFetchError } =
              await supabase
                .from("expenses")
                .select("id, user_id, household_id")
                .eq("id", rawExpenseId)
                .maybeSingle();

            if (deleteFetchError || !expenseToDelete) {
              console.warn(
                "[twilio-whatsapp-ai-bot] delete_transaction: expense not found",
                { expenseId: rawExpenseId, error: deleteFetchError },
              );
              toolResult = {
                error:
                  "Expense not found. Please use list_expenses first to see your expenses and get the correct expense ID.",
              };
              toolResponses.push({
                functionResponse: { name: call.name, response: toolResult },
              });
              continue;
            }

            // Validate ownership
            const deleteExpenseHouseholdId = expenseToDelete.household_id;
            if (!deleteExpenseHouseholdId) {
              // Personal expense - must be owned by this user
              if (expenseToDelete.user_id !== userId) {
                console.warn(
                  "[twilio-whatsapp-ai-bot] delete_transaction: unauthorized",
                  {
                    expenseId: rawExpenseId,
                    expenseUserId: expenseToDelete.user_id,
                    requestUserId: userId,
                  },
                );
                toolResult = {
                  error:
                    "You don't have permission to delete this expense. Please use list_expenses to see your own expenses.",
                };
                toolResponses.push({
                  functionResponse: { name: call.name, response: toolResult },
                });
                continue;
              }
            } else {
              // Household expense - verify user is a member
              const { data: deleteMembership } = await supabase
                .from("household_members")
                .select("user_id")
                .eq("household_id", deleteExpenseHouseholdId)
                .eq("user_id", userId)
                .maybeSingle();

              if (!deleteMembership) {
                console.warn(
                  "[twilio-whatsapp-ai-bot] delete_transaction: unauthorized - user not in household",
                  {
                    expenseId: rawExpenseId,
                    householdId: deleteExpenseHouseholdId,
                    userId,
                  },
                );
                toolResult = {
                  error:
                    "You don't have permission to delete this household expense.",
                };
                toolResponses.push({
                  functionResponse: { name: call.name, response: toolResult },
                });
                continue;
              }
            }

            const { data, error } = await supabase.functions.invoke(
              "delete-expense",
              {
                body: { userId, expenseIds: rawExpenseId },
                headers: { "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY },
              },
            );
            const success = !error && data?.success === true;
            toolResult = success
              ? { success: true }
              : { error: error ?? data?.error };
            if (!success) {
              const formatted = formatInvokeError(error ?? data?.error);
              if (WHATSAPP_DEBUG)
                debugNotes.push(`delete-expense error: ${formatted}`);
              console.error("[twilio-whatsapp-ai-bot] delete-expense error", {
                error,
                formatted,
              });
            }
          } else if (call.name === "list_expenses") {
            let householdId = call.args.household_id as string | null;
            const householdName = (call.args.household_name || "")
              .toString()
              .toLowerCase();
            let spaceMeta = householdId ? spaceMap.get(householdId) : undefined;
            if (!spaceMeta && householdName && spaceMap.has(householdName)) {
              spaceMeta = spaceMap.get(householdName);
              householdId = spaceMeta?.id ?? null;
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
              if (WHATSAPP_DEBUG)
                debugNotes.push(`list-expenses direct error: ${formatted}`);
              console.error(
                "[twilio-whatsapp-ai-bot] list-expenses direct query error",
                { error, formatted },
              );
              toolResult = { error };
            } else {
              const normalized = normalizeExpensesForTool(
                data || [],
                userCurrency,
              );
              const chartUrl = buildCategoryChart(normalized);
              toolResult = { expenses: normalized, chart_url: chartUrl };
            }
          } else if (call.name === "get_budget") {
            const dateStr = (
              call.args.date || formatDateInTimeZone(userTimezone)
            ).slice(0, 10);
            const period_month = dateStr.slice(0, 7) + "-01";
            let householdId = call.args.household_id || null;
            const householdName = (call.args.household_name || "")
              .toString()
              .toLowerCase();
            let spaceMeta = householdId ? spaceMap.get(householdId) : undefined;
            if (!spaceMeta && householdName && spaceMap.has(householdName)) {
              spaceMeta = spaceMap.get(householdName);
              householdId = spaceMeta?.id ?? null;
            }
            const res = await getBudgetStatusDirect(
              supabase,
              userId,
              householdId,
              period_month,
              userCurrency,
              spaceMeta?.isPortfolio ?? false,
            );
            if (res.error) {
              const formatted = formatInvokeError(res.error);
              if (WHATSAPP_DEBUG)
                debugNotes.push(`get-budget direct error: ${formatted}`);
              console.error(
                "[twilio-whatsapp-ai-bot] get-budget direct error",
                { error: res.error, formatted },
              );
              toolResult = { error: res.error };
            } else {
              toolResult = {
                budget: res.budget,
                envelopes: res.envelopes,
                totals: res.totals,
                chart: res.chart,
              };
            }
          } else if (call.name === "set_currency") {
            const currency = (call.args.currency || "")
              .toString()
              .toUpperCase();
            const { data, error } = await updatePreferredCurrency(
              supabase,
              contactId,
              currency,
            );
            toolResult = error
              ? { error }
              : {
                  success: true,
                  currency: data?.preferred_currency || currency,
                };
            if (error) {
              const formatted = formatInvokeError(error);
              if (WHATSAPP_DEBUG)
                debugNotes.push(`set-currency error: ${formatted}`);
              console.error("[twilio-whatsapp-ai-bot] set-currency error", {
                error,
                formatted,
              });
            }
          } else if (call.name === "draft_budget") {
            const { draft, error } = buildBudgetDraftFromArgs(call.args);
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
              const { draft, error } = buildBudgetDraftFromArgs(
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
                  if (WHATSAPP_DEBUG)
                    debugNotes.push(`confirm-budget error: ${formatted}`);
                  console.error(
                    "[twilio-whatsapp-ai-bot] confirm-budget error",
                    { error: res.error, formatted },
                  );
                } else {
                  toolResult = {
                    success: true,
                    budget: res.budgetRow,
                    envelopes: res.envelopes,
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
            const { draft, error } = buildBudgetDraftFromArgs(
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
                if (WHATSAPP_DEBUG)
                  debugNotes.push(`set-budget error: ${formatted}`);
                console.error("[twilio-whatsapp-ai-bot] set-budget error", {
                  error: res.error,
                  formatted,
                });
              } else {
                toolResult = {
                  success: true,
                  budget: res.budgetRow,
                  envelopes: res.envelopes,
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
            const dateStr = normalizeDateInput(
              call.args.date,
              formatDateInTimeZone(userTimezone),
            );
            const period_month = dateStr.slice(0, 7) + "-01";
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
                  const newName = (call.args.new_name || "").toString().trim();
                  const pctInput = coerceNumber(call.args.percentage);
                  const rawCategories = normalizeCategories(
                    call.args.categories,
                  );
                  const categories = rawCategories.map((c) => c.toLowerCase());
                  const color =
                    typeof call.args.color === "string"
                      ? call.args.color.trim()
                      : undefined;
                  const icon =
                    typeof call.args.icon === "string"
                      ? call.args.icon.trim()
                      : undefined;

                  if (!envelope && pctInput == null) {
                    toolResult = { error: "Pocket percentage is required" };
                  } else if (!envelope && categories.length === 0) {
                    toolResult = {
                      error: "Please provide at least one category",
                    };
                  } else {
                    const { data: envelopes } = await supabase
                      .from("budget_envelopes")
                      .select(
                        "id, name, budget_percentage, budget_amount_cents",
                      )
                      .eq("budget_id", budgetRow.id);
                    const existingPct = envelope?.budget_percentage;
                    const desiredPctRaw =
                      pctInput != null
                        ? Math.max(0, Math.min(100, pctInput))
                        : typeof existingPct === "number"
                          ? existingPct
                          : 0;
                    const desiredPct = Number(desiredPctRaw.toFixed(4));
                    const others = (envelopes || [])
                      .filter((p: any) => p.id !== envelope?.id)
                      .map((p: any) => ({
                        id: p.id as string,
                        percentage: Number(p.budget_percentage) || 0,
                      }));
                    const adjustedOthers =
                      pctInput != null
                        ? rebalancePocketPercentages(desiredPct, others)
                        : {};

                    // Compute budget_amount_cents from percentage and total budget
                    const totalBudgetCents = budgetRow.total_budget_cents || 0;
                    const desiredAmountCents = Math.round(
                      (desiredPct / 100) * totalBudgetCents,
                    );

                    let envelopeId = envelope?.id as string | undefined;
                    if (envelopeId) {
                      await supabase
                        .from("budget_envelopes")
                        .update({
                          name: newName || name,
                          budget_id: budgetRow.id,
                          budget_percentage: desiredPct,
                          budget_amount_cents: desiredAmountCents,
                          updated_at: new Date().toISOString(),
                          ...(color ? { color } : {}),
                          ...(icon ? { icon } : {}),
                          household_id: householdId,
                          currency: userCurrency,
                        })
                        .eq("id", envelopeId);
                    } else {
                      const { data: insertRes } = await supabase
                        .from("budget_envelopes")
                        .insert({
                          user_id: userId,
                          budget_id: budgetRow.id,
                          name: newName || name,
                          budget_percentage: desiredPct,
                          budget_amount_cents: desiredAmountCents,
                          household_id: householdId,
                          currency: userCurrency,
                          color: color ?? null,
                          icon: icon ?? null,
                        })
                        .select("id")
                        .maybeSingle();
                      envelopeId = insertRes?.id as string | undefined;
                    }

                    if (!envelopeId) {
                      toolResult = { error: "Failed to save pocket" };
                    } else {
                      if (categories.length > 0) {
                        await supabase
                          .from("envelope_category_links")
                          .delete()
                          .eq("envelope_id", envelopeId);
                        await supabase.from("envelope_category_links").insert(
                          categories.map((category) => ({
                            envelope_id: envelopeId,
                            category,
                          })),
                        );
                      }

                      // Upsert envelope_allocation for the edited pocket (mobile reads allocations first)
                      await upsertEnvelopeAllocation(
                        supabase,
                        envelopeId,
                        period_month,
                        desiredAmountCents,
                      );

                      if (pctInput != null) {
                        if (desiredPct >= 100 && others.length > 0) {
                          for (const other of others) {
                            await supabase
                              .from("budget_envelopes")
                              .update({
                                budget_percentage: 0,
                                budget_amount_cents: 0,
                                updated_at: new Date().toISOString(),
                              })
                              .eq("id", other.id);
                            // Also upsert allocation for rebalanced pocket
                            await upsertEnvelopeAllocation(
                              supabase,
                              other.id,
                              period_month,
                              0,
                            );
                          }
                        } else {
                          for (const entry of Object.entries(adjustedOthers)) {
                            const adjustedPct = entry[1] as number;
                            const adjustedAmountCents = Math.round(
                              (adjustedPct / 100) * totalBudgetCents,
                            );
                            await supabase
                              .from("budget_envelopes")
                              .update({
                                budget_percentage: adjustedPct,
                                budget_amount_cents: adjustedAmountCents,
                                updated_at: new Date().toISOString(),
                              })
                              .eq("id", entry[0]);
                            // Also upsert allocation for rebalanced pocket
                            await upsertEnvelopeAllocation(
                              supabase,
                              entry[0],
                              period_month,
                              adjustedAmountCents,
                            );
                          }
                        }
                      }

                      toolResult = {
                        success: true,
                        pocket: { id: envelopeId, name: newName || name },
                      };
                    }
                  }
                }
              }
            }
          } else if (call.name === "delete_pocket") {
            const dateStr = normalizeDateInput(
              call.args.date,
              formatDateInTimeZone(userTimezone),
            );
            const period_month = dateStr.slice(0, 7) + "-01";
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
            const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
            toolResult = { url };
          } else if (call.name === "manage_recurring") {
            // Use update-expense or save-expense
            const action = (call.args.action || "").toString().toLowerCase();
            if (action === "add") {
              let householdId = call.args.household_id as string | null;
              const householdName = (call.args.household_name || "")
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
              const recurrenceRule = buildRecurrenceRule(
                call.args,
                dateStr,
              ) || {
                frequency: (call.args.frequency || "monthly")
                  .toString()
                  .toLowerCase(),
                interval: 1,
                anchor_date: dateStr,
              };
              const type =
                typeof call.args.type === "string" && call.args.type
                  ? call.args.type.toLowerCase()
                  : "expense";

              if (type === "income") {
                const payload = {
                  userId,
                  amount: call.args.amount,
                  category: call.args.category,
                  currency: call.args.currency || userCurrency,
                  date: dateStr,
                  description: call.args.description,
                  source: call.args.source,
                  ownerType: call.args.owner_type || "me",
                  privacyScope: call.args.privacy_scope || "full",
                  householdId,
                  isRecurring: true,
                  recurrence_rule: recurrenceRule,
                  clientCreatedAt: new Date().toISOString(),
                };
                const { data, error } = await supabase.functions.invoke(
                  "save-income",
                  {
                    body: payload,
                    headers: { "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY },
                  },
                );
                const success = !error && data?.success === true;
                toolResult = success
                  ? { success: true, data: data?.data ?? data }
                  : { error: error ?? data?.error };
                if (!success) {
                  const formatted = formatInvokeError(error ?? data?.error);
                  if (WHATSAPP_DEBUG)
                    debugNotes.push(
                      `save-income (recurring add) error: ${formatted}`,
                    );
                  console.error(
                    "[twilio-whatsapp-ai-bot] save-income recurring add error",
                    { error, formatted },
                  );
                }
              } else {
                const isHouseholdExpense = !!householdId;
                const splitConfig = isHouseholdExpense
                  ? await resolveHouseholdSplitConfig(
                      supabase,
                      householdId!,
                      userId,
                      Number(call.args.amount || 0),
                      call.args,
                    )
                  : {};
                const payload = {
                  userId,
                  amount: call.args.amount,
                  category: call.args.category,
                  currency: call.args.currency || userCurrency,
                  date: dateStr,
                  description: call.args.description,
                  householdId,
                  isPortfolio: spaceMeta?.isPortfolio ?? false,
                  payerUserId: splitConfig.payerUserId,
                  customSplits: splitConfig.customSplits,
                  isRecurring: true,
                  recurrence_rule: recurrenceRule,
                  clientCreatedAt: new Date().toISOString(),
                  type: "expense",
                };
                const { data, error } = await supabase.functions.invoke(
                  "save-expense",
                  {
                    body: payload,
                    headers: { "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY },
                  },
                );
                const success = !error && data?.success === true;
                toolResult = success
                  ? { success: true, data: data?.data ?? data }
                  : { error: error ?? data?.error };
                if (!success) {
                  const formatted = formatInvokeError(error ?? data?.error);
                  if (WHATSAPP_DEBUG)
                    debugNotes.push(
                      `save-expense (recurring add) error: ${formatted}`,
                    );
                  console.error(
                    "[twilio-whatsapp-ai-bot] save-expense recurring add error",
                    { error, formatted },
                  );
                }
              }
            } else if (action === "update") {
              if (!call.args.expense_id) {
                toolResult = { error: "expense_id is required for update" };
              } else {
                let householdId = call.args.household_id as string | null;
                const householdName = (call.args.household_name || "")
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
                const recurrenceRule = buildRecurrenceRule(call.args, dateStr);

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
                    .eq("id", call.args.expense_id)
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
                if (call.args.category != null)
                  updates.category = call.args.category;
                if (call.args.description != null)
                  updates.raw_text = call.args.description;
                if (call.args.currency != null)
                  updates.currency = call.args.currency;
                if (call.args.date != null) updates.date = dateStr;
                updates.is_recurring = true;
                if (call.args.source != null) updates.source = call.args.source;
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
                    expenseId: call.args.expense_id,
                    updates,
                  };
                  if (Object.keys(extraBody).length > 0) {
                    Object.assign(requestBody, extraBody);
                  }
                  const { data, error } = await supabase.functions.invoke(
                    "update-expense",
                    {
                      body: requestBody,
                      headers: { "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY },
                    },
                  );
                  const success = !error && data?.success === true;
                  toolResult = success
                    ? { success: true, data: data?.data ?? data }
                    : { error: error ?? data?.error };
                  if (!success) {
                    const formatted = formatInvokeError(error ?? data?.error);
                    if (WHATSAPP_DEBUG)
                      debugNotes.push(`update-expense error: ${formatted}`);
                    console.error(
                      "[twilio-whatsapp-ai-bot] update-expense error",
                      { error, formatted },
                    );
                  }
                }
              }
            } else {
              const { data, error } = await supabase.functions.invoke(
                "delete-expense",
                {
                  body: { userId, expenseIds: call.args.expense_id },
                  headers: { "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY },
                },
              );
              const success = !error && data?.success === true;
              toolResult = success
                ? { success: true }
                : { error: error ?? data?.error };
              if (!success) {
                const formatted = formatInvokeError(error ?? data?.error);
                if (WHATSAPP_DEBUG)
                  debugNotes.push(`delete-expense error: ${formatted}`);
                console.error("[twilio-whatsapp-ai-bot] delete-expense error", {
                  error,
                  formatted,
                });
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
              summary += `Net: ${formatAmount(net, userCurrency)}\n\nTop categories:\n`;
              snap.categories.forEach((c, idx) => {
                summary += `${idx + 1}. ${c.category}: ${formatAmount(c.amount_cents / 100, userCurrency)}\n`;
              });
              if (snap.budget_cents) {
                const remain = (snap.budget_cents - snap.totalExpense) / 100;
                summary += `\nBudget: ${formatAmount(snap.budget_cents / 100, userCurrency)} | Remaining: ${formatAmount(remain, userCurrency)}`;
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
          if (WHATSAPP_DEBUG)
            debugNotes.push(`tool exception (${call.name}): ${String(e)}`);
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
        const finalResult = await chat.sendMessage(toolResponses);
        finalResponseText = finalResult.response.text();
      } catch (e) {
        console.error(
          "[twilio-whatsapp-ai-bot] Failed to get final AI response:",
          e,
        );
        finalResponseText =
          "I processed your request but encountered an issue generating a response. Please try again.";
        if (WHATSAPP_DEBUG) debugNotes.push(`AI response error: ${String(e)}`);
      }
    }

    // 7. Finalize Response
    if (!finalResponseText || !finalResponseText.trim()) {
      finalResponseText =
        "I couldn't generate a response right now. Please try again in a few seconds.";
    }
    persistedContent = finalResponseText;
    const bodyToSend = finalResponseText;

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
    const immediateText = finalResponseText;
    debugLog(WHATSAPP_DEBUG, "final response", {
      immediateText,
      persistedContent,
    });

    return {
      bodyToSend,
      persistedContent,
      immediateText,
      finalResponseText,
    };
  };

  const deliverTwilioResponse = async (
    computed: {
      bodyToSend: string;
      persistedContent: string;
      immediateText: string;
    },
    deliveryMode: "twiml" | "api",
  ): Promise<Response> => {
    const { bodyToSend, persistedContent, immediateText } = computed;

    if (deliveryMode === "api") {
      const sendResult = await sendWhatsAppMessage(
        twilioAccountSid,
        twilioAuthToken,
        to,
        from,
        bodyToSend,
      );
      if (!sendResult.success) {
        console.error(
          "[twilio-whatsapp-ai-bot] Failed to send WhatsApp message:",
          sendResult.error,
        );
        if (idempotencyKey) {
          await updateTwilioIdempotency(supabase, idempotencyKey, {
            status: "failed",
            delivery: "api",
            response_text: persistedContent,
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
        });
      }
      return xmlResponse(buildTwimlMessage(null));
    }

    if (idempotencyKey) {
      await updateTwilioIdempotency(supabase, idempotencyKey, {
        status: "done",
        delivery: "twiml",
        response_text: persistedContent,
      });
    }

    // Return TwiML with immediate response (no media)
    return xmlResponse(buildTwimlMessage(immediateText));
  };

  if (shouldAckEarly) {
    const ackText = processingAckMessage || "Processing your request now. ⏳";
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
          const errorMessage =
            "I ran into an issue processing that. Please try again in a moment.";
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
        }
      })(),
    );
    return xmlResponse(buildTwimlMessage(ackText));
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
          "I ran into an issue processing that. Please try again in a moment.",
        ),
      );
    }
  }

  if (raceResult.type === "error") {
    console.error(
      "[twilio-whatsapp-ai-bot] Processing failed:",
      raceResult.error,
    );
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
        "I ran into an issue processing that. Please try again in a moment.",
      ),
    );
  }

  const ackText = processingAckMessage || "Processing your request now. ⏳";
  runBackgroundTask(
    (async () => {
      try {
        const result = await computePromise;
        if (result.type === "done") {
          await deliverTwilioResponse(result.data, "api");
        } else {
          const errorMessage =
            "I ran into an issue processing that. Please try again in a moment.";
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
        if (idempotencyKey) {
          await updateTwilioIdempotency(supabase, idempotencyKey, {
            status: "failed",
            delivery: "api",
            response_text: "processing_failed",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })(),
  );

  return xmlResponse(buildTwimlMessage(ackText));
});
