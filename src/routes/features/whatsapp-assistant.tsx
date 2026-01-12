"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCheck, Mic, Sparkles, ShieldCheck, Users, Zap } from "lucide-react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { useState, useRef, ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Iphone } from "@/components/ui/iphone";
import lunchReceipt from "@/assets/images/index/lunch-receipt.jpeg";
import monekoIcon from "@/assets/images/logo/moneko.png";
import { getCurrencySymbolBasedOnTimeZone } from "@/utils/currency-symbols";
import { BentoCard } from "@/components/ui/bento-card";

// SEO Imports
import { Helmet } from "@dr.pogodin/react-helmet";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { HomeHeader } from "@/components/index/header";

// SEO Constants
const META_TITLE = "WhatsApp Expense Tracker & AI Receipt Scanner | Moneko Assistant";
const META_DESCRIPTION = "The fastest way to track spending. Use Moneko's WhatsApp AI assistant to log expenses via voice notes, scan receipts, and manage shared budgets effortlessly.";
const META_KEYWORDS = "whatsapp expense tracker, whatsapp budget bot, ai receipt scanner, track spending via whatsapp, shared household budget whatsapp, automated expense logging";

export const Route = createFileRoute("/features/whatsapp-assistant")({
  component: WhatsAppFeaturePage,
  head: () => {
    const pageUrl = getCanonicalUrl("/features/whatsapp-assistant");
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

export default function WhatsAppFeaturePage() {
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl("/features/whatsapp-assistant");

  // Structured Data
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
            { "@type": "ListItem", "position": 3, "name": "WhatsApp Assistant" }
          ]
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "Moneko WhatsApp AI Assistant",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "WhatsApp, iOS, Android",
        "description": "An AI-powered financial assistant that allows users to track expenses and scan receipts directly within WhatsApp.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] font-sans selection:bg-gray-100 dark:selection:bg-gray-800 text-slate-900 dark:text-white pb-20">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Subtle Grid Background */}
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
                 <Zap className="w-3 h-3 fill-current" />
                The World's Fastest AI Expense Tracker
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                The First Expense Tracker <br />
                <span className="text-gray-400 dark:text-gray-600">Built for WhatsApp.</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Stop letting receipts pile up. Track spending, scan bills, and manage shared budgets 
                directly inside WhatsApp using Moneko’s secure AI assistant. 
                <strong> No new apps to learn. No friction.</strong>
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
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[auto] md:auto-rows-[600px] mb-32">
            
            {/* Card 1: Capture (Large) - Side by Side */}
            <BentoCard className="md:col-span-2 overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row">
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center z-10 relative order-2 md:order-1">
                   <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">Just Say It.</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-sm">
                       Send a voice note or snap a photo. Moneko's AI extracts the vendor, amount, and category instantly.
                   </p>
                </div>
                <div className="flex-1 relative min-h-[400px] md:min-h-auto flex items-end justify-center py-8 order-1 md:order-2 bg-gradient-to-b from-transparent to-black/5 dark:to-white/5">
                    <div className="absolute top-10 md:top-20 scale-[0.85] md:scale-100 origin-top">
                        <PhoneMockup mode="capture" />
                    </div>
                </div>
            </BentoCard>

            {/* Card 2: Insights (Tall) - Stacked */}
            <BentoCard className="relative overflow-hidden bg-slate-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 flex flex-col pt-8">
                 <div className="px-8 w-full z-10 shrink-0">
                     <div className="w-10 h-10 bg-white dark:bg-black rounded-xl flex items-center justify-center mb-4 shadow-sm text-slate-900 dark:text-white">
                         <Sparkles className="w-5 h-5" />
                     </div>
                     <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">Instant Answers</h3>
                     <p className="text-slate-500 dark:text-slate-400 text-base">
                        "How much for groceries?"<br/>Get data-backed answers.
                     </p>
                 </div>
                 <div className="flex-1 w-full flex justify-center items-start pt-8 relative overflow-hidden">
                    <div className="origin-top scale-[0.85]">
                        <PhoneMockup mode="insights" />
                    </div>
                 </div>
            </BentoCard>

             {/* Card 3: Sync (Tall) - Stacked */}
             <BentoCard className="md:col-span-1 relative overflow-hidden bg-white dark:bg-black border border-gray-200 dark:border-gray-800 flex flex-col pt-8">
                <div className="px-8 w-full z-10 shrink-0">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-4 text-slate-900 dark:text-white">
                        <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">Couple Finance</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-base">
                        Add your partner to track expenses together.
                    </p>
                </div>
                <div className="flex-1 w-full flex justify-center items-start pt-8 relative overflow-hidden">
                   <div className="origin-top scale-[0.85]">
                       <PhoneMockup mode="sync" />
                   </div>
                </div>
            </BentoCard>

            {/* Card 4: Security (Wide) - Side by Side */}
            <BentoCard className="md:col-span-2 bg-[#121212] text-white flex flex-col md:flex-row border border-gray-800 overflow-hidden">
                <div className="flex-1 p-8 md:p-12 space-y-6 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Bank-Grade Security</span>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-semibold tracking-tight">Your Data is Private.</h3>
                    <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                        256-bit encryption ensures your financial data stays yours. 
                        We never sell your data to advertisers.
                    </p>
                    {/* <div className="pt-2 flex gap-12 border-t border-white/10 mt-4">
                        <div>
                             <div className="text-3xl font-bold text-white">50k+</div>
                             <div className="text-gray-500 text-sm mt-1">Active Users</div>
                        </div>
                         <div>
                             <div className="text-3xl font-bold text-white">4.9</div>
                             <div className="text-gray-500 text-sm mt-1">App Store Rating</div>
                        </div>
                    </div> */}
                </div>
                <div className="flex-1 min-h-[300px] w-full bg-gradient-to-br from-gray-900 to-black relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-40 h-40 rounded-full bg-white/5 blur-[60px] animate-pulse" />
                        <div className="relative z-10 grid grid-cols-2 gap-3 transform rotate-12 opacity-80">
                             <div className="w-20 h-32 bg-gray-800/80 rounded-xl border border-white/5 backdrop-blur-md shadow-2xl" />
                             <div className="w-20 h-32 bg-gray-700/80 rounded-xl border border-white/5 backdrop-blur-md shadow-2xl mt-8" />
                             <div className="w-20 h-32 bg-gray-700/80 rounded-xl border border-white/5 backdrop-blur-md shadow-2xl -mt-8" />
                             <div className="w-20 h-32 bg-gray-800/80 rounded-xl border border-white/5 backdrop-blur-md shadow-2xl" />
                        </div>
                    </div>
                </div>
            </BentoCard>

        </section>


        {/* Simple CTA */}
        <section className="py-24 text-center border-t border-slate-200 dark:border-slate-800">
             <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter text-slate-900 dark:text-white mb-6">
                 Ready to chat with your money?
             </h2>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <AppleDownloadButton />
                 <AndroidDownloadButton />
             </div>
        </section>
      
      </main>

    </div>
  );
}



// Reuse existing PhoneMockup logic but styled for the new grid
const PhoneMockup = ({ mode }: { mode: 'capture' | 'insights' | 'sync' }) => {
  const currency = getCurrencySymbolBasedOnTimeZone();
  const ref = useRef(null)
  const isInView = useInView(ref, { margin: "-100px", once: true })

  return (
    <div ref={ref} className="bg-transparent w-full flex justify-center pointer-events-none select-none">
        <div className="w-[300px] sm:w-[320px] origin-top">
            <Iphone>
                <div className="w-full h-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a] text-slate-900 dark:text-gray-100 font-sans">
                    {/* Valid WhatsApp Header */}
                    <div className="bg-[#008069] dark:bg-[#1f2c34] h-[50px] px-3 flex items-center gap-2 z-10 relative shrink-0 shadow-sm">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={monekoIcon} />
                            <AvatarFallback>MK</AvatarFallback>
                        </Avatar>
                        <div className="text-white leading-tight flex-1">
                            <div className="font-semibold text-sm">Moneko AI</div>
                            <div className="text-[10px] opacity-80">Business Account</div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="relative flex-1 p-3 overflow-hidden flex flex-col">
                        <div className="absolute inset-0 opacity-60 dark:opacity-[0.06] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" />
                        
                        <div className="relative z-10 flex flex-col gap-2.5 justify-start min-h-full pt-4 pb-2">
                            {isInView && (
                                <AnimatePresence mode="wait">
                                    {mode === 'capture' && <CaptureFlow currency={currency} />}
                                    {mode === 'insights' && <InsightsFlow currency={currency} />}
                                    {mode === 'sync' && <SyncFlow currency={currency} />}
                                </AnimatePresence>
                            )}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="h-14 bg-[#f0f2f5] dark:bg-[#1f2c34] flex items-center px-2 gap-2 z-20 shrink-0 border-t border-gray-200 dark:border-gray-800">
                        <div className="w-8 h-8 flex items-center justify-center text-slate-400">
                             <div className="text-2xl pb-1">+</div>
                        </div>
                        <div className="flex-1 h-9 bg-white dark:bg-[#2a3942] rounded-full border border-gray-100 dark:border-transparent px-3 flex items-center text-sm text-gray-400">
                            Message...
                        </div>
                        <div className="w-9 h-9 bg-[#008069] rounded-full flex items-center justify-center text-white shadow-sm">
                            <Mic className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </Iphone>
        </div>
    </div>
  )
}

const ChatBubble = ({ type, children, time, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.3, ease: "easeOut" }}
    className={cn(
      "max-w-[85%] rounded-[18px] px-3.5 py-2 relative shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-[14px] leading-snug break-words",
      type === 'sent' 
        ? "bg-[#d9fdd3] text-black dark:bg-[#005c4b] dark:text-white self-end rounded-tr-none ml-auto" 
        : "bg-white text-black dark:bg-[#202c33] dark:text-white self-start rounded-tl-none mr-auto"
    )}
  >
    {children}
    <div className="flex items-center justify-end gap-1 mt-1 space-x-0.5 select-none">
        <span className="text-[10px] text-gray-500 dark:text-white/60">{time}</span>
        {type === 'sent' && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
    </div>
  </motion.div>
)

const CaptureFlow = ({ currency }: { currency: string }) => (
  <>
    <ChatBubble type="sent" time="12:30">
        <div className="flex items-center gap-2.5">
            <Mic className="w-5 h-5 text-gray-500 dark:text-gray-300" />
            <div className="flex gap-0.5 h-4 items-center">
                {[1,3,2,4,2,3,1,2].map((h, i) => (
                    <div key={i} className="w-1 bg-gray-500 dark:bg-gray-300 rounded-full h-full" style={{ height: `${Math.max(4, h * 4)}px` }} />
                ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-300 ml-1">0:04</span>
        </div>
    </ChatBubble>
    <ChatBubble type="recv" time="12:30" delay={0.6}>
         Got it! 🚙 <span className="font-bold">Gas Station</span> logged.
         <div className="mt-1 text-xs opacity-80 border-t border-black/10 dark:border-white/10 pt-1 mt-1">
            Category: Transport • {currency}45.00
         </div>
    </ChatBubble>
    <ChatBubble type="sent" time="12:45" delay={2.0}>
         <div className="rounded-lg overflow-hidden mb-1.5 relative w-full h-32 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
             <img src={lunchReceipt} alt="Receipt" className="w-full h-full object-cover" />
         </div>
         Client lunch receipt
    </ChatBubble>
    <ChatBubble type="recv" time="12:46" delay={3.0}>
         Processing receipt... 🧾
         <div className="mt-2 font-semibold text-[15px]">Bistro Carette</div>
         <div className="text-xs opacity-80 mb-1">12:30 PM • Card • Dining</div>
         <div className="font-bold text-lg">{currency}33.50</div>
    </ChatBubble>
  </>
)

const InsightsFlow = ({ currency }: { currency: string }) => (
  <>
    <ChatBubble type="sent" time="14:15">
        How much left for groceries?
    </ChatBubble>
    <ChatBubble type="recv" time="14:15" delay={0.6}>
        You have <span className="font-bold text-green-600 dark:text-green-400">{currency}320.00</span> remaining in <span className="font-medium">Groceries</span>. 🥬
    </ChatBubble>
    <ChatBubble type="sent" time="14:16" delay={2.0}>
         Can I afford a new iPad?
    </ChatBubble>
    <ChatBubble type="recv" time="14:16" delay={3.0}>
        <span className="text-orange-600 dark:text-orange-400 font-medium">Warning:</span> You're currently {currency}150 short for your "Tech Upgrade" goal.
        
        <div className="w-full bg-slate-100 dark:bg-black/20 h-2 rounded-full mt-2 mb-1 overflow-hidden">
            <div className="bg-orange-500 w-[70%] h-full rounded-full" />
        </div>
        <div className="flex justify-between text-[10px] opacity-70">
            <span>Saved: {currency}650</span>
            <span>Goal: {currency}800</span>
        </div>
    </ChatBubble>
  </>
)

const SyncFlow = ({ currency }: { currency: string }) => (
  <>
    <ChatBubble type="sent" time="09:10">
        Paid electric bill {currency}140
    </ChatBubble>
    <ChatBubble type="recv" time="09:10" delay={0.8}>
        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
            <Sparkles className="w-3 h-3" /> Household Mode
        </div>
        <div className="mb-2">Logged! 💡 I've split this 50/50 with Sarah.</div>
        <div className="bg-black/5 dark:bg-white/10 rounded p-2 text-xs space-y-1">
            <div className="flex justify-between"><span>You paid:</span> <span className="font-medium">{currency}140</span></div>
            <div className="flex justify-between text-purple-600 dark:text-purple-300"><span>Sarah owes:</span> <span className="font-bold">{currency}70</span></div>
        </div>
    </ChatBubble>
  </>
)