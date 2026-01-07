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
      image: "https://moneko.io/og-ai-insights.png",
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
    <div className="min-h-screen relative bg-white dark:bg-gray-900 overflow-hidden font-sans selection:bg-cyan-100 dark:selection:bg-cyan-900">
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

      {/* Background Decor */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen opacity-40 dark:opacity-20">
         <></>
      </BackgroundBeamsWithCollision>
      <DotPattern
        className={cn(
          "fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none z-[1]",
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]"
        )}
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <MonekoIcon />
            <motion.button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 px-3 py-2 rounded-md hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ x: -2 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </motion.button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="container px-4 md:px-6 mx-auto mb-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-sm font-medium mb-6">
                 <BrainCircuit className="w-4 h-4" />
                 Predictive Financial Clarity
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                Turn Data into <br />
                <span className="text-cyan-500 relative inline-block">Conversational Insights.</span>
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

        {/* Feature 1: Natural Language Queries */}
        <FeatureBlock
          title="Conversational Budget Analysis"
          description="Your personal finance app should speak your language. Ask Moneko 'How much have I spent on coffee this quarter?' or 'Where did my money go last week?' to receive instant, categorized visualizations of your cash flow."
          align="left"
          visual={<AskAnythingVisual />}
        />

        {/* Feature 2: Scenario Planning */}
        <FeatureBlock
          title="Predictive Scenario Simulations"
          description="Simulate the long-term impact of financial decisions before you commit. Moneko runs Monte Carlo simulations on your net worth to show how a new car payment or a higher savings rate affects your retirement and fire goals."
          align="right"
          visual={<ScenarioSimulationVisual />}
        />

        {/* Feature 3: Smart Alerts */}
        <FeatureBlock
          title="Automated Bill & Fraud Monitoring"
          description="Moneko acts as a 24/7 financial watchdog. Using anomaly detection, it alerts you to subscription price hikes, unusual spending spikes, and potential duplicate charges before they affect your balance."
          align="left"
          visual={<SmartAlertsVisual />}
        />

        {/* Methodology Section for SEO E-E-A-T */}
        <section className="container px-4 py-24 mx-auto border-t border-slate-100 dark:border-slate-800">
           <div className="max-w-3xl mx-auto space-y-12">
              <div className="text-center">
                 <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">How Moneko AI Works</h2>
                 <p className="text-slate-600 dark:text-slate-400">Advanced machine learning designed for personal financial sovereignty.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                 <div className="flex gap-4">
                    <BarChart3 className="w-6 h-6 text-cyan-500 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white">Trend Extraction</h3>
                       <p className="text-sm text-slate-500">Moneko identifies cyclical spending habits to predict future cash flow shortages before they happen.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <MessageSquare className="w-6 h-6 text-cyan-500 shrink-0" />
                    <div>
                       <h3 className="font-bold text-slate-900 dark:text-white">NLP Intelligence</h3>
                       <p className="text-sm text-slate-500">Natural Language Processing allows for human-like interaction with your financial data.</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

         {/* Bottom CTA */}
         <section className="container px-4 py-24 mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">Ready for total financial clarity?</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">Harness the power of AI to stop tracking the past and start planning your future.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-slate-400 text-sm">
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> AES-256 Encryption</span>
                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Real-Time Analysis</span>
            </div>
         </section>
      </main>
    </div>
  );
}

// --- Layout Components ---

const FeatureBlock = ({ title, description, align, visual }: { title: string, description: string, align: 'left' | 'right', visual: ReactNode }) => {
  return (
    <div className="py-24">
      <div className="container px-4 md:px-6 mx-auto">
        <div className={cn("flex flex-col items-center gap-12 lg:gap-24", align === 'right' ? 'lg:flex-row-reverse' : 'lg:flex-row')}>
          {/* Text Content */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
          </div>
          
          {/* Visual Content */}
          <div className="flex-1 w-full flex justify-center">
             <div className="relative w-full max-w-[450px] aspect-[4/3] bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
                <div className="relative w-full h-full flex items-center justify-center p-6">
                    {visual}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Visual Components ---

const AskAnythingVisual = () => {
    const currencySymbol = getCurrencySymbolBasedOnTimeZone();
    return (
        <div className="w-full max-w-[350px] flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-4 flex items-center gap-3 relative z-20">
                 <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-full text-cyan-600">
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
                 <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center">
                     <Search className="w-4 h-4" />
                 </div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.6 }}
                className="bg-white dark:bg-slate-800 border-l-4 border-cyan-500 shadow-md rounded-r-xl p-5 relative z-10"
            >
                <div className="flex gap-4">
                     <img src={monekoAnimate} className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-700" alt="Moneko AI Assistant" />
                     <div className="space-y-2">
                         <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                             <span className="font-bold text-slate-900 dark:text-white">Yes! 🇯🇵</span> you can comfortably afford it.
                         </p>
                         <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg">
                             Based on your {currencySymbol}400/mo surplus, you'll reach your {currencySymbol}3,500 goal by <span className="font-semibold text-cyan-600 dark:text-cyan-400">November 15th</span>.
                         </div>
                     </div>
                </div>
            </motion.div>
        </div>
    )
}

const ScenarioSimulationVisual = () => {
    return (
        <div className="w-full h-full p-4 relative flex flex-col justify-end">
            <div className="absolute top-6 left-6 z-10">
                <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 mb-2">
                    Net Worth Projection
                </div>
            </div>

            <div className="w-full h-48 relative">
                 <div className="absolute inset-0 flex flex-col justify-between opacity-20 dark:opacity-10">
                    <div className="w-full h-px bg-slate-400" />
                    <div className="w-full h-px bg-slate-400" />
                    <div className="w-full h-px bg-slate-400" />
                    <div className="w-full h-px bg-slate-400" />
                 </div>

                 <svg className="absolute inset-0 w-full h-full overflow-visible">
                     <path 
                        d="M0 150 C 50 145, 100 140, 150 130 C 200 120, 250 115, 300 110" 
                        fill="none" 
                        stroke="currentColor" 
                        className="text-slate-300 dark:text-slate-600" 
                        strokeWidth="3" 
                        strokeDasharray="4 4" 
                     />
                     
                     <motion.path 
                        d="M150 130 C 200 100, 250 60, 350 20" 
                        fill="none" 
                        stroke="#06b6d4" 
                        strokeWidth="4"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                     />
                 </svg>

                 <div className="absolute top-[130px] left-[150px] w-3 h-3 bg-slate-400 rounded-full border-2 border-white dark:border-slate-900 -translate-x-1.5 -translate-y-1.5" />
                 
                 <motion.div 
                    className="absolute top-[20px] right-0 bg-cyan-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg transform translate-x-4"
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2 }}
                 >
                     +25% Growth
                 </motion.div>
            </div>
            
            <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                <span>Today</span>
                <span>1 Year</span>
                <span>5 Years</span>
            </div>
        </div>
    )
}

const SmartAlertsVisual = () => {
    return (
        <div className="w-full max-w-[320px] flex flex-col gap-4">
             <motion.div 
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex gap-3 opacity-60 scale-95"
             >
                 <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                    <TrendingUp className="w-5 h-5" />
                 </div>
                 <div>
                     <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                     <div className="h-2 w-48 bg-slate-100 dark:bg-slate-700/50 rounded" />
                 </div>
             </motion.div>

             <motion.div 
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border-l-4 border-l-red-500 border-y border-r border-slate-100 dark:border-slate-700 flex gap-4"
             >
                 <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                 </div>
                 <div>
                     <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">Subscription Hike</div>
                     <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                         Your <span className="font-medium text-slate-900 dark:text-white">Adobe Creative Cloud</span> bill increased by $3.00 this month.
                     </p>
                 </div>
             </motion.div>
             
             <motion.div 
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex gap-3 opacity-40 scale-90"
             >
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Calendar className="w-5 h-5" />
                 </div>
                 <div>
                     <div className="h-2 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                     <div className="h-2 w-32 bg-slate-100 dark:bg-slate-700/50 rounded" />
                 </div>
             </motion.div>
        </div>
    )
}