"use client";

import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCheck,
  Mic,
  Sparkles,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
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
const META_TITLE =
  "WhatsApp Expense Tracker & AI Receipt Scanner | Moneko Assistant";
const META_DESCRIPTION =
  "The fastest way to track spending. Use Moneko's WhatsApp AI assistant to log expenses via voice notes, scan receipts, and manage shared budgets effortlessly.";
const META_KEYWORDS =
  "whatsapp expense tracker, whatsapp budget bot, ai receipt scanner, track spending via whatsapp, shared household budget whatsapp, automated expense logging";

export function WhatsAppAssistantRouteComponent() {
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl("/features/whatsapp-assistant");

  // Structured Data
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
            { "@type": "ListItem", position: 3, name: "WhatsApp Assistant" },
          ],
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Moneko WhatsApp AI Assistant",
        applicationCategory: "FinanceApplication",
        operatingSystem: "WhatsApp, iOS, Android",
        description:
          "An AI-powered financial assistant that allows users to track expenses and scan receipts directly within WhatsApp.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white pb-20 font-sans text-slate-900 selection:bg-gray-100 dark:bg-[#050505] dark:text-white dark:selection:bg-gray-800">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* Subtle Grid Background */}
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
                <Zap className="h-3 w-3 fill-current" />
                The World's Fastest AI Expense Tracker
              </span>
              <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 md:text-7xl dark:text-white">
                The First Expense Tracker <br />
                <span className="text-gray-400 dark:text-gray-600">
                  Built for WhatsApp.
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
                Stop letting receipts pile up. Track spending, scan bills, and
                manage shared budgets directly inside WhatsApp using Moneko’s
                secure AI assistant.
                <strong> No new apps to learn. No friction.</strong>
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
        <section className="mb-32 grid auto-rows-[auto] grid-cols-1 gap-6 md:auto-rows-[600px] md:grid-cols-3">
          {/* Card 1: Capture (Large) - Side by Side */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-200 bg-gray-50 md:col-span-2 md:flex-row dark:border-gray-800 dark:bg-gray-900">
            <div className="relative z-10 order-2 flex flex-1 flex-col justify-center p-8 md:order-1 md:p-12">
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Just Say It.
              </h3>
              <p className="max-w-sm text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Send a voice note or snap a photo. Moneko's AI extracts the
                vendor, amount, and category instantly.
              </p>
            </div>
            <div className="relative order-1 flex min-h-[400px] flex-1 items-end justify-center bg-gradient-to-b from-transparent to-black/5 py-8 md:order-2 md:min-h-auto dark:to-white/5">
              <div className="absolute top-10 origin-top scale-[0.85] md:top-20 md:scale-100">
                <PhoneMockup mode="capture" />
              </div>
            </div>
          </BentoCard>

          {/* Card 2: Insights (Tall) - Stacked */}
          <BentoCard className="relative flex flex-col overflow-hidden border border-gray-200 bg-slate-100 pt-8 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="z-10 w-full shrink-0 px-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm dark:bg-black dark:text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Instant Answers
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400">
                "How much for groceries?"
                <br />
                Get data-backed answers.
              </p>
            </div>
            <div className="relative flex w-full flex-1 items-start justify-center overflow-hidden pt-8">
              <div className="origin-top scale-[0.85]">
                <PhoneMockup mode="insights" />
              </div>
            </div>
          </BentoCard>

          {/* Card 3: Sync (Tall) - Stacked */}
          <BentoCard className="relative flex flex-col overflow-hidden border border-gray-200 bg-white pt-8 md:col-span-1 dark:border-gray-800 dark:bg-black">
            <div className="z-10 w-full shrink-0 px-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Couple Finance
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400">
                Add your partner to track expenses together.
              </p>
            </div>
            <div className="relative flex w-full flex-1 items-start justify-center overflow-hidden pt-8">
              <div className="origin-top scale-[0.85]">
                <PhoneMockup mode="sync" />
              </div>
            </div>
          </BentoCard>

          {/* Card 4: Security (Wide) - Side by Side */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-800 bg-[#121212] text-white md:col-span-2 md:flex-row">
            <div className="flex flex-1 flex-col justify-center space-y-6 p-8 md:p-12">
              <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                <ShieldCheck className="h-4 w-4" />
                <span>Privacy-focused</span>
              </div>
              <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Your Data is Private.
              </h3>
              <p className="max-w-md text-lg leading-relaxed text-gray-400">
                We use modern security practices to protect your financial data.
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
            <div className="relative min-h-[300px] w-full flex-1 bg-gradient-to-br from-gray-900 to-black">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 animate-pulse rounded-full bg-white/5 blur-[60px]" />
                <div className="relative z-10 grid rotate-12 transform grid-cols-2 gap-3 opacity-80">
                  <div className="h-32 w-20 rounded-xl border border-white/5 bg-gray-800/80 shadow-2xl backdrop-blur-md" />
                  <div className="mt-8 h-32 w-20 rounded-xl border border-white/5 bg-gray-700/80 shadow-2xl backdrop-blur-md" />
                  <div className="-mt-8 h-32 w-20 rounded-xl border border-white/5 bg-gray-700/80 shadow-2xl backdrop-blur-md" />
                  <div className="h-32 w-20 rounded-xl border border-white/5 bg-gray-800/80 shadow-2xl backdrop-blur-md" />
                </div>
              </div>
            </div>
          </BentoCard>
        </section>

        {/* Simple CTA */}
        <section className="border-t border-slate-200 py-24 text-center dark:border-slate-800">
          <h2 className="mb-6 text-3xl font-semibold tracking-tighter text-slate-900 md:text-5xl dark:text-white">
            Ready to chat with your money?
          </h2>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AppleDownloadButton />
            <AndroidDownloadButton />
          </div>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Explore more:{" "}
            <a
              href="/budgeting-via-whatsapp"
              className="text-primary underline underline-offset-4"
            >
              budgeting via WhatsApp
            </a>{" "}
            or{" "}
            <a
              href="/track-expenses-automatically"
              className="text-primary underline underline-offset-4"
            >
              track expenses automatically
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}

// Reuse existing PhoneMockup logic but styled for the new grid
const PhoneMockup = ({ mode }: { mode: "capture" | "insights" | "sync" }) => {
  const currency = getCurrencySymbolBasedOnTimeZone();
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-100px", once: true });

  return (
    <div
      ref={ref}
      className="pointer-events-none flex w-full justify-center bg-transparent select-none"
    >
      <div className="w-[300px] origin-top sm:w-[320px]">
        <Iphone>
          <div className="flex h-full w-full flex-col bg-[#efeae2] font-sans text-slate-900 dark:bg-[#0b141a] dark:text-gray-100">
            {/* Valid WhatsApp Header */}
            <div className="relative z-10 flex h-[50px] shrink-0 items-center gap-2 bg-[#008069] px-3 shadow-sm dark:bg-[#1f2c34]">
              <Avatar className="h-8 w-8">
                <AvatarImage src={monekoIcon} />
                <AvatarFallback>MK</AvatarFallback>
              </Avatar>
              <div className="flex-1 leading-tight text-white">
                <div className="text-sm font-semibold">Moneko AI</div>
                <div className="text-[10px] opacity-80">Business Account</div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="relative flex flex-1 flex-col overflow-hidden p-3">
              <div className="absolute inset-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat opacity-60 dark:opacity-[0.06]" />

              <div className="relative z-10 flex min-h-full flex-col justify-start gap-2.5 pt-4 pb-2">
                {isInView && (
                  <AnimatePresence mode="wait">
                    {mode === "capture" && <CaptureFlow currency={currency} />}
                    {mode === "insights" && (
                      <InsightsFlow currency={currency} />
                    )}
                    {mode === "sync" && <SyncFlow currency={currency} />}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="z-20 flex h-14 shrink-0 items-center gap-2 border-t border-gray-200 bg-[#f0f2f5] px-2 dark:border-gray-800 dark:bg-[#1f2c34]">
              <div className="flex h-8 w-8 items-center justify-center text-slate-400">
                <div className="pb-1 text-2xl">+</div>
              </div>
              <div className="flex h-9 flex-1 items-center rounded-full border border-gray-100 bg-white px-3 text-sm text-gray-400 dark:border-transparent dark:bg-[#2a3942]">
                Message...
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#008069] text-white shadow-sm">
                <Mic className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Iphone>
      </div>
    </div>
  );
};

const ChatBubble = ({ type, children, time, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.3, ease: "easeOut" }}
    className={cn(
      "relative max-w-[85%] rounded-[18px] px-3.5 py-2 text-[14px] leading-snug break-words shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]",
      type === "sent"
        ? "ml-auto self-end rounded-tr-none bg-[#d9fdd3] text-black dark:bg-[#005c4b] dark:text-white"
        : "mr-auto self-start rounded-tl-none bg-white text-black dark:bg-[#202c33] dark:text-white",
    )}
  >
    {children}
    <div className="mt-1 flex items-center justify-end gap-1 space-x-0.5 select-none">
      <span className="text-[10px] text-gray-500 dark:text-white/60">
        {time}
      </span>
      {type === "sent" && <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />}
    </div>
  </motion.div>
);

const CaptureFlow = ({ currency }: { currency: string }) => (
  <>
    <ChatBubble type="sent" time="12:30">
      <div className="flex items-center gap-2.5">
        <Mic className="h-5 w-5 text-gray-500 dark:text-gray-300" />
        <div className="flex h-4 items-center gap-0.5">
          {[1, 3, 2, 4, 2, 3, 1, 2].map((h, i) => (
            <div
              key={i}
              className="h-full w-1 rounded-full bg-gray-500 dark:bg-gray-300"
              style={{ height: `${Math.max(4, h * 4)}px` }}
            />
          ))}
        </div>
        <span className="ml-1 text-xs text-gray-500 dark:text-gray-300">
          0:04
        </span>
      </div>
    </ChatBubble>
    <ChatBubble type="recv" time="12:30" delay={0.6}>
      Got it! 🚙 <span className="font-bold">Gas Station</span> logged.
      <div className="mt-1 border-t border-black/10 pt-1 text-xs opacity-80 dark:border-white/10">
        Category: Transport • {currency}45.00
      </div>
    </ChatBubble>
    <ChatBubble type="sent" time="12:45" delay={2.0}>
      <div className="relative mb-1.5 flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
        <img
          src={lunchReceipt}
          alt="Receipt"
          className="h-full w-full object-cover"
        />
      </div>
      Client lunch receipt
    </ChatBubble>
    <ChatBubble type="recv" time="12:46" delay={3.0}>
      Processing receipt... 🧾
      <div className="mt-2 text-[15px] font-semibold">Bistro Carette</div>
      <div className="mb-1 text-xs opacity-80">12:30 PM • Card • Dining</div>
      <div className="text-lg font-bold">{currency}33.50</div>
    </ChatBubble>
  </>
);

const InsightsFlow = ({ currency }: { currency: string }) => (
  <>
    <ChatBubble type="sent" time="14:15">
      How much left for groceries?
    </ChatBubble>
    <ChatBubble type="recv" time="14:15" delay={0.6}>
      You have{" "}
      <span className="font-bold text-green-600 dark:text-green-400">
        {currency}320.00
      </span>{" "}
      remaining in <span className="font-medium">Groceries</span>. 🥬
    </ChatBubble>
    <ChatBubble type="sent" time="14:16" delay={2.0}>
      Can I afford a new iPad?
    </ChatBubble>
    <ChatBubble type="recv" time="14:16" delay={3.0}>
      <span className="font-medium text-orange-600 dark:text-orange-400">
        Warning:
      </span>{" "}
      You're currently {currency}150 short for your "Tech Upgrade" goal.
      <div className="mt-2 mb-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-black/20">
        <div className="h-full w-[70%] rounded-full bg-orange-500" />
      </div>
      <div className="flex justify-between text-[10px] opacity-70">
        <span>Saved: {currency}650</span>
        <span>Goal: {currency}800</span>
      </div>
    </ChatBubble>
  </>
);

const SyncFlow = ({ currency }: { currency: string }) => (
  <>
    <ChatBubble type="sent" time="09:10">
      Paid electric bill {currency}140
    </ChatBubble>
    <ChatBubble type="recv" time="09:10" delay={0.8}>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-purple-600 uppercase dark:text-purple-400">
        <Sparkles className="h-3 w-3" /> Household Mode
      </div>
      <div className="mb-2">Logged! 💡 I've split this 50/50 with Sarah.</div>
      <div className="space-y-1 rounded bg-black/5 p-2 text-xs dark:bg-white/10">
        <div className="flex justify-between">
          <span>You paid:</span>{" "}
          <span className="font-medium">{currency}140</span>
        </div>
        <div className="flex justify-between text-purple-600 dark:text-purple-300">
          <span>Sarah owes:</span>{" "}
          <span className="font-bold">{currency}70</span>
        </div>
      </div>
    </ChatBubble>
  </>
);
