const SUPPORTED_REPLY_LANGUAGES = new Set([
  "de",
  "en",
  "es",
  "fr",
  "it",
  "ja",
  "kr",
  "nl",
  "ur",
  "ru",
  "uk",
  "zh",
  "zh_tw",
  "vi",
]);

const REPLY_LANGUAGE_PROMPT_NAMES: Record<string, string> = {
  de: "German",
  en: "English",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  ja: "Japanese",
  kr: "Korean",
  nl: "Dutch",
  ur: "Urdu",
  ru: "Russian",
  uk: "Ukrainian",
  zh: "Chinese",
  zh_tw: "Traditional Chinese",
  vi: "Vietnamese",
};

const CURRENCY_LANGUAGE_FALLBACKS: Record<string, string> = {
  AED: "en",
  ARS: "es",
  AUD: "en",
  BDT: "en",
  BZD: "en",
  BRL: "en",
  CAD: "en",
  CHF: "de",
  CLP: "es",
  CNY: "zh",
  CZK: "en",
  DKK: "en",
  DOP: "es",
  EGP: "en",
  EUR: "en",
  GBP: "en",
  GHS: "en",
  GTQ: "es",
  HKD: "zh",
  HUF: "en",
  IDR: "en",
  INR: "en",
  JMD: "en",
  JOD: "en",
  JPY: "ja",
  KES: "en",
  KRW: "kr",
  LKR: "en",
  MMK: "en",
  MWK: "en",
  MXN: "es",
  MYR: "en",
  NGN: "en",
  NOK: "en",
  NZD: "en",
  PEN: "es",
  PHP: "en",
  PKR: "ur",
  PLN: "en",
  PYG: "es",
  RON: "en",
  RSD: "en",
  RUB: "ru",
  SAR: "en",
  SEK: "en",
  SGD: "en",
  SYP: "en",
  THB: "en",
  TRY: "en",
  TWD: "zh_tw",
  UAH: "uk",
  USD: "en",
  VND: "vi",
  ZAR: "en",
  ZMW: "en",
};

function normalizeReplyLanguage(language?: string | null): string | null {
  const normalized = String(language || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (!normalized) return null;
  if (normalized === "ko") return "kr";
  if (SUPPORTED_REPLY_LANGUAGES.has(normalized)) {
    return normalized;
  }
  return null;
}

export function resolvePreferredReplyLanguage(
  preferredLanguage?: string | null,
  preferredCurrency?: string | null,
): string {
  const normalizedLanguage = normalizeReplyLanguage(preferredLanguage);
  if (normalizedLanguage) return normalizedLanguage;

  const currency = String(preferredCurrency || "")
    .trim()
    .toUpperCase();
  if (currency && CURRENCY_LANGUAGE_FALLBACKS[currency]) {
    return CURRENCY_LANGUAGE_FALLBACKS[currency];
  }

  return "en";
}

export function getReplyLanguagePromptLabel(language?: string | null): string {
  const normalized = normalizeReplyLanguage(language) || "en";
  return REPLY_LANGUAGE_PROMPT_NAMES[normalized] || "English";
}

/**
 * Builds a dynamic suffix to append to the system instruction.
 * Keeps language policy explicit for the current turn.
 */
export function buildLanguageOverride(language: string): string {
  const promptLanguage = getReplyLanguagePromptLabel(language);
  return `\n\nCRITICAL LANGUAGE OVERRIDE — You MUST reply strictly and entirely in ${promptLanguage}. Do not choose the reply language yourself. Do not infer it from the latest user message. Use only this language for confirmations, summaries, follow-up questions, and all normal replies.`;
}
