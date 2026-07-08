export function decodePlaidLogoBase64(
  value?: string | null,
): Uint8Array | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const base64 = trimmed.includes(",")
    ? (trimmed.split(",").pop() ?? "")
    : trimmed;
  if (!base64) return null;

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.length ? bytes : null;
  } catch (_) {
    return null;
  }
}

export async function hashLogoBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildPlaidInstitutionLogoStoragePath(params: {
  userId: string;
  institutionId: string;
  hash: string;
}): string {
  const institutionSlug = params.institutionId
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "institution";
  const hash = params.hash.trim() || "logo";
  return `${params.userId}/wallet-logos/plaid-${institutionSlug}-${hash}.png`;
}
