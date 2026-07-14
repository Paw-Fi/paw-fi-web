import { Check } from "lucide-react";

export interface PricingCardsGridProps {
  isYearly: boolean;
  pmTier: any;
  pyTier: any;
  lifetimePrice: string;
  freePrice: string;
  onSubscribe: (planId: "free" | "plus_monthly" | "plus_yearly" | "plus_lifetime") => void;
}

export function PricingCardsGrid({
  isYearly,
  pmTier,
  pyTier,
  lifetimePrice,
  freePrice,
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
      {/* Free Card */}
      <div className="flex flex-col bg-card dark:bg-[#111111] border border-border dark:border-white/10 rounded-3xl p-6 sm:p-8 text-card-foreground dark:text-white relative shadow-sm">
        <h3 className="text-xl sm:text-2xl font-medium mb-4">Free</h3>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-5xl font-bold">{freePrice}</span>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/50 mb-6">Free forever</p>
        
        <button 
          onClick={() => onSubscribe("free")}
          className="w-full bg-muted hover:bg-muted/80 text-foreground dark:bg-[#1A1A1A] dark:hover:bg-[#252525] border border-border dark:border-white/10 transition-colors rounded-xl py-3 text-sm font-semibold mb-8"
        >
          Get Started
        </button>



        <ul className="space-y-4 flex-1">
          {freeFeatures.map((feature, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground dark:text-white/80">
              <Check className="w-5 h-5 text-muted-foreground/40 dark:text-white/40 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Plus Card */}
      <div className="flex flex-col bg-card dark:bg-[#111111] border border-border dark:border-white/20 rounded-3xl p-6 sm:p-8 text-card-foreground dark:text-white relative shadow-md">
        <h3 className="text-xl sm:text-2xl font-medium mb-4">Plus</h3>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-5xl font-bold">
            {isYearly 
              ? pyTier.effectiveMonthlyPrice
              : pmTier.priceMonthly}
          </span>
          <span className="text-sm text-muted-foreground dark:text-white/50 ml-1">/ Month</span>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/50 mb-6">
          {isYearly ? `Billed annually at ${pyTier.priceMonthly}` : 'Cancel Anytime'}
        </p>

        <button 
          onClick={() => onSubscribe(isYearly ? "plus_yearly" : "plus_monthly")}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-[#E5E5E5] dark:hover:bg-white dark:text-black transition-colors rounded-xl py-3 text-sm font-semibold mb-2"
        >
          Subscribe Special Offer
        </button>
        <p className="text-xs text-center text-muted-foreground dark:text-white/40 mb-8">Cancel Anytime</p>



        <ul className="space-y-4 flex-1">
          {plusFeatures.map((feature, i) => (
            <li key={i} className="flex gap-3 text-sm text-foreground/90 dark:text-white/90">
              <Check className="w-5 h-5 text-primary dark:text-white shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Lifetime Card */}
      <div className="flex flex-col bg-card dark:bg-[#111111] border border-border dark:border-white/20 rounded-3xl p-6 sm:p-8 text-card-foreground dark:text-white relative shadow-md">
        <h3 className="text-xl sm:text-2xl font-medium mb-4">Lifetime</h3>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-5xl font-bold">{lifetimePrice}</span>
          <span className="text-sm text-muted-foreground dark:text-white/50 ml-1">/ One-time</span>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/50 mb-6">Pay once, yours forever</p>

        <button 
          onClick={() => onSubscribe("plus_lifetime")}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-[#E5E5E5] dark:hover:bg-white dark:text-black transition-colors rounded-xl py-3 text-sm font-semibold mb-2"
        >
          Get Lifetime
        </button>
        <p className="text-xs text-center text-muted-foreground dark:text-white/40 mb-8">One-time payment, no subscriptions</p>



        <ul className="space-y-4 flex-1">
          {plusFeatures.map((feature, i) => (
            <li key={i} className="flex gap-3 text-sm text-foreground/90 dark:text-white/90">
              <Check className="w-5 h-5 text-primary dark:text-white shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
