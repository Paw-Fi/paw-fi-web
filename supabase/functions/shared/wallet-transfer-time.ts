// Only the normalized API clock contract is accepted, never natural-language time.
export function normalizeWalletTransferTime(
  value: unknown,
): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== "string" ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value)
  ) {
    return undefined;
  }
  return value;
}
