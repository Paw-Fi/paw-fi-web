import messages from "./notification-translations.json" with { type: "json" };
import { resolveEmailLanguage as resolveNotificationLanguage } from "./email-language.ts";

export { resolveNotificationLanguage };

function placeholders(value: string): string {
  return (value.match(/\{\d+\}/g) ?? []).sort().join("|");
}

// Only app-authored copy is translated. Interpolated names, notes, financial
// values and routing data remain opaque, even if they resemble a catalog key.
export const notificationCatalogs: Record<string, Record<string, string>> = {};
for (const message of Object.values(messages)) {
  for (const [language, value] of Object.entries(message)) {
    if (language === "en" || !value.trim()) continue;
    if (placeholders(value) !== placeholders(message.en)) continue;
    const locale = resolveNotificationLanguage(language);
    const catalog = notificationCatalogs[locale] ??= {};
    catalog[message.en] = value;
  }
}

export function createNotificationTranslator(language: unknown) {
  const locale = resolveNotificationLanguage(language);
  const t = (source: string | TemplateStringsArray, ...values: unknown[]) => {
    const english = typeof source === "string" ? source : source.reduce(
      (copy, part, index) => copy + (index ? `{${index - 1}}` : "") + part,
      "",
    );
    const trimmed = english.trim();
    const translated = notificationCatalogs[locale]
      ?.[trimmed.replace(/\s+/g, " ")];
    const valid = translated?.trim() &&
      placeholders(translated) === placeholders(english);
    const start = english.indexOf(trimmed);
    const copy = valid
      ? english.slice(0, start) + translated +
        english.slice(start + trimmed.length)
      : english;
    return copy.replace(
      /\{(\d+)\}/g,
      (match, index: string) =>
        Number(index) < values.length ? String(values[Number(index)]) : match,
    );
  };
  return { t, locale };
}
