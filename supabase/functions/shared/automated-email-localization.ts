import { escapeHtml } from "./email-utils.ts";
import { resolveEmailLanguage } from "./email-language.ts";
import {
  emailCatalogs,
  hasEmailTranslations,
} from "./email-translations/catalogs.ts";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface LocalizedEmailContent extends EmailContent {
  localize?: (language: string) => EmailContent;
}

// Interpolation values are opaque: names, personal messages, transaction data,
// amounts, URLs and tokens are never looked up in a translation catalog.
export function createEmailTranslator(language: unknown) {
  const locale = resolveEmailLanguage(language);
  const catalog = emailCatalogs[locale];
  const interpolate = (source: string, values: unknown[]) =>
    source.replace(
      /\{(\d+)\}/g,
      (match, index: string) =>
        Number(index) < values.length ? String(values[Number(index)]) : match,
    );
  const sourceOf = (source: string | TemplateStringsArray) =>
    typeof source === "string" ? source : source.reduce(
      (value, part, index) => value + (index ? `{${index - 1}}` : "") + part,
      "",
    );
  const lookup = (source: string) =>
    catalog?.[source.trim().replace(/\s+/g, " ")];
  const t = (
    source: string | TemplateStringsArray,
    ...values: unknown[]
  ): string => {
    const key = sourceOf(source);
    const copy = lookup(key);
    const trimmed = key.trim();
    const start = key.indexOf(trimmed);
    return interpolate(
      copy
        ? key.slice(0, start) + copy + key.slice(start + trimmed.length)
        : key,
      values,
    );
  };
  const h = (
    source: string | TemplateStringsArray,
    ...values: unknown[]
  ): string => {
    const skeleton = sourceOf(source);
    if (locale === "en") return interpolate(skeleton, values);
    const replacements = [...values];
    const blocks = skeleton.replace(
      /<(p|li|h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/g,
      (_match, tag: string, attributes: string, body: string) => {
        const sentence = body.replace(
          /<(strong|em|a|b|i|code|bdi)\b([^>]*)>([\s\S]*?)<\/\1>/g,
          (
            _inline,
            inlineTag: string,
            inlineAttributes: string,
            label: string,
          ) => {
            const index = replacements.length;
            const copy = lookup(label);
            replacements.push(
              interpolate(
                `<${inlineTag}${inlineAttributes}>${
                  copy ? escapeHtml(copy) : label
                }</${inlineTag}>`,
                values,
              ),
            );
            return `{${index}}`;
          },
        );
        const copy = lookup(sentence);
        if (!copy) return `<${tag}${attributes}>${body}</${tag}>`;
        return `<${tag}${attributes}>${escapeHtml(copy)}</${tag}>`;
      },
    );
    // Parse only authored template markup, before inserting interpolation values.
    // Attribute values and markup are machine contracts and remain unchanged.
    const translated = blocks.replace(
      /(^|>)([^<]*)(?=<|$)/g,
      (_match, boundary: string, text: string) => {
        const key = text.trim();
        const copy = lookup(key);
        if (!copy) return boundary + text;
        const start = text.indexOf(key);
        return boundary + text.slice(0, start) + escapeHtml(copy) +
          text.slice(start + key.length);
      },
    );
    return interpolate(translated, replacements);
  };
  return { t, h, locale };
}

export function localizedEmailTemplate<T extends object>(
  build: (data: T, language: string) => EmailContent,
): (data: T) => LocalizedEmailContent {
  return (data) => {
    const english = build(data, "en");
    return {
      ...english,
      localize: (language) => {
        const locale = resolveEmailLanguage(language);
        return hasEmailTranslations(locale) ? build(data, locale) : english;
      },
    };
  };
}

export function withEmailLocalization(
  english: EmailContent,
  localize: (language: string) => EmailContent,
): LocalizedEmailContent {
  return {
    ...english,
    localize: (language) => {
      const locale = resolveEmailLanguage(language);
      return hasEmailTranslations(locale) ? localize(locale) : english;
    },
  };
}

export function localizedPluralize(
  count: number,
  singular: string,
  plural: string | undefined,
  language: string,
): string {
  return createEmailTranslator(language).t(
    count <= 1 ? singular : plural || singular + "s",
  );
}
