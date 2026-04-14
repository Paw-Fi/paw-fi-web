"use client";

import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Wallet,
  PieChart,
  Layers,
  Target,
  RefreshCw,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Info,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { cn } from "@/lib/utils";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { useState, useEffect, ReactNode, useRef } from "react";
import { getCurrencySymbolBasedOnTimeZone } from "@/utils/currency-symbols";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { BentoCard } from "@/components/ui/bento-card";

// SEO & Meta Imports
import { Helmet } from "@dr.pogodin/react-helmet";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { HomeHeader } from "@/components/index/header";

const META_TITLE = "Digital Envelope Budgeting App | The Moneko Pockets System";
const META_DESCRIPTION =
  "Master zero-based budgeting with Moneko Pockets. Our digital envelope system helps you allocate every dollar, track goals, and visualize your spending in real-time.";
const META_KEYWORDS =
  "envelope budgeting app, zero based budgeting system, digital envelope system, money allocation tool, visual budget tracker, financial goal setting app";

export function PocketsSystemRouteComponent() {
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl("/features/pockets-system");

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
            { "@type": "ListItem", position: 3, name: "Pockets System" },
          ],
        },
      },
      {
        "@type": "HowTo",
        name: "How to Use the Digital Envelope System",
        description:
          "Learn how to use Moneko Pockets for Zero-Based Budgeting.",
        step: [
          {
            "@type": "HowToStep",
            text: "Create pockets for different spending categories like Rent, Groceries, or Travel.",
          },
          {
            "@type": "HowToStep",
            text: "Allocate your monthly income into these pockets until every dollar has a job.",
          },
          {
            "@type": "HowToStep",
            text: "Track spending in real-time and adjust allocations if priorities change.",
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
                <Wallet className="h-3 w-3 fill-current" />
                Zero-Based Budgeting Methodology
              </span>
              <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 md:text-7xl dark:text-white">
                Master the Digital <br />
                <span className="text-gray-400 dark:text-gray-600">
                  Envelope System.
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
                Moneko Pockets bring the classic envelope budgeting method into
                the modern era. Experience a visual, high-engagement way to{" "}
                <strong>give every dollar a job</strong> and ensure you never
                overspend again.
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
          {/* Card 1: Visualize Assets (Wide) */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-200 bg-gray-50 md:col-span-2 md:flex-row dark:border-gray-800 dark:bg-gray-900">
            <div className="relative z-10 order-2 flex flex-1 flex-col justify-center p-8 md:order-1 md:p-12">
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Visual & Liquid.
              </h3>
              <p className="max-w-sm text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Pockets fill up like liquid containers. Watch them drain as you
                spend, giving you an intuitive sense of your financial health.
              </p>
            </div>
            <div className="relative order-1 flex min-h-[400px] flex-1 items-end justify-center bg-gradient-to-b from-transparent to-black/5 py-12 md:order-2 md:min-h-auto dark:to-white/5">
              <PocketsLiquidVisual />
            </div>
          </BentoCard>

          {/* Card 2: Flexible Allocations (Tall) */}
          <BentoCard className="relative flex flex-col overflow-hidden border border-gray-200 bg-white pt-8 dark:border-gray-800 dark:bg-black">
            <div className="z-10 w-full shrink-0 px-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Roll With Punches
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400">
                Overspent on groceries? Instantly move funds from 'Dining Out'
                with a single tap.
              </p>
            </div>
            <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden p-8">
              <FlexibleMovementVisual />
            </div>
          </BentoCard>

          {/* Card 3: Goal Tracking (Wide) */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-200 bg-slate-100 md:col-span-3 md:flex-row-reverse dark:border-gray-800 dark:bg-gray-800/50">
            <div className="relative z-10 flex flex-1 flex-col justify-center p-8 md:p-12">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm dark:bg-black dark:text-white">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Goal Sinking Funds.
              </h3>
              <p className="max-w-md text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Whether it's an emergency fund or a dream vacation, Pockets
                serve as dedicated sinking funds. Monitor progress and celebrate
                milestones.
              </p>
            </div>
            <div className="relative flex min-h-[300px] flex-1 items-center justify-center bg-gradient-to-t from-transparent to-white/50 p-8 dark:to-black/50">
              <GoalTrackingVisual />
            </div>
          </BentoCard>
        </section>

        {/* Methodology Section */}
        <section className="container mx-auto border-t border-slate-100 px-4 py-24 dark:border-slate-800">
          <div className="mx-auto max-w-3xl space-y-12">
            <div className="text-center">
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Why Zero-Based Budgeting?
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                The science behind why Pockets help you save 20% more on
                average.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-slate-700 dark:text-slate-300" />
                <div>
                  <h3 className="mb-1 font-bold text-slate-900 dark:text-white">
                    Ends Decision Fatigue
                  </h3>
                  <p className="text-sm text-slate-500">
                    Decide where your money goes at the start of the month, not
                    at the checkout counter.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-slate-700 dark:text-slate-300" />
                <div>
                  <h3 className="mb-1 font-bold text-slate-900 dark:text-white">
                    Identifies Leakage
                  </h3>
                  <p className="text-sm text-slate-500">
                    Uncover hidden subscription costs and impulsive spending
                    habits instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ready to organize your finances?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-slate-600 dark:text-slate-400">
            Try the Moneko Pockets method to organize your cash flow.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AppleDownloadButton />
            <AndroidDownloadButton />
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Security-focused
            </span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Instant Sync
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- Visual Components ---

const PocketsLiquidVisual = () => {
  const currencySymbol = getCurrencySymbolBasedOnTimeZone();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion) return;
    let raf = 0;
    const tick = () => {
      setPhase((p) => (p + 0.05) % (Math.PI * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);

  const buildWavePath = (
    amplitude: number,
    phaseOffset: number,
    baseline = 80,
  ) => {
    const W = 200;
    const H = 100;
    const L = W * 0.9;
    let d = `M 0 ${baseline}`;
    for (let x = 0; x <= W; x += 2) {
      const y =
        baseline +
        amplitude * Math.sin(((2 * Math.PI) / L) * x + phase + phaseOffset);
      d += ` L ${x} ${y}`;
    }
    d += ` V ${H} H 0 Z`;
    return d;
  };

  const pockets = [
    { name: "Rent", total: 1200, spent: 1200, color: "#ef4444" }, // red-500
    { name: "Food", total: 500, spent: 320, color: "#f97316" }, // orange-500
    { name: "Fun", total: 200, spent: 170, color: "#a855f7" }, // purple-500
  ];

  return (
    <div className="z-10 flex w-full max-w-[400px] items-end justify-center gap-4 sm:gap-6">
      {pockets.map((pocket, i) => {
        const percent = Math.min((pocket.spent / pocket.total) * 100, 100);
        const showWave = !prefersReducedMotion && percent > 5 && percent < 95;
        const amplitudeScale = Math.max(
          0.65,
          Math.min(1, percent / 100 + 0.25),
        );

        return (
          <div
            key={pocket.name}
            className="flex w-1/3 flex-col items-center gap-3"
          >
            <div className="relative aspect-[1/2] w-full overflow-hidden rounded-[1.5rem] border-2 border-slate-100 bg-white shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/20">
              <div className="absolute inset-0 flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${percent}%` }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.2,
                    type: "spring",
                    bounce: 0.2,
                  }}
                  className="relative w-full"
                  style={{
                    backgroundColor: pocket.color,
                    minHeight: percent > 0 ? "4px" : "0",
                  }}
                >
                  {showWave && (
                    <div
                      className="pointer-events-none absolute top-0 left-0 h-4 w-[200%] -translate-y-[98%] overflow-hidden"
                      style={{ transform: "translate3d(0, 0, 0)" }}
                    >
                      <div className="absolute inset-0 opacity-40">
                        <svg
                          viewBox="0 0 200 100"
                          preserveAspectRatio="none"
                          className="h-full w-full"
                        >
                          <path
                            d={buildWavePath(12 * amplitudeScale, 0, 80)}
                            fill={pocket.color}
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center p-2">
                <div className="text-xl font-bold text-white">
                  {Math.round(percent)}%
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {pocket.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currencySymbol}
                {pocket.spent} / {pocket.total}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const FlexibleMovementVisual = () => {
  return (
    <div className="relative z-10 flex w-full max-w-[320px] items-center gap-4">
      <div className="flex-1 scale-90 rounded-2xl border border-slate-200 bg-white p-4 opacity-60 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">
          <PieChart className="h-4 w-4" />
        </div>
        <div className="mb-2 h-2 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full w-[80%] bg-green-500" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-slate-400">
        <div className="rounded bg-green-100 px-2 py-1 font-mono text-xs text-green-600 dark:bg-green-900/30 dark:text-green-400">
          Moving $20
        </div>
        <Layers className="h-5 w-5 animate-pulse text-green-500" />
      </div>

      <div className="flex-1 scale-105 rounded-2xl border-2 border-orange-500 bg-white p-4 shadow-lg dark:border-orange-400 dark:bg-slate-900">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="mb-1 text-sm font-medium text-slate-800 dark:text-slate-200">
          Groceries
        </div>
        <div className="text-xs font-bold text-orange-500">+ $20.00</div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <motion.div
            initial={{ width: "90%" }}
            animate={{ width: "40%" }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="h-full bg-orange-500"
          />
        </div>
      </div>
    </div>
  );
};

const GoalTrackingVisual = () => {
  const currencySymbol = getCurrencySymbolBasedOnTimeZone();
  return (
    <div className="z-10 w-full max-w-[300px] space-y-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Dream Trip
            </div>
            <div className="text-xs text-slate-500">
              Goal: {currencySymbol}3,000
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
            75%
          </div>
        </div>
      </div>

      <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute inset-x-4 top-4 bottom-4 flex items-end gap-1">
          {[30, 45, 60, 75].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
              className="flex-1 rounded-t-sm bg-blue-500 opacity-90"
              style={{ opacity: 0.5 + i * 0.15 }}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between px-4 text-xs text-slate-400">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
      </div>
    </div>
  );
};
