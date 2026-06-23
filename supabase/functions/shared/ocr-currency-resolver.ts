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
  N$: "NAD",
  NA$: "NAD",
  NAD$: "NAD",
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
  BZD$: "BZD",
  BDS$: "BBD",
  BBD$: "BBD",
  CI$: "KYD",
  KY$: "KYD",
  KYD$: "KYD",
  EC$: "XCD",
  XCD$: "XCD",
  G$: "GYD",
  GY$: "GYD",
  GYD$: "GYD",
  L$: "LRD",
  LR$: "LRD",
  LRD$: "LRD",
  TT$: "TTD",
  TTD$: "TTD",
  FJ$: "FJD",
  FJD$: "FJD",
  J$: "JMD",
  RD$: "DOP",
  "E£": "EGP",
  "£S": "SYP",
  "S£": "SYP",
};

const AMBIGUOUS_SYMBOLS = new Set([
  "$",
  "＄",
  "£",
  "￡",
  "¥",
  "￥",
  "₩",
  "￦",
  "KR",
  "KR.",
  "₨",
  "RS",
  "RS.",
  "FR",
  "FR.",
  "₣",
  "₤",
  "₱",
]);

const AMBIGUOUS_TEXT_TOKEN_REGEX =
  /[$＄£￡¥￥₩￦₨₣₤₱]|(^|[^A-Za-z])(?:kr|fr|rs)\.?(?=[^A-Za-z]|$)/i;

const UNIQUE_SYMBOL_TO_CURRENCY: Record<string, string> = {
  "€": "EUR",
  "₹": "INR",
  "₪": "ILS",
  "₽": "RUB",
  "₺": "TRY",
  "₴": "UAH",
  "₫": "VND",
  "₦": "NGN",
  "₵": "GHS",
  "₡": "CRC",
  "₲": "PYG",
  "฿": "THB",
  "৳": "BDT",
  "KČ": "CZK",
  "ZŁ": "PLN",
  "S/": "PEN",
  "د.إ": "AED",
  "ر.س": "SAR",
  "د.ج": "DZD",
  "د.أ": "JOD",
};

const EXPLICIT_CURRENCY_NAME_TO_CODE: Record<string, string> = {
  "UAE DIRHAM": "AED",
  "ARGENTINE PESO": "ARS",
  "AUSTRALIAN DOLLAR": "AUD",
  "BAHAMIAN DOLLAR": "BSD",
  "BANGLADESHI TAKA": "BDT",
  "BARBADIAN DOLLAR": "BBD",
  "BELIZE DOLLAR": "BZD",
  "BRUNEI DOLLAR": "BND",
  "BRAZILIAN REAL": "BRL",
  "BURUNDIAN FRANC": "BIF",
  "CANADIAN DOLLAR": "CAD",
  "CAYMAN ISLANDS DOLLAR": "KYD",
  "CFP FRANC": "XPF",
  "SWISS FRANC": "CHF",
  "CHILEAN PESO": "CLP",
  "CHINESE YUAN": "CNY",
  "CHINESE RENMINBI": "CNY",
  "COLOMBIAN PESO": "COP",
  "CONGOLESE FRANC": "CDF",
  "CZECH KORUNA": "CZK",
  "DANISH KRONE": "DKK",
  "DJIBOUTIAN FRANC": "DJF",
  "DOMINICAN PESO": "DOP",
  "EAST CARIBBEAN DOLLAR": "XCD",
  "EGYPTIAN POUND": "EGP",
  "ETHIOPIAN BIRR": "ETB",
  "EURO": "EUR",
  "FALKLAND ISLANDS POUND": "FKP",
  "FIJIAN DOLLAR": "FJD",
  "BRITISH POUND": "GBP",
  "POUND STERLING": "GBP",
  "GIBRALTAR POUND": "GIP",
  "GHANAIAN CEDI": "GHS",
  "GUATEMALAN QUETZAL": "GTQ",
  "GUINEAN FRANC": "GNF",
  "GUYANESE DOLLAR": "GYD",
  "HONG KONG DOLLAR": "HKD",
  "ICELANDIC KRONA": "ISK",
  "JAMAICAN DOLLAR": "JMD",
  "INDONESIAN RUPIAH": "IDR",
  "ISRAELI SHEKEL": "ILS",
  "INDIAN RUPEE": "INR",
  "JAPANESE YEN": "JPY",
  "KENYAN SHILLING": "KES",
  "SOUTH KOREAN WON": "KRW",
  "KOREAN WON": "KRW",
  "NORTH KOREAN WON": "KPW",
  "LEBANESE POUND": "LBP",
  "LIBERIAN DOLLAR": "LRD",
  "SRI LANKAN RUPEE": "LKR",
  "MACANESE PATACA": "MOP",
  "MACAU PATACA": "MOP",
  "MEXICAN PESO": "MXN",
  "MALAYSIAN RINGGIT": "MYR",
  "MALAWIAN KWACHA": "MWK",
  "MAURITIAN RUPEE": "MUR",
  "NAMIBIAN DOLLAR": "NAD",
  "NIGERIAN NAIRA": "NGN",
  "NORWEGIAN KRONE": "NOK",
  "NEPALESE RUPEE": "NPR",
  "NEW ZEALAND DOLLAR": "NZD",
  "PHILIPPINE PESO": "PHP",
  "PERUVIAN SOL": "PEN",
  "POLISH ZLOTY": "PLN",
  "PAKISTANI RUPEE": "PKR",
  "PARAGUAYAN GUARANI": "PYG",
  "SERBIAN DINAR": "RSD",
  "ROMANIAN LEU": "RON",
  "RUSSIAN RUBLE": "RUB",
  "RWANDAN FRANC": "RWF",
  "SAUDI RIYAL": "SAR",
  "SEYCHELLOIS RUPEE": "SCR",
  "SAINT HELENA POUND": "SHP",
  "SUDANESE POUND": "SDG",
  "SWEDISH KRONA": "SEK",
  "SINGAPORE DOLLAR": "SGD",
  "SOUTH SUDANESE POUND": "SSP",
  "SURINAMESE DOLLAR": "SRD",
  "SYRIAN POUND": "SYP",
  "THAI BAHT": "THB",
  "TRINIDAD AND TOBAGO DOLLAR": "TTD",
  "NEW TAIWAN DOLLAR": "TWD",
  "TAIWAN DOLLAR": "TWD",
  "TURKISH LIRA": "TRY",
  "UKRAINIAN HRYVNIA": "UAH",
  "US DOLLAR": "USD",
  "U.S. DOLLAR": "USD",
  "UNITED STATES DOLLAR": "USD",
  "AMERICAN DOLLAR": "USD",
  "VIETNAMESE DONG": "VND",
  "SOUTH AFRICAN RAND": "ZAR",
  "HUNGARIAN FORINT": "HUF",
  "ZAMBIAN KWACHA": "ZMW",
  "WEST AFRICAN CFA FRANC": "XOF",
  "COSTA RICAN COLON": "CRC",
  "CENTRAL AFRICAN CFA FRANC": "XAF",
};

const UNAMBIGUOUS_SYMBOL_TO_CURRENCY = (() => {
  const map = new Map<string, string>();
  for (const [rawSymbol, rawCode] of Object.entries(UNIQUE_SYMBOL_TO_CURRENCY)) {
    const symbol = normalizeSymbol(rawSymbol);
    const normalizedCode = normalizeCurrencyCode(rawCode);
    if (!symbol || !normalizedCode || !SUPPORTED_CURRENCY_CODES.has(normalizedCode)) {
      continue;
    }
    map.set(symbol, normalizedCode);
  }
  return map;
})();

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

function findExplicitCurrencyCodes(text: string): Set<string> {
  const matches = new Set<string>();
  const upperText = text.toUpperCase();
  for (const code of SUPPORTED_CURRENCY_CODES) {
    if (hasExplicitCurrencyCode(upperText, code)) matches.add(code);
  }
  return matches;
}

function hasExplicitCurrencyName(text: string, name: string): boolean {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^A-Z])${escapedName}S?([^A-Z]|$)`, "i").test(text);
}

function findExplicitCurrencyNameCodes(text: string): Set<string> {
  const matches = new Set<string>();
  const upperText = text.toUpperCase();
  for (
    const [name, code] of Object.entries(EXPLICIT_CURRENCY_NAME_TO_CODE)
  ) {
    if (!SUPPORTED_CURRENCY_CODES.has(code)) continue;
    if (hasExplicitCurrencyName(upperText, name)) matches.add(code);
  }
  return matches;
}

function isAsciiLetter(value: string | undefined): boolean {
  return !!value && /[A-Z]/.test(value);
}

function includesStandaloneToken(text: string, token: string): boolean {
  if (!text || !token) return false;
  const normalizedText = text.toUpperCase();
  const normalizedToken = token.toUpperCase();
  let index = normalizedText.indexOf(normalizedToken);
  while (index >= 0) {
    const before = normalizedText[index - 1];
    const after = normalizedText[index + normalizedToken.length];
    const startsWithLetter = isAsciiLetter(normalizedToken[0]);
    const endsWithLetter = isAsciiLetter(
      normalizedToken[normalizedToken.length - 1],
    );
    if (
      (!startsWithLetter || !isAsciiLetter(before)) &&
      (!endsWithLetter || !isAsciiLetter(after))
    ) {
      return true;
    }
    index = normalizedText.indexOf(normalizedToken, index + 1);
  }
  return false;
}

function findLocalizedSymbolCurrenciesInText(
  text: string,
): Set<string> {
  const matches = new Set<string>();
  const rawText = text.toUpperCase();

  const sortedSymbols = Object.keys(LOCALIZED_SYMBOL_TO_CURRENCY).sort(
    (left, right) => right.length - left.length,
  );
  for (const localizedSymbol of sortedSymbols) {
    if (includesStandaloneToken(rawText, localizedSymbol)) {
      const currency = LOCALIZED_SYMBOL_TO_CURRENCY[localizedSymbol];
      if (SUPPORTED_CURRENCY_CODES.has(currency)) {
        matches.add(currency);
      }
    }
  }
  return matches;
}

function findUnambiguousSymbolCurrenciesInText(text: string): Set<string> {
  const matches = new Set<string>();
  const normalizedText = text.toUpperCase();
  const symbols = Array.from(UNAMBIGUOUS_SYMBOL_TO_CURRENCY.keys()).sort(
    (left, right) => right.length - left.length,
  );
  for (const symbol of symbols) {
    if (includesStandaloneToken(normalizedText, symbol)) {
      const currency = UNAMBIGUOUS_SYMBOL_TO_CURRENCY.get(symbol);
      if (currency) matches.add(currency);
    }
  }
  return matches;
}

function collectStrongTextCurrencyEvidence(text: string): {
  codes: Set<string>;
  explicitCodes: Set<string>;
  explicitNames: Set<string>;
  localizedSymbols: Set<string>;
  unambiguousSymbols: Set<string>;
} {
  const explicitCodes = findExplicitCurrencyCodes(text);
  const explicitNames = findExplicitCurrencyNameCodes(text);
  const localizedSymbols = findLocalizedSymbolCurrenciesInText(text);
  const unambiguousSymbols = findUnambiguousSymbolCurrenciesInText(text);
  const codes = new Set<string>();
  for (
    const source of [
      explicitCodes,
      explicitNames,
      localizedSymbols,
      unambiguousSymbols,
    ]
  ) {
    for (const code of source) codes.add(code);
  }
  return {
    codes,
    explicitCodes,
    explicitNames,
    localizedSymbols,
    unambiguousSymbols,
  };
}

export function resolveSingleStrongCurrencyEvidenceFromOCRText(
  text?: string | null,
): string | null {
  const rawText = normalizeEvidenceText(text);
  if (!rawText) return null;

  const { codes } = collectStrongTextCurrencyEvidence(rawText);

  return codes.size === 1 ? (codes.values().next().value ?? null) : null;
}

function hasAmbiguousCurrencySymbol(
  text: string,
  symbol?: string | null,
): boolean {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (normalizedSymbol && AMBIGUOUS_SYMBOLS.has(normalizedSymbol)) return true;
  return AMBIGUOUS_TEXT_TOKEN_REGEX.test(text);
}

export function hasAmbiguousCurrencyEvidenceInOCRText(
  text?: string | null,
  symbol?: string | null,
): boolean {
  return hasAmbiguousCurrencySymbol(normalizeEvidenceText(text), symbol);
}

export function resolveCurrencyFromOCR(
  input: OcrCurrencyResolutionInput,
): OcrCurrencyResolutionResult {
  const preferredCurrency = normalizePreferredCurrency(
    input.userPreferredCurrency,
  );
  const rawText = normalizeEvidenceText(input.rawOcrText);
  const detectedCode = normalizeCurrencyCode(input.detectedCurrencyCode);
  const textEvidence = collectStrongTextCurrencyEvidence(rawText);
  if (textEvidence.codes.size === 1) {
    const resolved = textEvidence.codes.values().next().value ?? null;
    if (resolved) {
      const reason =
        textEvidence.explicitCodes.has(resolved) ||
          textEvidence.explicitNames.has(resolved)
          ? "explicit_currency_code_found"
          : "explicit_localized_symbol_found";
      return {
        finalCurrencyCode: resolved,
        confidence: "high",
        reason,
      };
    }
  }

  if (hasAmbiguousCurrencySymbol(rawText, input.detectedCurrencySymbol)) {
    return {
      finalCurrencyCode: preferredCurrency,
      confidence: "medium",
      reason: "ambiguous_symbol_used_user_preference",
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
