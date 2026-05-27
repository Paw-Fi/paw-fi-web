import { normalizeCurrencyCode } from "./currency-normalize.ts";
import { CURRENCY_SYMBOLS } from "./currency-symbols.ts";

export interface OcrCurrencyResolutionInput {
  detectedCurrencySymbol?: string | null;
  detectedCurrencyCode?: string | null;
  rawOcrText?: string | null;
  userPreferredCurrency?: string | null;
  merchantCountry?: string | null;
}

export interface OcrCurrencyResolutionResult {
  finalCurrencyCode: string;
  confidence: "high" | "medium" | "low";
  reason:
    | "explicit_currency_code_found"
    | "explicit_localized_symbol_found"
    | "ambiguous_symbol_used_user_preference"
    | "merchant_country_override"
    | "fallback_user_preference";
}

const DEFAULT_CURRENCY = "USD";

const SUPPORTED_CURRENCY_CODES = new Set(Object.keys(CURRENCY_SYMBOLS));

const LOCALIZED_SYMBOL_TO_CURRENCY: Record<string, string> = {
  US$: "USD",
  U$: "USD",
  USD$: "USD",
  C$: "CAD",
  CA$: "CAD",
  CAD$: "CAD",
  A$: "AUD",
  AU$: "AUD",
  AUD$: "AUD",
  S$: "SGD",
  SG$: "SGD",
  SGD$: "SGD",
  HK$: "HKD",
  HKD$: "HKD",
  MOP$: "MOP",
  MO$: "MOP",
  NZ$: "NZD",
  NZD$: "NZD",
  MX$: "MXN",
  MEX$: "MXN",
  NT$: "TWD",
  R$: "BRL",
  BZ$: "BZD",
  J$: "JMD",
  RD$: "DOP",
};

const AMBIGUOUS_SYMBOLS = new Set(["$", "£", "¥", "￥", "₨", "KR", "FR"]);

const UNAMBIGUOUS_SYMBOL_TO_CURRENCY = (() => {
  const symbolCounts = new Map<string, number>();
  for (const rawSymbol of Object.values(CURRENCY_SYMBOLS)) {
    const symbol = normalizeSymbol(rawSymbol);
    if (!symbol || AMBIGUOUS_SYMBOLS.has(symbol)) continue;
    if (!/[^\p{L}]/u.test(symbol)) continue;
    symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
  }

  const map = new Map<string, string>();
  for (const [code, rawSymbol] of Object.entries(CURRENCY_SYMBOLS)) {
    const symbol = normalizeSymbol(rawSymbol);
    const normalizedCode = normalizeCurrencyCode(code);
    if (!symbol || !normalizedCode) continue;
    if (symbolCounts.get(symbol) !== 1) continue;
    map.set(symbol, normalizedCode);
  }
  return map;
})();

const MERCHANT_COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  USA: "USD",
  UNITEDSTATES: "USD",
  CA: "CAD",
  CANADA: "CAD",
  AU: "AUD",
  AUSTRALIA: "AUD",
  SG: "SGD",
  SINGAPORE: "SGD",
  NZ: "NZD",
  NEWZEALAND: "NZD",
  HK: "HKD",
  HONGKONG: "HKD",
  MO: "MOP",
  MACAU: "MOP",
  MACAO: "MOP",
  MX: "MXN",
  MEXICO: "MXN",
  JP: "JPY",
  JAPAN: "JPY",
  CN: "CNY",
  CHINA: "CNY",
  GB: "GBP",
  UK: "GBP",
  UNITEDKINGDOM: "GBP",
};

function normalizePreferredCurrency(value?: string | null): string {
  const normalized = normalizeCurrencyCode(value);
  return normalized && SUPPORTED_CURRENCY_CODES.has(normalized)
    ? normalized
    : DEFAULT_CURRENCY;
}

function normalizeEvidenceText(value?: string | null): string {
  return (value || "").trim();
}

function normalizeSymbol(value?: string | null): string {
  return (value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function hasExplicitCurrencyCode(text: string, code: string): boolean {
  if (!text || !code) return false;
  const upperText = text.toUpperCase();
  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Z])${escapedCode}([^A-Z]|$)`).test(upperText);
}

function findExplicitCurrencyCode(text: string): string | null {
  return findExplicitCurrencyCodes(text).values().next().value ?? null;
}

function findExplicitCurrencyCodes(text: string): Set<string> {
  const matches = new Set<string>();
  const upperText = text.toUpperCase();
  for (const code of SUPPORTED_CURRENCY_CODES) {
    if (hasExplicitCurrencyCode(upperText, code)) matches.add(code);
  }
  return matches;
}

function findLocalizedSymbol(
  text: string,
  symbol?: string | null,
): string | null {
  return (
    findLocalizedSymbolCurrencies(text, symbol).values().next().value ?? null
  );
}

function findLocalizedSymbolCurrencies(
  text: string,
  symbol?: string | null,
): Set<string> {
  const matches = new Set<string>();
  const candidates = [symbol, text]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toUpperCase());

  const sortedSymbols = Object.keys(LOCALIZED_SYMBOL_TO_CURRENCY).sort(
    (left, right) => right.length - left.length,
  );
  for (const rawText of candidates) {
    for (const localizedSymbol of sortedSymbols) {
      if (rawText.includes(localizedSymbol)) {
        matches.add(LOCALIZED_SYMBOL_TO_CURRENCY[localizedSymbol]);
      }
    }
  }
  return matches;
}

function findUnambiguousSymbol(symbol?: string | null): string | null {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol || AMBIGUOUS_SYMBOLS.has(normalizedSymbol)) return null;

  const mapped =
    UNAMBIGUOUS_SYMBOL_TO_CURRENCY.get(normalizedSymbol) ||
    normalizeCurrencyCode(normalizedSymbol);
  return mapped && SUPPORTED_CURRENCY_CODES.has(mapped) ? mapped : null;
}

function findUnambiguousSymbolInText(text: string): string | null {
  return (
    findUnambiguousSymbolCurrenciesInText(text).values().next().value ?? null
  );
}

function findUnambiguousSymbolCurrenciesInText(text: string): Set<string> {
  const matches = new Set<string>();
  const normalizedText = normalizeSymbol(text);
  const symbols = Array.from(UNAMBIGUOUS_SYMBOL_TO_CURRENCY.keys()).sort(
    (left, right) => right.length - left.length,
  );
  for (const symbol of symbols) {
    if (normalizedText.includes(symbol)) {
      const currency = UNAMBIGUOUS_SYMBOL_TO_CURRENCY.get(symbol);
      if (currency) matches.add(currency);
    }
  }
  return matches;
}

export function resolveSingleStrongCurrencyEvidenceFromOCRText(
  text?: string | null,
): string | null {
  const rawText = normalizeEvidenceText(text);
  if (!rawText) return null;

  const codes = new Set<string>();
  for (const code of findExplicitCurrencyCodes(rawText)) codes.add(code);
  for (const code of findLocalizedSymbolCurrencies(rawText)) codes.add(code);
  for (const code of findUnambiguousSymbolCurrenciesInText(rawText)) {
    codes.add(code);
  }

  return codes.size === 1 ? (codes.values().next().value ?? null) : null;
}

function findMerchantCountryCurrency(country?: string | null): string | null {
  const key = (country || "").toUpperCase().replace(/[^A-Z]/g, "");
  const currency = MERCHANT_COUNTRY_TO_CURRENCY[key];
  return currency && SUPPORTED_CURRENCY_CODES.has(currency) ? currency : null;
}

function hasAmbiguousCurrencySymbol(
  text: string,
  symbol?: string | null,
): boolean {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (normalizedSymbol && AMBIGUOUS_SYMBOLS.has(normalizedSymbol)) return true;
  return /[$£¥￥₨]|\b(?:kr|fr)\b/i.test(text);
}

export function resolveCurrencyFromOCR(
  input: OcrCurrencyResolutionInput,
): OcrCurrencyResolutionResult {
  const preferredCurrency = normalizePreferredCurrency(
    input.userPreferredCurrency,
  );
  const rawText = normalizeEvidenceText(input.rawOcrText);
  const localizedSymbolCurrency = findLocalizedSymbol(
    rawText,
    input.detectedCurrencySymbol,
  );
  if (localizedSymbolCurrency) {
    return {
      finalCurrencyCode: localizedSymbolCurrency,
      confidence: "high",
      reason: "explicit_localized_symbol_found",
    };
  }

  const detectedCode = normalizeCurrencyCode(input.detectedCurrencyCode);
  if (detectedCode && hasExplicitCurrencyCode(rawText, detectedCode)) {
    return {
      finalCurrencyCode: detectedCode,
      confidence: "high",
      reason: "explicit_currency_code_found",
    };
  }

  const rawTextCode = findExplicitCurrencyCode(rawText);
  if (rawTextCode) {
    return {
      finalCurrencyCode: rawTextCode,
      confidence: "high",
      reason: "explicit_currency_code_found",
    };
  }

  const rawTextUnambiguousSymbolCurrency = findUnambiguousSymbolInText(rawText);
  if (rawTextUnambiguousSymbolCurrency) {
    return {
      finalCurrencyCode: rawTextUnambiguousSymbolCurrency,
      confidence: "high",
      reason: "explicit_localized_symbol_found",
    };
  }

  const merchantCountryCurrency = findMerchantCountryCurrency(
    input.merchantCountry,
  );
  if (
    merchantCountryCurrency &&
    merchantCountryCurrency !== preferredCurrency
  ) {
    return {
      finalCurrencyCode: merchantCountryCurrency,
      confidence: "medium",
      reason: "merchant_country_override",
    };
  }

  if (hasAmbiguousCurrencySymbol(rawText, input.detectedCurrencySymbol)) {
    return {
      finalCurrencyCode: preferredCurrency,
      confidence: "medium",
      reason: "ambiguous_symbol_used_user_preference",
    };
  }

  const unambiguousSymbolCurrency = findUnambiguousSymbol(
    input.detectedCurrencySymbol,
  );
  if (unambiguousSymbolCurrency) {
    return {
      finalCurrencyCode: unambiguousSymbolCurrency,
      confidence: "high",
      reason: "explicit_localized_symbol_found",
    };
  }

  if (detectedCode && detectedCode === preferredCurrency) {
    return {
      finalCurrencyCode: detectedCode,
      confidence: "medium",
      reason: "fallback_user_preference",
    };
  }

  return {
    finalCurrencyCode: preferredCurrency,
    confidence: "low",
    reason: "fallback_user_preference",
  };
}
