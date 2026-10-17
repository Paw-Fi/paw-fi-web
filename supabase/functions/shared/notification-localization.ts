import messages from "./notification-translations.json" with { type: "json" };
import { resolveEmailLanguage as resolveNotificationLanguage } from "./email-language.ts";
import { notificationCategoryKeys } from "./notification-category-keys.ts";

export { resolveNotificationLanguage };

const categoryMessages: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = messages;

function placeholders(value: string): string {
  return (value.match(/\{\d+\}/g) ?? []).sort().join("|");
}

// Only app-authored copy is translated. Interpolated names, notes, financial
// values and routing data remain opaque, even if they resemble a catalog key.
export const notificationCatalogs: Record<string, Record<string, string>> = {};
for (const [key, message] of Object.entries(messages)) {
  // Category labels have their own identity: e.g. category "Other" must not
  // replace an existing authored message with the same English spelling.
  if (key.startsWith("notificationCategory")) continue;
  for (const [language, value] of Object.entries(message)) {
    if (language === "en" || !value.trim()) continue;
    if (placeholders(value) !== placeholders(message.en)) continue;
    const locale = resolveNotificationLanguage(language);
    const catalog = notificationCatalogs[locale] ??= {};
    catalog[message.en] = value;
  }
}

// Display-only lookup of known category identifiers; never rewrites stored
// category keys or interprets user text. Null preserves each caller's existing
// English/custom-category formatting and missing-translation fallback.
export function localizeNotificationCategory(
  category: string,
  language: unknown,
): string | null {
  const locale = resolveNotificationLanguage(language);
  if (locale === "en") return null;
  const canonical = category.trim().toLowerCase()
    .replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!Object.hasOwn(notificationCategoryKeys, canonical)) return null;
  const key = notificationCategoryKeys[
    canonical as keyof typeof notificationCategoryKeys
  ];
  if (!key) return null;
  const message = categoryMessages[key];
  if (!message?.en) return null;
  const translated = message[locale === "zh-TW" ? "zh_TW" : locale];
  return typeof translated === "string" && translated.trim() &&
      placeholders(translated) === placeholders(message.en)
    ? translated
    : null;
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
