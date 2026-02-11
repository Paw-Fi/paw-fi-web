import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { formatDate } from "@/lib/utils";
import { Helmet } from "@dr.pogodin/react-helmet";
// @ts-ignore
import { motion, useScroll, useSpring } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { AuroraText } from "@/components/magicui/aurora-text";

export const Route = createFileRoute("/changelog")({
  component: ChangelogPage,
  head: () => {
    return {
      meta: [
        {
          title: "Changelog | Moneko",
          name: "description",
          content:
            "Track all the latest updates, features, and improvements to Moneko.",
        },
        {
          property: "og:title",
          content: "Changelog | Moneko",
        },
        {
          property: "og:description",
          content:
            "Track all the latest updates, features, and improvements to Moneko.",
        },
        {
          name: "canonical",
          content: "https://moneko.io/changelog",
        },
      ],
    };
  },
});

interface ChangelogEntry {
  title: string;
  date: string;
  version?: string;
  tags?: string[];
  description: string;
  items: string[];
}

const changelogs: ChangelogEntry[] = [
  {
    title: "Precision Group Settling & Android UI Polish",
    date: "2026-02-08",
    version: "1.4.1",
    tags: ["Fix", "Android", "Localization"],
    description:
      "This update focuses on pinpoint accuracy for group finances, resolving layout inconsistencies on Android devices, and expanding our global language support.",
    items: [
      "Enhanced settlement logic with a new cent-perfect tracking system for household members",
      "Introduced real-time settlement previews that exactly match server calculations",
      "Completely refactored the Settlement Breakdown page for faster performance and better accuracy",
      "Optimized dashboard suggestion cards to reduce widget lag and improve responsiveness",
      "Aligned mobile settlement sheets with the new high-precision calculation architecture",
      "Fixed Android-specific header and home page padding for a more consistent cross-platform look",
      "Improved billing clarity by displaying full '/month' and '/year' labels on subscription plans",
      "Refined the dashboard gesture handling and visual feedback for custom widgets",
      "Streamlined the onboarding flow by removing redundant logic while maintaining full setup functionality",
      "Fixed UI inconsistencies in the text input drawer and improved field focus handling",
      "Added 126 new translation keys covering new features across 14 supported languages",
      "Comprehensive localization for settlement terms including 'you owe' and 'split amount'",
      "Production release build 1.4.1+99",
    ],
  },
  {
    title: "Aesthetic Overhaul & Overview Dashboard",
    date: "2026-02-07",
    version: "1.4.0",
    tags: ["Feature", "Redesign", "UI"],
    description:
      "A massive visual redesign introducing a modern aesthetic and a powerful new Overview Dashboard for total financial visibility. This release includes over 1,500 lines of UI improvements.",
    items: [
      "Launched the new Overview Dashboard with real-time tracking of expenses, income, and net cash flow",
      "Added multi-account balance trends to visualize checking, savings, and investments in one place",
      "Introduced animated expense breakdowns by category with custom color schemes and touch interactions",
      "Enhanced transaction lists with day-by-day grouping and daily spending totals",
      "Added flexible date filters (Last 7 Days, This Month, Last Year) for deeper transaction analysis",
      "Re-engineered recurring transaction logic for 100% accurate future projections and forecasting",
      "Smart handling for month-end edge cases in recurring bill cycles",
      "Added 18+ new Budget Templates for various lifestyles (DINK couples, travelers, large families, etc.)",
      "Introduced AI-powered transaction logging with real-time feedback and support for up to 5 items at once",
      "New 'Smart Insight' cards providing AI-generated spending alerts and personalized recommendations",
      "Updated the App Theme with dedicated dashboard color schemes (surfaces, borders, and shadows)",
      "Expanded localization with 524 new translation keys across 17 different languages",
    ],
  },
  {
    title: "Global Bank Sync & AI Scenario Planning",
    date: "2026-01-28",
    version: "1.3.9",
    tags: ["Feature", "Integration", "AI", "Bank"],
    description:
      "Our most feature-rich update yet, featuring dual-provider bank sync for the US and Europe, Apple Sign-In, and interactive financial 'what-if' scenarios.",
    items: [
      "Global Bank Sync: Integrated Plaid (US) and Tink (Europe/Global) for secure connection to 50+ countries",
      "Automated bank provider routing based on your country code for a seamless setup",
      "Introduced AI Scenario Planning: ask 'What if I save $500/mo?' to see projected outcomes",
      "New Scenario Result sheets with AI-generated confidence scores and actionable recommendations",
      "Launched Apple Sign-In for secure, one-tap authentication on iOS devices",
      "Complete In-App Purchase (IAP) system for premium subscriptions on the App Store",
      "Added support for Partial & Unequal splitting of expenses among group members",
      "New 'Fairness Meter' to visually track spending balance within your household",
      "Integrated audio input: record voice notes to automatically log transaction descriptions",
      "Expanded currency support to include Jordanian Dinar (JOD) and Myanmar Kyat (MMK)",
      "Implemented a comprehensive interactive onboarding tour to highlight key Moneko features",
      "Stabilized real-time updates (SSE) with improved reconnection logic and error handling",
    ],
  },
  {
    title: "Spaces Feature & Partial Expense Split",
    date: "2026-01-16",
    version: "1.3.4",
    tags: ["Feature", "Expense Management", "Groups"],
    description:
      "Introducing Spaces for organized financial containers and the ability to handle complex, unequal expense splits.",
    items: [
      "Launched 'Spaces': Create dedicated containers for Personal, Business, or Vacation finances",
      "Enable space-specific budgets and analytics that operate independently of your main account",
      "New Partial Split feature: Assign exact amounts or percentages for group expenses",
      "Complete redesign of the Pocket details and navigation for a smoother user experience",
      "Overhauled the Category Picker with built-in search and updated iconography",
      "Added support for Romania (flag and regional identification)",
    ],
  },
  {
    title: "Dashboard Widgets & FAB Redesign",
    date: "2025-12-09",
    version: "1.3.0",
    tags: ["Feature", "UI", "Dashboard"],
    description:
      "Comprehensive dashboard improvements featuring new widgets, an enhanced home screen, and a reimagined Quick Action button.",
    items: [
      "Redesigned Dashboard widgets for Net Worth, Budget Progress, and Recent Transactions",
      "Launched the Import Wizard: align columns and deduplicate transactions from CSV/JSON files",
      "Reimagined Floating Action Button (FAB) with a new menu for grouped quick actions",
      "Added a new color picker for deeper theme and brand customization",
      "Optimized home screen performance and background data refreshing",
      "Established foundational test infrastructure for more stable future updates",
    ],
  },
  {
    title: "Pockets & Adaptive Platform Migration",
    date: "2025-11-18",
    version: "1.2.0",
    tags: ["Feature", "UI", "Budget"],
    description:
      "A major milestone introducing Pockets (envelope budgeting) and a migration to an Adaptive Platform UI for better cross-device support.",
    items: [
      "Launched 'Pockets': Digital envelope budgeting to allocate funds for specific categories",
      "Real-time tracking and low-balance alerts for individual budget pockets",
      "Migrated to Adaptive UI components for a native feel on tablets, foldables, and web",
      "Redesigned the main bottom navigation and menu system",
      "Enhanced PWA support and browser compatibility for the web platform",
    ],
  },
  {
    title: "Household Mode & Critical Stability",
    date: "2025-11-04",
    version: "1.1.0",
    tags: ["Feature", "Stability", "Household"],
    description:
      "Major stability release introducing Household Mode for shared finances and critical fixes for app performance.",
    items: [
      "Household Mode: Share finances with family or partners with role-based permissions",
      "Invitation links for easy group onboarding via email or SMS",
      "Fixed critical crash issues affecting specific iOS and Android models during startup",
      "Introduced the Premium Paywall and Membership dashboard via Stripe integration",
      "Added multi-currency support expansion with localized flags for new regions",
      "Optimized app bundle size by removing unused assets and deprecated files",
    ],
  },
];

function ChangelogItem({
  entry,
  index,
  isLast,
}: {
  entry: ChangelogEntry;
  index: number;
  isLast: boolean;
}) {
  const date = new Date(entry.date);
  const formattedDate = formatDate(date);

  return (
    <div className="relative pl-8 md:pl-0 group">
      <div className="md:grid md:grid-cols-4 md:gap-x-10">
        {/* Left Column: Date and Version */}
        <div className="md:col-span-1 md:text-right relative">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="md:sticky md:top-28 pt-1.5 flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-1 mb-4 md:mb-0"
          >
            <time className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {formattedDate}
            </time>
            {entry.version && (
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-bold text-primary shadow-sm backdrop-blur-sm">
                v{entry.version}
              </span>
            )}
          </motion.div>
          
          {/* Timeline Dot */}
          <div className="hidden md:flex absolute top-2 -right-[27px] items-center justify-center z-20">
             <div className="relative flex h-3 w-3 items-center justify-center">
                <div className="absolute h-full w-full rounded-full bg-background ring-2 ring-border group-hover:ring-primary/50 transition-colors duration-300" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors duration-300" />
             </div>
          </div>
          
           {/* Mobile Timeline Dot */}
          <div className="md:hidden absolute top-2 -left-[29px] flex items-center justify-center z-20">
             <div className="relative flex h-3 w-3 items-center justify-center">
                <div className="absolute h-full w-full rounded-full bg-background ring-2 ring-border group-hover:ring-primary/50 transition-colors duration-300" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 group-hover:bg-primary transition-colors duration-300" />
             </div>
          </div>
        </div>

        {/* Right Column: Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="md:col-span-3 pb-16 md:pb-24 relative"
        >
          <div className="relative rounded-2xl border border-border/40 bg-card/40 p-6 sm:p-8 backdrop-blur-sm transition-all hover:bg-card/60 hover:shadow-lg hover:border-primary/20">
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {entry.title}
                </h2>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-secondary/50 backdrop-blur-md px-2.5 py-1 text-xs font-medium tracking-wide hover:bg-secondary"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="text-base text-muted-foreground leading-relaxed">
                  {entry.description}
              </div>

              <div className="h-px w-full bg-border/50" />

              <ul className="space-y-3 text-sm text-foreground/90 list-none pl-0">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    <span className="leading-6">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  const sortedChangelogs = [...changelogs].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <>
      <Helmet>
        <title>Changelog | Moneko</title>
        <meta
          name="description"
          content="Track updates, features, and improvements."
        />
        <link rel="canonical" href="https://moneko.io/changelog" />
      </Helmet>

      <div className="relative min-h-screen bg-background selection:bg-primary/20 overflow-hidden">
        {/* Background Gradients */}
        <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 z-0">
          <div className="h-[600px] w-[600px] bg-primary/10 rounded-full blur-[120px] opacity-30 mix-blend-screen" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-24 md:px-10 lg:pt-32">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-24 space-y-6 md:text-center"
          >
             <div className="flex items-center md:justify-center gap-2 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Updates</span>
             </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-7xl">
              <AuroraText className="font-extrabold" colors={["#FF9966", "#FF5E62", "#A259FF", "#3FA9F5"]}>Product Updates</AuroraText>
            </h1>
            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground md:mx-auto leading-relaxed">
              We're constantly improving Moneko. Here's a timeline of our latest features, fixes, and improvements.
            </p>
          </motion.div>

          {/* Timeline Container */}
          <div className="relative">
            {/* Vertical Line Background */}
            <div className="absolute left-[7px] top-6 bottom-0 w-[2px] bg-border md:left-[25%] md:-ml-[1px] md:translate-x-[20px]" />
            
            {/* Animated Vertical Line */}
            <motion.div 
              className="absolute left-[7px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-primary via-purple-500 to-blue-500 origin-top md:left-[25%] md:-ml-[1px] md:translate-x-[20px]"
              style={{ scaleY }}
            />

            <div className="space-y-0 relative">
              {sortedChangelogs.map((changelog, index) => (
                <ChangelogItem
                  key={changelog.date + index}
                  entry={changelog}
                  index={index}
                  isLast={index === sortedChangelogs.length - 1}
                />
              ))}
            </div>
          </div>
          
          {/* Footer Callout */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-24 text-center pb-20"
          >
            <p className="text-muted-foreground text-sm">
              Have a feature request? <a href="mailto:hello@moneko.io" className="text-primary hover:text-primary/80 transition-colors font-medium">Send us an email</a>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}