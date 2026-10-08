function normalizeAiResponseLanguage(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.trim().replaceAll("_", "-").split("-");
  const primary = parts[0].toLowerCase();
  parts[0] = primary === "kr" ? "ko" : primary === "cn" ? "zh" : primary;
  try {
    return new Intl.Locale(parts.join("-")).baseName;
  } catch {
    return null;
  }
}

export function resolveAiResponseLanguage(
  preferredLanguage: unknown,
  requestedLanguage?: unknown,
): string {
  return normalizeAiResponseLanguage(preferredLanguage) ??
    normalizeAiResponseLanguage(requestedLanguage) ?? "en";
}

export function buildAiResponseLanguageInstruction(language: string): string {
  const locale = resolveAiResponseLanguage(language);
  return `CRITICAL RESPONSE LANGUAGE: The authoritative response locale is ${JSON.stringify(locale)}, resolved from the user's stored preferred_language (or app locale only when no preference exists). Use this locale strictly for EVERY clarification question, EVERY answer choice, transaction description and all other explanatory text, in extraction, verification and clarification alike. Never choose the response language from the input, audio, earlier questions/answers, currency, timezone or catalog language. Preserve regional/script distinctions, including Traditional Chinese when requested. Preserve merchant, wallet, Space, member and custom-category names as proper names in their original script; translate the surrounding wording. Keep JSON keys, enum/category identifiers, IDs, ISO currency codes, dates, times and numeric values in their required machine format. Before returning JSON, check the language of the question AND EACH choice and description and correct any language mismatch without changing financial meaning. An independent verifier must reject a proposal whose explanatory text or descriptions use another language.`;
}
