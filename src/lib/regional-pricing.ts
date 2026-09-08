import {
  getRegionalPricingMarket,
  REGIONAL_PRICING_COUNTRY_CODES,
  REGIONAL_PRICING_COUNTRY_TO_MARKET,
  type RegionalPricingMarket,
} from "@/data/regional-pricing.generated";
import { getCountryCodeFromTimezone } from "@/lib/timezone-to-country";

const COUNTRY_STORAGE_KEY = "moneko_pricing_country";
export const DEFAULT_REGIONAL_PRICING_COUNTRY = "US";

export interface LifetimePromoData {
  readonly originalFormatted: string;
  readonly promoFormatted: string;
}

export const LIFETIME_PROMO_TABLE: Record<string, LifetimePromoData> = {
  AED: { originalFormatted: "AED 349.99", promoFormatted: "AED 244.99" },
  AUD: { originalFormatted: "A$149.99", promoFormatted: "A$104.99" },
  BRL: { originalFormatted: "R$599.90", promoFormatted: "R$419.90" },
  CAD: { originalFormatted: "CA$199.99", promoFormatted: "CA$139.99" },
  CHF: { originalFormatted: "CHF 80.00", promoFormatted: "CHF 56.00" },
  CLP: { originalFormatted: "CLP 99,990", promoFormatted: "CLP 69,990" },
  CNY: { originalFormatted: "CN¥598.00", promoFormatted: "CN¥418.00" },
  COP: { originalFormatted: "COP 3,999", promoFormatted: "COP 2,799" },
  CZK: { originalFormatted: "CZK 2,490.00", promoFormatted: "CZK 1,743.00" },
  DKK: { originalFormatted: "DKK 799.00", promoFormatted: "DKK 559.00" },
  EGP: { originalFormatted: "EGP 4,999.99", promoFormatted: "EGP 3,499.99" },
  EUR: { originalFormatted: "€99.99", promoFormatted: "€69.99" },
  GBP: { originalFormatted: "£89.99", promoFormatted: "£62.99" },
  HKD: { originalFormatted: "HK$688.00", promoFormatted: "HK$482.00" },
  HUF: { originalFormatted: "HUF 399.9", promoFormatted: "HUF 279.9" },
  IDR: { originalFormatted: "IDR 14,990", promoFormatted: "IDR 10,490" },
  ILS: { originalFormatted: "₪299.90", promoFormatted: "₪209.90" },
  INR: { originalFormatted: "₹9,900.00", promoFormatted: "₹6,930.00" },
  JPY: { originalFormatted: "JP¥15,000", promoFormatted: "JP¥10,500" },
  KRW: { originalFormatted: "₩149,000", promoFormatted: "₩104,300" },
  KZT: { originalFormatted: "KZT 49,990.00", promoFormatted: "KZT 34,990.00" },
  MXN: { originalFormatted: "MX$1,999.00", promoFormatted: "MX$1,399.00" },
  MYR: { originalFormatted: "MYR 399.90", promoFormatted: "MYR 279.90" },
  NGN: { originalFormatted: "NGN 149,900.00", promoFormatted: "NGN 104,900.00" },
  NOK: { originalFormatted: "NOK 999.00", promoFormatted: "NOK 699.00" },
  NZD: { originalFormatted: "NZ$149.99", promoFormatted: "NZ$104.99" },
  PEN: { originalFormatted: "PEN 399.90", promoFormatted: "PEN 279.90" },
  PHP: { originalFormatted: "₱5,990.00", promoFormatted: "₱4,190.00" },
  PKR: { originalFormatted: "PKR 24,900", promoFormatted: "PKR 17,430" },
  PLN: { originalFormatted: "PLN 399.99", promoFormatted: "PLN 279.99" },
  QAR: { originalFormatted: "QAR 299.99", promoFormatted: "QAR 209.99" },
  RON: { originalFormatted: "RON 499.99", promoFormatted: "RON 349.99" },
  RUB: { originalFormatted: "RUB 7,990.00", promoFormatted: "RUB 5,590.00" },
  SAR: { originalFormatted: "SAR 399.99", promoFormatted: "SAR 279.99" },
  SEK: { originalFormatted: "SEK 1,195.00", promoFormatted: "SEK 836.00" },
  SGD: { originalFormatted: "SGD 129.98", promoFormatted: "SGD 90.99" },
  THB: { originalFormatted: "THB 2,990.00", promoFormatted: "THB 2,090.00" },
  TRY: { originalFormatted: "TRY 4,999.99", promoFormatted: "TRY 3,499.99" },
  TWD: { originalFormatted: "NT$2,990.00", promoFormatted: "NT$2,090.00" },
  TZS: { originalFormatted: "TZS 249,900.00", promoFormatted: "TZS 174,900.00" },
  USD: { originalFormatted: "US$149.99", promoFormatted: "US$99.99" },
  VND: { originalFormatted: "₫2,999,000", promoFormatted: "₫2,099,000" },
  ZAR: { originalFormatted: "ZAR 1,999.99", promoFormatted: "ZAR 1,399.99" },
};

function normalizeSupportedCountry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized in REGIONAL_PRICING_COUNTRY_TO_MARKET ? normalized : null;
}

function countryFromLocaleTag(localeTag: string): string | null {
  try {
    return normalizeSupportedCountry(new Intl.Locale(localeTag).region);
  } catch {
    const match = localeTag.match(/[-_]([A-Za-z]{2})\b/);
    return normalizeSupportedCountry(match?.[1]);
  }
}

export function resolveRegionalPricingCountry({
  preferredCountry,
  localeTags = [],
  timezone,
}: {
  preferredCountry?: string | null;
  localeTags?: readonly string[];
  timezone?: string | null;
}): string {
  const preferred = normalizeSupportedCountry(preferredCountry);
  if (preferred) return preferred;

  if (timezone) {
    const timezoneCountry = normalizeSupportedCountry(
      getCountryCodeFromTimezone(timezone),
    );
    if (timezoneCountry) return timezoneCountry;
  }

  for (const localeTag of localeTags) {
    const localeCountry = countryFromLocaleTag(localeTag);
    if (localeCountry) return localeCountry;
  }

  return DEFAULT_REGIONAL_PRICING_COUNTRY;
}

export function detectRegionalPricingCountry(): string {
  if (typeof window === "undefined") {
    return DEFAULT_REGIONAL_PRICING_COUNTRY;
  }

  const preferredCountry = window.localStorage.getItem(COUNTRY_STORAGE_KEY);
  const localeTags = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezone = null;
  }

  return resolveRegionalPricingCountry({
    preferredCountry,
    localeTags,
    timezone,
  });
}

export function saveRegionalPricingCountry(countryCode: string): string {
  const normalized =
    normalizeSupportedCountry(countryCode) ?? DEFAULT_REGIONAL_PRICING_COUNTRY;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COUNTRY_STORAGE_KEY, normalized);
  }
  return normalized;
}

export function formatRegionalPrice(
  market: RegionalPricingMarket,
  amountInMinorUnits: number,
): string {
  return new Intl.NumberFormat(market.locale, {
    style: "currency",
    currency: market.currencyCode,
    minimumFractionDigits: market.minorUnits,
    maximumFractionDigits: market.minorUnits,
  }).format(amountInMinorUnits / 10 ** market.minorUnits);
}

export function getRegionalPriceLabels(countryCode: string) {
  const market = getRegionalPricingMarket(countryCode);
  const effectiveMonthly = Math.round(market.yearly / 12);
  const yearlySavingsPercent = Math.max(
    0,
    Math.round((1 - market.yearly / (market.monthly * 12)) * 100),
  );

  const promo = LIFETIME_PROMO_TABLE[market.currencyCode];
  const lifetime = promo?.promoFormatted ?? formatRegionalPrice(market, Math.round(market.lifetime * 0.7));
  const lifetimeOriginal = promo?.originalFormatted ?? formatRegionalPrice(market, market.lifetime);

  return {
    market,
    monthly: formatRegionalPrice(market, market.monthly),
    yearly: formatRegionalPrice(market, effectiveMonthly * 12),
    lifetime,
    lifetimeOriginal,
    lifetimeDiscountPercent: 30,
    effectiveMonthly: formatRegionalPrice(market, effectiveMonthly),
    compareAtMonthly: formatRegionalPrice(market, market.compareAtMonthly),
    compareAtYearly: formatRegionalPrice(market, market.compareAtYearly),
    yearlySavingsPercent,
  };
}

export function getRegionalCountryOptions(displayLocale?: string) {
  let displayNames: Intl.DisplayNames | null = null;
  try {
    displayNames = new Intl.DisplayNames(displayLocale ?? "en", {
      type: "region",
    });
  } catch {
    displayNames = null;
  }

  return REGIONAL_PRICING_COUNTRY_CODES.map((code) => ({
    code,
    name: displayNames?.of(code) ?? code,
  })).sort((a, b) => a.name.localeCompare(b.name, displayLocale));
}
