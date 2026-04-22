import { franc } from "https://esm.sh/franc@6";

const SUPPORTED_PDF_LANGUAGES = new Set([
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
  "th",
  "uk",
  "zh",
  "zh_TW",
  "vi",
]);

const ISO3_TO_BCP47: Record<string, string> = {
  deu: "de",
  eng: "en",
  spa: "es",
  fra: "fr",
  ita: "it",
  jpn: "ja",
  kor: "kr",
  nld: "nl",
  urd: "ur",
  rus: "ru",
  tha: "th",
  ukr: "uk",
  vie: "vi",
  cmn: "zh",
  zho: "zh",
};

export function toBcp47LanguageTag(
  code: string | null | undefined,
): string | undefined {
  const normalized = String(code || "")
    .trim()
    .replace(/-/g, "_");
  if (!normalized || normalized === "und") return undefined;
  const lowered = normalized.toLowerCase();

  if (lowered === "ko") return "kr";
  if (lowered === "zh_tw") return "zh_TW";
  if (SUPPORTED_PDF_LANGUAGES.has(normalized)) return normalized;
  if (SUPPORTED_PDF_LANGUAGES.has(lowered)) return lowered;
  if (ISO3_TO_BCP47[lowered]) return ISO3_TO_BCP47[lowered];

  if (lowered.length === 2 && SUPPORTED_PDF_LANGUAGES.has(lowered)) {
    return lowered;
  }
  return undefined;
}

export function detectDocumentLanguageHint(text: string): string | undefined {
  const sample = String(text || "").trim();
  if (sample.length < 20) return undefined;
  return toBcp47LanguageTag(franc(sample, { minLength: 20 }));
}
