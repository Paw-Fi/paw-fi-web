import { createFileRoute } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { seo } from "@/utils/seo";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
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
import { Check, Rocket, Loader2 } from "lucide-react";
import { HomeHeader } from "@/components/index/header";
import classNames from "classnames";
import { FaqSection } from "@/components/ui/faq-section";
import { FeatureComparisonGrid } from "@/components/pricing/feature-comparison-grid";
import { SocialProofSection } from "@/components/pricing/social-proof-section";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { StructuredData } from "@/components/seo/structured-data";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => {
    const pageUrl = "https://moneko.io/pricing";
    const meta = seo({
      title: "Pricing Plans - Free AI Finance Coach | Moneko",
      description: "Start free with AI finance coach. Affordable plans for advanced budgeting, investment guidance & financial education.",
      keywords:
        "personal finance app pricing, AI finance coach plans, budgeting app subscription, financial education pricing, investment tools cost, financial planning app",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    // Enhanced GEO-Optimized Product Schema with Expert Attribution
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Moneko Subscription Plans",
      description:
        "Expert-designed financial education subscription plans created by CFA charterholder Sabina Shao, offering AI-powered coaching, investment guidance, and personalized budgeting tools.",
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
        name: "Moneko Subscription Plans",
        itemListElement: [
          {
            "@type": "Offer",
            name: "Free Plan - Starter Pack",
            price: "0",
            priceCurrency: "USD",
            description:
              "Perfect if you’re just starting your financial journey.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Plus Plan - Money Mover",
            priceSpecification: [
              {
                "@type": "PriceSpecification",
                price: "9",
                priceCurrency: "USD",
                billingDuration: "P1M", // ISO 8601 duration for 1 month
              },
              {
                "@type": "PriceSpecification",
                price: "79",
                priceCurrency: "USD",
                billingDuration: "P1Y", // ISO 8601 duration for 1 year
              },
            ],
            description: "Great if you want deeper tools and investing prep.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Premium Plan - Invest & Thrive",
            priceSpecification: [
              {
                "@type": "PriceSpecification",
                price: "19",
                priceCurrency: "USD",
                billingDuration: "P1M",
              },
              {
                "@type": "PriceSpecification",
                price: "149",
                priceCurrency: "USD",
                billingDuration: "P1Y",
              },
            ],
            description:
              "For users serious about mastering money & building wealth.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
        ],
      },
    };

    return {
      meta,
      link: [
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
  const { subscription, isActive: hasActiveSub, isLoading: isSubLoading } = useSubscription(user?.id);

  // Get pricing tiers from shared data module
  const pricingTiers = getPricingTiers(isAnnual);

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
      answer: "We accept all major credit cards (Visa, MasterCard, American Express, Discover) and PayPal. All payments are processed securely through Stripe with bank-level encryption."
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
      question: "Can I connect multiple brokerage accounts?",
      answer: "With the Investor plan, you can connect 1 brokerage account. Wealth Builder subscribers can connect unlimited accounts from all major brokerages including Fidelity, Charles Schwab, Vanguard, TD Ameritrade, and more."
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
      // If user already has an active subscription, don't create another checkout session
      if (hasActiveSub) {
        const currentPlan = (subscription?.plan || "").toLowerCase();
        if (currentPlan === plan) {
          toast.info("You're already subscribed to this plan.");
        } else {
          toast.info("You already have an active subscription.");
        }
        navigate({ to: "/dashboard" });
        return;
      }

      if (plan === "premium") {
       window.location.href = "mailto:hello@moneko.io?subject=Waitlist%20Request&body=Please%20add%20me%20to%20the%20waitlist!"
        return;
      }
      setIsLoading(true);

      // Get the current user ID if logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        toast.error("Please sign in to subscribe");
        navigate({ to: "/login",search:{redirect:"/pricing"} });
        setIsLoading(false);
        return;
      }

      const billingInterval = isAnnual ? "yearly" : "monthly";
      
      console.log('Pricing page - Creating checkout with:', { plan, billingInterval });

      // Redirect to checkout page with plan and billing interval
      // The backend will automatically determine trial eligibility based on subscription history
      navigate({
        to: "/checkout",
        search: { plan, billing: billingInterval },
      });

      setIsLoading(false);
    } catch (err) {
      console.error("Error handling subscription:", err);
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // Safari iOS streaming fix: Safari buffers HTML until ~650B gzipped
  // Adding invisible padding triggers streaming: https://github.com/remix-run/remix/issues/5804
  const safariStreamingPadding = '\u200b'.repeat(200);

  return (
    <AmbientHaloLayout>
      {/* Safari iOS streaming fix - invisible padding */}
      <div style={{ width: 0, height: 0, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: safariStreamingPadding }} />

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
      <div      
        className="container mx-auto min-h-screen px-4 py-12 md:py-20"
      >
     

        <header
          className="mb-16 text-center md:mb-20"
        >
          <h1
            className="mb-6 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl"
          >
            Master Your Money with Expert Financial Education
          </h1>
          <p
            className="mx-auto max-w-2xl text-lg text-muted-foreground-color md:text-xl"
          >
            From foundational lessons to AI-powered personalized guidance - choose the plan that accelerates your journey from financial beginner to confident investor. Created by certified financial experts.
          </p>

          <div
            className="mt-10 flex justify-center"
          >
            <Switch
              labelLeft="Monthly"
              labelRight="Annually (Save up to 25%)"
              onToggle={handleBillingToggle}
              initialToggled={isAnnual}
              srText="Toggle billing period"
            />
          </div>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {billingPeriodMessage}
          </span>
        </header>

        <div
          className="mt-12 grid grid-cols-1 justify-center gap-8 md:grid-cols-2 lg:grid-cols-3"
          id="pricing-tiers"
        >
          {pricingTiers.map((tier) => (
            <div
              key={tier.title}
              className="relative"
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
                "h-full transition-all duration-200 hover:shadow-md",
                {
                  "bg-card shadow-sm": tier.highlight,
                  "bg-card": !tier.highlight,
                }
              )}>
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {tier.title}
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground-color">
                    {tier.subtitle}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        {isAnnual && tier.priceYearly
                          ? tier.priceYearly.replace("/year", "")
                          : tier.priceMonthly}
                      </span>
                      <span className="text-base font-medium text-muted-foreground-color">
                        /month
                      </span>
                    </div>
                    
                    {isAnnual && tier.annualTotal && (
                      <p className="text-sm text-muted-foreground-color mt-2">
                        ${tier.annualTotal}/year
                      </p>
                    )}
                    
                    {tier.priceYearly && tier.title !== "Starter" && (
                      <p className={`mt-3 text-sm font-medium text-primary transition-opacity duration-300 ${isAnnual ? "opacity-100" : "opacity-0"}`}>
                        {isAnnual&&tier.title==="Plus" &&(
                          "Save 4 months"
                        )}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8">
                    {tier.features.map((feature) => (
                      <li key={feature.text} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground-color leading-relaxed">
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {tier.trialText && (
                    <div className="mb-6 text-center rounded-lg bg-subtle-background p-4">
                      <span className="text-base font-semibold text-primary whitespace-pre-line">
                        {tier.trialText}
                      </span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0 flex-col gap-4">
                  <Button
                    className={classNames(
                      "w-full transition-all duration-200 hover:shadow-sm",
                      {
                        "bg-primary hover:bg-primary/90": tier.highlight,
                      }
                    )}
                    variant={tier.highlight ? "default" : "outline"}
                    onClick={() => {
                      const lowerTitle = tier.title.toLowerCase();
                      // Free plan -> registration
                      if (lowerTitle === "free") {
                        navigate({ to: "/register", search: { redirect: "/pricing" } });
                        return;
                      }

                      // Map plan id based on tier title
                      const planParam = lowerTitle === "plus" ? "plus" : "premium";

                      // Proceed to checkout flow
                      handleSubscribe(planParam);
                    }}
                  >
                    {tier.actionText}
                  </Button>

                  {tier.audienceText && (
                    <p className="text-xs text-muted-foreground-color text-center">
                      {tier.audienceText}
                    </p>
                  )}
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>

        <FeatureComparisonGrid prefersReducedMotion={prefersReducedMotion} />

        <SocialProofSection prefersReducedMotion={prefersReducedMotion} />

        <FaqSection faqData={faqData} />

        <div
          className="mt-20 md:mt-24"
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
        </div>
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
