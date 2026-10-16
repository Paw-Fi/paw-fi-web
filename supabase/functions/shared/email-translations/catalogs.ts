import messages from "../email-translations.json" with { type: "json" };

const languages = [
  "de",
  "es",
  "fr",
  "it",
  "ja",
  "ko",
  "nl",
  "ur",
  "ru",
  "th",
  "uk",
  "zh",
  "zh_TW",
  "vi",
] as const;

function placeholders(value: string): string {
  return (value.match(/\{\d+\}/g) ?? []).sort().join("|");
}

// Blank, missing, or damaged translations use the original English copy.
export const emailCatalogs: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = Object.fromEntries(
  languages.map((language) => [
    language === "zh_TW" ? "zh-TW" : language,
    Object.fromEntries(
      Object.values(messages).flatMap((message) => {
        const translated = message[language];
        return typeof translated === "string" && translated.trim() &&
            placeholders(message.en) === placeholders(translated)
          ? [[message.en, translated]]
          : [];
      }),
    ),
  ]),
);

export function hasEmailTranslations(language: string): boolean {
  return Object.keys(emailCatalogs[language] ?? {}).length > 0;
}
