export function stripSourceMetadata(content: string): string {
  const firstHeadingIndex = content.search(/^# /m);

  if (firstHeadingIndex === -1) {
    return content.trim();
  }

  // The detail route renders the article title, so omit source-only metadata
  // (Meta Title/Description lines) and the H1, then bump remaining headings.
  return content
    .slice(firstHeadingIndex)
    .replace(/^# [^\n]*(?:\n+|$)/, "")
    .replace(/^(?:Meta Title|Meta Description):.*$(?:\n+|$)/gim, "")
    .replace(/^(#{1,5})(?= )/gm, "$1#")
    .trim();
}
