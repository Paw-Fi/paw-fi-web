import { Variants, motion, AnimatePresence } from "framer-motion";
import { seo } from "@/utils/seo";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { useState, useEffect, useMemo } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { toast } from "react-toastify";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  Rocket,
  Loader2,
  Zap,
  Target,
  Users,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Globe2,
} from "lucide-react";
import { HomeHeader } from "@/components/index/header";
import classNames from "classnames";
import { FaqSection } from "@/components/ui/faq-section";
import { FeatureComparisonGrid } from "@/components/pricing/feature-comparison-grid";
import { StructuredData } from "@/components/seo/structured-data";
import { UserCommunityShowcase } from "@/components/homepage/user-community-showcase";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { getPricingTiers } from "@/data/pricing-plans";
import {
  DEFAULT_REGIONAL_PRICING_COUNTRY,
  detectRegionalPricingCountry,
  getRegionalCountryOptions,
  getRegionalPriceLabels,
  saveRegionalPricingCountry,
} from "@/lib/regional-pricing";

// Added new pro-max components
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { DotPattern } from "@/components/ui/dot-pattern";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";

export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

function BillingToggle({
  isYearly,
  onChange,
  savingsPercent,
}: {
  isYearly: boolean;
  onChange: (yearly: boolean) => void;
  savingsPercent: number;
}) {
  return (
    <div className="border-border/40 bg-card/50 mx-auto flex w-fit items-center rounded-full border p-1.5 shadow-sm backdrop-blur-md">
      <button
        onClick={() => onChange(false)}
        className={classNames(
          "relative rounded-full px-8 py-2.5 text-sm font-semibold transition-colors duration-300",
          !isYearly
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/80",
        )}
      >
        {!isYearly && (
          <motion.div
            layoutId="billing-toggle-bg"
            className="border-border/30 bg-background absolute inset-0 rounded-full border shadow-md"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10">Monthly</span>
      </button>
      <button
        onClick={() => onChange(true)}
        className={classNames(
          "relative flex items-center gap-2 rounded-full px-8 py-2.5 text-sm font-semibold transition-colors duration-300",
          isYearly
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/80",
        )}
      >
        {isYearly && (
          <motion.div
            layoutId="billing-toggle-bg"
            className="border-border/30 bg-background absolute inset-0 rounded-full border shadow-md"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10">Yearly</span>
        <span className="bg-primary/10 text-primary relative z-10 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
          Save {savingsPercent}%
        </span>
      </button>
    </div>
  );
}

function CountryPricingSelector({
  countryCode,
  currencyCode,
  onChange,
}: {
  countryCode: string;
  currencyCode: string;
  onChange: (countryCode: string) => void;
}) {
  const countryOptions = useMemo(
    () =>
      getRegionalCountryOptions(
        typeof navigator === "undefined" ? "en" : navigator.language,
      ),
    [],
  );

  return (
    <div className="border-border/40 bg-card/50 mx-auto flex min-h-11 items-center gap-2 rounded-full border px-4 shadow-sm backdrop-blur-md">
      <Globe2 className="text-muted-foreground h-4 w-4 shrink-0" />
      <label htmlFor="pricing-country" className="sr-only">
        Pricing country or region
      </label>
      <select
        id="pricing-country"
        value={countryCode}
        onChange={(event) => onChange(event.target.value)}
        className="text-foreground focus-visible:ring-primary min-h-11 cursor-pointer bg-transparent pr-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {countryOptions.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      <span
        className="text-muted-foreground border-border border-l pl-2 text-xs font-bold tracking-wide"
        aria-live="polite"
      >
        {currencyCode}
      </span>
    </div>
  );
}

function PricingCard({
  title,
  price,
  period,
  comparePrice,
  billingNote,
  description,
  features,
  isPopular,
  showPopularBadge = isPopular,
  buttonText,
  onSubscribe,
}: {
  title: string;
  price: string;
  period?: string;
  comparePrice?: string;
  billingNote?: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  showPopularBadge?: boolean;
  buttonText: string;
  onSubscribe: () => void;
}) {
  return (
    <div className="relative flex w-full flex-col">
      {isPopular && (
        <div className="from-primary/30 absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br to-purple-500/30 opacity-60 blur-2xl" />
      )}
      <div
        className={classNames(
          "relative flex flex-1 flex-col rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-1 sm:p-10",
          isPopular
            ? "border-primary bg-card/80 border-2 shadow-2xl backdrop-blur-2xl"
            : "border-border/50 bg-card/40 hover:bg-card/50 border-2 shadow-lg backdrop-blur-xl hover:shadow-xl",
        )}
      >
        {showPopularBadge && (
          <div className="absolute -top-4 right-0 left-0 flex justify-center">
            <div className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold tracking-widest uppercase shadow-lg">
              <Sparkles className="h-3.5 w-3.5" />
              Most Popular
            </div>
          </div>
        )}

        <div className="mb-8 flex min-h-[96px] flex-col justify-start">
          <h3 className="text-foreground text-2xl font-extrabold tracking-tight">
            {title}
          </h3>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <div className="mb-8 flex min-h-[116px] flex-col justify-start gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-foreground text-5xl font-black tracking-tighter sm:text-6xl">
              {price}
            </span>
            {period && (
              <span className="text-muted-foreground text-base font-semibold">
                {period}
              </span>
            )}
          </div>

          <div className="mt-1 h-5">
            {comparePrice && (
              <AnimatePresence mode="wait">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-muted-foreground/60 text-sm font-medium line-through"
                >
                  Regularly {comparePrice}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
          {billingNote && (
            <span className="text-muted-foreground text-sm font-medium">
              {billingNote}
            </span>
          )}
        </div>

        <Button
          size="lg"
          onClick={onSubscribe}
          variant={isPopular ? "default" : "outline"}
          className={classNames(
            "group relative w-full overflow-hidden rounded-full py-6 text-base font-bold transition-all",
            isPopular
              ? "shadow-primary/25 hover:shadow-primary/40 shadow-xl"
              : "bg-background/50 hover:bg-muted",
          )}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {buttonText}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
          {isPopular && (
            <div className="group-hover:animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          )}
        </Button>

        {features.length > 0 && (
          <div className="border-border/50 mt-8 border-t pt-6">
            {isPopular && (
              <p className="text-foreground mb-4 text-left text-sm font-bold">
                Included in Plus
              </p>
            )}
            <ul className="space-y-3">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-3 text-sm leading-relaxed"
                >
                  <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-muted-foreground font-medium">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function PricingRouteComponent() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(true);
  const [pricingCountry, setPricingCountry] = useState(
    DEFAULT_REGIONAL_PRICING_COUNTRY,
  );

  type PlanType = "plus_monthly" | "plus_yearly" | "plus_lifetime";

  useEffect(() => {
    setIsLoading(false);
    setPricingCountry(detectRegionalPricingCountry());
  }, []);

  const regionalPrices = getRegionalPriceLabels(pricingCountry);
  const pricingTiers = getPricingTiers({
    monthly: regionalPrices.monthly,
    yearly: regionalPrices.yearly,
    effectiveMonthly: regionalPrices.effectiveMonthly,
    compareAtYearly: regionalPrices.compareAtYearly,
  });

  const plusMonthlyTier = pricingTiers.find(
    (t) =>
      t.title === "Plus" ||
      (t.title.includes("Plus") && !t.title.includes("Yearly")),
  );
  const plusYearlyTier = pricingTiers.find(
    (t) => t.title.includes("Plus") && t.title.includes("Yearly"),
  );
  const safelyGetTier = (tier: any, fallbackParams: any) =>
    tier || fallbackParams;

  const pmTier = safelyGetTier(plusMonthlyTier, {
    title: "Plus Monthly",
    priceMonthly: regionalPrices.monthly,
    features: [
      "Log expenses your way (Text, Photo, Voice)",
      "Stay in control with Pockets",
      "Track spending across currencies",
      "Budget in WhatsApp",
    ],
  });
  const pyTier = safelyGetTier(plusYearlyTier, {
    title: "Plus Yearly",
    priceMonthly: regionalPrices.yearly,
    effectiveMonthlyPrice: regionalPrices.effectiveMonthly,
    compareAtPriceMonthly: regionalPrices.compareAtYearly,
    features: [
      "Log expenses your way (Text, Photo, Voice)",
      "Stay in control with Pockets",
      "Track spending across currencies",
      "Budget in WhatsApp",
    ],
  });
  const faqData = [
    {
      question: "Can I switch billing later?",
      answer:
        "Yes. You can switch between monthly and yearly Plus billing from your account settings. Billing dates are handled by Stripe based on your current subscription.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept major credit cards. Payments are processed through Stripe.",
    },
    {
      question: "Is my financial data secure?",
      answer:
        "We use encrypted connections and follow least-privilege access patterns. For details on how we handle information, see our Privacy Policy or contact hello@moneko.io.",
    },
    {
      question: "What is your cancellation and refund policy?",
      answer:
        "You can cancel anytime from account settings. For billing questions (including refunds), contact hello@moneko.io and we'll help based on your payment details.",
    },
    {
      question: "What does the AI help with in Moneko?",
      answer:
        "Moneko supports faster capture (text, receipt photos, voice notes where available), smarter categorization workflows, and scenario-style insights ('what if' planning) to help you understand spending patterns and make informed budgeting decisions.",
    },
    {
      question: "Do you offer discounts?",
      answer:
        "Discounts may be offered during limited-time promotions. Join our Discord or contact hello@moneko.io for current options.",
    },
  ];

  const handleSubscribe = async (planId: PlanType) => {
    try {
      setIsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        setIsLoading(false);
        toast.error("Please sign in to subscribe");
        navigate({ to: "/login", search: { redirect: "/pricing" } });
        return;
      }

      setIsLoading(false);

      const selectedPlan =
        planId === "plus_lifetime"
          ? { plan: "lifetime", billing: undefined }
          : planId === "plus_monthly"
            ? { plan: "plus", billing: "monthly" }
            : { plan: "plus", billing: "yearly" };

      navigate({
        to: "/checkout",
        search: selectedPlan.billing
          ? {
              plan: selectedPlan.plan,
              billing: selectedPlan.billing,
              country: pricingCountry,
              currency: regionalPrices.market.currencyCode,
            }
          : {
              plan: selectedPlan.plan,
              country: pricingCountry,
              currency: regionalPrices.market.currencyCode,
            },
      });
    } catch (err) {
      console.error("Error handling subscription:", err);
      setIsLoading(false);
      toast.error("An error occurred. Please try again.");
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: [0.16, 1, 0.3, 1], // Custom spring-like ease
      },
    },
  };

  // Bento Grid features
  const bentoFeatures = [
    {
      name: "Proactive AI Coaching",
      description: "Dual-persona AI runs scenario planning based on your life.",
      href: "/features/ai-insights",
      cta: "Meet your AI",
      className: "lg:row-span-2",
      Icon: Sparkles,
      component: (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <BorderBeam duration={8} size={200} />
          <div className="absolute inset-0 z-0">
            <DotPattern />
          </div>
          <div className="bg-card/90 border-border/50 relative z-10 mx-auto w-full max-w-[90%] rounded-2xl border p-5 shadow-2xl backdrop-blur md:max-w-[70%] lg:max-w-[80%]">
            <div className="mb-4 flex items-end justify-end gap-3">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-3 text-sm">
                Can I afford a new car next month?
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm p-3 text-sm">
                Based on your pockets, you can afford a $400/mo payment if we
                reallocate the 'Dining Out' pocket.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      name: "Household Sync",
      description: "Manage pockets together.",
      href: "/features/household-mode",
      cta: "Sync up",
      className: "lg:col-span-1",
      Icon: Users,
      component: (
        <div className="bg-background absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
          <OrbitingCircles duration={15} radius={50} speed={1}>
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=b6e3f4"
              alt="user 1"
              className="h-10 w-10 rounded-full shadow-md"
            />
          </OrbitingCircles>
          <OrbitingCircles duration={15} radius={50} speed={1} reverse>
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Aneka&backgroundColor=c0aede"
              alt="user 2"
              className="h-10 w-10 rounded-full shadow-md"
            />
          </OrbitingCircles>
          <div className="bg-primary/20 border-primary outline-border z-10 flex h-16 w-16 items-center justify-center space-x-1 rounded-full border-2 shadow-lg outline outline-1">
            <Users className="text-primary h-8 w-8" />
          </div>
        </div>
      ),
    },
    {
      name: "Instant Capture",
      description: "Forward receipts or use WhatsApp.",
      href: "/features/whatsapp-assistant",
      cta: "Try capture",
      className: "lg:col-span-1",
      Icon: Zap,
      component: (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-emerald-500/10 to-transparent">
          <div className="group/mock relative">
            <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 opacity-25 blur transition duration-500 group-hover/mock:opacity-75"></div>
            <div className="bg-card relative flex items-center gap-3 rounded-xl border p-4">
              <div className="rounded-full bg-[#25D366] p-2">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Coffee 4.50</span>
                <span className="text-muted-foreground text-xs">
                  Logged to "Dining" pocket
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <AmbientHaloLayout>
      <StructuredData type="faq" data={faqData} />

      <HomeHeader />

      <div className="min-h-screen pb-20">
        {/* Unified Pricing Hero Section */}
        <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 md:pt-32 md:pb-24">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col items-center text-center"
          >
            <motion.div
              variants={itemVariants}
              className="bg-primary/10 text-primary mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-wide">
                30-day money-back guarantee
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-foreground mb-6 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
            >
              One simple app. <br className="hidden sm:block" />
              <span className="from-primary bg-gradient-to-r to-purple-600 bg-clip-text text-transparent">
                Master your money.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-muted-foreground mb-12 max-w-2xl text-lg leading-relaxed sm:text-xl"
            >
              Stop manually tracking every penny in spreadsheets. Moneko
              automates the heavy lifting with AI, giving you the intentionality
              of zero-based budgeting.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex w-full flex-col items-center gap-4"
            >
              <BillingToggle
                isYearly={isYearly}
                onChange={setIsYearly}
                savingsPercent={regionalPrices.yearlySavingsPercent}
              />
              <CountryPricingSelector
                countryCode={pricingCountry}
                currencyCode={regionalPrices.market.currencyCode}
                onChange={(countryCode) => {
                  setPricingCountry(saveRegionalPricingCountry(countryCode));
                }}
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mx-auto mt-12 w-full max-w-7xl"
            >
              <FeatureComparisonGrid
                prefersReducedMotion={prefersReducedMotion}
                plusPriceLabel={
                  isYearly
                    ? `${pyTier.effectiveMonthlyPrice}/mo billed yearly`
                    : `${pmTier.priceMonthly}/mo`
                }
              />
            </motion.div>

            {/* Pricing Cards Grid */}
            <motion.div
              variants={itemVariants}
              className="mx-auto mt-16 grid w-full max-w-7xl items-stretch gap-8 lg:grid-cols-3"
            >
              <PricingCard
                title="Monthly"
                description="Flexible Plus access with monthly billing."
                price={pmTier.priceMonthly}
                period="/mo"
                billingNote="billed monthly"
                features={[]}
                isPopular={false}
                buttonText="Get Plus"
                onSubscribe={() => handleSubscribe("plus_monthly")}
              />

              <PricingCard
                title="Yearly"
                description="Best value for Plus with lower effective monthly pricing."
                price={pyTier.effectiveMonthlyPrice}
                period="/mo"
                comparePrice={`${pmTier.priceMonthly}/mo`}
                billingNote={`billed annually at ${pyTier.priceMonthly}`}
                features={[]}
                isPopular={true}
                buttonText="Get Yearly Plus"
                onSubscribe={() => handleSubscribe("plus_yearly")}
              />

              <PricingCard
                title="Lifetime"
                description="Pay once and keep access to Plus without recurring billing."
                price={regionalPrices.lifetime}
                period="one-time"
                billingNote="lifetime access"
                features={[]}
                isPopular={false}
                buttonText="Get Lifetime Plus"
                onSubscribe={() => handleSubscribe("plus_lifetime")}
              />
            </motion.div>
          </motion.div>
        </section>

        {/* Community Showcase (Social Proof) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <UserCommunityShowcase />
        </motion.div>

        {/* Bento Grid Showcase Section */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="mx-auto mt-8 mb-16 max-w-7xl px-4 md:mb-24"
        >
          <div className="mb-10 w-full text-center lg:text-left">
            <h2 className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">
              Plus Features
            </h2>
            <p className="text-muted-foreground mx-auto max-w-xl text-lg lg:mx-0">
              Everything we currently offer is included in Plus.
            </p>
          </div>
          <div className="bg-card border-border/50 min-h-[800px] overflow-hidden rounded-3xl border shadow-2xl lg:min-h-[500px]">
            <BentoGrid className="h-full lg:grid-rows-2">
              {bentoFeatures.map((feature) => (
                <BentoCard key={feature.name} {...feature} />
              ))}
            </BentoGrid>
          </div>
        </motion.div>

        {/* FAQs */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="mt-20 md:mt-32"
        >
          <FaqSection faqData={faqData} title="Pricing & Billing FAQ" />
        </motion.div>

        {/* Final CTA Strip */}
        <motion.div
          className="mt-24 px-4 md:mt-32"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={itemVariants}
        >
          <Card className="mx-auto max-w-2xl border-0 bg-transparent text-center shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground text-3xl font-bold">
                Still have questions?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground mb-8 text-lg">
                We're here to help you make the best decision for your financial
                future.
              </CardDescription>
              <Button
                size="lg"
                variant="outline"
                className="bg-background hover:bg-muted rounded-full border-2 px-8 font-medium"
                asChild
              >
                <a
                  href="mailto:hello@moneko.io"
                  className="inline-flex items-center gap-2"
                >
                  Contact Support Team
                </a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <Card className="border-none p-8 shadow-2xl">
            <CardContent className="flex flex-col items-center gap-6 p-0">
              <div className="relative">
                <div className="border-primary/20 absolute inset-0 animate-pulse rounded-full border-4" />
                <Loader2 className="text-primary relative h-12 w-12 animate-spin" />
              </div>
              <p className="text-foreground animate-pulse text-sm font-medium">
                Processing your request...
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </AmbientHaloLayout>
  );
}
