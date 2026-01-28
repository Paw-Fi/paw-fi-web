"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Wallet, PieChart, Layers, Target, RefreshCw, ShieldCheck, Zap, CheckCircle2, Info } from "lucide-react";
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
const META_DESCRIPTION = "Master zero-based budgeting with Moneko Pockets. Our digital envelope system helps you allocate every dollar, track goals, and visualize your spending in real-time.";
const META_KEYWORDS = "envelope budgeting app, zero based budgeting system, digital envelope system, money allocation tool, visual budget tracker, financial goal setting app";

export const Route = createFileRoute("/features/pockets-system")({
  component: PocketsFeaturePage,
  head: () => {
    const pageUrl = getCanonicalUrl("/features/pockets-system");
    const meta = seo({
      title: META_TITLE,
      description: META_DESCRIPTION,
      keywords: META_KEYWORDS,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});

export default function PocketsFeaturePage() {
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl("/features/pockets-system");

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        "url": pageUrl,
        "name": META_TITLE,
        "description": META_DESCRIPTION,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://moneko.io" },
            { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://moneko.io/features" },
            { "@type": "ListItem", "position": 3, "name": "Pockets System" }
          ]
        }
      },
      {
        "@type": "HowTo",
        "name": "How to Use the Digital Envelope System",
        "description": "Learn how to use Moneko Pockets for Zero-Based Budgeting.",
        "step": [
          { "@type": "HowToStep", "text": "Create pockets for different spending categories like Rent, Groceries, or Travel." },
          { "@type": "HowToStep", "text": "Allocate your monthly income into these pockets until every dollar has a job." },
          { "@type": "HowToStep", "text": "Track spending in real-time and adjust allocations if priorities change." }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen relative bg-white dark:bg-[#050505] overflow-hidden font-sans selection:bg-gray-100 dark:selection:bg-gray-800">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Background Decor - Subtle Technical Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <HomeHeader />


      <main className="relative z-10 pt-32 px-4 md:px-6 max-w-[1200px] mx-auto">
        
        {/* Hero Section */}
        <section className="container px-4 md:px-6 mx-auto mb-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-sm font-medium mb-6">
                 <Wallet className="w-3 h-3 fill-current" />
                 Zero-Based Budgeting Methodology
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                Master the Digital <br />
                <span className="text-gray-400 dark:text-gray-600">Envelope System.</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Moneko Pockets bring the classic envelope budgeting method into the modern era. 
                Experience a visual, high-engagement way to <strong>give every dollar a job</strong> and 
                ensure you never overspend again.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </motion.div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[auto] md:auto-rows-[550px] mb-32">
            
            {/* Card 1: Visualize Assets (Wide) */}
            <BentoCard className="md:col-span-2 overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row">
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center z-10 relative order-2 md:order-1">
                   <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Visual & Liquid.</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-sm">
                       Pockets fill up like liquid containers. Watch them drain as you spend, giving you an intuitive sense of your financial health.
                   </p>
                </div>
                <div className="flex-1 relative min-h-[400px] md:min-h-auto flex items-end justify-center py-12 order-1 md:order-2 bg-gradient-to-b from-transparent to-black/5 dark:to-white/5">
                    <PocketsLiquidVisual />
                </div>
            </BentoCard>

            {/* Card 2: Flexible Allocations (Tall) */}
            <BentoCard className="relative overflow-hidden bg-white dark:bg-black border border-gray-200 dark:border-gray-800 flex flex-col pt-8">
                 <div className="px-8 w-full z-10 shrink-0">
                     <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 text-slate-600 dark:text-slate-400">
                         <RefreshCw className="w-5 h-5" />
                     </div>
                     <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">Roll With Punches</h3>
                     <p className="text-slate-500 dark:text-slate-400 text-base">
                        Overspent on groceries? Instantly move funds from 'Dining Out' with a single tap.
                     </p>
                 </div>
                 <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden p-8">
                    <FlexibleMovementVisual />
                 </div>
            </BentoCard>

             {/* Card 3: Goal Tracking (Wide) */}
             <BentoCard className="md:col-span-3 overflow-hidden bg-slate-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row-reverse">
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center z-10 relative">
                   <div className="w-10 h-10 bg-white dark:bg-black rounded-xl flex items-center justify-center mb-4 shadow-sm text-slate-900 dark:text-white">
                         <Target className="w-5 h-5" />
                   </div>
                   <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Goal Sinking Funds.</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-md">
                       Whether it's an emergency fund or a dream vacation, Pockets serve as dedicated sinking funds. Monitor progress and celebrate milestones.
                   </p>
                </div>
                <div className="flex-1 relative min-h-[300px] flex items-center justify-center p-8 bg-gradient-to-t from-transparent to-white/50 dark:to-black/50">
                    <GoalTrackingVisual />
                </div>
            </BentoCard>

        </section>

        {/* Methodology Section */}
        <section className="container px-4 py-24 mx-auto border-t border-slate-100 dark:border-slate-800">
           <div className="max-w-3xl mx-auto space-y-12">
              <div className="text-center">
                 <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Why Zero-Based Budgeting?</h2>
                 <p className="text-slate-600 dark:text-slate-400">The science behind why Pockets help you save 20% more on average.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                 <div className="flex gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <CheckCircle2 className="w-6 h-6 text-slate-700 dark:text-slate-300 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white mb-1">Ends Decision Fatigue</h3>
                       <p className="text-sm text-slate-500">Decide where your money goes at the start of the month, not at the checkout counter.</p>
                    </div>
                 </div>
                 <div className="flex gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <CheckCircle2 className="w-6 h-6 text-slate-700 dark:text-slate-300 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white mb-1">Identifies Leakage</h3>
                       <p className="text-sm text-slate-500">Uncover hidden subscription costs and impulsive spending habits instantly.</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

         {/* Bottom CTA */}
         <section className="container px-4 py-24 mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Ready to organize your finances?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">Join thousands of users who have mastered their cash flow using the Moneko Pockets method.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> SEC-Level Security</span>
                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Instant Sync</span>
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

  const buildWavePath = (amplitude: number, phaseOffset: number, baseline = 80) => {
    const W = 200; 
    const H = 100;
    const L = W * 0.9;
    let d = `M 0 ${baseline}`;
    for (let x = 0; x <= W; x += 2) {
      const y = baseline + amplitude * Math.sin(((2 * Math.PI) / L) * x + phase + phaseOffset);
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
    <div className="flex gap-4 sm:gap-6 items-end justify-center w-full z-10 max-w-[400px]">
        {pockets.map((pocket, i) => {
            const percent = Math.min((pocket.spent / pocket.total) * 100, 100);
            const showWave = !prefersReducedMotion && percent > 5 && percent < 95;
            const amplitudeScale = Math.max(0.65, Math.min(1, percent / 100 + 0.25));
            
            return (
                <div key={pocket.name} className="flex flex-col items-center gap-3 w-1/3">
                    <div className="relative w-full aspect-[1/2] rounded-[1.5rem] bg-white border-2 border-slate-100 dark:bg-black/20 dark:border-white/10 overflow-hidden shadow-sm ring-1 ring-black/5">
                        <div className="absolute inset-0 flex items-end">
                            <motion.div 
                                initial={{ height: 0 }}
                                whileInView={{ height: `${percent}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5, delay: i * 0.2, type: "spring", bounce: 0.2 }}
                                className="w-full relative"
                                style={{ backgroundColor: pocket.color, minHeight: percent > 0 ? '4px' : '0' }}
                            >
                                {showWave && (
                                    <div className="absolute top-0 -translate-y-[98%] left-0 w-[200%] h-4 overflow-hidden pointer-events-none" style={{ transform: 'translate3d(0, 0, 0)' }}>
                                        <div className="absolute inset-0 opacity-40">
                                            <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full">
                                                <path d={buildWavePath(12 * amplitudeScale, 0, 80)} fill={pocket.color} />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10 pointer-events-none">
                             <div className="text-xl font-bold text-white">{Math.round(percent)}%</div>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{pocket.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{currencySymbol}{pocket.spent} / {pocket.total}</p>
                    </div>
                </div>
            )
        })}
    </div>
  );
};

const FlexibleMovementVisual = () => {
    return (
        <div className="flex items-center gap-4 w-full max-w-[320px] relative z-10">
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm opacity-60 scale-90">
                 <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mb-2">
                    <PieChart className="w-4 h-4" />
                 </div>
                 <div className="h-2 w-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-2" />
                 <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-[80%] bg-green-500" />
                 </div>
            </div>

            <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="text-xs font-mono bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-green-600 dark:text-green-400">
                    Moving $20
                </div>
                <Layers className="w-5 h-5 animate-pulse text-green-500" />
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-orange-500 dark:border-orange-400 shadow-lg scale-105">
                 <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 mb-2">
                    <Wallet className="w-4 h-4" />
                 </div>
                 <div className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">Groceries</div>
                 <div className="text-xs text-orange-500 font-bold">+ $20.00</div>
                 <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                    <motion.div 
                        initial={{ width: "90%" }}
                        animate={{ width: "40%" }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                        className="h-full bg-orange-500" 
                    />
                 </div>
            </div>
        </div>
    )
}

const GoalTrackingVisual = () => {
     const currencySymbol = getCurrencySymbolBasedOnTimeZone();
     return (
         <div className="w-full max-w-[300px] space-y-4 z-10">
             <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                     <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Target className="w-4 h-4" />
                     </div>
                     <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Dream Trip</div>
                        <div className="text-xs text-slate-500">Goal: {currencySymbol}3,000</div>
                     </div>
                 </div>
                 <div className="text-right">
                    <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-lg">75%</div>
                 </div>
             </div>

             <div className="h-32 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden relative">
                 <div className="absolute inset-x-4 bottom-4 top-4 flex gap-1 items-end">
                     {[30, 45, 60, 75].map((h, i) => (
                         <motion.div 
                            key={i}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: i * 0.2 }}
                            className="flex-1 bg-blue-500 rounded-t-sm opacity-90"
                            style={{ opacity: 0.5 + (i * 0.15)}}
                         />
                     ))}
                 </div>
             </div>
             <div className="flex justify-between text-xs text-slate-400 px-4">
                 <span>Jan</span>
                 <span>Feb</span>
                 <span>Mar</span>
                 <span>Apr</span>
             </div>
         </div>
     )
}