import { Check } from "lucide-react";

export interface PricingCardsGridProps {
  isYearly: boolean;
  pmTier: any;
  pyTier: any;
  lifetimePrice: string;
  freePrice: string;
  yearlySavingsPercent: number;
  onSubscribe: (
    planId: "free" | "plus_monthly" | "plus_yearly" | "plus_lifetime",
  ) => void;
}

export function PricingCardsGrid({
  isYearly,
  pmTier,
  pyTier,
  lifetimePrice,
  freePrice,
  yearlySavingsPercent,
  onSubscribe,
}: PricingCardsGridProps) {
  const freeFeatures = [
    "AI expense capture (Text, Photo, Voice)",
    "Up to 2 Spaces",
    "Up to 2 Wallets",
    "Standard Support",
  ];

  const plusFeatures = [
    "Unlimited AI expense capture",
    "Unlimited Spaces & Wallets",
    "WhatsApp + Telegram tracking",
    "Email receipt import",
    "Health report details & AI scenarios",
    "Bank Sync (US & Canada)",
    "Multi-currency & live rates",
    "App Lock",
    "Priority support",
  ];

  const currentPlusTier = isYearly ? pyTier : pmTier;

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
      {/* Free Card */}
      <div className="bg-card border-border text-card-foreground relative flex flex-col rounded-3xl border p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-[#111111] dark:text-white">
        <h3 className="mb-4 text-xl font-medium sm:text-2xl">Free</h3>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-5xl font-bold">{freePrice}</span>
        </div>
        <p className="text-muted-foreground mb-6 text-sm dark:text-white/50">
          Free forever
        </p>

        <button
          onClick={() => onSubscribe("free")}
          className="bg-muted hover:bg-muted/80 text-foreground border-border mb-8 w-full rounded-xl border py-3 text-sm font-semibold transition-colors dark:border-white/10 dark:bg-[#1A1A1A] dark:hover:bg-[#252525]"
        >
          Get Started
        </button>

        <ul className="flex-1 space-y-4">
          {freeFeatures.map((feature, i) => (
            <li
              key={i}
              className="text-muted-foreground flex gap-3 text-sm dark:text-white/80"
            >
              <Check className="text-muted-foreground/40 h-5 w-5 shrink-0 dark:text-white/40" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Plus Card */}
      <div className="bg-card border-border text-card-foreground relative flex flex-col rounded-3xl border p-6 shadow-md sm:p-8 dark:border-white/20 dark:bg-[#111111] dark:text-white">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
           
            <h3 className="mt-1 text-xl font-semibold sm:text-2xl">
              {isYearly ? "Annual Plan" : "Monthly Plan"}
            </h3>
          </div>
          {isYearly && (
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
              Best value
            </span>
          )}
        </div>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-5xl font-bold">
            {isYearly ? pyTier.effectiveMonthlyPrice : pmTier.priceMonthly}
          </span>
          <span className="text-muted-foreground ml-1 text-sm dark:text-white/50">
            / Month
          </span>
        </div>
        <p className="text-muted-foreground mb-6 text-sm dark:text-white/50">
          {isYearly
            ? `${pyTier.priceMonthly} billed annually upfront`
            : "Cancel anytime"}
        </p>
        

        <button
          onClick={() => onSubscribe(isYearly ? "plus_yearly" : "plus_monthly")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground mb-2 w-full rounded-xl py-3 text-sm font-semibold transition-colors dark:bg-[#E5E5E5] dark:text-black dark:hover:bg-white"
        >
          Subscribe Special Offer
        </button>
        <p className="text-muted-foreground mb-8 text-center text-xs dark:text-white/40">
          {isYearly ? "Paid upfront · Renews yearly" : "Cancel anytime"}
        </p>

        <ul className="flex-1 space-y-4">
          {plusFeatures.map((feature, i) => (
            <li
              key={i}
              className="text-foreground/90 flex gap-3 text-sm dark:text-white/90"
            >
              <Check className="text-primary h-5 w-5 shrink-0 dark:text-white" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Lifetime Card */}
      <div className="bg-card border-border text-card-foreground relative flex flex-col rounded-3xl border p-6 shadow-md sm:p-8 dark:border-white/20 dark:bg-[#111111] dark:text-white">
        <h3 className="mb-4 text-xl font-medium sm:text-2xl">Lifetime</h3>
        <div className="mb-1 flex items-baseline gap-1">
          <span className="text-5xl font-bold">{lifetimePrice}</span>
          <span className="text-muted-foreground ml-1 text-sm dark:text-white/50">
            / One-time
          </span>
        </div>
        <p className="text-muted-foreground mb-6 text-sm dark:text-white/50">
          Pay once, yours forever
        </p>

        <button
          onClick={() => onSubscribe("plus_lifetime")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground mb-2 w-full rounded-xl py-3 text-sm font-semibold transition-colors dark:bg-[#E5E5E5] dark:text-black dark:hover:bg-white"
        >
          Get Lifetime
        </button>
        <p className="text-muted-foreground mb-8 text-center text-xs dark:text-white/40">
          One-time payment, no subscriptions
        </p>

        <ul className="flex-1 space-y-4">
          {plusFeatures.map((feature, i) => (
            <li
              key={i}
              className="text-foreground/90 flex gap-3 text-sm dark:text-white/90"
            >
              <Check className="text-primary h-5 w-5 shrink-0 dark:text-white" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
