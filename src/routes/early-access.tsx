"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Camera,
  Shield,
  Smartphone,
  Check,
  Code,
  Rocket,
  Palette,
  TestTube,
} from "lucide-react";
import { motion } from "framer-motion";
import { FreeTrialGiveawayForm } from "@/components/forms/FreeTrialGiveawayForm";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import {
  ArcTimeline,
  type ArcTimelineItem,
} from "@/components/ui/arc-timeline";
import { FaqSection } from "@/components/ui/faq-section";
import { MobileAppPreviewCarousel } from "@/components/shared/mobile-app-preview-carousel";
import { cn } from "@/lib/utils";
import phone1 from "@assets/images/early-access/Mobile-Screen1.png";
import phone2 from "@assets/images/early-access/Mobile-Screen2.png";
import phone3 from "@assets/images/early-access/Mobile-Screen3.png";
import phone4 from "@assets/images/early-access/Mobile-Screen4.png";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { APP_STORE_RATING, TOTAL_REVIEW_COUNT } from "@/data/app-store-reviews";
import {
  createMonekoFreeOffer,
  monekoAggregateRating,
  monekoAvailableLanguages,
  monekoFeaturedReview,
} from "@/utils/app-schema";

import {
  claimEarlyAccessSpot,
  type EarlyAccessClaim,
} from "@/lib/early-access";
import { useUserHasClaimed } from "@/hooks/use-early-access";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/early-access")({
  component: EarlyAccessPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/early-access");
    const title = "Moneko AI Budgeting App";
    const description = `Download Moneko’s AI budgeting app. Track goals, manage money, and get smart insights with the power of AI on the App Store and Google Play.`;
    const keywords =
      "moneko mobile app, ai budgeting app, personal finance app, budgeting and expense tracking, goal tracker app, money management tools, whatsapp expense tracker";

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          name: "Moneko",
          alternateName: "Moneko App",
          url: "https://moneko.io",
          logo: "https://moneko.io/icon.svg",
          description: "AI-powered personal finance coach and budgeting app",
          sameAs: [
            "https://www.facebook.com/monekoai/",
            "https://www.instagram.com/moneko_ai",
            "https://x.com/moneko_ai",
          ],
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          alternateName: "Moneko - AI Personal Finance Coach",
          url: "https://moneko.io",
          description:
            "The official website of Moneko, your AI personal finance coach and budgeting app",
          publisher: { "@id": "https://moneko.io/#organization" },
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: title,
          description: description,
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
                name: "Moneko Early Access",
                item: pageUrl,
              },
            ],
          },
          inLanguage: "en-US",
          primaryImageOfPage: "https://moneko.io/og-img.png",
        },
        {
          "@type": "SoftwareApplication",
          name: "Moneko Mobile App",
          applicationCategory: "FinanceApplication",
          operatingSystem: "iOS, Android",
          availableLanguage: monekoAvailableLanguages,
          offers: createMonekoFreeOffer(pageUrl),
          aggregateRating: monekoAggregateRating,
          review: monekoFeaturedReview,
          description:
            "Moneko's AI-powered mobile budgeting and personal finance app",
        },
        {
          "@type": "FAQPage",
          "@id": pageUrl + "#faq",
          mainEntity: [
            {
              "@type": "Question",
              name: "Is the Moneko mobile app available?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Moneko is available on iOS and Android.",
              },
            },
            {
              "@type": "Question",
              name: "What can I do with Moneko?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Track expenses, organize budgets with Pockets, manage shared spending with Household Mode, and get AI-powered insights.",
              },
            },
            {
              "@type": "Question",
              name: "Where can I download Moneko?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Use the download links on https://moneko.io/download.",
              },
            },
          ],
        },
      ],
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
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
    title: "Smart Budget Notifications",
    description:
      "Planned: Helpful alerts when you're approaching budget limits or spending goals.",
    icon: Bell,
    premium: true,
  },
  {
    title: "Photo Receipt Capture",
    description:
      "Planned: Track expenses by snapping receipts. AI will help categorize spending.",
    icon: Camera,
    premium: true,
  },
  {
    title: "Biometric Security",
    description:
      "Planned: Sign in with device-level biometrics and encrypted mobile storage.",
    icon: Shield,
    premium: true,
  },
  {
    title: "Offline Budget Access",
    description:
      "Planned: View budgets and track expenses without an internet connection.",
    icon: Smartphone,
    premium: true,
  },
];

const earlyAccessFaq = [
  {
    question: "Is Moneko available on iPhone and Android?",
    answer:
      "Yes. Moneko is available on iOS and Android. Use the download links on this page to get started.",
  },
  {
    question: "What can I do with Moneko?",
    answer:
      "Track expenses, organize budgets with Pockets, manage shared spending with Household Mode, and get AI-powered insights.",
  },
  {
    question: "How do I get started?",
    answer:
      "Download the app, create an account, and start logging expenses. If you prefer, you can also explore how it works on the website.",
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
  {
    src: phone1,
    title: "Chat with AI to log expenses instantly.",
    description: "Log expenses or income with natural language and quick taps.",
  },
  {
    src: phone2,
    title: "AI tracks, sorts, and surfaces top spending.",
    description: "Automatically categorize spending and show top categories.",
  },
  {
    src: phone3,
    title: "Stay notified on paychecks and bills.",
    description: "Get notified about upcoming paychecks and bills.",
  },
  {
    src: phone4,
    title: "Set goals, track growth, celebrate success.",
    description: "Set, track, and celebrate your financial milestones.",
  },
];

function DevelopmentTimeline() {
  const timelineData: ArcTimelineItem[] = [
    {
      time: "Getting Started",
      steps: [
        {
          icon: <Palette className="h-6 w-6" />,
          content: "Download Moneko on iOS or Android.",
        },
        {
          icon: <Check className="h-6 w-6" />,
          content: "Create an account and set up your first Pocket budget.",
        },
      ],
    },
    {
      time: "Daily Use",
      steps: [
        {
          icon: <Code className="h-6 w-6" />,
          content: "Log expenses fast (text, voice, photos, and more).",
        },
        {
          icon: <Camera className="h-6 w-6" />,
          content: "Let AI categorize and summarize your spending.",
        },
      ],
    },
    {
      time: "Keep Improving",
      steps: [
        {
          icon: <TestTube className="h-6 w-6" />,
          content: "We ship improvements frequently based on feedback.",
        },
        {
          icon: <Bell className="h-6 w-6" />,
          content: "Turn on notifications for budget awareness (optional).",
        },
        {
          icon: <Rocket className="h-6 w-6" />,
          content: "Try the latest version from your app store.",
        },
      ],
    },
  ];

  return (
    <motion.div
      className="mx-auto w-full max-w-4xl"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="relative">
        <ArcTimeline
          data={timelineData}
          className="mb-4"
          defaultActiveStep={{ time: "Beta & Launch", stepIndex: 2 }}
          arcConfig={{
            circleWidth: 5000,
            angleBetweenMinorSteps: 0.35,
            lineCountFillBetweenSteps: 10,
            boundaryPlaceholderLinesCount: 50,
          }}
        />
      </div>
    </motion.div>
  );
}

function CommunityGrowth({ userCount }: { userCount: number }) {
  return (
    <motion.div
      className="mx-auto w-full max-w-md text-center"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-6">
        <motion.div
          className="mb-2 text-4xl font-bold text-slate-800 dark:text-slate-200"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.3, delay: 0.2 }}
        >
          {userCount.toLocaleString()}+
        </motion.div>
        <div className="mb-4 text-lg font-medium text-slate-600 dark:text-slate-400">
          Users waiting for mobile access
        </div>
      </div>
    </motion.div>
  );
}

function EarlyAccessPage() {
  const navigate = useNavigate();

  const questions = {
    budgetingMethodOptions: [
      { value: "manual-tracking", label: "Manual tracking (pen and paper)" },
      { value: "spreadsheets", label: "Spreadsheets (Excel, Google Sheets)" },
      { value: "other-apps", label: "Other budgeting apps" },
      { value: "no-system", label: "No organized system currently" },
      { value: "bank-tools", label: "Bank's budgeting tools" },
    ],
    mobileAppPriorities: [
      { id: "quick-expense-tracking", label: "Quick expense entry on-the-go" },
      {
        id: "budget-notifications",
        label: "Push notifications for budget alerts",
      },
      { id: "goal-progress", label: "Real-time goal progress tracking" },
      { id: "offline-access", label: "Offline budget access" },
      { id: "receipt-scanning", label: "Photo receipt capture" },
      { id: "biometric-security", label: "Secure biometric login" },
    ],
    mobileFeatureOptions: [
      { id: "push-notifications", label: "Smart push notifications" },
      { id: "photo-receipts", label: "AI-powered receipt scanning" },
      { id: "biometric-login", label: "Face ID / Touch ID login" },
      { id: "watch-integration", label: "Apple Watch / Wear OS integration" },
      { id: "offline-mode", label: "Full offline functionality" },
      { id: "widget-support", label: "Home screen budget widgets" },
    ],
    referralOptions: [
      { value: "search", label: "Search Engine (Google, Bing, etc.)" },
      { value: "social", label: "Social Media (TikTok, Instagram, etc.)" },
      { value: "friend", label: "Friend or family recommendation" },
      { value: "blog", label: "Blog or news article" },
      { value: "youtube", label: "YouTube" },
      { value: "podcast", label: "Podcast" },
      { value: "other", label: "Other" },
    ],
  };

  const onSubmit = (claim: EarlyAccessClaim) => claimEarlyAccessSpot(claim);
  const { user, isAuthenticated } = useAuth();

  const { data: userHasClaimedFromDB = false, isLoading: claimStatusLoading } =
    useUserHasClaimed(user?.id);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-gray-900">
      {/* Background Beams with Collision - Rotated for meteor effect */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen"></BackgroundBeamsWithCollision>

      {/* Dotted grid pattern overlay - exactly like Uninbox */}
      <DotPattern
        className={cn(
          "pointer-events-none fixed inset-0 z-[1] opacity-30 dark:opacity-15",
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]",
        )}
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Header - Exact Uninbox style */}
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
        {/* Hero Section - Exact Uninbox style */}
        <section className="px-6 py-24 pt-30">
          <motion.div
            className="mx-auto max-w-4xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center">
              <motion.div className="mb-8" variants={itemVariants}>
                <h1 className="text-5xl leading-tight font-bold tracking-tight text-slate-800 sm:text-6xl lg:text-7xl dark:text-slate-200">
                  Smart Budgeting
                  <br />
                  <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
                    Powered by AI
                  </span>
                </h1>
              </motion.div>

              <motion.p
                className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-400"
                variants={itemVariants}
              >
                Your AI budgeting assistant, in your pocket. Rated{" "}
                {APP_STORE_RATING}/5 on the App Store with {TOTAL_REVIEW_COUNT}+
                total reviews. Learn{" "}
                <a
                  className="font-semibold underline"
                  href="/how-it-works"
                  target="_blank"
                >
                  how it works
                </a>
                .
              </motion.p>

              <motion.div className="mb-16" variants={itemVariants}>
                <DevelopmentTimeline />
              </motion.div>

              <motion.div className="mx-auto max-w-xl" variants={itemVariants}>
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-slate-100/30 via-white/50 to-slate-100/30 blur-3xl dark:from-slate-800/30 dark:via-slate-900/50 dark:to-slate-800/30" />
                  <div className="relative rounded-2xl border border-slate-200/50 bg-white/80 p-8 shadow-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
                    <FreeTrialGiveawayForm
                      questions={questions}
                      onSubmit={onSubmit}
                      userHasClaimedFromDB={userHasClaimedFromDB}
                      claimStatusLoading={claimStatusLoading}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <MobileAppPreviewCarousel
          className="px-6"
          title="What You Can Do with Moneko Mobile"
          description="Experience seamless budgeting on your phone with AI-powered features designed for your financial success."
          slides={mobilePreview}
          showDownloadButtons={false}
        />

        {/* Features Section - Exact Uninbox style */}
        <section className="px-6 py-20">
          <motion.div
            className="mx-auto max-w-5xl"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.h2
              className="mb-16 text-center text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl dark:text-slate-200"
              variants={itemVariants}
            >
              Planned Mobile Budgeting Features
            </motion.h2>

            <div className="grid gap-6 md:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md sm:p-8 dark:border-slate-700/50 dark:bg-slate-800 dark:hover:border-slate-600"
                    variants={itemVariants}
                    whileHover={{ y: -2 }}
                  >
                    <div className="mb-6 flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
                        <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase dark:bg-slate-200 dark:text-slate-800">
                        PREMIUM
                      </div>
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-slate-800 dark:text-slate-200">
                      {feature.title}
                    </h3>
                    <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* Early Access FAQ (reused component) */}
        <div id="faq">
          <FaqSection faqData={earlyAccessFaq} title="Early Access FAQ" />
        </div>
      </main>
    </div>
  );
}
