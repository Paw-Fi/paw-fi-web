import {
  getRegionalPricingMarket,
  REGIONAL_PRICING_COUNTRY_CODES,
  REGIONAL_PRICING_COUNTRY_TO_MARKET,
  type RegionalPricingMarket,
} from "@/data/regional-pricing.generated";
import { getCountryCodeFromTimezone } from "@/lib/timezone-to-country";

const COUNTRY_STORAGE_KEY = "moneko_pricing_country";
export const DEFAULT_REGIONAL_PRICING_COUNTRY = "US";

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

  return {
    market,
    monthly: formatRegionalPrice(market, market.monthly),
    yearly: formatRegionalPrice(market, effectiveMonthly * 12),
    lifetime: formatRegionalPrice(market, market.lifetime),
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
