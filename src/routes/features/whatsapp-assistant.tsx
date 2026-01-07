"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, CheckCheck, Mic, Image as ImageIcon, Sparkles, ShieldCheck, Zap, Users } from "lucide-react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { cn } from "@/lib/utils";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { useState, useEffect, useRef, ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Iphone } from "@/components/ui/iphone";
import lunchReceipt from "@/assets/images/index/lunch-receipt.jpeg";
import monekoIcon from "@/assets/images/logo/moneko.png";
import { getCurrencySymbolBasedOnTimeZone } from "@/utils/currency-symbols";

// SEO Imports
import { Helmet } from "@dr.pogodin/react-helmet";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

// SEO Constants for WhatsApp Feature
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
      image: "https://moneko.io/og-whatsapp.png",
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

  // Feature-Specific Structured Data
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
    <div className="min-h-screen relative bg-white dark:bg-gray-900 overflow-hidden font-sans selection:bg-green-100 dark:selection:bg-green-900">
      <Helmet>
        <title>{META_TITLE}</title>
        <meta name="description" content={META_DESCRIPTION} />
        <meta name="keywords" content={META_KEYWORDS} />
        <meta property="og:title" content={META_TITLE} />
        <meta property="og:description" content={META_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://moneko.io/og-whatsapp.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={META_TITLE} />
        <meta name="twitter:description" content={META_DESCRIPTION} />
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
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-6">
                 <Zap className="w-3 h-3 fill-current" />
                The World's Fastest AI Expense Tracker
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                The First Expense Tracker <br />
                <span className="text-green-600 dark:text-green-500">Built for WhatsApp.</span>
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

        {/* Feature 1: OCR & Voice Recognition */}
        <FeatureBlock
          title="Automated Logging via Voice & Photos"
          description="Leverage advanced OCR and natural language processing. Send a voice note while walking or a photo of a lunch receipt—Moneko’s AI automatically extracts the vendor, amount, and category in milliseconds."
          align="left"
          visual={<PhoneMockup mode="capture" />}
        />

        {/* Feature 2: Natural Language Queries */}
        <FeatureBlock
          title="Instant AI Financial Insights"
          description="Get data-backed answers to your most pressing financial questions. Ask 'How much have I spent on Uber this month?' or 'Can I afford a $50 dinner tonight?' based on your real-time budget and savings goals."
          align="right"
          visual={<PhoneMockup mode="insights" />}
        />

        {/* Feature 3: Shared Budgets & Security */}
        <FeatureBlock
          title="Collaborative Tracking for Couples"
          description="Managing household finances shouldn't be a chore. Add your partner to a WhatsApp chat to track shared expenses instantly. With end-to-end encryption and bank-level security, your financial data stays private."
          align="left"
          visual={<PhoneMockup mode="sync" />}
        />

         {/* Bottom CTA */}
         <section className="container px-4 py-24 mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">Start Tracking in 30 Seconds</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto">
                Join 50,000+ users who have ditched manual spreadsheets for the ease of WhatsApp-based AI budgeting.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-slate-400 text-sm">
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> 256-bit Encryption</span>
                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Shared Access</span>
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
          <div className="flex-1 w-full max-w-[400px] lg:max-w-none flex justify-center">
             <div className="relative w-full max-w-[320px]">
                <div className="absolute inset-0 bg-green-500/20 blur-[100px] rounded-full" />
                {visual}
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Phone Mockup & Flows ---

const PhoneMockup = ({ mode }: { mode: 'capture' | 'insights' | 'sync' }) => {
  const currency = getCurrencySymbolBasedOnTimeZone();
  const ref = useRef(null)
  const isInView = useInView(ref, { margin: "-20% 0px -20% 0px" })

  return (
    <div ref={ref} className="bg-transparent w-full flex justify-center">
        <div className="w-[300px] sm:w-[320px] scale-90 origin-top">
            <Iphone>
                <div className="w-full h-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a] text-slate-900 dark:text-gray-100">
                    {/* Header */}
                    <div className="bg-[#008069] dark:bg-[#1f2c34] h-[50px] px-3 flex items-center gap-2 z-10 relative shrink-0">
                        <Avatar className="w-6 h-6 border border-white/20">
                            <AvatarImage src={monekoIcon} />
                            <AvatarFallback>MK</AvatarFallback>
                        </Avatar>
                        <div className="text-white leading-tight">
                            <div className="font-medium text-xs">Moneko</div>
                            <div className="text-[9px] opacity-80">Business Account</div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="relative flex-1 p-2 overflow-hidden flex flex-col">
                        <div className="absolute inset-0 opacity-40 dark:opacity-5 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col gap-2 justify-end min-h-full pb-2">
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
                    <div className="h-10 bg-[#f0f2f5] dark:bg-[#1f2c34] flex items-center px-2 gap-2 z-20 shrink-0">
                        <div className="text-slate-400 text-xl leading-none flex items-center justify-center">+</div>
                        <div className="flex-1 h-7 bg-white dark:bg-[#2a3942] rounded-lg" />
                        <div className="w-7 h-7 bg-[#008069] rounded-full flex items-center justify-center text-white">
                            <Mic className="w-3 h-3" />
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
    transition={{ delay, duration: 0.4 }}
    className={cn(
      "max-w-[85%] rounded-lg p-2 px-3 relative shadow-sm text-[13px] leading-snug break-words",
      type === 'sent' 
        ? "bg-[#d9fdd3] text-black dark:bg-[#005c4b] dark:text-white self-end rounded-tr-none ml-auto" 
        : "bg-white text-black dark:bg-[#202c33] dark:text-white self-start rounded-tl-none mr-auto"
    )}
  >
    {children}
    <div className="flex items-center justify-end gap-1 mt-0.5 space-x-0.5">
        <span className="text-[9px] text-gray-500 dark:text-white/60">{time}</span>
        {type === 'sent' && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
    </div>
  </motion.div>
)

const CaptureFlow = ({ currency }: { currency: string }) => (
  <>
    <ChatBubble type="sent" time="12:30">
        <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 opacity-70" />
            <div className="flex gap-0.5 h-3 items-center">
                {[1,3,2,4,2,1].map((h, i) => (
                    <div key={i} className="w-1 bg-current opacity-60 rounded-full h-full" style={{ height: `${h * 4}px` }} />
                ))}
            </div>
            <span className="text-xs">0:04</span>
        </div>
    </ChatBubble>
    <ChatBubble type="recv" time="12:30" delay={0.8}>
         Got it! 🚙 <span className="font-bold">Gas Station</span> logged.
         <div className="mt-1 text-xs opacity-80">Category: Transport • {currency}45.00</div>
    </ChatBubble>
    <ChatBubble type="sent" time="12:45" delay={2.5}>
         <div className="rounded overflow-hidden mb-1 relative w-auto h-24 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
             <img src={lunchReceipt} alt="Receipt" className="w-full h-full object-cover" />
         </div>
         Client lunch receipt
    </ChatBubble>
    <ChatBubble type="recv" time="12:46" delay={3.5}>
         Scanning... 🧾
         <div className="mt-1 font-semibold">Bistro Carette</div>
         <div>Total: <span className="font-bold">{currency}33.50</span></div>
    </ChatBubble>
  </>
)

const InsightsFlow = ({ currency }: { currency: string }) => (
  <>
    <ChatBubble type="sent" time="14:15">
        How much left for groceries?
    </ChatBubble>
    <ChatBubble type="recv" time="14:15" delay={0.8}>
        You have <span className="font-bold text-green-600 dark:text-green-400">{currency}320.00</span> remaining in Groceries for October. 🥬
    </ChatBubble>
    <ChatBubble type="sent" time="14:16" delay={2.5}>
         Can I afford a new iPad?
    </ChatBubble>
    <ChatBubble type="recv" time="14:16" delay={3.5}>
        Based on your savings goal "Tech Upgrade", you're currently <span className="font-bold text-orange-500">{currency}150 short</span>.
        <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full mt-2 mb-1 overflow-hidden">
            <div className="bg-orange-500 w-[70%] h-full" />
        </div>
        <div className="text-[10px] opacity-70">Goal: {currency}800 • Saved: {currency}650</div>
    </ChatBubble>
  </>
)

const SyncFlow = ({ currency }: { currency: string }) => (
  <>
    <div className="text-center text-[10px] bg-[#f0f2f5] dark:bg-[#1f2c34] text-slate-500 dark:text-slate-400 py-1 px-2 rounded shadow-sm self-center my-2 opacity-80">
        Sarah added to chat
    </div>
    <ChatBubble type="sent" time="09:10">
        Paid electric bill {currency}140
    </ChatBubble>
    <ChatBubble type="recv" time="09:10" delay={0.8}>
        <div className="flex items-center gap-1 mb-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <Sparkles className="w-3 h-3" /> Household Bills
        </div>
        Logged! 💡 Splitting 50/50 with Sarah.
        <div className="mt-1 text-xs border-l-2 border-purple-500 pl-2">
            You paid: {currency}140<br/>
            Sarah owes you: {currency}70
        </div>
    </ChatBubble>
  </>
)