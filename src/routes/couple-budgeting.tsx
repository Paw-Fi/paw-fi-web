"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Camera, Shield, Smartphone, Check, Code, Rocket, Palette, TestTube } from "lucide-react";
import { motion } from "framer-motion";
import { FreeTrialGiveawayForm } from "@/components/forms/FreeTrialGiveawayForm";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { ArcTimeline, type ArcTimelineItem } from "@/components/ui/arc-timeline";
import { FaqSection } from "@/components/ui/faq-section";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import { cn } from "@/lib/utils";
import phone1 from "@assets/images/couple-budgeting/1.png"
import phone2 from "@assets/images/couple-budgeting/2.png"
import phone3 from "@assets/images/couple-budgeting/3.png"
import phone4 from "@assets/images/couple-budgeting/4.png"
import phone5 from "@assets/images/couple-budgeting/5.png"

import { MonekoIcon } from "@/components/shared/moneko-icon";
import { CoupleBudgetingClaim } from "@/lib/couple-budgeting-waitlist";
import { useCoupleBudgetingUserClaimed, useJoinCoupleBudgetingWaitlist } from "@/hooks/use-couple-budgeting-waitlist";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";

export const Route = createFileRoute("/couple-budgeting")({
  component: CoupleBudgetingPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/couple-budgeting");
    const title = "Budgeting App for Couples | Moneko | Manage Money Together";
    const description =
      `Stop arguing about money and start achieving your financial goals together. Moneko is the AI-powered budgeting app designed for couples in the US, Canada, and worldwide. Join the waitlist!`;
    const keywords =
      "couple budgeting app, budgeting app for couples, shared finances app, joint budget app, manage money with partner, shared expense tracker, financial planning for couples, money management for two, couples finance app, relationship budgeting";

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: "https://moneko.io/og-img-couple-budgeting.png", // A dedicated OG image is recommended
      url: pageUrl,
    });
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          "name": "Moneko",
          "url": "https://moneko.io",
          "logo": "https://moneko.io/icon.svg",
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          "name": "Moneko",
          "url": "https://moneko.io",
          "publisher": { "@id": "https://moneko.io/#organization" }
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          "url": pageUrl,
          "name": title,
          "description": description,
          "isPartOf": { "@id": "https://moneko.io/#website" },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://moneko.io" },
              { "@type": "ListItem", "position": 2, "name": "Couple Budgeting App", "item": pageUrl }
            ]
          },
          "inLanguage": "en-US",
          "primaryImageOfPage": "https://moneko.io/og-img-couple-budgeting.png"
        },
        {
          "@type": "SoftwareApplication",
          "name": "Moneko: Budgeting for Couples",
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "iOS, Android",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "description": "The AI-powered mobile app that helps couples budget, track shared expenses, and save for joint goals together.",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "250"
          }
        },
        {
          "@type": "FAQPage",
          "@id": pageUrl + "#faq",
          "mainEntity": [
            { "@type": "Question", "name": "How does a shared budgeting app help couples?", "acceptedAnswer": { "@type": "Answer", "text": "A shared budgeting app like Moneko provides transparency into spending, simplifies tracking joint expenses, and helps you work together towards common financial goals like saving for a house or paying off debt, reducing financial stress in your relationship." } },
            { "@type": "Question", "name": "Can we keep some expenses private?", "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. Moneko is designed for real relationships. You can create shared budgets for joint expenses while maintaining separate, private budgets for your personal spending." } },
            { "@type": "Question", "name": "Is this app suitable for unmarried couples?", "acceptedAnswer": { "@type": "Answer", "text": "Yes! Moneko is perfect for any couple who shares finances, whether you're married, engaged, living together, or in a long-term partnership. It’s built for teamwork, no matter your legal status." } }
          ]
        }
      ]
    };

    return {
      meta,
      links: [
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

// Apple-like easing curves following design system

const features = [
  {
    title: "Shared Expense Tracking",
    description: "See who paid for what, settle up easily, and get a clear picture of your joint spending habits.",
    icon: Bell,
    premium: true,
  },
  {
    title: "Joint Savings Goals", 
    description: "Saving for a house, vacation, or wedding? Set joint goals and track your combined progress in real-time.",
    icon: Rocket,
    premium: true,
  },
  {
    title: "Customizable Budgets",
    description: "Create shared budgets for categories like groceries and date nights, while keeping your personal spending separate.", 
    icon: Palette,
    premium: true,
  },
  {
    title: "AI-Powered Insights",
    description: "Our smart AI analyzes your spending patterns and provides helpful insights to optimize your finances as a team.",
    icon: TestTube,
    premium: true,
  },
];

// Early Access FAQ content (kept factual, non-promissory)
const coupleBudgetingFaq = [
  {
    question: "How does a shared budgeting app help couples?",
    answer:
      "A shared budgeting app like Moneko provides transparency into spending, simplifies tracking joint expenses, and helps you work together towards common financial goals like saving for a house or paying off debt, reducing financial stress in your relationship."
  },
  {
    question: "Can we keep some expenses private?",
    answer:
      "Absolutely. Moneko is designed for real relationships. You can create shared budgets for joint expenses while maintaining separate, private budgets for your personal spending."
  },
  {
    question: "Is this app suitable for unmarried couples?",
    answer:
      "Yes! Moneko is perfect for any couple who shares finances, whether you're married, engaged, living together, or in a long-term partnership. It’s built for teamwork, no matter your legal status."
  },
];

const containerVariants = {
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

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as any,
    },
  },
};

// Mobile preview cards data (moved out of JSX for reuse)
const mobilePreview = [
  { src: phone1, title: "Link accounts, view, and manage together", description: "Log groceries, bills, and date nights. See who paid for what, instantly." },
  { src: phone2, title: "Add expenses, split bills fast and fair", description: "Watch your savings for that dream home or vacation grow together." },
  { src: phone3, title: "Get notified, confirm, and stay aligned", description: "Set up shared budgets for joint costs and keep personal spending separate." },
  { src: phone4, title: "Set goals, track, and celebrate together", description: "AI identifies trends and opportunities for you to save more as a team." },
  { src: phone5, title: "Scan receipts in WhatsApp, log automatically", description: "AI identifies trends and opportunities for you to save more as a team." },
];



export default function CoupleBudgetingPage() {
  const navigate = useNavigate();
  
  const questions = {
    budgetingMethodOptions: [
      { value: "separate-accounts", label: "We keep our money completely separate" },
      { value: "shared-account", label: "We share one joint account for everything" },
      { value: "split-bills", label: "We split bills and track who owes what" },
      { value: "allowance-system", label: "One person manages money and gives allowance" },
      { value: "no-system", label: "We don't have a clear system" },
      { value: "apps-currently", label: "We use another budgeting app" },
    ],
    mobileAppPriorities: [
      { id: "expense-splitting", label: "Automatically split shared expenses and bills" },
      { id: "joint-goals", label: "Set and track shared savings goals together" },
      { id: "spending-limits", label: "Set spending limits and get alerts" },
      { id: "fairness-check", label: "See who spends more on what categories" },
      { id: "date-night-budget", label: "Plan and budget for date nights and fun" },
      { id: "emergency-fund", label: "Build emergency fund as a team" },
    ],
    mobileFeatureOptions: [
      { id: "expense-categories", label: "Custom categories for our lifestyle (date nights, shared hobbies)" },
      { id: "bill-reminders", label: "Joint bill payment reminders and tracking" },
      { id: "financial-dates", label: "Schedule regular money discussions and check-ins" },
      { id: "spending-comparison", label: "Compare spending patterns without judgment" },
      { id: "goal-celebrations", label: "Celebrate when we reach shared milestones" },
      { id: "financial-compatibility", label: "Assess our financial compatibility and habits" },
    ],
    referralOptions: [
      { value: "couple-friends", label: "Friends or other couples recommended it" },
      { value: "relationship-advice", label: "Relationship or marriage counselor suggested" },
      { value: "money-arguments", label: "We keep arguing about money" },
      { value: "financial-planning", label: "Planning for marriage, house, or kids" },
      { value: "social-media", label: "Social media (TikTok, Instagram, Reddit)" },
      { value: "search-engine", label: "Search engine (Google, Bing, etc.)" },
      { value: "financial-blog", label: "Financial blog or podcast" },
      { value: "other", label: "Other" },
    ],
  };
  const { user, isAuthenticated } = useAuth();

  // Couple budgeting waitlist hooks
  const { data: userHasClaimed, isLoading: claimStatusLoading } = useCoupleBudgetingUserClaimed(user?.id);
  const joinWaitlistMutation = useJoinCoupleBudgetingWaitlist();
  const onSubmit = async (claim: CoupleBudgetingClaim): Promise<{ success: boolean; message?: string; error?: string }> => {
    console.log("Couple budgeting waitlist claim:", claim);

    try {
      const result = await joinWaitlistMutation.mutateAsync(claim);
      return {
        success: result.success,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      console.error("Error joining couple budgeting waitlist:", error);
      return {
        success: false,
        error: "Failed to join waitlist. Please try again."
      };
    }
  };

  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-900 overflow-hidden">
      {/* Background Beams with Collision - Rotated for meteor effect */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen">
        </BackgroundBeamsWithCollision>
     
      
      {/* Dotted grid pattern overlay - exactly like Uninbox */}
      <DotPattern
        className={cn(
          "fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none z-[1]",
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]"
        )}
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Header - Exact Uninbox style */}
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

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section - Exact Uninbox style */}
        <section className="px-6 py-24 pt-30">
          <motion.div 
            className="max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center">              

              <motion.div className="mb-8" variants={itemVariants}>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-800 dark:text-slate-200 leading-tight tracking-tight">
                Shared Finances
                  <br />
Simplified by AI                </h1>
              </motion.div>

              <motion.p 
                className="mb-10 text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto"
                variants={itemVariants}
              >
                Your AI-powered couple budgeting assistant — anytime, anywhere.
                
              </motion.p>
            
              
              <motion.div className="max-w-xl mx-auto" variants={itemVariants}>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-100/30 via-white/50 to-slate-100/30 dark:from-slate-800/30 dark:via-slate-900/50 dark:to-slate-800/30 rounded-2xl blur-3xl" />
                  <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                    <FreeTrialGiveawayForm questions={questions} onSubmit={onSubmit} userHasClaimedFromDB={userHasClaimed || false} claimStatusLoading={claimStatusLoading} />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>
  
        {/* Mobile App Preview Section */}
        <section className="px-6 py-20 relative overflow-hidden">
          <motion.div 
            className="max-w-7xl mx-auto flex flex-col items-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.div className="text-center mb-16" variants={itemVariants}>
              <h2 className="text-4xl sm:text-5xl font-bold text-slate-800 dark:text-slate-200 tracking-tight mb-6">
                Smarter couple budgeting with AI
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Moneko gives you and your partner a crystal-clear view of your money, so you can make smarter decisions as a team.
              </p>
              <div className="mt-6 mb-4 flex flex-col lg:flex-row gap-3 justify-center">
                <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
            </motion.div>

            {/* Carousel rendering: preserve exact item styles; phone mockup is injected via prop */}
            <Carousel
              className="h-[540px] md:h-[620px] lg:h-[600px] xl:h-[600px] 2xl:h-[700px]"
              items={mobilePreview.map((mockup, index) => (
                <motion.div
                  key={index}
                  className="relative flex flex-col items-center"
                  variants={itemVariants}
                >
                  {/* Content */}
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 -translate-y-8  w-[70%]">
                      {mockup.title}
                    </h3>

                
                </motion.div>
              ))}
              iphoneMockups={mobilePreview.map((mockup) => (
                <motion.div
                  key={(mockup as any).title}
                  className="w-full h-[80%] flex items-end justify-center"
                >
                  <img src={mockup.src} className="h-full w-auto" />
                </motion.div>
              ))}
            />
          </motion.div>

        </section>

        {/* Features Section - Exact Uninbox style */}
        <section className="px-6 py-20">
          <motion.div 
            className="max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.h2 
              className="mb-16 text-center text-4xl sm:text-5xl font-bold text-slate-800 dark:text-slate-200 tracking-tight"
              variants={itemVariants}
            >
              Built for Financial Teamwork
            </motion.h2>

            <div className="grid gap-6 md:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                    variants={itemVariants}
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                        PREMIUM
                      </div>
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-slate-800 dark:text-slate-200">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>
 
        {/* Early Access FAQ (reused component) */}
        <div id="faq">
            <FaqSection faqData={coupleBudgetingFaq} title="Your Questions, Answered" />
        </div>
      </main>
    </div>
  );
}
