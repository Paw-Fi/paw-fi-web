import messages from "../bot-translations.json" with { type: "json" };
import { resolveEmailLanguage } from "../email-language.ts";

export type BotMessageKey = keyof typeof messages;

const catalog: Readonly<Record<string, Readonly<Record<string, string>>>> =
  messages;

export const BOT_MESSAGE_KEYS = Object.keys(messages) as BotMessageKey[];

// Maps any stored language tag (kr, zh_tw, zh-Hant-HK, es-MX, ...) to a
// catalog column. Languages outside the app's supported set resolve to "en".
export function resolveBotMessageLocale(language: unknown): string {
  const locale = resolveEmailLanguage(language);
  return locale === "zh-TW" ? "zh_TW" : locale;
}

// BCP 47 tag used only for Intl number and date formatting. Unlike the message
// catalog it keeps any valid locale, so amounts and dates follow the user's
// own regional conventions even when no translated copy exists.
export function resolveBotIntlLocale(language: unknown): string {
  if (typeof language !== "string" || !language.trim()) return "en";
  const parts = language.trim().replaceAll("_", "-").split("-");
  const primary = parts[0].toLowerCase();
  parts[0] = primary === "kr" ? "ko" : primary === "cn" ? "zh" : primary;
  try {
    return new Intl.Locale(parts.join("-")).toString();
  } catch {
    return "en";
  }
}

export function botMessage(
  key: BotMessageKey,
  language: unknown,
  ...values: unknown[]
): string {
  const entry = catalog[key];
  const translated = entry[resolveBotMessageLocale(language)];
  const template = typeof translated === "string" && translated.trim()
    ? translated
    : entry.en;
  return template.replace(
    /\{(\d+)\}/g,
    (match, index: string) =>
      Number(index) < values.length ? String(values[Number(index)]) : match,
  );
}
