/**
 * Shared types and error codes for the import parsing pipeline.
 *
 * This module defines the canonical types used by all import parsers (CSV, XLSX, PDF)
 * and the analyze-core orchestrator. Error codes are typed so the frontend can display
 * actionable messages instead of generic failures.
 */

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

/**
 * Parse a date from free-form text. Supports:
 * - ISO 8601: 2024-01-15
 * - Month-first: Jan 15, 2024 / January 15 2024
 * - Day-first: 15 Jan 2024
 * - Numeric: 01/15/2024, 15-01-2024
 *
 * Uses the caller's date for year inference when the year is missing.
 */
export function parseDateFromText(
  line: string,
  callerDate: string,
): string | null {
  const monthNameRegex =
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;
  const monthFirstRegex = new RegExp(
    `${monthNameRegex.source}\\s+(\\d{1,2})(?:,\\s*(\\d{2,4}))?`,
    "i",
  );
  const dayFirstRegex = new RegExp(
    `(\\d{1,2})\\s+${monthNameRegex.source}(?:\\s+(\\d{2,4}))?`,
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
    // Ambiguous: assume DD/MM/YYYY (European convention)
    return formatDateParts(year, second, first);
  }

  return null;
}

/**
 * Normalize a raw amount string handling European (1.234,56) and US (1,234.56) formats.
 * Returns the absolute value or null if unparseable.
 */
export function normalizeAmountString(value: string): number | null {
  const cleaned = value.replace(/[^0-9,.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (lastComma > lastDot) {
    // European: 1.234,56 → comma is decimal separator
    normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else {
    // US/UK: 1,234.56 → dot is decimal separator
    normalized = cleaned.replace(/,/g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
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
export function detectCurrencyFromText(
  line: string,
  callerCurrency: string,
): string {
  if (/€/.test(line)) return "EUR";
  if (/£/.test(line)) return "GBP";
  if (/\$/.test(line)) return "USD";
  if (/¥/.test(line)) return "JPY";
  if (/₹/.test(line)) return "INR";
  const isoMatch = line.match(/\b([A-Z]{3})\b/);
  if (isoMatch) return isoMatch[1];
  return callerCurrency;
}

/**
 * Infer whether a line describes an expense or income based on keyword signals.
 */
export function inferTypeFromText(line: string): "expense" | "income" {
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

/**
 * Strip amounts and dates from text, leaving only the description content.
 */
export function stripAmountsAndDates(text: string): string {
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

/**
 * Check if a description looks like a total/subtotal/balance line
 * that should be excluded from transaction items.
 */
export function isTotalLike(description: string): boolean {
  return /\b(total|subtotal|balance|opening|closing|brought forward|carried forward)\b/i.test(
    description,
  );
}

/**
 * Pattern that matches noise rows in bank statements (headers, summaries, etc.)
 */
export const HEADER_NOISE_PATTERN =
  /(exported at|date range|balance summary|statement generated|opening balance|closing balance|total|account transactions|pending|reverted)/i;
