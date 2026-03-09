/**
 * Deterministic CSV/TSV parser for financial transaction files.
 *
 * This module replaces the legacy 16KB-truncated text preview approach with
 * full structured parsing. It handles:
 * - BOM detection and multi-encoding support (UTF-8, UTF-16 LE/BE, Latin-1)
 * - Quote-aware delimiter detection (comma, semicolon, tab, pipe)
 * - RFC 4180 compliant field parsing (quoted fields, embedded newlines)
 * - Header detection and column mapping
 * - Row-level transaction extraction with typed diagnostics
 */

import {
  type CsvDelimiter,
  type CsvParseConfig,
  CSV_DELIMITERS,
  DEFAULT_CSV_CONFIG,
  type ParseDiagnostics,
  type ParseResult,
  type ParsedTransaction,
  HEADER_NOISE_PATTERN,
  parseDateFromText,
  normalizeAmountString,
  extractAmountTokens,
  detectCurrencyFromText,
  inferTypeFromText,
  stripAmountsAndDates,
  isTotalLike,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Encoding detection and decoding
// ---------------------------------------------------------------------------

interface EncodingResult {
  text: string;
  encoding: string;
  hasBom: boolean;
}

/**
 * Detect encoding from BOM (Byte Order Mark) and decode the full file content.
 * Supports UTF-8 BOM, UTF-16 LE/BE, and falls back to UTF-8 (which also handles ASCII).
 * For files that fail UTF-8 strict decoding, falls back to Latin-1.
 */
export function decodeFileBytes(bytes: Uint8Array): EncodingResult {
  // UTF-8 BOM: EF BB BF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return {
      text: new TextDecoder("utf-8").decode(bytes.subarray(3)),
      encoding: "utf-8",
      hasBom: true,
    };
  }

  // UTF-16 LE BOM: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      text: new TextDecoder("utf-16le").decode(bytes.subarray(2)),
      encoding: "utf-16le",
      hasBom: true,
    };
  }

  // UTF-16 BE BOM: FE FF
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return {
      text: new TextDecoder("utf-16be").decode(bytes.subarray(2)),
      encoding: "utf-16be",
      hasBom: true,
    };
  }

  // Try UTF-8 strict first
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { text, encoding: "utf-8", hasBom: false };
  } catch {
    // Fall back to Latin-1 (Windows-1252 superset for practical purposes)
    return {
      text: new TextDecoder("windows-1252", { fatal: false }).decode(bytes),
      encoding: "windows-1252",
      hasBom: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Delimiter detection
// ---------------------------------------------------------------------------

/**
 * Detect the most likely delimiter by counting occurrences in the first N lines.
 * Uses a scoring approach: the delimiter with the most consistent column count
 * across lines wins. Quote-aware: delimiters inside quoted fields are ignored.
 */
export function detectDelimiter(
  text: string,
  maxSampleLines = 20,
): { delimiter: CsvDelimiter; confidence: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const sample = lines.slice(0, maxSampleLines);

  if (sample.length === 0) {
    return { delimiter: ",", confidence: 0 };
  }

  let bestDelimiter: CsvDelimiter = ",";
  let bestScore = -1;

  for (const delim of CSV_DELIMITERS) {
    const counts = sample.map((line) => countDelimiterInLine(line, delim));
    const nonZero = counts.filter((c) => c > 0);

    if (nonZero.length === 0) continue;

    // Score = consistency (how many lines have the same count) × column count
    const mode = findMode(nonZero);
    const consistency =
      nonZero.filter((c) => c === mode).length / sample.length;
    const score = consistency * (mode + 1); // +1 because 0 delimiters = 1 column

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  const confidence = Math.min(bestScore / sample.length, 1);
  return { delimiter: bestDelimiter, confidence };
}

/**
 * Count delimiter occurrences in a line, ignoring those inside quoted fields.
 */
function countDelimiterInLine(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      count++;
    }
  }

  return count;
}

/** Find the most common value in an array of numbers. */
function findMode(values: number[]): number {
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) || 0) + 1);
  }
  let mode = values[0];
  let maxFreq = 0;
  for (const [val, count] of freq) {
    if (count > maxFreq) {
      maxFreq = count;
      mode = val;
    }
  }
  return mode;
}

// ---------------------------------------------------------------------------
// RFC 4180 row parsing
// ---------------------------------------------------------------------------

/**
 * Parse CSV text into rows of string arrays, handling:
 * - Quoted fields (RFC 4180)
 * - Embedded newlines within quoted fields
 * - Escaped quotes (doubled "")
 * - Configurable delimiter
 *
 * Returns up to maxRows data rows (excluding the header if present).
 */
export function parseRows(
  text: string,
  delimiter: string,
  maxRows: number,
): string[][] {
  const rows: string[][] = [];
  let pos = 0;
  const len = text.length;

  while (pos < len && rows.length <= maxRows) {
    const { row, nextPos } = parseRow(text, pos, delimiter);
    pos = nextPos;

    // Skip completely empty rows
    if (row.length === 1 && row[0] === "") continue;

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV row starting at position `start`.
 * Returns the parsed fields and the position after the row terminator.
 */
function parseRow(
  text: string,
  start: number,
  delimiter: string,
): { row: string[]; nextPos: number } {
  const fields: string[] = [];
  let pos = start;
  const len = text.length;

  while (pos <= len) {
    if (pos === len) {
      // End of text
      fields.push("");
      break;
    }

    if (text[pos] === '"') {
      // Quoted field
      const { value, nextPos } = parseQuotedField(text, pos);
      fields.push(value);
      pos = nextPos;

      if (pos < len && text[pos] === delimiter) {
        pos++; // Skip delimiter
        continue;
      }
      // Row ends: skip CR/LF
      if (pos < len && text[pos] === "\r") pos++;
      if (pos < len && text[pos] === "\n") pos++;
      break;
    }

    // Unquoted field: scan until delimiter or EOL
    const delimIdx = text.indexOf(delimiter, pos);
    const crIdx = text.indexOf("\r", pos);
    const lfIdx = text.indexOf("\n", pos);

    // Find the nearest terminator
    let endIdx = len;
    let skipChars = 0;

    if (crIdx !== -1 && crIdx < endIdx) {
      endIdx = crIdx;
      skipChars = crIdx + 1 < len && text[crIdx + 1] === "\n" ? 2 : 1;
    }
    if (lfIdx !== -1 && lfIdx < endIdx) {
      endIdx = lfIdx;
      skipChars = 1;
    }

    if (delimIdx !== -1 && delimIdx < endIdx) {
      // Delimiter found before EOL
      fields.push(text.slice(pos, delimIdx));
      pos = delimIdx + 1;
      continue;
    }

    // EOL or EOF found before next delimiter
    fields.push(text.slice(pos, endIdx));
    pos = endIdx + skipChars;
    break;
  }

  return { row: fields, nextPos: pos };
}

/**
 * Parse a quoted field starting at position `start` (which should be a '"').
 * Handles doubled quotes ("") as escaped quotes.
 */
function parseQuotedField(
  text: string,
  start: number,
): { value: string; nextPos: number } {
  let pos = start + 1; // Skip opening quote
  const len = text.length;
  const parts: string[] = [];

  while (pos < len) {
    const quoteIdx = text.indexOf('"', pos);
    if (quoteIdx === -1) {
      // Unterminated quote: take rest of text
      parts.push(text.slice(pos));
      pos = len;
      break;
    }

    parts.push(text.slice(pos, quoteIdx));

    if (quoteIdx + 1 < len && text[quoteIdx + 1] === '"') {
      // Escaped quote
      parts.push('"');
      pos = quoteIdx + 2;
    } else {
      // End of quoted field
      pos = quoteIdx + 1;
      break;
    }
  }

  return { value: parts.join(""), nextPos: pos };
}

// ---------------------------------------------------------------------------
// Header detection & column mapping
// ---------------------------------------------------------------------------

interface CsvColumnMap {
  date: number;
  description: number;
  amount: number;
  moneyOut: number;
  moneyIn: number;
  currency: number;
  category: number;
  type: number;
}

/**
 * Synonym tables for header matching. Each target field has a list of
 * patterns that match common bank export column names.
 */
const HEADER_SYNONYMS: Record<keyof CsvColumnMap, RegExp> = {
  date: /^(date|posted|posting date|transaction date|value date|booked|booking date|trade date|settlement date|effective date)$/i,
  description:
    /^(description|details|merchant|memo|narration|reference|narrative|payee|beneficiary|name|transaction description|particulars|remark|remarks)$/i,
  amount:
    /^(amount|amt|value|sum|total|transaction amount|debit\/credit|net amount)$/i,
  moneyOut:
    /^(debit|money out|withdrawal|paid|paid out|outflow|expense|dr|debit amount|debit amt|withdrawals)$/i,
  moneyIn:
    /^(credit|money in|deposit|received|inflow|income|cr|credit amount|credit amt|deposits)$/i,
  currency: /^(currency|ccy|cur|currency code)$/i,
  category: /^(category|type|transaction type|trans type|category\/type)$/i,
  type: /^(type|transaction type|trans type|txn type)$/i,
};

/**
 * Detect which columns map to which fields by matching header names.
 * Returns null if neither date nor amount can be detected (no usable header).
 */
export function detectCsvHeaderMap(headerRow: string[]): CsvColumnMap | null {
  const map: CsvColumnMap = {
    date: -1,
    description: -1,
    amount: -1,
    moneyOut: -1,
    moneyIn: -1,
    currency: -1,
    category: -1,
    type: -1,
  };

  const normalized = headerRow.map((h) => h.trim());

  // First pass: exact synonym matching
  for (let i = 0; i < normalized.length; i++) {
    const header = normalized[i];
    if (!header) continue;

    for (const [field, regex] of Object.entries(HEADER_SYNONYMS)) {
      if (regex.test(header) && map[field as keyof CsvColumnMap] === -1) {
        map[field as keyof CsvColumnMap] = i;
        break; // First match wins for this column
      }
    }
  }

  // Must have at least date or amount to be useful
  const hasDate = map.date >= 0;
  const hasAmount = map.amount >= 0 || map.moneyOut >= 0 || map.moneyIn >= 0;

  if (!hasDate && !hasAmount) return null;

  return map;
}

// ---------------------------------------------------------------------------
// Row-level transaction extraction
// ---------------------------------------------------------------------------

/**
 * Extract a transaction from a single CSV data row using the detected column map.
 */
function extractTransactionFromRow(
  cells: string[],
  columnMap: CsvColumnMap | null,
  rowIndex: number,
  callerDate: string,
  callerCurrency: string,
): ParsedTransaction | null {
  if (cells.every((c) => !c.trim())) return null;

  const joined = cells.filter(Boolean).join(" | ");

  // Skip noise rows
  if (HEADER_NOISE_PATTERN.test(joined)) return null;

  // --- Date ---
  const dateSource =
    columnMap && columnMap.date >= 0 ? cells[columnMap.date] : joined;
  const date = parseDateFromText(dateSource, callerDate);
  // Without a column map, require a date to distinguish data from noise
  if (!columnMap && !date) return null;

  // --- Description ---
  const description =
    columnMap && columnMap.description >= 0
      ? cells[columnMap.description]
      : stripAmountsAndDates(joined) || joined;

  // Skip total-like rows
  if (isTotalLike(description)) return null;

  // --- Currency ---
  const currencySource =
    columnMap && columnMap.currency >= 0 ? cells[columnMap.currency] : joined;
  const currency = detectCurrencyFromText(currencySource, callerCurrency);

  // --- Amount & Type ---
  let amount: number | null = null;
  let type: "expense" | "income" = "expense";

  // Try moneyOut column first
  if (columnMap && columnMap.moneyOut >= 0) {
    const val = normalizeAmountString(cells[columnMap.moneyOut] || "");
    if (val !== null && val > 0) {
      amount = val;
      type = "expense";
    }
  }

  // Try moneyIn column if no moneyOut
  if (amount === null && columnMap && columnMap.moneyIn >= 0) {
    const val = normalizeAmountString(cells[columnMap.moneyIn] || "");
    if (val !== null && val > 0) {
      amount = val;
      type = "income";
    }
  }

  // Try single amount column with sign detection
  if (amount === null && columnMap && columnMap.amount >= 0) {
    const raw = cells[columnMap.amount] || "";
    const cleaned = raw.replace(/[^0-9,.\-()]/g, "");
    const isNegative = /^\s*-/.test(cleaned) || /\(.*\)/.test(cleaned);
    const val = normalizeAmountString(raw);
    if (val !== null && val > 0) {
      amount = val;
      type = isNegative ? "expense" : inferTypeFromText(joined);
    }
  }

  // Fallback: scan all cells for amount-like tokens
  if (amount === null) {
    const tokens = extractAmountTokens(joined);
    if (tokens.length > 0) {
      amount = tokens[0].value;
      type = inferTypeFromText(joined);
    }
  }

  if (amount === null || amount <= 0) return null;

  // Filter year-like amounts (1900-2100) unless there's a currency symbol
  if (amount >= 1900 && amount <= 2100 && !/[€$£¥₹]/.test(joined)) {
    return null;
  }

  // --- Category ---
  const category =
    columnMap && columnMap.category >= 0
      ? cells[columnMap.category]
      : undefined;

  return {
    type,
    amount,
    currency,
    date: date || callerDate,
    description: description.trim() || "",
    category: category?.trim() || undefined,
    sourceRowIndex: rowIndex,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse a CSV/TSV file from raw bytes into structured transactions.
 *
 * This is the primary deterministic CSV parser that replaces the old 16KB
 * text-preview approach. It:
 * 1. Detects encoding (BOM-aware, multi-encoding)
 * 2. Detects delimiter (quote-aware scoring)
 * 3. Parses all rows using RFC 4180 rules
 * 4. Detects header row and maps columns
 * 5. Extracts transactions with typed diagnostics
 *
 * @param bytes Raw file bytes
 * @param callerDate Caller's current date for year inference (YYYY-MM-DD)
 * @param callerCurrency Caller's default currency (ISO 4217)
 * @param config Optional parsing limits
 */
export function parseCsvFromBytes(
  bytes: Uint8Array,
  callerDate: string,
  callerCurrency: string,
  config: CsvParseConfig = DEFAULT_CSV_CONFIG,
): ParseResult {
  const warnings: string[] = [];

  // --- File size check ---
  if (bytes.length > config.maxFileBytes) {
    return {
      success: false,
      items: [],
      diagnostics: {
        parserPath: "csv_deterministic",
        rowsExamined: 0,
        rowsParsed: 0,
        rowsSkipped: 0,
        warnings: [],
      },
      errorCode: "FILE_TOO_LARGE",
      errorMessage: `File size ${(bytes.length / 1024 / 1024).toFixed(1)} MB exceeds ${(config.maxFileBytes / 1024 / 1024).toFixed(0)} MB limit`,
    };
  }

  if (bytes.length === 0) {
    return {
      success: false,
      items: [],
      diagnostics: {
        parserPath: "csv_deterministic",
        rowsExamined: 0,
        rowsParsed: 0,
        rowsSkipped: 0,
        warnings: [],
      },
      errorCode: "FILE_EMPTY",
      errorMessage: "File is empty",
    };
  }

  // --- Decode ---
  const { text, encoding, hasBom } = decodeFileBytes(bytes);

  if (!text.trim()) {
    return {
      success: false,
      items: [],
      diagnostics: {
        parserPath: "csv_deterministic",
        rowsExamined: 0,
        rowsParsed: 0,
        rowsSkipped: 0,
        encoding,
        hasBom,
        warnings: [],
      },
      errorCode: "FILE_EMPTY",
      errorMessage: "File contains no text content after decoding",
    };
  }

  // --- Detect delimiter ---
  const { delimiter, confidence: delimConfidence } = detectDelimiter(text);
  if (delimConfidence < 0.1) {
    warnings.push(
      `Low delimiter confidence (${delimConfidence.toFixed(2)}) for '${delimiter}'; parsing may be unreliable`,
    );
  }

  // --- Parse rows ---
  const allRows = parseRows(
    text,
    delimiter,
    config.maxRows + config.maxHeaderScanRows,
  );

  if (allRows.length === 0) {
    return {
      success: false,
      items: [],
      diagnostics: {
        parserPath: "csv_deterministic",
        rowsExamined: 0,
        rowsParsed: 0,
        rowsSkipped: 0,
        delimiter,
        encoding,
        hasBom,
        warnings,
      },
      errorCode: "CSV_PARSE_FAILED",
      errorMessage: "No rows could be parsed from the file",
    };
  }

  // --- Detect header ---
  let columnMap: CsvColumnMap | null = null;
  let headerRowIndex = -1;

  // Scan first N rows for a header
  const headerScanLimit = Math.min(allRows.length, 10);
  for (let i = 0; i < headerScanLimit; i++) {
    const row = allRows[i];
    // Trim cells for header detection
    const trimmed = row.map((c) => c.trim());
    const detected = detectCsvHeaderMap(trimmed);
    if (detected) {
      columnMap = detected;
      headerRowIndex = i;
      break;
    }
  }

  if (!columnMap) {
    warnings.push(
      "No header row detected; using heuristic row-level extraction",
    );
  }

  // --- Extract transactions ---
  const dataStartRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const items: ParsedTransaction[] = [];
  let rowsExamined = 0;
  let rowsSkipped = 0;

  for (
    let i = dataStartRow;
    i < allRows.length && items.length < config.maxRows;
    i++
  ) {
    rowsExamined++;
    const row = allRows[i].map((c) => c.trim());

    // Limit column count
    const limited = row.slice(0, config.maxColumns);

    const transaction = extractTransactionFromRow(
      limited,
      columnMap,
      i,
      callerDate,
      callerCurrency,
    );

    if (transaction) {
      items.push(transaction);
    } else {
      rowsSkipped++;
    }
  }

  // Row limit warning
  if (allRows.length - dataStartRow > config.maxRows) {
    warnings.push(
      `File contains more than ${config.maxRows} data rows; only the first ${config.maxRows} were parsed`,
    );
  }

  // --- Build result ---
  const detectedHeaders: Record<string, number> = {};
  if (columnMap) {
    for (const [field, idx] of Object.entries(columnMap)) {
      if (idx >= 0) {
        detectedHeaders[field] = idx;
      }
    }
  }

  return {
    success: true,
    items,
    diagnostics: {
      parserPath: "csv_deterministic",
      rowsExamined,
      rowsParsed: items.length,
      rowsSkipped,
      delimiter,
      encoding,
      hasBom,
      headerRowIndex: headerRowIndex >= 0 ? headerRowIndex : undefined,
      detectedHeaders:
        Object.keys(detectedHeaders).length > 0 ? detectedHeaders : undefined,
      warnings,
    },
    errorCode: items.length === 0 ? "NO_TRANSACTIONS_FOUND" : undefined,
    errorMessage:
      items.length === 0
        ? "No transactions could be extracted from the file"
        : undefined,
  };
}

/**
 * Convenience wrapper: parse CSV from a text string (already decoded).
 * Useful when the caller has already decoded the file content.
 */
export function parseCsvFromText(
  text: string,
  callerDate: string,
  callerCurrency: string,
  config: CsvParseConfig = DEFAULT_CSV_CONFIG,
): ParseResult {
  const bytes = new TextEncoder().encode(text);
  return parseCsvFromBytes(bytes, callerDate, callerCurrency, config);
}
