export interface CreatorUserLookupRequest {
  email?: string | null;
}

export function normalizeLookupEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim().toLowerCase();

  if (!trimmed) return null;

  // Prevent SQL LIKE wildcard search if that's your intention
  if (trimmed.includes("%")) return null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;

  return trimmed;
}