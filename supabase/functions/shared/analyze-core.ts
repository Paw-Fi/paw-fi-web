// Suppress Deno microtask warnings and polyfill warnings BEFORE importing PDF.js
// This is critical - must happen before PDF.js initialization
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];
  const joined = args
    .map((arg: any) =>
      typeof arg === "string" ? arg : arg instanceof Error ? arg.message : "",
    )
    .filter(Boolean)
    .join(" ");
  if (
    (typeof message === "string" || joined) &&
    (String(message).includes("Deno.core.runMicrotasks() is not supported") ||
      String(message).includes("Setting up fake worker failed") ||
      String(message).includes("event loop error") ||
      joined.includes("Deno.core.runMicrotasks() is not supported") ||
      joined.includes("Setting up fake worker failed") ||
      joined.includes("event loop error"))
  ) {
    // Suppress these known serverless environment warnings
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args[0];
  const joined = args
    .map((arg: any) =>
      typeof arg === "string" ? arg : arg instanceof Error ? arg.message : "",
    )
    .filter(Boolean)
    .join(" ");
  if (
    (typeof message === "string" || joined) &&
    (String(message).includes("Cannot polyfill") ||
      String(message).includes("rendering may be broken") ||
      String(message).includes(
        "__Process$.getBuiltinModule is not a function",
      ) ||
      joined.includes("Cannot polyfill") ||
      joined.includes("rendering may be broken") ||
      joined.includes("__Process$.getBuiltinModule is not a function"))
  ) {
    // Suppress these known polyfill warnings in serverless
    return;
  }
  originalConsoleWarn(...args);
};

import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1?target=deno";
import * as XLSX from "https://esm.sh/xlsx@0.18.5?no-dts";
import { validateCurrency } from "./currency-validator.ts";
import {
  coerceCategoryToAllowed,
  getExpenseCategories,
  getIncomeCategories,
  normalizeCategory,
  normalizeCategoryForStorage,
  sanitizeCategoryName,
} from "./category-colors.ts";
import {
  applyCategoryRemap,
  applyPreferencesToItems,
  normalizeStoredUserCategory,
} from "./user-categories.ts";
import type {
  UserCategoryPreferenceRow,
  UserCategoryRemapRow,
} from "./user-categories.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";

import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// Import new deterministic parser modules
import { parseCsvFromBytes } from "./import/csv.ts";
import type { ParsedTransaction, ParseResult } from "./import/types.ts";
import {
  parseXlsxFromBytes,
  buildXlsxPreview as buildXlsxPreviewNew,
} from "./import/xlsx.ts";
import {
  extractPdfText as extractPdfTextNew,
  splitPdfBase64IntoChunks as splitPdfChunksNew,
  isPdfPageLimitErrorMessage as isPdfPageLimitNew,
  normalizeDocumentText as normalizeDocTextNew,
  buildTableRowTexts as buildTableRowTextsNew,
  buildLineTexts as buildLineTextsNew,
  buildColumnRowTextsFromLines as buildColRowsNew,
  buildPageTextFromDocumentAiPage as buildPageTextNew,
  textAnchorToText as textAnchorNew,
  type PdfTextResult,
} from "./import/pdf.ts";

// ---------------------------------------------------------------------------
// ParsedTransaction → ExpenseItem bridge
// ---------------------------------------------------------------------------

/**
 * Convert deterministic-parser output into the ExpenseItem shape that the rest
 * of analyze-core (and the caller) expects.
 *
 * Differences handled:
 * - `category` is normalized via `normalizeCategory` (from category-colors.ts).
 * - `currencySymbol` is derived via `getCurrencySymbol` (from currency-symbols.ts).
 * - Optional fields (`breakdown`, `payerUserId`, `customSplits`) are omitted.
 */
function convertParsedTransactions(
  parsed: ParsedTransaction[],
  fallbackCurrency: string,
): ExpenseItem[] {
  return parsed.map((tx) => {
    const currency = tx.currency || fallbackCurrency;
    const description = tx.description || "";
    return {
      type: tx.type,
      amount: tx.amount,
      currency,
      currencySymbol: getCurrencySymbol(currency),
      date: tx.date,
      description,
      category: tx.category
        ? normalizeCategory(tx.category)
        : normalizeCategory(description),
    };
  });
}

// Google Cloud Document AI for efficient PDF text extraction
const DOCUMENT_AI_ENDPOINT =
  "https://us-documentai.googleapis.com/v1/projects/1075784863194/locations/us/processors/26186df0eef1dad9:process";
const GOOGLE_CLOUD_SERVICE_ACCOUNT =
  Deno.env.get("GOOGLE_CLOUD_SERVICE_ACCOUNT") || "";
const DEBUG_LOGS = Deno.env.get("ANALYZE_EXPENSE_DEBUG") === "true";
const GEMINI_FALLBACK_MODEL_NAMES = [
  "gemini-3.1-flash-lite-preview",
   "gemini-2.5-flash",
  "gemini-2.5-pro",
] as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

function b64encode(bytes: Uint8Array): string {
  return encodeBase64(bytes);
}

/**
 * @deprecated Use getGoogleCloudAccessToken from ./import/pdf.ts instead.
 * This copy is retained temporarily until all callers are migrated.
 *
 * Generates an OAuth2 access token from Google Cloud service account credentials.
 * Uses JWT signing to authenticate with Google's OAuth2 endpoint.
 */
async function getGoogleCloudAccessToken(): Promise<string | null> {
  try {
    // Parse service account JSON (handle if it's stored as-is or needs decoding)
    let serviceAccountJson = GOOGLE_CLOUD_SERVICE_ACCOUNT;

    // Check if it's a valid JSON string
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      console.log(
        "[analyze-expense] Service account JSON parse error, checking format",
      );
      return null;
    }

    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      console.log(
        "[analyze-expense] Service account missing required fields (private_key or client_email)",
      );
      return null;
    }

    // Create JWT header and claims
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const claims = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // Encode header and claims
    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const encodedClaims = btoa(JSON.stringify(claims))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const signatureInput = `${encodedHeader}.${encodedClaims}`;

    // Import private key for signing
    const privateKey = serviceAccount.private_key;
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";

    // Extract the base64 content between the PEM headers
    let pemContents = privateKey;
    if (pemContents.includes(pemHeader)) {
      pemContents = pemContents.split(pemHeader)[1];
    }
    if (pemContents.includes(pemFooter)) {
      pemContents = pemContents.split(pemFooter)[0];
    }

    // Remove all whitespace including newlines
    pemContents = pemContents.replace(/\s+/g, "");

    // Decode base64 to binary
    let binaryKey;
    try {
      binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
    } catch (decodeError) {
      console.log(
        "[analyze-expense] Failed to decode base64 private key:",
        decodeError instanceof Error
          ? decodeError.message
          : String(decodeError),
      );
      return null;
    }

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signatureInput),
    );

    const signatureArray = new Uint8Array(signature);
    const signatureChars = [];
    for (let i = 0; i < signatureArray.length; i++) {
      signatureChars.push(String.fromCharCode(signatureArray[i]));
    }
    const encodedSignature = btoa(signatureChars.join(""))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const jwt = `${signatureInput}.${encodedSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log(`[analyze-expense] Failed to get access token: ${errorText}`);
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(
      `[analyze-expense] Error generating access token: ${errorMessage}`,
    );
    return null;
  }
}

/** @deprecated Use textAnchorToText from ./import/pdf.ts. Dead code after extractPdfText migration. */
function textAnchorToText(textAnchor: any, fullText: string): string {
  if (!textAnchor || !Array.isArray(textAnchor.textSegments)) return "";
  const segments = textAnchor.textSegments;
  let content = "";
  for (const segment of segments) {
    const start = Number(segment.startIndex ?? 0);
    const end = Number(segment.endIndex ?? fullText.length);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      content += fullText.substring(start, end);
    }
  }
  return content;
}

/** @deprecated Use normalizeDocumentText from ./import/pdf.ts. Dead code after extractPdfText migration. */
function normalizeDocumentText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function injectStatementLineBreaks(text: string): string {
  let result = text;
  const datePatterns = [
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/g,
    /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
  ];

  for (const pattern of datePatterns) {
    result = result.replace(pattern, "\n$&");
  }

  return normalizeDocumentText(result);
}

function extractTransactionLines(text: string): string[] {
  const lines = text.split(/\n/).map((line) => line.trim());
  const amountPattern =
    /(€|\$|£|¥|₹)\s?\d|\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\b\d{1,3}(?:,\d{3})+\b/;
  const noisePattern =
    /(opening balance|closing balance|balance summary|statement generated|total money out|total money in)/i;

  return lines.filter(
    (line) =>
      line.length > 6 && amountPattern.test(line) && !noisePattern.test(line),
  );
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function formatDateParts(year: number, month: number, day: number): string {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateFromText(line: string, callerDate: string): string | null {
  const monthNameRegex =
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
  const monthFirstRegex = new RegExp(
    `${monthNameRegex.source}\s+(\d{1,2})(?:,\s*(\d{2,4}))?`,
    "i",
  );
  const dayFirstRegex = new RegExp(
    `(\d{1,2})\s+${monthNameRegex.source}(?:\s+(\d{2,4}))?`,
    "i",
  );

  const yearFromCaller =
    Number(callerDate.slice(0, 4)) || new Date().getFullYear();

  const monthFirstMatch = line.match(monthFirstRegex);
  if (monthFirstMatch) {
    const monthToken = monthFirstMatch[0].split(/\s+/)[0].toLowerCase();
    const month = MONTH_MAP[monthToken] || MONTH_MAP[monthToken.slice(0, 3)];
    const day = Number(monthFirstMatch[1]);
    const yearRaw = monthFirstMatch[2];
    const year = yearRaw
      ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
      : yearFromCaller;
    if (month && day) return formatDateParts(year, month, day);
  }

  const dayFirstMatch = line.match(dayFirstRegex);
  if (dayFirstMatch) {
    const monthToken = dayFirstMatch[0]
      .split(/\s+/)
      .find((token) => monthNameRegex.test(token))
      ?.toLowerCase();
    const month = monthToken
      ? MONTH_MAP[monthToken] || MONTH_MAP[monthToken.slice(0, 3)]
      : undefined;
    const day = Number(dayFirstMatch[1]);
    const yearRaw = dayFirstMatch[2];
    const year = yearRaw
      ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
      : yearFromCaller;
    if (month && day) return formatDateParts(year, month, day);
  }

  const isoMatch = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return formatDateParts(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const numericMatch = line.match(
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
  );
  if (numericMatch) {
    const first = Number(numericMatch[1]);
    const second = Number(numericMatch[2]);
    const yearRaw = numericMatch[3];
    const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);
    if (first > 12 && second <= 12) {
      return formatDateParts(year, second, first);
    }
    if (second > 12 && first <= 12) {
      return formatDateParts(year, first, second);
    }
    return formatDateParts(year, second, first);
  }

  return null;
}

function extractExplicitDateFromDescription(
  text: string,
  callerDate: string,
): { date: string; description: string } | null {
  const patterns = [
    /\b(?:on|dated)\s+(\d{4}-\d{2}-\d{2})\b/i,
    /\b(?:on|dated)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/i,
    /\b(?:on|dated)\s+((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{2,4})?)\b/i,
    /\b(?:on|dated)\s+(\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+\d{2,4})?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const rawDate = match[1]?.trim();
    if (!rawDate) continue;
    const parsedDate = parseDateFromText(rawDate, callerDate);
    if (!parsedDate) continue;
    return {
      date: parsedDate,
      description: text
        .replace(match[0], " ")
        .replace(/\s{2,}/g, " ")
        .trim(),
    };
  }

  return null;
}

export function normalizeTransactionDateAndDescription(
  rawDate: unknown,
  rawDescription: unknown,
  callerDate: string,
): { date: string; description: string } {
  const description =
    typeof rawDescription === "string"
      ? rawDescription.trim()
      : rawDescription != null
        ? String(rawDescription).trim()
        : "";

  const normalizedRawDate =
    typeof rawDate === "string" && rawDate.trim().length > 0
      ? parseDateFromText(rawDate.trim(), callerDate) || ""
      : "";

  if (normalizedRawDate) {
    return {
      date: normalizedRawDate,
      description,
    };
  }

  const explicitDate = description
    ? extractExplicitDateFromDescription(description, callerDate)
    : null;
  if (!explicitDate) {
    return {
      date: callerDate,
      description,
    };
  }

  return explicitDate;
}

function normalizeAmountString(value: string): number | null {
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

function extractAmountTokens(line: string): { raw: string; value: number }[] {
  const tokens: { raw: string; value: number }[] = [];
  const regex =
    /(€|\$|£|¥|₹)?\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\b\d{1,3}(?:,\d{3})+\b|\b\d+\b/g;
  const matches = line.match(regex) || [];
  for (const match of matches) {
    const trimmed = match.trim();
    if (/^\d{4}$/.test(trimmed) && !/(€|\$|£|¥|₹)/.test(trimmed)) {
      continue;
    }
    const value = normalizeAmountString(match);
    if (value && value >= 0.01) {
      tokens.push({ raw: match, value });
    }
  }
  return tokens;
}

function detectCurrencyFromText(line: string, callerCurrency: string): string {
  if (/€/.test(line)) return "EUR";
  if (/£/.test(line)) return "GBP";
  if (/\$/.test(line)) return "USD";
  if (/¥/.test(line)) return "JPY";
  if (/₹/.test(line)) return "INR";
  const isoMatch = line.match(/\b([A-Z]{3})\b/);
  if (isoMatch) return isoMatch[1];
  return callerCurrency;
}

function inferTypeFromText(line: string): "expense" | "income" {
  const normalized = line.toLowerCase();
  if (
    /(money in|credit|credited|deposit|salary|refund|top\s*up|received|transfer from)/.test(
      normalized,
    )
  ) {
    return "income";
  }
  if (
    /(money out|debit|purchase|paid|payment|withdrawal|card|transfer to)/.test(
      normalized,
    )
  ) {
    return "expense";
  }
  return "expense";
}

function stripAmountsAndDates(text: string): string {
  let cleaned = text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, " ")
    .replace(
      /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{2,4})?\b/gi,
      " ",
    )
    .replace(
      /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi,
      " ",
    );

  cleaned = cleaned.replace(
    /(€|\$|£|¥|₹)?\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})/g,
    " ",
  );
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned;
}

function splitLineByDateSegments(line: string, callerDate: string): string[] {
  const segments: string[] = [];
  const dateRegex =
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b[^\n]{0,20}\d{1,2}(?:,\s*\d{2,4})?|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g;

  let match: RegExpExecArray | null;
  const indices: number[] = [];
  while ((match = dateRegex.exec(line)) !== null) {
    indices.push(match.index);
  }

  if (indices.length <= 1) return [line];

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : line.length;
    const segment = line.slice(start, end).trim();
    if (segment && parseDateFromText(segment, callerDate)) {
      segments.push(segment);
    }
  }

  return segments.length > 0 ? segments : [line];
}

function buildStatementRecords(
  lines: string[],
  callerDate: string,
): { text: string; date: string | null }[] {
  const records: { text: string; date: string | null }[] = [];
  let currentText = "";
  let currentDate: string | null = null;

  for (const rawLine of lines) {
    const expanded = splitLineByDateSegments(rawLine, callerDate);
    for (const line of expanded) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const detectedDate = parseDateFromText(trimmed, callerDate);
      if (detectedDate) {
        if (currentText) {
          records.push({ text: currentText.trim(), date: currentDate });
        }
        currentText = trimmed;
        currentDate = detectedDate;
      } else if (currentText) {
        currentText = `${currentText} ${trimmed}`;
      } else {
        currentText = trimmed;
      }
    }
  }

  if (currentText) {
    records.push({ text: currentText.trim(), date: currentDate });
  }

  return records;
}

function buildDeterministicCandidates(
  text: string,
  callerDate: string,
  callerCurrency: string,
  candidateLines?: string[],
): Array<{
  type: "expense" | "income";
  amount: number;
  currency: string;
  date: string;
  description: string;
}> {
  const normalized = injectStatementLineBreaks(text);
  const lines = (
    candidateLines && candidateLines.length > 0
      ? candidateLines
      : normalized.split(/\n/)
  ).map((line) => line.trim());
  const records = buildStatementRecords(lines, callerDate);
  const candidates: Array<{
    type: "expense" | "income";
    amount: number;
    currency: string;
    date: string;
    description: string;
  }> = [];

  let lastSeenDate = callerDate;
  let columnMap: {
    date?: number;
    description?: number;
    moneyOut?: number;
    moneyIn?: number;
    amount?: number;
    balance?: number;
  } | null = null;

  for (const record of records) {
    const rawText = record.text;
    const lower = rawText.toLowerCase();

    if (
      /(opening balance|closing balance|balance summary|statement generated|total money out|total money in)/.test(
        lower,
      )
    ) {
      continue;
    }

    const parts = rawText.split("|").map((part) => part.trim());
    if (parts.length >= 3) {
      const header = parts.map((part) => part.toLowerCase());
      if (
        header.some((part) => part.includes("date")) &&
        (header.some((part) => part.includes("money out")) ||
          header.some((part) => part.includes("money in")) ||
          header.some((part) => part.includes("balance")))
      ) {
        columnMap = {
          date: header.findIndex((part) => part.includes("date")),
          description: header.findIndex((part) =>
            /(description|merchant|details)/.test(part),
          ),
          moneyOut: header.findIndex((part) => part.includes("money out")),
          moneyIn: header.findIndex((part) => part.includes("money in")),
          amount: header.findIndex((part) => part.includes("amount")),
          balance: header.findIndex((part) => part.includes("balance")),
        };
        continue;
      }
    }

    const recordDate = record.date || parseDateFromText(rawText, callerDate);
    if (recordDate) {
      lastSeenDate = recordDate;
    }

    if (columnMap && parts.length >= 3) {
      const datePart =
        columnMap.date !== undefined && columnMap.date >= 0
          ? parts[columnMap.date]
          : "";
      const descriptionPart =
        columnMap.description !== undefined && columnMap.description >= 0
          ? parts[columnMap.description]
          : rawText;
      const moneyOutPart =
        columnMap.moneyOut !== undefined && columnMap.moneyOut >= 0
          ? parts[columnMap.moneyOut]
          : "";
      const moneyInPart =
        columnMap.moneyIn !== undefined && columnMap.moneyIn >= 0
          ? parts[columnMap.moneyIn]
          : "";
      const amountPart =
        columnMap.amount !== undefined && columnMap.amount >= 0
          ? parts[columnMap.amount]
          : "";

      const dateValue =
        parseDateFromText(datePart, callerDate) || recordDate || lastSeenDate;
      const moneyOutTokens = extractAmountTokens(moneyOutPart);
      const moneyInTokens = extractAmountTokens(moneyInPart);
      const amountTokens = extractAmountTokens(amountPart);

      if (moneyOutTokens.length > 0) {
        candidates.push({
          type: "expense",
          amount: moneyOutTokens[0].value,
          currency: detectCurrencyFromText(moneyOutPart, callerCurrency),
          date: dateValue,
          description: descriptionPart || stripAmountsAndDates(rawText),
        });
        continue;
      }

      if (moneyInTokens.length > 0) {
        candidates.push({
          type: "income",
          amount: moneyInTokens[0].value,
          currency: detectCurrencyFromText(moneyInPart, callerCurrency),
          date: dateValue,
          description: descriptionPart || stripAmountsAndDates(rawText),
        });
        continue;
      }

      if (amountTokens.length > 0) {
        candidates.push({
          type: inferTypeFromText(rawText),
          amount: amountTokens[0].value,
          currency: detectCurrencyFromText(amountPart, callerCurrency),
          date: dateValue,
          description: descriptionPart || stripAmountsAndDates(rawText),
        });
        continue;
      }
    }

    const tokens = extractAmountTokens(rawText);
    if (tokens.length === 0) continue;

    const amount = tokens[0].value;
    const dateValue = recordDate || lastSeenDate || callerDate;
    const description = stripAmountsAndDates(rawText) || rawText;
    candidates.push({
      type: inferTypeFromText(rawText),
      amount,
      currency: detectCurrencyFromText(rawText, callerCurrency),
      date: dateValue,
      description,
    });
  }

  return candidates;
}

function buildItemsFromDeterministicCandidates(
  candidates: Array<{
    type: "expense" | "income";
    amount: number;
    currency: string;
    date: string;
    description: string;
  }>,
  callerCurrency: string,
  callerDate: string,
): ExpenseItem[] {
  return candidates.map((candidate) => {
    const itemCurrency = candidate.currency || callerCurrency;
    return {
      type: candidate.type,
      amount: candidate.amount,
      category: normalizeCategory(candidate.description),
      currency: itemCurrency,
      currencySymbol: getCurrencySymbol(itemCurrency),
      date: candidate.date || callerDate,
      description: candidate.description || "",
    };
  });
}

function extractDeterministicItemsFromText(
  text: string,
  callerDate: string,
  callerCurrency: string,
): ExpenseItem[] {
  const normalizedText = injectStatementLineBreaks(text);
  const transactionLines = extractTransactionLines(normalizedText);
  const candidates = buildDeterministicCandidates(
    normalizedText,
    callerDate,
    callerCurrency,
    transactionLines.length >= 10 ? transactionLines : undefined,
  );
  if (candidates.length === 0) return [];
  const items = buildItemsFromDeterministicCandidates(
    candidates,
    callerCurrency,
    callerDate,
  );
  const cleaned = deduplicateAndCleanItems(items);
  reconcileStatementTotals(normalizedText, cleaned);
  return cleaned;
}

function extractStatementItemsFromText(
  text: string,
  callerDate: string,
  callerCurrency: string,
): ExpenseItem[] {
  const rawLines = text.split(/\n/).map((line) => line.trim());
  const lines = rawLines.filter(Boolean);
  return extractStatementItemsFromLines(
    lines,
    callerDate,
    callerCurrency,
    text,
  );
}

function extractStatementItemsFromLines(
  lines: string[],
  callerDate: string,
  callerCurrency: string,
  rawTextForDebug?: string,
): ExpenseItem[] {
  const candidates: Array<{
    type: "expense" | "income";
    amount: number;
    currency: string;
    date: string;
    description: string;
  }> = [];

  let pendingDate: string | null = null;
  let pendingText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const hasTotalNoise = /\b(balance|total|subtotal|opening|closing)\b/i.test(
      line,
    );
    if (hasTotalNoise) continue;

    const dateValue = parseDateFromText(line, callerDate);
    const amountTokens = extractAmountTokens(line);

    if (dateValue && amountTokens.length > 0) {
      const amount = amountTokens[amountTokens.length - 1].value;
      const currency = detectCurrencyFromText(line, callerCurrency);
      const description = stripAmountsAndDates(line) || line;
      if (!isTotalLike(description)) {
        candidates.push({
          type: inferTypeFromText(line),
          amount,
          currency,
          date: dateValue,
          description,
        });
      }
      pendingDate = null;
      pendingText = "";
      continue;
    }

    if (dateValue && amountTokens.length === 0) {
      pendingDate = dateValue;
      pendingText = line;
      continue;
    }

    if (!dateValue && amountTokens.length > 0 && pendingDate) {
      const combined = `${pendingText} ${line}`.trim();
      const combinedTokens = extractAmountTokens(combined);
      if (combinedTokens.length > 0) {
        const amount = combinedTokens[combinedTokens.length - 1].value;
        const currency = detectCurrencyFromText(combined, callerCurrency);
        const description = stripAmountsAndDates(combined) || combined;
        if (!isTotalLike(description)) {
          candidates.push({
            type: inferTypeFromText(combined),
            amount,
            currency,
            date: pendingDate,
            description,
          });
        }
      }
      pendingDate = null;
      pendingText = "";
      continue;
    }

    if (pendingDate) {
      pendingText = `${pendingText} ${line}`.trim();
    }
  }

  if (DEBUG_LOGS) {
    console.log(
      `[analyze-expense] PDF: Statement-mode candidates ${candidates.length}`,
    );
    if (candidates.length === 0) {
      const sample = lines
        .slice(0, 20)
        .map((line) =>
          line.replace(/\d/g, (match, idx) => (idx % 6 === 0 ? match : "*")),
        );
      console.log(
        `[analyze-expense] PDF: Statement-mode sample lines (masked):\n${sample.join(
          "\n",
        )}`,
      );
    }
  }

  if (candidates.length === 0) {
    const dateRegex = new RegExp(
      "\\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[^\n]{0,12}\\d{1,2}(?:,\\s*\\d{2,4})?|\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b",
      "g",
    );
    const sourceText = rawTextForDebug ?? lines.join("\n");
    const matches = Array.from(sourceText.matchAll(dateRegex));
    const segments: string[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index ?? 0;
      const end =
        i + 1 < matches.length
          ? (matches[i + 1].index ?? sourceText.length)
          : sourceText.length;
      const segment = sourceText.slice(start, end).replace(/\s+/g, " ").trim();
      if (segment.length > 0) segments.push(segment);
    }

    for (const segment of segments) {
      const dateValue = parseDateFromText(segment, callerDate);
      if (!dateValue) continue;
      const tokens = extractAmountTokens(segment);
      if (tokens.length === 0) continue;
      const amount = tokens[tokens.length - 1].value;
      const currency = detectCurrencyFromText(segment, callerCurrency);
      const description = stripAmountsAndDates(segment) || segment;
      if (isTotalLike(description)) continue;
      candidates.push({
        type: inferTypeFromText(segment),
        amount,
        currency,
        date: dateValue,
        description,
      });
    }
  }

  if (candidates.length === 0) return [];
  const items = buildItemsFromDeterministicCandidates(
    candidates,
    callerCurrency,
    callerDate,
  );
  return deduplicateAndCleanItems(items);
}

function extractDeterministicItemsFromTableRows(
  rows: string[],
  callerDate: string,
  callerCurrency: string,
): ExpenseItem[] {
  if (!rows || rows.length === 0) return [];
  const parsedRows = rows
    .map((row) => row.split("|").map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
  if (parsedRows.length === 0) return [];

  const headerMap = detectHeaderMap(parsedRows[0]);
  const startIndex = headerMap ? 1 : 0;
  const candidates: Array<{
    type: "expense" | "income";
    amount: number;
    currency: string;
    date: string;
    description: string;
  }> = [];

  for (let i = startIndex; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const joined = row.filter(Boolean).join(" | ");
    if (!joined) continue;

    const dateText =
      headerMap && headerMap.date >= 0 ? row[headerMap.date] : joined;
    const descriptionText =
      headerMap && headerMap.description >= 0
        ? row[headerMap.description]
        : stripAmountsAndDates(joined) || joined;
    const currencyText =
      headerMap && headerMap.currency >= 0 ? row[headerMap.currency] : joined;

    let amountValue: number | null = null;
    let type: "expense" | "income" = "expense";

    if (headerMap && headerMap.moneyOut >= 0) {
      const parsed = parseSignedAmountFromCell(row[headerMap.moneyOut]);
      if (parsed) {
        amountValue = parsed.amount;
        type = "expense";
      }
    }

    if (amountValue === null && headerMap && headerMap.moneyIn >= 0) {
      const parsed = parseSignedAmountFromCell(row[headerMap.moneyIn]);
      if (parsed) {
        amountValue = parsed.amount;
        type = "income";
      }
    }

    if (amountValue === null && headerMap && headerMap.amount >= 0) {
      const parsed = parseSignedAmountFromCell(row[headerMap.amount]);
      if (parsed) {
        amountValue = parsed.amount;
        type = parsed.isNegative ? "expense" : inferTypeFromText(joined);
      }
    }

    if (amountValue === null) {
      const tokens = extractAmountTokens(joined);
      if (tokens.length > 0) {
        amountValue = tokens[0].value;
        type = inferTypeFromText(joined);
      }
    }

    if (!amountValue) continue;
    if (isTotalLike(descriptionText)) continue;

    const dateValue = parseDateFromText(dateText, callerDate) || callerDate;
    const currency =
      detectCurrencyFromText(currencyText, callerCurrency) || callerCurrency;

    candidates.push({
      type,
      amount: amountValue,
      currency,
      date: dateValue,
      description: descriptionText || "",
    });
  }

  if (candidates.length === 0) return [];
  const items = buildItemsFromDeterministicCandidates(
    candidates,
    callerCurrency,
    callerDate,
  );
  return deduplicateAndCleanItems(items);
}

function extractStatementTotals(text: string): {
  totalOut?: number;
  totalIn?: number;
} {
  const normalized = text.replace(/\s+/g, " ");
  const totals: { totalOut?: number; totalIn?: number } = {};

  const moneyOutMatch = normalized.match(
    /(total\s+money\s+out|money\s+out\s+total|total\s+out)\s*([€\$£¥₹]?\s?[0-9.,]+)/i,
  );
  if (moneyOutMatch?.[2]) {
    const amount = normalizeAmountString(moneyOutMatch[2]);
    if (amount) totals.totalOut = amount;
  }

  const moneyInMatch = normalized.match(
    /(total\s+money\s+in|money\s+in\s+total|total\s+in)\s*([€\$£¥₹]?\s?[0-9.,]+)/i,
  );
  if (moneyInMatch?.[2]) {
    const amount = normalizeAmountString(moneyInMatch[2]);
    if (amount) totals.totalIn = amount;
  }

  return totals;
}

function reconcileStatementTotals(text: string, items: ExpenseItem[]): void {
  const { totalOut, totalIn } = extractStatementTotals(text);
  if (!totalOut && !totalIn) return;

  const sumOut = items
    .filter((item) => item.type === "expense")
    .reduce((acc, item) => acc + item.amount, 0);
  const sumIn = items
    .filter((item) => item.type === "income")
    .reduce((acc, item) => acc + item.amount, 0);

  const tolerance = 0.01;

  if (totalOut && Math.abs(totalOut - sumOut) > tolerance) {
    console.warn(
      `[analyze-expense] Reconciliation warning: money out total ${totalOut.toFixed(
        2,
      )} vs extracted ${sumOut.toFixed(2)} (diff ${(totalOut - sumOut).toFixed(
        2,
      )})`,
    );
  }

  if (totalIn && Math.abs(totalIn - sumIn) > tolerance) {
    console.warn(
      `[analyze-expense] Reconciliation warning: money in total ${totalIn.toFixed(
        2,
      )} vs extracted ${sumIn.toFixed(2)} (diff ${(totalIn - sumIn).toFixed(
        2,
      )})`,
    );
  }
}

async function resolveCandidateCategories(
  genAI: GoogleGenerativeAI,
  candidates: Array<{
    type: "expense" | "income";
    amount: number;
    currency: string;
    date: string;
    description: string;
  }>,
  expenseCategories: string[],
  incomeCategories: string[],
  language: string,
  onProgress?: ProgressCallback,
): Promise<string[]> {
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

  const request = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a transaction categorization engine.\nReturn exactly ${candidates.length} categories in the same order as the input.\nUse only the allowed categories.\nExpense categories: ${expenseCategories.join(
              ", ",
            )}\nIncome categories: ${incomeCategories.join(
              ", ",
            )}\nLanguage: ${language}\n\nTransactions:\n${candidates
              .map(
                (item, index) =>
                  `${
                    index + 1
                  }. ${item.type.toUpperCase()} | ${item.date} | ${item.description} | ${item.amount} ${item.currency}`,
              )
              .join("\n")}`,
          },
        ],
      },
    ],
    toolConfig: {
      functionCallingConfig: CATEGORIZE_TRANSACTIONS_FUNCTION_CALLING_CONFIG,
    },
    generationConfig: { maxOutputTokens: 4096 },
  } as any;

  const modelNames = [...GEMINI_FALLBACK_MODEL_NAMES];
  let response: any = null;
  let lastError: unknown = null;
  for (let modelIndex = 0; modelIndex < modelNames.length; modelIndex++) {
    const modelName = modelNames[modelIndex];
    if (onProgress) {
      onProgress({
        type: "analyzing_chunk",
        message:
          modelIndex === 0
            ? "Sorting your transactions into categories..."
            : "Refining category mapping for accuracy...",
      });
    }

    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        tools: tools as any,
      });
      response = await generateGeminiWithRetry({
        model,
        modelName,
        request,
        timeoutMs: 30000,
        maxRetries: 1,
      });
      break;
    } catch (error) {
      lastError = error;
      if (!isRetriableGeminiError(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[analyze-expense] Categorization model ${modelName} failed: ${message}`,
      );
    }
  }
  if (!response) {
    throw lastError ?? new Error("Category resolution failed");
  }

  const toolCalls = getFunctionCalls(response).filter(
    (call: any) => call && call.name === "categorize_transactions",
  );

  if (toolCalls.length > 0) {
    for (const call of toolCalls) {
      const categories = Array.isArray(call.args?.categories)
        ? call.args.categories
        : [];
      if (categories.length === candidates.length) {
        return categories.map((cat: string) =>
          normalizeCategoryForStorage(cat),
        );
      }
    }
  }

  return candidates.map((candidate) =>
    normalizeCategory(candidate.description),
  );
}

/** @deprecated Use buildTableRowTexts from ./import/pdf.ts. Dead code after extractPdfText migration. */
function buildTableRowTexts(page: any, fullText: string): string[] {
  if (!page || !Array.isArray(page.tables)) return [];
  const rows: string[] = [];

  for (const table of page.tables) {
    const tableRows = [...(table.headerRows ?? []), ...(table.bodyRows ?? [])];

    for (const row of tableRows) {
      const cells = Array.isArray(row.cells) ? row.cells : [];
      const cellTexts: string[] = [];
      for (const cell of cells) {
        const cellText = textAnchorToText(cell.layout?.textAnchor, fullText)
          .replace(/\s+/g, " ")
          .trim();
        if (cellText.length > 0) {
          cellTexts.push(cellText);
        }
      }

      if (cellTexts.length > 0) {
        rows.push(cellTexts.join(" | "));
      }
    }
  }

  return rows;
}

/** @deprecated Use buildLineTexts from ./import/pdf.ts. Dead code after extractPdfText migration. */
function buildLineTexts(page: any, fullText: string): string[] {
  if (!page || !Array.isArray(page.lines)) return [];
  const lines: string[] = [];

  for (const line of page.lines) {
    const lineText = textAnchorToText(line.layout?.textAnchor, fullText)
      .replace(/\s+/g, " ")
      .trim();
    if (lineText) {
      lines.push(lineText);
    }
  }

  return lines;
}

/** @deprecated Use buildColumnRowTextsFromLines from ./import/pdf.ts. Dead code after extractPdfText migration. */
function buildColumnRowTextsFromLines(lines: string[]): string[] {
  if (!lines || lines.length === 0) return [];
  return lines
    .map((line) => line.replace(/\s{2,}/g, " | ").trim())
    .filter((line) => line.includes("|"));
}

/** @deprecated Use buildPageTextFromDocumentAiPage from ./import/pdf.ts. Dead code after extractPdfText migration. */
function buildPageTextFromDocumentAiPage(page: any, fullText: string): string {
  const tableRows = buildTableRowTexts(page, fullText);
  if (tableRows.length > 0) {
    return tableRows.join("\n");
  }

  const lineTexts = buildLineTexts(page, fullText);
  if (lineTexts.length > 0) {
    return lineTexts.join("\n");
  }

  if (page?.layout?.textAnchor) {
    return textAnchorToText(page.layout.textAnchor, fullText);
  }

  return "";
}

/**
 * @deprecated Use extractPdfText from ./import/pdf.ts instead.
 * All callers have been migrated to extractPdfTextNew.
 * Retained temporarily for safety — remove after confirming no regressions.
 *
 * Extracts text from PDF using Google Cloud Document AI.
 * This reduces token usage by 80-90% compared to sending raw PDFs to Gemini.
 * Falls back to Gemini's native processing if Document AI is not configured.
 */
async function extractPdfText(base64Pdf: string): Promise<{
  text: string;
  pageCount: number;
  pages?: string[];
  tableRows?: string[];
  lineTexts?: string[];
} | null> {
  // Check if Document AI service account is configured
  if (!GOOGLE_CLOUD_SERVICE_ACCOUNT) {
    console.log(
      "[analyze-expense] PDF: Document AI service account not configured, will use Gemini native processing",
    );
    return null;
  }

  try {
    console.log(
      "[analyze-expense] PDF: Extracting text with Google Cloud Document AI",
    );

    // Generate OAuth2 access token from service account
    const accessToken = await getGoogleCloudAccessToken();
    if (!accessToken) {
      console.log(
        "[analyze-expense] PDF: Failed to get access token, will use Gemini native processing",
      );
      return null;
    }

    // Call Document AI API with OAuth2 token
    const response = await fetch(DOCUMENT_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64Pdf,
          mimeType: "application/pdf",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(
        `[analyze-expense] PDF: Document AI failed (${response.status}): ${errorText}`,
      );
      return null;
    }

    const data = await response.json();

    if (!data.document || !data.document.text) {
      console.log("[analyze-expense] PDF: No text extracted from Document AI");
      return null;
    }

    const fullText = data.document.text;
    const pages = data.document.pages || [];
    const totalPages = pages.length;

    // Extract per-page text for parallel processing
    const pageTexts: string[] = [];
    const tableRows: string[] = [];
    const inferredRows: string[] = [];
    const collectedLineTexts: string[] = [];
    for (const page of pages) {
      const pageTableRows = buildTableRowTexts(page, fullText);
      if (pageTableRows.length > 0) {
        tableRows.push(...pageTableRows);
      }
      const pageLineTexts = buildLineTexts(page, fullText);
      const columnRows = buildColumnRowTextsFromLines(pageLineTexts);
      if (columnRows.length > 0) {
        inferredRows.push(...columnRows);
      }
      if (pageLineTexts.length > 0) {
        collectedLineTexts.push(...pageLineTexts);
      }
      const pageText = buildPageTextFromDocumentAiPage(page, fullText);
      const cleaned = normalizeDocumentText(pageText);
      if (cleaned.length > 0) {
        pageTexts.push(cleaned);
        const extraRows = buildColumnRowTextsFromLines(cleaned.split("\n"));
        if (extraRows.length > 0) {
          inferredRows.push(...extraRows);
        }
      }
    }

    // Validate extracted text
    const fallbackText = normalizeDocumentText(fullText);
    const cleanText =
      pageTexts.length > 0
        ? normalizeDocumentText(pageTexts.join("\n\n"))
        : fallbackText;
    const hasSubstantialText = cleanText.length > 50;
    const hasTransactionLikeContent =
      /\d+\.\d{2}|\$|€|£|¥|₹/.test(cleanText) || // Has currency-like amounts
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(cleanText); // Has date-like patterns

    if (hasSubstantialText && hasTransactionLikeContent) {
      // For large PDFs (>3 pages), provide per-page text for parallel processing
      let pagesForProcessing: string[] | undefined;
      if (totalPages > 3 && pageTexts.length > 1) {
        pagesForProcessing = pageTexts.filter((p) => p.length > 0);
      }

      console.log(
        `[analyze-expense] ✅ PDF: Document AI extraction SUCCESS - ${totalPages} pages, ${cleanText.length} chars` +
          (pagesForProcessing
            ? `, ${pagesForProcessing.length} page chunks for parallel processing`
            : ""),
      );
      console.log(
        "[analyze-expense] 🚀 Using Document AI (not Gemini vision mode)",
      );

      const finalTableRows =
        tableRows.length > 0
          ? tableRows
          : inferredRows.length > 0
            ? inferredRows
            : undefined;

      return {
        text: cleanText,
        pageCount: totalPages,
        pages: pagesForProcessing,
        tableRows: finalTableRows,
        lineTexts:
          collectedLineTexts.length > 0 ? collectedLineTexts : undefined,
      };
    }

    console.log(
      `[analyze-expense] PDF: Insufficient text from Document AI (${cleanText.length} chars, has transaction patterns: ${hasTransactionLikeContent})`,
    );
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(
      `[analyze-expense] PDF: Document AI extraction failed: ${errorMessage}`,
    );
    return null;
  }
}

/** @deprecated Use splitPdfBase64IntoChunks from ./import/pdf.ts. All callers migrated to splitPdfChunksNew. */
async function splitPdfBase64IntoChunks(
  base64Pdf: string,
  maxPagesPerChunk: number,
): Promise<{
  chunks: string[];
  pageCount: number;
} | null> {
  try {
    const sourceBytes = decodeBase64(base64Pdf);
    const source = await PDFDocument.load(sourceBytes, {
      ignoreEncryption: true,
    });

    const totalPages = source.getPageCount();
    if (totalPages <= 0) {
      return null;
    }

    if (totalPages <= maxPagesPerChunk) {
      return { chunks: [base64Pdf], pageCount: totalPages };
    }

    const chunks: string[] = [];
    for (let start = 0; start < totalPages; start += maxPagesPerChunk) {
      const end = Math.min(start + maxPagesPerChunk, totalPages);
      const chunkDoc = await PDFDocument.create();
      const pageIndices = Array.from(
        { length: end - start },
        (_, idx) => start + idx,
      );
      const copiedPages = await chunkDoc.copyPages(source, pageIndices);
      for (const page of copiedPages) {
        chunkDoc.addPage(page);
      }
      const chunkBytes = await chunkDoc.save();
      chunks.push(encodeBase64(chunkBytes));
    }

    return { chunks, pageCount: totalPages };
  } catch (error) {
    console.warn(
      "[analyze-expense] PDF split failed, continuing unsplit",
      error,
    );
    return null;
  }
}

function getFunctionCalls(response: any) {
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

const ADD_TRANSACTIONS_FUNCTION_CALLING_CONFIG = {
  mode: "ANY",
  allowedFunctionNames: ["add_transactions"],
};

const CATEGORIZE_TRANSACTIONS_FUNCTION_CALLING_CONFIG = {
  mode: "ANY",
  allowedFunctionNames: ["categorize_transactions"],
};

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

  // Optional: caller-provided allowed categories (defaults + user custom merged upstream)
  allowedExpenseCategories?: string[];
  allowedIncomeCategories?: string[];

  // Optional: learned user preferences for category assignment
  categoryPreferences?: UserCategoryPreferenceRow[];

  // Optional: explicit user category remaps (hard gate)
  categoryRemaps?: UserCategoryRemapRow[];
}

export interface AnalyzeResult {
  success: boolean;
  items?: ExpenseItem[];
  language: string;
  error?: string;
  code?: string;
  status?: number;
  /** Structured diagnostics from deterministic parsers (CSV/XLSX/PDF). */
  diagnostics?: import("./import/types.ts").ParseDiagnostics;
}

export interface HouseholdMemberContext {
  userId: string;
  memberKey?: string;
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
  breakdown?: string[];
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
          "- Match names/aliases/member keys from the provided member list (case-insensitive).",
          "- 'me', 'myself', 'I', '我', '나' → caller",
          "- Pronouns (him/her/them) → Context-dependent or last mentioned member",
        ]
      : []),

    "FINAL RULE: Under no circumstances output plain text or JSON. Always and only respond by calling add_transactions.",
  ].join("\n");
}

function isQuickTextFastPathCandidate(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > 320) return false;
  const lineCount = trimmed.split(/\n+/).filter(Boolean).length;
  if (lineCount > 4) return false;
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return wordCount <= 50;
}

function buildQuickTextSystemInstruction(
  language: string,
  expenseCategories: string[],
  incomeCategories: string[],
  householdContext: ReturnType<typeof resolveHouseholdContext> | null,
  typeHint?: AnalyzeRequestBody["typeHint"],
): string {
  const normalizedHint =
    typeHint && typeHint !== "mixed" ? `Hint: ${typeHint}.` : "";

  return [
    "You extract transactions from short user text.",
    "Return transactions only by calling add_transactions.",
    "Do not output prose or JSON.",
    normalizedHint,
    `Expense categories: ${expenseCategories.join(", ")}.`,
    `Income categories: ${incomeCategories.join(", ")}.`,
    "Rules:",
    "- Amount must be positive.",
    "- Infer expense|income from wording.",
    "- If input contains multiple amount phrases, return one item per phrase.",
    "- For compound text joined with words like 'and', still extract each transaction separately.",
    "- Category must be selected semantically from the provided category lists.",
    "- Use 'other' only when the text is truly ambiguous.",
    "- Use caller currency/date when absent.",
    "- Description should be short and natural.",
    `- Free-text fields must be in ${language}.`,
    ...(householdContext
      ? [
          "- Household context is present for expenses.",
          "- Set payerUserId only when someone else paid.",
          "- Provide customSplits only for explicit non-equal splits.",
        ]
      : []),
  ]
    .filter((line) => line.length > 0)
    .join("\n");
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
    .map((m, index) => ({
      userId: sanitizeUuid(m.userId) || "",
      memberKey: `m${index + 1}`,
      userName: (m.userName || null) as string | null,
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
  const memberKey = (member.memberKey || "").trim();

  if (name) {
    aliases.add(name);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      aliases.add(parts[0]);
      aliases.add(parts[parts.length - 1]);
    }
  }

  if (memberKey) aliases.add(memberKey);

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
      (m.userName || m.memberKey || "member").toString().trim() || "member";
    const aliases = ctx.aliasesByUserId.get(m.userId) ?? [];
    const aliasHint =
      aliases.length > 0 ? ` (aliases: ${aliases.join(", ")})` : "";
    return `- ${label}${aliasHint}: member key ${m.memberKey}`;
  });
  return [
    "Caller Aliases: me, myself, i, my, mine",
    "Caller Household Members (name/alias -> member key):",
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

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const tryParse = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(withoutFence);
  if (direct) return direct as Record<string, unknown>;

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sliced = withoutFence.slice(start, end + 1);
    const parsed = tryParse(sliced);
    if (parsed) return parsed as Record<string, unknown>;
  }

  return null;
}

async function preprocessExtractedTextWithGemini(
  genAI: GoogleGenerativeAI,
  rawText: string,
  sourceLabel: string,
  onProgress?: ProgressCallback,
): Promise<string | null> {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  if (onProgress) {
    onProgress({
      type: "extracting_text",
      message: "Normalizing extracted text",
    });
  }

  const modelNames = [...GEMINI_FALLBACK_MODEL_NAMES];

  const schemaLine =
    '{"formatVersion":1,"source":"' +
    sourceLabel +
    '","normalizedText":"string","lines":["string"],"tables":[["string"]]}';

  try {
    const request = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "You are a document normalization engine. Convert the raw extracted content into a JSON object without losing any information.",
                "Return ONLY valid JSON, no markdown fences, no commentary.",
                "",
                "Required JSON schema (all keys required):",
                schemaLine,
                "",
                "Rules:",
                "- Preserve all content from the input. If unsure, include it in normalizedText and lines.",
                "- normalizedText should be a cleaned version with line breaks kept.",
                "- lines should include every meaningful line in order.",
                "- tables should capture row-like data if present; otherwise return an empty array.",
                "",
                "Raw content:",
                trimmed,
              ].join("\n"),
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 8192 },
    } as any;

    let response: any = null;
    let lastError: unknown = null;
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        response = await generateGeminiWithRetry({
          model,
          modelName,
          request,
          timeoutMs: 30000,
        });
        break;
      } catch (error) {
        lastError = error;
        if (!isRetriableGeminiError(error)) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[analyze-expense] Preprocess model ${modelName} failed: ${message}`,
        );
      }
    }
    if (!response) {
      throw lastError ?? new Error("Preprocess normalization failed");
    }

    const responseText = response?.response?.text?.() || "";
    const parsed = extractJsonObject(responseText);
    if (!parsed) return null;

    return JSON.stringify(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[analyze-expense] Preprocess normalization failed: ${message}`,
    );
    return null;
  }
}

async function extractTransactionsJsonWithGemini(
  genAI: GoogleGenerativeAI,
  rawText: string,
  callerCurrency: string,
  callerDate: string,
): Promise<string | null> {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const modelNames = [...GEMINI_FALLBACK_MODEL_NAMES];
  const request = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "You are a transaction extraction engine for bank statements and exports.",
              "Extract every transaction row from the raw text and return ONLY valid JSON.",
              "No markdown, no commentary, no extra keys.",
              "",
              "Required JSON schema:",
              '{"transactions":[{"date":"YYYY-MM-DD","description":"string","amount":0,"currency":"USD","type":"expense|income"}]}',
              "",
              "Rules:",
              "- Return ALL transactions; never summarize or collapse into totals.",
              "- Skip opening/closing balance lines and totals.",
              "- Use caller date if no date is present in a row.",
              "- Use caller currency if missing.",
              `Caller Date: ${callerDate}`,
              `Caller Currency: ${callerCurrency}`,
              "",
              "Raw content:",
              trimmed,
            ].join("\n"),
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 8192 },
  } as any;

  try {
    let response: any = null;
    let lastError: unknown = null;
    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        response = await generateGeminiWithRetry({
          model,
          modelName,
          request,
          timeoutMs: 60000,
        });
        break;
      } catch (error) {
        lastError = error;
        if (!isRetriableGeminiError(error)) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[analyze-expense] Transaction JSON model ${modelName} failed: ${message}`,
        );
      }
    }
    if (!response) {
      throw lastError ?? new Error("Transaction JSON extraction failed");
    }
    const responseText = response?.response?.text?.() || "";
    const parsed = extractJsonObject(responseText);
    if (!parsed) return null;
    return JSON.stringify(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[analyze-expense] Transaction JSON extraction failed: ${message}`,
    );
    return null;
  }
}

function mergeTransactionJsonSnippets(snippets: string[]): string | null {
  const all: Array<{
    date?: string;
    description?: string;
    amount?: number;
    currency?: string;
    type?: string;
  }> = [];

  for (const snippet of snippets) {
    if (!snippet) continue;
    const parsed = extractJsonObject(snippet) as any;
    const items = Array.isArray(parsed?.transactions)
      ? parsed.transactions
      : [];
    for (const item of items) {
      all.push(item || {});
    }
  }

  if (all.length === 0) return null;

  const seen = new Set<string>();
  const deduped = all.filter((item) => {
    const key = `${item.date || ""}|${item.amount || ""}|${(
      item.description || ""
    )
      .toLowerCase()
      .slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return JSON.stringify({ transactions: deduped });
}

function parseTransactionsJsonToItems(
  jsonText: string,
  callerCurrency: string,
  callerDate: string,
): ExpenseItem[] {
  const parsed = extractJsonObject(jsonText) as any;
  const items = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
  if (items.length === 0) return [];

  const results: ExpenseItem[] = [];
  for (const item of items) {
    const rawDescription =
      typeof item?.description === "string"
        ? item.description
        : item?.description != null
          ? String(item.description)
          : "";
    const description = rawDescription
      .trim()
      .replace(/^description\s*[:=]\s*/i, "")
      .replace(/^"+|"+$/g, "");
    const amount = Math.abs(Number(item?.amount));
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const currency =
      typeof item?.currency === "string" && item.currency.trim()
        ? item.currency.trim()
        : callerCurrency;
    const normalizedDateAndDescription = normalizeTransactionDateAndDescription(
      item?.date,
      description,
      callerDate,
    );
    const typeRaw = String(item?.type || "").toLowerCase();
    const type =
      typeRaw === "income" || typeRaw === "expense"
        ? (typeRaw as "income" | "expense")
        : inferTypeFromText(description);

    results.push({
      type,
      amount,
      category: normalizeCategory(description),
      currency,
      currencySymbol: getCurrencySymbol(currency),
      date: normalizedDateAndDescription.date,
      description: normalizedDateAndDescription.description,
    });
  }

  return deduplicateAndCleanItems(results);
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

  const normalizedText = injectStatementLineBreaks(bodyText);
  const transactionLines = extractTransactionLines(normalizedText);
  const deterministicCandidates = buildDeterministicCandidates(
    normalizedText,
    callerDate,
    callerCurrency,
    transactionLines.length >= 20 ? transactionLines : undefined,
  );
  const analysisText =
    transactionLines.length >= 20
      ? transactionLines.join("\n")
      : normalizedText;

  if (DEBUG_LOGS && transactionLines.length >= 20) {
    console.log(
      `[analyze-expense] Text: Using ${transactionLines.length} transaction-like lines for analysis`,
    );
  }

  if (deterministicCandidates.length > 0) {
    console.log(
      `[analyze-expense] Text: Deterministic parser found ${deterministicCandidates.length} candidates`,
    );
  }

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
      const processedPage = injectStatementLineBreaks(page);
      if (processedPage.length > CHUNK_THRESHOLD) {
        // Page is too large, flush current and split this page
        if (currentChunk.trim()) textChunks.push(currentChunk.trim());
        textChunks.push(...splitTextIntoChunks(processedPage, CHUNK_THRESHOLD));
        currentChunk = "";
      } else if (
        currentChunk.length + processedPage.length + 2 >
        CHUNK_THRESHOLD
      ) {
        // Adding this page would exceed limit, flush current
        if (currentChunk.trim()) textChunks.push(currentChunk.trim());
        currentChunk = processedPage;
      } else {
        // Combine pages
        currentChunk += (currentChunk ? "\n\n" : "") + processedPage;
      }
    }
    if (currentChunk.trim()) textChunks.push(currentChunk.trim());
  } else {
    textChunks =
      analysisText.length > CHUNK_THRESHOLD
        ? splitTextIntoChunks(analysisText, CHUNK_THRESHOLD)
        : [analysisText];
  }

  const isMultiChunk = textChunks.length > 1;

  if (DEBUG_LOGS) {
    console.log(
      `[analyze-expense] Text: Processing ${textChunks.length} chunk(s) ${
        isMultiChunk ? "IN PARALLEL" : ""
      }, total length=${analysisText.length}`,
    );
  }

  // Report progress: starting chunk analysis
  if (onProgress && textChunks.length > 0) {
    onProgress({
      type: "analyzing_chunk",
      current: 0,
      total: textChunks.length,
      message: `Processing ${textChunks.length} chunk(s)`,
    });
  }

  // Deterministic path for statement-like inputs: reduce LLM to categorization only
  if (deterministicCandidates.length >= 30) {
    const categories = await resolveCandidateCategories(
      genAI,
      deterministicCandidates,
      expenseCategories,
      incomeCategories,
      language,
      onProgress,
    );

    const deterministicItems: ExpenseItem[] = deterministicCandidates.map(
      (candidate, index) => {
        const category = categories[index] || "other";
        const itemCurrency = candidate.currency || callerCurrency;
        const itemCurrencySymbol = getCurrencySymbol(itemCurrency);
        return {
          type: candidate.type,
          amount: candidate.amount,
          category,
          currency: itemCurrency,
          currencySymbol: itemCurrencySymbol,
          date: candidate.date || callerDate,
          description: candidate.description || "",
        };
      },
    );

    const cleaned = deduplicateAndCleanItems(deterministicItems);
    reconcileStatementTotals(normalizedText, cleaned);
    console.log(
      `[analyze-expense] Text: Deterministic final count ${cleaned.length} (from ${deterministicCandidates.length} raw)`,
    );
    return cleaned;
  }

  // Process single chunk directly (no parallelism needed)
  if (!isMultiChunk) {
    try {
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
        onProgress,
      );
      return deduplicateAndCleanItems(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[analyze-expense] Text: LLM failed: ${message}`);
      if (deterministicCandidates.length > 0) {
        console.warn(
          `[analyze-expense] Text: Falling back to deterministic candidates (${deterministicCandidates.length})`,
        );
        const fallbackItems = buildItemsFromDeterministicCandidates(
          deterministicCandidates,
          callerCurrency,
          callerDate,
        );
        const cleaned = deduplicateAndCleanItems(fallbackItems);
        reconcileStatementTotals(normalizedText, cleaned);
        return cleaned;
      }
      return [];
    }
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

    if (DEBUG_LOGS) {
      console.log(
        `[analyze-expense] Text: Processing parallel batch ${
          Math.floor(batchStart / MAX_CONCURRENT) + 1
        }/${Math.ceil(textChunks.length / MAX_CONCURRENT)} (chunks ${
          batchStart + 1
        }-${batchEnd})`,
      );
    }

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
        onProgress,
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
  let cleanedItems = deduplicateAndCleanItems(allItems);
  if (cleanedItems.length === 0 && deterministicCandidates.length > 0) {
    console.warn(
      `[analyze-expense] Text: Falling back to deterministic candidates (${deterministicCandidates.length})`,
    );
    const fallbackItems = buildItemsFromDeterministicCandidates(
      deterministicCandidates,
      callerCurrency,
      callerDate,
    );
    cleanedItems = deduplicateAndCleanItems(fallbackItems);
    reconcileStatementTotals(normalizedText, cleanedItems);
  }
  console.log(
    `[analyze-expense] Text: Final count after dedup: ${cleanedItems.length} items (from ${allItems.length} raw)`,
  );

  return cleanedItems;
}

async function analyzeFromQuickText(
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
  onProgress?: ProgressCallback,
): Promise<ExpenseItem[]> {
  const systemInstruction = buildQuickTextSystemInstruction(
    language,
    expenseCategories,
    incomeCategories,
    householdContext,
    typeHint,
  );
  const householdPrompt = householdContext
    ? `\n${buildHouseholdContextPrompt(householdContext)}\n`
    : "\n";

  const request = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `Caller Currency: ${callerCurrency}\n` +
              `Caller Date: ${callerDate}` +
              householdPrompt +
              `User: ${bodyText.trim()}`,
          },
        ],
      },
    ],
    toolConfig: {
      functionCallingConfig: ADD_TRANSACTIONS_FUNCTION_CALLING_CONFIG,
    },
    generationConfig: {
      maxOutputTokens: 1024,
      candidateCount: 1,
      temperature: 0,
      topP: 0.8,
    },
  } as any;

  const quickModelAttempts = GEMINI_FALLBACK_MODEL_NAMES.map((name) => ({
    name,
    timeoutMs: 60000,
    maxRetries: 1,
  }));

  let lastError = "";

  for (let index = 0; index < quickModelAttempts.length; index++) {
    const attempt = quickModelAttempts[index];
    if (onProgress) {
      onProgress({
        type: "analyzing_chunk",
        current: index + 1,
        total: quickModelAttempts.length,
        message:
          index === 0
            ? "Understanding your transaction details..."
            : "Refining transaction details for accuracy...",
      });
    }

    try {
      const model = genAI.getGenerativeModel({
        model: attempt.name,
        tools,
        systemInstruction,
      });
      const response = await generateGeminiWithRetry({
        model,
        modelName: attempt.name,
        request,
        timeoutMs: attempt.timeoutMs,
        maxRetries: attempt.maxRetries,
      });

      const toolCalls = getFunctionCalls(response).filter(
        (call: any) => call && call.name === "add_transactions",
      );
      if (toolCalls.length === 0) {
        lastError = `${attempt.name} returned no tool calls`;
        continue;
      }

      const rawItems: any[] = toolCalls.flatMap((call: any) =>
        Array.isArray(call.args?.items) ? call.args.items : [],
      );

      const aiItems = deduplicateAndCleanItems(
        processRawItems(
          rawItems,
          callerCurrency,
          callerDate,
          householdContext,
          "QuickText",
        ),
        { skipTotalSumHeuristic: true },
      );

      if (aiItems.length > 0) return aiItems;
      lastError = `${attempt.name} returned empty items`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = `${attempt.name} failed: ${message}`;
      console.warn(`[analyze-expense] QuickText model failure: ${lastError}`);
    }
  }

  throw new Error(lastError || "Quick text AI extraction failed");
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
  onProgress?: ProgressCallback,
): Promise<ExpenseItem[]> {
  const isMultiChunk = totalChunks > 1;

  // Log a preview of the chunk being processed
  if (DEBUG_LOGS) {
    const chunkPreview = chunk.substring(0, 500).replace(/\n/g, " ");
    console.log(
      `[analyze-expense] Text-chunk${
        chunkIndex + 1
      } preview (${chunk.length} chars): ${chunkPreview}...`,
    );
  }

  const chunkPrompt = isMultiChunk
    ? `BULK IMPORT - Part ${chunkIndex + 1} of ${totalChunks}:
Extract ALL transactions from this text segment. Each line that contains an amount should be treated as a separate transaction.
Do NOT summarize - extract every single transaction.

`
    : "";

  const modelNames = [...GEMINI_FALLBACK_MODEL_NAMES];

  const request = {
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
    toolConfig: {
      functionCallingConfig: ADD_TRANSACTIONS_FUNCTION_CALLING_CONFIG,
    },
    generationConfig: { maxOutputTokens: 32768 },
  } as any;

  let response: any = null;
  let lastError: unknown = null;
  for (let modelIndex = 0; modelIndex < modelNames.length; modelIndex++) {
    const modelName = modelNames[modelIndex];
    if (onProgress) {
      if (isMultiChunk) {
        onProgress({
          type: "analyzing_chunk",
          message:
            modelIndex === 0
              ? `Reviewing part ${chunkIndex + 1}...`
              : `Retrying part ${chunkIndex + 1} with another method...`,
        });
      } else {
        onProgress({
          type: "analyzing_chunk",
          current: modelIndex + 1,
          total: modelNames.length,
          message:
            modelIndex === 0
              ? "Understanding your transaction details..."
              : "Refining transaction details for accuracy...",
        });
      }
    }

    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        tools,
        systemInstruction,
      });
      response = await generateGeminiWithRetry({
        model,
        modelName,
        request,
        timeoutMs: 60000,
      });
      break;
    } catch (error) {
      lastError = error;
      if (!isRetriableGeminiError(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[analyze-expense] Text chunk model ${modelName} failed: ${message}`,
      );
    }
  }
  if (!response) {
    throw lastError ?? new Error("Text chunk analysis failed");
  }

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

    if (DEBUG_LOGS) {
      console.log(
        `[analyze-expense] Text: Chunk ${
          chunkIndex + 1
        } extracted ${itemsWithDesc.length} items`,
      );
    }
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
      const normalizedCategory = normalizeCategoryForStorage(rawCategory);
      const normalizedDateAndDescription =
        normalizeTransactionDateAndDescription(
          it.date,
          it.description,
          callerDate,
        );

      if (DEBUG_LOGS) {
        console.log(
          `[analyze-expense] ${logPrefix} raw: amount=${it.amount}, category="${rawCategory}" -> "${normalizedCategory}"`,
        );
      }

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
      if (DEBUG_LOGS && householdContext && resolvedType === "expense") {
        console.log(
          `[analyze-expense] ${logPrefix} household split: payerUserId=${
            payerUserId || "(caller)"
          }, ` +
            `rawCustomSplits=${JSON.stringify(it.customSplits)}, ` +
            `normalizedSplits=${JSON.stringify(
              customSplits?.memberSplits?.map((m) => ({
                userId: m.userId.slice(-8),
                amount: m.amount,
              })),
            )}`,
        );
      }

      return {
        type: resolvedType,
        amount,
        category: normalizedCategory,
        currency: itemCurrency,
        currencySymbol: itemCurrencySymbol,
        date: normalizedDateAndDescription.date,
        description: normalizedDateAndDescription.description,
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

      if (DEBUG_LOGS && !isValid) {
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
function deduplicateAndCleanItems(
  items: ExpenseItem[],
  options?: {
    skipTotalSumHeuristic?: boolean;
  },
): ExpenseItem[] {
  if (items.length <= 1) return items;

  // Remove total-like entries
  const withoutTotals = items.filter((it) => !isTotalLike(it.description));
  let result = withoutTotals.length > 0 ? withoutTotals : items;

  if (!options?.skipTotalSumHeuristic) {
    // Remove items that equal the sum of other items (likely totals)
    const sums = result.map((_, i) =>
      result
        .filter((__, j) => i !== j)
        .reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0),
    );
    result = result.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);
  }

  // Deduplicate by (date, amount, description) composite key
  // Be conservative when description is missing to avoid dropping valid rows
  const seen = new Set<string>();
  return result.filter((item) => {
    const normalizedDescription = (item.description || "").toLowerCase().trim();
    if (normalizedDescription.length < 3) {
      return true;
    }
    const key = `${item.date}|${item.amount.toFixed(2)}|${normalizedDescription.slice(
      0,
      50,
    )}`;
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

  const textResult = await extractPdfTextNew(base64Pdf);

  if (textResult && textResult.text.length > 0) {
    const rawText =
      textResult.pages && textResult.pages.length > 0
        ? textResult.pages.join("\n\n")
        : textResult.text;
    const hasPageChunks = textResult.pages && textResult.pages.length > 1;
    console.log(
      `[analyze-expense] PDF: Using text mode (${textResult.pageCount} pages, ${textResult.text.length} chars)` +
        (hasPageChunks
          ? ` with ${
              textResult.pages!.length
            } page chunks for parallel processing`
          : ""),
    );
    if (DEBUG_LOGS) {
      console.log(
        `[analyze-expense] PDF: Table rows available: ${
          textResult.tableRows?.length ?? 0
        }`,
      );
      if (textResult.lineTexts && textResult.lineTexts.length > 0) {
        const sample = textResult.lineTexts
          .slice(0, 15)
          .map((line) =>
            line.replace(/\d/g, (match, idx) => (idx % 6 === 0 ? match : "*")),
          );
        console.log(
          `[analyze-expense] PDF: Line text sample (masked):\n${sample.join(
            "\n",
          )}`,
        );
      }
    }
    const hasLineDates = textResult.lineTexts
      ? textResult.lineTexts.some(
          (line) => !!parseDateFromText(line, callerDate),
        )
      : false;

    if (textResult.tableRows && textResult.tableRows.length > 0) {
      const tableItems = extractDeterministicItemsFromTableRows(
        textResult.tableRows,
        callerDate,
        callerCurrency,
      );
      if (tableItems.length > 0) {
        console.log(
          `[analyze-expense] PDF: Table-row extraction produced ${tableItems.length} item(s)`,
        );
        return tableItems;
      }
      console.log(
        "[analyze-expense] PDF: Table-row extraction empty, falling back to text",
      );
    }
    if (textResult.lineTexts && textResult.lineTexts.length > 0) {
      const lineItems = extractStatementItemsFromLines(
        textResult.lineTexts,
        callerDate,
        callerCurrency,
        rawText,
      );
      if (lineItems.length > 0) {
        console.log(
          `[analyze-expense] PDF: Line-based statement extraction produced ${lineItems.length} item(s)`,
        );
        return lineItems;
      }
      console.log(
        "[analyze-expense] PDF: Line-based statement extraction empty, falling back",
      );
    }

    const transactionJson = await extractTransactionsJsonWithGemini(
      genAI,
      rawText,
      callerCurrency,
      callerDate,
    );
    if (transactionJson) {
      console.log(
        "[analyze-expense] PDF: Using Gemini transaction JSON for analysis",
      );
      const parsedItems = parseTransactionsJsonToItems(
        transactionJson,
        callerCurrency,
        callerDate,
      );
      if (parsedItems.length > 0) {
        return parsedItems;
      }
      console.warn(
        "[analyze-expense] PDF: Transaction JSON parsed empty, falling back to analyzer",
      );
      // BUG FIX: Pass original document text (rawText), not the LLM-extracted JSON
      return analyzeFromText(
        genAI,
        callerCurrency,
        callerDate,
        language,
        rawText,
        tools,
        expenseCategories,
        incomeCategories,
        householdContext,
        typeHint,
        undefined,
        onProgress,
      );
    }

    if (textResult.pages && textResult.pages.length > 0) {
      const snippets: string[] = [];
      for (const page of textResult.pages) {
        const pageJson = await extractTransactionsJsonWithGemini(
          genAI,
          page,
          callerCurrency,
          callerDate,
        );
        if (pageJson) snippets.push(pageJson);
      }
      const mergedJson = mergeTransactionJsonSnippets(snippets);
      if (mergedJson) {
        console.log(
          "[analyze-expense] PDF: Using per-page Gemini transaction JSON for analysis",
        );
        const parsedItems = parseTransactionsJsonToItems(
          mergedJson,
          callerCurrency,
          callerDate,
        );
        if (parsedItems.length > 0) {
          return parsedItems;
        }
        console.warn(
          "[analyze-expense] PDF: Per-page JSON parsed empty, falling back to analyzer",
        );
        // BUG FIX: Pass original document text (rawText), not the LLM-extracted JSON
        return analyzeFromText(
          genAI,
          callerCurrency,
          callerDate,
          language,
          rawText,
          tools,
          expenseCategories,
          incomeCategories,
          householdContext,
          typeHint,
          textResult.pages,
          onProgress,
        );
      }
    }

    if (!hasLineDates) {
      console.log(
        "[analyze-expense] PDF: No line-level dates found, forcing vision OCR",
      );
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
        onProgress,
      );
    }
    const statementItems = extractStatementItemsFromText(
      rawText,
      callerDate,
      callerCurrency,
    );
    if (statementItems.length > 0) {
      console.log(
        `[analyze-expense] PDF: Statement-mode extraction produced ${statementItems.length} item(s)`,
      );
      return statementItems;
    }
    console.log(
      "[analyze-expense] PDF: Statement-mode extraction empty, falling back",
    );
    const deterministicItems = extractDeterministicItemsFromText(
      rawText,
      callerDate,
      callerCurrency,
    );
    if (deterministicItems.length > 0) {
      console.log(
        `[analyze-expense] PDF: Deterministic extraction produced ${deterministicItems.length} item(s)`,
      );
      return deterministicItems;
    }
    console.log(
      "[analyze-expense] PDF: Deterministic text extraction empty, falling back to LLM",
    );

    console.log(
      "[analyze-expense] PDF: Deterministic extraction empty, falling back to LLM text parsing",
    );
    return analyzeFromText(
      genAI,
      callerCurrency,
      callerDate,
      language,
      rawText,
      tools,
      expenseCategories,
      incomeCategories,
      householdContext,
      typeHint,
      textResult.pages,
      onProgress,
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
    onProgress,
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
  onProgress?: ProgressCallback,
  skipPdfChunking: boolean = false,
): Promise<ExpenseItem[]> {
  if (!skipPdfChunking) {
    const splitResult = await splitPdfChunksNew(base64Pdf, 5);
    if (splitResult && splitResult.chunks.length > 1) {
      console.log(
        `[analyze-expense] PDF: Splitting ${splitResult.pageCount} pages into ${splitResult.chunks.length} chunk(s) for model page limits`,
      );
      const combinedItems: ExpenseItem[] = [];
      for (let index = 0; index < splitResult.chunks.length; index++) {
        const chunk = splitResult.chunks[index];
        if (onProgress) {
          onProgress({
            type: "processing_vision",
            current: index + 1,
            total: splitResult.chunks.length,
            message: `Analyzing PDF part ${
              index + 1
            }/${splitResult.chunks.length}`,
          });
        }

        const chunkItems = await analyzeFromPdfVision(
          genAI,
          callerCurrency,
          callerDate,
          language,
          chunk,
          contentType,
          tools,
          expenseCategories,
          incomeCategories,
          householdContext,
          typeHint,
          onProgress,
          true,
        );
        if (chunkItems.length > 0) {
          combinedItems.push(...chunkItems);
        }
      }

      const deduped = deduplicateAndCleanItems(combinedItems);
      if (deduped.length > 0) {
        return deduped;
      }
    }
  }

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

  // Model progression for PDF analysis with higher token limits and extended timeouts
  // Increased timeouts to 3 minutes for large PDFs with many transactions
  const modelConfigs = GEMINI_FALLBACK_MODEL_NAMES.map((name) => ({
    name,
    timeout: 180000,
    maxTokens: 65536,
  }));

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
        toolConfig: {
          functionCallingConfig: ADD_TRANSACTIONS_FUNCTION_CALLING_CONFIG,
        },
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

  if (cleanedItems.length === 0 && isPdfPageLimitNew(lastError)) {
    throw new Error(
      "PDF exceeds model page limit (about 5 pages). Please split the PDF into smaller files (1-5 pages each) and import again.",
    );
  }

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
  const householdPrompt = householdContext
    ? `\n${buildHouseholdContextPrompt(householdContext)}\n`
    : "\n";

  const request = {
    toolConfig: {
      functionCallingConfig: ADD_TRANSACTIONS_FUNCTION_CALLING_CONFIG,
    },
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
    generationConfig: {
      maxOutputTokens: 4096,
      candidateCount: 1,
      temperature: 0,
      topP: 0.8,
    },
  } as any;

  const modelAttempts = GEMINI_FALLBACK_MODEL_NAMES.map((name) => ({
    name,
    timeoutMs: 60000,
    maxRetries: 1,
  }));

  let lastError = "";

  for (const attempt of modelAttempts) {
    try {
      const attemptModel = genAI.getGenerativeModel({
        model: attempt.name,
        tools,
        systemInstruction,
      });

      const response = await generateGeminiWithRetry({
        model: attemptModel,
        modelName: attempt.name,
        request,
        timeoutMs: attempt.timeoutMs,
        maxRetries: attempt.maxRetries,
      });

      const toolCalls = getFunctionCalls(response).filter(
        (call: any) => call && call.name === "add_transactions",
      );
      if (toolCalls.length === 0) {
        lastError = `${attempt.name} returned no tool calls`;
        continue;
      }

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

      const cleaned = deduplicateAndCleanItems(items, {
        skipTotalSumHeuristic: true,
      });

      console.log(`[analyze-expense] Audio: Extracted ${cleaned.length} items`);
      if (cleaned.length > 0) {
        return cleaned;
      }

      lastError = `${attempt.name} returned empty items`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = `${attempt.name} failed: ${message}`;
      console.warn(`[analyze-expense] Audio model failure: ${lastError}`);
    }
  }

  if (lastError) {
    throw new Error(lastError);
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

function isTransientModelErrorMessage(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    /\b(429|500|502|503|504)\b/.test(lowered) ||
    lowered.includes("high demand") ||
    lowered.includes("resource_exhausted") ||
    lowered.includes("temporarily unavailable") ||
    lowered.includes("service unavailable") ||
    lowered.includes("try again later") ||
    lowered.includes("overloaded")
  );
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

/** @deprecated Use isPdfPageLimitErrorMessage from ./import/pdf.ts. All callers migrated to isPdfPageLimitNew. */
function isPdfPageLimitErrorMessage(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    (lowered.includes("pdf") && lowered.includes("5 page")) ||
    (lowered.includes("pdf") && lowered.includes("page limit")) ||
    lowered.includes("maximum number of pages") ||
    lowered.includes("too many pages") ||
    lowered.includes("document exceeds page limit")
  );
}

async function generateGeminiWithRetry(params: {
  model: any;
  modelName: string;
  request: any;
  timeoutMs: number;
  maxRetries?: number;
}): Promise<any> {
  const { model, modelName, request, timeoutMs, maxRetries = 1 } = params;
  const startedAt = Date.now();
  const delays = [250, 750, 1500].slice(0, Math.max(0, maxRetries));

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
  maxRetries: number = 1,
): Promise<{ success: boolean; items?: ExpenseItem[]; error?: string }> {
  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      tools,
      systemInstruction,
    });

    const request = {
      toolConfig: {
        functionCallingConfig: ADD_TRANSACTIONS_FUNCTION_CALLING_CONFIG,
      },
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
      generationConfig: {
        maxOutputTokens: 8192,
        candidateCount: 1,
        temperature: 0,
        topP: 0.8,
      },
    } as any;

    const response = await generateGeminiWithRetry({
      model,
      modelName,
      request,
      timeoutMs,
      maxRetries,
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

      const items = deduplicateAndCleanItems(tempItems, {
        skipTotalSumHeuristic: true,
      });

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
    if (DEBUG_LOGS) {
      console.log(
        `[analyze-expense] Model output text length: ${modelText.length}`,
      );
    }

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

    const normalizeAllowedCategory = (value: unknown): string => {
      const raw = typeof value === "string" ? value : String(value ?? "");
      return sanitizeCategoryName(raw) ?? normalizeCategoryForStorage(raw);
    };

    const normalizeAllowedList = (values: unknown): string[] => {
      if (!Array.isArray(values)) return [];
      const seen = new Set<string>();
      const out: string[] = [];
      for (const v of values) {
        const key = normalizeAllowedCategory(v);
        if (!key || !seen.add(key)) continue;
        out.push(key);
      }
      out.sort();
      // Ensure stable fallback
      if (!seen.has("other")) out.push("other");
      return out;
    };

    const callerExpenseAllowed = normalizeAllowedList(
      body.allowedExpenseCategories,
    );
    const callerIncomeAllowed = normalizeAllowedList(
      body.allowedIncomeCategories,
    );

    const expenseCategories =
      callerExpenseAllowed.length > 0
        ? callerExpenseAllowed
        : getExpenseCategories();
    const incomeCategories =
      callerIncomeAllowed.length > 0
        ? callerIncomeAllowed
        : getIncomeCategories();

    const allowedExpenseSet = new Set<string>(
      expenseCategories.map((c) => normalizeAllowedCategory(c)),
    );
    const allowedIncomeSet = new Set<string>(
      incomeCategories.map((c) => normalizeAllowedCategory(c)),
    );

    // Debug: Log categories being passed to AI
    if (DEBUG_LOGS) {
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
    }

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
                          "Household only: member key or alias of who paid (if specified).",
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
                                    "Member key or alias from the provided member list.",
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

    const quickTextTools = [
      {
        functionDeclarations: [
          {
            name: "add_transactions",
            description: "Extract structured transactions.",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["expense", "income"],
                      },
                      amount: { type: "number" },
                      category: { type: "string" },
                      currency: { type: "string" },
                      date: { type: "string" },
                      description: { type: "string" },
                      payerUserId: { type: "string" },
                      customSplits: { type: "object" },
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
    let parseDiagnostics:
      | import("./import/types.ts").ParseDiagnostics
      | undefined;

    if (hasAttachments) {
      if (onProgress) {
        onProgress({
          type: "extracting_text",
          message: "Reading your file...",
        });
      }

      const att = body.attachments![0];
      if (
        !att ||
        typeof att.data !== "string" ||
        att.data.trim().length === 0
      ) {
        return {
          success: false,
          error: "Invalid attachment payload",
          code: "VALIDATION_ERROR",
          status: 400,
          language,
        };
      }
      const filename = att.filename || "";
      const contentType = att.contentType || "";
      const lowerName = filename.toLowerCase();

      const cleaned = att.data.replace(/^data:.*;base64,/, "");

      // Guard against oversized uploads — 50MB decoded limit (≈67MB base64).
      const MAX_BASE64_CHARS = 67_108_864; // 64 * 1024 * 1024
      if (cleaned.length > MAX_BASE64_CHARS) {
        return {
          success: false,
          error: `Attachment too large (${Math.round(cleaned.length / 1_048_576)}MB base64). Maximum supported size is ~50MB.`,
          code: "FILE_TOO_LARGE",
          status: 413,
          language: "en",
        };
      }

      let bytes: Uint8Array;
      try {
        bytes = decodeBase64(cleaned);
      } catch {
        return {
          success: false,
          error: "Invalid attachment encoding",
          code: "VALIDATION_ERROR",
          status: 400,
          language,
        };
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
        // CSV files: use deterministic parser first, then fall through to LLM if needed
        const isCsv =
          /\.(csv)$/i.test(lowerName) || /text\/csv/i.test(contentType);
        if (isCsv) {
          try {
            const csvResult = parseCsvFromBytes(
              bytes,
              callerDate,
              callerCurrency,
            );
            if (csvResult.success && csvResult.items.length > 0) {
              items = convertParsedTransactions(
                csvResult.items,
                callerCurrency,
              );
              parseDiagnostics = csvResult.diagnostics;
              if (DEBUG_LOGS) {
                console.log(
                  `[analyze-expense] CSV: Deterministic parser produced ${items.length} item(s)`,
                  `(path=${csvResult.diagnostics.parserPath}, ` +
                    `rows=${csvResult.diagnostics.rowsExamined}, ` +
                    `delimiter="${csvResult.diagnostics.delimiter || "?"}") `,
                );
              }
            } else {
              // Deterministic parse failed or returned 0 items — fall through to LLM
              if (DEBUG_LOGS) {
                console.log(
                  `[analyze-expense] CSV: Deterministic parser returned 0 items` +
                    (csvResult.errorCode
                      ? ` (${csvResult.errorCode}: ${csvResult.errorMessage})`
                      : "") +
                    `, falling back to LLM`,
                );
              }
              try {
                syntheticText = new TextDecoder("utf-8", {
                  fatal: false,
                }).decode(bytes);
              } catch {
                syntheticText = "";
              }
            }
          } catch (csvErr) {
            console.error(
              "[analyze-expense] CSV: Deterministic parser threw, falling back to LLM",
              csvErr,
            );
            try {
              syntheticText = new TextDecoder("utf-8", {
                fatal: false,
              }).decode(bytes);
            } catch {
              syntheticText = "";
            }
          }
        } else {
          // Non-CSV text files (txt, json, xml): decode full text for LLM analysis
          try {
            syntheticText = new TextDecoder("utf-8", { fatal: false }).decode(
              bytes,
            );
          } catch {
            syntheticText = "";
          }
        }
      } else if (isSpreadsheet) {
        // XLSX/XLS: use deterministic parser from xlsx.ts module
        try {
          const xlsxResult = parseXlsxFromBytes(
            bytes,
            callerDate,
            callerCurrency,
          );
          if (xlsxResult.success && xlsxResult.items.length > 0) {
            items = convertParsedTransactions(xlsxResult.items, callerCurrency);
            parseDiagnostics = xlsxResult.diagnostics;
            if (DEBUG_LOGS) {
              console.log(
                `[analyze-expense] XLSX: Deterministic parser produced ${items.length} item(s)` +
                  ` (path=${xlsxResult.diagnostics.parserPath}, ` +
                  `sheet="${xlsxResult.diagnostics.activeSheet || "?"}") `,
              );
            }
          } else {
            if (DEBUG_LOGS) {
              console.log(
                `[analyze-expense] XLSX: Deterministic parser returned 0 items` +
                  (xlsxResult.errorCode
                    ? ` (${xlsxResult.errorCode}: ${xlsxResult.errorMessage})`
                    : "") +
                  `, falling back to preview`,
              );
            }
          }
        } catch (xlsxErr) {
          console.error(
            "[analyze-expense] XLSX: Deterministic parser threw, falling back to preview",
            xlsxErr,
          );
        }

        if (items.length === 0) {
          syntheticText = buildXlsxPreviewNew(bytes) || "";
          if (DEBUG_LOGS) {
            console.log(
              `[analyze-expense] XLSX: Deterministic extraction empty, falling back to preview (${syntheticText.length} chars)`,
            );
          }
        }
      } else if (isPdf) {
        const base64Data = b64encode(bytes);
        let pdfProcessingError: string | null = null;

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
          pdfProcessingError = e instanceof Error ? e.message : String(e);
          console.error("[analyze-expense] PDF direct extraction failed", e);
        }

        if (
          items.length === 0 &&
          pdfProcessingError &&
          isPdfPageLimitNew(pdfProcessingError)
        ) {
          return {
            success: false,
            error: pdfProcessingError,
            code: "PDF_PAGE_LIMIT",
            status: 400,
            language,
          };
        }

        if (items.length === 0) {
          const summary = await summarizePdfWithGemini(
            base64Data,
            "application/pdf",
            geminiApiKey,
          );
          syntheticText = summary || "";
          if (syntheticText) {
            const normalized = await preprocessExtractedTextWithGemini(
              genAI,
              syntheticText,
              "pdf_gemini_summary",
              onProgress,
            );
            if (normalized) syntheticText = normalized;
          }
        }
      }

      if (items.length === 0) {
        if (!syntheticText.trim()) {
          return {
            success: false,
            error: "Unsupported or unreadable attachment format",
            code: isPdf ? "PDF_PARSE_FAILED" : "UNSUPPORTED_FORMAT",
            status: 400,
            language,
          };
        }

        if (!isSpreadsheet) {
          const transactionJson = await extractTransactionsJsonWithGemini(
            genAI,
            syntheticText,
            callerCurrency,
            callerDate,
          );
          if (transactionJson) {
            const parsedItems = parseTransactionsJsonToItems(
              transactionJson,
              callerCurrency,
              callerDate,
            );
            if (parsedItems.length > 0) {
              items = parsedItems;
            }
          }
        }

        // BUG FIX: Only fall through to LLM text analysis if the JSON extraction
        // above did not already produce items. Previously this unconditionally
        // overwrote items, discarding the extractTransactionsJsonWithGemini output.
        if (items.length === 0) {
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
      }
    } else if (hasText) {
      if (onProgress) {
        onProgress({
          type: "extracting_text",
          message: "Reading what you typed...",
        });
      }

      const isQuickTextMode = isQuickTextFastPathCandidate(body.text!);
      if (isQuickTextMode) {
        items = await analyzeFromQuickText(
          genAI,
          callerCurrency,
          callerDate,
          language,
          body.text!,
          quickTextTools,
          expenseCategories,
          incomeCategories,
          householdContext,
          typeHint,
          onProgress,
        );
      } else {
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
      }
    } else if (hasAudio) {
      if (onProgress) {
        onProgress({
          type: "extracting_text",
          message: "Listening to your recording...",
        });
      }

      const audio = body.audio!;
      if (!audio.contentType || !audio.contentType.startsWith("audio/")) {
        return {
          success: false,
          error: "Invalid audio content type",
          code: "VALIDATION_ERROR",
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
          code: "FILE_TOO_LARGE",
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
      if (onProgress) {
        onProgress({
          type: "processing_vision",
          message: "Looking through your image...",
        });
      }

      const image = body.image!;
      if (!image.contentType || !image.contentType.startsWith("image/")) {
        return {
          success: false,
          error: "Invalid image content type",
          code: "VALIDATION_ERROR",
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
            code: "FILE_TOO_LARGE",
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
            code: "FILE_TOO_LARGE",
            status: 400,
            language,
          };
        }
      }

      // Normalize common mime type variations for Gemini
      if (finalContentType === "image/jpg") finalContentType = "image/jpeg";

      if (DEBUG_LOGS) {
        console.log(
          `[analyze-expense] Image Prep: contentType=${finalContentType} (orig=${image.contentType}), length=${base64Image.length}`,
        );
      }

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

        ...(householdContext
          ? [
              "### 5. HOUSEHOLD SPLITS (CRITICAL - when household context is provided)",
              "- The caller is in a household/group context. Return split information for every EXPENSE item.",
              "- The expense tracking logic: WHO paid the bill, and HOW MUCH does each person OWE.",
              "",
              "#### 5.1 PAYER IDENTIFICATION (payerUserId) - WHO PAID THE BILL",
              "- Default payer = caller (the user logging the expense). OMIT payerUserId if caller paid.",
              "- Set payerUserId ONLY when someone ELSE paid the bill.",
              "- Use ONLY userId from the provided member list. Never output names/emails.",
              "",
              "#### 5.2 SPLIT EXTRACTION (customSplits) - HOW MUCH EACH PERSON OWES",
              "- For image/receipt inputs, default to EQUAL split among ALL household members.",
              "- OMIT customSplits entirely to let the system apply equal splits automatically.",
              "- Only provide customSplits if the image clearly shows per-person amounts or annotations.",
            ]
          : []),

        "FINAL RULE: Under no circumstances output plain text or JSON. Always and only respond by calling add_transactions.",
      ].join("\n");

      // Model progression: prefer stable fast model first.
      // Preview models can be more prone to overload.
      const modelAttempts = GEMINI_FALLBACK_MODEL_NAMES.map((name) => ({
        name,
        timeout: 30000,
        maxRetries: 1,
      }));

      // Removed shadowing variables
      // let lastError = "";
      // let items: ExpenseItem[] = [];

      for (const { name, timeout, maxRetries } of modelAttempts) {
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
            maxRetries,
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
          const handwritingFallbackModels = [...GEMINI_FALLBACK_MODEL_NAMES];
          for (const modelName of handwritingFallbackModels) {
            const fallback = await attemptAnalysis(
              genAI,
              modelName,
              handwritingInstruction,
              body,
              base64Image,
              callerCurrency,
              callerDate,
              tools,
              householdContext,
              12000,
              finalContentType,
              1,
            );

            if (
              fallback.success &&
              fallback.items &&
              fallback.items.length > 0
            ) {
              console.log(
                `[analyze-expense] Handwriting fallback succeeded with ${modelName}: extracted ${fallback.items.length} items`,
              );
              items = fallback.items;
              break;
            }

            lastError =
              fallback.error ||
              lastError ||
              "Handwriting fallback returned no items";
            console.log(
              `[analyze-expense] Handwriting fallback failed with ${modelName}:`,
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
      const transientFailure = isTransientModelErrorMessage(lastError || "");
      return {
        success: false,
        error:
          (transientFailure
            ? "AI service is temporarily experiencing high demand. Please try again shortly."
            : lastError) ||
          "Could not extract transaction information. Please try clearer text, a screenshot, or a photo.",
        code: transientFailure
          ? "AI_TEMPORARILY_UNAVAILABLE"
          : "VALIDATION_ERROR",
        status: transientFailure ? 503 : 400,
        language,
      };
    }

    const preferences: UserCategoryPreferenceRow[] = Array.isArray(
      body.categoryPreferences,
    )
      ? body.categoryPreferences
      : [];
    const remaps: UserCategoryRemapRow[] = Array.isArray(body.categoryRemaps)
      ? body.categoryRemaps
      : [];

    if (items.length > 0) {
      // First, apply explicit remaps on the model category.
      // If a remap matches, treat it as user-locked and do not let
      // description-based preferences override it.
      const baseItems = items.map((it) => ({ ...it }));
      const itemsWithRemapLock = baseItems.map((it) => {
        const normalizedSource = normalizeStoredUserCategory(it.category);
        const remapped = applyCategoryRemap({
          categoryName: it.category,
          transactionType: it.type,
          remaps,
          allowedExpenseCategories: allowedExpenseSet,
          allowedIncomeCategories: allowedIncomeSet,
        });
        const remapMatched = remapped !== normalizedSource;
        return {
          ...it,
          category: remapped,
          remapMatched,
        };
      });

      // Then, apply learned user preferences based on description match key
      // only for rows that were NOT explicitly remapped.
      const preferredItems = applyPreferencesToItems({
        items: baseItems.map((it) => ({
          type: it.type,
          description: it.description,
          category: it.category,
        })),
        preferences,
        allowedExpenseCategories: allowedExpenseSet,
        allowedIncomeCategories: allowedIncomeSet,
      });

      items = itemsWithRemapLock.map((it, idx) => ({
        ...baseItems[idx],
        category: it.remapMatched ? it.category : preferredItems[idx].category,
      }));

      console.log(
        "[analyze-expense] Category resolution before final coercion:",
        itemsWithRemapLock.slice(0, 8).map((it, idx) => ({
          description: baseItems[idx]?.description ?? null,
          original: normalizeStoredUserCategory(
            baseItems[idx]?.category ?? null,
          ),
          remapMatched: it.remapMatched,
          afterRemap: it.category,
          afterPreference: preferredItems[idx]?.category ?? null,
          chosen: items[idx]?.category ?? null,
        })),
      );

      // Apply remaps once more after preferences for non-locked rows.
      items = items.map((it) => ({
        ...it,
        category: applyCategoryRemap({
          categoryName: it.category,
          transactionType: it.type,
          remaps,
          allowedExpenseCategories: allowedExpenseSet,
          allowedIncomeCategories: allowedIncomeSet,
        }),
      }));

      // Finally, coerce to the allowed set for the user
      items = items.map((it) => ({
        ...it,
        category: coerceCategoryToAllowed(
          it.category,
          it.type === "income" ? allowedIncomeSet : allowedExpenseSet,
        ),
      }));
    }

    return {
      success: true,
      items,
      language,
      diagnostics: parseDiagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const transientFailure = isTransientModelErrorMessage(message);
    return {
      success: false,
      error: transientFailure
        ? "AI service is temporarily experiencing high demand. Please try again shortly."
        : message,
      code: transientFailure ? "AI_TEMPORARILY_UNAVAILABLE" : "SERVER_ERROR",
      status: transientFailure ? 503 : 500,
      language: "en",
    };
  }
}

/**
 * Enhanced XLSX preview that captures more rows for bulk transaction imports.
 * Returns all rows up to a reasonable limit for transaction extraction.
 */
/** @deprecated Use buildXlsxPreview from ./import/xlsx.ts. All callers migrated to buildXlsxPreviewNew. */
export function buildXlsxPreview(buf: Uint8Array): string | null {
  try {
    const wb = XLSX.read(buf, { type: "array" });
    const sheetNames = Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
    if (sheetNames.length === 0) return null;

    // Increased from 20 rows to 500 rows to capture more transactions
    // Each row is limited to 12 columns (up from 8) for better transaction data capture
    const MAX_ROWS_PER_SHEET = 500;
    const MAX_COLS = 12;
    const MAX_TOTAL_ROWS = 1500;

    let totalRows = 0;
    const sheetBlocks: string[] = [];

    for (const sheetName of sheetNames) {
      if (totalRows >= MAX_TOTAL_ROWS) break;
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const remaining = MAX_TOTAL_ROWS - totalRows;
      const rowLimit = Math.min(MAX_ROWS_PER_SHEET, remaining);
      const limited = rows
        .slice(0, rowLimit)
        .map((r) => (Array.isArray(r) ? r.slice(0, MAX_COLS) : r));
      if (limited.length === 0) continue;

      totalRows += limited.length;
      const previewLines = limited.map((r: any) => JSON.stringify(r));
      sheetBlocks.push(
        `Sheet "${sheetName}" data (${limited.length} of ${rows.length} rows):\n${previewLines.join(
          "\n",
        )}`,
      );

      console.log(
        `[analyze-expense] XLSX: Sheet "${sheetName}" processed ${limited.length} of ${rows.length} rows`,
      );
    }

    if (sheetBlocks.length === 0) return null;

    console.log(
      `[analyze-expense] XLSX: Total processed ${totalRows} row(s) across ${sheetBlocks.length} sheet(s)`,
    );

    return sheetBlocks.join("\n\n");
  } catch (e) {
    console.error("XLSX parse error", e);
    return null;
  }
}

/** @deprecated Use extractCellText from ./import/xlsx.ts. Dead code after extractXlsxTransactions migration. */
function extractCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

/** @deprecated Use parseSignedAmountFromCell from ./import/xlsx.ts. Dead code after extractXlsxTransactions migration. */
function parseSignedAmountFromCell(
  value: unknown,
): { amount: number; isNegative: boolean } | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { amount: Math.abs(value), isNegative: value < 0 };
  }

  const text = extractCellText(value);
  if (!text) return null;
  const hasNegative = /^\s*-/.test(text) || /\(.*\)/.test(text);
  const normalized = normalizeAmountString(text);
  if (normalized === null) return null;
  return { amount: normalized, isNegative: hasNegative };
}

/** @deprecated Use detectHeaderMap from ./import/xlsx.ts. Dead code after extractXlsxTransactions migration. */
function detectHeaderMap(row: string[]) {
  const header = row.map((cell: string) => cell.toLowerCase());
  const hasDate = header.some((cell) =>
    /date|posted|transaction date/.test(cell),
  );
  const hasAmount = header.some((cell) => /amount|amt|value/.test(cell));
  if (!hasDate || !hasAmount) return null;

  const indexOf = (regex: RegExp) =>
    header.findIndex((cell) => regex.test(cell));
  return {
    date: indexOf(/date|posted|transaction date/),
    description: indexOf(
      /description|details|merchant|memo|narration|reference/,
    ),
    amount: indexOf(/amount|amt|value/),
    moneyOut: indexOf(/debit|money out|withdrawal|paid/),
    moneyIn: indexOf(/credit|money in|deposit|received/),
    currency: indexOf(/currency|ccy/),
  };
}

/** @deprecated Use parseXlsxFromBytes from ./import/xlsx.ts. All callers migrated. */
function extractXlsxTransactions(
  buf: Uint8Array,
  callerDate: string,
  callerCurrency: string,
): ExpenseItem[] {
  try {
    const wb = XLSX.read(buf, { type: "array" });
    const sheetNames = Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
    if (sheetNames.length === 0) return [];

    const items: ExpenseItem[] = [];
    const MAX_ROWS_PER_SHEET = 2000;
    const headerNoisePattern =
      /(exported at|date range|balance summary|statement generated|opening balance|closing balance|total|account transactions|pending|reverted)/i;

    for (const sheetName of sheetNames) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
      });
      if (!Array.isArray(rows) || rows.length === 0) continue;

      if (DEBUG_LOGS) {
        console.log(
          `[analyze-expense] XLSX: Scanning sheet "${sheetName}" with ${rows.length} row(s)`,
        );
      }

      let headerMap: {
        date: number;
        description: number;
        amount: number;
        moneyOut: number;
        moneyIn: number;
        currency: number;
      } | null = null;
      let startRow = 0;

      for (let i = 0; i < Math.min(rows.length, 25); i++) {
        const row = Array.isArray(rows[i]) ? rows[i] : [];
        const rowText = row.map((cell: unknown) => extractCellText(cell));
        const detected = detectHeaderMap(rowText);
        if (detected) {
          headerMap = detected;
          startRow = i + 1;
          if (DEBUG_LOGS) {
            console.log(
              `[analyze-expense] XLSX: Header detected in sheet "${sheetName}" at row ${
                i + 1
              } (date=${detected.date}, description=${detected.description}, amount=${detected.amount}, moneyOut=${detected.moneyOut}, moneyIn=${detected.moneyIn}, currency=${detected.currency})`,
            );
          }
          break;
        }
      }

      if (DEBUG_LOGS && !headerMap) {
        console.log(
          `[analyze-expense] XLSX: No header detected in sheet "${sheetName}"; using row heuristics`,
        );
      }

      const limit = Math.min(rows.length, startRow + MAX_ROWS_PER_SHEET);
      let sheetItems = 0;
      let amountRows = 0;
      for (let i = startRow; i < limit; i++) {
        const row = Array.isArray(rows[i]) ? rows[i] : [];
        if (row.length === 0) continue;
        const cells = row.map((cell: unknown) => extractCellText(cell));
        const joined = cells.filter(Boolean).join(" | ");
        if (!joined) continue;
        if (headerNoisePattern.test(joined)) continue;

        const dateText =
          headerMap && headerMap.date >= 0 ? cells[headerMap.date] : joined;
        const rowDate = parseDateFromText(dateText, callerDate);
        if (!headerMap && !rowDate) continue;
        const descriptionText =
          headerMap && headerMap.description >= 0
            ? cells[headerMap.description]
            : stripAmountsAndDates(joined) || joined;
        const currencyText =
          headerMap && headerMap.currency >= 0
            ? cells[headerMap.currency]
            : joined;

        let amountValue: number | null = null;
        let type: "expense" | "income" = "expense";

        if (headerMap && headerMap.moneyOut >= 0) {
          const moneyOutCell = cells[headerMap.moneyOut];
          const parsed = parseSignedAmountFromCell(moneyOutCell);
          if (parsed) {
            amountValue = parsed.amount;
            type = "expense";
          }
        }

        if (amountValue === null && headerMap && headerMap.moneyIn >= 0) {
          const moneyInCell = cells[headerMap.moneyIn];
          const parsed = parseSignedAmountFromCell(moneyInCell);
          if (parsed) {
            amountValue = parsed.amount;
            type = "income";
          }
        }

        if (amountValue === null && headerMap && headerMap.amount >= 0) {
          const amountCell = cells[headerMap.amount];
          const parsed = parseSignedAmountFromCell(amountCell);
          if (parsed) {
            amountValue = parsed.amount;
            type = parsed.isNegative ? "expense" : inferTypeFromText(joined);
          }
        }

        if (amountValue === null) {
          const tokens = extractAmountTokens(joined);
          if (tokens.length > 0) {
            amountValue = tokens[0].value;
            type = inferTypeFromText(joined);
          } else {
            for (const cell of cells) {
              const parsed = parseSignedAmountFromCell(cell);
              if (parsed) {
                amountValue = parsed.amount;
                type = parsed.isNegative
                  ? "expense"
                  : inferTypeFromText(joined);
                break;
              }
            }
          }
        }

        if (!amountValue) continue;
        if (
          amountValue >= 1900 &&
          amountValue <= 2100 &&
          !/[€$£¥₹]/.test(joined)
        ) {
          continue;
        }

        amountRows += 1;

        const dateValue = rowDate || callerDate;
        const currency =
          detectCurrencyFromText(currencyText, callerCurrency) ||
          callerCurrency;

        if (headerNoisePattern.test(descriptionText)) continue;

        items.push({
          type,
          amount: amountValue,
          category: normalizeCategory(descriptionText),
          currency,
          currencySymbol: getCurrencySymbol(currency),
          date: dateValue,
          description: descriptionText || "",
        });
        sheetItems += 1;
      }

      if (DEBUG_LOGS) {
        console.log(
          `[analyze-expense] XLSX: Sheet "${sheetName}" parsed ${sheetItems} item(s) from ${
            limit - startRow
          } row(s) (amount-like rows=${amountRows})`,
        );
      }
    }

    return items;
  } catch (e) {
    console.error("XLSX deterministic parse error", e);
    return [];
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
    const modelNames = [...GEMINI_FALLBACK_MODEL_NAMES];

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
