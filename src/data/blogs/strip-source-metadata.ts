export function stripSourceMetadata(content: string): string {
  const firstHeadingIndex = content.search(/^# /m);

  if (firstHeadingIndex === -1) {
    return content.trim();
  }

  // The detail route renders the article title, so omit source-only metadata and its H1.
  return content
    .slice(firstHeadingIndex)
    .replace(/^# [^\n]*(?:\n+|$)/, "")
    .replace(/^(#{1,5})(?= )/gm, "$1#")
    .trim();
}
