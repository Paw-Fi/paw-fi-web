import { createFileRoute } from "@tanstack/react-router";
import { Variants, motion } from "framer-motion";
import { seo } from "@/utils/seo";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { toast } from "react-toastify";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { getPricingTiers } from "@/data/pricing-plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Rocket, Loader2 } from "lucide-react";
import { HomeHeader } from "@/components/index/header";
import classNames from "classnames";
import { FaqSection } from "@/components/ui/faq-section";
import { FeatureComparisonGrid } from "@/components/pricing/feature-comparison-grid";
import { StructuredData } from "@/components/seo/structured-data";
import { UserCommunityShowcase } from "@/components/homepage/user-community-showcase";
import { DiscordLogoIcon } from "@radix-ui/react-icons";

export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => {
    const pageUrl = "https://moneko.io/pricing";
    const meta = seo({
      title: "Moneko Pricing | AI Budgeting App Plans for Individuals & Households",
      description:
        "Compare Moneko pricing and choose the right plan. Starter is free. Plus is $5.99/month or $29.99/year (promo). A limited-time Lifetime plan is $39.99 one-time. Moneko helps with fast capture, pockets (digital envelopes), recurring items, household mode, and optional WhatsApp expense tracking (where available).",
      keywords:
        "moneko pricing, moneko plans, AI budgeting app pricing, budgeting app pricing, envelope budgeting app pricing, household budgeting app pricing, budgeting app for couples pricing, WhatsApp expense tracker pricing, personal finance app subscription, lifetime access budgeting app",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    // Product schema (keep claims strictly factual)
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Moneko - AI Budgeting App",
      description:
        "Moneko is an AI-assisted budgeting app that helps you capture spending, organize pockets (envelopes), manage recurring items, and plan scenarios across personal and household finances.",
      image: "https://moneko.io/og-img.png",
      brand: {
        "@type": "Brand",
        name: "Moneko",
      },
      category: "FinanceApplication",
      audience: {
        "@type": "Audience",
        "audienceType": "Individual Financial Learners"
      },
      offers: {
        "@type": "OfferCatalog",
        name: "Moneko - AI Personal Finance Coach & Budgeting App",
        itemListElement: [
          {
            "@type": "Offer",
            name: "Moneko Starter Plan - Free Forever",
            price: "0",
            priceCurrency: "USD",
            description:
              "Free dashboard to start budgeting with pockets (envelopes), recurring items, and personal vs household modes.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Moneko Plus Plan (Monthly)",
            price: "5.99",
            priceCurrency: "USD",
            description: "Monthly pricing for the Plus plan.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Moneko Plus Plan (Annual)",
            price: "29.99",
            priceCurrency: "USD",
            description: "Early Bird promo annual pricing for the Plus plan.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Moneko Lifetime Plan",
            price: "39.99",
            priceCurrency: "USD",
            description:
              "Limited-time lifetime access offer — one-time payment for access.",
            url: pageUrl,
            availability: "https://schema.org/LimitedAvailability",
            category: "Digital Good",
          },
        ],
      },
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2, duration: 0.5 },
  },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] },
  },
};

function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [billingPeriodMessage, setBillingPeriodMessage] = useState("");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Get pricing tiers from shared data module
  const pricingTiers = getPricingTiers(isAnnual);

  // CRITICAL FIX: Reset loading state on component mount to prevent stuck loading from previous navigations
  // This fixes the issue where loading modal persists when navigating from other pages via <Link>
  useEffect(() => {
    setIsLoading(false);
  }, []); // Empty deps = runs once on mount

  // FAQ data for pricing page
  const faqData = [
    {
      question: "Can I upgrade or downgrade my plan later?",
      answer: "Yes. You can change plans from your account settings. Plan changes and billing dates are handled by Stripe based on your current subscription.",
    },
    {
      question: "Do you offer a free plan?",
      answer: "Yes. Starter is free so you can try core budgeting features like pockets (digital envelopes), recurring items, and personal vs household budgets.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept major credit cards. Payments are processed through Stripe.",
    },
    {
      question: "Is my financial data secure?",
      answer: "We use encrypted connections and follow least-privilege access patterns. For details on how we handle information, see our Privacy Policy or contact hello@moneko.io.",
    },
    {
      question: "What is your cancellation and refund policy?",
      answer: "You can cancel anytime from account settings. For billing questions (including refunds), contact hello@moneko.io and we’ll help based on your payment details.",
    },
    {
      question: "What does the AI help with in Moneko?",
      answer: "Moneko supports faster capture (text, receipt photos, voice notes where available), smarter categorization workflows, and scenario-style insights (" +
        "'what if' planning) to help you understand spending patterns and make informed budgeting decisions.",
    },
    {
      question: "Do you offer discounts?",
      answer: "Discounts may be offered during limited-time promotions. Join our Discord or contact hello@moneko.io for current options.",
    },
    {
      question: "Can I use Moneko on desktop and mobile?",
      answer: "Moneko supports web access and an optional WhatsApp assistant (where available). For mobile availability, check current app store listings or contact hello@moneko.io.",
    }
  ];

  const handleBillingToggle = (toggled: boolean) => {
    setIsAnnual(toggled);
    setBillingPeriodMessage(
      toggled ? "Displaying annual pricing." : "Displaying monthly pricing.",
    );
  };

  const handleSubscribe = async (plan: string) => {
    try {
      // Show loading indicator during async user check
      setIsLoading(true);

      // Get the current user ID if logged in
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

      // User is authenticated, navigate to checkout
      // Navigation is synchronous, no need to keep loading indicator
      setIsLoading(false);

      // Lifetime plan: one-time payment, no billing interval needed
      if (plan === "lifetime") {
        console.log('Pricing page - Creating checkout for Lifetime (one-time payment)');
        navigate({
          to: "/checkout",
          search: { plan: "lifetime" }, // No billing interval for Lifetime
        });
        return;
      }

      // Recurring plans (Plus): require billing interval
      const billingInterval = isAnnual ? "yearly" : "monthly";
      console.log('Pricing page - Creating checkout with:', { plan, billingInterval });

      navigate({
        to: "/checkout",
        search: { plan, billing: billingInterval },
      });
    } catch (err) {
      console.error("Error handling subscription:", err);
      setIsLoading(false);
      toast.error("An error occurred. Please try again.");
    }
  };

  // Animation variants similar to early-access page
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
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <AmbientHaloLayout>
      {/* FAQ schema (keep claims strictly factual) */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What is Moneko?",
            answer: "Moneko is an AI-assisted budgeting app built around fast capture, pockets (envelopes), personal vs household tracking, recurring items, and scenario planning."
          },
          {
            question: "Does Moneko replace a financial advisor?",
            answer: "No. Moneko is a budgeting and planning tool. It can help you organize and understand your finances, but it’s not a substitute for professional advice."
          },
          {
            question: "What can I do with the WhatsApp assistant?",
            answer: "You can capture transactions and ask for summaries from chat. Depending on your plan, WhatsApp features may be gated."
          },
          {
            question: "What are pockets (envelopes)?",
            answer: "Pockets are monthly budget containers (like Groceries or Bills) that help you allocate money and see what’s left as you spend."
          },
          {
            question: "Where can I learn more about privacy and cookies?",
            answer: "You can review our Privacy Policy, Terms of Service, and Cookie Policy for details about data handling and site usage."
          }
        ]}
      />

      <HomeHeader />
      <div className="container mx-auto min-h-screen px-4 py-12 md:py-20">
        <motion.header
          className="mb-16 text-center md:mb-20"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1
            className="text-5xl mb-8 sm:text-6xl lg:text-7xl font-bold text-slate-800 dark:text-slate-200 leading-tight tracking-tight"
            variants={itemVariants}
          >
            Moneko Pricing: AI Budgeting Plans for Individuals & Households
            <br />
          </motion.h1>

          <motion.p
            className="mx-auto max-w-3xl text-base text-muted-foreground-color sm:text-lg mb-10"
            variants={itemVariants}
          >
            Compare plans for Moneko, an AI-assisted budgeting app built for fast expense capture, pockets (digital envelopes), recurring items, personal vs household budgets, and scenario planning. Use the web app, and optionally track spending via the WhatsApp assistant (where available).
          </motion.p>

          <motion.div
            className="mt-10 flex justify-center items-center gap-4"
            variants={itemVariants}
          >
            <span className="text-base font-medium text-muted-foreground-color">Monthly</span>
            <Switch
              labelLeft=""
              labelRight=""
              onToggle={handleBillingToggle}
              initialToggled={isAnnual}
              srText="Toggle billing period"
            />
            <span className="text-base font-medium text-foreground">Annually (Best value)</span>
          </motion.div>
          <p
            className="mt-4 text-sm text-muted-foreground-color sr-only"
          >
            Early Bird promo: Plus was $7.99/month or $59.99/year.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 sr-only">
            <a className="text-sm text-primary hover:text-primary/80 underline underline-offset-4" href="/features/pockets-system">
              Explore Pockets (Envelopes)
            </a>
            <a className="text-sm text-primary hover:text-primary/80 underline underline-offset-4" href="/features/household-mode">
              Household Mode
            </a>
            <a className="text-sm text-primary hover:text-primary/80 underline underline-offset-4" href="/features/whatsapp-assistant">
              WhatsApp Assistant
            </a>
            <a className="text-sm text-primary hover:text-primary/80 underline underline-offset-4" href="/features/ai-insights">
              AI Insights
            </a>
            <a className="text-sm text-primary hover:text-primary/80 underline underline-offset-4" href="/privacy-policy">
              Privacy Policy
            </a>
            <a className="text-sm text-primary hover:text-primary/80 underline underline-offset-4" href="/terms-of-service">
              Terms
            </a>
            <a className="text-sm text-primary hover:text-primary/80 underline underline-offset-4" href="/cookie-policy">
              Cookies
            </a>
          </div>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {billingPeriodMessage}
          </span>
        </motion.header>

        <motion.div 
          className="mt-12 grid grid-cols-1 justify-center gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto" 
          id="pricing-tiers"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          {pricingTiers.map((tier) => {
            const isLifetime = tier.title === "Lifetime";
            const isPlusPlan = tier.title === "Plus";
            const showCompareAt = isPlusPlan && (!!tier.compareAtPriceMonthly || !!tier.compareAtPriceYearly);
            const compareAtPrice = isAnnual ? tier.compareAtPriceYearly : tier.compareAtPriceMonthly;
            const currentPrice = isAnnual && !isLifetime ? tier.priceYearly : tier.priceMonthly;

            return (
              <motion.div
                key={tier.title}
                className="relative"
                variants={itemVariants}
                whileHover={prefersReducedMotion ? {} : { y: -8, transition: { duration: 0.2 } }}
              >
                {tier.badgeText && (
                  <Badge
                    className={classNames(
                      "absolute -top-3 left-1/2 -translate-x-1/2 z-10",
                      {
                        "bg-primary text-primary-foreground": tier.badgeText === "Most Popular",
                        "bg-muted text-muted-foreground": tier.badgeText !== "Most Popular",
                      },
                    )}
                  >
                    {tier.badgeText}
                  </Badge>
                )}

                <Card className={classNames(
                  "h-full transition-all duration-200 hover:shadow-md rounded-2xl",
                  {
                    "border-2 border-primary shadow-lg": tier.highlight,
                    "bg-card": !tier.highlight && !isLifetime,
                    "bg-lifetime-card-bg": isLifetime,
                  }
                )}>
                  <CardHeader className="text-center pb-8 pt-8">
                    {/* Show annual pricing banner inside card below badge */}
                    {isPlusPlan && isAnnual && (
                      <div className="text-center mb-4">
                        <span className="text-base font-semibold text-primary">
                        Early Bird: $29.99/year (was $59.99)
                        </span>
                      </div>
                    )}
                     {isLifetime && (
                      <div className="text-center mb-4">
                        <span className="text-base font-semibold text-primary">
                        LIMITED-TIME LIFETIME OFFER
                        </span>
                      </div>
                    )}

                    <CardTitle className="text-3xl font-bold text-foreground mb-3">
                      {tier.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground-color px-4 leading-relaxed">
                      {tier.subtitle}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 px-8 pb-8">
                    <div className="mb-6 text-center">
                      <div className="flex items-baseline justify-center gap-3 mb-2">
                        {showCompareAt && compareAtPrice ? (
                          <span className="text-lg font-semibold text-muted-foreground line-through">
                            {compareAtPrice}
                          </span>
                        ) : null}
                        <span className="text-5xl font-bold text-foreground tracking-tight">
                          {currentPrice}
                        </span>
                      </div>

                      {/* Price label and additional info */}
                      {isLifetime ? (
                        <p className="text-sm text-muted-foreground mt-1">USD / one-time</p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          USD / {isAnnual ? "year" : "month"}
                        </p>
                      )}

                      {tier.title === "Starter" && (
                        <p className="text-sm font-semibold text-foreground mt-2">
                          Free Forever
                        </p>
                      )}


                      {isLifetime && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Limited-time lifetime access offer. Availability and terms may change.
                        </p>
                      )}

                      {isPlusPlan && !isAnnual && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Early Bird: $5.99/month (was $7.99)
                        </p>
                      )}
                    </div>

                    

                    <Button
                      className={classNames(
                        "w-full transition-all duration-200 hover:shadow-sm mb-6 rounded-lg py-6 text-base font-medium",
                        {
                          "bg-primary hover:bg-primary/90 !text-white": tier.highlight,
                        }
                      )}
                      variant={tier.highlight ? "default" : "outline"}
                      onClick={() => {
                        const lowerTitle = tier.title.toLowerCase();
                        // Free plan -> registration
                        if (lowerTitle === "starter" || lowerTitle === "free") {
                          navigate({ to: "/register", search: { redirect: "/pricing", code: undefined } });
                          return;
                        }

                        // Map plan id based on tier title
                        const planParam = lowerTitle === "plus" ? "plus" : "lifetime";

                        // Proceed to checkout flow
                        handleSubscribe(planParam);
                      }}
                    >
                      {tier.actionText}
                    </Button>

                    {/* Discord Community Incentive - Elegant Info Pill */}
                    {isLifetime && (
                      <div 
                        className="mb-4 mx-auto max-w-fit cursor-pointer group"
                        onClick={() => window.open(DISCORD_URL, '_blank')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            window.open(DISCORD_URL, '_blank');
                          }
                        }}
                      >
                        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-purple-200/50 dark:border-purple-800/30 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                          <DiscordLogoIcon className="h-4 w-4 text-[#5865F2] flex-shrink-0" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Join Discord to get a discount code
                          </span>
                        </div>
                      </div>
                    )}

                    <ul className="space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature.text} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground leading-relaxed">
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
        <UserCommunityShowcase />
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          <FeatureComparisonGrid prefersReducedMotion={prefersReducedMotion} />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          <FaqSection faqData={faqData} title="Pricing & Billing FAQ" />
        </motion.div>

        <motion.div 
          className="mt-20 md:mt-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={itemVariants}
        >
          <Card className="text-center bg-subtle-background">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-foreground">
                Not Sure Which Plan is Right for You?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base max-w-lg mx-auto mb-6 text-muted-foreground-color">
               Start with our Free plan to explore core features, or dive deeper
              with Plus. You can always upgrade as your budgeting needs
               grow.
             </CardDescription>
              <Button variant="link" className="text-primary hover:text-primary/80" asChild>
                <a href="mailto:hello@moneko.io" className="inline-flex items-center gap-2">
                  Contact Us for a Recommendation
                  <Rocket className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="p-8 shadow-xl">
            <CardContent className="flex flex-col items-center gap-4 p-0">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </AmbientHaloLayout>
  );
}
