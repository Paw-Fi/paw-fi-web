/**
 * Deterministic XLSX/XLS parser for financial transaction files.
 *
 * This module extracts the spreadsheet parsing logic from analyze-core.ts
 * into a focused, testable module. It handles:
 * - Multi-sheet workbooks (scans all sheets, uses best match)
 * - Header row detection via synonym matching
 * - Deterministic column mapping (date, description, amount, debit/credit, currency)
 * - Row-level extraction with typed diagnostics
 * - Explicit XLS rejection with guidance (if unsupported)
 * - Configurable row/column limits with warnings instead of silent truncation
 */

import * as XLSX from "https://esm.sh/xlsx@0.18.5?no-dts";

import {
  DEFAULT_XLSX_CONFIG,
  detectCurrencyFromText,
  extractAmountTokens,
  HEADER_NOISE_PATTERN,
  inferTypeFromText,
  isTotalLike,
  normalizeAmountString,
  parseDateFromText,
  type ParseDiagnostics,
  type ParsedTransaction,
  type ParseResult,
  stripAmountsAndDates,
  type XlsxParseConfig,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Cell extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract text content from an XLSX cell value.
 * Handles null, undefined, string, number, boolean, and Date values.
 */
export function extractCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

/**
 * Parse a signed amount from a cell value.
 * Handles numeric cells directly and text cells via normalizeAmountString.
 * Returns both the absolute amount and whether the original was negative.
 */
export function parseSignedAmountFromCell(
  value: unknown,
): { amount: number; isNegative: boolean } | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { amount: Math.abs(value), isNegative: value < 0 };
  }

  const text = extractCellText(value);
  if (!text) return null;
  const hasNegative = /^\s*[\-−–—]/.test(text) || /\(.*\)/.test(text);
  const normalized = normalizeAmountString(text);
  if (normalized === null) return null;
  return { amount: normalized, isNegative: hasNegative };
}

// ---------------------------------------------------------------------------
// Header detection
// ---------------------------------------------------------------------------

interface XlsxColumnMap {
  date: number;
  description: number;
  amount: number;
  moneyOut: number;
  moneyIn: number;
  currency: number;
}

/**
 * Detect column header mapping from a row of cell values.
 * Returns null if neither date nor amount columns can be identified.
 */
export function detectHeaderMap(row: string[]): XlsxColumnMap | null {
  const header = row.map((cell) => cell.toLowerCase().trim());

  const hasDate = header.some((cell) =>
    /date|posted|transaction date|value date|booking date|дата|дата проводки|дата операции|дата транзакции|дата платежа/
      .test(cell)
  );
  const hasAmount = header.some((cell) =>
    /amount|amt|value|debit|credit|money out|money in|withdrawal|deposit|сумма|расход|поступлен|зачислен|дебет|кредит/
      .test(
        cell,
      )
  );

  if (!hasDate && !hasAmount) return null;

  const indexOf = (regex: RegExp) =>
    header.findIndex((cell) => regex.test(cell));

  return {
    date: indexOf(
      /date|posted|transaction date|value date|booking date|дата|дата проводки|дата операции|дата транзакции|дата платежа/,
    ),
    description: indexOf(
      /description|details|merchant|memo|narration|reference|narrative|payee|particulars|remark|описание|назначение|детали|комментарий|контрагент|получатель|плательщик/,
    ),
    amount: indexOf(
      /^(amount|amt|value|sum|total|net|сумма|сумма операции|сумма в валюте счета|сумма в валюте операции)$/i,
    ),
    moneyOut: indexOf(
      /debit|money out|withdrawal|paid|paid out|outflow|dr|debit amount|расход|расходы|списание|дебет/,
    ),
    moneyIn: indexOf(
      /credit|money in|deposit|received|inflow|cr|credit amount|приход|поступление|поступления|зачисление|кредит/,
    ),
    currency: indexOf(/currency|ccy|cur|валюта|валюта счета|валюта операции/),
  };
}

// ---------------------------------------------------------------------------
// Preview builder (for LLM fallback)
// ---------------------------------------------------------------------------

/**
 * Build a text preview of the spreadsheet for LLM-based fallback analysis.
 * This is used when deterministic extraction finds 0 items.
 * Returns a text representation or null if the workbook can't be read.
 */
export function buildXlsxPreview(buf: Uint8Array): string | null {
  try {
    // deno-lint-ignore no-explicit-any
    const wb = XLSX.read(buf, { type: "array" }) as any;
    const sheetNames: string[] = Array.isArray(wb.SheetNames)
      ? wb.SheetNames
      : [];
    if (sheetNames.length === 0) return null;

    const MAX_ROWS_PER_SHEET = 500;
    const MAX_COLS = 12;
    const MAX_TOTAL_ROWS = 1500;

    let totalRows = 0;
    const sheetBlocks: string[] = [];

    for (const sheetName of sheetNames) {
      if (totalRows >= MAX_TOTAL_ROWS) break;
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      // deno-lint-ignore no-explicit-any
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const remaining = MAX_TOTAL_ROWS - totalRows;
      const rowLimit = Math.min(MAX_ROWS_PER_SHEET, remaining);
      // deno-lint-ignore no-explicit-any
      const limited = rows
        .slice(0, rowLimit)
        // deno-lint-ignore no-explicit-any
        .map((r: any) => (Array.isArray(r) ? r.slice(0, MAX_COLS) : r));
      if (limited.length === 0) continue;

      totalRows += limited.length;
      // deno-lint-ignore no-explicit-any
      const previewLines = limited.map((r: any) => JSON.stringify(r));
      sheetBlocks.push(
        `Sheet "${sheetName}" data (${limited.length} of ${rows.length} rows):\n${
          previewLines.join("\n")
        }`,
      );
    }

    if (sheetBlocks.length === 0) return null;
    return sheetBlocks.join("\n\n");
  } catch (e) {
    console.error("XLSX preview build error", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse an XLSX file from raw bytes into structured transactions.
 *
 * This is the deterministic XLSX parser extracted from analyze-core.ts.
 * It scans all sheets, detects headers, and extracts transactions with
 * full diagnostics.
 *
 * @param bytes Raw file bytes
 * @param callerDate Caller's current date for year inference (YYYY-MM-DD)
 * @param callerCurrency Caller's default currency (ISO 4217)
 * @param config Optional parsing limits
 */
export function parseXlsxFromBytes(
  bytes: Uint8Array,
  callerDate: string,
  callerCurrency: string,
  config: XlsxParseConfig = DEFAULT_XLSX_CONFIG,
): ParseResult {
  const warnings: string[] = [];

  if (bytes.length === 0) {
    return {
      success: false,
      items: [],
      diagnostics: {
        parserPath: "xlsx_deterministic",
        rowsExamined: 0,
        rowsParsed: 0,
        rowsSkipped: 0,
        warnings: [],
      },
      errorCode: "FILE_EMPTY",
      errorMessage: "File is empty",
    };
  }

  // --- Check for legacy XLS format ---
  // XLS files start with the OLE2 Compound Document header: D0 CF 11 E0
  const isLegacyXls = bytes.length >= 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0;

  // XLSX files are ZIP archives starting with PK (50 4B)
  const isXlsx = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;

  if (isLegacyXls && !isXlsx) {
    // Attempt to parse with the xlsx library anyway — it has some xls support
    warnings.push(
      "Legacy .xls format detected. Support is limited; consider converting to .xlsx for best results.",
    );
  }

  // --- Parse workbook ---
  // deno-lint-ignore no-explicit-any
  let wb: any;
  try {
    wb = XLSX.read(bytes, { type: "array", cellDates: true });
  } catch (e) {
    return {
      success: false,
      items: [],
      diagnostics: {
        parserPath: "xlsx_deterministic",
        rowsExamined: 0,
        rowsParsed: 0,
        rowsSkipped: 0,
        warnings,
      },
      errorCode: "XLSX_PARSE_FAILED",
      errorMessage: `Failed to parse workbook: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }

  const sheetNames: string[] = Array.isArray(wb.SheetNames)
    ? wb.SheetNames
    : [];
  if (sheetNames.length === 0) {
    return {
      success: false,
      items: [],
      diagnostics: {
        parserPath: "xlsx_deterministic",
        rowsExamined: 0,
        rowsParsed: 0,
        rowsSkipped: 0,
        sheetNames: [],
        warnings,
      },
      errorCode: "XLSX_NO_SHEETS",
      errorMessage: "Workbook contains no sheets",
    };
  }

  // --- Process sheets ---
  const allItems: ParsedTransaction[] = [];
  let totalRowsExamined = 0;
  let totalRowsSkipped = 0;
  let activeSheet: string | undefined;
  let headerRowIndex: number | undefined;
  let detectedHeaders: Record<string, number> | undefined;

  for (const sheetName of sheetNames) {
    if (allItems.length >= config.maxTotalRows) {
      warnings.push(
        `Stopped processing after ${allItems.length} items; remaining sheets skipped`,
      );
      break;
    }

    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    // deno-lint-ignore no-explicit-any
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
    });
    if (!Array.isArray(rows) || rows.length === 0) continue;

    // --- Detect header ---
    let columnMap: XlsxColumnMap | null = null;
    let startRow = 0;

    for (let i = 0; i < Math.min(rows.length, config.maxHeaderScanRows); i++) {
      const row = Array.isArray(rows[i]) ? rows[i] : [];
      const rowText = row.map((cell: unknown) => extractCellText(cell));
      const detected = detectHeaderMap(rowText);
      if (detected) {
        columnMap = detected;
        startRow = i + 1;

        // Track first sheet's header info for diagnostics
        if (!activeSheet) {
          activeSheet = sheetName;
          headerRowIndex = i;
          const headers: Record<string, number> = {};
          for (const [field, idx] of Object.entries(detected)) {
            if (idx >= 0) headers[field] = idx;
          }
          if (Object.keys(headers).length > 0) detectedHeaders = headers;
        }
        break;
      }
    }

    // --- Extract transactions ---
    const limit = Math.min(rows.length, startRow + config.maxRowsPerSheet);
    if (rows.length > startRow + config.maxRowsPerSheet) {
      warnings.push(
        `Sheet "${sheetName}" has ${
          rows.length - startRow
        } data rows; only first ${config.maxRowsPerSheet} processed`,
      );
    }

    for (let i = startRow; i < limit; i++) {
      if (allItems.length >= config.maxTotalRows) break;

      totalRowsExamined++;
      const row = Array.isArray(rows[i]) ? rows[i] : [];
      if (row.length === 0) continue;

      const cells = row
        .slice(0, config.maxColumns)
        .map((cell: unknown) => extractCellText(cell));
      const joined = cells.filter(Boolean).join(" | ");
      if (!joined) continue;
      if (HEADER_NOISE_PATTERN.test(joined)) {
        totalRowsSkipped++;
        continue;
      }

      // --- Date ---
      const dateText = columnMap && columnMap.date >= 0
        ? cells[columnMap.date]
        : joined;
      const rowDate = parseDateFromText(dateText, callerDate);
      if (!columnMap && !rowDate) {
        totalRowsSkipped++;
        continue;
      }

      // --- Description ---
      const descriptionText = columnMap && columnMap.description >= 0
        ? cells[columnMap.description]
        : stripAmountsAndDates(joined) || joined;

      if (isTotalLike(descriptionText)) {
        totalRowsSkipped++;
        continue;
      }

      // --- Currency ---
      const currencyText = columnMap && columnMap.currency >= 0
        ? cells[columnMap.currency]
        : joined;

      // --- Amount & Type ---
      let amountValue: number | null = null;
      let type: "expense" | "income" = "expense";

      // Try moneyOut column
      if (columnMap && columnMap.moneyOut >= 0) {
        const parsed = parseSignedAmountFromCell(rows[i][columnMap.moneyOut]);
        if (parsed) {
          amountValue = parsed.amount;
          type = "expense";
        }
      }

      // Try moneyIn column
      if (amountValue === null && columnMap && columnMap.moneyIn >= 0) {
        const parsed = parseSignedAmountFromCell(rows[i][columnMap.moneyIn]);
        if (parsed) {
          amountValue = parsed.amount;
          type = "income";
        }
      }

      // Try single amount column
      if (amountValue === null && columnMap && columnMap.amount >= 0) {
        const parsed = parseSignedAmountFromCell(rows[i][columnMap.amount]);
        if (parsed) {
          amountValue = parsed.amount;
          type = parsed.isNegative ? "expense" : inferTypeFromText(joined);
        }
      }

      // Fallback: scan for amount tokens
      if (amountValue === null) {
        const tokens = extractAmountTokens(joined);
        if (tokens.length > 0) {
          amountValue = tokens[0].value;
          type = inferTypeFromText(joined);
        } else {
          // Try raw cell values
          for (const cell of row.slice(0, config.maxColumns)) {
            const parsed = parseSignedAmountFromCell(cell);
            if (parsed) {
              amountValue = parsed.amount;
              type = parsed.isNegative ? "expense" : inferTypeFromText(joined);
              break;
            }
          }
        }
      }

      if (!amountValue || amountValue <= 0) {
        totalRowsSkipped++;
        continue;
      }

      // Filter year-like amounts
      if (
        amountValue >= 1900 &&
        amountValue <= 2100 &&
        !/[€$£¥₹]/.test(joined)
      ) {
        totalRowsSkipped++;
        continue;
      }

      const currency = detectCurrencyFromText(currencyText, callerCurrency) ||
        callerCurrency;

      if (HEADER_NOISE_PATTERN.test(descriptionText)) {
        totalRowsSkipped++;
        continue;
      }

      allItems.push({
        type,
        amount: amountValue,
        currency,
        date: rowDate || callerDate,
        description: descriptionText.trim() || "",
        sourceRowIndex: i,
      });
    }
  }

  return {
    success: true,
    items: allItems,
    diagnostics: {
      parserPath: "xlsx_deterministic",
      rowsExamined: totalRowsExamined,
      rowsParsed: allItems.length,
      rowsSkipped: totalRowsSkipped,
      sheetNames,
      activeSheet,
      headerRowIndex,
      detectedHeaders,
      warnings,
    },
    errorCode: allItems.length === 0 ? "NO_TRANSACTIONS_FOUND" : undefined,
    errorMessage: allItems.length === 0
      ? "No transactions could be extracted from the spreadsheet"
      : undefined,
  };
}
