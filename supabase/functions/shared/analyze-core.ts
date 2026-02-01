import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import * as XLSX from "https://esm.sh/xlsx@0.18.5?no-dts";
import { validateCurrency } from "./currency-validator.ts";
import {
  getExpenseCategories,
  getIncomeCategories,
  normalizeCategory,
} from "./category-colors.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";

// unpdf for serverless PDF text extraction (faster than vision for text-based PDFs)
import {
  getDocument as getPdfDocument,
  GlobalWorkerOptions,
} from "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs?no-dts";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

function b64encode(bytes: Uint8Array): string {
  return encodeBase64(bytes);
}

/**
 * Extracts text from a PDF using unpdf library (serverless-compatible PDF.js).
 * This is 5-10x faster than vision-based PDF analysis for text-based PDFs.
 * Returns null if PDF is image-based (scanned) or extraction fails.
 * Also returns per-page text for parallel processing of large documents.
 */
async function extractPdfText(
  base64Pdf: string,
): Promise<{ text: string; pageCount: number; pages?: string[] } | null> {
  try {
    // Decode base64 to bytes
    const pdfBytes = decodeBase64(base64Pdf);

    // Ensure we don't require a separate worker in the edge runtime
    // (pdf.js defaults to using a worker in browser-like environments)
    GlobalWorkerOptions.workerSrc = "";

    const loadingTask = getPdfDocument({
      data: new Uint8Array(pdfBytes),
      disableWorker: true,
    });
    const pdf = await loadingTask.promise;

    const totalPages = pdf.numPages;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const strings = (textContent.items as Array<{ str?: string }>).map((it) =>
        typeof it?.str === "string" ? it.str : ""
      );
      const pageText = strings.join(" ").replace(/\s+/g, " ").trim();
      pageTexts.push(pageText);
    }

    // Extract text from all pages (merged for single-pass analysis)
    const cleanText = pageTexts.join("\n\n").trim();
    const hasSubstantialText = cleanText.length > 50; // Arbitrary threshold
    const hasTransactionLikeContent =
      /\d+\.\d{2}|\$|€|£|¥|₹/.test(cleanText) || // Has currency-like amounts
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(cleanText); // Has date-like patterns

    if (hasSubstantialText && hasTransactionLikeContent) {
      // For large PDFs (>3 pages), also extract per-page text for parallel processing
      let pages: string[] | undefined;
      if (totalPages > 3) {
        try {
          pages = pageTexts.map((p) => p.trim()).filter((p) => p.length > 0);
        } catch {
          // Fall back to merged text if per-page extraction fails
        }
      }

      console.log(
        `[analyze-expense] PDF text extraction success: ${totalPages} pages, ${cleanText.length} chars` +
          (pages
            ? `, ${pages.length} page chunks for parallel processing`
            : ""),
      );
      return { text: cleanText, pageCount: totalPages, pages };
    }

    // PDF might be image-based or have very little text
    console.log(
      `[analyze-expense] PDF text extraction: insufficient text (${cleanText.length} chars, has transaction patterns: ${hasTransactionLikeContent})`,
    );
    return null;
  } catch (error) {
    console.log(
      `[analyze-expense] PDF text extraction failed:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

function getFunctionCalls(response: any) {
  const direct = response?.response?.functionCalls?.();
  if (Array.isArray(direct) && direct.length > 0) return direct;

  const candidates = response?.response?.candidates;
  if (!candidates || candidates.length === 0) return [];

  const parts = candidates[0].content?.parts || [];
  const calls: any[] = [];
  for (const p of parts) {
    if (p.functionCall) calls.push(p.functionCall);
  }
  return calls;
}

function getFirstFunctionCall(response: any) {
  return getFunctionCalls(response)?.[0] ?? null;
}

export interface AnalyzeAttachment {
  filename: string;
  contentType: string;
  data: string; // base64
}

export interface AnalyzeRequestBody {
  userId?: string | null;
  text?: string;
  typeHint?: "expense" | "income" | "mixed";
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

// Progress callback types for SSE streaming support
export type ProgressEventType =
  | "started"
  | "extracting_text"
  | "analyzing_chunk"
  | "processing_vision"
  | "complete";

export interface ProgressEvent {
  type: ProgressEventType;
  current?: number;
  total?: number;
  message?: string;
}

export type ProgressCallback = (event: ProgressEvent) => void;

function buildTransactionSystemInstruction(
  language: string,
  expenseCategories: string[],
  incomeCategories: string[],
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
  typeHint?: AnalyzeRequestBody["typeHint"],
): string {
  const normalizedHint =
    typeHint && typeHint !== "mixed" ? typeHint : undefined;
  return [
    "You are a professional transaction extraction and classification system.",
    "Task: Parse the input (plain text) into one or more transactions and return them ONLY by calling add_transactions. Every item MUST include a type (expense|income).",
    ...(normalizedHint
      ? [
          `Caller Hint: The transactions are most likely ${normalizedHint}. Use this only as a hint; still return the correct type when evidence suggests otherwise.`,
        ]
      : []),

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
          "### 5. HOUSEHOLD SPLITS (CRITICAL - when household context is provided)",
          "- The caller is in a household/group context. Return split information for every EXPENSE item.",
          "- The expense tracking logic: WHO paid the bill, and HOW MUCH does each person OWE.",
          "",
          "#### 5.1 PAYER IDENTIFICATION (payerUserId) - WHO PAID THE BILL",
          "- Default payer = caller (the user logging the expense). OMIT payerUserId if caller paid.",
          "- Set payerUserId ONLY when someone ELSE paid the bill.",
          "- Patterns: 'Bob paid', 'paid by Bob', 'Bob covered it', 'Bob付了', 'Bob 결제함', 'Bob pagó'",
          "- 'I paid', 'I covered it' → caller paid, OMIT payerUserId",
          "- Use ONLY userId from the provided member list. Never output names/emails.",
          "",
          "#### 5.2 SPLIT EXTRACTION (customSplits) - HOW MUCH EACH PERSON OWES",
          "- ALWAYS use splitType='amount' with memberSplits for ALL household members.",
          "- Each member's amount represents what they OWE (their share of the expense).",
          "- All amounts must sum to the total expense amount.",
          "",
          "**INTERPRETING SPLIT PHRASES (CRITICAL):**",
          "",
          "A) EXPLICIT AMOUNTS per person (clearest pattern):",
          "   - 'Bob 30, me 20' → Bob owes 30, Caller owes 20",
          "   - 'Bob's share is 15' → Bob owes 15, remainder for others",
          "   - 'Bob owes 10' → Bob owes 10, remainder for others",
          "   - '小明出30，我出20' → XiaoMing owes 30, Caller owes 20",
          "",
          "B) 'SPLIT X WITH [person]' - CONTEXT DEPENDENT:",
          "   - When TOTAL is given separately: X is the amount the mentioned person owes",
          "     Example: '50 dinner, split 20 with Bob' → Total=50, Bob owes 20, Caller owes 30",
          "     Example: '40块晚饭，和小明分20' → Total=40, XiaoMing owes 20, Caller owes 20",
          "   - When NO TOTAL given: X is the total to split EQUALLY",
          "     Example: 'split 30 with Bob' → Total=30, Bob owes 15, Caller owes 15",
          "",
          "C) 'I OWE X' or 'MY SHARE IS X' (implies someone else paid):",
          "   - 'Bob paid 50, I owe 20' → Payer=Bob, Caller owes 20, Bob owes 30",
          "   - 'Bob paid dinner 40, my share is 10' → Payer=Bob, Caller owes 10, Bob owes 30",
          "   - 'Bob paid, split 15 with me' → Payer=Bob, Caller owes 15, Bob owes remainder",
          "   - Note: When someone else paid, they still 'owe' their own share to themselves.",
          "",
          "D) EQUAL SPLIT indicators:",
          "   - 'split equally', '50-50', 'halves', 'AA制', '平分', '반반' → divide total equally",
          "   - 'we split it' without amounts → equal split",
          "",
          "E) NO SPLIT MENTIONED:",
          "   - Default to EQUAL split among ALL household members.",
          "",
          "**CALCULATION RULES:**",
          "- After identifying specified amounts, distribute remainder equally among unspecified members.",
          "- All memberSplits amounts MUST sum exactly to the total expense amount.",
          "- ALWAYS include ALL household members in memberSplits array, even if their amount is 0.",
          "- Small rounding differences are OK (backend will adjust the last member's amount).",
          "",
          "**MEMBER RESOLUTION:**",
          "- Match names/aliases to userId from the provided member list (case-insensitive).",
          "- 'me', 'myself', 'I', '我', '나' → Caller's userId",
          "- Pronouns (him/her/them) → Context-dependent or last mentioned member",
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

function buildHouseholdContextPrompt(
  ctx: NonNullable<ReturnType<typeof resolveHouseholdContext>>,
) {
  const lines = ctx.members.map((m) => {
    const label =
      (m.userName || m.userEmail || "member").toString().trim() || "member";
    const aliases = ctx.aliasesByUserId.get(m.userId) ?? [];
    const aliasHint =
      aliases.length > 0 ? ` (aliases: ${aliases.join(", ")})` : "";
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
  if (
    [
      "him",
      "her",
      "them",
      "they",
      "he",
      "she",
      "their",
      "his",
      "hers",
    ].includes(normalized)
  ) {
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
  _text: string,
  _ctx: ReturnType<typeof resolveHouseholdContext> | null,
  _payerUserId?: string,
): CustomSplits | undefined {
  // DEPRECATED: Split extraction is now handled entirely by the AI model.
  // The AI receives household member context and is instructed to return
  // customSplits directly in the function call response.
  // This function is kept for backward compatibility but always returns undefined.
  return undefined;
}

export function normalizeCustomSplits(
  raw: unknown,
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
  totalAmount: number,
): CustomSplits | undefined {
  if (!ctx) return undefined;
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const splitType = String(obj.splitType || "")
    .trim()
    .toLowerCase();
  if (!splitType || splitType === "equal") return undefined;
  if (!["amount", "percentage", "shares"].includes(splitType)) return undefined;

  const rawMemberSplits = Array.isArray(obj.memberSplits)
    ? obj.memberSplits
    : [];
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
      percentage:
        typeof rec.percentage === "number" ? rec.percentage : undefined,
      shares:
        typeof rec.shares === "number" ? Math.trunc(rec.shares) : undefined,
    });
  }

  const memberIds = ctx.members.map((m) => m.userId);
  const full: MemberSplit[] = [];

  if (splitType === "amount") {
    const safeTotal = Number.isFinite(totalAmount)
      ? Math.max(0, totalAmount)
      : 0;
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
      if (
        !(typeof amount === "number" && Number.isFinite(amount) && amount >= 0)
      ) {
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
      if (
        !(
          typeof percentage === "number" &&
          Number.isFinite(percentage) &&
          percentage >= 0
        )
      ) {
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
      const safeShares =
        typeof shares === "number" && Number.isFinite(shares) && shares > 0
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

function buildDefaultHouseholdCustomSplits(
  ctx: ReturnType<typeof resolveHouseholdContext> | null,
  totalAmount: number,
): CustomSplits | undefined {
  if (!ctx) return undefined;
  if (!Array.isArray(ctx.members) || ctx.members.length === 0) return undefined;

  return normalizeCustomSplits(
    {
      splitType: "amount",
      memberSplits: ctx.members.map((m) => ({ userId: m.userId })),
    },
    ctx,
    totalAmount,
  );
}

/**
 * Splits large text into processable chunks.
 * Each chunk should contain complete lines to avoid splitting transactions mid-line.
 */
function splitTextIntoChunks(
  text: string,
  maxCharsPerChunk: number = 12000,
): string[] {
  const lines = text.split(/\n/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const line of lines) {
    // If adding this line would exceed limit, start new chunk
    if (
      currentChunk.length + line.length + 1 > maxCharsPerChunk &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? "\n" : "") + line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Text Analysis with parallel chunking support for large inputs.
 * Splits text into manageable chunks and processes them in parallel, then aggregates results.
 * For PDFs with page boundaries, can also accept pre-split pages for optimal parallelism.
 */
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
  typeHint?: AnalyzeRequestBody["typeHint"],
  preChunkedPages?: string[], // Optional: pre-split pages from PDF extraction
  onProgress?: ProgressCallback, // Optional: progress callback for SSE streaming
): Promise<ExpenseItem[]> {
  const systemInstruction = buildTransactionSystemInstruction(
    language,
    expenseCategories,
    incomeCategories,
    householdContext,
    typeHint,
  );

  const householdPrompt = householdContext
    ? `\n${buildHouseholdContextPrompt(householdContext)}\n`
    : "\n";

  // Check if text is large enough to require chunking
  // ~12000 chars is roughly 3000-4000 tokens input, leaving room for output
  const CHUNK_THRESHOLD = 12000;

  // Use pre-chunked pages if provided, otherwise split by character limit
  let textChunks: string[];
  if (preChunkedPages && preChunkedPages.length > 1) {
    // Group pages into optimal chunk sizes (combine small pages, split large ones)
    textChunks = [];
    let currentChunk = "";
    for (const page of preChunkedPages) {
      if (page.length > CHUNK_THRESHOLD) {
        // Page is too large, flush current and split this page
        if (currentChunk.trim()) textChunks.push(currentChunk.trim());
        textChunks.push(...splitTextIntoChunks(page, CHUNK_THRESHOLD));
        currentChunk = "";
      } else if (currentChunk.length + page.length + 2 > CHUNK_THRESHOLD) {
        // Adding this page would exceed limit, flush current
        if (currentChunk.trim()) textChunks.push(currentChunk.trim());
        currentChunk = page;
      } else {
        // Combine pages
        currentChunk += (currentChunk ? "\n\n" : "") + page;
      }
    }
    if (currentChunk.trim()) textChunks.push(currentChunk.trim());
  } else {
    textChunks =
      bodyText.length > CHUNK_THRESHOLD
        ? splitTextIntoChunks(bodyText, CHUNK_THRESHOLD)
        : [bodyText];
  }

  const isMultiChunk = textChunks.length > 1;

  console.log(
    `[analyze-expense] Text: Processing ${textChunks.length} chunk(s) ${isMultiChunk ? "IN PARALLEL" : ""}, total length=${bodyText.length}`,
  );

  // Report progress: starting chunk analysis
  if (onProgress && textChunks.length > 0) {
    onProgress({
      type: "analyzing_chunk",
      current: 0,
      total: textChunks.length,
      message: `Processing ${textChunks.length} chunk(s)`,
    });
  }

  // Process single chunk directly (no parallelism needed)
  if (!isMultiChunk) {
    const items = await processTextChunk(
      genAI,
      textChunks[0],
      callerCurrency,
      callerDate,
      language,
      tools,
      systemInstruction,
      householdPrompt,
      householdContext,
      0,
      1,
      bodyText,
    );
    return deduplicateAndCleanItems(items);
  }

  // PARALLEL PROCESSING: Process all chunks concurrently with concurrency limit
  const MAX_CONCURRENT = 4; // Limit concurrent API calls to avoid rate limits
  const allItems: ExpenseItem[] = [];

  // Process in batches of MAX_CONCURRENT
  for (
    let batchStart = 0;
    batchStart < textChunks.length;
    batchStart += MAX_CONCURRENT
  ) {
    const batchEnd = Math.min(batchStart + MAX_CONCURRENT, textChunks.length);
    const batchChunks = textChunks.slice(batchStart, batchEnd);

    console.log(
      `[analyze-expense] Text: Processing parallel batch ${Math.floor(batchStart / MAX_CONCURRENT) + 1}/${Math.ceil(textChunks.length / MAX_CONCURRENT)} (chunks ${batchStart + 1}-${batchEnd})`,
    );

    const batchPromises = batchChunks.map((chunk, idx) =>
      processTextChunk(
        genAI,
        chunk,
        callerCurrency,
        callerDate,
        language,
        tools,
        systemInstruction,
        householdPrompt,
        householdContext,
        batchStart + idx,
        textChunks.length,
        "", // Empty for multi-chunk
      ),
    );

    const batchResults = await Promise.allSettled(batchPromises);

    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      } else {
        console.error(
          `[analyze-expense] Text: Chunk ${batchStart + i + 1} failed:`,
          result.reason,
        );
      }
    }

    // Report batch progress
    if (onProgress) {
      onProgress({
        type: "analyzing_chunk",
        current: batchEnd,
        total: textChunks.length,
        message: `Processed ${batchEnd} of ${textChunks.length} chunks`,
      });
    }
  }

  // Final deduplication and cleanup
  const cleanedItems = deduplicateAndCleanItems(allItems);
  console.log(
    `[analyze-expense] Text: Final count after dedup: ${cleanedItems.length} items (from ${allItems.length} raw)`,
  );

  return cleanedItems;
}

/**
 * Process a single text chunk with Gemini AI.
 * Extracted to support parallel processing.
 */
async function processTextChunk(
  genAI: GoogleGenerativeAI,
  chunk: string,
  callerCurrency: string,
  callerDate: string,
  _language: string,
  tools: any,
  systemInstruction: string,
  householdPrompt: string,
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
  chunkIndex: number,
  totalChunks: number,
  originalText: string,
): Promise<ExpenseItem[]> {
  const isMultiChunk = totalChunks > 1;

  const chunkPrompt = isMultiChunk
    ? `BULK IMPORT - Part ${chunkIndex + 1} of ${totalChunks}:
Extract ALL transactions from this text segment. Each line that contains an amount should be treated as a separate transaction.
Do NOT summarize - extract every single transaction.

`
    : "";

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    tools,
    systemInstruction,
  });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `Caller Currency: ${callerCurrency}\n` +
              `Caller Date: ${callerDate}` +
              householdPrompt +
              chunkPrompt +
              `User: ${chunk}`,
          },
        ],
      },
    ],
    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    generationConfig: { maxOutputTokens: 32768 },
  } as any);

  const toolCalls = getFunctionCalls(response).filter(
    (call: any) => call && call.name === "add_transactions",
  );

  if (toolCalls.length > 0) {
    const rawItems: any[] = toolCalls.flatMap((call: any) =>
      Array.isArray(call.args?.items) ? call.args.items : [],
    );

    const chunkItems = processRawItems(
      rawItems,
      callerCurrency,
      callerDate,
      householdContext,
      `Text-chunk${chunkIndex + 1}`,
    );

    // For text items, use original text as description if not provided
    const itemsWithDesc = chunkItems.map((item) => ({
      ...item,
      description: item.description || (isMultiChunk ? "" : originalText),
    }));

    console.log(
      `[analyze-expense] Text: Chunk ${chunkIndex + 1} extracted ${itemsWithDesc.length} items`,
    );
    return itemsWithDesc;
  }

  return [];
}

/**
 * Processes raw items from Gemini response into validated ExpenseItems
 */
function processRawItems(
  rawItems: any[],
  callerCurrency: string,
  callerDate: string,
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
  logPrefix: string,
): ExpenseItem[] {
  return rawItems
    .map((it) => {
      const itemCurrency = it.currency || callerCurrency;
      const rawCategory = it.category || "other";
      const normalizedCategory = normalizeCategory(rawCategory);

      console.log(
        `[analyze-expense] ${logPrefix} raw: amount=${it.amount}, category="${rawCategory}" -> "${normalizedCategory}"`,
      );

      const txType = String(it.type || "").toLowerCase();
      const resolvedType =
        txType === "income" || txType === "expense" ? txType : undefined;
      const amount = Math.abs(Number(it.amount));
      const itemCurrencySymbol = getCurrencySymbol(itemCurrency);

      const payerUserId =
        resolvedType === "expense"
          ? normalizePayerUserId(it.payerUserId, householdContext)
          : undefined;
      const normalizedCustomSplits =
        resolvedType === "expense"
          ? normalizeCustomSplits(it.customSplits, householdContext, amount)
          : undefined;
      const customSplits =
        resolvedType === "expense" && householdContext
          ? (normalizedCustomSplits ??
            buildDefaultHouseholdCustomSplits(householdContext, amount))
          : undefined;

      // Log household split details for debugging
      if (householdContext && resolvedType === "expense") {
        console.log(
          `[analyze-expense] ${logPrefix} household split: payerUserId=${payerUserId || "(caller)"}, ` +
            `rawCustomSplits=${JSON.stringify(it.customSplits)}, ` +
            `normalizedSplits=${JSON.stringify(customSplits?.memberSplits?.map((m) => ({ userId: m.userId.slice(-8), amount: m.amount })))}`,
        );
      }

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

      if (!isValid) {
        console.log(
          `[analyze-expense] ${logPrefix} filtered invalid: ${JSON.stringify(
            it,
          )}`,
        );
      }
      return isValid;
    });
}

/**
 * Deduplicates items and removes total-like entries
 */
function deduplicateAndCleanItems(items: ExpenseItem[]): ExpenseItem[] {
  if (items.length <= 1) return items;

  // Remove total-like entries
  const withoutTotals = items.filter((it) => !isTotalLike(it.description));
  let result = withoutTotals.length > 0 ? withoutTotals : items;

  // Remove items that equal the sum of other items (likely totals)
  const sums = result.map((_, i) =>
    result
      .filter((__, j) => i !== j)
      .reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0),
  );
  result = result.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);

  // Deduplicate by (date, amount, description) composite key
  const seen = new Set<string>();
  return result.filter((item) => {
    const key = `${item.date}|${item.amount.toFixed(2)}|${(
      item.description || ""
    )
      .toLowerCase()
      .slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * PDF Analysis with text extraction optimization.
 * First attempts to extract text from PDF (5-10x faster for text-based PDFs).
 * Falls back to vision-based analysis for scanned/image-based PDFs.
 */
async function analyzeFromPdf(
  genAI: GoogleGenerativeAI,
  callerCurrency: string,
  callerDate: string,
  language: string,
  base64Pdf: string,
  contentType: string,
  tools: any,
  expenseCategories: string[],
  incomeCategories: string[],
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
  typeHint?: AnalyzeRequestBody["typeHint"],
  onProgress?: ProgressCallback,
): Promise<ExpenseItem[]> {
  // OPTIMIZATION: Try text extraction first (5-10x faster than vision)
  console.log("[analyze-expense] PDF: Attempting text extraction optimization");

  // Report progress: extracting text
  if (onProgress) {
    onProgress({
      type: "extracting_text",
      message: "Extracting text from PDF",
    });
  }

  const textResult = await extractPdfText(base64Pdf);

  if (textResult && textResult.text.length > 0) {
    const hasPageChunks = textResult.pages && textResult.pages.length > 1;
    console.log(
      `[analyze-expense] PDF: Using text mode (${textResult.pageCount} pages, ${textResult.text.length} chars)` +
        (hasPageChunks
          ? ` with ${textResult.pages!.length} page chunks for parallel processing`
          : ""),
    );
    // Use text-based analysis with parallel page processing if available
    return analyzeFromText(
      genAI,
      callerCurrency,
      callerDate,
      language,
      textResult.text,
      tools,
      expenseCategories,
      incomeCategories,
      householdContext,
      typeHint,
      textResult.pages, // Pass pre-chunked pages for parallel processing
      onProgress, // Pass progress callback
    );
  }

  // Fall back to vision-based analysis for image/scanned PDFs
  console.log(
    "[analyze-expense] PDF: Text extraction failed, using vision mode",
  );

  // Report progress: switching to vision mode
  if (onProgress) {
    onProgress({
      type: "processing_vision",
      message: "Processing scanned PDF with vision",
    });
  }

  return analyzeFromPdfVision(
    genAI,
    callerCurrency,
    callerDate,
    language,
    base64Pdf,
    contentType,
    tools,
    expenseCategories,
    incomeCategories,
    householdContext,
    typeHint,
  );
}

/**
 * Vision-based PDF Analysis with multi-pass extraction for large documents.
 * Used as fallback for scanned/image-based PDFs where text extraction fails.
 */
async function analyzeFromPdfVision(
  genAI: GoogleGenerativeAI,
  callerCurrency: string,
  callerDate: string,
  language: string,
  base64Pdf: string,
  contentType: string,
  tools: any,
  expenseCategories: string[],
  incomeCategories: string[],
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
  typeHint?: AnalyzeRequestBody["typeHint"],
): Promise<ExpenseItem[]> {
  const allItems: ExpenseItem[] = [];
  const MAX_CONTINUATION_PASSES = 5; // Limit continuation attempts
  const ITEMS_PER_PASS_THRESHOLD = 3; // Minimum items to consider continuing

  const systemInstruction = buildTransactionSystemInstruction(
    language,
    expenseCategories,
    incomeCategories,
    householdContext,
    typeHint,
  );

  // Model progression for PDF analysis with higher token limits
  const modelConfigs = [
    { name: "gemini-2.5-flash-lite", timeout: 90000, maxTokens: 65536 },
    { name: "gemini-3-flash-preview", timeout: 90000, maxTokens: 65536 },
  ];

  const householdPrompt = householdContext
    ? `\n${buildHouseholdContextPrompt(householdContext)}\n`
    : "\n";

  // Initial extraction prompt emphasizing completeness
  const basePrompt =
    `Caller Currency: ${callerCurrency}\n` +
    `Caller Date: ${callerDate}` +
    householdPrompt +
    `CRITICAL INSTRUCTIONS FOR BULK EXTRACTION:
- This PDF may contain a bank statement with MANY transactions (potentially 100+ across multiple pages).
- If it's a bank feed/statement, you MUST extract EVERY SINGLE transaction row from ALL pages.
- If it's a receipt with line items and a total, return ONE transaction for the grand total only.
- Do NOT summarize or sample - extract ALL transactions.
- If there are more transactions than you can return in one response, focus on extracting as many as possible.
Return transactions only by calling add_transactions.`;

  let lastError = "";

  for (const config of modelConfigs) {
    console.log(
      `[analyze-expense] PDF: Attempting with model ${config.name}, maxTokens=${config.maxTokens}`,
    );

    const model = genAI.getGenerativeModel({
      model: config.name,
      tools,
      systemInstruction,
    });

    let passNumber = 0;
    let continuationOffset = 0;
    let shouldContinue = true;

    while (shouldContinue && passNumber < MAX_CONTINUATION_PASSES) {
      passNumber++;

      // Build the request - first pass vs continuation pass
      const promptText =
        passNumber === 1
          ? basePrompt
          : `${basePrompt}\n\nCONTINUATION: You already extracted ${continuationOffset} transactions. Now extract the REMAINING transactions starting from transaction #${
              continuationOffset + 1
            }. Only return transactions you haven't returned before.`;

      const request = {
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        contents: [
          {
            role: "user",
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: contentType || "application/pdf",
                  data: base64Pdf,
                },
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: config.maxTokens },
      } as any;

      try {
        console.log(
          `[analyze-expense] PDF: Pass ${passNumber}, offset=${continuationOffset}`,
        );

        const response = await generateGeminiWithRetry({
          model,
          modelName: config.name,
          request,
          timeoutMs: config.timeout,
        });

        const toolCalls = getFunctionCalls(response).filter(
          (call: any) => call && call.name === "add_transactions",
        );

        if (toolCalls.length > 0) {
          const rawItems: any[] = toolCalls.flatMap((call: any) =>
            Array.isArray(call.args?.items) ? call.args.items : [],
          );

          const passItems = processRawItems(
            rawItems,
            callerCurrency,
            callerDate,
            householdContext,
            `PDF-pass${passNumber}`,
          );

          console.log(
            `[analyze-expense] PDF: Pass ${passNumber} extracted ${passItems.length} items`,
          );

          if (passItems.length > 0) {
            allItems.push(...passItems);
            continuationOffset += passItems.length;

            // Check if we should continue (got enough items to suggest there might be more)
            // For first pass, continue if we got a substantial number that might indicate truncation
            if (passNumber === 1 && passItems.length >= 20) {
              // Likely a large document, try one continuation
              shouldContinue = true;
            } else if (
              passNumber > 1 &&
              passItems.length >= ITEMS_PER_PASS_THRESHOLD
            ) {
              // Continuation pass returned items, try another
              shouldContinue = true;
            } else {
              // Diminishing returns, stop
              shouldContinue = false;
            }
          } else {
            // No items in this pass, stop
            shouldContinue = false;
          }
        } else {
          // No tool calls, stop continuation
          shouldContinue = false;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.error(
          `[analyze-expense] PDF: Pass ${passNumber} error:`,
          lastError,
        );
        shouldContinue = false;
      }
    }

    // If we got items from this model, return them
    if (allItems.length > 0) {
      console.log(
        `[analyze-expense] PDF: Total extracted ${allItems.length} items using ${config.name}`,
      );
      break;
    }
  }

  // Final deduplication and cleanup
  const cleanedItems = deduplicateAndCleanItems(allItems);
  console.log(
    `[analyze-expense] PDF: Final count after dedup: ${cleanedItems.length} items`,
  );

  return cleanedItems;
}

/**
 * Audio Analysis with improved token limits.
 */
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
  typeHint?: AnalyzeRequestBody["typeHint"],
): Promise<ExpenseItem[]> {
  const systemInstruction = buildTransactionSystemInstruction(
    language,
    expenseCategories,
    incomeCategories,
    householdContext,
    typeHint,
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
              "The following is an audio description of one or more transactions. Analyze it and return ALL structured transactions by calling add_transactions. If multiple transactions are mentioned, extract each one separately.",
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
    generationConfig: { maxOutputTokens: 16384 }, // Increased from 4096
  } as any);

  const toolCalls = getFunctionCalls(response).filter(
    (call: any) => call && call.name === "add_transactions",
  );

  if (toolCalls.length > 0) {
    const rawItems: any[] = toolCalls.flatMap((call: any) =>
      Array.isArray(call.args?.items) ? call.args.items : [],
    );

    const items = processRawItems(
      rawItems,
      callerCurrency,
      callerDate,
      householdContext,
      "Audio",
    );

    console.log(`[analyze-expense] Audio: Extracted ${items.length} items`);

    return deduplicateAndCleanItems(items);
  }

  return [];
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

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterDelayMs(ms: number): number {
  const factor = 0.7 + Math.random() * 0.6;
  return Math.max(0, Math.round(ms * factor));
}

function isRetriableGeminiError(error: unknown): boolean {
  if (error instanceof GoogleGenerativeAIFetchError) {
    const status = (error as any).status ?? 0;
    return status === 429 || status === 500 || status === 503 || status === 504;
  }
  if (error instanceof Error) {
    return (
      /\b(429|500|503|504)\b/.test(error.message) ||
      /overloaded|unavailable|resource_exhausted/i.test(error.message)
    );
  }
  return false;
}

function formatGeminiError(error: unknown): string {
  if (error instanceof GoogleGenerativeAIFetchError) {
    const status = (error as any).status ? String((error as any).status) : "";
    const statusText = (error as any).statusText
      ? String((error as any).statusText)
      : "";
    const suffix = [status, statusText].filter(Boolean).join(" ");
    return suffix ? `${error.message} (${suffix})` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

async function generateGeminiWithRetry(params: {
  model: any;
  modelName: string;
  request: any;
  timeoutMs: number;
}): Promise<any> {
  const { model, modelName, request, timeoutMs } = params;
  const startedAt = Date.now();
  const delays = [250, 750, 1500];

  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const elapsed = Date.now() - startedAt;
    const remaining = timeoutMs - elapsed;
    if (remaining <= 0) {
      throw new Error(`Model ${modelName} timed out after ${timeoutMs}ms`);
    }

    try {
      const responsePromise = model.generateContent(request);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Model ${modelName} timed out after ${timeoutMs}ms`),
            ),
          remaining,
        ),
      );
      return await Promise.race([responsePromise, timeoutPromise]);
    } catch (error) {
      lastError = error;
      const formatted = formatGeminiError(error);

      if (!isRetriableGeminiError(error) || attempt >= delays.length) {
        throw new Error(formatted);
      }

      const waitMs = Math.min(
        jitterDelayMs(delays[attempt]),
        Math.max(0, remaining - 50),
      );
      console.log(
        `[analyze-expense] ${modelName} transient failure (attempt ${
          attempt + 1
        }/${delays.length + 1}), retrying in ${waitMs}ms: ${formatted}`,
      );
      if (waitMs > 0) await sleepMs(waitMs);
    }
  }

  throw new Error(formatGeminiError(lastError));
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
  overrideContentType?: string,
): Promise<{ success: boolean; items?: ExpenseItem[]; error?: string }> {
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      tools,
      systemInstruction,
    });

    const request = {
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nExtract transaction details from this image (receipt, bank statement, or transaction notification):`,
            },
            {
              inlineData: {
                mimeType:
                  overrideContentType ||
                  body.image?.contentType ||
                  "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 32768 }, // Increased from 4096 for images with many transactions
    } as any;

    const response = await generateGeminiWithRetry({
      model,
      modelName,
      request,
      timeoutMs,
    });

    const toolCalls = getFunctionCalls(response).filter(
      (call: any) => call && call.name === "add_transactions",
    );
    if (toolCalls.length > 0) {
      const rawItems: any[] = toolCalls.flatMap((call: any) =>
        Array.isArray(call.args?.items) ? call.args.items : [],
      );

      const tempItems = processRawItems(
        rawItems,
        callerCurrency,
        callerDate,
        householdContext,
        "Image",
      );

      console.log(
        `[analyze-expense] Image: Extracted ${tempItems.length} raw items`,
      );

      let items = deduplicateAndCleanItems(tempItems);
      if (items.length > 1) {
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
    console.log(
      `[analyze-expense] SafetyRatings: ${JSON.stringify(safetyRatings)}`,
    );
    console.log(
      `[analyze-expense] Candidate Parts Count: ${
        candidate?.content?.parts?.length || 0
      }`,
    );
    console.log(
      `[analyze-expense] Model output text preview: ${JSON.stringify(
        modelText.slice(0, 200),
      )}`,
    );

    return {
      success: false,
      error: `Moneko AI could not extract valid transactions`,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("timed out")) {
      throw error; // Re-throw timeout errors
    }
    return {
      success: false,
      error: `${modelName} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export async function runAnalyzeExpense(
  body: AnalyzeRequestBody,
  geminiApiKey: string,
  onProgress?: ProgressCallback,
): Promise<AnalyzeResult> {
  try {
    // Report started event
    if (onProgress) {
      onProgress({ type: "started", message: "Starting analysis" });
    }

    let userId = sanitizeUuid(body.userId ?? null);
    if (body.userId && !userId) {
      return {
        success: false,
        error: "Invalid userId format",
        status: 400,
        language: "en",
      };
    }
    if (!userId) {
      return {
        success: false,
        error: "userId is required",
        status: 400,
        language: "en",
      };
    }

    const hasText =
      typeof body.text === "string" && body.text.trim().length > 0;
    const hasImage = !!body.image;
    const hasAttachments =
      Array.isArray(body.attachments) && body.attachments.length > 0;
    const hasAudio = !!body.audio;

    const modes = [hasText, hasImage, hasAttachments, hasAudio].filter(
      Boolean,
    ).length;
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
    const rawTypeHint = body.typeHint?.toString().trim().toLowerCase();
    const typeHint =
      rawTypeHint === "expense" ||
      rawTypeHint === "income" ||
      rawTypeHint === "mixed"
        ? (rawTypeHint as AnalyzeRequestBody["typeHint"])
        : undefined;

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const expenseCategories = getExpenseCategories();
    const incomeCategories = getIncomeCategories();

    // Debug: Log categories being passed to AI
    console.log(
      `[analyze-expense] Expense categories count: ${expenseCategories.length}`,
    );
    console.log(
      `[analyze-expense] Income categories count: ${incomeCategories.length}`,
    );
    console.log(
      `[analyze-expense] Expense categories include 'food': ${expenseCategories.includes(
        "food",
      )}`,
    );
    console.log(
      `[analyze-expense] Expense categories include 'food & drinks': ${expenseCategories.includes(
        "food & drinks",
      )}`,
    );

    let lastError = "";

    const tools = [
      {
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
                      type: {
                        type: "string",
                        enum: ["expense", "income"],
                        description: "Transaction type",
                      },
                      amount: {
                        type: "number",
                        description: "Positive amount.",
                      },
                      category: {
                        type: "string",
                        description: "Canonical category from provided list.",
                      },
                      currency: {
                        type: "string",
                        description: "ISO 4217 code.",
                      },
                      date: { type: "string", description: "YYYY-MM-DD." },
                      description: {
                        type: "string",
                        description: "Very short note (e.g. 'Coffee', 'Taxi').",
                      },
                      payerUserId: {
                        type: "string",
                        description:
                          "Household only: userId of who paid (if specified).",
                      },
                      customSplits: {
                        type: "object",
                        description:
                          "Household only: Custom split when user specifies non-equal distribution. MUST be returned when user mentions specific amounts/percentages for members. Omit ONLY for equal splits or when no split is mentioned.",
                        properties: {
                          splitType: {
                            type: "string",
                            enum: ["amount", "percentage", "shares"],
                            description:
                              "Type of split: 'amount' for specific amounts per person, 'percentage' for percentage splits, 'shares' for ratio-based splits.",
                          },
                          memberSplits: {
                            type: "array",
                            description:
                              "Array of splits for ALL household members. Calculate remainder for unspecified members.",
                            items: {
                              type: "object",
                              properties: {
                                userId: {
                                  type: "string",
                                  description:
                                    "Member's userId from the provided member list.",
                                },
                                amount: {
                                  type: "number",
                                  description:
                                    "For splitType='amount': the amount this member owes.",
                                },
                                percentage: {
                                  type: "number",
                                  description:
                                    "For splitType='percentage': percentage (0-100) this member owes.",
                                },
                                shares: {
                                  type: "number",
                                  description:
                                    "For splitType='shares': number of shares for this member.",
                                },
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
      },
    ];

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
      const isSpreadsheet =
        /spreadsheetml|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i.test(
          contentType,
        ) ||
        /application\/vnd\.ms-excel/i.test(contentType) ||
        /\.(xlsx|xls)$/i.test(lowerName);
      const isPdf =
        /application\/pdf/i.test(contentType) || /\.pdf$/i.test(lowerName);

      let syntheticText = "";

      if (textLike) {
        try {
          syntheticText = new TextDecoder("utf-8", { fatal: false }).decode(
            bytes.slice(0, 16000),
          );
        } catch {
          syntheticText = "";
        }
      } else if (isSpreadsheet) {
        syntheticText = buildXlsxPreview(bytes) || "";
      } else if (isPdf) {
        const base64Data = b64encode(bytes);

        // Report progress for PDF processing
        if (onProgress) {
          onProgress({
            type: "extracting_text",
            message: "Processing PDF document",
          });
        }

        try {
          items = await analyzeFromPdf(
            genAI,
            callerCurrency,
            callerDate,
            language,
            base64Data,
            contentType || "application/pdf",
            tools,
            expenseCategories,
            incomeCategories,
            householdContext,
            typeHint,
            onProgress,
          );
        } catch (e) {
          console.error("[analyze-expense] PDF direct extraction failed", e);
        }

        if (items.length === 0) {
          const summary = await summarizePdfWithGemini(
            base64Data,
            "application/pdf",
            geminiApiKey,
          );
          syntheticText = summary || "";
        }
      }

      if (items.length === 0) {
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
          typeHint,
          undefined, // no pre-chunked pages
          onProgress,
        );
      }
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
        typeHint,
        undefined, // no pre-chunked pages
        onProgress,
      );
    } else if (hasAudio) {
      const audio = body.audio!;
      if (!audio.contentType || !audio.contentType.startsWith("audio/")) {
        return {
          success: false,
          error: "Invalid audio content type",
          status: 400,
          language,
        };
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
        return {
          success: false,
          error: "Audio too large. Maximum 20MB",
          status: 400,
          language,
        };
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
        typeHint,
      );
    } else if (hasImage) {
      const image = body.image!;
      if (!image.contentType || !image.contentType.startsWith("image/")) {
        return {
          success: false,
          error: "Invalid image content type",
          status: 400,
          language,
        };
      }
      let base64Image = "";
      let finalContentType = image.contentType;

      if (image.bytes instanceof Uint8Array) {
        if (image.bytes.length > 10 * 1024 * 1024) {
          return {
            success: false,
            error: "Image too large. Maximum 10MB",
            status: 400,
            language,
          };
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
          return {
            success: false,
            error: "Image too large. Maximum 10MB",
            status: 400,
            language,
          };
        }
      }

      // Normalize common mime type variations for Gemini
      if (finalContentType === "image/jpg") finalContentType = "image/jpeg";

      console.log(
        `[analyze-expense] Image Prep: contentType=${finalContentType} (orig=${image.contentType}), length=${base64Image.length}`,
      );
      console.log(
        `[analyze-expense] Base64 Start: ${base64Image.slice(0, 20)}...`,
      );
      console.log(`[analyze-expense] Base64 End: ...${base64Image.slice(-20)}`);

      const typeHintNote =
        typeHint && typeHint !== "mixed"
          ? `Caller Hint: The transactions are most likely ${typeHint}. Use this only as a hint; still return the correct type when evidence suggests otherwise.`
          : null;
      const systemInstruction = [
        "You are an expert Financial OCR Analyst for Moneko.",
        "OBJECTIVE: Analyze the image to extract transaction data. Minimize noise, maximize accuracy.",
        "OUTPUT: Call `add_transactions` with the extracted items. Under no circumstances output plain text or JSON.",
        ...(typeHintNote ? [typeHintNote] : []),

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

      // Model progression: prefer stable fast model first.
      // Preview models can be more prone to overload.
      const modelAttempts = [
        { name: "gemini-2.5-flash-lite", timeout: 30000 },
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
            timeout,
            finalContentType,
          );

          if (result.success && result.items && result.items.length > 0) {
            console.log(
              `[analyze-expense] Success with ${name}: extracted ${result.items.length} items`,
            );
            items = result.items;
            break;
          } else {
            lastError = result.error || `${name} returned no items`;
            console.log(`[analyze-expense] ${name} failed: ${lastError}`);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes("timed out")) {
            lastError = error.message;
            console.log(
              `[analyze-expense] ${name} timed out after ${timeout}ms`,
            );
          } else {
            lastError = error instanceof Error ? error.message : String(error);
            console.log(`[analyze-expense] ${name} error: ${lastError}`);
          }
        }
      }

      if (!items.length) {
        console.log(
          "[analyze-expense] No items from standard image prompts, trying handwriting-focused fallback",
        );
        const handwritingInstruction = [
          "You are an expert Financial OCR Analyst for Moneko.",
          "OBJECTIVE: The image is likely a handwritten list of expenses or income on paper.",
          "OUTPUT: Call `add_transactions` with the extracted items. Under no circumstances output plain text or JSON.",
          ...(typeHintNote ? [typeHintNote] : []),
          "",
          "### HANDWRITTEN LIST PATTERN",
          '- Treat each readable line that looks like "<label> <amount>" (e.g. "gym $45", "grocery $120") as a separate transaction.',
          "- Prioritize darker, thicker handwriting lines over faint background print or noise.",
          "- If you can reasonably infer a transaction from partial handwriting, include it with best-effort classification.",
        ].join("\n");

        try {
          const fallback = await attemptAnalysis(
            genAI,
            "gemini-2.5-flash-lite",
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
            console.log(
              `[analyze-expense] Handwriting fallback succeeded: extracted ${fallback.items.length} items`,
            );
            items = fallback.items;
          } else {
            lastError =
              fallback.error ||
              lastError ||
              "Handwriting fallback returned no items";
            console.log(
              "[analyze-expense] Handwriting fallback failed:",
              lastError,
            );
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
        error:
          lastError ||
          "Could not extract transaction information. Please try clearer text, a screenshot, or a photo.",
        status: 400,
        language,
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

/**
 * Enhanced XLSX preview that captures more rows for bulk transaction imports.
 * Returns all rows up to a reasonable limit for transaction extraction.
 */
export function buildXlsxPreview(buf: Uint8Array): string | null {
  try {
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return null;
    const sheet = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!Array.isArray(rows) || rows.length === 0) return null;

    // Increased from 20 rows to 500 rows to capture more transactions
    // Each row is limited to 12 columns (up from 8) for better transaction data capture
    const MAX_ROWS = 500;
    const MAX_COLS = 12;

    const limited = rows
      .slice(0, MAX_ROWS)
      .map((r) => (Array.isArray(r) ? r.slice(0, MAX_COLS) : r));

    const previewLines = limited.map((r: any) => JSON.stringify(r));

    console.log(
      `[analyze-expense] XLSX: Processing ${limited.length} of ${rows.length} total rows`,
    );

    return `Sheet "${sheetName}" data (${limited.length} of ${rows.length} rows):\n${previewLines.join(
      "\n",
    )}`;
  } catch (e) {
    console.error("XLSX parse error", e);
    return null;
  }
}

/**
 * Enhanced PDF summarization that extracts all transaction data in a structured format.
 * Used as fallback when direct PDF analysis fails.
 */
export async function summarizePdfWithGemini(
  base64Data: string,
  mimeType: string,
  geminiKey: string,
): Promise<string | null> {
  try {
    const ai = new GoogleGenerativeAI(geminiKey);

    const startedAt = Date.now();
    const totalTimeoutMs = 120000; // Increased from 60s to 120s for large PDFs
    const modelNames = ["gemini-2.5-flash-lite", "gemini-3-flash-preview"];

    const request = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Extract ALL transaction data from this PDF. This is likely a bank statement with many transactions.

CRITICAL INSTRUCTIONS:
- Extract EVERY transaction row from ALL pages
- For each transaction, capture: Date, Description/Merchant, Amount, and whether it's a debit (expense) or credit (income)
- Format each transaction on its own line as: DATE | DESCRIPTION | AMOUNT | TYPE (debit/credit)
- Do NOT summarize or sample - list every single transaction
- If there are 100+ transactions, you must list all of them

Output format example:
2024-01-15 | Starbucks | 5.50 | debit
2024-01-15 | Direct Deposit | 2500.00 | credit
...`,
            },
          ],
        },
        {
          role: "user",
          parts: [{ inlineData: { mimeType, data: base64Data } }],
        },
      ],
      generationConfig: { maxOutputTokens: 65536 }, // Increased for large transaction lists
    } as any;

    let lastError: unknown;
    for (const modelName of modelNames) {
      const elapsed = Date.now() - startedAt;
      const remaining = totalTimeoutMs - elapsed;
      if (remaining <= 0) break;

      try {
        const model = ai.getGenerativeModel({ model: modelName });
        const resp = await generateGeminiWithRetry({
          model,
          modelName,
          request,
          timeoutMs: remaining,
        });
        return resp.response.text() || null;
      } catch (e) {
        lastError = e;
        console.error(`PDF summary via Gemini failed (${modelName})`, e);
      }
    }

    console.error("PDF summary via Gemini failed", lastError);
    return null;
  } catch (e) {
    console.error("PDF summary via Gemini failed", e);
    return null;
  }
}
