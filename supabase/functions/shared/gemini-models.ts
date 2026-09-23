export const GEMINI_MODEL_FALLBACKS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
] as const;

const GEMINI_MODEL_FALLBACK_SET = new Set<string>(GEMINI_MODEL_FALLBACKS);

export function resolveGeminiModelFallbacks(
  configured?: string | null,
): string[] {
  const models = configured
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => GEMINI_MODEL_FALLBACK_SET.has(value));
  return models?.length ? [...new Set(models)] : [...GEMINI_MODEL_FALLBACKS];
}
