import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import * as XLSX from "https://esm.sh/xlsx@0.18.5?no-dts";
import { validateCurrency } from "./currency-validator.ts";
import { normalizeCategory, getExpenseCategories, getIncomeCategories } from "./category-colors.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

function b64encode(bytes: Uint8Array): string {
  return encodeBase64(bytes);
}

function getFirstFunctionCall(response: any) {
  const direct = response?.response?.functionCalls?.()?.[0];
  if (direct) return direct;

  const candidates = response?.response?.candidates;
  if (!candidates || candidates.length === 0) return null;
  
  const parts = candidates[0].content?.parts || [];
  for (const p of parts) {
    if (p.functionCall) return p.functionCall;
  }
  return null;
}

export interface AnalyzeAttachment {
  filename: string;
  contentType: string;
  data: string; // base64
}

export interface AnalyzeRequestBody {
  userId?: string | null;
  text?: string;
  image?: {
    data: string;
    contentType: string;
    // Optional raw bytes to avoid double-encoding issues (preferred when available)
    bytes?: Uint8Array;
  };
  audio?: {
    data: string;
    contentType: string;
    bytes?: Uint8Array;
  };
  date?: string;
  currency?: string;
  language?: string;
  householdId?: string;
  isPortfolio?: boolean;
  householdMembers?: HouseholdMemberContext[];
  attachments?: AnalyzeAttachment[];
}

export interface AnalyzeResult {
  success: boolean;
  items?: ExpenseItem[];
  language: string;
  error?: string;
  status?: number;
}

export interface HouseholdMemberContext {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
}

export interface MemberSplit {
  userId: string;
  amount?: number; // For 'amount' splitType (major units)
  percentage?: number; // For 'percentage' splitType (0-100)
  shares?: number; // For 'shares' splitType (positive int)
}

export interface CustomSplits {
  splitType: "equal" | "amount" | "percentage" | "shares";
  memberSplits: MemberSplit[];
}

export interface ExpenseItem {
  type: "expense" | "income";
  amount: number;
  category: string;
  currency: string;
  currencySymbol: string;
  date: string;
  description?: string;
  payerUserId?: string;
  customSplits?: CustomSplits;
}

function buildTransactionSystemInstruction(
  language: string,
  expenseCategories: string[],
  incomeCategories: string[],
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
): string {
  return [
    "You are a professional transaction extraction and classification system.",
    "Task: Parse the input (plain text) into one or more transactions and return them ONLY by calling add_transactions. Every item MUST include a type (expense|income).",

    "### 1. QUANTITY & AMOUNT STRATEGY",
    "- **Single Receipt/Bill**: If the text represents a single receipt with line items and a total, return **ONE** transaction for the Grand Total.",
    "- **Bank Feed / List**: If the text lists multiple distinct transactions, return them as **SEPARATE** items.",
    "- Do NOT output a separate transaction for subtotal/total/grand total lines.",

    "### 2. CLASSIFICATION (Type & Category)",
    "- **Type**: 'expense' (spending, debit, payment) vs 'income' (deposit, salary, refund).",
    "- **Bank/Notification Context**: 'Credited', 'Deposit', 'Received', 'Top up' -> INCOME. 'Debited', 'Paid', 'Purchase', 'Sent to', 'Withdrawal' -> EXPENSE.",
    `   - **Expense Categories**: ${expenseCategories.join(", ")}.`,
    `   - **Income Categories**: ${incomeCategories.join(", ")}.`,
    "- **Fallback**: If unrecognizable, choose the closest generic category from the provided lists (for example an 'other'/'misc' style expense category or a generic income category). Never invent category names that are not present in the provided lists.",
    "- For money received from relatives or friends, choose the closest gift/transfer-like income category from the provided list. For salary/payroll, choose the closest salary-like income category. For card/bank returns, choose the closest refund/return-like category from the list.",

    "### 3. CURRENCY & DATE",
    "- Detect explicit currency symbol/code; else use Caller Currency.",
    "- If text clearly indicates a different currency, use that currency (no conversion).",
    "- Date parsing: Look for ANY date reference (absolute or relative like 'yesterday').",
    "- Convert relative dates to YYYY-MM-DD based on Caller Date.",
    "- Only use Caller Date if NO date is mentioned.",
    "- **Amount policy**: Always return amounts as positive numbers (no minus signs). A negative or red value in the source indicates 'expense' vs 'income' type, not a negative amount.",

    "### 4. DESCRIPTION & LANGUAGE",
    "- Write natural, conversational notes generally matching the user's intent.",
    `   - **CRITICAL**: All free-text fields (especially description) must be strictly in ${language}, even if the input is in another language.`,

    ...(householdContext
      ? [
        "### 5. HOUSEHOLD SPLITS (when household context is provided)",
        "- The caller is currently in a household/group context and wants split-aware logging.",
        "- **payerUserId**:",
        "  - If user says who paid (e.g., 'paid by B'), set payerUserId to that member's userId.",
        "  - If not mentioned, omit payerUserId (backend defaults to the caller).",
        "  - Use ONLY the userId from the provided member list. Do NOT output names/emails.",
        "- **customSplits**:",
        "  - If user describes a split (amounts/percent/shares), set customSplits accordingly.",
        "  - If user does NOT describe a split, OMIT customSplits entirely (backend defaults to equal split across all household members).",
        "  - When returning customSplits, ALWAYS include ALL household members exactly once in memberSplits.",
        "  - If the user provides splits for only some members, distribute the remaining portion equally among the unspecified members.",
        "  - If the user mentions a member by name/email/alias, map it to the matching userId from the member list.",
        "  - If the user says 'paid by X' or 'X paid', you MUST set payerUserId.",
        "  - If the user says 'split 15 for him/her/them', treat the pronoun as the last named member (often the payer).",
        "  - Example: '20 dinner, paid by Charles, split 15 for him' => payerUserId=Charles userId, customSplits splitType=amount with Charles=15 and remaining split across other members.",
      ]
      : []),

    "FINAL RULE: Under no circumstances output plain text or JSON. Always and only respond by calling add_transactions.",
  ].join("\n");
}

export function resolveHouseholdContext(
  body: AnalyzeRequestBody,
  callerUserId: string,
) {
  if (body.isPortfolio) return null;
  const members = Array.isArray(body.householdMembers)
    ? body.householdMembers
    : [];
  const sanitized = members
    .map((m) => ({
      userId: sanitizeUuid(m.userId) || "",
      userName: (m.userName || null) as string | null,
      userEmail: (m.userEmail || null) as string | null,
    }))
    .filter((m) => m.userId.length > 0);

  if (!sanitized.length) return null;

  const memberIds = new Set(sanitized.map((m) => m.userId));
  // If the caller is not in the list (unexpected), still allow splits to resolve.
  memberIds.add(callerUserId);

  const { aliasLookup, aliasesByUserId } = buildAliasIndex(
    sanitized,
    callerUserId,
  );

  return {
    callerUserId,
    members: sanitized,
    memberIds,
    aliasLookup,
    aliasesByUserId,
  };
}

function normalizeMemberLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/[^\p{L}\p{N}@. ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addAlias(
  aliasToIds: Map<string, Set<string>>,
  alias: string | null | undefined,
  userId: string,
) {
  if (!alias) return;
  const normalized = normalizeMemberLabel(alias);
  if (!normalized) return;
  const existing = aliasToIds.get(normalized) ?? new Set<string>();
  existing.add(userId);
  aliasToIds.set(normalized, existing);
}

function collectAliasesForMember(member: HouseholdMemberContext): string[] {
  const aliases = new Set<string>();
  const name = (member.userName || "").trim();
  const email = (member.userEmail || "").trim();

  if (name) {
    aliases.add(name);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      aliases.add(parts[0]);
      aliases.add(parts[parts.length - 1]);
    }
  }

  if (email) {
    aliases.add(email);
    const local = email.split("@")[0]?.trim();
    if (local) aliases.add(local);
  }

  return Array.from(aliases);
}

function buildAliasIndex(
  members: HouseholdMemberContext[],
  callerUserId: string,
) {
  const aliasToIds = new Map<string, Set<string>>();
  const aliasesByUserId = new Map<string, string[]>();

  for (const member of members) {
    const aliases = collectAliasesForMember(member);
    const normalizedAliases = aliases
      .map((alias) => normalizeMemberLabel(alias))
      .filter(Boolean);
    if (normalizedAliases.length > 0) {
      aliasesByUserId.set(member.userId, normalizedAliases);
    }
    for (const alias of normalizedAliases) {
      addAlias(aliasToIds, alias, member.userId);
    }
  }

  // Caller pronoun aliases.
  const callerAliases = ["me", "myself", "i", "my", "mine"];
  for (const alias of callerAliases) {
    addAlias(aliasToIds, alias, callerUserId);
  }

  const aliasLookup = new Map<string, string>();
  for (const [alias, ids] of aliasToIds.entries()) {
    if (ids.size === 1) {
      aliasLookup.set(alias, Array.from(ids)[0]);
    }
  }

  return { aliasLookup, aliasesByUserId };
}

function buildHouseholdContextPrompt(ctx: NonNullable<ReturnType<typeof resolveHouseholdContext>>) {
  const lines = ctx.members.map((m) => {
    const label = (m.userName || m.userEmail || "member").toString().trim() || "member";
    const aliases = ctx.aliasesByUserId.get(m.userId) ?? [];
    const aliasHint = aliases.length > 0 ? ` (aliases: ${aliases.join(", ")})` : "";
    return `- ${label}${aliasHint}: ${m.userId}`;
  });
  return [
    `Caller UserId: ${ctx.callerUserId}`,
    "Caller Aliases: me, myself, i, my, mine",
    "Caller Household Members (name/email/alias -> userId):",
    ...lines,
  ].join("\n");
}

function resolveMemberAlias(
  raw: string,
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
): string | undefined {
  if (!ctx) return undefined;
  const normalized = normalizeMemberLabel(raw);
  if (!normalized) return undefined;
  return ctx.aliasLookup.get(normalized);
}

function normalizePayerUserId(
  raw: unknown,
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
): string | undefined {
  if (!ctx) return undefined;
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return undefined;
  const sanitized = sanitizeUuid(value);
  if (sanitized && ctx.memberIds.has(sanitized)) return sanitized;
  const aliasResolved = resolveMemberAlias(value, ctx);
  if (aliasResolved && ctx.memberIds.has(aliasResolved)) return aliasResolved;
  return undefined;
}

function resolveMemberUserId(
  raw: string,
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
): string | null {
  if (!ctx) return null;
  const sanitized = sanitizeUuid(raw);
  if (sanitized && ctx.memberIds.has(sanitized)) return sanitized;
  const aliasResolved = resolveMemberAlias(raw, ctx);
  if (aliasResolved && ctx.memberIds.has(aliasResolved)) return aliasResolved;
  return null;
}

function resolveMemberFromFragment(
  fragment: string,
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
): string | undefined {
  if (!ctx) return undefined;
  const normalized = normalizeMemberLabel(fragment);
  if (!normalized) return undefined;
  const direct = resolveMemberAlias(normalized, ctx);
  if (direct) return direct;

  const parts = normalized.split(/\s+|,|&/g).filter(Boolean);
  for (const part of parts) {
    const match = resolveMemberAlias(part, ctx);
    if (match) return match;
  }
  return undefined;
}

function resolvePronounUserId(
  raw: string,
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
  payerUserId?: string,
  lastMentionedUserId?: string,
): string | undefined {
  if (!ctx) return undefined;
  const normalized = normalizeMemberLabel(raw);
  if (!normalized) return undefined;
  if (["me", "myself", "i", "my", "mine"].includes(normalized)) {
    return ctx.callerUserId;
  }
  if (["him", "her", "them", "they", "he", "she", "their", "his", "hers"].includes(normalized)) {
    return payerUserId || lastMentionedUserId || ctx.callerUserId;
  }
  return undefined;
}

export function inferPayerFromText(
  text: string,
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
): string | undefined {
  if (!ctx) return undefined;
  const patterns = [
    /paid\s+by\s+([^.,;]+)/i,
    /payer\s*[:=]\s*([^.,;]+)/i,
    /([^.,;]+)\s+paid\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match || !match[1]) continue;
    const candidate = resolveMemberFromFragment(match[1], ctx);
    if (candidate) return candidate;
  }
  return undefined;
}

export function inferSplitAmountsFromText(
  text: string,
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
  payerUserId?: string,
): CustomSplits | undefined {
  if (!ctx) return undefined;
  const regex =
    /(\d+(?:\.\d+)?)\s*(?:for|to)\s+(.+?)(?=(?:\s*(?:,|;)\s*\d)|(?:\s+\b(?:and|&)\b\s*\d)|$)/giu;
  const rawMap = new Map<string, number>();
  let match: RegExpExecArray | null;
  let lastMentionedUserId: string | undefined;

  while ((match = regex.exec(text)) !== null) {
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    let rawName = match[2]?.trim() ?? "";
    rawName = rawName
      .replace(/^[\s,;]+/, "")
      .replace(/[\s,;]+$/, "")
      .replace(/\s+(?:and|&)\s*$/i, "")
      .trim();
    if (!rawName) continue;
    const pronounMatch = resolvePronounUserId(
      rawName,
      ctx,
      payerUserId,
      lastMentionedUserId,
    );
    const resolved = pronounMatch ?? resolveMemberFromFragment(rawName, ctx);
    if (!resolved) continue;
    lastMentionedUserId = resolved;
    rawMap.set(resolved, (rawMap.get(resolved) ?? 0) + amount);
  }

  if (rawMap.size === 0) return undefined;

  return {
    splitType: "amount",
    memberSplits: Array.from(rawMap.entries()).map(([userId, amount]) => ({
      userId,
      amount,
    })),
  };
}

export function normalizeCustomSplits(
  raw: unknown,
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
  totalAmount: number,
): CustomSplits | undefined {
  if (!ctx) return undefined;
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const splitType = String(obj.splitType || "").trim().toLowerCase();
  if (!splitType || splitType === "equal") return undefined;
  if (!["amount", "percentage", "shares"].includes(splitType)) return undefined;

  const rawMemberSplits = Array.isArray(obj.memberSplits) ? obj.memberSplits : [];
  const byUserId = new Map<string, MemberSplit>();
  for (const s of rawMemberSplits) {
    if (!s || typeof s !== "object") continue;
    const rec = s as Record<string, unknown>;
    const rawUserId = typeof rec.userId === "string" ? rec.userId.trim() : "";
    const resolvedId = resolveMemberUserId(rawUserId, ctx);
    if (!resolvedId) continue;
    byUserId.set(resolvedId, {
      userId: resolvedId,
      amount: typeof rec.amount === "number" ? rec.amount : undefined,
      percentage: typeof rec.percentage === "number" ? rec.percentage : undefined,
      shares: typeof rec.shares === "number" ? Math.trunc(rec.shares) : undefined,
    });
  }

  const memberIds = ctx.members.map((m) => m.userId);
  const full: MemberSplit[] = [];

  if (splitType === "amount") {
    const safeTotal = Number.isFinite(totalAmount) ? Math.max(0, totalAmount) : 0;
    let specifiedSum = 0;
    const missing: string[] = [];
    for (const id of memberIds) {
      const existing = byUserId.get(id);
      const amt = existing?.amount;
      if (typeof amt === "number" && Number.isFinite(amt) && amt >= 0) {
        specifiedSum += amt;
      } else {
        missing.push(id);
      }
    }

    const remaining = Math.max(0, safeTotal - specifiedSum);
    const perMissing = missing.length > 0 ? remaining / missing.length : 0;

    for (const id of memberIds) {
      const existing = byUserId.get(id);
      let amount = existing?.amount;
      if (!(typeof amount === "number" && Number.isFinite(amount) && amount >= 0)) {
        amount = perMissing;
      }
      full.push({ userId: id, amount });
    }

    // Remainder-safe adjustment to exactly match total.
    const sum = full.reduce((acc, s) => acc + (s.amount || 0), 0);
    const diff = safeTotal - sum;
    if (full.length > 0 && Math.abs(diff) > 1e-6) {
      const last = full[full.length - 1];
      last.amount = Math.max(0, (last.amount || 0) + diff);
    }
  } else if (splitType === "percentage") {
    let specifiedSum = 0;
    const missing: string[] = [];
    for (const id of memberIds) {
      const existing = byUserId.get(id);
      const pct = existing?.percentage;
      if (typeof pct === "number" && Number.isFinite(pct) && pct >= 0) {
        specifiedSum += pct;
      } else {
        missing.push(id);
      }
    }

    const remaining = Math.max(0, 100 - specifiedSum);
    const perMissing = missing.length > 0 ? remaining / missing.length : 0;

    for (const id of memberIds) {
      const existing = byUserId.get(id);
      let percentage = existing?.percentage;
      if (!(typeof percentage === "number" && Number.isFinite(percentage) && percentage >= 0)) {
        percentage = perMissing;
      }
      full.push({ userId: id, percentage });
    }

    const sum = full.reduce((acc, s) => acc + (s.percentage || 0), 0);
    const diff = 100 - sum;
    if (full.length > 0 && Math.abs(diff) > 1e-6) {
      const last = full[full.length - 1];
      last.percentage = Math.max(0, (last.percentage || 0) + diff);
    }
  } else if (splitType === "shares") {
    for (const id of memberIds) {
      const existing = byUserId.get(id);
      const shares = existing?.shares;
      const safeShares = typeof shares === "number" && Number.isFinite(shares) && shares > 0
        ? Math.trunc(shares)
        : 1;
      full.push({ userId: id, shares: safeShares });
    }
  }

  return {
    splitType: splitType as CustomSplits["splitType"],
    memberSplits: full,
  };
}

async function analyzeFromText(
  genAI: GoogleGenerativeAI,
  callerCurrency: string,
  callerDate: string,
  language: string,
  bodyText: string,
  tools: any,
  expenseCategories: string[],
  incomeCategories: string[],
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
): Promise<ExpenseItem[]> {
  let items: ExpenseItem[] = [];

  const systemInstruction = buildTransactionSystemInstruction(
    language,
    expenseCategories,
    incomeCategories,
    householdContext,
  );
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    tools,
    systemInstruction,
  });
  const householdPrompt = householdContext
    ? `\n${buildHouseholdContextPrompt(householdContext)}\n`
    : "\n";
  
  const response = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{
        text:
          `Caller Currency: ${callerCurrency}\n` +
          `Caller Date: ${callerDate}` +
          householdPrompt +
          `User: ${bodyText}`,
      }],
    }],
    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    generationConfig: { maxOutputTokens: 4096 },
  } as any);

  const tool = getFirstFunctionCall(response);
  if (tool && tool.name === "add_transactions") {
    const rawItems: any[] = Array.isArray(tool.args?.items) ? tool.args.items : [];
    items = rawItems
      .map((it) => {
        const itemCurrency = it.currency || callerCurrency;
        const rawCategory = it.category || "other";
        const normalizedCategory = normalizeCategory(rawCategory);

        // Debug: Log category and amount
        console.log(`[analyze-expense] Text raw: amount=${it.amount}, category="${rawCategory}" -> "${normalizedCategory}"`);

        const txType = String(it.type || "").toLowerCase();
        const resolvedType = txType === "income" || txType === "expense" ? txType : undefined;
        const amount = Math.abs(Number(it.amount));
        // Use correct symbol for the detected currency
        const itemCurrencySymbol = getCurrencySymbol(itemCurrency);

        let payerUserId =
          resolvedType === "expense" ? normalizePayerUserId(it.payerUserId, householdContext) : undefined;
        let customSplits =
          resolvedType === "expense" ? normalizeCustomSplits(it.customSplits, householdContext, amount) : undefined;

        if (resolvedType === "expense" && householdContext) {
          if (!payerUserId) {
            payerUserId = inferPayerFromText(bodyText, householdContext);
          }
          if (!customSplits) {
            const inferredSplits = inferSplitAmountsFromText(
              bodyText,
              householdContext,
              payerUserId,
            );
            customSplits = normalizeCustomSplits(inferredSplits, householdContext, amount);
          }
        }

        return {
          type: resolvedType,
          amount,
          category: normalizedCategory,
          currency: itemCurrency,
          currencySymbol: itemCurrencySymbol,
          date: it.date || callerDate,
          description: it.description || bodyText,
          payerUserId,
          customSplits,
        } as ExpenseItem;
      })
      .filter((it) => {
        const isValid =
          it.type &&
          (it.type === "income" || it.type === "expense") &&
          Number.isFinite(it.amount) &&
          it.amount > 0 &&
          typeof it.category === "string" &&
          typeof it.currency === "string" &&
          typeof it.currencySymbol === "string" &&
          typeof it.date === "string";
        
        if (!isValid) console.log(`[analyze-expense] Text filtered invalid: ${JSON.stringify(it)}`);
        return isValid;
      });

    if (items.length > 1) {
      const withoutTotals = items.filter((it) => !isTotalLike(it.description));
      if (withoutTotals.length > 0) items = withoutTotals;
      const sums = items.map((_, i) =>
        items
          .filter((__, j) => i !== j)
          .reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0),
      );
      items = items.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);
    }
  }

  return items;
}

async function analyzeFromAudio(
  genAI: GoogleGenerativeAI,
  callerCurrency: string,
  callerDate: string,
  language: string,
  base64Audio: string,
  contentType: string,
  tools: any,
  expenseCategories: string[],
  incomeCategories: string[],
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
): Promise<ExpenseItem[]> {
  let items: ExpenseItem[] = [];

  const systemInstruction = buildTransactionSystemInstruction(
    language,
    expenseCategories,
    incomeCategories,
    householdContext,
  );
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    tools,
    systemInstruction,
  });
  const householdPrompt = householdContext
    ? `\n${buildHouseholdContextPrompt(householdContext)}\n`
    : "\n";

  const response = await model.generateContent({
    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `Caller Currency: ${callerCurrency}\n` +
              `Caller Date: ${callerDate}` +
              householdPrompt +
              "The following is an audio description of one or more transactions. Analyze it and return the structured transactions by calling add_transactions.",
          },
          {
            inlineData: {
              mimeType: contentType || "audio/mp3",
              data: base64Audio,
            },
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 4096 },
  } as any);

  const tool = getFirstFunctionCall(response);
  if (tool && tool.name === "add_transactions") {
    const rawItems: any[] = Array.isArray(tool.args?.items) ? tool.args.items : [];
    items = rawItems
      .map((it) => {
        const itemCurrency = it.currency || callerCurrency;
        const rawCategory = it.category || "other";
        const normalizedCategory = normalizeCategory(rawCategory);

        console.log(
          `[analyze-expense] Audio raw: amount=${it.amount}, category="${rawCategory}" -> "${normalizedCategory}"`,
        );

        const txType = String(it.type || "").toLowerCase();
        const resolvedType = txType === "income" || txType === "expense" ? txType : undefined;
        const amount = Math.abs(Number(it.amount));
        const itemCurrencySymbol = getCurrencySymbol(itemCurrency);

        const payerUserId =
          resolvedType === "expense" ? normalizePayerUserId(it.payerUserId, householdContext) : undefined;
        const customSplits =
          resolvedType === "expense" ? normalizeCustomSplits(it.customSplits, householdContext, amount) : undefined;

        return {
          type: resolvedType,
          amount,
          category: normalizedCategory,
          currency: itemCurrency,
          currencySymbol: itemCurrencySymbol,
          date: it.date || callerDate,
          description: it.description || "",
          payerUserId,
          customSplits,
        } as ExpenseItem;
      })
      .filter((it) => {
        const isValid =
          it.type &&
          (it.type === "income" || it.type === "expense") &&
          Number.isFinite(it.amount) &&
          it.amount > 0 &&
          typeof it.category === "string" &&
          typeof it.currency === "string" &&
          typeof it.currencySymbol === "string" &&
          typeof it.date === "string";
        
        if (!isValid) console.log(`[analyze-expense] Audio filtered invalid: ${JSON.stringify(it)}`);
        return isValid;
      });

    if (items.length > 1) {
      const withoutTotals = items.filter((it) => !isTotalLike(it.description));
      if (withoutTotals.length > 0) items = withoutTotals;
      const sums = items.map((_, i) =>
        items
          .filter((__, j) => i !== j)
          .reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0),
      );
      items = items.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);
    }
  }

  return items;
}

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function normalizeLanguage(input?: string | null): string {
  const raw = (input || "").trim();
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(raw) ? raw : "en";
}

function isTotalLike(s?: string) {
  return !!s && /(sub\s*total|subtotal|grand\s*total|total)/i.test(s);
}

async function attemptAnalysis(
  genAI: GoogleGenerativeAI,
  modelName: string,
  systemInstruction: string,
  body: AnalyzeRequestBody,
  base64Image: string,
  callerCurrency: string,
  callerDate: string,
  tools: any,
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
  timeoutMs: number = 30000,
  overrideContentType?: string
): Promise<{ success: boolean; items?: ExpenseItem[]; error?: string }> {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(`Model ${modelName} timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      tools,
      systemInstruction,
    });
    
    const responsePromise = model.generateContent({
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
      contents: [{
        role: "user",
        parts: [
          { text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nExtract transaction details from this image (receipt, bank statement, or transaction notification):` },
          {
            inlineData: {
              mimeType: overrideContentType || body.image?.contentType || "image/jpeg",
              data: base64Image,
            },
          },
        ],
      }],
      generationConfig: { maxOutputTokens: 4096 },
    } as any);

    const response = await Promise.race([responsePromise, timeoutPromise]);
    
    const tool = getFirstFunctionCall(response);
    if (tool && tool.name === "add_transactions") {
      const rawItems: any[] = Array.isArray(tool.args?.items) ? tool.args.items : [];
      const tempItems = rawItems
        .map((it) => {
          const itemCurrency = it.currency || callerCurrency;
          const rawCategory = it.category || "other";
          const normalizedCategory = normalizeCategory(rawCategory);

          // Debug: Log category and amount
          console.log(
            `[analyze-expense] Item raw: amount=${it.amount}, category="${rawCategory}" -> "${normalizedCategory}"`,
          );

          const txType = String(it.type || "").toLowerCase();
          const resolvedType = txType === "income" || txType === "expense" ? txType : undefined;
          const amount = Math.abs(Number(it.amount));

          // Use correct symbol for the detected currency
          const itemCurrencySymbol = getCurrencySymbol(itemCurrency);

          const payerUserId =
            resolvedType === "expense" ? normalizePayerUserId(it.payerUserId, householdContext) : undefined;
          const customSplits =
            resolvedType === "expense" ? normalizeCustomSplits(it.customSplits, householdContext, amount) : undefined;

          return {
            type: resolvedType,
            amount,
            category: normalizedCategory,
            currency: itemCurrency,
            currencySymbol: itemCurrencySymbol,
            date: it.date || callerDate,
            description: it.description || "",
            payerUserId,
            customSplits,
          };
        })
        .filter((it) => {
          const isValid =
            it.type &&
            (it.type === "income" || it.type === "expense") &&
            Number.isFinite(it.amount) &&
            typeof it.category === "string" &&
            typeof it.currency === "string" &&
            typeof it.currencySymbol === "string" &&
            typeof it.date === "string";

          if (!isValid) console.log(`[analyze-expense] Filtered invalid item: ${JSON.stringify(it)}`);
          return isValid;
        }) as ExpenseItem[];

      let items = tempItems;
      if (items.length > 1) {
        const withoutTotals = items.filter((it) => !isTotalLike(it.description));
        if (withoutTotals.length > 0) items = withoutTotals;
        // Basic dedup check for sums (logic kept from original)
        const sums = items.map((_, i) =>
          items
            .filter((__, j) => i !== j)
            .reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0),
        );
        items = items.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);
      }

      if (items.length > 0) {
        return { success: true, items };
      }
    }

    const candidate = response.response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const safetyRatings = candidate?.safetyRatings;
    
    // Fallback: If no tool call, see if there's text (for debugging)
    let modelText = "";
    try {
      modelText = response.response.text();
    } catch (e) {
      // ignore
    }
    
    console.log(`[analyze-expense] No valid tool call found.`);
    console.log(`[analyze-expense] FinishReason: ${finishReason}`);
    console.log(`[analyze-expense] SafetyRatings: ${JSON.stringify(safetyRatings)}`);
    console.log(`[analyze-expense] Candidate Parts Count: ${candidate?.content?.parts?.length || 0}`);
    console.log(`[analyze-expense] Model output text preview: ${JSON.stringify(modelText.slice(0, 200))}`);
    
    return { success: false, error: `Moneko AI could not extract valid transactions` };
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      throw error; // Re-throw timeout errors
    }
    return { success: false, error: `${modelName} failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function runAnalyzeExpense(
  body: AnalyzeRequestBody,
  geminiApiKey: string
): Promise<AnalyzeResult> {
  try {
    let userId = sanitizeUuid(body.userId ?? null);
    if (body.userId && !userId) {
      return { success: false, error: "Invalid userId format", status: 400, language: "en" };
    }
    if (!userId) {
      return { success: false, error: "userId is required", status: 400, language: "en" };
    }

    const hasText = typeof body.text === "string" && body.text.trim().length > 0;
    const hasImage = !!body.image;
    const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;
    const hasAudio = !!body.audio;

    const modes = [hasText, hasImage, hasAttachments, hasAudio].filter(Boolean).length;
    if (modes === 0) {
      return {
        success: false,
        error: "Must provide text, image, attachments, or audio",
        status: 400,
        language: "en",
      };
    }

    if (modes > 1) {
      return {
        success: false,
        error: "Cannot process multiple input types simultaneously",
        status: 400,
        language: "en",
      };
    }

    const callerCurrency = validateCurrency(body.currency);
    const callerDate = body.date || new Date().toISOString().slice(0, 10);
    const language = normalizeLanguage(body.language);
    const householdContext = resolveHouseholdContext(body, userId);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const expenseCategories = getExpenseCategories();
    const incomeCategories = getIncomeCategories();
    
    // Debug: Log categories being passed to AI
    console.log(`[analyze-expense] Expense categories count: ${expenseCategories.length}`);
    console.log(`[analyze-expense] Income categories count: ${incomeCategories.length}`);
    console.log(`[analyze-expense] Expense categories include 'food': ${expenseCategories.includes('food')}`);
    console.log(`[analyze-expense] Expense categories include 'food & drinks': ${expenseCategories.includes('food & drinks')}`);
    
    let lastError = "";

    const tools = [{
      functionDeclarations: [
        {
          name: "add_transactions",
          description: "Extract structured transactions (income or expense).",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                description: "One or more transactions parsed.",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["expense", "income"], description: "Transaction type" },
                    amount: { type: "number", description: "Positive amount." },
                    category: { 
                      type: "string", 
                      description: "Canonical category from provided list."
                    },
                    currency: { type: "string", description: "ISO 4217 code." },
                    date: { type: "string", description: "YYYY-MM-DD." },
                    description: { type: "string", description: "Very short note (e.g. 'Coffee', 'Taxi')." },
                    payerUserId: { type: "string", description: "Household only: userId of who paid (if specified)." },
                    customSplits: {
                      type: "object",
                      description: "Household only: split configuration. Omit entirely for equal split.",
                      properties: {
                        splitType: { type: "string", enum: ["equal", "amount", "percentage", "shares"] },
                        memberSplits: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              userId: { type: "string" },
                              amount: { type: "number" },
                              percentage: { type: "number" },
                              shares: { type: "number" },
                            },
                            required: ["userId"],
                          },
                        },
                      },
                      required: ["splitType", "memberSplits"],
                    },
                  },
                  required: ["type", "amount", "category"],
                },
              },
            },
            required: ["items"],
          },
        },
      ],
    }];

    let items: ExpenseItem[] = [];

    if (hasAttachments) {
      const att = body.attachments![0];
      const filename = att.filename || "";
      const contentType = att.contentType || "";
      const lowerName = filename.toLowerCase();

      const cleaned = att.data.replace(/^data:.*;base64,/, "");
      const binaryString = atob(cleaned);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const textLike =
        /^(text\/|application\/(json|csv|xml|javascript))/i.test(contentType) ||
        /\.(csv|txt|json|xml)$/i.test(lowerName);
      const isXlsx =
        /spreadsheetml|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i.test(contentType) ||
        /\.xlsx$/i.test(lowerName);
      const isPdf = /application\/pdf/i.test(contentType) || /\.pdf$/i.test(lowerName);

      let syntheticText = "";

      if (textLike) {
        try {
          syntheticText = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 16000));
        } catch {
          syntheticText = "";
        }
      } else if (isXlsx) {
        syntheticText = buildXlsxPreview(bytes) || "";
      } else if (isPdf) {
        const base64Data = b64encode(bytes);
        const summary = await summarizePdfWithGemini(base64Data, "application/pdf", geminiApiKey);
        syntheticText = summary || "";
      }

      if (!syntheticText.trim()) {
        return {
          success: false,
          error: "Unsupported or unreadable attachment format",
          status: 400,
          language,
        };
      }

      items = await analyzeFromText(
        genAI,
        callerCurrency,
        callerDate,
        language,
        syntheticText,
        tools,
        expenseCategories,
        incomeCategories,
        householdContext,
      );
    } else if (hasText) {
      items = await analyzeFromText(
        genAI,
        callerCurrency,
        callerDate,
        language,
        body.text!,
        tools,
        expenseCategories,
        incomeCategories,
        householdContext,
      );
    } else if (hasAudio) {
      const audio = body.audio!;
      if (!audio.contentType || !audio.contentType.startsWith("audio/")) {
        return { success: false, error: "Invalid audio content type", status: 400, language };
      }

      let bytes: Uint8Array;
      if (audio.bytes instanceof Uint8Array) {
        bytes = audio.bytes;
      } else {
        const base64Data = audio.data.replace(/^data:audio\/\w+;base64,/, "");
        const binaryString = atob(base64Data);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      }

      if (bytes.length > 20 * 1024 * 1024) {
        return { success: false, error: "Audio too large. Maximum 20MB", status: 400, language };
      }
      const base64Audio = b64encode(bytes);

      items = await analyzeFromAudio(
        genAI,
        callerCurrency,
        callerDate,
        language,
        base64Audio,
        audio.contentType,
        tools,
        expenseCategories,
        incomeCategories,
        householdContext,
      );
    } else if (hasImage) {
      const image = body.image!;
      if (!image.contentType || !image.contentType.startsWith("image/")) {
        return { success: false, error: "Invalid image content type", status: 400, language };
      }
      let base64Image = "";
      let finalContentType = image.contentType;
      
      if (image.bytes instanceof Uint8Array) {
        if (image.bytes.length > 10 * 1024 * 1024) {
          return { success: false, error: "Image too large. Maximum 10MB", status: 400, language };
        }
        base64Image = b64encode(image.bytes);
      } else {
        // Strip the data URI prefix if present
        base64Image = image.data.replace(/^data:image\/\w+;base64,/, "");
        // Strict cleaning of whitespace/newlines which can corrupt JSON transport or some base64 decoders
        base64Image = base64Image.replace(/[\r\n\s]/g, "");
        
        // Approximate size check (base64 string length * 0.75 ~= byte size)
        const approxBytes = base64Image.length * 0.75;
        if (approxBytes > 10 * 1024 * 1024) {
          return { success: false, error: "Image too large. Maximum 10MB", status: 400, language };
        }
      }

      // Normalize common mime type variations for Gemini
      if (finalContentType === 'image/jpg') finalContentType = 'image/jpeg';
      
      console.log(`[analyze-expense] Image Prep: contentType=${finalContentType} (orig=${image.contentType}), length=${base64Image.length}`);
      console.log(`[analyze-expense] Base64 Start: ${base64Image.slice(0, 20)}...`);
      console.log(`[analyze-expense] Base64 End: ...${base64Image.slice(-20)}`);

      const systemInstruction = [
        "You are an expert Financial OCR Analyst for Moneko.",
        "OBJECTIVE: Analyze the image to extract transaction data. Minimize noise, maximize accuracy.",
        "OUTPUT: Call `add_transactions` with the extracted items. Under no circumstances output plain text or JSON.",

        "### 0. LAYOUT DETECTION & STRATEGY",
        "- **CASE A: MULTIPLE ITEMS (App List, Bank Feed)**: If the image shows a LIST of multiple distinct payments (rows) or a payment history:",
        "   - **Action**: Extract every visible transaction row as a separate item.",
        "   - **Ignore**: Daily/monthly headers ('Today', 'October'), running balances, or nav bars.",
        "   - **Context**: Apps like AliPay, WeChat, PayPal, Banking Apps often show lists. Capture ALL rows.",
        "",
        "- **CASE B: SINGLE RECEIPT/TOTAL**: If the image is a physical receipt or bill with items summing to a total:",
        "   - **Action**: Return **ONE** transaction for the Grand Total.",
        "   - **Note**: Do NOT list the milk/eggs separately. Just the total.",
        "",
        "- **CASE C: SINGLE NOTIFICATION/DETAIL**: If and ONLY IF the image shows a single success screen or notification:",
        "   - **Action**: Return exactly ONE transaction.",

        "### 1. DATA EXTRACTION RULES",
        "- **Bank Feed / App History**: For list views, extract Date, Merchant (Title), and Amount for each row.",
        "- **Ambiguity**: If unsure if it's a list or detail view, prefer extracting multiple items if they look like distinct transactions.",
        "- **Amount policy**: Always return amounts as positive numbers (no minus signs). Negative or red values in the UI indicate 'expense' vs 'income' type, not a negative amount.",

        "### 2. CLASSIFICATION (Type & Category)",
        "- **Type**: 'expense' vs 'income'.",
        "   - Visual Cues: Red/- = Expense. Green/+ = Income.",
        "   - Text Cues: 'Credit', 'Deposit', 'Refund', 'Top up' -> Income. 'Debit', 'Purchase', 'Payment', 'Sent to' -> Expense.",
        `   - **Expense Categories**: ${expenseCategories.join(", ")}.`,
        `   - **Income Categories**: ${incomeCategories.join(", ")}.`,
        "- **Fallback**: If unrecognizable, choose the closest generic category from the provided lists (for example an 'other'/'misc' style expense category or a generic income category). Never invent category names that are not present in the provided lists.",
        "- For money received from relatives or friends, choose the closest gift/transfer-like income category from the provided list. For salary/payroll, choose the closest salary-like income category. For card/bank returns, choose the closest refund/return-like category from the list.",

        "### 3. DATA REFINEMENT",
        "- **Merchant**: Clean up raw text (e.g., 'Uber *Trip 4920' -> 'Uber').",
        "- **Date**: Parse absolute dates or relative ('Yesterday'). Default to Caller Date if not found.",
        "- **Currency**: Trust symbol in image ($/€/£) over Caller Currency. Defaults to Caller Currency.",
        "- **Noise**: Ignore loyalty points, barcodes, IDs, tax numbers unless needed for context.",
        
        "### 4. DESCRIPTION & LANGUAGE",
        "- Create a natural, short conclusion of the image.",
        "- Pattern: '[Merchant] [Short Summary of Items]'",
        `   - **CRITICAL**: All free-text fields (especially description) must be strictly in ${language}, even if the input is in another language.`,

        "FINAL RULE: Under no circumstances output plain text or JSON. Always and only respond by calling add_transactions.",
      ].join("\n");

      // Model progression: fast model first, then more capable one as fallback
      // Timeouts increased to allow for parsing long transaction lists
      const modelAttempts = [
        { name: "gemini-3-flash-preview", timeout: 30000 },
        { name: "gemini-3-pro-preview", timeout: 55000 },
      ];

      // Removed shadowing variables
      // let lastError = "";
      // let items: ExpenseItem[] = [];

      for (const { name, timeout } of modelAttempts) {
        console.log(`[analyze-expense] Attempting with model: ${name}`);
        
        try {
          const result = await attemptAnalysis(
            genAI,
            name,
            systemInstruction,
            body,
            base64Image,
            callerCurrency,
            callerDate,
            tools,
            householdContext,
            30000,
            finalContentType
          );

          if (result.success && result.items && result.items.length > 0) {
            console.log(`[analyze-expense] Success with ${name}: extracted ${result.items.length} items`);
            items = result.items;
            break;
          } else {
            lastError = result.error || `${name} returned no items`;
            console.log(`[analyze-expense] ${name} failed: ${lastError}`);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('timed out')) {
            lastError = error.message;
            console.log(`[analyze-expense] ${name} timed out after ${timeout}ms`);
          } else {
            lastError = error instanceof Error ? error.message : String(error);
            console.log(`[analyze-expense] ${name} error: ${lastError}`);
          }
        }
      }

      if (!items.length) {
        console.log("[analyze-expense] No items from standard image prompts, trying handwriting-focused fallback");
        const handwritingInstruction = [
          "You are an expert Financial OCR Analyst for Moneko.",
          "OBJECTIVE: The image is likely a handwritten list of expenses or income on paper.",
          "OUTPUT: Call `add_transactions` with the extracted items. Under no circumstances output plain text or JSON.",
          "",
          "### HANDWRITTEN LIST PATTERN",
          "- Treat each readable line that looks like \"<label> <amount>\" (e.g. \"gym $45\", \"grocery $120\") as a separate transaction.",
          "- Prioritize darker, thicker handwriting lines over faint background print or noise.",
          "- If you can reasonably infer a transaction from partial handwriting, include it with best-effort classification.",
        ].join("\n");

        try {
          const fallback = await attemptAnalysis(
            genAI,
            "gemini-3-flash-preview",
            handwritingInstruction,
            body,
            base64Image,
            callerCurrency,
            callerDate,
            tools,
            householdContext,
            8000,
          );

          if (fallback.success && fallback.items && fallback.items.length > 0) {
            console.log(`[analyze-expense] Handwriting fallback succeeded: extracted ${fallback.items.length} items`);
            items = fallback.items;
          } else {
            lastError = fallback.error || lastError || "Handwriting fallback returned no items";
            console.log("[analyze-expense] Handwriting fallback failed:", lastError);
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          lastError = msg || lastError;
          console.log("[analyze-expense] Handwriting fallback error:", msg);
        }
      }
    }

    if (items.length === 0) {
      console.log("[analyze-expense] All models failed to extract items");
      return { 
        success: false, 
        error: lastError || "Could not extract transaction information. Please try clearer text, a screenshot, or a photo.", 
        status: 400, 
        language 
      };
    }

    return {
      success: true,
      items,
      language,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      status: 500,
      language: "en",
    };
  }
}

export function buildXlsxPreview(buf: Uint8Array): string | null {
  try {
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return null;
    const sheet = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const limited = rows.slice(0, 20).map((r) => (Array.isArray(r) ? r.slice(0, 8) : r));
    const previewLines = limited.map((r: any) => JSON.stringify(r));
    return `Sheet "${sheetName}" preview (first ${limited.length} rows):\n${previewLines.join("\n")}`;
  } catch (e) {
    console.error("XLSX parse error", e);
    return null;
  }
}

export async function summarizePdfWithGemini(
  base64Data: string,
  mimeType: string,
  geminiKey: string,
): Promise<string | null> {
  try {
    const ai = new GoogleGenerativeAI(geminiKey);
    const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const resp = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: "Summarize this PDF. Extract key amounts, dates, and any tabular transaction data. Keep it concise for WhatsApp." }] },
        { role: "user", parts: [{ inlineData: { mimeType, data: base64Data } }] },
      ],
    });
    return resp.response.text() || null;
  } catch (e) {
    console.error("PDF summary via Gemini failed", e);
    return null;
  }
}
