/**
 * Builds a dynamic suffix to append to the system instruction.
 * Embeds the user's raw message so the AI can detect the language
 * itself and respond in the same language. No manual detection needed.
 */
export function buildLanguageOverride(userText: string): string {
  const trimmed = (userText || "").trim();
  if (!trimmed) return "";
  return `\n\nCRITICAL LANGUAGE OVERRIDE — The user's latest message is: """${trimmed}"""\nYou MUST reply strictly in the same language as that message. Do NOT default to English unless the message itself is in English.`;
}
