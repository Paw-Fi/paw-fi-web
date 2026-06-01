import { validateCurrency } from "./currency-validator.ts";

type PreferredCurrencyClient = {
  from: (table: string) => any;
};

export function normalizePreferredCurrency(
  currency?: string | null,
  fallbackCurrency: string = "USD",
): string {
  const fallback = validateCurrency(fallbackCurrency || "USD");
  const normalized = typeof currency === "string" ? currency.trim() : "";
  return validateCurrency(normalized || fallback);
}

export async function loadLatestUserPreferredCurrency(params: {
  supabase: PreferredCurrencyClient;
  userId?: string | null;
  fallbackCurrency?: string | null;
  onError?: (error: unknown) => void;
}): Promise<string> {
  const fallback = normalizePreferredCurrency(params.fallbackCurrency);
  const userId = typeof params.userId === "string" ? params.userId.trim() : "";
  if (!userId) return fallback;

  try {
    const { data, error } = await params.supabase
      .from("user_contacts")
      .select("preferred_currency")
      .eq("user_id", userId)
      .not("preferred_currency", "is", null)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      params.onError?.(error);
      return fallback;
    }

    return normalizePreferredCurrency(data?.preferred_currency, fallback);
  } catch (error) {
    params.onError?.(error);
    return fallback;
  }
}
