"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BrainCircuit, Search, Sparkles, TrendingUp, Calendar, AlertTriangle, ShieldCheck, Zap, BarChart3, MessageSquare } from "lucide-react";
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

const META_TITLE = "AI Financial Assistant & Expense Forecasting | Moneko Insights";
const META_DESCRIPTION = "Get instant answers to your financial questions. Use Moneko's AI assistant for scenario simulations, expense forecasting, and real-time smart alerts to master your money.";
const META_KEYWORDS = "AI financial assistant, personal finance AI, expense forecasting tool, AI budget insights, smart financial alerts, financial scenario planning, automated spending analysis";

export const Route = createFileRoute("/features/ai-insights")({
  component: AIInsightsFeaturePage,
  head: () => {
    const pageUrl = getCanonicalUrl("/features/ai-insights");
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

export default function AIInsightsFeaturePage() {
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl("/features/ai-insights");

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
            { "@type": "ListItem", "position": 3, "name": "AI Insights" }
          ]
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "Moneko AI Intelligence Engine",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "iOS, Android, Web",
        "description": "An AI-powered financial clarity engine that provides natural language insights and predictive forecasting for personal finance.",
        "softwareHelp": {
          "@type": "CreativeWork",
          "url": "https://moneko.io/docs/ai-assistant"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does the AI analyze my spending?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Moneko uses proprietary machine learning models to categorize transactions and identify patterns, allowing you to ask natural language questions about your budget."
            }
          },
          {
            "@type": "Question",
            "name": "Is my financial data safe with the AI?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Your data is encrypted using AES-256 and is never sold to third parties. The AI operates on anonymized data sets for your security."
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen relative bg-white dark:bg-[#050505] overflow-hidden font-sans selection:bg-gray-100 dark:selection:bg-gray-800">
      <Helmet>
        <title>{META_TITLE}</title>
        <meta name="description" content={META_DESCRIPTION} />
        <meta name="keywords" content={META_KEYWORDS} />
        <meta property="og:title" content={META_TITLE} />
        <meta property="og:description" content={META_DESCRIPTION} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://moneko.io/og-ai-insights.png" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Background Decor - Subtle Technical Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <MonekoIcon />
            <motion.button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              whileHover={{ x: -2 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </motion.button>
          </div>
        </div>
      </nav>

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
                 <BrainCircuit className="w-3 h-3 text-slate-500" />
                 Predictive Financial Clarity
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                Turn Data into <br />
                <span className="text-gray-400 dark:text-gray-600">Conversational Insights.</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Stop deciphering complex spreadsheets. Moneko's <strong>AI Financial Assistant</strong> translates 
                your spending patterns into plain English advice. Run scenarios, simulate major life 
                purchases, and get data-backed answers in seconds.
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
            
            {/* Card 1: Conversational Budget Analysis (Wide) */}
            <BentoCard className="md:col-span-2 overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row">
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center z-10 relative order-2 md:order-1">
                   <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Conversational Analysis.</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-sm">
                       Ask Moneko "How much have I spent on coffee this quarter?" or "Where did my money go?" to receive instant visualizations.
                   </p>
                </div>
                <div className="flex-1 relative min-h-[400px] md:min-h-auto flex items-center justify-center p-8 order-1 md:order-2 bg-gradient-to-b from-transparent to-black/5 dark:to-white/5">
                     <AskAnythingVisual />
                </div>
            </BentoCard>

            {/* Card 2: Scenario Planning (Tall) */}
            <BentoCard className="relative overflow-hidden bg-white dark:bg-black border border-gray-200 dark:border-gray-800 flex flex-col pt-8">
                 <div className="px-8 w-full z-10 shrink-0">
                     <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 text-slate-600 dark:text-slate-400">
                         <TrendingUp className="w-5 h-5" />
                     </div>
                     <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">Future Simulator</h3>
                     <p className="text-slate-500 dark:text-slate-400 text-base">
                        Simulate the impact of new car payments or savings rates on your net worth.
                     </p>
                 </div>
                 <div className="flex-1 w-full flex items-end relative overflow-hidden mt-4">
                    <ScenarioSimulationVisual />
                 </div>
            </BentoCard>

             {/* Card 3: Smart Alerts (Wide) */}
             <BentoCard className="md:col-span-3 overflow-hidden bg-slate-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row-reverse">
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center z-10 relative">
                   <div className="w-10 h-10 bg-white dark:bg-black rounded-xl flex items-center justify-center mb-4 shadow-sm text-slate-900 dark:text-white">
                         <AlertTriangle className="w-5 h-5" />
                   </div>
                   <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">24/7 Watchdog.</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-md">
                       Moneko uses anomaly detection to alert you to subscription hikes, spending spikes, and potential fraud before they drain your wallet.
                   </p>
                </div>
                <div className="flex-1 relative min-h-[300px] flex items-center justify-center p-8 bg-gradient-to-t from-transparent to-white/50 dark:to-black/50">
                    <SmartAlertsVisual />
                </div>
            </BentoCard>

        </section>

        {/* Methodology Section */}
        <section className="container px-4 py-24 mx-auto border-t border-slate-100 dark:border-slate-800">
           <div className="max-w-3xl mx-auto space-y-12">
              <div className="text-center">
                 <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">How Moneko AI Works</h2>
                 <p className="text-slate-600 dark:text-slate-400">Advanced machine learning designed for personal financial sovereignty.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                 <div className="flex gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <BarChart3 className="w-6 h-6 text-slate-700 dark:text-slate-300 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white mb-1">Trend Extraction</h3>
                       <p className="text-sm text-slate-500">Moneko identifies cyclical spending habits to predict future cash flow shortages before they happen.</p>
                    </div>
                 </div>
                 <div className="flex gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <MessageSquare className="w-6 h-6 text-slate-700 dark:text-slate-300 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white mb-1">NLP Intelligence</h3>
                       <p className="text-sm text-slate-500">Natural Language Processing allows for human-like interaction with your financial data.</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

         {/* Bottom CTA */}
         <section className="container px-4 py-24 mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">Ready for total financial clarity?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">Harness the power of AI to stop tracking the past and start planning your future.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> AES-256 Encryption</span>
                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Real-Time Analysis</span>
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
        <div className="w-full max-w-[380px] flex flex-col gap-6 scale-[0.9] md:scale-100">
            <div className="bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none p-4 flex items-center gap-3 relative z-20">
                 <div className="bg-slate-100 dark:bg-gray-800 p-2 rounded-full text-slate-600 dark:text-slate-400">
                    <Sparkles className="w-5 h-5" />
                 </div>
                 <div className="flex-1 h-6 relative overflow-hidden">
                     <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="text-slate-800 dark:text-slate-200 text-sm font-medium"
                     >
                        Can I afford a trip to Japan?
                     </motion.div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center">
                     <Search className="w-4 h-4" />
                 </div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.6 }}
                className="bg-white dark:bg-black border-l-4 border-slate-900 dark:border-white shadow-xl shadow-gray-200/50 dark:shadow-none rounded-r-xl p-5 relative z-10"
            >
                <div className="flex gap-4">
                     <img src={monekoAnimate} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-800" alt="Moneko AI Assistant" />
                     <div className="space-y-2">
                         <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                             <span className="font-bold text-slate-900 dark:text-white">Yes! 🇯🇵</span> you can comfortably afford it.
                         </p>
                         <div className="text-xs text-slate-500 dark:text-slate-400 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                             Based on your {currencySymbol}400/mo surplus, you'll reach your {currencySymbol}3,500 goal by <span className="font-semibold text-slate-900 dark:text-white">November 15th</span>.
                         </div>
                     </div>
                </div>
            </motion.div>
        </div>
    )
}

const ScenarioSimulationVisual = () => {
    return (
        <div className="w-full h-full p-6 relative flex flex-col justify-end">
            <div className="w-full h-40 relative">
                 {/* Chart Grid */}
                 <div className="absolute inset-0 flex flex-col justify-between opacity-30 dark:opacity-20">
                    <div className="w-full h-px bg-slate-300 border-t border-dashed border-slate-300" />
                    <div className="w-full h-px bg-slate-300 border-t border-dashed border-slate-300" />
                    <div className="w-full h-px bg-slate-300 border-t border-dashed border-slate-300" />
                 </div>

                 <svg className="absolute inset-0 w-full h-full overflow-visible">
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
                        transition={{ duration: 1.5, delay: 0.5 }}
                     />
                 </svg>

                 <div className="absolute top-[110px] left-[45%] w-2.5 h-2.5 bg-slate-400 rounded-full border border-white dark:border-black -translate-x-1/2 -translate-y-1/2" />
                 
                 <motion.div 
                    className="absolute top-[10px] right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm"
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2 }}
                 >
                     +25% Growth
                 </motion.div>
            </div>
            
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-400 mt-4">
                <span>Today</span>
                <span>Next Year</span>
            </div>
        </div>
    )
}

const SmartAlertsVisual = () => {
    return (
        <div className="w-full max-w-[320px] flex flex-col gap-3">
             <motion.div 
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-black rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex gap-3 opacity-50 scale-95 blur-[1px]"
             >
                 <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                    <TrendingUp className="w-4 h-4" />
                 </div>
                 <div className="flex-1 space-y-2 py-1">
                     <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                     <div className="h-1.5 w-32 bg-slate-100 dark:bg-slate-800/50 rounded" />
                 </div>
             </motion.div>

             <motion.div 
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white dark:bg-black rounded-xl p-4 shadow-xl border-l-4 border-l-slate-900 dark:border-l-white border-y border-r border-gray-200 dark:border-gray-800 flex gap-4 relative z-10"
             >
                 <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                 </div>
                 <div>
                     <div className="font-semibold text-sm text-slate-900 dark:text-white mb-1">Subscription Hike</div>
                     <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                         Your <span className="font-medium text-slate-900 dark:text-white">Adobe Creative Cloud</span> bill increased by $3.00 this month.
                     </p>
                 </div>
             </motion.div>
             
             <motion.div 
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white dark:bg-black rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex gap-3 opacity-40 scale-90 blur-[2px]"
             >
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                    <Calendar className="w-4 h-4" />
                 </div>
                 <div className="flex-1 space-y-2 py-1">
                      <div className="h-1.5 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-800/50 rounded" />
                 </div>
             </motion.div>
        </div>
    )
}