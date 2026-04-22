"use client";

import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Users,
  Split,
  HeartHandshake,
  ShieldCheck,
  ArrowRightLeft,
  Lock,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { cn } from "@/lib/utils";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { Badge } from "@/components/ui/badge";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import ThreeMonekos from "@/assets/images/index/3-moneko.svg";
import { BentoCard } from "@/components/ui/bento-card";

// SEO & Meta Imports
import { Helmet } from "@dr.pogodin/react-helmet";
import {
  createMonekoFreeOffer,
  monekoAggregateRating,
  monekoAvailableLanguages,
  monekoFeaturedReview,
} from "@/utils/app-schema";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { HomeHeader } from "@/components/index/header";

const META_TITLE =
  "Joint Expense Tracker & Budgeting for Couples | Moneko Household";
const META_DESCRIPTION =
  "Use Moneko Household Mode to track shared bills, split expenses fairly, manage joint savings, and keep personal spending separate from shared budgets.";
const META_KEYWORDS =
  "joint expense tracker, couples budgeting app, shared household finances, bill splitter for partners, joint budget planner, finance app for couples, split rent and utilities";

export function HouseholdModeRouteComponent() {
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl("/features/household-mode");

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
            { "@type": "ListItem", position: 3, name: "Household Mode" },
          ],
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Moneko Household Mode",
        applicationCategory: "FinanceApplication",
        operatingSystem: "iOS, Android",
        description:
          "Collaborative financial tool for couples to manage joint expenses and shared household budgets.",
        availableLanguage: monekoAvailableLanguages,
        offers: createMonekoFreeOffer(pageUrl),
        aggregateRating: monekoAggregateRating,
        review: monekoFeaturedReview,
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "Can my partner see my personal spending in Household Mode?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Moneko is private by default. Your partner can only see transactions that you explicitly add to the Shared Household space.",
            },
          },
          {
            "@type": "Question",
            name: "How does Moneko handle fair bill splitting?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Moneko allows you to split bills by percentage, exact amounts, or shares, making it easy to adjust for different income levels.",
            },
          },
        ],
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
                <Users className="h-3 w-3 fill-current" />
                Collaborative Finance for Couples
              </span>
              <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 md:text-7xl dark:text-white">
                Manage{" "}
                <span className="text-slate-500 dark:text-slate-400">Ours</span>{" "}
                <br />
                without losing{" "}
                <span className="relative text-gray-400 dark:text-gray-600">
                  Yours.
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
                Stop the "who owes whom?" texts. Moneko is the{" "}
                <strong>joint expense tracker</strong> that keeps shared bills
                separate from personal spending, giving couples a transparent,
                calmer picture of their financial life.
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
        <section className="mb-32 grid auto-rows-[auto] grid-cols-1 gap-6 md:auto-rows-[550px] md:grid-cols-3">
          {/* Card 1: The Orbit (Wide) */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-200 bg-gray-50 md:col-span-2 md:flex-row dark:border-gray-800 dark:bg-gray-900">
            <div className="relative z-10 order-2 flex flex-1 flex-col justify-center p-8 md:order-1 md:p-12">
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Unified Household Hub.
              </h3>
              <p className="max-w-sm text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Track joint expenses like mortgage, utilities, and groceries in
                a single view. See who paid what instantly.
              </p>
            </div>
            <div className="relative order-1 flex min-h-[400px] flex-1 items-center justify-center bg-gradient-to-b from-transparent to-black/5 p-8 md:order-2 md:min-h-auto dark:to-white/5">
              <HouseholdOrbitVisual />
            </div>
          </BentoCard>

          {/* Card 2: Fair Splitting (Tall) */}
          <BentoCard className="relative flex flex-col overflow-hidden border border-gray-200 bg-white pt-8 dark:border-gray-800 dark:bg-black">
            <div className="z-10 w-full shrink-0 px-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                <Split className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Split Fairly
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400">
                50/50? Percentage of income? Custom shares? You choose how to
                split every bill.
              </p>
            </div>
            <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden p-8">
              <FairSplittingVisual />
            </div>
          </BentoCard>

          {/* Card 3: Instant Settlement (Tall) */}
          <BentoCard className="xs:col-span-1 relative flex flex-col justify-between overflow-hidden border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-black">
            <div className="z-10">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                One-Tap Settle Up
              </h3>
              <p className="mb-6 text-base text-slate-500 dark:text-slate-400">
                Moneko tallies the debt. Settle a whole month of expenses with
                one transfer.
              </p>
            </div>
            <div className="flex flex-1 items-end justify-center">
              <InstantSettlementVisual />
            </div>
          </BentoCard>

          {/* Card 4: Privacy (Wide) */}
          <BentoCard className="flex flex-col overflow-hidden border border-gray-200 bg-slate-100 md:col-span-2 md:flex-row-reverse dark:border-gray-800 dark:bg-gray-800/50">
            <div className="relative z-10 flex flex-1 flex-col justify-center p-8 md:p-12">
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Total Autonomy.
              </h3>
              <p className="max-w-md text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Your personal spending is yours. Only transactions you
                explicitly 'share' enter the household view.
              </p>
            </div>
            <div className="relative flex min-h-[300px] flex-1 items-center justify-center bg-gradient-to-t from-transparent to-white/50 p-8 dark:to-black/50">
              <PrivateByDefaultVisual />
            </div>
          </BentoCard>
        </section>

        {/* Methodology Section */}
        <section className="container mx-auto border-t border-slate-100 px-4 py-24 dark:border-slate-800">
          <div className="mx-auto max-w-3xl space-y-12">
            <div className="text-center">
              <h2 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
                The Science of Shared Finances
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Why shared budgets work better when personal spending stays
                private.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-slate-700 dark:text-slate-300" />
                <div>
                  <h3 className="mb-1 font-bold text-slate-900 dark:text-white">
                    Reduces Money Conflict
                  </h3>
                  <p className="text-sm text-slate-500">
                    Automated tracking removes the 'nag factor' from
                    relationship finances.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-slate-700 dark:text-slate-300" />
                <div>
                  <h3 className="mb-1 font-bold text-slate-900 dark:text-white">
                    Joint Goal Alignment
                  </h3>
                  <p className="text-sm text-slate-500">
                    Collaborate on large purchases like homes or vacations with
                    shared 'Pockets'.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ready to team up?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-slate-600 dark:text-slate-400">
            Track shared bills, settle reimbursements, and keep personal budgets
            private.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <AppleDownloadButton />
            <AndroidDownloadButton />
          </div>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Explore more:{" "}
            <a
              href="/shared-expense-tracker"
              className="text-primary underline underline-offset-4"
            >
              shared expense tracker
            </a>{" "}
            or{" "}
            <a
              href="/family-budgeting-app"
              className="text-primary underline underline-offset-4"
            >
              family budgeting app
            </a>
            .
          </p>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Private by Default
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Shared Expense Controls
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

// --- Visual Components ---

const FeatureTag = ({ label }: { label: string }) => (
  <div className="relative flex h-full !w-64 items-center justify-center">
    <span
      aria-hidden="true"
      className="block h-2 w-2 rounded-full bg-slate-900 shadow-sm dark:bg-white"
    />
    <Badge
      aria-label={label}
      variant="outline"
      className="absolute left-full ml-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium whitespace-nowrap text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
    >
      {label}
    </Badge>
  </div>
);

const HouseholdOrbitVisual = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionSpeed = prefersReducedMotion ? 0 : 1;

  return (
    <div className="relative flex h-full min-h-[300px] w-full items-center justify-center overflow-hidden">
      <div className="relative flex scale-110 items-center justify-center">
        <div className="relative z-10 rounded-full border border-slate-100 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <img
            src={ThreeMonekos}
            className="h-20 w-auto grayscale"
            alt="Household Hub"
          />
        </div>

        <OrbitingCircles
          iconSize={40}
          radius={80}
          duration={30}
          path
          speed={motionSpeed}
        >
          <Avatar className="h-12 w-12 border-2 border-white shadow-sm grayscale">
            <AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <Avatar className="h-12 w-12 border-2 border-white shadow-sm grayscale">
            <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" />
            <AvatarFallback>B</AvatarFallback>
          </Avatar>
        </OrbitingCircles>

        <OrbitingCircles
          iconSize={10}
          radius={140}
          duration={40}
          reverse
          path
          speed={motionSpeed}
        >
          <FeatureTag label="Rent Split" />
          <FeatureTag label="Joint Savings" />
          <FeatureTag label="Shared Bills" />
          <FeatureTag label="Groceries" />
        </OrbitingCircles>
      </div>
    </div>
  );
};

const FairSplittingVisual = () => {
  return (
    <div className="flex w-full max-w-[300px] flex-col items-center gap-6">
      <div className="flex -space-x-4">
        <Avatar className="z-20 h-16 w-16 border-4 border-white shadow-lg dark:border-slate-900">
          <AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" />
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar className="z-10 h-16 w-16 border-4 border-white opacity-70 grayscale dark:border-slate-900">
          <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" />
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
      </div>

      <div className="w-full space-y-2">
        <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
          <span>You pay 60%</span>
          <span className="text-slate-400">Partner pays 40%</span>
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <motion.div
            initial={{ width: "50%" }}
            whileInView={{ width: "60%" }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative h-full bg-slate-900 dark:bg-slate-200"
          >
            <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-white opacity-50" />
          </motion.div>
        </div>
      </div>

      <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Grocery Bill</span>
          <span className="font-bold">$125.00</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-900 dark:bg-slate-700 dark:text-white">
            You: $75.00
          </span>
          <span className="py-1 text-slate-400">Partner: $50.00</span>
        </div>
      </div>
    </div>
  );
};

const InstantSettlementVisual = () => {
  return (
    <div className="flex w-full max-w-[320px] items-center gap-6">
      <div className="space-y-2 text-center">
        <Avatar className="mx-auto h-14 w-14 border-2 border-white shadow-sm">
          <AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" />
        </Avatar>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          You
        </p>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center gap-3">
        <div className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-bold whitespace-nowrap text-white shadow-sm dark:bg-white dark:text-black">
          Gets $450.00
        </div>
        <motion.div
          animate={{ x: [-5, 5, -5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-slate-300 dark:text-slate-600"
        >
          <ArrowRightLeft className="h-6 w-6" />
        </motion.div>
        <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Settling Up
        </div>
      </div>

      <div className="space-y-2 text-center opacity-75">
        <Avatar className="mx-auto h-14 w-14 border-2 border-white shadow-sm grayscale">
          <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" />
        </Avatar>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Partner
        </p>
      </div>
    </div>
  );
};

const PrivateByDefaultVisual = () => {
  return (
    <div className="relative flex h-full min-h-[300px] w-full items-center justify-center">
      <div className="relative h-64 w-48">
        <motion.div
          className="absolute inset-0 z-10 rotate-[-6deg] rounded-2xl border-2 border-slate-700 bg-slate-900 p-4 text-white shadow-xl dark:border-slate-800 dark:bg-black"
          whileHover={{ rotate: -8, scale: 1.05 }}
        >
          <div className="mb-4 flex h-8 w-full items-center rounded-lg bg-white/10 px-2">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div className="space-y-3">
            <div className="h-2 w-full rounded-full bg-white/20" />
            <div className="h-2 w-2/3 rounded-full bg-white/20" />
            <div className="h-2 w-3/4 rounded-full bg-white/20" />
          </div>
          <div className="absolute right-0 bottom-4 left-0 text-center">
            <span className="rounded border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold tracking-widest text-white">
              SHARED
            </span>
          </div>
        </motion.div>

        <motion.div
          className="absolute inset-0 z-0 rotate-[6deg] rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-md dark:border-slate-700 dark:bg-slate-800/80"
          whileHover={{ rotate: 8, x: 20 }}
        >
          <div className="mb-4 flex h-8 w-full items-center rounded-lg bg-slate-200 px-2 dark:bg-slate-800">
            <div className="h-4 w-4 rounded-full bg-slate-400" />
          </div>
          <div className="space-y-3 opacity-50">
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-2 w-2/3 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="absolute right-0 bottom-4 left-0 text-center">
            <span className="text-[10px] font-bold tracking-widest text-slate-400">
              PERSONAL
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
