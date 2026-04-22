export function cleanExtractedText(text: string): string {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(cleanExtractedText(text).length / 4));
}
