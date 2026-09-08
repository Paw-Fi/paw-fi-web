import { Check, Flame, Infinity, Sparkles } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { LifetimeCountdownCard } from "@/components/pricing/countdown-timer";

export interface PricingCardsGridProps {
  isYearly: boolean;
  pmTier: any;
  pyTier: any;
  lifetimePrice: string;
  lifetimeOriginalPrice?: string;
  lifetimeDiscountPercent?: number;
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
  lifetimeOriginalPrice,
  lifetimeDiscountPercent = 30,
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
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-stretch gap-6 md:grid-cols-3">
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

      {/* Lifetime Card (Promotional Hero) */}
      <div className="bg-card border-orange-500/40 text-card-foreground relative flex flex-col rounded-3xl border-2 p-6 shadow-xl transition-all duration-300 hover:border-orange-500/60 hover:shadow-2xl sm:p-8 dark:border-orange-500/30 dark:bg-[#121212] dark:text-white dark:hover:border-orange-500/50 overflow-hidden">
        <BorderBeam size={220} duration={10} delay={0} colorFrom="#f97316" colorTo="#fb923c" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold sm:text-2xl">Lifetime</h3>            
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
            {lifetimeDiscountPercent}% OFF
          </span>
        </div>

        <div className="mb-1 flex flex-wrap items-baseline gap-2">
          <span className="text-5xl font-extrabold tracking-tight text-foreground dark:text-white">
            {lifetimePrice}
          </span>
          {lifetimeOriginalPrice && (
            <span className="text-muted-foreground/70 line-through text-lg font-medium dark:text-white/40">
              {lifetimeOriginalPrice}
            </span>
          )}
          
        </div>
        <p className="text-muted-foreground mb-4 text-xs font-medium dark:text-white/50">
           Pay once · Yours forever
        </p>


        <button
          onClick={() => onSubscribe("plus_lifetime")}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-3.5 px-4 text-sm font-bold shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer hover:shadow-orange-500/20"
        >
          Get Lifetime Access
        </button>
        <p className="text-muted-foreground mb-6 text-center text-xs dark:text-white/40">
          One-time payment · 30-day money-back guarantee
        </p>
        <LifetimeCountdownCard className="mb-5" />

        <ul className="flex-1 space-y-3.5">
          <li className="flex items-center gap-3 text-sm font-medium text-foreground/95 dark:text-white">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              <Infinity className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-orange-600 dark:text-orange-400">
              All future Plus updates included forever
            </span>
          </li>
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
