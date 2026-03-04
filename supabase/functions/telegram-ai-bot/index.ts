// Supabase Edge Function: telegram-ai-bot
// Handles Telegram messages, using Gemini AI and existing tools.

import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { corsHeaders } from "../shared/cors.ts";
import { isFreeUser } from "../shared/is-free-user.ts";
import {
  buildCategoryChart,
  buildCategoryGuide,
  CATEGORY_GUIDE,
  formatInvokeError,
  normalizeExpensesForTool,
} from "../shared/formatting-helpers.ts";
import {
  fetchExpensesDirect,
  saveExpenseDirect,
} from "../shared/expenses-helpers.ts";
import type { CustomSplits, MemberSplit } from "../shared/expenses-helpers.ts";
import {
  createOrUpdateBudget,
  getBudgetStatusDirect,
  upsertEnvelope,
  upsertEnvelopeAllocation,
  upsertEnvelopeCategoryLink,
} from "../shared/budgets-helpers.ts";
import { insertChatMessage } from "../shared/chat-helpers.ts";
import { updatePreferredCurrency } from "../shared/currency-helpers.ts";
import { runAnalyzeExpense } from "../shared/analyze-core.ts";
import { sendGeminiMessageWithRetry } from "../shared/gemini-retry.ts";
import {
  reserveIdempotency,
  updateIdempotency,
} from "../shared/bot/idempotency.ts";
import {
  buildTelegramVerificationMessage,
  buildTelegramVerificationUrl,
  REQUIRED_TELEGRAM_TOOL_NAMES,
} from "../shared/telegram-parity.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  fetchUserCategoryPreferences,
  fetchUserCustomCategories,
  fetchUserHiddenCategories,
  mergeAllowedCategories,
} from "../shared/user-categories.ts";
import { buildLanguageOverride } from "../shared/detect-language.ts";

const MODEL_NAME = "gemini-3.1-flash-lite-preview";
const SYSTEM_INSTRUCTION =
  `You are Moneko, a helpful and friendly financial assistant on Telegram.
Your goal is to help users track expenses, manage budgets, and view their financial health.
You can handle personal finances and shared spaces.

**LANGUAGE RULE (HIGHEST PRIORITY):** You MUST detect the language of the user's latest message and reply ENTIRELY in that same language. This overrides conversation history. Even if all previous messages were in English, if the user now writes in Chinese, you MUST reply fully in Chinese. If in Spanish, reply in Spanish. This applies to every part of your response: confirmations, questions, summaries, labels, and follow-ups. Fall back to {{LANGUAGE}} only when the message is ambiguous (pure numbers, emojis, or single universal words).

CRITICAL RULES:
1.  **Currency**: Always use the user's preferred currency or the currency detected in the text. If ambiguous, ask.
    - Use currency symbols (€, $, £, ₦, etc.) when replying instead of ISO codes.
2.  **Spaces**: If the user asks about “spaces” (e.g., family, roommates, private space), clarify which space if they have multiple, or use the household_id + is_portfolio provided in context.
    - Personal account ⇒ expenses with household_id = null (the user's own account).
    - Private space ⇒ household_id != null AND is_portfolio = true (internal flag — never say “portfolio” to the user).
    - Shared space ⇒ household_id != null AND is_portfolio = false.
    When calling tools (especially list_expenses), include a household_id when known or set space_scope to personal account / private space / shared space so the correct account is queried.
3.  **Confirmation**: For ambiguous requests (e.g., "5 coffee"), ask for clarification (Personal or which space? Which category?).
    - Infer a category from the text and propose it (e.g., "latte" -> "food & drink"). Ask for quick confirmation before saving.
4.  **Charts**: If the user asks for a chart or graph, use the 'generate_chart_url' tool and provide the URL in your response. Explain that you are sending an image.
5.  **Recurring**: If the user says "monthly", "weekly", "every month", etc., set 'is_recurring' to true.
6.  **Tone**: Enthusiastic, encouraging, concise, and proactive (suitable for Telegram). Use light emojis, and close with a quick follow-up offer to help further.
7.  **Totals**: When listing or summarizing expenses, always include a total spent for the requested range and mention how many items are shown.
8.  **Safety**: Do not reveal sensitive IDs. Refer to each space by its name only.
9.  **Budgets/Pockets**: Budgets live in the budgets table. They can be split across pockets (envelopes) with percentage shares. When setting a budget, propose a total and how to split it across relevant pockets; create multiple pocket budgets if the user asks for splits.
10. **Pockets/Envelopes Actions**: You can create/update/delete envelopes via set_pocket/delete_pocket, set monthly allocations, link categories to envelopes, and show envelope status (alloc/spent/remaining) for a month.
11. **Reminders/Recurring**: Recurring transactions can include reminders; ask for frequency and whether to set a reminder if the user hints at it.
12. **Income vs Expense**: All transactions live in the "expenses" table with type = "expense" or "income". Default to expense if unclear. Always set the type when listing, adding, updating, or recurring.
13. **Tooling discipline**: For add/update/delete/recurring/budget/envelope requests, call the appropriate tool. For recurring requests without a frequency, default to monthly. For incomes, set type="income".
14. **Bulk imports**: When the user uploads a receipt, bank statement, or file with multiple transactions, use 'add_transactions_batch' to save them all at once.
15. **Privacy**: Never show raw IDs (household_id, expense_id, etc.) to the user. Refer to spaces by name only; if multiple, offer names, not IDs.
16. **No transaction IDs**: Never ask the user for transaction IDs. If you need to disambiguate, ask them to reply with the number from the last list (1..N) or provide amount/date/description.
17. **Currency updates**: Preferred currency is stored in user_contacts.preferred_currency. When the user asks to change currency, call the currency tool to update that column and confirm.
18. **Telegram UX (choices)**: When asking the user to choose among transactions/options, ALWAYS format options as numbered lines like "1. <short label>" (one per line; label <= ~60 chars) so Telegram inline buttons can be generated. Ask them to tap a button.
19. **Splits**: For space expenses, support who paid + how to split. If the user says "paid by X" and/or provides per-member splits, call 'add_transaction' with 'payer_name', 'split_type', and 'member_splits'. If split is not specified, default to an equal split among space members.
20. **Financial snapshot**: For asks like "current financial situation/health/status": provide one concise snapshot for the current month/pay-period: verdict, income vs spending, net, top categories, budget status, upcoming recurring, and 1–2 actions. Always include the text summary; the chart is optional/secondary.
21. **Language**: See the LANGUAGE RULE above. Always mirror the language of the user's latest message.

CURRENT CONTEXT:
- Date: {{DATE}}
- User Currency: {{CURRENCY}}
- Spaces: {{HOUSEHOLDS}}
- Categories (with brand colors): {{CATEGORIES}}
`;

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
  "I am currently working on your request.",
];
const PROCESSING_ACK_DELAY_MS = 3000;
const IDEMPOTENCY_TTL_MINUTES = 60;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const TYPING_ACTION_INTERVAL_MS = 4000;
const GEMINI_PRE_REQUEST_DELAY_MS = 1200;
const GEMINI_MAX_RETRIES = 3;

const INTERNAL_FUNCTION_KEY = (
  Deno.env.get("SECRET_API_KEY") ||
  Deno.env.get("EDGE_FUNCTION_KEY") ||
  ""
).trim();

if (!INTERNAL_FUNCTION_KEY) {
  console.warn(
    "[telegram-ai-bot] INTERNAL_FUNCTION_KEY not configured; internal tool calls will fail",
  );
}

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type TelegramInlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

type TelegramInlineKeyboardMarkup = {
  inline_keyboard: TelegramInlineKeyboardButton[][];
};

type TelegramChoiceOption = {
  index: number;
  label: string;
};

type TelegramCallbackQuery = {
  id: string;
  data?: string;
  message?: TelegramMessage;
  from?: { id?: number };
};

type TelegramMessage = {
  message_id?: number;
  text?: string;
  caption?: string;
  chat?: { id?: number; type?: string };
  from?: { id?: number };
  photo?: Array<{ file_id: string; file_size?: number }>;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  voice?: { file_id: string; mime_type?: string; file_size?: number };
  audio?: { file_id: string; mime_type?: string; file_size?: number };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function runBackgroundTask(task: Promise<unknown>) {
  const edgeRuntime = (globalThis as any)?.EdgeRuntime;
  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(task);
    return;
  }
  void task;
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

function decodeBase64(data: string): Uint8Array {
  const cleaned = data.replace(/^data:.*;base64,/, "");
  const bin = atob(cleaned);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function uint8ToBase64(buf: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    const subarray = buf.subarray(i, Math.min(i + chunkSize, buf.length));
    binary += String.fromCharCode.apply(null, Array.from(subarray));
  }
  return btoa(binary);
}

function formatDateInTimeZone(
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
    return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
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
    console.error("[telegram-ai-bot] analyze-expense timeout/error:", error);
    return { success: false, error: timeoutError, language: "en" };
  }
}

async function getTelegramFile(
  token: string,
  fileId: string,
): Promise<{ file_path?: string; file_size?: number } | null> {
  const url = `https://api.telegram.org/bot${token}/getFile?file_id=${
    encodeURIComponent(
      fileId,
    )
  }`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const payload = await res.json();
  if (!payload?.ok) return null;
  return payload.result || null;
}

async function downloadTelegramFile(
  token: string,
  filePath: string,
): Promise<Uint8Array | null> {
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}

async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: TelegramInlineKeyboardMarkup,
) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    }),
  });
  return res.ok;
}

async function sendTelegramChatAction(
  token: string,
  chatId: number,
  action: "typing" = "typing",
) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendChatAction`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("[telegram-ai-bot] Failed to send chat action:", error);
    return false;
  }
}

function startTelegramTypingHeartbeat(token: string, chatId: number) {
  let active = true;

  const sendTyping = async () => {
    if (!active) return;
    try {
      await sendTelegramChatAction(token, chatId, "typing");
    } catch {
      // ignored intentionally; typing indicators are best-effort
    }
  };

  void sendTyping();
  const intervalId = setInterval(() => {
    void sendTyping();
  }, TYPING_ACTION_INTERVAL_MS);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
}

async function answerTelegramCallbackQuery(
  token: string,
  callbackQueryId: string,
) {
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
  return res.ok;
}

function normalizeText(input?: string | null) {
  return (input || "").trim();
}

function sanitizeArgs(args: unknown): unknown {
  const seen = new WeakMap<object, unknown>();

  const shouldRedact = (path: string[]) => {
    const last = path[path.length - 1];
    const prev = path[path.length - 2];
    return (
      last === "telegram_file_id" || (prev === "media" && last === "file_id")
    );
  };

  const walk = (value: unknown, path: string[]): unknown => {
    if (shouldRedact(path)) return "[redacted]";
    if (value == null) return value;
    if (typeof value !== "object") return value;

    if (value instanceof Uint8Array) {
      return `[uint8array:${value.byteLength}]`;
    }

    if (Array.isArray(value)) {
      return value.map((item, idx) => walk(item, [...path, String(idx)]));
    }

    const obj = value as Record<string, unknown>;
    const cached = seen.get(obj);
    if (cached) return cached;

    const out: Record<string, unknown> = {};
    seen.set(obj, out);
    for (const [key, child] of Object.entries(obj)) {
      out[key] = walk(child, [...path, key]);
    }
    return out;
  };

  return walk(args, []);
}

function resolvePublicBaseUrl() {
  const explicitBaseUrl = Deno.env.get("TELEGRAM_VERIFICATION_BASE_URL") ||
    Deno.env.get("WEB_APP_URL") ||
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("NEXT_PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL");

  if (explicitBaseUrl && /^https?:\/\//i.test(explicitBaseUrl.trim())) {
    return explicitBaseUrl.trim().replace(/\/$/, "");
  }

  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value));

  if (allowedOrigins.length > 0) {
    return allowedOrigins[0].replace(/\/$/, "");
  }

  return "https://moneko.io";
}

function isStartVerification(text: string) {
  return normalizeText(text).toLowerCase() === "start verification";
}

function extractNumberedOptions(text: string): TelegramChoiceOption[] {
  const options: TelegramChoiceOption[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(/^(\d{1,2})[.)]\s+(.+)$/);
    if (!match) continue;
    const index = Number(match[1]);
    const label = match[2].trim();
    if (!Number.isFinite(index) || index <= 0 || !label) continue;
    options.push({ index, label });
    if (options.length >= 8) break;
  }
  return options;
}

function buildChoiceKeyboard(
  text: string,
): TelegramInlineKeyboardMarkup | undefined {
  const options = extractNumberedOptions(text);
  if (!options.length) return undefined;
  return {
    inline_keyboard: options.map((option) => [
      {
        text: `${option.index}. ${option.label}`.slice(0, 64),
        callback_data: `pick_option:${option.index}`,
      },
    ]),
  };
}

function resolveTextFromCallbackChoice(
  callbackData: string,
  sourceText: string,
): string | null {
  if (!callbackData.startsWith("pick_option:")) return null;
  const index = Number(callbackData.split(":")[1]);
  if (!Number.isFinite(index)) return null;
  const options = extractNumberedOptions(sourceText);
  const option = options.find((item) => item.index === index);
  if (!option) return null;
  return `${option.index}. ${option.label}`;
}

function normalizeNameForMatch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

type LastListedTransaction = {
  id: string;
  amountMajor: number;
  currency: string;
  date: string;
  category: string;
  description: string;
  type?: "expense" | "income";
  household_id?: string | null;
};

type LastListedTransactionsMemory = {
  items: LastListedTransaction[];
  saved_at: string;
};

type SessionState = {
  moneko_state?: {
    last_listed_transactions?: LastListedTransactionsMemory;
  };
};

const LAST_LISTED_TTL_MS = 2 * 60 * 60 * 1000;

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
      // ignore
    }
  }
  return {};
}

function normalizeLastListedTransactionFromRow(
  row: any,
): LastListedTransaction | null {
  if (!row || typeof row !== "object") return null;
  const idRaw = (row as any).id;
  const id = typeof idRaw === "string" ? idRaw : String(idRaw || "");
  if (!id) return null;

  const cents = (row as any).amount_cents;
  const amountMajor = typeof cents === "number" && Number.isFinite(cents)
    ? cents / 100
    : Number((row as any).amount) || 0;

  const currency = String((row as any).currency || "").toUpperCase();
  const date = String((row as any).date || "").slice(0, 10);
  const category = String((row as any).category || "").trim();
  const description = String(
    (row as any).raw_text ?? (row as any).description ?? "",
  ).trim();
  const typeRaw = String((row as any).type || "expense").toLowerCase();
  const type = typeRaw === "income" ? "income" : "expense";
  const householdIdRaw = (row as any).household_id;
  const household_id = householdIdRaw == null
    ? null
    : String(householdIdRaw || "") || null;

  return {
    id,
    amountMajor,
    currency,
    date,
    category,
    description,
    type,
    household_id,
  };
}

function readLastListedTransactions(state: SessionState | null): {
  items: LastListedTransaction[] | null;
  expired: boolean;
} {
  const memory = state?.moneko_state?.last_listed_transactions;
  if (!memory || typeof memory !== "object") {
    return { items: null, expired: false };
  }
  const savedAt = (memory as any).saved_at;
  const savedAtMs = typeof savedAt === "string" ? Date.parse(savedAt) : NaN;
  if (!Number.isFinite(savedAtMs)) {
    return { items: null, expired: true };
  }
  if (Date.now() - savedAtMs > LAST_LISTED_TTL_MS) {
    return { items: null, expired: true };
  }
  const rawItems = Array.isArray((memory as any).items)
    ? ((memory as any).items as any[])
    : [];
  const items = rawItems
    .map((item) => (item && typeof item === "object" ? item : null))
    .filter(Boolean) as LastListedTransaction[];
  return { items: items.slice(0, 25), expired: false };
}

function setLastListedTransactions(
  state: SessionState | null,
  items: LastListedTransaction[],
): SessionState {
  const base = normalizeSessionState(state);
  return {
    ...base,
    moneko_state: {
      ...(base.moneko_state || {}),
      last_listed_transactions: {
        items: (items || []).slice(0, 25),
        saved_at: new Date().toISOString(),
      },
    },
  };
}

function clearLastListedTransactions(state: SessionState | null): SessionState {
  const base = normalizeSessionState(state);
  if (!base.moneko_state?.last_listed_transactions) return base;
  const { last_listed_transactions: _last, ...rest } = base.moneko_state;
  if (Object.keys(rest).length === 0) {
    const { moneko_state: _state, ...withoutState } = base;
    return withoutState;
  }
  return { ...base, moneko_state: rest };
}

type TransactionMatch = {
  amount?: number;
  date?: string;
  description_contains?: string;
  category?: string;
  currency?: string;
  type?: "expense" | "income";
};

function normalizeMatchString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function matchesTransaction(
  item: LastListedTransaction,
  match: TransactionMatch,
) {
  if (match.amount != null) {
    const amt = Number(match.amount);
    if (!Number.isFinite(amt)) return false;
    if (Math.abs((item.amountMajor || 0) - amt) > 0.009) return false;
  }
  if (match.date) {
    const d = String(match.date || "").slice(0, 10);
    if (d && item.date !== d) return false;
  }
  if (match.currency) {
    const cur = String(match.currency || "")
      .trim()
      .toUpperCase();
    if (cur && item.currency.toUpperCase() !== cur) return false;
  }
  if (match.type) {
    const t = String(match.type).toLowerCase() === "income"
      ? "income"
      : "expense";
    if ((item.type || "expense") !== t) return false;
  }
  if (match.category) {
    const cat = normalizeMatchString(match.category);
    if (cat && normalizeMatchString(item.category) !== cat) return false;
  }
  if (match.description_contains) {
    const needle = normalizeMatchString(match.description_contains);
    if (needle && !normalizeMatchString(item.description).includes(needle)) {
      return false;
    }
  }
  return true;
}

function buildChoiceSummary(
  item: LastListedTransaction,
  spaceName?: string | null,
): string {
  const amountText = `${item.amountMajor || 0} ${item.currency || "USD"}`;
  const pieces = [
    item.date,
    amountText,
    item.category || "",
    item.description || "",
    spaceName ? `(${spaceName})` : "",
  ].filter((p) => String(p || "").trim().length > 0);
  return pieces.join(" - ");
}

function resolveLastListedSelection(
  items: LastListedTransaction[],
  args: { selection_index?: unknown; match?: unknown },
  spaceNameByHouseholdId?: (
    householdId: string | null | undefined,
  ) => string | null,
):
  | { candidate: LastListedTransaction }
  | {
    needs_disambiguation: true;
    choices: Array<{ index: number; summary: string }>;
  }
  | { error: string } {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return {
      error:
        "No matching transaction found. Ask user to list recent transactions first or provide more details.",
    };
  }

  const rawIndex = Number((args as any).selection_index);
  if (Number.isFinite(rawIndex)) {
    const idx = Math.trunc(rawIndex);
    if (idx >= 1 && idx <= list.length) {
      return { candidate: list[idx - 1] };
    }
    return {
      error:
        `Invalid selection_index. Ask the user to reply with a number from the last list (1..${list.length}).`,
    };
  }

  const matchRaw = (args as any).match;
  const match: TransactionMatch =
    matchRaw && typeof matchRaw === "object" && !Array.isArray(matchRaw)
      ? (matchRaw as TransactionMatch)
      : {};

  const filtered = Object.keys(match).length
    ? list.filter((item) => matchesTransaction(item, match))
    : [];

  if (filtered.length === 1) {
    return { candidate: filtered[0] };
  }

  const choicesSource = filtered.length ? filtered : list;
  const choices = choicesSource
    .slice(0, 10)
    .map((item) => {
      const index = list.findIndex((x) => x.id === item.id) + 1;
      const spaceName = spaceNameByHouseholdId
        ? spaceNameByHouseholdId(item.household_id)
        : null;
      return {
        index: index > 0 ? index : 0,
        summary: buildChoiceSummary(item, spaceName),
      };
    })
    .filter((c) => c.index > 0);

  if (choices.length === 1) {
    const only = list[choices[0].index - 1];
    if (only) return { candidate: only };
  }

  if (choices.length > 1) {
    return { needs_disambiguation: true, choices };
  }

  return {
    error:
      "No matching transaction found. Ask user to list recent transactions first or provide more details.",
  };
}

function detectListTypeFromText(
  text: string,
): "expense" | "income" | undefined {
  const normalized = normalizeMatchString(text);
  const hasIncome = /\b(income|incomes|earning|earnings|salary|salaries)\b/
    .test(normalized);
  const hasExpense =
    /\b(expense|expenses|spending|spend|spent|purchase|purchases)\b/.test(
      normalized,
    );
  if (hasIncome && !hasExpense) return "income";
  if (hasExpense && !hasIncome) return "expense";
  return undefined;
}

function parseListLimitFromText(text: string): number | undefined {
  const normalized = normalizeMatchString(text);
  const candidates = [
    normalized.match(
      /\b(?:latest|recent|last)\s+(\d{1,3})\s+(?:transactions?|expenses?|incomes?)\b/,
    ),
    normalized.match(/\b(\d{1,3})\s+(?:transactions?|expenses?|incomes?)\b/),
  ];
  for (const match of candidates) {
    const raw = Number(match?.[1] || NaN);
    if (!Number.isFinite(raw)) continue;
    const value = Math.trunc(raw);
    if (value >= 1) return Math.min(50, value);
  }
  return undefined;
}

function inferListExpensesArgsFromText(text: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const limit = parseListLimitFromText(text);
  if (typeof limit === "number") args.limit = limit;
  const type = detectListTypeFromText(text);
  if (type) args.type = type;
  const scope = detectSpaceScopeFromText(text);
  if (scope) args.space_scope = scope;
  return args;
}

function normalizeSpaceScope(
  value: unknown,
): "personal" | "private" | "shared" | null {
  const normalized = normalizeMatchString(value).replace(/\s+/g, "_");
  if (!normalized) return null;
  if (
    normalized === "personal" ||
    normalized === "personal_account" ||
    normalized === "own_account" ||
    normalized === "me"
  ) {
    return "personal";
  }
  if (
    normalized === "portfolio" ||
    normalized === "private" ||
    normalized === "private_space" ||
    normalized === "private_account" ||
    normalized === "portfolio_space"
  ) {
    return "private";
  }
  if (
    normalized === "shared" ||
    normalized === "shared_space" ||
    normalized === "household" ||
    normalized === "family_space" ||
    normalized === "joint" ||
    normalized === "roommate"
  ) {
    return "shared";
  }
  return null;
}

function detectSpaceScopeFromText(
  text: string,
): "personal" | "private" | "shared" | undefined {
  const normalized = normalizeMatchString(text);
  if (!normalized) return undefined;
  if (
    /\b(personal account|personal-only|my personal|my own account)\b/.test(
      normalized,
    )
  ) {
    return "personal";
  }
  if (
    /\b(portfolio|private space|private account|investment account|investing space)\b/
      .test(
        normalized,
      )
  ) {
    return "private";
  }
  if (
    /\b(shared|household|family space|roommate|joint account)\b/.test(
      normalized,
    )
  ) {
    return "shared";
  }
  return undefined;
}

function shouldForceListExpensesCall(text: string): boolean {
  const normalized = normalizeMatchString(text);
  if (!normalized) return false;

  const hasTransactionNoun =
    /\b(transaction|transactions|expense|expenses|income|incomes|spending|spend|spent|earning|earnings)\b/
      .test(
        normalized,
      );
  if (!hasTransactionNoun) return false;

  const hasListIntent =
    /\b(show|list|display|get|fetch|view|see)\b/.test(normalized) ||
    /\b(latest|recent|last)\b/.test(normalized);
  if (!hasListIntent) return false;

  const hasMutationIntent = /\b(update|edit|change|delete|remove|set)\b/.test(
    normalized,
  );
  return !hasMutationIntent;
}

async function loadSessionState(
  supabase: SupabaseJsClient,
  sessionId: string,
  debugNotes: string[],
): Promise<SessionState> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("system_prompt")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) {
    debugNotes.push(
      `chat_sessions load state error: ${formatInvokeError(error)}`,
    );
    return {};
  }
  return normalizeSessionState((data as any)?.system_prompt);
}

async function saveSessionState(
  supabase: SupabaseJsClient,
  sessionId: string,
  state: SessionState,
  debugNotes: string[],
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({ system_prompt: state, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) {
    debugNotes.push(
      `chat_sessions save state error: ${formatInvokeError(error)}`,
    );
  }
}

type BudgetEnvelopeRowLite = {
  id: string;
  name: string;
  updated_at: string | null;
};

function normalizeEnvelopeName(value: string): string {
  return (value || "").trim().toLowerCase();
}

function normalizePeriodMonth(value: string): string {
  const trimmed = (value || "").trim();
  if (trimmed.length >= 7) return `${trimmed.slice(0, 7)}-01`;
  return trimmed;
}

function isNewerIso(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  const ta = a ? Date.parse(a) : Number.NEGATIVE_INFINITY;
  const tb = b ? Date.parse(b) : Number.NEGATIVE_INFINITY;
  return ta > tb;
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value * 100) / 100;
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  return `${isInt ? Math.round(rounded) : rounded}%`;
}

function buildBudgetDoneText(
  pockets: Array<{ name: string; percentage: number }>,
): string {
  const cleaned = pockets
    .map((p) => ({
      name: (p.name || "").trim(),
      percentage: Number(p.percentage) || 0,
    }))
    .filter((p) => p.name.length > 0);
  if (!cleaned.length) return "Done — budget updated.";
  const list = cleaned
    .map((p) => `${p.name} ${formatPct(p.percentage)}`)
    .join(", ");
  return `Done — updated pockets: ${list}.`;
}

async function consolidateDuplicateEnvelopesForBudget(
  supabase: SupabaseJsClient,
  budgetId: string,
  periodMonth: string,
  debugNotes: string[],
): Promise<Map<string, BudgetEnvelopeRowLite>> {
  const normalizedPeriod = normalizePeriodMonth(periodMonth);
  const { data: envRowsRaw, error: envErr } = await supabase
    .from("budget_envelopes")
    .select("id, name, updated_at")
    .eq("budget_id", budgetId);

  const envRows = (envRowsRaw || []) as BudgetEnvelopeRowLite[];
  if (envErr) {
    debugNotes.push(
      `budget_envelopes load error: ${formatInvokeError(envErr)}`,
    );
    return new Map();
  }

  const byNorm = new Map<string, BudgetEnvelopeRowLite[]>();
  for (const row of envRows) {
    const norm = normalizeEnvelopeName(row?.name || "");
    if (!norm) continue;
    const list = byNorm.get(norm) || [];
    list.push(row);
    byNorm.set(norm, list);
  }

  const duplicateGroups = Array.from(byNorm.entries()).filter(
    ([, rows]) => rows.length > 1,
  );
  if (!duplicateGroups.length) {
    const map = new Map<string, BudgetEnvelopeRowLite>();
    for (const [norm, rows] of byNorm.entries()) {
      const chosen = rows.reduce((acc, cur) =>
        isNewerIso(cur.updated_at, acc.updated_at) ? cur : acc
      );
      map.set(norm, chosen);
    }
    return map;
  }

  for (const [norm, group] of duplicateGroups) {
    const ids = group.map((r) => r.id).filter(Boolean);
    if (ids.length < 2) continue;

    const { data: linksRaw, error: linksErr } = await supabase
      .from("envelope_category_links")
      .select("envelope_id, category")
      .in("envelope_id", ids);
    if (linksErr) {
      debugNotes.push(
        `envelope_category_links load error (${norm}): ${
          formatInvokeError(
            linksErr,
          )
        }`,
      );
    }
    const links = (linksRaw || []) as Array<{
      envelope_id: string;
      category: string;
    }>;

    const linkCounts = new Map<string, number>();
    for (const l of links) {
      const id = String((l as any)?.envelope_id || "");
      if (!id) continue;
      linkCounts.set(id, (linkCounts.get(id) || 0) + 1);
    }

    const canonical = group.reduce((acc, cur) => {
      const accCount = linkCounts.get(acc.id) || 0;
      const curCount = linkCounts.get(cur.id) || 0;
      if (curCount !== accCount) return curCount > accCount ? cur : acc;
      return isNewerIso(cur.updated_at, acc.updated_at) ? cur : acc;
    });
    const canonicalId = canonical.id;
    const dupIds = ids.filter((id) => id !== canonicalId);
    if (!canonicalId || dupIds.length === 0) continue;

    const categoriesToUpsert = new Set<string>();
    for (const l of links) {
      const envId = String((l as any)?.envelope_id || "");
      if (!dupIds.includes(envId)) continue;
      const cat = String((l as any)?.category || "");
      if (!cat) continue;
      categoriesToUpsert.add(cat);
    }
    for (const cat of categoriesToUpsert) {
      await upsertEnvelopeCategoryLink(supabase, canonicalId, cat);
    }

    await supabase
      .from("envelope_category_links")
      .delete()
      .in("envelope_id", dupIds);

    const { data: canonicalAlloc } = await supabase
      .from("envelope_allocations")
      .select("envelope_id")
      .eq("envelope_id", canonicalId)
      .eq("period_month", normalizedPeriod)
      .maybeSingle();

    if (!canonicalAlloc) {
      const { data: dupAllocs } = await supabase
        .from("envelope_allocations")
        .select("amount_cents")
        .in("envelope_id", dupIds)
        .eq("period_month", normalizedPeriod);
      const sum = (dupAllocs || []).reduce((acc: number, row: any) => {
        const v = Number(row?.amount_cents) || 0;
        return acc + v;
      }, 0);
      if (sum > 0) {
        await upsertEnvelopeAllocation(
          supabase,
          canonicalId,
          normalizedPeriod,
          sum,
        );
      }
    }

    await supabase
      .from("envelope_allocations")
      .delete()
      .in("envelope_id", dupIds);
    const { error: deleteEnvErr } = await supabase
      .from("budget_envelopes")
      .delete()
      .in("id", dupIds);
    if (deleteEnvErr) {
      debugNotes.push(
        `duplicate envelope delete error (${norm}): ${
          formatInvokeError(
            deleteEnvErr,
          )
        }`,
      );
    }
  }

  const { data: finalRowsRaw } = await supabase
    .from("budget_envelopes")
    .select("id, name, updated_at")
    .eq("budget_id", budgetId);
  const finalRows = (finalRowsRaw || []) as BudgetEnvelopeRowLite[];
  const map = new Map<string, BudgetEnvelopeRowLite>();
  for (const row of finalRows) {
    const norm = normalizeEnvelopeName(row?.name || "");
    if (!norm) continue;
    const existing = map.get(norm);
    if (!existing || isNewerIso(row.updated_at, existing.updated_at)) {
      map.set(norm, row);
    }
  }
  return map;
}

function resolveMemberIdByName(
  members: Array<{
    user_id: string;
    users?: { full_name?: string; email?: string };
  }>,
  query: string,
): string | null {
  const q = normalizeNameForMatch(query);
  if (!q) return null;

  const matches: string[] = [];
  for (const member of members) {
    const name = normalizeNameForMatch(member.users?.full_name || "");
    const email = normalizeNameForMatch(member.users?.email || "");
    if (!member.user_id) continue;
    if (name === q || email === q) matches.push(member.user_id);
    else if (name.includes(q) || email.includes(q)) {
      matches.push(member.user_id);
    }
  }
  const unique = Array.from(new Set(matches));
  if (unique.length !== 1) return null;
  return unique[0];
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
    return { payerUserId };
  }

  const inferredType = (() => {
    if (["equal", "amount", "percentage", "shares"].includes(splitTypeHint)) {
      return splitTypeHint;
    }
    const hasPct = memberSplitsRaw.some(
      (split: any) => typeof split?.percentage === "number",
    );
    const hasShares = memberSplitsRaw.some(
      (split: any) => typeof split?.shares === "number",
    );
    return hasPct ? "percentage" : hasShares ? "shares" : "amount";
  })();

  const byId = new Map<string, any>();
  for (const split of memberSplitsRaw) {
    const memberName = (
      split?.member_name ||
      split?.member ||
      split?.name ||
      ""
    )
      .toString()
      .trim();
    if (!memberName) continue;
    const memberId = resolveMemberIdByName(members as any, memberName);
    if (!memberId) continue;
    byId.set(memberId, split);
  }

  const total = Number.isFinite(totalAmount) ? Math.max(0, totalAmount) : 0;
  const fullSplits: MemberSplit[] = [];

  if (inferredType === "amount") {
    let specifiedSum = 0;
    const missing: string[] = [];
    for (const id of memberIds) {
      const split = byId.get(id);
      const amount = typeof split?.amount === "number"
        ? Math.max(0, split.amount)
        : null;
      if (amount == null) missing.push(id);
      else specifiedSum += amount;
    }
    const remaining = Math.max(0, total - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;

    for (const id of memberIds) {
      const split = byId.get(id);
      const amount = typeof split?.amount === "number"
        ? Math.max(0, split.amount)
        : perMissing;
      fullSplits.push({ userId: id, amount });
    }
  } else if (inferredType === "percentage") {
    let specifiedSum = 0;
    const missing: string[] = [];
    for (const id of memberIds) {
      const split = byId.get(id);
      const percentage = typeof split?.percentage === "number"
        ? Math.max(0, Math.min(100, split.percentage))
        : null;
      if (percentage == null) missing.push(id);
      else specifiedSum += percentage;
    }
    const remaining = Math.max(0, 100 - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;

    for (const id of memberIds) {
      const split = byId.get(id);
      const percentage = typeof split?.percentage === "number"
        ? Math.max(0, Math.min(100, split.percentage))
        : perMissing;
      fullSplits.push({ userId: id, percentage });
    }
  } else if (inferredType === "shares") {
    for (const id of memberIds) {
      const split = byId.get(id);
      const shares = typeof split?.shares === "number"
        ? Math.max(1, Math.trunc(split.shares))
        : 1;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

  const missingEnv: string[] = [];
  if (!TELEGRAM_BOT_TOKEN) missingEnv.push("TELEGRAM_BOT_TOKEN");
  if (!TELEGRAM_WEBHOOK_SECRET) missingEnv.push("TELEGRAM_WEBHOOK_SECRET");
  if (!SUPABASE_URL) missingEnv.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!GEMINI_API_KEY) missingEnv.push("GEMINI_API_KEY");

  if (missingEnv.length) {
    console.error(
      `[telegram-ai-bot] Missing required environment variables: ${
        missingEnv.join(
          ", ",
        )
      }`,
    );
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const secretHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token") ||
    req.headers.get("x-telegram-bot-api-secret-token");
  if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
    return jsonResponse({ ok: true });
  }

  let update: TelegramUpdate | null = null;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return jsonResponse({ ok: true });
  }

  const callbackQuery = update?.callback_query;
  const message = update?.message ?? callbackQuery?.message;
  const callbackData = normalizeText(callbackQuery?.data || "");
  const chatId = message?.chat?.id;
  const messageId = message?.message_id ?? update?.update_id;
  if (!chatId || !messageId) {
    return jsonResponse({ ok: true });
  }

  const traceId = `${chatId}:${messageId}:${Date.now()}`;

  if (callbackQuery?.id) {
    await answerTelegramCallbackQuery(TELEGRAM_BOT_TOKEN, callbackQuery.id);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const idempotencyKey = callbackQuery?.id
    ? `telegram:${chatId}:callback:${callbackQuery.id}`
    : `telegram:${chatId}:${messageId}`;
  const processingAckMessage = pickProcessingMessage();

  const reserve = await reserveIdempotency(
    supabase,
    idempotencyKey,
    processingAckMessage,
    IDEMPOTENCY_TTL_MINUTES,
  );
  if (reserve.status === "duplicate") {
    const cached = reserve.result;
    if (cached?.response_text) {
      console.log("[telegram-ai-bot] idempotency duplicate", {
        chatId,
        messageId,
        idempotencyKey,
      });
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        cached.response_text,
        buildChoiceKeyboard(cached.response_text),
      );
    } else if (cached?.status === "processing") {
      await sendTelegramChatAction(TELEGRAM_BOT_TOKEN, chatId, "typing");
    }
    return jsonResponse({ ok: true });
  }

  runBackgroundTask(
    (async () => {
      const debugNotes: string[] = [];
      const stopTypingHeartbeat = startTelegramTypingHeartbeat(
        TELEGRAM_BOT_TOKEN,
        chatId,
      );
      try {
        const { data: contextDataRaw, error: contextError } = await supabase
          .rpc("get_telegram_context", { p_telegram_chat_id: String(chatId) })
          .single();
        const contextData: any = contextDataRaw as any;

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

        if (contextError) {
          debugNotes.push(`context error: ${formatInvokeError(contextError)}`);
        }

        const originalMessageText = normalizeText(
          message?.text || message?.caption || "",
        );
        const callbackChoiceText = resolveTextFromCallbackChoice(
          callbackData,
          normalizeText(message?.text),
        );
        const incomingText = callbackData === "start_verification"
          ? "start verification"
          : callbackChoiceText ||
            (callbackData.startsWith("pick_option:")
              ? callbackData.replace("pick_option:", "").trim()
              : originalMessageText);

        console.log("[telegram-ai-bot] incoming", {
          traceId,
          chatId,
          messageId,
          idempotencyKey,
          isCallback: !!callbackQuery?.id,
          textPreview: incomingText.slice(0, 120),
        });

        if (incomingText && isStartVerification(incomingText)) {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

          await supabase
            .from("whatsapp_verifications")
            .delete()
            .eq("channel", "telegram")
            .eq("subject", `telegram:${chatId}`)
            .eq("verified", false);

          await supabase.from("whatsapp_verifications").insert({
            channel: "telegram",
            subject: `telegram:${chatId}`,
            phone_e164: null,
            verification_code: code,
            expires_at: expiresAt.toISOString(),
          });

          const baseUrl = resolvePublicBaseUrl();
          const verificationUrl = buildTelegramVerificationUrl(baseUrl, code);
          const msg = buildTelegramVerificationMessage(code, verificationUrl);
          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg, {
            inline_keyboard: [
              [
                {
                  text: "Verify in Moneko",
                  url: verificationUrl,
                },
              ],
            ],
          });
          await updateIdempotency(supabase, idempotencyKey, {
            status: "done",
            response_text: msg,
          });
          return;
        }

        if (!contact || !contact.verified || !contact.user_id) {
          const prompt =
            "🔐 Account Not Verified\n\nTo use Moneko, start verification below.";
          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, prompt, {
            inline_keyboard: [
              [
                {
                  text: "Start Verification",
                  callback_data: "start_verification",
                },
              ],
            ],
          });
          await updateIdempotency(supabase, idempotencyKey, {
            status: "done",
            response_text: prompt,
          });
          return;
        }

        const subscription = contextData
          ? {
            plan: contextData.subscription_plan,
            status: contextData.subscription_status,
          }
          : null;
        if (isFreeUser(subscription)) {
          const nonSubscriberMessage =
            "You're on the free plan. Upgrade to unlock full features.";
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            nonSubscriberMessage,
          );
          await updateIdempotency(supabase, idempotencyKey, {
            status: "done",
            response_text: nonSubscriberMessage,
          });
          return;
        }

        const userId = contact.user_id as string;
        const userCurrency = contact.preferred_currency || "USD";
        const userLang = contact.preferred_language || "en";
        const userTimezone = contact.preferred_timezone || "UTC";

        const [customCategories, hiddenCategories, categoryPreferences] =
          await Promise.all([
            fetchUserCustomCategories({ supabase, userId }),
            fetchUserHiddenCategories({ supabase, userId }),
            fetchUserCategoryPreferences({ supabase, userId }),
          ]);
        const { expenseCategories, incomeCategories } = mergeAllowedCategories({
          customCategories,
          hiddenCategories,
        });
        const allowedExpenseCategories = expenseCategories;
        const allowedIncomeCategories = incomeCategories;
        const categoryGuideForUser = buildCategoryGuide([
          ...expenseCategories,
          ...incomeCategories,
        ]);
        const chatHouseholds = contextData?.households || [];
        const spaceMap = new Map<
          string,
          { id: string; name: string; isPortfolio: boolean }
        >();
        const portfolioSpaceIds: string[] = [];
        const sharedSpaceIds: string[] = [];
        const sharedSpaceIdSet = new Set<string>();
        for (const h of chatHouseholds as any[]) {
          if (!h) continue;
          const id = String((h as any).household_id || "");
          const name = String((h as any).name || "");
          const isPortfolio = (h as any).is_portfolio === true;
          if (id) {
            const value = { id, name, isPortfolio };
            spaceMap.set(id, value);
            if (isPortfolio) {
              portfolioSpaceIds.push(id);
            } else if (!sharedSpaceIdSet.has(id)) {
              sharedSpaceIdSet.add(id);
              sharedSpaceIds.push(id);
            }
          }
          if (name) spaceMap.set(name.toLowerCase(), { id, name, isPortfolio });
        }

        const sessionIdValue = `telegram:${chatId}`;
        let session = contextData?.chat_session_id
          ? { id: contextData.chat_session_id }
          : null;

        if (!session) {
          const { data: newSession, error: sessionError } = await supabase
            .from("chat_sessions")
            .insert({
              user_id: userId,
              session_id: sessionIdValue,
              model: MODEL_NAME,
              channel: "telegram",
            })
            .select()
            .single();
          if (sessionError || !newSession) {
            console.error("Failed to create chat session:", sessionError);
            await sendTelegramMessage(
              TELEGRAM_BOT_TOKEN,
              chatId,
              "Failed to initialize chat session.",
            );
            await updateIdempotency(supabase, idempotencyKey, {
              status: "failed",
              response_text: "session_failed",
            });
            return;
          }
          session = newSession;
        }

        const sessionId = session?.id;
        if (!sessionId) {
          await updateIdempotency(supabase, idempotencyKey, {
            status: "failed",
            response_text: "session_missing",
          });
          return;
        }

        let sessionState = await loadSessionState(
          supabase,
          sessionId,
          debugNotes,
        );
        const lastListedRead = readLastListedTransactions(sessionState);
        if (!lastListedRead.items && lastListedRead.expired) {
          sessionState = clearLastListedTransactions(sessionState);
          await saveSessionState(supabase, sessionId, sessionState, debugNotes);
        }

        let userMessageContent = incomingText;

        const photo = message?.photo?.[message.photo.length - 1];
        const doc = message?.document;
        const voice = message?.voice || message?.audio;

        if (photo?.file_id) {
          const captionNote = message?.caption
            ? ` Caption: "${message.caption}".`
            : "";
          userMessageContent =
            `[User sent an image receipt.${captionNote} If you need to extract transactions, call analyze_expense with media { kind: "image", file_id: "${photo.file_id}" } (or telegram_file_id: "${photo.file_id}").]`;
        } else if (voice?.file_id) {
          const captionNote = message?.caption
            ? ` Caption: "${message.caption}".`
            : "";
          userMessageContent =
            `[User sent an audio message.${captionNote} If you need to extract transactions, call analyze_expense with media { kind: "audio", file_id: "${voice.file_id}" } (or telegram_file_id: "${voice.file_id}").]`;
        } else if (doc?.file_id) {
          const captionNote = message?.caption
            ? ` Caption: "${message.caption}".`
            : "";
          const nameNote = doc.file_name ? ` Name: "${doc.file_name}".` : "";
          const mimeNote = doc.mime_type ? ` Mime: "${doc.mime_type}".` : "";
          userMessageContent =
            `[User sent a file attachment.${nameNote}${mimeNote}${captionNote} If you need to extract transactions, call analyze_expense with media { kind: "file", file_id: "${doc.file_id}" } (or telegram_file_id: "${doc.file_id}").]`;
        }

        const { data: history } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("chat_session_id", sessionId)
          .order("timestamp", { ascending: false })
          .limit(20);
        const rawHistory = (history || []).reverse().map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        while (rawHistory.length > 0 && rawHistory[0].role === "model") {
          rawHistory.shift();
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: MODEL_NAME,
          systemInstruction: SYSTEM_INSTRUCTION.replace(
            "{{DATE}}",
            formatDateInTimeZone(userTimezone),
          )
            .replace("{{CURRENCY}}", userCurrency)
            .replace("{{HOUSEHOLDS}}", JSON.stringify(chatHouseholds))
            .replace("{{CATEGORIES}}", categoryGuideForUser)
            .replace("{{LANGUAGE}}", userLang) +
            buildLanguageOverride(incomingText),
        });

        const tools = [
          {
            name: "analyze_expense",
            description:
              "Extract one or more transactions from text or a Telegram attachment (receipt image, audio, or file). Call this only if you need structured items.",
            parameters: {
              type: "OBJECT",
              properties: {
                text: { type: "STRING" },
                telegram_file_id: { type: "STRING" },
                media: {
                  type: "OBJECT",
                  properties: {
                    kind: {
                      type: "STRING",
                      enum: ["image", "audio", "file"],
                    },
                    file_id: { type: "STRING" },
                  },
                },
              },
            },
          },
          {
            name: "add_transaction",
            description:
              "Add an expense or income transaction. Use this for both personal and shared spaces.",
            parameters: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING", enum: ["expense", "income"] },
                amount: { type: "NUMBER" },
                category: { type: "STRING" },
                description: { type: "STRING" },
                date: { type: "STRING" },
                currency: { type: "STRING" },
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
                owner_type: {
                  type: "STRING",
                  enum: ["me", "partner", "household"],
                },
                privacy_scope: {
                  type: "STRING",
                  enum: ["private", "balances_only", "full"],
                },
                source: { type: "STRING" },
                is_recurring: { type: "BOOLEAN" },
                frequency: { type: "STRING" },
              },
              required: ["type", "amount", "category"],
            },
          },
          {
            name: "add_transactions_batch",
            description: "Add multiple transactions at once.",
            parameters: {
              type: "OBJECT",
              properties: {
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
                transactions: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      type: { type: "STRING", enum: ["expense", "income"] },
                      amount: { type: "NUMBER" },
                      category: { type: "STRING" },
                      description: { type: "STRING" },
                      date: { type: "STRING" },
                      currency: { type: "STRING" },
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
                      source: { type: "STRING" },
                      owner_type: {
                        type: "STRING",
                        enum: ["me", "partner", "household"],
                      },
                      privacy_scope: {
                        type: "STRING",
                        enum: ["private", "balances_only", "full"],
                      },
                      is_recurring: { type: "BOOLEAN" },
                      frequency: { type: "STRING" },
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
            description:
              "Update a previously listed transaction (no transaction IDs).",
            parameters: {
              type: "OBJECT",
              properties: {
                selection_index: { type: "NUMBER" },
                match: {
                  type: "OBJECT",
                  properties: {
                    amount: { type: "NUMBER" },
                    date: { type: "STRING", description: "YYYY-MM-DD" },
                    description_contains: { type: "STRING" },
                    category: { type: "STRING" },
                    currency: { type: "STRING" },
                    type: { type: "STRING", enum: ["expense", "income"] },
                  },
                },
                updates: {
                  type: "OBJECT",
                  properties: {
                    amount: { type: "NUMBER" },
                    category: { type: "STRING" },
                    description: { type: "STRING" },
                    date: { type: "STRING", description: "YYYY-MM-DD" },
                    currency: { type: "STRING" },
                    household_id: {
                      type: "STRING",
                      description:
                        "ID of the target space. Use this when moving the transaction to a specific household/private space.",
                    },
                    household_name: {
                      type: "STRING",
                      description:
                        "Human-readable name of the space to move the transaction into (case-insensitive).",
                    },
                    space_scope: {
                      type: "STRING",
                      enum: [
                        "personal",
                        "personal_account",
                        "portfolio",
                        "private_space",
                        "shared",
                        "shared_space",
                      ],
                      description:
                        "High-level destination: personal account, private/portfolio space, or shared household.",
                    },
                    space_target: {
                      type: "STRING",
                      description:
                        "Optional free-form hint for the target space (e.g., 'move to living expenses space').",
                    },
                  },
                },
              },
              required: ["updates"],
            },
          },
          {
            name: "delete_transaction",
            description:
              "Delete a previously listed transaction (no transaction IDs).",
            parameters: {
              type: "OBJECT",
              properties: {
                selection_index: { type: "NUMBER" },
                match: {
                  type: "OBJECT",
                  properties: {
                    amount: { type: "NUMBER" },
                    date: { type: "STRING", description: "YYYY-MM-DD" },
                    description_contains: { type: "STRING" },
                    category: { type: "STRING" },
                    currency: { type: "STRING" },
                    type: { type: "STRING", enum: ["expense", "income"] },
                  },
                },
              },
            },
          },
          {
            name: "list_expenses",
            description: "List recent transactions (expenses or income).",
            parameters: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING", enum: ["expense", "income"] },
                currency: { type: "STRING" },
                limit: { type: "NUMBER" },
                start_date: { type: "STRING" },
                end_date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
                space_scope: {
                  type: "STRING",
                  enum: [
                    "personal",
                    "personal_account",
                    "portfolio",
                    "private_space",
                    "shared",
                    "shared_space",
                    "household",
                  ],
                  description:
                    "Optional high-level scope hint: personal (household_id null), portfolio/private space, or shared household.",
                },
              },
            },
          },
          {
            name: "generate_chart_url",
            description: "Generate a URL for a chart.",
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
            description: "Generate a financial health snapshot.",
            parameters: {
              type: "OBJECT",
              properties: { scope: { type: "STRING" } },
            },
          },
          {
            name: "get_budget",
            description: "Get current budget status.",
            parameters: {
              type: "OBJECT",
              properties: {
                date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
              },
            },
          },
          {
            name: "draft_budget",
            description: "Draft a budget proposal for confirmation.",
            parameters: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
                pockets: { type: "ARRAY", items: { type: "OBJECT" } },
              },
              required: ["amount"],
            },
          },
          {
            name: "confirm_budget",
            description: "Confirm and apply a budget draft.",
            parameters: {
              type: "OBJECT",
              properties: {
                confirm: { type: "BOOLEAN" },
                amount: { type: "NUMBER" },
                date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
                pockets: { type: "ARRAY", items: { type: "OBJECT" } },
              },
            },
          },
          {
            name: "set_budget",
            description: "Set budget amount for a month.",
            parameters: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
                pockets: { type: "ARRAY", items: { type: "OBJECT" } },
              },
              required: ["amount"],
            },
          },
          {
            name: "set_pocket",
            description: "Create or update a budget pocket.",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                percentage: { type: "NUMBER" },
                categories: { type: "ARRAY", items: { type: "STRING" } },
                date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
              },
              required: ["name"],
            },
          },
          {
            name: "delete_pocket",
            description: "Delete a budget pocket by name.",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
              },
              required: ["name"],
            },
          },
          {
            name: "set_currency",
            description: "Update preferred currency.",
            parameters: {
              type: "OBJECT",
              properties: { currency: { type: "STRING" } },
              required: ["currency"],
            },
          },
          {
            name: "manage_recurring",
            description: "Add, update, or delete recurring transactions.",
            parameters: {
              type: "OBJECT",
              properties: {
                action: { type: "STRING", enum: ["add", "update", "delete"] },
                expense_id: { type: "STRING" },
                selection_index: { type: "NUMBER" },
                match: {
                  type: "OBJECT",
                  properties: {
                    amount: { type: "NUMBER" },
                    date: { type: "STRING", description: "YYYY-MM-DD" },
                    description_contains: { type: "STRING" },
                    category: { type: "STRING" },
                    currency: { type: "STRING" },
                    type: { type: "STRING", enum: ["expense", "income"] },
                  },
                },
                amount: { type: "NUMBER" },
                category: { type: "STRING" },
                description: { type: "STRING" },
                date: { type: "STRING" },
                currency: { type: "STRING" },
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
                frequency: { type: "STRING" },
                type: { type: "STRING", enum: ["expense", "income"] },
              },
              required: ["action"],
            },
          },
        ];

        if (REQUIRED_TELEGRAM_TOOL_NAMES.length > tools.length) {
          debugNotes.push("telegram tool set is below parity baseline");
        }

        const chat = model.startChat({
          history: rawHistory,
          tools: [{ function_declarations: tools }] as any,
        });
        const result = await sendGeminiMessageWithRetry(
          chat as any,
          userMessageContent,
          {
            preRequestDelayMs: GEMINI_PRE_REQUEST_DELAY_MS,
            maxRetries: GEMINI_MAX_RETRIES,
            logPrefix: "telegram-ai-bot",
          },
        );
        let response = await result.response;
        let functionCalls = (response.functionCalls() as any[]) || [];
        let finalResponseText = response.text();

        console.log("[telegram-ai-bot] model response", {
          traceId,
          functionCalls: functionCalls.map((c: any) => ({
            name: c?.name,
            argsKeys: Object.keys(
              c?.args && typeof c.args === "object" && !Array.isArray(c.args)
                ? c.args
                : {},
            ),
          })),
          hasText: !!(response.text() || "").trim(),
        });

        if (
          shouldForceListExpensesCall(incomingText) &&
          (!functionCalls || functionCalls.length === 0)
        ) {
          const forcedArgs = inferListExpensesArgsFromText(incomingText);
          functionCalls = [{ name: "list_expenses", args: forcedArgs } as any];
          debugNotes.push(
            `forced list_expenses call for list intent (args: ${
              JSON.stringify(forcedArgs)
            })`,
          );
          console.log("[telegram-ai-bot] forced tool call", {
            traceId,
            name: "list_expenses",
            args: forcedArgs,
            reason: "list_intent_without_function_call",
          });
        }

        let toolSucceededAny = false;
        let lastToolResult: any = null;
        let lastToolCallName: string | null = null;
        let lastBudgetPockets:
          | Array<{
            name: string;
            percentage: number;
          }>
          | null = null;
        let toolIterations = 0;

        while (
          functionCalls &&
          functionCalls.length > 0 &&
          toolIterations < 3
        ) {
          const toolResponses: any[] = [];
          for (const call of functionCalls) {
            let toolResult: any = {};

            console.log("[telegram-ai-bot] tool call", {
              traceId,
              name: call.name,
              args: sanitizeArgs(call.args),
            });

            try {
              if (call.name === "analyze_expense") {
                const text = typeof call.args?.text === "string"
                  ? call.args.text.trim()
                  : "";
                const fileId = (typeof call.args?.telegram_file_id === "string"
                  ? call.args.telegram_file_id.trim()
                  : "") ||
                  (typeof call.args?.media?.file_id === "string"
                    ? call.args.media.file_id.trim()
                    : "");
                const kindHintRaw = typeof call.args?.media?.kind === "string"
                  ? call.args.media.kind
                  : "";
                const kindHint = ["image", "audio", "file"].includes(
                    kindHintRaw,
                  )
                  ? kindHintRaw
                  : "";

                const inferKindFromPath = (filePath: string) => {
                  const lower = (filePath || "").toLowerCase();
                  if (/(\.jpg|\.jpeg|\.png|\.gif|\.webp|\.bmp)$/i.test(lower)) {
                    return "image";
                  }
                  if (/(\.oga|\.ogg|\.mp3|\.m4a|\.wav|\.aac)$/i.test(lower)) {
                    return "audio";
                  }
                  return "file";
                };

                const XLSX_CONTENT_TYPE =
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                const guessContentType = (filePath: string, kind: string) => {
                  const lower = (filePath || "").toLowerCase();

                  if (kind === "image") {
                    if (lower.endsWith(".png")) {
                      return "image/png";
                    }
                    if (lower.endsWith(".webp")) {
                      return "image/webp";
                    }
                    if (lower.endsWith(".gif")) {
                      return "image/gif";
                    }
                    return "image/jpeg";
                  }

                  if (kind === "audio") {
                    if (lower.endsWith(".mp3")) {
                      return "audio/mpeg";
                    }
                    if (lower.endsWith(".wav")) {
                      return "audio/wav";
                    }
                    if (lower.endsWith(".m4a")) {
                      return "audio/mp4";
                    }
                    return "audio/ogg";
                  }

                  if (lower.endsWith(".pdf")) {
                    return "application/pdf";
                  }
                  if (lower.endsWith(".xlsx")) {
                    return XLSX_CONTENT_TYPE;
                  }
                  if (lower.endsWith(".csv")) {
                    return "text/csv";
                  }
                  if (lower.endsWith(".json")) {
                    return "application/json";
                  }
                  if (lower.endsWith(".txt")) {
                    return "text/plain";
                  }
                  return "application/octet-stream";
                };

                const guessFilename = (filePath: string) => {
                  const last = (filePath || "").split("/").pop() || "";
                  return last || "attachment";
                };

                if (!fileId && !text) {
                  toolResult = {
                    error:
                      "Provide either text or telegram_file_id/media.file_id to analyze.",
                  };
                } else if (!fileId) {
                  toolResult = await runAnalyzeExpenseWithTimeout(
                    {
                      userId,
                      text,
                      currency: userCurrency,
                      allowedExpenseCategories,
                      allowedIncomeCategories,
                      categoryPreferences,
                    },
                    GEMINI_API_KEY,
                    30000,
                    "Analysis is taking longer than expected. Please try again.",
                  );
                } else {
                  const fileMeta = await getTelegramFile(
                    TELEGRAM_BOT_TOKEN,
                    fileId,
                  );
                  if (!fileMeta?.file_path) {
                    toolResult = {
                      error:
                        "Could not fetch the Telegram file. Ask the user to resend it.",
                    };
                  } else if (
                    typeof fileMeta.file_size === "number" &&
                    fileMeta.file_size > MAX_MEDIA_BYTES
                  ) {
                    toolResult = {
                      error:
                        "The attachment is too large to process. Ask the user to send a smaller file.",
                    };
                  } else {
                    const buf = await downloadTelegramFile(
                      TELEGRAM_BOT_TOKEN,
                      fileMeta.file_path,
                    );
                    if (!buf) {
                      toolResult = {
                        error:
                          "Failed to download the Telegram file. Ask the user to resend it.",
                      };
                    } else if (buf.byteLength > MAX_MEDIA_BYTES) {
                      toolResult = {
                        error:
                          "The attachment is too large to process. Ask the user to send a smaller file.",
                      };
                    } else {
                      const kind = kindHint ||
                        inferKindFromPath(fileMeta.file_path);
                      const base64Data = uint8ToBase64(buf);
                      const contentType = guessContentType(
                        fileMeta.file_path,
                        kind,
                      );
                      const filename = guessFilename(fileMeta.file_path);

                      if (kind === "image") {
                        toolResult = await runAnalyzeExpenseWithTimeout(
                          {
                            userId,
                            ...(text ? { text } : {}),
                            image: {
                              data: base64Data,
                              contentType,
                              bytes: buf,
                            },
                            currency: userCurrency,
                            allowedExpenseCategories,
                            allowedIncomeCategories,
                            categoryPreferences,
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
                              contentType,
                              bytes: buf,
                            },
                            currency: userCurrency,
                            allowedExpenseCategories,
                            allowedIncomeCategories,
                            categoryPreferences,
                          },
                          GEMINI_API_KEY,
                          30000,
                          "The audio is taking longer than expected to process. Please try again by speaking clearly.",
                        );
                      } else {
                        toolResult = await runAnalyzeExpenseWithTimeout(
                          {
                            userId,
                            text,
                            currency: userCurrency,
                            allowedExpenseCategories,
                            allowedIncomeCategories,
                            categoryPreferences,
                            attachments: [
                              {
                                filename,
                                contentType,
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
              } else if (call.name === "list_expenses") {
                let householdId = call.args.household_id || null;
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
                if (
                  householdId &&
                  !(await ensureHouseholdMember(supabase, householdId, userId))
                ) {
                  toolResult = {
                    error: "You do not have access to that space",
                  };
                  lastToolResult = toolResult;
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
                const normalizedScope =
                  normalizeSpaceScope(call.args.space_scope) ||
                  normalizeSpaceScope(call.args.scope);
                const wantsPersonalOnly = !householdId &&
                  normalizedScope === "personal";
                const wantsSharedOnly = !householdId &&
                  normalizedScope === "shared";
                const isPortfolioQuery = spaceMeta?.isPortfolio === true ||
                  call.args.is_portfolio === true;
                const { data, error } = await fetchExpensesDirect(
                  supabase,
                  contact.id,
                  {
                    limit: call.args.limit || 50,
                    startDate: call.args.start_date,
                    endDate: call.args.end_date,
                    householdId,
                    isPortfolio: isPortfolioQuery,
                    portfolioHouseholdIds: householdId
                      ? undefined
                      : portfolioSpaceIds,
                    sharedHouseholdIds: householdId
                      ? undefined
                      : sharedSpaceIds,
                    personalOnly: wantsPersonalOnly,
                    sharedOnly: wantsSharedOnly,
                    currency: call.args.currency,
                    type: call.args.type,
                  },
                );
                if (error) {
                  toolResult = { error };
                } else {
                  const memoryItems = (data || [])
                    .map((row: any) =>
                      normalizeLastListedTransactionFromRow(row)
                    )
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
                  );

                  const normalized = normalizeExpensesForTool(
                    data || [],
                    userCurrency,
                  );
                  const chartUrl = buildCategoryChart(normalized);
                  const safeExpenses = memoryItems
                    .slice(0, 25)
                    .map((item, i) => {
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
              } else if (call.name === "add_transaction") {
                const amount = Number(call.args.amount || 0);
                let householdId = call.args.household_id || null;
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
                if (
                  householdId &&
                  !(await ensureHouseholdMember(supabase, householdId, userId))
                ) {
                  toolResult = {
                    error: "You do not have access to that space",
                  };
                  lastToolResult = toolResult;
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
                const isHouseholdExpense = !!householdId &&
                  (call.args.type || "expense") === "expense";
                const splitConfig =
                  isHouseholdExpense && !spaceMeta?.isPortfolio
                    ? await resolveHouseholdSplitConfig(
                      supabase,
                      householdId!,
                      userId,
                      amount,
                      call.args,
                    )
                    : {};
                const { data, error } = await saveExpenseDirect(
                  supabase,
                  contact.id,
                  userId,
                  {
                    recurrence_rule: call.args.is_recurring === true
                      ? call.args.recurrence_rule || {
                        frequency: (call.args.frequency || "monthly")
                          .toString()
                          .toLowerCase(),
                        interval: 1,
                        anchor_date: call.args.date ||
                          formatDateInTimeZone(userTimezone),
                      }
                      : undefined,
                    amount: amount,
                    category: call.args.category,
                    description: call.args.description || "",
                    date: call.args.date || formatDateInTimeZone(userTimezone),
                    currency: call.args.currency || userCurrency,
                    type: call.args.type || "expense",
                    householdId,
                    isPortfolio: spaceMeta?.isPortfolio ??
                      call.args.is_portfolio === true,
                    isRecurring: call.args.is_recurring === true,
                    payerUserId: splitConfig.payerUserId,
                    customSplits: splitConfig.customSplits,
                  },
                );
                toolResult = { data, error };
              } else if (call.name === "add_transactions_batch") {
                const rows = Array.isArray(call.args.transactions)
                  ? call.args.transactions
                  : [];
                let householdId = call.args.household_id || null;
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
                if (
                  householdId &&
                  !(await ensureHouseholdMember(supabase, householdId, userId))
                ) {
                  toolResult = {
                    error: "You do not have access to that space",
                  };
                  lastToolResult = toolResult;
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
                const results: any[] = [];
                for (const row of rows) {
                  const amount = Number(row.amount || 0);
                  const splitConfig = householdId &&
                      !spaceMeta?.isPortfolio &&
                      row.type !== "income"
                    ? await resolveHouseholdSplitConfig(
                      supabase,
                      householdId,
                      userId,
                      amount,
                      row,
                    )
                    : {};
                  const { data, error } = await saveExpenseDirect(
                    supabase,
                    contact.id,
                    userId,
                    {
                      recurrence_rule: row.is_recurring === true
                        ? row.recurrence_rule || {
                          frequency: (row.frequency || "monthly")
                            .toString()
                            .toLowerCase(),
                          interval: 1,
                          anchor_date: row.date ||
                            formatDateInTimeZone(userTimezone),
                        }
                        : undefined,
                      amount: amount,
                      category: row.category,
                      description: row.description || "",
                      date: row.date || formatDateInTimeZone(userTimezone),
                      currency: row.currency || userCurrency,
                      type: row.type || "expense",
                      householdId,
                      isPortfolio: spaceMeta?.isPortfolio ??
                        call.args.is_portfolio === true,
                      isRecurring: row.is_recurring === true,
                      payerUserId: splitConfig.payerUserId,
                      customSplits: splitConfig.customSplits,
                    },
                  );
                  results.push({ data, error });
                }
                toolResult = { results };
              } else if (call.name === "generate_chart_url") {
                const chartConfig = {
                  type: call.args.chart_type || "bar",
                  data: {
                    labels: call.args.labels || [],
                    datasets: [
                      {
                        label: call.args.title || "Chart",
                        data: call.args.data || [],
                      },
                    ],
                  },
                };
                const chartUrl = `https://quickchart.io/chart?c=${
                  encodeURIComponent(
                    JSON.stringify(chartConfig),
                  )
                }`;
                toolResult = { url: chartUrl };
              } else if (call.name === "financial_insight") {
                toolResult = { success: true };
              } else if (call.name === "get_budget") {
                const dateStr = (
                  call.args.date || formatDateInTimeZone(userTimezone)
                ).slice(0, 10);
                const period_month = dateStr.slice(0, 7) + "-01";
                let householdId = call.args.household_id || null;
                const householdName = (call.args.household_name || "")
                  .toString()
                  .toLowerCase();
                let spaceMeta = householdId
                  ? spaceMap.get(householdId)
                  : undefined;
                if (
                  !householdId &&
                  householdName &&
                  spaceMap.has(householdName)
                ) {
                  spaceMeta = spaceMap.get(householdName);
                  householdId = spaceMeta?.id ?? null;
                }
                if (
                  householdId &&
                  !(await ensureHouseholdMember(supabase, householdId, userId))
                ) {
                  toolResult = {
                    error: "You do not have access to that space",
                  };
                } else {
                  const res = await getBudgetStatusDirect(
                    supabase,
                    userId,
                    householdId,
                    period_month,
                    userCurrency,
                    spaceMeta?.isPortfolio ?? call.args.is_portfolio === true,
                    contact.id,
                  );
                  toolResult = res.error ? { error: res.error } : {
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
                  contact.id,
                  currency,
                );
                toolResult = error ? { error } : {
                  success: true,
                  currency: data?.preferred_currency || currency,
                };
              } else if (call.name === "update_transaction") {
                const updatesArgs = call.args?.updates &&
                    typeof call.args.updates === "object" &&
                    !Array.isArray(call.args.updates)
                  ? call.args.updates
                  : null;
                if (!updatesArgs) {
                  toolResult = { error: "updates is required" };
                } else {
                  let lastRead = readLastListedTransactions(sessionState);
                  let bootstrappedListForUpdate = false;
                  if (!lastRead.items && lastRead.expired) {
                    sessionState = clearLastListedTransactions(sessionState);
                    await saveSessionState(
                      supabase,
                      sessionId,
                      sessionState,
                      debugNotes,
                    );
                    lastRead = { items: null, expired: false };
                  }

                  if (!lastRead.items || lastRead.items.length === 0) {
                    const requestedIndex = Math.trunc(
                      Number(call.args?.selection_index),
                    );
                    const fallbackLimit =
                      Number.isFinite(requestedIndex) && requestedIndex > 0
                        ? Math.min(25, Math.max(10, requestedIndex))
                        : 10;

                    const matchTypeRaw =
                      typeof call.args?.match?.type === "string"
                        ? call.args.match.type.toLowerCase()
                        : "";
                    const fallbackType = matchTypeRaw === "income"
                      ? "income"
                      : matchTypeRaw === "expense"
                      ? "expense"
                      : undefined;

                    const { data: fallbackData, error: fallbackError } =
                      await fetchExpensesDirect(supabase, contact.id, {
                        limit: fallbackLimit,
                        portfolioHouseholdIds: portfolioSpaceIds,
                        ...(fallbackType ? { type: fallbackType } : {}),
                      });

                    if (!fallbackError && Array.isArray(fallbackData)) {
                      const fallbackItems = fallbackData
                        .map((row: any) =>
                          normalizeLastListedTransactionFromRow(row)
                        )
                        .filter(Boolean) as LastListedTransaction[];

                      if (fallbackItems.length > 0) {
                        sessionState = setLastListedTransactions(
                          sessionState,
                          fallbackItems,
                        );
                        await saveSessionState(
                          supabase,
                          sessionId,
                          sessionState,
                          debugNotes,
                        );
                        lastRead = { items: fallbackItems, expired: false };
                        bootstrappedListForUpdate = true;
                        debugNotes.push(
                          `update_transaction bootstrapped selection memory with ${fallbackItems.length} recent transactions`,
                        );
                      }
                    } else if (fallbackError) {
                      debugNotes.push(
                        `update_transaction fallback list failed: ${fallbackError}`,
                      );
                    }
                  }

                  const spaceNameByHouseholdId = (
                    householdId: string | null | undefined,
                  ) =>
                    householdId
                      ? spaceMap.get(householdId)?.name || null
                      : null;

                  const requestedSelectionIndex = Number(
                    call.args?.selection_index,
                  );
                  if (
                    bootstrappedListForUpdate &&
                    Number.isFinite(requestedSelectionIndex)
                  ) {
                    const choiceCount = Math.min(
                      25,
                      Math.max(8, Math.trunc(requestedSelectionIndex) || 0),
                    );
                    const choices = (lastRead.items || [])
                      .slice(0, choiceCount)
                      .map((item, i) => ({
                        index: i + 1,
                        summary: buildChoiceSummary(
                          item,
                          spaceNameByHouseholdId(item.household_id),
                        ).slice(0, 60),
                      }));

                    toolResult = {
                      needs_disambiguation: true,
                      choices,
                      choices_text: [
                        "I couldn't confirm your previous list context. Please pick from the latest transactions:",
                        ...choices.map((c) => `${c.index}. ${c.summary}`),
                        `Reply with a number from 1..${
                          Math.max(choices.length, 1)
                        }.`,
                      ].join("\n"),
                    };
                    lastToolResult = toolResult;
                    lastToolCallName = call.name;
                    toolResponses.push({
                      functionResponse: {
                        name: call.name,
                        response: toolResult,
                      },
                    });
                    continue;
                  }

                  const resolved = resolveLastListedSelection(
                    lastRead.items || [],
                    call.args,
                    spaceNameByHouseholdId,
                  );
                  if ("needs_disambiguation" in resolved) {
                    const truncateLabel = (value: string, maxLen = 60) => {
                      const cleaned = String(value || "")
                        .replace(/\s+/g, " ")
                        .trim();
                      if (cleaned.length <= maxLen) return cleaned;
                      if (maxLen <= 3) return cleaned.slice(0, maxLen);
                      return cleaned.slice(0, maxLen - 3).trimEnd() + "...";
                    };

                    const choicesRaw = Array.isArray((resolved as any).choices)
                      ? ((resolved as any).choices as any[])
                      : [];
                    const choices = choicesRaw
                      .map((c) => ({
                        index: Math.trunc(Number(c?.index)),
                        summary: String(c?.summary || ""),
                      }))
                      .filter((c) => Number.isFinite(c.index) && c.index > 0)
                      .slice(0, 8)
                      .map((c) => ({
                        index: c.index,
                        summary: truncateLabel(c.summary, 60),
                      }));

                    const choices_text = [
                      "Which one do you mean? Tap a button:",
                      ...choices.map((c) => `${c.index}. ${c.summary}`),
                    ].join("\n");

                    toolResult = {
                      needs_disambiguation: true,
                      choices,
                      choices_text,
                    };
                  } else if ("error" in resolved) {
                    toolResult = { error: resolved.error };
                  } else {
                    const updates: Record<string, unknown> = {};
                    if ((updatesArgs as any).amount != null) {
                      const amount = Number((updatesArgs as any).amount);
                      if (!Number.isFinite(amount) || amount <= 0) {
                        toolResult = {
                          error: "Invalid amount. Use a value greater than 0.",
                        };
                      } else {
                        updates.amount_cents = Math.round(amount * 100);
                      }
                    }
                    if ((updatesArgs as any).category != null) {
                      updates.category = (updatesArgs as any).category;
                    }
                    if ((updatesArgs as any).description != null) {
                      updates.raw_text = (updatesArgs as any).description;
                    }
                    if ((updatesArgs as any).currency != null) {
                      const currency = String(
                        (updatesArgs as any).currency || "",
                      )
                        .trim()
                        .toUpperCase();
                      if (!/^[A-Z]{3}$/.test(currency)) {
                        toolResult = {
                          error:
                            "Invalid currency. Use a 3-letter code like USD or EUR.",
                        };
                      } else {
                        updates.currency = currency;
                      }
                    }
                    if ((updatesArgs as any).date != null) {
                      const dateValue = String((updatesArgs as any).date || "")
                        .trim()
                        .slice(0, 10);
                      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                        toolResult = {
                          error: "Invalid date. Use YYYY-MM-DD.",
                        };
                      } else {
                        updates.date = dateValue;
                      }
                    }

                    if (toolResult?.error) {
                      // validation error already set in toolResult
                    } else if (Object.keys(updates).length === 0) {
                      toolResult = { error: "No updates provided" };
                    } else {
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

                      const expenseId = resolved.candidate.id;

                      if (!INTERNAL_FUNCTION_KEY) {
                        console.error(
                          "[telegram-ai-bot] update-expense invoke skipped: missing internal key",
                          {
                            traceId,
                            updatesKeys: Object.keys(updates),
                            candidateSummary,
                            expenseId,
                            internalKeyConfigured: false,
                          },
                        );
                        try {
                          await reportEdgeFunctionError({
                            functionName: "telegram-ai-bot",
                            error: new Error(
                              "update-expense skipped: missing internal key",
                            ),
                            context: {
                              step: "tool:update_transaction",
                              traceId,
                              tool: "update-expense",
                              internalKeyConfigured: false,
                              updatesKeys: Object.keys(updates),
                              candidateSummary,
                              expenseId,
                            },
                          });
                        } catch (error) {
                          console.error(
                            "[telegram-ai-bot] reportEdgeFunctionError failed",
                            {
                              traceId,
                              step: "tool:update_transaction",
                              tool: "update-expense",
                              error: String(error),
                            },
                          );
                        }
                        toolResult = { error: "Internal key not configured" };
                      } else {
                        const { data, error } = await supabase.functions.invoke(
                          "update-expense",
                          {
                            body: {
                              userId,
                              expenseId,
                              updates,
                            },
                            headers: {
                              "X-Moneko-Internal-Key": INTERNAL_FUNCTION_KEY,
                            },
                          },
                        );

                        const success = !error && data?.success === true;
                        if (success) {
                          toolResult = { success: true };
                        } else {
                          const status = (error as any)?.status;
                          const httpStatus =
                            typeof (error as any)?.context?.status === "number"
                              ? (error as any).context.status
                              : typeof status === "number"
                              ? status
                              : undefined;
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
                            "[telegram-ai-bot] update-expense invoke failed",
                            {
                              traceId,
                              status,
                              httpStatus,
                              formatted,
                              hasData: !!data,
                              code: (data as any)?.code,
                              message: (data as any)?.error,
                              updatesKeys: Object.keys(updates),
                              candidateSummary,
                              expenseId,
                              internalKeyConfigured: true,
                            },
                          );
                          debugNotes.push(
                            `update_transaction update-expense failed: ${formattedBase} (status: ${
                              httpStatus ?? status ?? "unknown"
                            }, code: ${code ?? "none"})`,
                          );
                          try {
                            await reportEdgeFunctionError({
                              functionName: "telegram-ai-bot",
                              error: new Error(
                                `update-expense failed: ${formatted}`,
                              ),
                              context: {
                                step: "tool:update_transaction",
                                traceId,
                                tool: "update-expense",
                                internalKeyConfigured: Boolean(
                                  INTERNAL_FUNCTION_KEY,
                                ),
                                httpStatus,
                                status,
                                code,
                                updatesKeys: Object.keys(updates),
                                candidateSummary,
                                expenseId,
                              },
                            });
                          } catch (error) {
                            console.error(
                              "[telegram-ai-bot] reportEdgeFunctionError failed",
                              {
                                traceId,
                                step: "tool:update_transaction",
                                tool: "update-expense",
                                error: String(error),
                              },
                            );
                          }
                          toolResult = { error: formatted };
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
                  );
                }

                const spaceNameByHouseholdId = (
                  householdId: string | null | undefined,
                ) =>
                  householdId ? spaceMap.get(householdId)?.name || null : null;

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
                  const { data, error } = await supabase.functions.invoke(
                    "delete-expense",
                    {
                      body: { userId, expenseIds: resolved.candidate.id },
                      headers: {
                        "X-Moneko-Internal-Key": INTERNAL_FUNCTION_KEY,
                      },
                    },
                  );
                  toolResult = !error && data?.success ? { success: true } : {
                    error: error ??
                      data?.error ??
                      "Failed to delete transaction",
                  };
                }
              } else if (
                call.name === "draft_budget" ||
                call.name === "confirm_budget" ||
                call.name === "set_budget"
              ) {
                if (
                  call.name === "confirm_budget" &&
                  call.args.confirm === false
                ) {
                  toolResult = { error: "Confirmation required" };
                } else {
                  const amount = Number(call.args.amount || 0);
                  if (!Number.isFinite(amount) || amount <= 0) {
                    toolResult = { error: "amount is required" };
                  } else {
                    let householdId = call.args.household_id || null;
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

                    if (
                      householdId &&
                      !(await ensureHouseholdMember(
                        supabase,
                        householdId,
                        userId,
                      ))
                    ) {
                      toolResult = {
                        error: "You do not have access to that space",
                      };
                      toolResponses.push({
                        functionResponse: {
                          name: call.name,
                          response: toolResult,
                        },
                      });
                      continue;
                    }

                    const dateStr = (
                      call.args.date || formatDateInTimeZone(userTimezone)
                    ).slice(0, 10);
                    const periodMonth = `${dateStr.slice(0, 7)}-01`;
                    const totalBudgetCents = Math.round(amount * 100);

                    if (call.name === "draft_budget") {
                      toolResult = {
                        success: true,
                        pending_budget: {
                          amount,
                          currency: userCurrency,
                          period_month: periodMonth,
                          pockets: Array.isArray(call.args.pockets)
                            ? call.args.pockets
                            : [],
                        },
                      };
                    } else {
                      const budgetRes = await createOrUpdateBudget(
                        supabase,
                        userId,
                        householdId,
                        periodMonth,
                        userCurrency,
                        totalBudgetCents,
                        spaceMeta?.isPortfolio ??
                          call.args.is_portfolio === true,
                      );
                      if (budgetRes.error || !budgetRes.data) {
                        toolResult = {
                          error: budgetRes.error || "Failed to save budget",
                        };
                      } else {
                        const envelopeNameMap =
                          await consolidateDuplicateEnvelopesForBudget(
                            supabase,
                            budgetRes.data.id,
                            periodMonth,
                            debugNotes,
                          );
                        const pockets = Array.isArray(call.args.pockets)
                          ? call.args.pockets
                          : [];
                        const envelopes: any[] = [];
                        const updatedPockets: Array<{
                          name: string;
                          percentage: number;
                        }> = [];
                        for (const pocket of pockets) {
                          const pocketName = (pocket?.name || "")
                            .toString()
                            .trim();
                          if (!pocketName) continue;
                          const pct = Number(pocket?.percentage || 0);
                          const clampedPct = Math.max(0, Math.min(100, pct));
                          const canonical = envelopeNameMap.get(
                            normalizeEnvelopeName(pocketName),
                          );
                          const nameToUse = canonical?.name || pocketName;
                          updatedPockets.push({
                            name: nameToUse,
                            percentage: clampedPct,
                          });
                          const envRes = await upsertEnvelope(
                            supabase,
                            budgetRes.data.id,
                            userId,
                            householdId,
                            nameToUse,
                            clampedPct,
                            userCurrency,
                            budgetRes.data.total_budget_cents,
                          );
                          if (envRes.error || !envRes.data?.id) {
                            continue;
                          }
                          envelopes.push(envRes.data);
                          await upsertEnvelopeAllocation(
                            supabase,
                            envRes.data.id,
                            periodMonth,
                            Math.round(
                              (clampedPct / 100) *
                                budgetRes.data.total_budget_cents,
                            ),
                          );
                          const categories = Array.isArray(pocket?.categories)
                            ? pocket.categories
                            : [];
                          for (const category of categories) {
                            await upsertEnvelopeCategoryLink(
                              supabase,
                              envRes.data.id,
                              String(category),
                            );
                          }
                        }
                        toolResult = {
                          success: true,
                          budget: budgetRes.data,
                          envelopes,
                          updated_pockets: updatedPockets,
                        };
                      }
                    }
                  }
                }
              } else if (call.name === "set_pocket") {
                const name = (call.args.name || "").toString().trim();
                if (!name) {
                  toolResult = { error: "Pocket name is required" };
                } else {
                  const dateStr = (
                    call.args.date || formatDateInTimeZone(userTimezone)
                  ).slice(0, 10);
                  const periodMonth = `${dateStr.slice(0, 7)}-01`;
                  let householdId = call.args.household_id || null;
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
                  if (
                    householdId &&
                    !(await ensureHouseholdMember(
                      supabase,
                      householdId,
                      userId,
                    ))
                  ) {
                    toolResult = {
                      error: "You do not have access to that space",
                    };
                    toolResponses.push({
                      functionResponse: {
                        name: call.name,
                        response: toolResult,
                      },
                    });
                    continue;
                  }
                  const budgetRes = await getBudgetStatusDirect(
                    supabase,
                    userId,
                    householdId,
                    periodMonth,
                    userCurrency,
                    spaceMeta?.isPortfolio ?? call.args.is_portfolio === true,
                    contact.id,
                  );
                  const budgetId = (budgetRes as any)?.budget?.id;
                  if (!budgetId) {
                    toolResult = {
                      error: "Please set a budget first for this month",
                    };
                  } else {
                    const envelopeNameMap =
                      await consolidateDuplicateEnvelopesForBudget(
                        supabase,
                        budgetId,
                        periodMonth,
                        debugNotes,
                      );
                    const canonical = envelopeNameMap.get(
                      normalizeEnvelopeName(name),
                    );
                    const nameToUse = canonical?.name || name;
                    const percentage = Math.max(
                      0,
                      Math.min(100, Number(call.args.percentage || 0)),
                    );
                    const envRes = await upsertEnvelope(
                      supabase,
                      budgetId,
                      userId,
                      householdId,
                      nameToUse,
                      percentage,
                      userCurrency,
                      (budgetRes as any).budget?.total_budget_cents,
                    );
                    if (envRes.error || !envRes.data?.id) {
                      toolResult = {
                        error: envRes.error || "Failed to save pocket",
                      };
                    } else {
                      await upsertEnvelopeAllocation(
                        supabase,
                        envRes.data.id,
                        periodMonth,
                        Math.round(
                          (percentage / 100) *
                            ((budgetRes as any).budget?.total_budget_cents ||
                              0),
                        ),
                      );
                      const categories = Array.isArray(call.args.categories)
                        ? call.args.categories
                        : [];
                      for (const category of categories) {
                        await upsertEnvelopeCategoryLink(
                          supabase,
                          envRes.data.id,
                          String(category),
                        );
                      }
                      toolResult = { success: true, pocket: envRes.data };
                    }
                  }
                }
              } else if (call.name === "delete_pocket") {
                const name = (call.args.name || "").toString().trim();
                if (!name) {
                  toolResult = { error: "Pocket name is required" };
                } else {
                  const dateStr = (
                    call.args.date || formatDateInTimeZone(userTimezone)
                  ).slice(0, 10);
                  const periodMonth = `${dateStr.slice(0, 7)}-01`;
                  let householdId = call.args.household_id || null;
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
                  if (
                    householdId &&
                    !(await ensureHouseholdMember(
                      supabase,
                      householdId,
                      userId,
                    ))
                  ) {
                    toolResult = {
                      error: "You do not have access to that space",
                    };
                    toolResponses.push({
                      functionResponse: {
                        name: call.name,
                        response: toolResult,
                      },
                    });
                    continue;
                  }
                  const budgetRes = await getBudgetStatusDirect(
                    supabase,
                    userId,
                    householdId,
                    periodMonth,
                    userCurrency,
                    spaceMeta?.isPortfolio ?? call.args.is_portfolio === true,
                    contact.id,
                  );
                  const budgetId = (budgetRes as any)?.budget?.id;
                  if (!budgetId) {
                    toolResult = {
                      error: "Please set a budget first for this month",
                    };
                  } else {
                    const { data: envelope } = await supabase
                      .from("budget_envelopes")
                      .select("id")
                      .eq("budget_id", budgetId)
                      .ilike("name", name)
                      .maybeSingle();
                    if (!envelope?.id) {
                      toolResult = { error: "Pocket not found" };
                    } else {
                      const { error } = await supabase
                        .from("budget_envelopes")
                        .delete()
                        .eq("id", envelope.id);
                      toolResult = error ? { error } : { success: true };
                    }
                  }
                }
              } else if (call.name === "manage_recurring") {
                const action = (call.args.action || "")
                  .toString()
                  .toLowerCase();
                if (action === "delete") {
                  const expenseIdDirect =
                    typeof call.args.expense_id === "string"
                      ? call.args.expense_id.trim()
                      : "";
                  const spaceNameByHouseholdId = (
                    householdId: string | null | undefined,
                  ) =>
                    householdId
                      ? spaceMap.get(householdId)?.name || null
                      : null;

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
                    const expenseId = expenseIdDirect ||
                      (resolved && "candidate" in resolved
                        ? resolved.candidate.id
                        : "");
                    if (!expenseId) {
                      toolResult = {
                        error:
                          "No matching transaction found. Ask user to list recent transactions first or provide more details.",
                      };
                    } else {
                      const { data, error } = await supabase.functions.invoke(
                        "delete-expense",
                        {
                          body: { userId, expenseIds: expenseId },
                          headers: {
                            "X-Moneko-Internal-Key": INTERNAL_FUNCTION_KEY,
                          },
                        },
                      );
                      toolResult = !error && data?.success
                        ? { success: true }
                        : {
                          error: error ??
                            data?.error ??
                            "Failed to delete recurring transaction",
                        };
                    }
                  }
                } else if (action === "update") {
                  const expenseIdDirect =
                    typeof call.args.expense_id === "string"
                      ? call.args.expense_id.trim()
                      : "";
                  const spaceNameByHouseholdId = (
                    householdId: string | null | undefined,
                  ) =>
                    householdId
                      ? spaceMap.get(householdId)?.name || null
                      : null;
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
                    const expenseId = expenseIdDirect ||
                      (resolved && "candidate" in resolved
                        ? resolved.candidate.id
                        : "");
                    if (!expenseId) {
                      toolResult = {
                        error:
                          "No matching transaction found. Ask user to list recent transactions first or provide more details.",
                      };
                    } else {
                      const dateValue = call.args.date ||
                        formatDateInTimeZone(userTimezone);
                      const recurrenceRule = {
                        frequency: (call.args.frequency || "monthly")
                          .toString()
                          .toLowerCase(),
                        interval: 1,
                        anchor_date: dateValue,
                      };
                      const updates: Record<string, unknown> = {
                        is_recurring: true,
                        recurrence_rule: recurrenceRule,
                      };
                      if (call.args.amount != null) {
                        updates.amount_cents = Math.round(
                          Number(call.args.amount) * 100,
                        );
                      }
                      if (call.args.category != null) {
                        updates.category = call.args.category;
                      }
                      if (call.args.description != null) {
                        updates.raw_text = call.args.description;
                      }
                      if (call.args.currency != null) {
                        updates.currency = call.args.currency;
                      }
                      if (call.args.date != null) updates.date = call.args.date;
                      const { data, error } = await supabase.functions.invoke(
                        "update-expense",
                        {
                          body: {
                            userId,
                            expenseId,
                            updates,
                          },
                          headers: {
                            "X-Moneko-Internal-Key": INTERNAL_FUNCTION_KEY,
                          },
                        },
                      );
                      toolResult = !error && data?.success
                        ? { success: true }
                        : {
                          error: error ??
                            data?.error ??
                            "Failed to update recurring transaction",
                        };
                    }
                  }
                } else {
                  const dateValue = call.args.date ||
                    formatDateInTimeZone(userTimezone);
                  const recurrenceRule = {
                    frequency: (call.args.frequency || "monthly")
                      .toString()
                      .toLowerCase(),
                    interval: 1,
                    anchor_date: dateValue,
                  };
                  const amount = Number(call.args.amount || 0);
                  let householdId = call.args.household_id || null;
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
                  const splitConfig = householdId &&
                      !spaceMeta?.isPortfolio &&
                      call.args.type !== "income"
                    ? await resolveHouseholdSplitConfig(
                      supabase,
                      householdId,
                      userId,
                      amount,
                      call.args,
                    )
                    : {};
                  const { data, error } = await saveExpenseDirect(
                    supabase,
                    contact.id,
                    userId,
                    {
                      amount,
                      category: call.args.category,
                      description: call.args.description || "",
                      date: dateValue,
                      currency: call.args.currency || userCurrency,
                      type: call.args.type || "expense",
                      householdId,
                      isPortfolio: spaceMeta?.isPortfolio ??
                        call.args.is_portfolio === true,
                      isRecurring: true,
                      recurrence_rule: recurrenceRule,
                      payerUserId: splitConfig.payerUserId,
                      customSplits: splitConfig.customSplits,
                    },
                  );
                  toolResult = { data, error };
                }
              }
            } catch (e) {
              toolResult = { error: String(e) };
            }

            console.log("[telegram-ai-bot] tool result", {
              traceId,
              name: call.name,
              ok: toolResult?.success === true,
              hasError: typeof toolResult?.error === "string",
              error: typeof toolResult?.error === "string"
                ? toolResult.error.slice(0, 200)
                : undefined,
            });

            lastToolResult = toolResult;
            lastToolCallName = typeof call?.name === "string"
              ? call.name
              : null;

            const succeeded = toolResult?.success === true ||
              (!!toolResult?.data && !toolResult?.error);
            if (succeeded) {
              toolSucceededAny = true;
              if (
                call.name === "confirm_budget" ||
                call.name === "set_budget"
              ) {
                const pocketsRaw = Array.isArray(toolResult?.updated_pockets)
                  ? toolResult.updated_pockets
                  : Array.isArray(call.args?.pockets)
                  ? call.args.pockets
                  : [];
                lastBudgetPockets = (pocketsRaw || []).map((p: any) => ({
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

          try {
            const nextResult = await sendGeminiMessageWithRetry(
              chat as any,
              toolResponses,
              {
                preRequestDelayMs: GEMINI_PRE_REQUEST_DELAY_MS,
                maxRetries: GEMINI_MAX_RETRIES,
                logPrefix: "telegram-ai-bot",
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
              "[telegram-ai-bot] Failed to get final AI response:",
              e,
            );
            finalResponseText =
              "I processed your request but encountered an issue generating a response. Please try again.";
            functionCalls = [];
          }

          toolIterations++;
        }

        if (
          (!finalResponseText || !finalResponseText.trim()) &&
          lastToolResult?.needs_disambiguation === true &&
          typeof lastToolResult?.choices_text === "string" &&
          lastToolResult.choices_text.trim()
        ) {
          finalResponseText = lastToolResult.choices_text;
        }

        if (
          (!finalResponseText || !finalResponseText.trim()) &&
          toolSucceededAny &&
          lastBudgetPockets
        ) {
          finalResponseText = buildBudgetDoneText(lastBudgetPockets);
        }
        if (
          (!finalResponseText || !finalResponseText.trim()) &&
          lastToolCallName === "update_transaction" &&
          typeof lastToolResult?.error === "string" &&
          lastToolResult.error.trim()
        ) {
          const errorSnippet = lastToolResult.error.trim().slice(0, 180);
          finalResponseText =
            `I couldn't update that transaction. ${errorSnippet}`;
        }
        if (!finalResponseText || !finalResponseText.trim()) {
          finalResponseText =
            "I couldn't generate a response right now. Please try again in a few seconds.";
        }

        // Persist the incoming user message AFTER Gemini/tool flow so history doesn't echo it.
        await insertChatMessage(
          supabase,
          sessionId,
          "user",
          userMessageContent,
          debugNotes,
          false,
        );

        await insertChatMessage(
          supabase,
          sessionId,
          "assistant",
          finalResponseText,
          debugNotes,
          false,
        );

        const choiceKeyboard = buildChoiceKeyboard(finalResponseText);
        console.log("[telegram-ai-bot] final", {
          traceId,
          textLen: finalResponseText?.length || 0,
          usedChoiceKeyboard: !!choiceKeyboard,
        });

        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          finalResponseText,
          choiceKeyboard,
        );
        await updateIdempotency(supabase, idempotencyKey, {
          status: "done",
          response_text: finalResponseText,
        });
      } catch (error) {
        console.error("[telegram-ai-bot] Handler error:", error);
        await reportEdgeFunctionError({
          functionName: "telegram-ai-bot",
          error,
          context: {
            step: "process_message",
          },
        });
        await updateIdempotency(supabase, idempotencyKey, {
          status: "failed",
          response_text: "processing_failed",
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        stopTypingHeartbeat();
      }
    })(),
  );

  await sendTelegramChatAction(TELEGRAM_BOT_TOKEN, chatId, "typing");
  return jsonResponse({ ok: true });
});
