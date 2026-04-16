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
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import {
  ArcTimeline,
  type ArcTimelineItem,
} from "@/components/ui/arc-timeline";
import { FaqSection } from "@/components/ui/faq-section";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import { cn } from "@/lib/utils";
import phone1 from "@assets/images/couple-budgeting/1.png";
import phone2 from "@assets/images/couple-budgeting/2.png";
import phone3 from "@assets/images/couple-budgeting/3.png";
import phone4 from "@assets/images/couple-budgeting/4.png";
import phone5 from "@assets/images/couple-budgeting/5.png";

import { MonekoIcon } from "@/components/shared/moneko-icon";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";

export const Route = createFileRoute("/couple-budgeting")({
  component: CoupleBudgetingPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/couple-budgeting");
    const title = "Budgeting App for Couples | Moneko | Manage Money Together";
    const description =
      "Stop arguing about money and start achieving your financial goals together. Moneko is a budgeting app designed for couples in the US, Canada, and worldwide.";
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
          name: "Moneko",
          url: "https://moneko.io",
          logo: "https://moneko.io/icon.svg",
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          url: "https://moneko.io",
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
                name: "Couple Budgeting App",
                item: pageUrl,
              },
            ],
          },
          inLanguage: "en-US",
          primaryImageOfPage: "https://moneko.io/og-img-couple-budgeting.png",
        },
        {
          "@type": "SoftwareApplication",
          name: "Moneko: Budgeting for Couples",
          applicationCategory: "FinanceApplication",
          operatingSystem: "iOS, Android",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          description:
            "The AI-powered mobile app that helps couples budget, track shared expenses, and save for joint goals together.",
        },
        {
          "@type": "FAQPage",
          "@id": pageUrl + "#faq",
          mainEntity: [
            {
              "@type": "Question",
              name: "How does a shared budgeting app help couples?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A shared budgeting app like Moneko provides transparency into spending, simplifies tracking joint expenses, and helps you work together towards common financial goals like saving for a house or paying off debt, reducing financial stress in your relationship.",
              },
            },
            {
              "@type": "Question",
              name: "Can we keep some expenses private?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Absolutely. Moneko is designed for real relationships. You can create shared budgets for joint expenses while maintaining separate, private budgets for your personal spending.",
              },
            },
            {
              "@type": "Question",
              name: "Is this app suitable for unmarried couples?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes! Moneko is perfect for any couple who shares finances, whether you're married, engaged, living together, or in a long-term partnership. It’s built for teamwork, no matter your legal status.",
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
    title: "Shared Expense Tracking",
    description:
      "See who paid for what, settle up easily, and get a clear picture of your joint spending habits.",
    icon: Bell,
    premium: true,
  },
  {
    title: "Joint Savings Goals",
    description:
      "Saving for a house, vacation, or wedding? Set joint goals and track your combined progress in real-time.",
    icon: Rocket,
    premium: true,
  },
  {
    title: "Customizable Budgets",
    description:
      "Create shared budgets for categories like groceries and date nights, while keeping your personal spending separate.",
    icon: Palette,
    premium: true,
  },
  {
    title: "AI-Powered Insights",
    description:
      "Our smart AI analyzes your spending patterns and provides helpful insights to optimize your finances as a team.",
    icon: TestTube,
    premium: true,
  },
];

// FAQ content (kept factual, non-promissory)
const coupleBudgetingFaq = [
  {
    question: "How does a shared budgeting app help couples?",
    answer:
      "A shared budgeting app like Moneko provides transparency into spending, simplifies tracking joint expenses, and helps you work together towards common financial goals like saving for a house or paying off debt, reducing financial stress in your relationship.",
  },
  {
    question: "Can we keep some expenses private?",
    answer:
      "Absolutely. Moneko is designed for real relationships. You can create shared budgets for joint expenses while maintaining separate, private budgets for your personal spending.",
  },
  {
    question: "Is this app suitable for unmarried couples?",
    answer:
      "Yes! Moneko is perfect for any couple who shares finances, whether you're married, engaged, living together, or in a long-term partnership. It’s built for teamwork, no matter your legal status.",
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
    title: "Link accounts, view, and manage together",
    description:
      "Log groceries, bills, and date nights. See who paid for what, instantly.",
  },
  {
    src: phone2,
    title: "Add expenses, split bills fast and fair",
    description:
      "Watch your savings for that dream home or vacation grow together.",
  },
  {
    src: phone3,
    title: "Get notified, confirm, and stay aligned",
    description:
      "Set up shared budgets for joint costs and keep personal spending separate.",
  },
  {
    src: phone4,
    title: "Set goals, track, and celebrate together",
    description:
      "AI identifies trends and opportunities for you to save more as a team.",
  },
  {
    src: phone5,
    title: "Scan receipts in WhatsApp, log automatically",
    description:
      "AI identifies trends and opportunities for you to save more as a team.",
  },
];

function CoupleBudgetingPage() {
  const navigate = useNavigate();

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
                  Shared Finances
                  <br />
                  Simplified by AI{" "}
                </h1>
              </motion.div>

              <motion.p
                className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-400"
                variants={itemVariants}
              >
                Your AI-powered couple budgeting assistant — anytime, anywhere.
              </motion.p>

              <motion.div
                className="mx-auto flex max-w-xl flex-col items-center gap-3"
                variants={itemVariants}
              >
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <AppleDownloadButton />
                  <AndroidDownloadButton />
                </div>
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  Prefer to learn more first? See how it works on the homepage.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Mobile App Preview Section */}
        <section className="relative overflow-hidden px-6 py-20">
          <motion.div
            className="mx-auto flex max-w-7xl flex-col items-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.div className="mb-16 text-center" variants={itemVariants}>
              <h2 className="mb-6 text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl dark:text-slate-200">
                Smarter couple budgeting with AI
              </h2>
              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                Moneko gives you and your partner a crystal-clear view of your
                money, so you can make smarter decisions as a team.
              </p>
              <div className="mt-6 mb-4 flex flex-col justify-center gap-3 lg:flex-row">
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
                  <h3 className="w-[70%] -translate-y-8 text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {mockup.title}
                  </h3>
                </motion.div>
              ))}
              iphoneMockups={mobilePreview.map((mockup) => (
                <motion.div
                  key={(mockup as any).title}
                  className="flex h-[80%] w-full items-end justify-center"
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
              Built for Financial Teamwork
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

        {/* FAQ */}
        <div id="faq">
          <FaqSection
            faqData={coupleBudgetingFaq}
            title="Your Questions, Answered"
          />
        </div>
      </main>
    </div>
  );
}
