interface OpenCheckoutSessionCandidate {
  client_secret?: string | null;
  id?: string;
  mode?: string | null;
  url?: string | null;
  metadata?: Record<string, string> | null;
}

export interface LifetimeCheckoutSessionMatch {
  userId: string;
  pricingCountry: string;
  currency: string;
  promoCode: string;
}

export function findReusableLifetimeCheckoutSession<
  T extends OpenCheckoutSessionCandidate,
>(
  sessions: readonly T[],
  match: LifetimeCheckoutSessionMatch,
): T | undefined {
  return sessions.find(
    (session) =>
      session.mode === "payment" &&
      Boolean(session.url) &&
      session.metadata?.user_id === match.userId &&
      session.metadata?.plan === "lifetime" &&
      session.metadata?.pricing_country === match.pricingCountry &&
      session.metadata?.presentment_currency === match.currency &&
      session.metadata?.promo_code === match.promoCode,
  );
}
