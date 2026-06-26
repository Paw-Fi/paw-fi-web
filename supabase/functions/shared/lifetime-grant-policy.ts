export function allowZeroAmountLifetimeGrants(): boolean {
  return (
    Deno.env.get("ALLOW_ZERO_AMOUNT_LIFETIME_GRANTS")?.trim().toLowerCase() ===
      "true"
  );
}

export function isPositiveStripeAmount(amount: unknown): boolean {
  return typeof amount === "number" && amount > 0;
}
