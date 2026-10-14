/**
 * Shared types and error codes for the import parsing pipeline.
 *
 * This module defines the canonical types used by all import parsers (CSV, XLSX, PDF)
 * and the analyze-core orchestrator. Error codes are typed so the frontend can display
 * actionable messages instead of generic failures.
 */

import { normalizeCurrencyCode } from "../currency-normalize.ts";
import { CURRENCY_SYMBOLS } from "../currency-symbols.ts";

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/**
 * Typed failure codes for import operations.
 * The frontend can match on these to show contextual error messages and recovery hints.
 */
export type ImportErrorCode =
  // File-level errors
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FORMAT"
  | "FILE_EMPTY"
  | "FILE_CORRUPTED"
  // CSV-specific
  | "CSV_PARSE_FAILED"
  | "CSV_NO_HEADER"
  | "CSV_DELIMITER_AMBIGUOUS"
  | "CSV_ENCODING_FAILED"
  | "CSV_TOO_MANY_ROWS"
  // XLSX-specific
  | "XLSX_PARSE_FAILED"
  | "XLSX_NO_SHEETS"
  | "XLSX_NO_HEADER"
  | "XLSX_TOO_MANY_ROWS"
  | "XLS_NOT_SUPPORTED"
  // PDF-specific
  | "PDF_PAGE_LIMIT"
  | "PDF_TEXT_EXTRACTION_EMPTY"
  | "PDF_OCR_FAILED"
  | "PDF_MODEL_FAILED"
  | "PDF_PARSE_FAILED"
  // Generic
  | "NO_TRANSACTIONS_FOUND"
  | "PARSE_TIMEOUT";

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Parser diagnostics returned alongside items so the frontend
 * can explain what happened during parsing.
 */
export interface ParseDiagnostics {
  /** Which parser path was used (e.g., "csv_deterministic", "xlsx_header", "pdf_document_ai") */
  parserPath: string;
  /** Total rows examined (before filtering) */
  rowsExamined: number;
  /** Total rows that yielded valid transactions */
  rowsParsed: number;
  /** Rows skipped with reasons */
  rowsSkipped: number;
  /** Detected delimiter (CSV only) */
  delimiter?: string;
  /** Detected encoding (CSV only) */
  encoding?: string;
  /** Whether a BOM was detected (CSV only) */
  hasBom?: boolean;
  /** Sheet names found (XLSX only) */
  sheetNames?: string[];
  /** Which sheet was used (XLSX only) */
  activeSheet?: string;
  /** Header row index (0-based, XLSX/CSV) */
  headerRowIndex?: number;
  /** Detected header columns */
  detectedHeaders?: Record<string, number>;
  /** Page count (PDF only) */
  pageCount?: number;
  /** Characters extracted (PDF only) */
  extractedCharCount?: number;
  /** Warnings that don't block parsing but should be surfaced */
  warnings: string[];
  /** Resource limits prevented a complete import; no subset is saveable. */
  truncated?: boolean;
}

// ---------------------------------------------------------------------------
// Parse result
// ---------------------------------------------------------------------------

/**
 * A parsed transaction row from any file format.
 * This is the canonical shape before it becomes an ExpenseItem.
 */
export interface ParsedTransaction {
  /** Transaction type */
  type: "expense" | "income";
  /** Amount in major currency units (e.g., 12.50 not 1250) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Human-readable description / merchant / memo */
  description: string;
  /** Optional merchant/store/payee */
  merchant?: string;
  /** Category (may be raw from file, will be normalized downstream) */
  category?: string;
  /** Original row index in the source file (for error reporting) */
  sourceRowIndex?: number;
}

/**
 * Result returned by all deterministic parsers (CSV, XLSX).
 * Includes both successfully parsed items and structured diagnostics.
 */
export interface ParseResult {
  /** Whether parsing completed without fatal errors */
  success: boolean;
  /** Parsed transaction items */
  items: ParsedTransaction[];
  /** Structured diagnostics for the frontend */
  diagnostics: ParseDiagnostics;
  /** Typed error code if parsing failed */
  errorCode?: ImportErrorCode;
  /** Human-readable error message */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// CSV-specific config
// ---------------------------------------------------------------------------

/** Supported CSV delimiters in detection priority order */
export const CSV_DELIMITERS = [",", ";", "\t", "|"] as const;
export type CsvDelimiter = (typeof CSV_DELIMITERS)[number];

/** Configurable limits for CSV parsing */
export interface CsvParseConfig {
  /** Maximum file size in bytes (default: 10 MB) */
  maxFileBytes: number;
  /** Maximum number of data rows to parse (default: 10_000) */
  maxRows: number;
  /** Maximum number of columns to consider (default: 30) */
  maxColumns: number;
  /** Maximum rows to scan when searching for headers (default: 25) */
  maxHeaderScanRows: number;
}

export const DEFAULT_CSV_CONFIG: CsvParseConfig = {
  maxFileBytes: 10 * 1024 * 1024, // 10 MB
  maxRows: 10_000,
  maxColumns: 30,
  maxHeaderScanRows: 25,
};

// ---------------------------------------------------------------------------
// XLSX-specific config
// ---------------------------------------------------------------------------

/** Configurable limits for XLSX parsing */
export interface XlsxParseConfig {
  /** Maximum rows per sheet (default: 5_000) */
  maxRowsPerSheet: number;
  /** Maximum total rows across all sheets (default: 10_000) */
  maxTotalRows: number;
  /** Maximum number of header scan rows (default: 25) */
  maxHeaderScanRows: number;
  /** Maximum columns to consider (default: 20) */
  maxColumns: number;
}

export const DEFAULT_XLSX_CONFIG: XlsxParseConfig = {
  maxRowsPerSheet: 5_000,
  maxTotalRows: 10_000,
  maxHeaderScanRows: 25,
  maxColumns: 20,
};

// ---------------------------------------------------------------------------
// Shared parsing utilities — pure functions reused across parsers
// ---------------------------------------------------------------------------

/**
 * Month name -> month number lookup, supporting common abbreviations
 * and full names in English.
 */
export const MONTH_MAP: Record<string, number> = {
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

/**
 * Format year/month/day into a canonical YYYY-MM-DD string.
 */
export function formatDateParts(
  year: number,
  month: number,
  day: number,
): string {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Validate a canonical date; localized values require semantic extraction. */
export function parseDateFromText(
  value: string,
  _callerDate: string,
): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  // Only the canonical machine date contract is safe without source locale.
  // Localized dates (even apparently unambiguous ones) enter semantic extraction.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("SEMANTIC_FINANCIAL_EXTRACTION_REQUIRED");
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  ) {
    throw new Error("SEMANTIC_FINANCIAL_EXTRACTION_REQUIRED");
  }
  const date = normalized;
  return date;
}

/** A present currency column must establish an exact supported ISO code. */
export function parseStructuredCurrency(
  value: string,
  callerCurrency: string,
): string {
  const code = value.trim().toUpperCase();
  if (!code) return callerCurrency;
  if (!/^[A-Z]{3}$/.test(code) || !Object.hasOwn(CURRENCY_SYMBOLS, code)) {
    throw new Error("SEMANTIC_FINANCIAL_EXTRACTION_REQUIRED");
  }
  return code;
}

/**
 * Parse only a conservative numeric contract. Empty values remain empty; other
 * localized or ambiguous formats require semantic extraction of the full source.
 */
export function normalizeAmountString(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  // Do not strip currency text, Unicode digits or separators and then guess.
  // Three trailing digits can be either grouping or decimal precision.
  // Typed spreadsheet numbers bypass this string contract without conversion.
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("SEMANTIC_FINANCIAL_EXTRACTION_REQUIRED");
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error("SEMANTIC_FINANCIAL_EXTRACTION_REQUIRED");
  }
  return Math.abs(parsed);
}

/**
 * Extract amount-like tokens from a line of text.
 * Filters out 4-digit numbers that look like years (1900-2100) unless they have a currency symbol.
 */
export function extractAmountTokens(
  line: string,
): { raw: string; value: number }[] {
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

/**
 * Detect currency from symbols or ISO codes in text.
 * Falls back to callerCurrency if nothing is detected.
 */
const SUPPORTED_CURRENCY_CODES = new Set(Object.keys(CURRENCY_SYMBOLS));

const CURRENCY_SYMBOL_TO_CODES = (() => {
  const map = new Map<string, Set<string>>();
  for (const [code, rawSymbol] of Object.entries(CURRENCY_SYMBOLS)) {
    const normalizedCode = normalizeCurrencyCode(code);
    if (!normalizedCode || !SUPPORTED_CURRENCY_CODES.has(normalizedCode)) {
      continue;
    }

    const symbol = String(rawSymbol || "").trim();
    if (!symbol) continue;

    if (!map.has(symbol)) {
      map.set(symbol, new Set<string>());
    }
    map.get(symbol)!.add(normalizedCode);
  }
  return map;
})();

const SORTED_CURRENCY_SYMBOLS = Array.from(CURRENCY_SYMBOL_TO_CODES.keys())
  .filter((symbol) => /[^\p{L}]/u.test(symbol))
  .sort((left, right) => right.length - left.length);

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detectCurrencyFromText(
  line: string,
  callerCurrency: string,
): string {
  const detected: string[] = [];
  const pushCode = (value: string | null) => {
    if (!value) return;
    if (!SUPPORTED_CURRENCY_CODES.has(value)) return;
    detected.push(value);
  };

  let remainingLine = line;
  for (const symbol of SORTED_CURRENCY_SYMBOLS) {
    const mappedCodes = CURRENCY_SYMBOL_TO_CODES.get(symbol);
    if (!mappedCodes || mappedCodes.size !== 1) continue;
    const symbolRegex = new RegExp(escapeRegex(symbol), "gu");
    let matched = false;
    remainingLine = remainingLine.replace(symbolRegex, () => {
      matched = true;
      return " ";
    });
    if (!matched) continue;
    pushCode(mappedCodes.values().next().value ?? null);
  }

  const tokenMatches = remainingLine.match(/[\p{L}\p{Sc}.]{2,8}/gu) || [];
  for (const rawToken of tokenMatches) {
    const token = rawToken.replace(/^[^\p{L}\p{Sc}]+|[^\p{L}\p{Sc}]+$/gu, "");
    const normalized = normalizeCurrencyCode(token);
    if (normalized) {
      pushCode(normalized);
    }
  }

  if (detected.length > 0) return detected[0];
  return callerCurrency;
}

/**
 * Require semantic extraction when structured debit/credit fields are absent.
 */
export function inferTypeFromText(_line: string): "expense" | "income" {
  // Descriptions do not establish a normalized debit/credit contract. Abort
  // this deterministic parse so the complete source enters semantic extraction.
  // Never attach source text to the error: import diagnostics may be logged.
  throw new Error("SEMANTIC_TRANSACTION_TYPE_REQUIRED");
}

/**
 * Strip amounts and dates from text, leaving only the description content.
 */
export function stripAmountsAndDates(text: string): string {
  let cleaned = text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/g, " ")
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

/**
 * Check if a description looks like a total/subtotal/balance line
 * that should be excluded from transaction items.
 */
export function isTotalLike(description: string): boolean {
  return /\b(total|subtotal|balance|opening|closing|brought forward|carried forward)\b/i
    .test(
      description,
    );
}

/**
 * Pattern that matches noise rows in bank statements (headers, summaries, etc.)
 */
export const HEADER_NOISE_PATTERN =
  /(exported at|date range|balance summary|statement generated|opening balance|closing balance|total|account transactions|pending|reverted)/i;
