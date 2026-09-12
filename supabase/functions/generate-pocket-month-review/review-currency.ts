import { getCurrencySymbol } from "../shared/currency-symbols.ts";

const CENTS_PER_MAJOR_UNIT = 100;
const MAX_MONEY_TOKEN_CENTS = 100000000000;

export interface PocketReviewCurrencyContext {
  currency: string;
  locale: string;
  symbol: string;
  example: string;
}

export interface PocketReviewAmount {
  envelopeId: string;
  amountCents: number;
}

export interface RoundedPocketReviewPlan {
  amounts: Map<string, number>;
  totalCents: number;
}

export function buildPocketReviewCurrencyContext(
  currency: string,
  locale: string | null,
): PocketReviewCurrencyContext {
  const normalizedCurrency = currency.toUpperCase();
  const normalizedLocale = normalizeLocale(locale);
  return {
    currency: normalizedCurrency,
    locale: normalizedLocale,
    symbol: getCurrencySymbol(normalizedCurrency),
    example: formatPocketReviewMoneyCents(
      123400,
      normalizedCurrency,
      normalizedLocale,
    ),
  };
}

export function formatPocketReviewMoneyCents(
  cents: number,
  currency: string,
  locale: string | null,
): string {
  const normalizedCurrency = currency.toUpperCase();
  const amount = Math.round(cents) / CENTS_PER_MAJOR_UNIT;
  try {
    return new Intl.NumberFormat(normalizeLocale(locale), {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${getCurrencySymbol(normalizedCurrency)}${Math.round(amount)}`;
  }
}

export function roundPocketReviewPlan({
  amounts,
  maximumBudgetCents,
}: {
  amounts: PocketReviewAmount[];
  maximumBudgetCents: number;
}): RoundedPocketReviewPlan {
  const rounded = amounts
    .map(({ envelopeId, amountCents }) => ({
      envelopeId,
      amountCents: roundToPocketReviewStep(amountCents),
    }))
    .sort(
      (a, b) =>
        b.amountCents - a.amountCents ||
        a.envelopeId.localeCompare(b.envelopeId),
    );
  const maximum = Math.max(0, Math.round(maximumBudgetCents));
  let totalCents = rounded.reduce((sum, item) => sum + item.amountCents, 0);

  while (maximum > 0 && totalCents > maximum) {
    const candidate = rounded.find((item) => item.amountCents > 0);
    if (!candidate) break;
    const reduction = Math.min(
      pocketReviewRoundingStepCents(candidate.amountCents),
      candidate.amountCents,
    );
    candidate.amountCents -= reduction;
    totalCents -= reduction;
    rounded.sort(
      (a, b) =>
        b.amountCents - a.amountCents ||
        a.envelopeId.localeCompare(b.envelopeId),
    );
  }

  return {
    amounts: new Map(
      rounded.map((item) => [item.envelopeId, item.amountCents]),
    ),
    totalCents,
  };
}

export function formatPocketReviewMoneyTokens(
  text: string,
  currency: string,
  locale: string | null,
): string | null {
  const withoutMoneyTokens = text.replace(/\{\{money:-?\d+\}\}/g, "");
  const moneyTokens = [...text.matchAll(/\{\{money:(-?\d+)\}\}/g)];
  if (
    withoutMoneyTokens.includes("{{money:") ||
    /(?:\p{Sc}\s*\p{Nd}|\p{Nd}\s*\p{Sc})/u.test(withoutMoneyTokens)
  ) {
    return null;
  }
  if (
    moneyTokens.some(([, cents]) => {
      const amount = Number(cents);
      return (
        !Number.isSafeInteger(amount) ||
        Math.abs(amount) > MAX_MONEY_TOKEN_CENTS
      );
    })
  ) {
    return null;
  }
  const currencyCode = currency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (
    new RegExp(
      `(?:\\b${currencyCode}\\s*\\p{Nd}|\\p{Nd}\\s*${currencyCode}\\b)`,
      "iu",
    ).test(withoutMoneyTokens)
  ) {
    return null;
  }
  return text.replace(
    /\{\{money:(-?\d+)\}\}/g,
    (_, cents: string) =>
      formatPocketReviewMoneyCents(Number(cents), currency, locale),
  );
}

function normalizeLocale(locale: string | null): string {
  try {
    return Intl.getCanonicalLocales(locale || "en-US")[0] || "en-US";
  } catch {
    return "en-US";
  }
}

function roundToPocketReviewStep(amountCents: number): number {
  const step = pocketReviewRoundingStepCents(amountCents);
  return Math.max(0, Math.round(amountCents / step) * step);
}

function pocketReviewRoundingStepCents(amountCents: number): number {
  const majorUnits = Math.abs(amountCents) / CENTS_PER_MAJOR_UNIT;
  if (majorUnits < 100) return CENTS_PER_MAJOR_UNIT;
  if (majorUnits < 1000) return 5 * CENTS_PER_MAJOR_UNIT;
  if (majorUnits < 10000) return 10 * CENTS_PER_MAJOR_UNIT;
  const magnitude = 10 ** Math.floor(Math.log10(majorUnits) - 1);
  return magnitude * CENTS_PER_MAJOR_UNIT;
}
