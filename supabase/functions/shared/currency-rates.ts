import { validateCurrency } from "./currency-validator.ts";

export interface CurrencyRateSnapshot {
  baseCurrency: string;
  rates: Record<string, number>;
  sourceUpdatedAt: string | null;
}

export function normalizeExchangeRatePayload(
  payload: unknown,
): CurrencyRateSnapshot {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid exchange-rate payload");
  }

  const body = payload as Record<string, unknown>;
  if (body.result && body.result !== "success") {
    throw new Error("Exchange-rate provider returned an error");
  }

  const baseCurrency = validateCurrency(
    typeof body.base_code === "string" ? body.base_code : "USD",
  );
  const rawRates = body.rates;
  if (!rawRates || typeof rawRates !== "object") {
    throw new Error("Exchange-rate payload is missing rates");
  }

  const rates: Record<string, number> = {};
  for (const [rawCode, rawRate] of Object.entries(rawRates)) {
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) continue;

    const rate =
      typeof rawRate === "number"
        ? rawRate
        : typeof rawRate === "string"
          ? Number.parseFloat(rawRate)
          : Number.NaN;
    if (Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  }

  if (rates[baseCurrency] == null) {
    rates[baseCurrency] = 1;
  }

  const sourceUpdatedAt =
    typeof body.time_last_update_utc === "string"
      ? new Date(body.time_last_update_utc).toISOString()
      : null;

  return { baseCurrency, rates, sourceUpdatedAt };
}

export function shouldRefreshCurrencyRates({
  fetchedAt,
  now,
  ttlHours,
}: {
  fetchedAt: Date | null;
  now: Date;
  ttlHours: number;
}): boolean {
  if (!fetchedAt || Number.isNaN(fetchedAt.getTime())) return true;
  return now.getTime() - fetchedAt.getTime() >= ttlHours * 60 * 60 * 1000;
}
