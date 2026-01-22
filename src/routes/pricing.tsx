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
import {
  getPricingTiers,
} from "@/data/pricing-plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Rocket, Loader2, Sparkles } from "lucide-react";

import { HomeHeader } from "@/components/index/header";
import classNames from "classnames";
import { FaqSection } from "@/components/ui/faq-section";
import { FeatureComparisonGrid } from "@/components/pricing/feature-comparison-grid";
import { SocialProofSection } from "@/components/pricing/social-proof-section";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { StructuredData } from "@/components/seo/structured-data";
import { UserCommunityShowcase } from "@/components/homepage/user-community-showcase";
import { DiscordLogoIcon } from "@radix-ui/react-icons";

export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => {
    const pageUrl = "https://moneko.io/pricing";
    const meta = seo({
      title: "Moneko Pricing Plans | Simple, Transparent AI Budgeting App Pricing",
      description:
        "Choose the perfect plan for your financial journey: Free Starter for beginners, Plus at $29.99/year or $5.99/month, or Lifetime Early Bird at $39.99 one-time (limited time).",
      keywords:
        "moneko pricing, moneko plans, moneko subscription, personal finance app pricing, AI budgeting app, budgeting app subscription, financial planning pricing, lifetime access, moneko cost, moneko free",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    // Enhanced GEO-Optimized Product Schema with Expert Attribution
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Moneko - AI Personal Finance Coach & Budgeting App",
      description:
        "Moneko is an expert-designed financial education app created by CFA charterholder Sabina Shao, offering AI-powered coaching, investment guidance, and personalized budgeting tools.",
      image: "https://moneko.io/og-img.png",
      brand: {
        "@type": "Brand",
        name: "Moneko",
      },
      creator: {
        "@type": "Person",
        "name": "Sabina Shao",
        "jobTitle": "CEO & Financial Education Expert",
        "hasCredential": "CFA Charterholder",
        "knowsAbout": ["Personal Finance", "Investment Strategy", "Financial Planning", "Wealth Building"]
      },
      category: "Financial Education Software",
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
              "Free dashboard to start budgeting smarter with AI",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Moneko Plus Plan",
            priceSpecification: [
              {
                "@type": "PriceSpecification",
                price: "5.99",
                priceCurrency: "USD",
                billingDuration: "P1M", // ISO 8601 duration for 1 month
              },
              {
                "@type": "PriceSpecification",
                price: "29.99",
                priceCurrency: "USD",
                billingDuration: "P1Y", // ISO 8601 duration for 1 year
              },
            ],
            description: "Perfect for managing expenses, bills, and savings with AI support",
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
              "Lifetime Early Bird (limited time) — one-time payment for full access",
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
  const { user } = useAuth();

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
      answer: "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you'll be charged the prorated amount for the remainder of your billing cycle. When you downgrade, the change will take effect at your next billing cycle."
    },
    {
      question: "What happens at the end of my free trial?",
      answer: "Your free trial automatically converts to a paid subscription unless you cancel before it ends. We'll send you email reminders before your trial expires, and you can cancel anytime during the trial with no charges."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express, Discover). All payments are processed securely through Stripe with bank-level encryption."
    },
    {
      question: "Is my financial data secure?",
      answer: "Absolutely. We use bank-level 256-bit SSL encryption and are SOC 2 compliant. We only access your accounts in read-only mode and never store your banking credentials. Your data is protected with the same security standards used by major financial institutions."
    },
    {
      question: "What is your cancellation and refund policy?",
      answer: "You can cancel your subscription anytime with no cancellation fees. We offer a 30-day money-back guarantee - if you're not satisfied within the first 30 days, we'll provide a full refund. After cancellation, you'll retain access until the end of your current billing period."
    },
    {
      question: "How do the AI-personalized lessons work?",
      answer: "Our AI analyzes your financial goals, experience level, and learning preferences to create custom lessons just for you. You can chat with the AI about specific topics you want to learn, and it will generate comprehensive, personalized content tailored to your situation."
    },
    {
      question: "Do you offer student or educator discounts?",
      answer: "Yes! We offer a 50% discount for verified students and educators. Contact us at hello@moneko.io with your .edu email address to get started with your discounted plan."
    },
    {
      question: "Can I use Moneko on desktop and mobile?",
      answer: "Yes. Plus includes desktop + mobile sync. You can log in on the web and in the app and keep everything in sync."
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
        navigate({ to: "/login",search:{redirect:"/pricing"} });
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
      {/* GEO-Optimized FAQ Schema for Pricing */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What makes Moneko's financial education different from other apps?",
            answer: "Moneko is created by CFA charterholder Sabina Shao with over 10 years of financial expertise. Our AI-powered platform provides personalized coaching, expert-designed courses, and real-time portfolio tracking - all backed by proven investment strategies and behavioral finance principles."
          },
          {
            question: "Can I trust Moneko with my financial planning decisions?",
            answer: "Yes. Moneko's content is created and reviewed by certified financial experts including CFA charterholders. Our educational approach is based on academic research, proven investment principles, and decades of real-world financial planning experience."
          },
          {
            question: "How does Moneko's AI coaching compare to human financial advisors?",
            answer: "Moneko's AI coaching provides 24/7 access to expert-designed financial guidance at a fraction of the cost of traditional advisors. While not replacing human advisors for complex situations, our AI delivers personalized education and actionable insights based on CFA-level expertise."
          },
          {
            question: "What credentials do Moneko's financial experts have?",
            answer: "Moneko is founded and led by Sabina Shao, a CFA charterholder with over 10 years of experience in personal finance and investment strategy. Our content team includes certified financial experts with combined decades of experience in wealth management and financial education."
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
            The AI Budgeting App for Smarter Money Management
            <br />
          </motion.h1>

          <motion.p
            className="mx-auto max-w-3xl text-base text-muted-foreground-color sm:text-lg mb-10"
            variants={itemVariants}
          >
            Manage your money with Moneko, the AI-powered budgeting app for desktop and mobile. Track expenses, set savings goals, and get smart reminders for bills and paychecks. Choose the plan that fits your journey.
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
            <span className="text-base font-medium text-foreground">Annually (Save 50%)</span>
          </motion.div>
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
                        "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100": tier.badgeText === "LIMITED SPOTS AVAILABLE",
                        "bg-muted text-muted-foreground": tier.badgeText !== "Most Popular" && tier.badgeText !== "LIMITED SPOTS AVAILABLE",
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
                        $29.99/YEAR (SAVE 50%)
                        </span>
                      </div>
                    )}
                     {isLifetime && (
                      <div className="text-center mb-4">
                        <span className="text-base font-semibold text-primary">
                        LIMITED SPOTS AVAILABLE
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
                      <div className="flex items-baseline justify-center gap-0.5 mb-2">
                        <span className="text-5xl font-bold text-foreground tracking-tight">
                          {isAnnual && !isLifetime ? tier.priceYearly : tier.priceMonthly}
                        </span>
                        
                      </div>

                      {/* Price label and additional info */}
                      {!isLifetime && (
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
                          Early-bird only (One-time). Lifetime will be removed after the sale.
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
                          navigate({ to: "/register", search: { redirect: "/pricing" } });
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
                          Join our Discord for discounts up to 50%!
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

        {/* <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          <SocialProofSection prefersReducedMotion={prefersReducedMotion} />
        </motion.div> */}

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
        >
          <FaqSection faqData={faqData} />
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
                with a Plus trial. You can always upgrade as your financial needs
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
