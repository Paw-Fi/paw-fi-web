/// <reference lib="deno.ns" />

// Supabase Edge Function: telegram-ai-bot
// Handles Telegram messages, using Gemini AI and existing tools.

import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { isFreeUser } from "../shared/is-free-user.ts";
import {
  buildCategoryChart,
  buildCategoryGuide,
  CATEGORY_GUIDE,
  formatInvokeError,
  formatInvokeErrorWithResponseBody,
  normalizeExpensesForTool,
} from "../shared/formatting-helpers.ts";
import { fetchExpensesDirect } from "../shared/expenses-helpers.ts";
import type { CustomSplits, MemberSplit } from "../shared/expenses-helpers.ts";
import {
  createOrUpdateBudget,
  getBudgetStatusDirect,
  resolvePocketPercentageForUpsert,
  upsertEnvelope,
  upsertEnvelopeAllocation,
  upsertEnvelopeCategoryLink,
} from "../shared/budgets-helpers.ts";
import { insertChatMessage } from "../shared/chat-helpers.ts";
import { updatePreferredCurrency } from "../shared/currency-helpers.ts";
import {
  isRetryableGeminiError,
  sendGeminiMessageWithRetry,
} from "../shared/gemini-retry.ts";
import {
  reserveIdempotency,
  updateIdempotency,
} from "../shared/bot/idempotency.ts";
import {
  buildTelegramVerificationMessage,
  buildTelegramVerificationUrl,
  REQUIRED_TELEGRAM_TOOL_NAMES,
} from "../shared/telegram-parity.ts";
import { reportVertexAiFailure } from "../shared/report-vertex-ai-failure.ts";
import {
  fetchUserCategoryPreferences,
  fetchUserCategoryRemaps,
  fetchUserCustomCategories,
  fetchUserHiddenCategories,
  mergeAllowedCategories,
  upsertUserCustomCategory,
} from "../shared/user-categories.ts";
import {
  buildLanguageOverride,
  getReplyLanguagePromptLabel,
  resolvePreferredReplyLanguage,
} from "../shared/detect-language.ts";
import {
  buildInternalInvokeHeaders,
  resolveInternalFunctionKey,
} from "../shared/auth.ts";
import {
  createVertexBotChatSession,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import {
  normalizeAiToolAmount,
  normalizeAiToolMoneyCents,
  normalizeAiToolPercentage,
  normalizeRequiredAiToolString,
} from "../shared/bot/ai-tool-validation.ts";
import {
  buildRecurrenceRule,
  formatDateInTimeZone,
} from "../shared/bot/date-utils.ts";
import {
  reportBotBackendError,
  reportBotToolInvokeFailure,
} from "../shared/bot/error-reporting.ts";
import {
  buildGeminiHighDemandMessage as buildGeminiBusyMessage,
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
  buildTransactionMutationFailureText,
  invokeTransactionSave,
  normalizeTransactionToolArgs,
} from "../shared/bot/transaction-tool.ts";
import { resolveWalletIdInScope } from "../shared/bot/wallet-scope.ts";
import {
  buildUnsafeMutationClaimFallback,
  detectWriteIntentFromUserText,
  diagnoseUnsafeTransactionMutationClaim,
  isWriteMutationToolName,
  WRITE_MUTATION_FORCED_FUNCTION_CALLING_CONFIG,
} from "../shared/bot/mutation-claim-guard.ts";
import {
  buildBudgetDoneText,
  consolidateDuplicateEnvelopesForBudget,
  normalizeEnvelopeName,
} from "../shared/bot/budget-utils.ts";
import {
  buildChoiceSummary,
  clearLastListedTransactions,
  type LastListedTransaction,
  normalizeLastListedTransactionFromRow,
  normalizeMatchString,
  normalizeSessionState,
  readLastListedTransactions,
  resolveLastListedSelection,
  type SessionState,
  setLastListedTransactions,
} from "../shared/bot/session-state.ts";

const MODEL_NAME = "gemini-3.1-flash-lite-preview";
const FALLBACK_MODEL_NAME = "gemini-2.5-flash";
const SYSTEM_INSTRUCTION = `You are Moneko, a helpful and friendly financial assistant on Telegram.
Your goal is to help users track expenses, manage budgets, and view their financial health.
You can handle personal finances and shared spaces.

**LANGUAGE RULE (HIGHEST PRIORITY):** Always reply in {{LANGUAGE}}. This value is resolved by the backend before your prompt is built. Do not choose the reply language yourself and do not infer it from the user's latest message.

**TOOL-USE RULE (NON-NEGOTIABLE):** NEVER claim an action was performed unless you actually called the corresponding tool on this turn. Phrases like "I've added", "I've saved", "I've logged", "I've recorded", "I've updated", "I've deleted" are FORBIDDEN unless a tool call accompanies the turn. If the user asks to add/save/log/record a transaction and you have enough details, you MUST call \`add_transaction\` (or \`add_transactions_batch\`). If details are missing, ask one short clarification question instead — do not pretend the save happened. The backend enforces this and will replace any false success claim with an error message to the user.

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
4.  **Charts**: If the user asks for a chart or graph, use the 'generate_chart_url' tool.
    - DO NOT paste the chart URL in your message.
    - The backend will attach the chart image automatically.
    - Write a short caption + 1-2 insights about what the chart shows.
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
20. **Wallets**: Wallets belong to one space only. Do not list or assume wallets unless the user explicitly asks about wallets or names one. When a wallet is mentioned, resolve it only inside the selected space.
21. **Financial snapshot**: For asks like "current financial situation/health/status": provide one concise snapshot for the current month/pay-period: verdict, income vs spending, net, top categories, budget status, upcoming recurring, and 1–2 actions. Always include the text summary; the chart is optional/secondary.
22. **Language**: See the LANGUAGE RULE above. Always use {{LANGUAGE}} unless a language-change tool call succeeds for this turn.

MESSAGE FORMATTING (Telegram-specific):
- Your response is sent as **plain text** — do NOT use Markdown symbols like *bold* or _italic_ because they will appear as literal characters, not formatted text.
- Use emoji bullets (✅, 📊, 💰, •) and line breaks for visual structure.
- For numbered lists, use "1. ", "2. ", etc.
- Keep messages concise and scannable — Telegram users expect quick, snappy replies.
- When offering choices (transactions, spaces, pockets, follow-ups), ALWAYS format as numbered lines ("1. label", "2. label") so the system can generate inline tap-buttons. Ask the user to tap a button.
- Never use HTML tags (<b>, <i>, etc.) in your response.
- Use blank lines between logical sections for readability.

CURRENT CONTEXT:
- Date: {{DATE}}
- User Currency: {{CURRENCY}}
- Spaces: {{HOUSEHOLDS}}
- Wallets: {{WALLETS}}
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
const GEMINI_MAX_RETRIES = 1;
const GEMINI_REQUEST_TIMEOUT_MS = 60000;

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

async function getTelegramFile(
  token: string,
  fileId: string,
): Promise<{ file_path?: string; file_size?: number } | null> {
  const url = `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(
    fileId,
  )}`;
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
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[telegram-ai-bot] sendMessage http error", {
      chatId,
      status: res.status,
      body,
    });
    return false;
  }

  const payload = await res.json().catch(() => null);
  // Telegram can reply HTTP 200 with { ok: false }, so check API payload too.
  if (!payload?.ok) {
    console.error("[telegram-ai-bot] sendMessage api error", {
      chatId,
      payload,
    });
    return false;
  }

  return true;
}

async function sendTelegramPhoto(
  token: string,
  chatId: number,
  photoUrl: string,
  caption?: string,
  replyMarkup?: TelegramInlineKeyboardMarkup,
) {
  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    photo: photoUrl,
  };
  const cleanedCaption = (caption || "").trim();
  if (cleanedCaption) payload.caption = cleanedCaption;
  if (replyMarkup) payload.reply_markup = replyMarkup;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[telegram-ai-bot] sendPhoto http error", {
      chatId,
      status: res.status,
      photoUrl,
      body,
    });
    return false;
  }

  const apiPayload = await res.json().catch(() => null);
  // sendPhoto can also fail at Telegram API level with HTTP 200.
  if (!apiPayload?.ok) {
    console.error("[telegram-ai-bot] sendPhoto api error", {
      chatId,
      photoUrl,
      payload: apiPayload,
    });
    return false;
  }

  return true;
}

async function sendTelegramChatAction(
  token: string,
  chatId: number,
  action: "typing" | "upload_photo" = "typing",
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
  const explicitBaseUrl =
    Deno.env.get("TELEGRAM_VERIFICATION_BASE_URL") ||
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

function hasExpiredSubscriptionAccess(
  subscription?: {
    status?: string | null;
    currentPeriodEnd?: string | Date | null;
  } | null,
): boolean {
  if (!subscription) return false;

  const normalizedStatus = String(subscription.status ?? "").toLowerCase();
  if (normalizedStatus !== "trialing" && normalizedStatus !== "active") {
    return false;
  }

  if (subscription.currentPeriodEnd == null) return false;
  const periodEnd = new Date(subscription.currentPeriodEnd);
  if (Number.isNaN(periodEnd.getTime())) return false;
  return periodEnd.getTime() <= Date.now();
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

function detectListTypeFromText(
  text: string,
): "expense" | "income" | undefined {
  const normalized = normalizeMatchString(text);
  const hasIncome =
    /\b(income|incomes|earning|earnings|salary|salaries)\b/.test(normalized);
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
    /\b(portfolio|private space|private account|investment account|investing space)\b/.test(
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
    /\b(transaction|transactions|expense|expenses|income|incomes|spending|spend|spent|earning|earnings)\b/.test(
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

async function reportTelegramToolInvokeFailure(params: {
  traceId: string;
  toolName: string;
  targetFunction: string;
  formatted: string;
  error?: unknown;
  context?: Record<string, unknown>;
}) {
  await reportBotToolInvokeFailure({
    functionName: "telegram-ai-bot",
    ...params,
  });
}

function buildMutationFailureText(
  toolName: string | null,
  toolResult: unknown,
): string | null {
  const sharedText = buildTransactionMutationFailureText(toolName, toolResult);
  if (sharedText) return sharedText;
  if (toolName === "delete_transaction") {
    return "I couldn't delete that transaction right now. Please try again in a moment.";
  }
  return null;
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
      const amount =
        typeof split?.amount === "number" ? Math.max(0, split.amount) : null;
      if (amount == null) missing.push(id);
      else specifiedSum += amount;
    }
    const remaining = Math.max(0, total - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;

    for (const id of memberIds) {
      const split = byId.get(id);
      const amount =
        typeof split?.amount === "number"
          ? Math.max(0, split.amount)
          : perMissing;
      fullSplits.push({ userId: id, amount });
    }
  } else if (inferredType === "percentage") {
    let specifiedSum = 0;
    const missing: string[] = [];
    for (const id of memberIds) {
      const split = byId.get(id);
      const percentage =
        typeof split?.percentage === "number"
          ? Math.max(0, Math.min(100, split.percentage))
          : null;
      if (percentage == null) missing.push(id);
      else specifiedSum += percentage;
    }
    const remaining = Math.max(0, 100 - specifiedSum);
    const perMissing = missing.length ? remaining / missing.length : 0;

    for (const id of memberIds) {
      const split = byId.get(id);
      const percentage =
        typeof split?.percentage === "number"
          ? Math.max(0, Math.min(100, split.percentage))
          : perMissing;
      fullSplits.push({ userId: id, percentage });
    }
  } else if (inferredType === "shares") {
    for (const id of memberIds) {
      const split = byId.get(id);
      const shares =
        typeof split?.shares === "number"
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
  const internalFunctionKey = resolveInternalFunctionKey();
  let vertexConfig: ReturnType<typeof getVertexAiConfigFromEnv>;

  const missingEnv: string[] = [];
  if (!TELEGRAM_BOT_TOKEN) missingEnv.push("TELEGRAM_BOT_TOKEN");
  if (!TELEGRAM_WEBHOOK_SECRET) missingEnv.push("TELEGRAM_WEBHOOK_SECRET");
  if (!SUPABASE_URL) missingEnv.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missingEnv.length) {
    console.error(
      `[telegram-ai-bot] Missing required environment variables: ${missingEnv.join(
        ", ",
      )}`,
    );
    await reportBotBackendError({
      functionName: "telegram-ai-bot",
      phase: "missing_environment",
      error: new Error("Missing required environment variables"),
      context: {
        missingEnv,
        hasTelegramBotToken: !!TELEGRAM_BOT_TOKEN,
        hasWebhookSecret: !!TELEGRAM_WEBHOOK_SECRET,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  try {
    vertexConfig = getVertexAiConfigFromEnv();
  } catch (error) {
    console.error("[telegram-ai-bot] Vertex AI config error", error);
    await reportBotBackendError({
      functionName: "telegram-ai-bot",
      phase: "vertex_config",
      error,
    });
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  if (!internalFunctionKey) {
    console.warn(
      "[telegram-ai-bot] INTERNAL_FUNCTION_KEY not configured; internal tool calls will fail",
    );
    await reportBotBackendError({
      functionName: "telegram-ai-bot",
      phase: "missing_internal_function_key",
      error: new Error("INTERNAL_FUNCTION_KEY not configured"),
    });
  }

  const secretHeader =
    req.headers.get("X-Telegram-Bot-Api-Secret-Token") ||
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
      const choiceKeyboard = buildChoiceKeyboard(cached.response_text);
      if (cached.media_url) {
        await sendTelegramChatAction(
          TELEGRAM_BOT_TOKEN,
          chatId,
          "upload_photo",
        );
        const sentPhoto = await sendTelegramPhoto(
          TELEGRAM_BOT_TOKEN,
          chatId,
          cached.media_url,
          truncateTextByCodePoints(cached.response_text, 900),
          choiceKeyboard,
        );
        if (!sentPhoto) {
          // Keep duplicate replays resilient: if photo delivery fails, still return
          // the answer with a direct chart link so users are never left with silence.
          const fallbackText = [cached.response_text, cached.media_url]
            .filter((part) => typeof part === "string" && part.trim())
            .join("\n\n");
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            truncateTextByCodePoints(fallbackText, 3500),
            choiceKeyboard,
          );
        }
      } else {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          cached.response_text,
          choiceKeyboard,
        );
      }
    } else if (cached?.status === "processing") {
      await sendTelegramChatAction(TELEGRAM_BOT_TOKEN, chatId, "typing");
    }
    return jsonResponse({ ok: true });
  }

  runBackgroundTask(
    (async () => {
      const debugNotes: string[] = [];
      let telegramResponseSent = false;
      let replyLanguage = "en";
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

        replyLanguage = resolvePreferredReplyLanguage(
          contact?.preferred_language,
          contact?.preferred_currency,
        );

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
        const incomingText =
          callbackData === "start_verification"
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
          telegramResponseSent = true;
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
          telegramResponseSent = true;
          await updateIdempotency(supabase, idempotencyKey, {
            status: "done",
            response_text: prompt,
          });
          return;
        }

        let subscription = contextData
          ? {
              plan: contextData.subscription_plan,
              status: contextData.subscription_status,
              currentPeriodEnd:
                contextData.subscription_current_period_end ?? null,
            }
          : null;

        const userIdForSubscription = String(contact.user_id || "");
        if (userIdForSubscription) {
          const { data: liveSubscription, error: liveSubscriptionError } =
            await supabase
              .from("subscriptions")
              .select("plan, status, current_period_end")
              .eq("user_id", userIdForSubscription)
              .order("updated_at", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

          if (liveSubscriptionError) {
            debugNotes.push(
              `subscription lookup error: ${formatInvokeError(
                liveSubscriptionError,
              )}`,
            );
          } else if (liveSubscription) {
            subscription = {
              plan: liveSubscription.plan,
              status: liveSubscription.status,
              currentPeriodEnd: liveSubscription.current_period_end,
            };
          }
        }

        if (hasExpiredSubscriptionAccess(subscription)) {
          const expiredSubscriptionMessage =
            "Your subscription has expired. Please renew your subscription to continue using Moneko";
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            expiredSubscriptionMessage,
            {
              inline_keyboard: [
                [
                  {
                    text: "View Pricing",
                    url: "https://moneko.io/pricing",
                  },
                ],
              ],
            },
          );
          telegramResponseSent = true;
          await updateIdempotency(supabase, idempotencyKey, {
            status: "done",
            response_text: expiredSubscriptionMessage,
          });
          return;
        }

        if (isFreeUser(subscription)) {
          const nonSubscriberMessage =
            "You're on the free plan. Upgrade to unlock full features.";
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            nonSubscriberMessage,
            {
              inline_keyboard: [
                [
                  {
                    text: "View Pricing",
                    url: "https://moneko.io/pricing",
                  },
                ],
              ],
            },
          );
          telegramResponseSent = true;
          await updateIdempotency(supabase, idempotencyKey, {
            status: "done",
            response_text: nonSubscriberMessage,
          });
          return;
        }

        const userId = contact.user_id as string;
        const userCurrency = contact.preferred_currency || "USD";
        const userLang = resolvePreferredReplyLanguage(
          contact.preferred_language,
          contact.preferred_currency,
        );
        const userLangLabel = getReplyLanguagePromptLabel(userLang);
        const userTimezone = contact.preferred_timezone || "UTC";

        const [
          customCategories,
          hiddenCategories,
          categoryPreferences,
          categoryRemaps,
        ] = await Promise.all([
          fetchUserCustomCategories({ supabase, userId }),
          fetchUserHiddenCategories({ supabase, userId }),
          fetchUserCategoryPreferences({ supabase, userId }),
          fetchUserCategoryRemaps({ supabase, userId }),
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
            telegramResponseSent = true;
            await updateIdempotency(supabase, idempotencyKey, {
              status: "failed",
              response_text: "session_failed",
            });
            return;
          }
          session = { id: newSession.id };
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
          userMessageContent = `[User sent an image receipt.${captionNote} If you need to extract transactions, call analyze_expense with media { kind: "image", file_id: "${photo.file_id}" } (or telegram_file_id: "${photo.file_id}").]`;
        } else if (voice?.file_id) {
          const captionNote = message?.caption
            ? ` Caption: "${message.caption}".`
            : "";
          userMessageContent = `[User sent an audio message.${captionNote} If you need to extract transactions, call analyze_expense with media { kind: "audio", file_id: "${voice.file_id}" } (or telegram_file_id: "${voice.file_id}").]`;
        } else if (doc?.file_id) {
          const captionNote = message?.caption
            ? ` Caption: "${message.caption}".`
            : "";
          const nameNote = doc.file_name ? ` Name: "${doc.file_name}".` : "";
          const mimeNote = doc.mime_type ? ` Mime: "${doc.mime_type}".` : "";
          userMessageContent = `[User sent a file attachment.${nameNote}${mimeNote}${captionNote} If you need to extract transactions, call analyze_expense with media { kind: "file", file_id: "${doc.file_id}" } (or telegram_file_id: "${doc.file_id}").]`;
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

        const telegramSystemInstruction =
          SYSTEM_INSTRUCTION.replace(
            "{{DATE}}",
            formatDateInTimeZone(userTimezone),
          )
            .replace("{{CURRENCY}}", userCurrency)
            .replace("{{HOUSEHOLDS}}", JSON.stringify(chatHouseholds))
            .replace(
              "{{WALLETS}}",
              "Available on request for the selected space only",
            )
            .replace("{{CATEGORIES}}", categoryGuideForUser)
            .replace("{{LANGUAGE}}", userLangLabel) +
          buildLanguageOverride(userLang);

        const tools = [
          {
            name: "analyze_expense",
            description:
              "Extract one or more transactions from text or a Telegram attachment (receipt image, audio, or file). Provide either text or a Telegram file reference, not both.",
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
            name: "create_custom_category",
            description:
              "Create or update a custom transaction category for this user so it can be reused later.",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                transaction_type: {
                  type: "STRING",
                  enum: ["expense", "income"],
                },
                color_argb: { type: "NUMBER" },
                icon_key: { type: "STRING" },
              },
              required: ["name", "transaction_type"],
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
                merchant: { type: "STRING" },
                date: { type: "STRING" },
                currency: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
                wallet_name: { type: "STRING" },
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
                recurrence_rule: {
                  type: "OBJECT",
                  description: "Optional explicit recurrence rule payload",
                },
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
                      merchant: { type: "STRING" },
                      date: { type: "STRING" },
                      currency: { type: "STRING" },
                      wallet_name: { type: "STRING" },
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
                      recurrence_rule: {
                        type: "OBJECT",
                        description:
                          "Optional explicit recurrence rule payload",
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
            name: "list_wallets",
            description:
              "List wallets in personal scope or in a selected space, including balances and the default wallet.",
            parameters: {
              type: "OBJECT",
              properties: {
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                include_archived: { type: "BOOLEAN" },
              },
            },
          },
          {
            name: "create_wallet",
            description:
              "Create a new wallet in personal scope or in a selected space.",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                icon: { type: "STRING" },
                color: { type: "STRING" },
                opening_balance: { type: "NUMBER" },
                goal_amount: { type: "NUMBER" },
                is_default: { type: "BOOLEAN" },
              },
              required: ["name"],
            },
          },
          {
            name: "update_wallet",
            description:
              "Rename or update a wallet in the selected scope. Use wallet_name to choose which wallet to edit.",
            parameters: {
              type: "OBJECT",
              properties: {
                wallet_name: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                new_name: { type: "STRING" },
                icon: { type: "STRING" },
                color: { type: "STRING" },
                goal_amount: { type: "NUMBER" },
                is_default: { type: "BOOLEAN" },
              },
              required: ["wallet_name"],
            },
          },
          {
            name: "create_wallet_transfer",
            description: "Move money between two wallets in the same scope.",
            parameters: {
              type: "OBJECT",
              properties: {
                from_wallet_name: { type: "STRING" },
                to_wallet_name: { type: "STRING" },
                amount: { type: "NUMBER" },
                currency: { type: "STRING" },
                date: { type: "STRING" },
                note: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
              },
              required: ["from_wallet_name", "to_wallet_name", "amount"],
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
                    merchant: { type: "STRING" },
                    date: { type: "STRING", description: "YYYY-MM-DD" },
                    currency: { type: "STRING" },
                    source: { type: "STRING" },
                    is_recurring: { type: "BOOLEAN" },
                    frequency: { type: "STRING" },
                    recurrence_rule: {
                      type: "OBJECT",
                      description: "Optional explicit recurrence rule payload",
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
            name: "set_language",
            description: "Update preferred language.",
            parameters: {
              type: "OBJECT",
              properties: { language: { type: "STRING" } },
              required: ["language"],
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
                merchant: { type: "STRING" },
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
                recurrence_rule: {
                  type: "OBJECT",
                  description: "Optional explicit recurrence rule payload",
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
                type: { type: "STRING", enum: ["expense", "income"] },
              },
              required: ["action"],
            },
          },
        ];

        if (REQUIRED_TELEGRAM_TOOL_NAMES.length > tools.length) {
          debugNotes.push("telegram tool set is below parity baseline");
        }

        let activeChat = createVertexBotChatSession({
          modelName: MODEL_NAME,
          systemInstruction: telegramSystemInstruction,
          history: rawHistory as any,
          tools: [{ function_declarations: tools }] as any,
          timeoutMs: GEMINI_REQUEST_TIMEOUT_MS,
          vertexConfig,
        });
        let response: any = null;
        let functionCalls: any[] = [];
        let finalResponseText = "";

        try {
          const result = await sendGeminiMessageWithRetry(
            activeChat as any,
            userMessageContent,
            {
              preRequestDelayMs: GEMINI_PRE_REQUEST_DELAY_MS,
              maxRetries: GEMINI_MAX_RETRIES,
              logPrefix: "telegram-ai-bot",
              fallbackModelName: FALLBACK_MODEL_NAME,
              fallbackChatFactory: (modelName, history) => {
                return createVertexBotChatSession({
                  modelName,
                  systemInstruction: telegramSystemInstruction,
                  history,
                  tools: [{ function_declarations: tools }] as any,
                  timeoutMs: GEMINI_REQUEST_TIMEOUT_MS,
                  vertexConfig,
                }) as any;
              },
              onChatSwitched: (chatSession) => {
                activeChat = chatSession as any;
              },
            },
          );
          response = await result.response;
          functionCalls = (response.functionCalls() as any[]) || [];
          finalResponseText = response.text();
          if (functionCalls.length > 0) {
            finalResponseText = "";
          }

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
        } catch (error) {
          console.error(
            "[telegram-ai-bot] Failed to get initial AI response:",
            error,
          );

          await reportVertexAiFailure({
            functionName: "telegram-ai-bot",
            error,
            phase: "initial_ai_response",
            modelName: MODEL_NAME,
            context: {
              message: incomingText,
              hasAttachment: !!(
                message?.photo ||
                message?.document ||
                message?.audio ||
                message?.voice
              ),
            },
          });

          debugNotes.push(
            `initial Gemini failure: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          finalResponseText = isRetryableGeminiError(error)
            ? buildGeminiBusyMessage(replyLanguage)
            : buildProcessingFailureMessage(replyLanguage);
        }

        if (
          shouldForceListExpensesCall(incomingText) &&
          (!functionCalls || functionCalls.length === 0)
        ) {
          const forcedArgs = inferListExpensesArgsFromText(incomingText);
          functionCalls = [{ name: "list_expenses", args: forcedArgs } as any];
          debugNotes.push(
            `forced list_expenses call for list intent (args: ${JSON.stringify(
              forcedArgs,
            )})`,
          );
          console.log("[telegram-ai-bot] forced tool call", {
            traceId,
            name: "list_expenses",
            args: forcedArgs,
            reason: "list_intent_without_function_call",
          });
        }

        // Layered defense against AI hallucinating a save without a tool call.
        // Same strategy as twilio-whatsapp-ai-bot.
        if (!functionCalls || functionCalls.length === 0) {
          const writeIntentDetected =
            detectWriteIntentFromUserText(incomingText);
          const claimDiag = diagnoseUnsafeTransactionMutationClaim({
            responseText: finalResponseText,
            writeMutationSucceeded: false,
          });
          const shouldForceWriteToolCall =
            claimDiag.blocked || writeIntentDetected;

          console.log("[telegram-ai-bot] initial-response tool-call guard", {
            traceId,
            userMessage: incomingText,
            writeIntentDetected,
            claimBlocked: claimDiag.blocked,
            claimReason: claimDiag.reason,
            willForceToolCall: shouldForceWriteToolCall,
          });

          if (shouldForceWriteToolCall) {
            try {
              const repairPrompt =
                `Your previous response did not call a save tool. ` +
                `The user's message ("${incomingText}") requires a write action. ` +
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
              console.log("[telegram-ai-bot] forced-tool-call retry result", {
                traceId,
                forcedCallCount: functionCalls.length,
                forcedCallNames: functionCalls.map((c: any) => c?.name),
                hadTextFallback: !!repairText,
              });
              if (functionCalls.length > 0) {
                finalResponseText = "";
              } else {
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
                "[telegram-ai-bot] forced-tool-call retry failed:",
                error,
              );
              debugNotes.push(`forced-tool-call-retry-error: ${String(error)}`);
              finalResponseText = buildUnsafeMutationClaimFallback();
              functionCalls = [];
            }
          }
        }

        let toolSucceededAny = false;
        let writeMutationSucceededAny = false;
        let lastToolResult: any = null;
        let lastToolCallName: string | null = null;
        let lastGeneratedChartUrl: string | null = null;
        let lastBudgetPockets: Array<{
          name: string;
          percentage: number;
        }> | null = null;
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
                const text =
                  typeof call.args?.text === "string"
                    ? call.args.text.trim()
                    : "";
                const fileId =
                  (typeof call.args?.telegram_file_id === "string"
                    ? call.args.telegram_file_id.trim()
                    : "") ||
                  (typeof call.args?.media?.file_id === "string"
                    ? call.args.media.file_id.trim()
                    : "");
                const kindHintRaw =
                  typeof call.args?.media?.kind === "string"
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

                if (fileId && text) {
                  toolResult = {
                    error:
                      "Provide either text or telegram_file_id/media.file_id, not both.",
                  };
                } else if (!fileId && !text) {
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
                      categoryRemaps,
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
                      const kind =
                        kindHint || inferKindFromPath(fileMeta.file_path);
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
                            image: {
                              data: base64Data,
                              contentType,
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
                            audio: {
                              data: base64Data,
                              contentType,
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
                        toolResult = await runAnalyzeExpenseWithTimeout(
                          {
                            userId,
                            currency: userCurrency,
                            allowedExpenseCategories,
                            allowedIncomeCategories,
                            categoryPreferences,
                            categoryRemaps,
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
                const wantsPersonalOnly =
                  !householdId && normalizedScope === "personal";
                const wantsSharedOnly =
                  !householdId && normalizedScope === "shared";
                const isPortfolioQuery =
                  spaceMeta?.isPortfolio === true ||
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
                      normalizeLastListedTransactionFromRow(row),
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
              } else if (call.name === "create_custom_category") {
                const transactionType =
                  String(
                    call.args?.transaction_type || "expense",
                  ).toLowerCase() === "income"
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
                const transactionResult = normalizeTransactionToolArgs(
                  call.args,
                  {
                    date: call.args.date || formatDateInTimeZone(userTimezone),
                    currency: userCurrency,
                  },
                );
                if (!transactionResult.ok) {
                  toolResult = { error: transactionResult.error };
                  lastToolResult = toolResult;
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
                const transaction = transactionResult.transaction;
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
                const isHouseholdExpense =
                  !!householdId && transaction.type === "expense";
                const splitConfig =
                  isHouseholdExpense && !spaceMeta?.isPortfolio
                    ? await resolveHouseholdSplitConfig(
                        supabase,
                        householdId!,
                        userId,
                        transaction.amount,
                        call.args,
                      )
                    : {};
                const requestedWallet = await resolveWalletIdInScope(
                  supabase,
                  userId,
                  householdId,
                  call.args.wallet_name,
                );
                if (requestedWallet.error) {
                  toolResult = { error: requestedWallet.error };
                  lastToolResult = toolResult;
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
                const { data, error } = await invokeTransactionSave(
                  supabase,
                  internalFunctionKey,
                  userId,
                  {
                    recurrence_rule:
                      call.args.is_recurring === true
                        ? buildRecurrenceRule(call.args, transaction.date!)
                        : undefined,
                    amount: transaction.amount,
                    category: transaction.category,
                    description: transaction.description,
                    merchant: transaction.merchant,
                    date: transaction.date!,
                    currency: transaction.currency || userCurrency,
                    type: transaction.type,
                    householdId,
                    isPortfolio:
                      spaceMeta?.isPortfolio ?? call.args.is_portfolio === true,
                    accountId: requestedWallet.accountId ?? undefined,
                    isRecurring: call.args.is_recurring === true,
                    payerUserId: splitConfig.payerUserId,
                    customSplits: splitConfig.customSplits,
                    source: call.args.source,
                    ownerType: call.args.owner_type,
                    privacyScope: call.args.privacy_scope,
                  },
                );
                const success = !error && data?.success === true;
                const formatted = success
                  ? ""
                  : (await formatInvokeErrorWithResponseBody(
                      error ?? data?.error,
                    )) || "Failed to save transaction";
                toolResult = success
                  ? { success: true, data: data?.data ?? data }
                  : { error: formatted };
                if (!success) {
                  await reportTelegramToolInvokeFailure({
                    traceId,
                    toolName: "add_transaction",
                    targetFunction:
                      transaction.type === "income"
                        ? "save-income"
                        : "save-expense",
                    formatted,
                    error: error ?? data?.error,
                    context: {
                      amount: transaction.amount,
                      category: transaction.category,
                      householdId,
                    },
                  });
                }
              } else if (call.name === "add_transactions_batch") {
                const rows = Array.isArray(call.args.transactions)
                  ? call.args.transactions
                  : [];
                if (rows.length === 0) {
                  toolResult = { error: "No transactions provided" };
                  lastToolResult = toolResult;
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
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
                const isPortfolio =
                  spaceMeta?.isPortfolio ?? call.args.is_portfolio === true;
                const batchTransactions: any[] = [];
                let batchBuildError: string | null = null;

                for (const [index, row] of rows.entries()) {
                  if (!row || typeof row !== "object") {
                    batchBuildError = `Transaction ${
                      index + 1
                    }: Invalid transaction row.`;
                    break;
                  }
                  const transactionResult = normalizeTransactionToolArgs(row, {
                    date: row.date || formatDateInTimeZone(userTimezone),
                    currency: userCurrency,
                  });
                  if (!transactionResult.ok) {
                    batchBuildError = `Transaction ${
                      index + 1
                    }: ${transactionResult.error}`;
                    break;
                  }
                  const transaction = transactionResult.transaction;
                  const requestedWallet = await resolveWalletIdInScope(
                    supabase,
                    userId,
                    householdId,
                    row.wallet_name,
                  );
                  if (requestedWallet.error) {
                    batchBuildError = `Transaction ${
                      index + 1
                    }: ${requestedWallet.error}`;
                    break;
                  }
                  const splitConfig =
                    householdId && !isPortfolio && transaction.type !== "income"
                      ? await resolveHouseholdSplitConfig(
                          supabase,
                          householdId,
                          userId,
                          transaction.amount,
                          row,
                        )
                      : {};

                  batchTransactions.push({
                    type: transaction.type,
                    amount: transaction.amount,
                    category: transaction.category,
                    description: transaction.description || "",
                    merchant: transaction.merchant,
                    date: transaction.date!,
                    currency: transaction.currency || userCurrency,
                    accountId: requestedWallet.accountId ?? undefined,
                    source: row.source,
                    ownerType: row.owner_type || "me",
                    privacyScope: row.privacy_scope || "full",
                    payerUserId: splitConfig.payerUserId,
                    customSplits: splitConfig.customSplits,
                    isRecurring: row.is_recurring === true,
                    recurrence_rule:
                      row.is_recurring === true
                        ? buildRecurrenceRule(row, transaction.date!)
                        : undefined,
                  });
                }

                if (batchBuildError) {
                  toolResult = { error: batchBuildError };
                  lastToolResult = toolResult;
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }

                const { data, error } = await supabase.functions.invoke(
                  "save-transactions-batch",
                  {
                    body: {
                      userId,
                      householdId,
                      isPortfolio,
                      transactions: batchTransactions,
                    },
                    headers: buildInternalInvokeHeaders(internalFunctionKey),
                  },
                );

                const success = !error && data?.success === true;
                const formatted = success
                  ? ""
                  : formatInvokeError(error ?? data?.error) ||
                    "Failed to save transactions";
                toolResult = success
                  ? {
                      success: true,
                      summary: data?.summary,
                      results: data?.results,
                    }
                  : {
                      error: formatted,
                    };
                if (!success) {
                  await reportTelegramToolInvokeFailure({
                    traceId,
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
                }
              } else if (call.name === "list_wallets") {
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
                const { data, error } = await supabase.functions.invoke(
                  "list-wallets",
                  {
                    body: {
                      userId,
                      householdId,
                      includeArchived: call.args.include_archived === true,
                    },
                    headers: buildInternalInvokeHeaders(internalFunctionKey),
                  },
                );
                const success = !error && data?.success === true;
                const formatted = success
                  ? ""
                  : formatInvokeError(error ?? data?.error) ||
                    "Failed to list wallets";
                toolResult = success
                  ? { success: true, data: data?.data ?? [] }
                  : { error: formatted };
                if (!success) {
                  await reportTelegramToolInvokeFailure({
                    traceId,
                    toolName: "list_wallets",
                    targetFunction: "list-wallets",
                    formatted,
                    error: error ?? data?.error,
                    context: { householdId },
                  });
                }
              } else if (call.name === "create_wallet") {
                const walletNameResult = normalizeRequiredAiToolString(
                  call.args.name,
                  "wallet name",
                );
                const openingBalanceResult = normalizeAiToolMoneyCents(
                  call.args.opening_balance,
                  "opening_balance",
                );
                const goalAmountResult = normalizeAiToolMoneyCents(
                  call.args.goal_amount,
                  "goal_amount",
                  { allowNegative: false },
                );
                if (!walletNameResult.ok) {
                  toolResult = { error: walletNameResult.error };
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
                if (!openingBalanceResult.ok) {
                  toolResult = { error: openingBalanceResult.error };
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
                if (!goalAmountResult.ok) {
                  toolResult = { error: goalAmountResult.error };
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
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
                const { data, error } = await supabase.functions.invoke(
                  "save-wallet",
                  {
                    body: {
                      userId,
                      householdId,
                      name: walletNameResult.value,
                      icon: call.args.icon,
                      color: call.args.color,
                      openingBalanceCents: openingBalanceResult.cents,
                      goalAmountCents: goalAmountResult.cents,
                      isDefault: call.args.is_default === true,
                    },
                    headers: buildInternalInvokeHeaders(internalFunctionKey),
                  },
                );
                const success = !error && data?.success === true;
                const formatted = success
                  ? ""
                  : formatInvokeError(error ?? data?.error) ||
                    "Failed to create wallet";
                toolResult = success
                  ? { success: true, data: data?.data ?? data }
                  : { error: formatted };
                if (!success) {
                  await reportTelegramToolInvokeFailure({
                    traceId,
                    toolName: "create_wallet",
                    targetFunction: "save-wallet",
                    formatted,
                    error: error ?? data?.error,
                    context: { householdId, name: walletNameResult.value },
                  });
                }
              } else if (call.name === "update_wallet") {
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
                const requestedWallet = await resolveWalletIdInScope(
                  supabase,
                  userId,
                  householdId,
                  call.args.wallet_name,
                );
                if (requestedWallet.error || !requestedWallet.accountId) {
                  toolResult = {
                    error:
                      requestedWallet.error ||
                      "Wallet was not found in the selected scope.",
                  };
                } else {
                  const newNameResult =
                    call.args.new_name != null
                      ? normalizeRequiredAiToolString(
                          call.args.new_name,
                          "new_name",
                        )
                      : { ok: true as const, value: undefined };
                  const goalAmountResult = normalizeAiToolMoneyCents(
                    call.args.goal_amount,
                    "goal_amount",
                    { allowNegative: false },
                  );
                  if (!newNameResult.ok) {
                    toolResult = { error: newNameResult.error };
                    toolResponses.push({
                      functionResponse: {
                        name: call.name,
                        response: toolResult,
                      },
                    });
                    continue;
                  }
                  if (!goalAmountResult.ok) {
                    toolResult = { error: goalAmountResult.error };
                    toolResponses.push({
                      functionResponse: {
                        name: call.name,
                        response: toolResult,
                      },
                    });
                    continue;
                  }
                  const hasUpdate =
                    newNameResult.value !== undefined ||
                    typeof call.args.icon === "string" ||
                    typeof call.args.color === "string" ||
                    goalAmountResult.cents !== undefined ||
                    typeof call.args.is_default === "boolean";
                  if (!hasUpdate) {
                    toolResult = {
                      error: "At least one wallet update is required.",
                    };
                    toolResponses.push({
                      functionResponse: {
                        name: call.name,
                        response: toolResult,
                      },
                    });
                    continue;
                  }
                  const { data, error } = await supabase.functions.invoke(
                    "update-wallet",
                    {
                      body: {
                        userId,
                        accountId: requestedWallet.accountId,
                        name: newNameResult.value,
                        icon: call.args.icon,
                        color: call.args.color,
                        goalAmountCents: goalAmountResult.cents,
                        isDefault:
                          typeof call.args.is_default === "boolean"
                            ? call.args.is_default
                            : undefined,
                      },
                      headers: buildInternalInvokeHeaders(internalFunctionKey),
                    },
                  );
                  const success = !error && data?.success === true;
                  const formatted = success
                    ? ""
                    : formatInvokeError(error ?? data?.error) ||
                      "Failed to update wallet";
                  toolResult = success
                    ? { success: true, data: data?.data ?? data }
                    : { error: formatted };
                  if (!success) {
                    await reportTelegramToolInvokeFailure({
                      traceId,
                      toolName: "update_wallet",
                      targetFunction: "update-wallet",
                      formatted,
                      error: error ?? data?.error,
                      context: {
                        householdId,
                        walletName: call.args.wallet_name,
                      },
                    });
                  }
                }
              } else if (call.name === "create_wallet_transfer") {
                const amountResult = normalizeAiToolAmount(call.args.amount);
                if (!amountResult.ok) {
                  toolResult = { error: amountResult.error };
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
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
                const fromWallet = await resolveWalletIdInScope(
                  supabase,
                  userId,
                  householdId,
                  call.args.from_wallet_name,
                );
                const toWallet = await resolveWalletIdInScope(
                  supabase,
                  userId,
                  householdId,
                  call.args.to_wallet_name,
                );
                if (fromWallet.error || !fromWallet.accountId) {
                  toolResult = {
                    error:
                      fromWallet.error ||
                      "Source wallet was not found in the selected scope.",
                  };
                } else if (toWallet.error || !toWallet.accountId) {
                  toolResult = {
                    error:
                      toWallet.error ||
                      "Destination wallet was not found in the selected scope.",
                  };
                } else {
                  const { data, error } = await supabase.functions.invoke(
                    "create-wallet-transfer",
                    {
                      body: {
                        userId,
                        fromAccountId: fromWallet.accountId,
                        toAccountId: toWallet.accountId,
                        amountCents: Math.round(amountResult.amount * 100),
                        currency: call.args.currency || userCurrency,
                        date:
                          call.args.date || formatDateInTimeZone(userTimezone),
                        note: call.args.note,
                      },
                      headers: buildInternalInvokeHeaders(internalFunctionKey),
                    },
                  );
                  const success = !error && data?.success === true;
                  const formatted = success
                    ? ""
                    : formatInvokeError(error ?? data?.error) ||
                      "Failed to create wallet transfer";
                  toolResult = success
                    ? { success: true, data: data?.data ?? data }
                    : { error: formatted };
                  if (!success) {
                    await reportTelegramToolInvokeFailure({
                      traceId,
                      toolName: "create_wallet_transfer",
                      targetFunction: "create-wallet-transfer",
                      formatted,
                      error: error ?? data?.error,
                      context: {
                        householdId,
                        fromWallet: call.args.from_wallet_name,
                        toWallet: call.args.to_wallet_name,
                        amount: call.args.amount,
                      },
                    });
                  }
                }
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
                const longUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
                  JSON.stringify(chartConfig),
                )}`;
                const chartUrl =
                  (await createQuickChartShortUrl(chartConfig)) || longUrl;
                toolResult = { url: chartUrl };
                lastGeneratedChartUrl = chartUrl;
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
                  toolResult = res.error
                    ? { error: res.error }
                    : {
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
                toolResult = error
                  ? { error }
                  : {
                      success: true,
                      currency: data?.preferred_currency || currency,
                    };
              } else if (call.name === "set_language") {
                const language = (call.args.language || "").toString().trim();
                const { data, error } = await supabase.functions.invoke(
                  "update-preferred-language",
                  {
                    body: {
                      userId,
                      language,
                    },
                    headers: buildInternalInvokeHeaders(internalFunctionKey),
                  },
                );
                const resolvedLanguage =
                  data?.results?.preferredLanguage || language;
                const success =
                  !error && (data?.ok === true || data?.success === true);
                const formatted = success
                  ? ""
                  : formatInvokeError(error ?? data?.error) ||
                    "Failed to update preferred language";
                toolResult = success
                  ? {
                      success: true,
                      language: resolvedLanguage,
                      reply_language: resolvedLanguage,
                      message: `Preferred language updated to ${resolvedLanguage}. Reply in this language for this confirmation and use it as the default language for future replies.`,
                    }
                  : { error: formatted };
                if (!success) {
                  await reportTelegramToolInvokeFailure({
                    traceId,
                    toolName: "set_language",
                    targetFunction: "update-preferred-language",
                    formatted,
                    error: error ?? data?.error,
                    context: { language },
                  });
                }
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
                    const fallbackType =
                      matchTypeRaw === "income"
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
                          normalizeLastListedTransactionFromRow(row),
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
                        `Reply with a number from 1..${Math.max(
                          choices.length,
                          1,
                        )}.`,
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
                    if ((updatesArgs as any).merchant !== undefined) {
                      updates.merchant = (updatesArgs as any).merchant;
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
                    if ((updatesArgs as any).source != null) {
                      updates.source = (updatesArgs as any).source;
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

                      if (!internalFunctionKey) {
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
                        await reportBotBackendError({
                          functionName: "telegram-ai-bot",
                          phase: "tool:update_transaction",
                          traceId,
                          error: new Error(
                            "update-expense skipped: missing internal key",
                          ),
                          context: {
                            tool: "update-expense",
                            internalKeyConfigured: false,
                            updatesKeys: Object.keys(updates),
                            candidateSummary,
                            expenseId,
                          },
                        });
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
                            headers:
                              buildInternalInvokeHeaders(internalFunctionKey),
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
                          await reportBotToolInvokeFailure({
                            functionName: "telegram-ai-bot",
                            traceId,
                            toolName: "update_transaction",
                            targetFunction: "update-expense",
                            formatted,
                            error: error ?? data?.error,
                            context: {
                              tool: "update-expense",
                              internalKeyConfigured:
                                Boolean(internalFunctionKey),
                              httpStatus,
                              status,
                              code,
                              updatesKeys: Object.keys(updates),
                              candidateSummary,
                              expenseId,
                            },
                          });
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
                      headers: buildInternalInvokeHeaders(internalFunctionKey),
                    },
                  );
                  const success = !error && data?.success === true;
                  const formatted = success
                    ? ""
                    : formatInvokeError(error ?? data?.error) ||
                      "Failed to delete transaction";
                  toolResult = success
                    ? { success: true }
                    : { error: formatted };
                  if (!success) {
                    await reportTelegramToolInvokeFailure({
                      traceId,
                      toolName: "delete_transaction",
                      targetFunction: "delete-expense",
                      formatted,
                      error: error ?? data?.error,
                      context: { expenseId: resolved.candidate.id },
                    });
                  }
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
                  const amountResult = normalizeAiToolAmount(call.args.amount);
                  if (!amountResult.ok) {
                    toolResult = { error: amountResult.error };
                  } else {
                    const amount = amountResult.amount;
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
                        let pocketBuildError: string | null = null;
                        for (const pocket of pockets) {
                          const pocketName = (pocket?.name || "")
                            .toString()
                            .trim();
                          if (!pocketName) continue;
                          const pctResult = normalizeAiToolPercentage(
                            pocket?.percentage,
                            "percentage",
                          );
                          if (!pctResult.ok) {
                            pocketBuildError = `${pocketName}: ${pctResult.error}`;
                            break;
                          }
                          const clampedPct = pctResult.percentage;
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
                        toolResult = pocketBuildError
                          ? { error: pocketBuildError }
                          : {
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
                    const hasPercentageArg =
                      Object.prototype.hasOwnProperty.call(
                        call.args || {},
                        "percentage",
                      );
                    const resolvedPercentage = resolvePocketPercentageForUpsert(
                      {
                        hasPercentageArg,
                        providedPercentage: call.args.percentage,
                        existingPercentage: canonical?.budget_percentage,
                      },
                    );
                    if (
                      resolvedPercentage.error ||
                      resolvedPercentage.percentage == null
                    ) {
                      toolResult = {
                        error:
                          resolvedPercentage.error || "percentage is required",
                      };
                      toolResponses.push({
                        functionResponse: {
                          name: call.name,
                          response: toolResult,
                        },
                      });
                      continue;
                    }
                    const percentage = resolvedPercentage.percentage;
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
                if (!["add", "update", "delete"].includes(action)) {
                  toolResult = {
                    error: "action must be add, update, or delete.",
                  };
                } else if (action === "delete") {
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
                      const { data, error } = await supabase.functions.invoke(
                        "delete-expense",
                        {
                          body: { userId, expenseIds: expenseId },
                          headers:
                            buildInternalInvokeHeaders(internalFunctionKey),
                        },
                      );
                      const success = !error && data?.success === true;
                      const formatted = success
                        ? ""
                        : formatInvokeError(error ?? data?.error) ||
                          "Failed to delete recurring transaction";
                      toolResult = success
                        ? { success: true }
                        : { error: formatted };
                      if (!success) {
                        await reportTelegramToolInvokeFailure({
                          traceId,
                          toolName: "manage_recurring",
                          targetFunction: "delete-expense",
                          formatted,
                          error: error ?? data?.error,
                          context: { action, expenseId },
                        });
                      }
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
                      const dateValue =
                        call.args.date || formatDateInTimeZone(userTimezone);
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
                        const amountResult = normalizeAiToolAmount(
                          call.args.amount,
                        );
                        if (!amountResult.ok) {
                          toolResult = { error: amountResult.error };
                          toolResponses.push({
                            functionResponse: {
                              name: call.name,
                              response: toolResult,
                            },
                          });
                          continue;
                        }
                        updates.amount_cents = Math.round(
                          amountResult.amount * 100,
                        );
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
                      if (call.args.date != null) updates.date = call.args.date;
                      if (call.args.source != null) {
                        updates.source = call.args.source;
                      }
                      if (call.args.recurrence_rule) {
                        updates.recurrence_rule = call.args.recurrence_rule;
                      }
                      const { data, error } = await supabase.functions.invoke(
                        "update-expense",
                        {
                          body: {
                            userId,
                            expenseId,
                            updates,
                          },
                          headers:
                            buildInternalInvokeHeaders(internalFunctionKey),
                        },
                      );
                      const success = !error && data?.success === true;
                      const formatted = success
                        ? ""
                        : formatInvokeError(error ?? data?.error) ||
                          "Failed to update recurring transaction";
                      toolResult = success
                        ? { success: true }
                        : { error: formatted };
                      if (!success) {
                        await reportTelegramToolInvokeFailure({
                          traceId,
                          toolName: "manage_recurring",
                          targetFunction: "update-expense",
                          formatted,
                          error: error ?? data?.error,
                          context: {
                            action,
                            expenseId,
                            updateKeys: Object.keys(updates),
                          },
                        });
                      }
                    }
                  }
                } else {
                  const dateValue =
                    call.args.date || formatDateInTimeZone(userTimezone);
                  const recurrenceRule = {
                    frequency: (call.args.frequency || "monthly")
                      .toString()
                      .toLowerCase(),
                    interval: 1,
                    anchor_date: dateValue,
                  };
                  const transactionResult = normalizeTransactionToolArgs(
                    call.args,
                    { date: dateValue, currency: userCurrency },
                  );
                  if (!transactionResult.ok) {
                    toolResult = { error: transactionResult.error };
                    toolResponses.push({
                      functionResponse: {
                        name: call.name,
                        response: toolResult,
                      },
                    });
                    continue;
                  }
                  const transaction = transactionResult.transaction;
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
                  const splitConfig =
                    householdId &&
                    !spaceMeta?.isPortfolio &&
                    transaction.type !== "income"
                      ? await resolveHouseholdSplitConfig(
                          supabase,
                          householdId,
                          userId,
                          transaction.amount,
                          call.args,
                        )
                      : {};
                  const requestedWallet = await resolveWalletIdInScope(
                    supabase,
                    userId,
                    householdId,
                    call.args.wallet_name,
                  );
                  if (requestedWallet.error) {
                    toolResult = { error: requestedWallet.error };
                  } else {
                    const { data, error } = await invokeTransactionSave(
                      supabase,
                      internalFunctionKey,
                      userId,
                      {
                        amount: transaction.amount,
                        category: transaction.category,
                        description: transaction.description,
                        merchant: transaction.merchant,
                        date: transaction.date || dateValue,
                        currency: transaction.currency || userCurrency,
                        type: transaction.type,
                        householdId,
                        isPortfolio:
                          spaceMeta?.isPortfolio ??
                          call.args.is_portfolio === true,
                        accountId: requestedWallet.accountId ?? undefined,
                        isRecurring: true,
                        recurrence_rule: recurrenceRule,
                        payerUserId: splitConfig.payerUserId,
                        customSplits: splitConfig.customSplits,
                        source: call.args.source,
                        ownerType: call.args.owner_type,
                        privacyScope: call.args.privacy_scope,
                      },
                    );
                    const targetFunction =
                      transaction.type === "income"
                        ? "save-income"
                        : "save-expense";
                    const success = !error && data?.success === true;
                    const formatted = success
                      ? ""
                      : (await formatInvokeErrorWithResponseBody(
                          error ?? data?.error,
                        )) || "Failed to save recurring transaction";
                    toolResult = success
                      ? { success: true, data: data?.data ?? data }
                      : { error: formatted };
                    if (!success) {
                      await reportTelegramToolInvokeFailure({
                        traceId,
                        toolName: "manage_recurring",
                        targetFunction,
                        formatted,
                        error: error ?? data?.error,
                        context: {
                          action,
                          type: transaction.type,
                          amount: transaction.amount,
                          category: transaction.category,
                          householdId,
                        },
                      });
                    }
                  }
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
              error:
                typeof toolResult?.error === "string"
                  ? toolResult.error.slice(0, 200)
                  : undefined,
            });

            lastToolResult = toolResult;
            lastToolCallName =
              typeof call?.name === "string" ? call.name : null;

            const succeeded =
              toolResult?.success === true ||
              (!!toolResult?.data && !toolResult?.error);
            if (succeeded) {
              toolSucceededAny = true;
              if (isWriteMutationToolName(call.name)) {
                writeMutationSucceededAny = true;
              }
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
            const chartFromTool =
              extractChartMediaUrlFromToolResult(toolResult);
            if (chartFromTool) {
              // Persist chart from tool payload even when the model doesn't print it.
              lastGeneratedChartUrl = chartFromTool;
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
              activeChat as any,
              toolResponses,
              {
                preRequestDelayMs: GEMINI_PRE_REQUEST_DELAY_MS,
                maxRetries: GEMINI_MAX_RETRIES,
                logPrefix: "telegram-ai-bot",
                fallbackModelName: FALLBACK_MODEL_NAME,
                fallbackChatFactory: (modelName, history) => {
                  return createVertexBotChatSession({
                    modelName,
                    systemInstruction: telegramSystemInstruction,
                    history,
                    tools: [{ function_declarations: tools }] as any,
                    timeoutMs: GEMINI_REQUEST_TIMEOUT_MS,
                    vertexConfig,
                  }) as any;
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
              "[telegram-ai-bot] Failed to get final AI response:",
              e,
            );

            await reportVertexAiFailure({
              functionName: "telegram-ai-bot",
              error: e,
              phase: "final_ai_response",
              modelName: MODEL_NAME,
              context: {
                toolIterations,
                lastToolCalls: functionCalls?.length || 0,
              },
            });

            finalResponseText = isRetryableGeminiError(e)
              ? buildGeminiBusyMessage(replyLanguage)
              : buildProcessingFailureMessage(replyLanguage);
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
          typeof buildMutationFailureText(lastToolCallName, lastToolResult) ===
          "string"
        ) {
          finalResponseText = buildMutationFailureText(
            lastToolCallName,
            lastToolResult,
          )!;
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
        {
          const finalDiag = diagnoseUnsafeTransactionMutationClaim({
            responseText: finalResponseText,
            writeMutationSucceeded: writeMutationSucceededAny,
          });
          if (finalDiag.blocked) {
            console.log(
              "[telegram-ai-bot] final-response mutation-claim blocked",
              {
                traceId,
                lastToolCallName,
                writeMutationSucceededAny,
                reason: finalDiag.reason,
                responseTextPreview: finalResponseText.slice(0, 200),
              },
            );
            finalResponseText = buildUnsafeMutationClaimFallback();
          }
        }
        if (!finalResponseText || !finalResponseText.trim()) {
          finalResponseText =
            "I couldn't generate a response right now. Please try again in a few seconds.";
        }

        // Persist the incoming user message AFTER Gemini/tool flow so history doesn't echo it.
        const chartFromText = extractQuickChartUrl(finalResponseText);
        let mediaUrl: string | null =
          chartFromText.url || lastGeneratedChartUrl;
        let cleanedText = chartFromText.cleanedText || finalResponseText;

        if (mediaUrl) {
          mediaUrl = await normalizeQuickChartMediaUrl(mediaUrl);
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
          cleanedText,
          debugNotes,
          false,
        );

        const choiceKeyboard = buildChoiceKeyboard(cleanedText);
        console.log("[telegram-ai-bot] final", {
          traceId,
          textLen: cleanedText?.length || 0,
          usedChoiceKeyboard: !!choiceKeyboard,
          hasMedia: !!mediaUrl,
        });

        const caption = truncateTextByCodePoints(cleanedText, 900);
        if (mediaUrl) {
          await sendTelegramChatAction(
            TELEGRAM_BOT_TOKEN,
            chatId,
            "upload_photo",
          );
          const sentPhoto = await sendTelegramPhoto(
            TELEGRAM_BOT_TOKEN,
            chatId,
            mediaUrl,
            caption,
            choiceKeyboard,
          );
          if (!sentPhoto) {
            const fallbackText = [cleanedText, mediaUrl]
              .filter((part) => typeof part === "string" && part.trim())
              .join("\n\n");
            const sentFallback = await sendTelegramMessage(
              TELEGRAM_BOT_TOKEN,
              chatId,
              truncateTextByCodePoints(fallbackText, 3500),
              choiceKeyboard,
            );
            if (!sentFallback) {
              throw new Error("Failed to deliver Telegram chart response");
            }
          }
          telegramResponseSent = true;
        } else {
          await sendTelegramMessage(
            TELEGRAM_BOT_TOKEN,
            chatId,
            cleanedText,
            choiceKeyboard,
          );
          telegramResponseSent = true;
        }

        await updateIdempotency(supabase, idempotencyKey, {
          status: "done",
          response_text: cleanedText,
          media_url: mediaUrl || undefined,
        });
      } catch (error) {
        console.error("[telegram-ai-bot] Handler error:", error);
        await reportBotBackendError({
          functionName: "telegram-ai-bot",
          phase: "process_message",
          error,
          traceId,
        });
        if (!telegramResponseSent) {
          try {
            await sendTelegramMessage(
              TELEGRAM_BOT_TOKEN,
              chatId,
              buildProcessingFailureMessage(replyLanguage),
            );
            telegramResponseSent = true;
          } catch (sendError) {
            console.error(
              "[telegram-ai-bot] Failed to send fallback Telegram message:",
              sendError,
            );
          }
        }
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
