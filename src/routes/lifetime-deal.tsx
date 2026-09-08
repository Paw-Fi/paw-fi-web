"use client";

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  Globe2,
  Infinity,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import {
  monekoAggregateRating,
  monekoAvailableLanguages,
  monekoFeaturedReview,
} from "@/utils/app-schema";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { MobileAppPreviewCarousel } from "@/components/shared/mobile-app-preview-carousel";
import { UserCommunityShowcase } from "@/components/homepage/user-community-showcase";
import { CompareWithChatGptButton } from "@/components/homepage/compare-with-chatgpt-button";
import { FaqSection } from "@/components/ui/faq-section";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { useInView } from "react-intersection-observer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_REGIONAL_PRICING_COUNTRY,
  detectRegionalPricingCountry,
  getRegionalCountryOptions,
  getRegionalPriceLabels,
  saveRegionalPricingCountry,
} from "@/lib/regional-pricing";
import { useAuth } from "@/contexts/auth-context";
import { useEndOfMonthCountdown } from "@/components/pricing/countdown-timer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lifetime-deal")({
  component: LifetimeDealPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/lifetime-deal");
    const title =
      "Moneko Lifetime Deal | 30% Off Limited-Time Lifetime Access";
    const description =
      "Unlock Moneko Plus for a single one-time payment. Get unlimited AI expense capture, household budgets, scenario planning, multi-currency tools, and bank sync forever without subscriptions.";
    const keywords =
      "moneko lifetime deal, budgeting app lifetime access, one time payment budgeting app, personal finance app lifetime deal, no subscription expense tracker, AI envelope budgeting lifetime";

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          "@id": `${pageUrl}#product`,
          name: "Moneko Plus Lifetime Access",
          description,
          image: "https://moneko.io/og-img.png",
          brand: {
            "@type": "Brand",
            name: "Moneko",
          },
          category: "FinanceApplication",
          operatingSystem: "iOS, Android, Web",
          availableLanguage: monekoAvailableLanguages,
          aggregateRating: monekoAggregateRating,
          review: monekoFeaturedReview,
          offers: {
            "@type": "Offer",
            url: pageUrl,
            priceCurrency: "USD",
            price: "99.99",
            priceValidUntil: new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              0,
            )
              .toISOString()
              .split("T")[0],
            availability: "https://schema.org/InStock",
            category: "Digital Good",
            itemCondition: "https://schema.org/NewCondition",
          },
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: title,
          description,
          isPartOf: { "@id": "https://moneko.io/#website" },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://moneko.io",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Lifetime Deal",
                item: pageUrl,
              },
            ],
          },
        },
        {
          "@type": "FAQPage",
          "@id": `${pageUrl}#faq`,
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        },
      ],
    };

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

const lifetimeFeatures = [
  {
    title: "WhatsApp & Telegram Capture",
    description:
      "Log expenses directly inside WhatsApp or Telegram. Forward receipt photos or voice notes—Moneko parses amounts and categorizes automatically.",
    icon: MessageSquare,
    badge: "LIFETIME",
  },
  {
    title: "Zero-Based Pocket Envelopes",
    description:
      "Give every dollar a clear job before you spend it. Create unlimited custom pockets for bills, dining, travel, and investments with auto-rollover.",
    icon: Wallet,
    badge: "UNLIMITED",
  },
  {
    title: "Shared Household Spaces",
    description:
      "Manage joint expenses and split bills with your partner without giving up private solo accounts. Invite household members on one license.",
    icon: Users,
    badge: "HOUSEHOLD",
  },
  {
    title: "AI Scenarios & Forecasting",
    description:
      "Simulate what-if financial choices before spending. See real-time cash flow projections based on your recurring income and obligations.",
    icon: TrendingUp,
    badge: "AI PREDICTIVE",
  },
  {
    title: "Multi-Currency & Live Forex",
    description:
      "Earn, spend, and save across 40+ native currencies. Live exchange rates reconcile global wallets into a seamless aggregate net worth.",
    icon: Globe2,
    badge: "GLOBAL",
  },
  {
    title: "Plaid Bank Sync & Receipt Sync",
    description:
      "Connect 12,000+ US & Canadian financial institutions for effortless sync, or forward PDF/email receipts to auto-match transactions.",
    icon: Zap,
    badge: "AUTOMATED",
  },
];

const includedChecklist = [
  "Unlimited AI expense capture (Text, Receipt Photo, Voice Note)",
  "WhatsApp & Telegram instant messaging capture integration",
  "Unlimited Pocket creation for zero-based envelope budgeting",
  "Household Mode & multi-member shared budgeting spaces",
  "One license shared across all your household members",
  "Automated recurring bills, salaries, and subscription tracking",
  "Scenario Planning engine with predictive what-if AI insights",
  "Live exchange rates & 40+ supported global currencies",
  "Native multi-currency balances with aggregate conversion",
  "Plaid Bank Sync for US & Canada financial institutions",
  "Email receipt auto-forwarding and parsing",
  "Financial health score reports with personalized action steps",
  "Biometric App Lock for complete privacy on mobile",
  "Priority VIP support from the core engineering team",
  "All future Moneko Plus features & major upgrades included",
];

const faqItems = [
  {
    question: "What exactly is included in the Moneko Lifetime Plan?",
    answer:
      "You receive permanent, full access to all Moneko Plus capabilities: unlimited text/receipt/voice capture, WhatsApp & Telegram logging, personal and shared household Spaces, multi-currency support with real-time conversion rates, Plaid bank sync (US & Canada), AI scenario forecasting, and priority support. You also receive all future feature upgrades to Plus at no extra cost.",
  },
  {
    question: "Are there any hidden renewal fees or recurring charges?",
    answer:
      "None. This is a true single one-time payment. Once purchased, your account is permanently unlocked as a Lifetime member. You will never be billed a monthly or annual subscription fee.",
  },
  {
    question: "Can I share my Lifetime plan with my household or partner?",
    answer:
      "Yes. Moneko includes Household Spaces. A single Lifetime subscription allows you to create shared spaces and invite your partner, spouse, or roommates to collaborate without requiring them to purchase separate subscriptions.",
  },
  {
    question: "How does the 30-day money-back guarantee work?",
    answer:
      "If Moneko does not save you time and transform how you manage money, simply email hello@moneko.io within 30 days of your purchase for a full refund processed directly via Stripe. Zero questions asked.",
  },
  {
    question: "What happens when this promotional window ends?",
    answer:
      "This 30% discount is limited to the end of the current month. After the timer elapses, the pricing resets to the standard lifetime rate or will be closed to new entrants to preserve server and AI capacity.",
  },
  {
    question: "What if I already have an active monthly or yearly subscription?",
    answer:
      "If you are currently on a monthly or annual plan, purchasing Lifetime will immediately transition your account to permanent status. Contact support after checkout and we will cancel your existing recurring billing immediately.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

function LifetimeDealPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const timeLeft = useEndOfMonthCountdown();
  const [pricingCountry, setPricingCountry] = useState(
    DEFAULT_REGIONAL_PRICING_COUNTRY,
  );

  const { ref: heroRef, inView: heroInView } = useInView({
    threshold: 0,
    rootMargin: "-100px 0px 0px 0px",
    initialInView: true,
  });

  useEffect(() => {
    setPricingCountry(detectRegionalPricingCountry());
  }, []);

  const regionalPrices = useMemo(
    () => getRegionalPriceLabels(pricingCountry),
    [pricingCountry],
  );

  const countryOptions = useMemo(
    () =>
      getRegionalCountryOptions(
        typeof navigator === "undefined" ? "en" : navigator.language,
      ),
    [],
  );

  const handleCheckout = () => {
    if (user) {
      navigate({
        to: "/checkout",
        search: { plan: "lifetime" },
      });
    } else {
      navigate({
        to: "/register",
        search: { redirect: "/checkout?plan=lifetime" },
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white selection:bg-amber-500/20 selection:text-amber-600 dark:bg-gray-900">
      {/* Background Beams with Collision */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen" />

      {/* Dotted grid pattern overlay */}
      <DotPattern
        className={cn(
          "pointer-events-none fixed inset-0 z-[1] opacity-30 dark:opacity-15",
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]",
        )}
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl dark:border-slate-700/50 dark:bg-gray-900/70">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <MonekoIcon />
            <motion.button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 transition-all duration-200 hover:bg-slate-100/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ x: -2 }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section ref={heroRef} className="px-6 py-24 pt-32 sm:pt-36">
          <motion.div
            className="mx-auto max-w-4xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center">
              {/* Urgency & Geo Bar */}
              <motion.div
                className="mb-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400"
                variants={itemVariants}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-amber-700 dark:text-amber-300">
                  <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span>
                    Limited-Time {timeLeft.monthName} Offer · Save 30% One-Time Deal
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <Globe2 className="h-3.5 w-3.5 shrink-0" />
                  <label htmlFor="geo-select" className="sr-only">
                    Select Region
                  </label>
                  <select
                    id="geo-select"
                    value={pricingCountry}
                    onChange={(e) => {
                      const next = saveRegionalPricingCountry(e.target.value);
                      setPricingCountry(next);
                    }}
                    className="cursor-pointer bg-transparent font-medium text-slate-800 underline decoration-slate-300 underline-offset-4 outline-none hover:text-slate-950 dark:text-slate-200 dark:decoration-slate-600 dark:hover:text-white"
                  >
                    {countryOptions.map((country) => (
                      <option
                        key={country.code}
                        value={country.code}
                        className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {country.name} ({regionalPrices.market.currencyCode})
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>

              <motion.div className="mb-6" variants={itemVariants}>
                <h1 className="text-5xl leading-tight font-bold tracking-tight text-slate-800 sm:text-6xl lg:text-7xl dark:text-slate-200">
                  Own Your Financial System
                  <br />
                  <span className="text-slate-500 font-normal dark:text-slate-400">
                    Never Pay Subscriptions Again
                  </span>
                </h1>
              </motion.div>

              <motion.p
                className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-400"
                variants={itemVariants}
              >
                Most budgeting apps charge $120/year to lock your bank connections and expense history behind a recurring tax. Moneko gives you zero-based envelope budgeting, instant chat capture, and predictive AI scenarios for a single payment.
              </motion.p>

              {/* Price Presentation Card */}
              <motion.div
                className="mx-auto max-w-xl rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-md sm:p-8 dark:border-slate-700/80 dark:bg-slate-800/80"
                variants={itemVariants}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
                  <div className="text-left">
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight dark:text-white">
                        {regionalPrices.lifetime}
                      </span>
                      {regionalPrices.lifetimeOriginal && (
                        <span className="text-xl text-slate-400 line-through font-medium dark:text-slate-500">
                          {regionalPrices.lifetimeOriginal}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      One payment · Lifetime ownership
                    </p>
                  </div>

                  {/* Countdown display */}
                  <div className="flex items-center gap-1.5 text-center">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 min-w-10 dark:border-slate-700 dark:bg-slate-900/60">
                      <span className="block font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {String(timeLeft.days).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] uppercase text-slate-500 font-medium dark:text-slate-400">
                        Days
                      </span>
                    </div>
                    <span className="font-bold text-slate-400">:</span>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 min-w-10 dark:border-slate-700 dark:bg-slate-900/60">
                      <span className="block font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {String(timeLeft.hours).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] uppercase text-slate-500 font-medium dark:text-slate-400">
                        Hrs
                      </span>
                    </div>
                    <span className="font-bold text-slate-400">:</span>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 min-w-10 dark:border-slate-700 dark:bg-slate-900/60">
                      <span className="block font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] uppercase text-slate-500 font-medium dark:text-slate-400">
                        Min
                      </span>
                    </div>
                    <span className="font-bold text-slate-400">:</span>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 min-w-10 dark:border-slate-700 dark:bg-slate-900/60">
                      <span className="block font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] uppercase text-slate-500 font-medium dark:text-slate-400">
                        Sec
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-700/80">
                  <Button
                    size="lg"
                    onClick={handleCheckout}
                    className="w-full h-14 bg-slate-900 text-white hover:bg-slate-800 font-bold text-base rounded-2xl shadow-lg transition-all active:scale-[0.98] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    <span>Claim Lifetime Access</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    30-day money-back guarantee
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Infinity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    All future Plus updates included
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Processed securely with Stripe
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* App Showcase Carousel */}
        <MobileAppPreviewCarousel
          className="px-6"
          title="Everything in Moneko Plus, unlocked forever"
          description="Add expenses by chat, follow your spending in real time, and get a crystal-clear view of where your money goes—without recurring subscription anxiety."
        />

        {/* Features Section */}
        <section className="px-6 py-20">
          <motion.div
            className="mx-auto max-w-6xl"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <div className="text-center mb-16">
              <Badge
                variant="outline"
                className="mb-3 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold uppercase text-xs"
              >
                Zero Bloat · Pure Utility
              </Badge>
              <motion.h2
                className="text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl dark:text-slate-200"
                variants={itemVariants}
              >
                Built for Lifetime Financial Freedom
              </motion.h2>
              <motion.p
                className="mt-4 text-base text-slate-600 max-w-2xl mx-auto dark:text-slate-400"
                variants={itemVariants}
              >
                Every feature in Moneko Plus is engineered to eliminate friction between making a transaction and keeping your budget accurate.
              </motion.p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {lifetimeFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-8 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:border-slate-600"
                    variants={itemVariants}
                    whileHover={{ y: -2 }}
                  >
                    <div>
                      <div className="mb-6 flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
                          <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase dark:bg-slate-200 dark:text-slate-800">
                          {feature.badge}
                        </div>
                      </div>
                      <h3 className="mb-3 text-xl font-semibold text-slate-800 dark:text-slate-200">
                        {feature.title}
                      </h3>
                      <p className="leading-relaxed text-sm text-slate-600 dark:text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* User Community Showcase - Real App Store Ratings & Reviews */}
        <section className="py-12">
          <UserCommunityShowcase />
        </section>

        {/* Subscription Math / Comparison Section */}
        <section className="px-6 py-20">
          <motion.div
            className="mx-auto max-w-5xl"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                The Math Behind Lifetime
              </span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800 sm:text-4xl dark:text-slate-200">
                Stop paying annual rent on your financial tools
              </h2>
              <p className="mt-3 text-base text-slate-600 max-w-2xl mx-auto dark:text-slate-400">
                Mainstream budgeting apps charge $10 to $15 every month. Over 5 years, you spend hundreds of dollars just to keep tracking your own money.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm overflow-x-auto dark:border-slate-700/80 dark:bg-slate-800/80">
              <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold">Time Horizon</th>
                    <th className="py-3 px-4 font-semibold">Typical SaaS App ($12/mo)</th>
                    <th className="py-3 px-4 font-semibold">YNAB / Copilot ($100-$120/yr)</th>
                    <th className="py-3 px-4 font-bold text-slate-900 bg-slate-100/60 rounded-t-lg dark:text-white dark:bg-slate-700/60">
                      Moneko Lifetime
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  <tr>
                    <td className="py-4 px-4 font-medium text-slate-900 dark:text-white">Year 1</td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400">$144.00</td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400">$109.99</td>
                    <td className="py-4 px-4 font-bold text-slate-900 bg-slate-100/40 dark:text-white dark:bg-slate-700/40">
                      {regionalPrices.lifetime} (Paid once)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-medium text-slate-900 dark:text-white">Year 3</td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400">$432.00</td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400">$329.97</td>
                    <td className="py-4 px-4 font-bold text-emerald-600 bg-slate-100/40 dark:text-emerald-400 dark:bg-slate-700/40">
                      $0 (Saved $230+)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-medium text-slate-900 dark:text-white">Year 5</td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400">$720.00</td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400">$549.95</td>
                    <td className="py-4 px-4 font-bold text-emerald-600 bg-slate-100/40 dark:text-emerald-400 dark:bg-slate-700/40">
                      $0 (Saved $450+)
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30 font-medium">
                    <td className="py-4 px-4 text-slate-900 font-semibold dark:text-white">
                      Cancel Consequences
                    </td>
                    <td className="py-4 px-4 text-rose-600 text-xs dark:text-rose-400">
                      Lose access & history
                    </td>
                    <td className="py-4 px-4 text-rose-600 text-xs dark:text-rose-400">
                      Locked out of bank sync
                    </td>
                    <td className="py-4 px-4 text-emerald-600 text-xs bg-slate-100/60 font-semibold rounded-b-lg dark:text-emerald-400 dark:bg-slate-700/60">
                      Permanent full access forever
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-center">
              <CompareWithChatGptButton
                source="compare-pricings-with-chatgpt"
                topic="pricing"
                label="Compare Pricings with ChatGPT"
                className="border-slate-300/80 bg-white hover:bg-slate-50 text-slate-900 rounded-full shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
              />
            </div>
          </motion.div>
        </section>

        {/* Feature Entitlement Checklist */}
        <section className="px-6 py-12">
          <motion.div
            className="mx-auto max-w-5xl rounded-3xl border border-slate-200/80 bg-white/60 p-8 sm:p-12 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/60"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <div className="mb-8">
              <Badge
                variant="outline"
                className="mb-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold uppercase text-[11px]"
              >
                Complete Access
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Everything included in your Lifetime Deal
              </h2>
              <p className="text-slate-600 text-sm mt-1 dark:text-slate-400">
                Full feature entitlement permanently tied to your Moneko account.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {includedChecklist.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-5 w-5 shrink-0 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* FAQ Section */}
        <div id="faq" className="px-6">
          <FaqSection
            faqData={faqItems}
            title="Frequently Asked Questions"
          />
        </div>

        {/* Final High-Impact CTA Section */}
        <section className="px-6 py-20">
          <motion.div
            className="mx-auto max-w-4xl rounded-3xl border-2 border-slate-200/80 bg-white/90 p-8 text-center shadow-xl sm:p-14 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-800/90"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <Badge
              variant="outline"
              className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold uppercase text-xs"
            >
              Limited Window · Ends {timeLeft.monthName}
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight max-w-2xl mx-auto mb-4 dark:text-white">
              Take back control of your finances today.
            </h2>
            <p className="text-slate-600 text-base max-w-xl mx-auto mb-8 dark:text-slate-400">
              Get lifetime access to Moneko Plus for {regionalPrices.lifetime} (regularly {regionalPrices.lifetimeOriginal}). One payment, zero subscriptions.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <Button
                size="lg"
                onClick={handleCheckout}
                className="w-full h-14 bg-slate-900 text-white hover:bg-slate-800 font-bold text-base rounded-2xl shadow-lg transition-transform active:scale-[0.98] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <span>Get Lifetime Access Now</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                30-Day Money-Back Guarantee
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Save 30% Off
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Secure Stripe Checkout
              </span>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Floating Bottom Compare with ChatGPT Button on Scroll */}
      {!heroInView && (
        <div className="animate-in fade-in slide-in-from-bottom-5 zoom-in-95 fixed right-0 bottom-6 left-0 z-50 mx-auto flex w-full max-w-[90%] justify-center duration-300 sm:bottom-10 sm:max-w-max">
          <CompareWithChatGptButton
            source="compare-pricings-with-chatgpt"
            topic="pricing"
            label="Compare Pricings with ChatGPT"
            labelClassName="truncate"
            className="border-primary/20 bg-background/80 hover:bg-background/95 text-foreground group w-full rounded-full shadow-[0_8px_30px_rgba(var(--primary),0.2)] backdrop-blur-md transition-all duration-300 sm:w-auto"
          />
        </div>
      )}
    </div>
  );
}
