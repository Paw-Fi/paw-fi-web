// Supabase Edge Function: telegram-ai-bot
// Handles Telegram messages, using Gemini AI and existing tools.

import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.17.0";
import { corsHeaders } from "../shared/cors.ts";
import { isFreeUser } from "../shared/is-free-user.ts";
import {
  buildCategoryChart,
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

const MODEL_NAME = "gemini-2.5-flash-lite";
const SYSTEM_INSTRUCTION =
  `You are Moneko, a helpful and friendly financial assistant on Telegram.
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
16. **Currency updates**: Preferred currency is stored in user_contacts.preferred_currency. When the user asks to change currency, call the currency tool to update that column and confirm.
17. **Options**: When offering choices (spaces, pockets, budgets, follow-up options), list them as numbered text and ask the user to reply with the number or name.
18. **Splits**: For space expenses, support who paid + how to split. If the user says "paid by X" and/or provides per-member splits, call 'add_transaction' with 'payer_name', 'split_type', and 'member_splits'. If split is not specified, default to an equal split among space members.
19. **Financial snapshot**: For asks like "current financial situation/health/status": provide one concise snapshot for the current month/pay-period: verdict, income vs spending, net, top categories, budget status, upcoming recurring, and 1–2 actions. Always include the text summary; the chart is optional/secondary.
20. **Language**: Respond in the user's preferred language: {{LANGUAGE}}.

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
}

function startTelegramTypingHeartbeat(token: string, chatId: number) {
  let active = true;

  const sendTyping = async () => {
    if (!active) return;
    await sendTelegramChatAction(token, chatId, "typing");
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
          formatInvokeError(linksErr)
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
          formatInvokeError(deleteEnvErr)
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
  const EDGE_FUNCTION_KEY = Deno.env.get("EDGE_FUNCTION_KEY") || "";

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
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        cached.response_text,
        buildChoiceKeyboard(cached.response_text),
      );
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
        const chatHouseholds = contextData?.households || [];
        const spaceMap = new Map<
          string,
          { id: string; name: string; isPortfolio: boolean }
        >();
        const portfolioSpaceIds: string[] = [];
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
            .replace("{{CATEGORIES}}", CATEGORY_GUIDE)
            .replace("{{LANGUAGE}}", userLang),
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
            description: "Update an existing expense transaction.",
            parameters: {
              type: "OBJECT",
              properties: {
                expense_id: { type: "STRING" },
                amount: { type: "NUMBER" },
                category: { type: "STRING" },
                description: { type: "STRING" },
                date: { type: "STRING" },
                currency: { type: "STRING" },
                source: { type: "STRING" },
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
                is_recurring: { type: "BOOLEAN" },
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
                expense_id: { type: "STRING" },
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
                currency: { type: "STRING" },
                limit: { type: "NUMBER" },
                start_date: { type: "STRING" },
                end_date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
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
        const result = await chat.sendMessage(userMessageContent);
        let response = await result.response;
        let functionCalls = (response.functionCalls() as any[]) || [];
        let finalResponseText = response.text();

        let toolSucceededAny = false;
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
                    { userId, text, currency: userCurrency },
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
                  toolResponses.push({
                    functionResponse: { name: call.name, response: toolResult },
                  });
                  continue;
                }
                const { data, error } = await fetchExpensesDirect(
                  supabase,
                  contact.id,
                  {
                    limit: call.args.limit || 50,
                    startDate: call.args.start_date,
                    endDate: call.args.end_date,
                    householdId,
                    isPortfolio: spaceMeta?.isPortfolio ??
                      call.args.is_portfolio === true,
                    portfolioHouseholdIds: householdId
                      ? undefined
                      : portfolioSpaceIds,
                    currency: call.args.currency,
                    type: call.args.type,
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
                  toolResult = { expenses: normalized, chart_url: chartUrl };
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
                if (call.args.currency != null) {
                  updates.currency = call.args.currency;
                }
                if (call.args.date != null) updates.date = call.args.date;
                if (call.args.source != null) updates.source = call.args.source;
                if (call.args.is_recurring != null) {
                  updates.is_recurring = !!call.args.is_recurring;
                }
                if (call.args.recurrence_rule != null) {
                  updates.recurrence_rule = call.args.recurrence_rule;
                }

                if (!call.args.expense_id) {
                  toolResult = { error: "expense_id is required" };
                } else {
                  const { data, error } = await supabase.functions.invoke(
                    "update-expense",
                    {
                      body: {
                        userId,
                        expenseId: call.args.expense_id,
                        updates,
                      },
                      headers: {
                        "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY,
                      },
                    },
                  );
                  toolResult = !error && data?.success
                    ? { success: true, data: data?.data ?? data }
                    : {
                      error: error ??
                        data?.error ??
                        "Failed to update transaction",
                    };
                }
              } else if (call.name === "delete_transaction") {
                if (!call.args.expense_id) {
                  toolResult = { error: "expense_id is required" };
                } else {
                  const { data, error } = await supabase.functions.invoke(
                    "delete-expense",
                    {
                      body: { userId, expenseIds: call.args.expense_id },
                      headers: {
                        "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY,
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
                  if (!call.args.expense_id) {
                    toolResult = { error: "expense_id is required" };
                  } else {
                    const { data, error } = await supabase.functions.invoke(
                      "delete-expense",
                      {
                        body: { userId, expenseIds: call.args.expense_id },
                        headers: {
                          "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY,
                        },
                      },
                    );
                    toolResult = !error && data?.success ? { success: true } : {
                      error: error ??
                        data?.error ??
                        "Failed to delete recurring transaction",
                    };
                  }
                } else if (action === "update") {
                  if (!call.args.expense_id) {
                    toolResult = { error: "expense_id is required" };
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
                          expenseId: call.args.expense_id,
                          updates,
                        },
                        headers: {
                          "X-Moneko-Internal-Key": EDGE_FUNCTION_KEY,
                        },
                      },
                    );
                    toolResult = !error && data?.success
                      ? { success: true, data: data?.data ?? data }
                      : {
                        error: error ??
                          data?.error ??
                          "Failed to update recurring transaction",
                      };
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
            const nextResult = await chat.sendMessage(toolResponses);
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
          toolSucceededAny &&
          lastBudgetPockets
        ) {
          finalResponseText = buildBudgetDoneText(lastBudgetPockets);
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

        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          finalResponseText,
          buildChoiceKeyboard(finalResponseText),
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
