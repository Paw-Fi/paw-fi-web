import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";

export type SupabaseClient = SupabaseJsClient;

export async function updatePreferredCurrency(
  supabase: SupabaseClient,
  contactId: string,
  currency: string,
) {
  return supabase
    .from("user_contacts")
    .update({
      preferred_currency: currency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .select("preferred_currency")
    .single();
}

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: "en",
  en: "en",
  spanish: "es",
  espanol: "es",
  español: "es",
  es: "es",
  french: "fr",
  francais: "fr",
  français: "fr",
  fr: "fr",
  german: "de",
  deutsch: "de",
  de: "de",
  italian: "it",
  italiano: "it",
  it: "it",
  japanese: "ja",
  nihongo: "ja",
  ja: "ja",
  korean: "ko",
  hangul: "ko",
  ko: "ko",
  kr: "ko",
  dutch: "nl",
  nederlands: "nl",
  nl: "nl",
  russian: "ru",
  ru: "ru",
  thai: "th",
  th: "th",
  ไทย: "th",
  ukrainian: "uk",
  uk: "uk",
  urdu: "ur",
  ur: "ur",
  vietnamese: "vi",
  "tieng viet": "vi",
  vi: "vi",
  chinese: "zh",
  mandarin: "zh",
  cantonese: "zh",
  zh: "zh",
  cn: "zh",
};

export function normalizePreferredLanguage(language: string): string | null {
  const normalized = String(language || "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;

  const byName = LANGUAGE_NAME_TO_CODE[normalized];
  if (byName) return byName;

  const primary = normalized.includes("-")
    ? normalized.split("-")[0]
    : normalized;
  const mappedPrimary = LANGUAGE_NAME_TO_CODE[primary] ?? primary;
  return /^[a-z]{2,8}$/.test(mappedPrimary) ? mappedPrimary : null;
}

export async function updatePreferredLanguage(
  supabase: SupabaseClient,
  contactId: string,
  language: string,
) {
  const preferredLanguage = normalizePreferredLanguage(language);
  if (!preferredLanguage) {
    return {
      data: null,
      error: { message: "Invalid language" },
    };
  }
  return supabase
    .from("user_contacts")
    .update({
      preferred_language: preferredLanguage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .select("preferred_language")
    .single();
}
