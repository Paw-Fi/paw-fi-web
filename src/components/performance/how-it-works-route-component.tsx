import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Users,
  Wallet,
  Mic,
  TrendingUp,
  CheckCircle2,
  Lock,
  ShieldCheck,
  MessageSquare,
  Camera,
  ArrowRight,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { BentoCard } from "@/components/ui/bento-card";
import { HomeHeader } from "@/components/index/header";
import { Footer } from "@/components/homepage/footer";
import { Helmet } from "@dr.pogodin/react-helmet";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { getCurrencySymbolBasedOnTimeZone } from "@/utils/currency-symbols";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataOwnershipSection } from "@/components/sections/data-ownership-section";
import { FaqSection } from "@/components/ui/faq-section";

const META_TITLE = "How Moneko Works - AI Budgeting from Chat to Pockets";
const META_DESCRIPTION =
  "See how Moneko turns WhatsApp messages, receipts, voice notes, and mobile spending signals into reviewed budget entries, Pockets, and shared household views.";

export function HowItWorksRouteComponent() {
  const currencySymbol = getCurrencySymbolBasedOnTimeZone();
  const pageUrl = getCanonicalUrl("/how-it-works");

  const faqData = [
    {
      question: "How does Moneko capture expenses without manual data entry?",
      answer:
        "You can log spending by typing a short message, sending a receipt photo, recording a voice note, or attaching supported files. Moneko extracts key details (like amount, date, and category) and routes you to a review screen so you can confirm or edit before saving.",
    },
    {
      question: "What are Pockets (envelope budgeting) and how do they work?",
      answer:
        "Pockets are digital envelopes for your monthly budget (like Groceries, Bills, Fun, and Goals). You set a total budget, allocate it across pockets, and then spending updates each pocket so you can see what’s left in real time.",
    },
    {
      question: "What’s the difference between Personal and Household mode?",
      answer:
        "Personal mode tracks just your finances. Household mode is for shared budgets and spending with other members, so you can manage joint expenses and see shared dashboards.",
    },
    {
      question: "Can I plan for recurring bills and income?",
      answer:
        "Yes. The Recurring area is designed for transactions you don’t want to re-enter every month—like rent, subscriptions, utilities, and salary. You can add, edit, and delete recurring items.",
    },
    {
      question: "What is AI Scenario Planning and what can I use it for?",
      answer:
        "Scenario Planning lets you ask “what if?” questions in plain language and pick a target date. Moneko responds with a structured answer and can save scenarios so you can revisit them later.",
    },
    {
      question: "What can the WhatsApp assistant do?",
      answer:
        "From WhatsApp, you can log expenses or income, send receipt photos, send voice notes, request spending summaries, and check your budgets and pockets. When needed, the assistant can ask clarifying questions or present quick-reply buttons to keep chat fast.",
    },
    {
      question:
        "Do I need to verify my WhatsApp number (and is it included in every plan)?",
      answer:
        "To protect your account, WhatsApp usage requires verifying your WhatsApp number through the in-app verification flow. WhatsApp access may also be subscription-gated depending on your plan.",
    },
    {
      question: "Does Moneko support multi-currency budgeting?",
      answer:
        "Yes. You can switch your current currency view so budgeting, charts, and totals stay consistent when you spend across multiple currencies.",
    },
    {
      question: "Can I use widgets and notifications?",
      answer:
        "Moneko can optionally provide home screen widgets for quick budget and pocket views, plus quick actions like starting a quick-add. You can also enable notifications so important updates (including household-related events) reach you outside the app.",
    },
  ];

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
            { "@type": "ListItem", position: 2, name: "How It Works" },
          ],
        },
      },
      {
        "@type": "HowTo",
        name: "How to Use Moneko for AI Budgeting",
        description: META_DESCRIPTION,
        step: [
          {
            "@type": "HowToStep",
            name: "Choose a budget mode",
            text: "Choose between Personal or Household mode to manage private or shared finances.",
          },
          {
            "@type": "HowToStep",
            name: "Capture spending",
            text: "Log expenses using voice notes, text messages, receipt photos, or supported files.",
          },
          {
            "@type": "HowToStep",
            name: "Budget with Pockets",
            text: "Allocate your monthly budget into digital envelopes (Pockets) to give every dollar a job.",
          },
          {
            "@type": "HowToStep",
            name: "Review insights and scenarios",
            text: "Use AI scenario planning to ask what-if questions and review possible budget outcomes.",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        url: pageUrl,
        name: "Moneko How It Works FAQ",
        mainEntity: faqData.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
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
                <CheckCircle2 className="h-3 w-3 fill-current" />
                The Moneko Workflow
              </span>
              <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 md:text-7xl dark:text-white">
                Budgeting that doesn't <br />
                <span className="text-slate-500 dark:text-slate-400">
                  feel like work.
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
                Most apps demand hours of manual entry. Moneko focuses on fast
                capture, clear envelopes, and instant answers so you can get on
                with your life.
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

        {/* Bento Grid: The 4 Steps */}
        <section className="mb-32 grid auto-rows-[auto] grid-cols-1 gap-6 md:auto-rows-[550px] md:grid-cols-3">
          {/* Step 1: Setup (Wide) */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-200 bg-gray-50 md:col-span-2 md:flex-row dark:border-gray-800 dark:bg-gray-900">
            <div className="relative z-10 order-2 flex flex-1 flex-col justify-center p-8 md:order-1 md:p-12">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-black dark:text-white">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Context Matters.
              </h3>
              <p className="max-w-sm text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Start by choosing between <strong>Personal</strong> or{" "}
                <strong>Household</strong> mode. Manage your own spending
                privately, or track shared bills with a partner using
                multi-currency support.
              </p>
            </div>
            <div className="relative order-1 flex min-h-[350px] flex-1 items-center justify-center bg-gradient-to-b from-transparent to-black/5 p-8 md:order-2 md:min-h-auto dark:to-white/5">
              <SetupVisual />
            </div>
          </BentoCard>

          {/* Step 2: Capture (Tall) */}
          <BentoCard className="relative flex flex-col overflow-hidden border border-gray-200 bg-white pt-8 dark:border-gray-800 dark:bg-black">
            <div className="z-10 w-full shrink-0 px-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                <Mic className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Fast Capture
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400">
                Don't fill forms. Just tell us what happened via Text, Voice, or
                Receipt Photo.
              </p>
            </div>
            <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden p-8">
              <CaptureVisual currencySymbol={currencySymbol} />
            </div>
          </BentoCard>

          {/* Step 3: Pockets (Tall) */}
          <BentoCard className="xs:col-span-1 relative flex flex-col justify-between overflow-hidden border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-black">
            <div className="z-10">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                <Wallet className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Pockets System
              </h3>
              <p className="mb-6 text-base text-slate-500 dark:text-slate-400">
                Give every dollar a job. Split your budget into envelopes for
                Rent, Fun, and Goals.
              </p>
            </div>
            <div className="flex w-full flex-1 items-end justify-center">
              <PocketsVisual currencySymbol={currencySymbol} />
            </div>
          </BentoCard>

          {/* Step 4: Insights (Wide) */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-200 bg-slate-100 md:col-span-2 md:flex-row-reverse dark:border-gray-800 dark:bg-gray-800/50">
            <div className="relative z-10 flex flex-1 flex-col justify-center p-8 md:p-12">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-black dark:text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Ask, don't calculate.
              </h3>
              <p className="max-w-md text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Use Scenario Planning to ask "What if?" questions. Moneko
                forecasts your future balance instantly.
              </p>
            </div>
            <div className="relative flex min-h-[300px] flex-1 items-center justify-center bg-gradient-to-t from-transparent to-white/50 p-8 dark:to-black/50">
              <InsightsVisual currencySymbol={currencySymbol} />
            </div>
          </BentoCard>
        </section>

        {/* WhatsApp Integration Section - Science Style */}
        <section className="container mx-auto border-t border-slate-100 px-4 py-24 dark:border-slate-800">
          <div className="mx-auto max-w-4xl space-y-12">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-[#25D366]/20 bg-[#25D366]/5 text-[#25D366] dark:bg-[#25D366]/10"
                >
                  WhatsApp Integrated
                </Badge>
              </div>
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                Moneko lives in your chat.
              </h2>
              <p className="mx-auto max-w-2xl text-slate-600 dark:text-slate-400">
                No need to open the app. Add transactions, check budgets, and
                get summaries right from WhatsApp.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-black">
                  <MessageSquare className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                  Instant Logging
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  "Spent {currencySymbol}12 on lunch." It's categorized and
                  saved instantly.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-black">
                  <Wallet className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                  Budget Checks
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  "How much for groceries?" Get real-time updates on your
                  pockets.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-black">
                  <TrendingUp className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                </div>
                <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                  Visual Charts
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ask for a spending graph and get a visual chart directly in
                  the chat.
                </p>
              </div>
            </div>

            <div className="text-center">
              <Link to="/features/whatsapp-assistant">
                <div className="hover:text-primary group inline-flex cursor-pointer items-center text-sm font-medium text-slate-900 transition-colors dark:text-white">
                  Explore WhatsApp Assistant{" "}
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Data Ownership Section - Trust & Safety */}
        <DataOwnershipSection />

        <div className="border-t border-slate-100 dark:border-slate-800">
          <FaqSection faqData={faqData} title="How Moneko Works: FAQ" />
        </div>

        {/* Bottom CTA */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ready for a simpler system?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-slate-600 dark:text-slate-400">
            Try a clearer workflow for tracking money with less manual work.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AppleDownloadButton />
            <AndroidDownloadButton />
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Private by Default
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Secure Encryption
            </span>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// --- Visual Components (Minimalist Aesthetic) ---

function SetupVisual() {
  return (
    <div className="relative w-full max-w-sm rotate-1 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl transition-transform duration-500 hover:rotate-0 dark:border-slate-700 dark:bg-slate-800">
      <div className="mx-auto mb-8 flex w-fit items-center justify-between rounded-full bg-slate-100 p-1 dark:bg-slate-900">
        <div className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          Personal
        </div>
        <div className="cursor-default rounded-full px-5 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          Household
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            $
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Base Currency
            </div>
            <div className="font-semibold text-slate-900 dark:text-white">
              USD ($)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Setup
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Solo Workspace
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaptureVisual({ currencySymbol }: { currencySymbol: string }) {
  return (
    <div className="flex w-full max-w-[280px] flex-col gap-4">
      <motion.div
        className="relative z-30 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        initial={{ x: -10, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="text-xs">
          <span className="text-slate-400">Text: </span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            "Lunch {currencySymbol}15"
          </span>
        </div>
      </motion.div>

      <motion.div
        className="relative z-20 ml-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        initial={{ x: 10, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <Mic className="h-4 w-4" />
        </div>
        <div className="text-xs">
          <span className="text-slate-400">Voice: </span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            Processing...
          </span>
        </div>
      </motion.div>

      <motion.div
        className="relative z-10 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        initial={{ y: 10, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <Camera className="h-4 w-4" />
        </div>
        <div className="text-xs">
          <span className="text-slate-400">Scan: </span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            Total {currencySymbol}43.20
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function PocketsVisual({ currencySymbol }: { currencySymbol: string }) {
  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-inner dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Monthly Budget
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {currencySymbol}3,200
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {[
          { name: "Needs", val: 75 },
          { name: "Fun", val: 45 },
          { name: "Goals", val: 10 },
        ].map((item, i) => (
          <div key={i}>
            <div className="mb-2 flex justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {item.name}
              </span>
              <span className="text-slate-400">{item.val}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <motion.div
                className="h-full bg-slate-900 dark:bg-white"
                initial={{ width: 0 }}
                whileInView={{ width: `${item.val}%` }}
                transition={{ duration: 1, delay: i * 0.2 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsVisual({ currencySymbol }: { currencySymbol: string }) {
  return (
    <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-black">
      <div className="space-y-6">
        <div className="rounded-xl rounded-tl-none border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Based on your current savings, you'll hit your goal by{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              November 12th
            </span>
            .
          </p>
        </div>

        <div className="flex h-24 items-end gap-2 px-2">
          <div className="h-[40%] w-1/4 rounded-t-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-[60%] w-1/4 rounded-t-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-[80%] w-1/4 rounded-t-lg bg-slate-300 dark:bg-slate-600" />
          <div className="group relative h-[100%] w-1/4 rounded-t-lg bg-slate-900 dark:bg-white">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white dark:text-black">
              Goal
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-xs text-slate-400">AI Forecasting</div>
        </div>
      </div>
    </div>
  );
}
