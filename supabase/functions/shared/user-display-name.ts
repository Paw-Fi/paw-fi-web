export function resolveUserDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined,
  fallback: string,
): string {
  const trimmedName = fullName?.trim();
  if (trimmedName) return trimmedName;

  const localPart = email?.trim().split("@")[0];
  return localPart || fallback;
}
