/** Source principal excludes the separately persisted ordinary fee expense. */
export function walletTransferSide(
  row: Record<string, unknown>,
  direction: "in" | "out",
) {
  return {
    amountCents: Number(
      (direction === "in"
        ? (row.to_amount_cents ?? row.amount_cents)
        : row.amount_cents) ?? 0,
    ),
    currency: String(
      (direction === "in" ? (row.to_currency ?? row.currency) : row.currency) ??
        "",
    )
      .trim()
      .toUpperCase(),
  };
}
