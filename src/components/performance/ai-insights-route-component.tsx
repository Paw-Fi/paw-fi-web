"use client";

import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BrainCircuit,
  Search,
  Sparkles,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Zap,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { cn } from "@/lib/utils";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { ReactNode, useState, useEffect } from "react";
import { getCurrencySymbolBasedOnTimeZone } from "@/utils/currency-symbols";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import monekoAnimate from "@/assets/images/logo/moneko-avatar.gif";
import { BentoCard } from "@/components/ui/bento-card";

// SEO & Meta Imports
import { Helmet } from "@dr.pogodin/react-helmet";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { HomeHeader } from "@/components/index/header";

const META_TITLE =
  "AI Financial Assistant & Expense Forecasting | Moneko Insights";
const META_DESCRIPTION =
  "Get instant answers to your financial questions. Use Moneko's AI assistant for scenario simulations, expense forecasting, and real-time smart alerts to master your money.";
const META_KEYWORDS =
  "AI financial assistant, personal finance AI, expense forecasting tool, AI budget insights, smart financial alerts, financial scenario planning, automated spending analysis";

export function AIInsightsRouteComponent() {
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl("/features/ai-insights");

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: META_TITLE,
        description: META_DESCRIPTION,
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
              name: "Features",
              item: "https://moneko.io/features",
            },
            { "@type": "ListItem", position: 3, name: "AI Insights" },
          ],
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Moneko AI Intelligence Engine",
        applicationCategory: "FinanceApplication",
        operatingSystem: "iOS, Android, Web",
        description:
          "An AI-powered financial clarity engine that provides natural language insights and predictive forecasting for personal finance.",
        softwareHelp: {
          "@type": "CreativeWork",
          url: "https://moneko.io/docs/ai-assistant",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How does the AI analyze my spending?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Moneko uses proprietary machine learning models to categorize transactions and identify patterns, allowing you to ask natural language questions about your budget.",
            },
          },
          {
            "@type": "Question",
            name: "Is my financial data safe with the AI?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Your data is encrypted using AES-256 and is never sold to third parties. The AI operates on anonymized data sets for your security.",
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white font-sans selection:bg-gray-100 dark:bg-[#050505] dark:selection:bg-gray-800">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Background Decor - Subtle Technical Grid */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:40px_40px]" />
      </div>

      <HomeHeader />

      <main className="relative z-10 mx-auto max-w-[1200px] px-4 pt-32 md:px-6">
        {/* Hero Section */}
        <section className="container mx-auto mb-32 px-4 md:px-6">
          <div className="mx-auto max-w-4xl space-y-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <BrainCircuit className="h-3 w-3 text-slate-500" />
                Predictive Financial Clarity
              </span>
              <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 md:text-7xl dark:text-white">
                Turn Data into <br />
                <span className="text-gray-400 dark:text-gray-600">
                  Conversational Insights.
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
                Stop deciphering complex spreadsheets. Moneko's{" "}
                <strong>AI Financial Assistant</strong> translates your spending
                patterns into plain English advice. Run scenarios, simulate
                major life purchases, and get data-backed answers in seconds.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </motion.div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section className="mb-32 grid auto-rows-[auto] grid-cols-1 gap-6 md:auto-rows-[550px] md:grid-cols-3">
          {/* Card 1: Conversational Budget Analysis (Wide) */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-200 bg-gray-50 md:col-span-2 md:flex-row dark:border-gray-800 dark:bg-gray-900">
            <div className="relative z-10 order-2 flex flex-1 flex-col justify-center p-8 md:order-1 md:p-12">
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Conversational Analysis.
              </h3>
              <p className="max-w-sm text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Ask Moneko "How much have I spent on coffee this quarter?" or
                "Where did my money go?" to receive instant visualizations.
              </p>
            </div>
            <div className="relative order-1 flex min-h-[400px] flex-1 items-center justify-center bg-gradient-to-b from-transparent to-black/5 p-8 md:order-2 md:min-h-auto dark:to-white/5">
              <AskAnythingVisual />
            </div>
          </BentoCard>

          {/* Card 2: Scenario Planning (Tall) */}
          <BentoCard className="relative flex flex-col overflow-hidden border border-gray-200 bg-white pt-8 dark:border-gray-800 dark:bg-black">
            <div className="z-10 w-full shrink-0 px-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Future Simulator
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400">
                Simulate the impact of new car payments or savings rates on your
                net worth.
              </p>
            </div>
            <div className="relative mt-4 flex w-full flex-1 items-end overflow-hidden">
              <ScenarioSimulationVisual />
            </div>
          </BentoCard>

          {/* Card 3: Smart Alerts (Wide) */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-200 bg-slate-100 md:col-span-3 md:flex-row-reverse dark:border-gray-800 dark:bg-gray-800/50">
            <div className="relative z-10 flex flex-1 flex-col justify-center p-8 md:p-12">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm dark:bg-black dark:text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                24/7 Watchdog.
              </h3>
              <p className="max-w-md text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Moneko uses anomaly detection to alert you to subscription
                hikes, spending spikes, and potential fraud before they drain
                your wallet.
              </p>
            </div>
            <div className="relative flex min-h-[300px] flex-1 items-center justify-center bg-gradient-to-t from-transparent to-white/50 p-8 dark:to-black/50">
              <SmartAlertsVisual />
            </div>
          </BentoCard>
        </section>

        {/* Methodology Section */}
        <section className="container mx-auto border-t border-slate-100 px-4 py-24 dark:border-slate-800">
          <div className="mx-auto max-w-3xl space-y-12">
            <div className="text-center">
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                How Moneko AI Works
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Advanced machine learning designed for personal financial
                sovereignty.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <BarChart3 className="h-6 w-6 shrink-0 text-slate-700 dark:text-slate-300" />
                <div>
                  <h3 className="mb-1 font-bold text-slate-900 dark:text-white">
                    Trend Extraction
                  </h3>
                  <p className="text-sm text-slate-500">
                    Moneko identifies cyclical spending habits to predict future
                    cash flow shortages before they happen.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <MessageSquare className="h-6 w-6 shrink-0 text-slate-700 dark:text-slate-300" />
                <div>
                  <h3 className="mb-1 font-bold text-slate-900 dark:text-white">
                    NLP Intelligence
                  </h3>
                  <p className="text-sm text-slate-500">
                    Natural Language Processing allows for human-like
                    interaction with your financial data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ready for total financial clarity?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-slate-600 dark:text-slate-400">
            Harness the power of AI to stop tracking the past and start planning
            your future.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AppleDownloadButton />
            <AndroidDownloadButton />
          </div>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Explore more:{" "}
            <a
              href="/ai-budgeting-app"
              className="text-primary underline underline-offset-4"
            >
              AI budgeting app
            </a>{" "}
            or{" "}
            <a
              href="/best-budgeting-app"
              className="text-primary underline underline-offset-4"
            >
              best budgeting app
            </a>
            .
          </p>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> AES-256 Encryption
            </span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Real-Time Analysis
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- Visual Components (Preserved & Adjusted for Bento) ---

const AskAnythingVisual = () => {
  const currencySymbol = getCurrencySymbolBasedOnTimeZone();
  return (
    <div className="flex w-full max-w-[380px] scale-[0.9] flex-col gap-6 md:scale-100">
      <div className="relative z-20 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl shadow-gray-200/50 dark:border-gray-800 dark:bg-black dark:shadow-none">
        <div className="rounded-full bg-slate-100 p-2 text-slate-600 dark:bg-gray-800 dark:text-slate-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="relative h-6 flex-1 overflow-hidden">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            Can I afford a trip to Japan?
          </motion.div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-black">
          <Search className="h-4 w-4" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="relative z-10 rounded-r-xl border-l-4 border-slate-900 bg-white p-5 shadow-xl shadow-gray-200/50 dark:border-white dark:bg-black dark:shadow-none"
      >
        <div className="flex gap-4">
          <img
            src={monekoAnimate}
            className="h-10 w-10 rounded-full border border-gray-100 dark:border-gray-800"
            alt="Moneko AI Assistant"
          />
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">
                Yes! 🇯🇵
              </span>{" "}
              you can comfortably afford it.
            </p>
            <div className="rounded-lg bg-gray-50 p-2 text-xs text-slate-500 dark:bg-gray-900 dark:text-slate-400">
              Based on your {currencySymbol}400/mo surplus, you'll reach your{" "}
              {currencySymbol}3,500 goal by{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                November 15th
              </span>
              .
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ScenarioSimulationVisual = () => {
  return (
    <div className="relative flex h-full w-full flex-col justify-end p-6">
      <div className="relative h-40 w-full">
        {/* Chart Grid */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-30 dark:opacity-20">
          <div className="h-px w-full border-t border-dashed border-slate-300 bg-slate-300" />
          <div className="h-px w-full border-t border-dashed border-slate-300 bg-slate-300" />
          <div className="h-px w-full border-t border-dashed border-slate-300 bg-slate-300" />
        </div>

        <svg className="absolute inset-0 h-full w-full overflow-visible">
          <path
            d="M0 130 C 50 125, 100 120, 150 110 C 200 100, 250 95, 300 90"
            fill="none"
            stroke="rgb(203 213 225)"
            className="dark:stroke-slate-700"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          <motion.path
            d="M150 110 C 200 80, 250 40, 320 10"
            fill="none"
            stroke="rgb(15 23 42)"
            className="dark:stroke-white"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
        </svg>

        <div className="absolute top-[110px] left-[45%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-400 dark:border-black" />

        <motion.div
          className="absolute top-[10px] right-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 2 }}
        >
          +25% Growth
        </motion.div>
      </div>

      <div className="mt-4 flex justify-between text-[10px] tracking-wider text-slate-400 uppercase">
        <span>Today</span>
        <span>Next Year</span>
      </div>
    </div>
  );
};

const SmartAlertsVisual = () => {
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-3">
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex scale-95 gap-3 rounded-xl border border-gray-100 bg-white p-3 opacity-50 shadow-sm blur-[1px] dark:border-gray-800 dark:bg-black"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-900">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-2 py-1">
          <div className="h-1.5 w-16 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-1.5 w-32 rounded bg-slate-100 dark:bg-slate-800/50" />
        </div>
      </motion.div>

      <motion.div
        initial={{ x: -20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-10 flex gap-4 rounded-xl border-y border-r border-l-4 border-gray-200 border-l-slate-900 bg-white p-4 shadow-xl dark:border-gray-800 dark:border-l-white dark:bg-black"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
            Subscription Hike
          </div>
          <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">
            Your{" "}
            <span className="font-medium text-slate-900 dark:text-white">
              Adobe Creative Cloud
            </span>{" "}
            bill increased by $3.00 this month.
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ x: -20, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex scale-90 gap-3 rounded-xl border border-gray-100 bg-white p-3 opacity-40 shadow-sm blur-[2px] dark:border-gray-800 dark:bg-black"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-900">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-2 py-1">
          <div className="h-1.5 w-12 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-1.5 w-24 rounded bg-slate-100 dark:bg-slate-800/50" />
        </div>
      </motion.div>
    </div>
  );
};
