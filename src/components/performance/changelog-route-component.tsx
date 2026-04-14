import * as React from "react";

import { formatDate } from "@/lib/utils";
import { Helmet } from "@dr.pogodin/react-helmet";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HomeHeader } from "@/components/index/header";
import { Timeline } from "@/components/ui/timeline";

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
    title: "Wallets Feature, Faster Transactions & Better Pocket Budgeting",
    date: "2026-04-07",
    version: "1.5.4",
    tags: ["Feature", "Wallet", "Performance", "Budget"],
    description:
      "This release introduces the new Wallets feature for managing multiple payment cards, enhances spending visualization with redesigned breakdowns, improves data import reliability, and includes numerous performance and bug fixes.",
    items: [
      "New Wallets feature to manage multiple cards and bank accounts in one place",
      "Improved spending charts with clearer and easier-to-read visuals",
      "Faster transaction loading for smoother scrolling",
      "Quicker home page updates so your data stays fresh",
      "Fixed issue with recurring expenses not showing correctly in budgets",
      "More reliable CSV import, including fixes for crashes on Android",
      "New time filters (last month and last 3 months) for easy comparison",
      "Better visibility in dark mode for status bar text",
      "Fixed display issues with household member names",
      "Resolved problems with invite links",
      "Faster loading on the pockets page",
      "General performance and stability improvements",
    ],
  },
  {
    title: "Wallet & Apple Pay Integration Improvements",
    date: "2026-03-23",
    version: "1.5.0",
    tags: ["Feature", "Wallet", "Apple Pay"],
    description:
      "This release enhances wallet synchronization, adds Apple Wallet integration, and fixes various bugs related to budget calculations, payments, and data imports.",
    items: [
      "Added Apple Wallet integration for seamless payment card management",
      "Improved wallet synchronization across devices",
      "Fixed budget calculations to properly recalculate pocket amounts when total budget changes",
      "Resolved payment processing issues for more reliable transactions",
      "Enhanced CSV import functionality with better error handling",
      "Fixed Firebase synchronization issues",
      "Various UI improvements and bug fixes",
    ],
  },
  {
    title: "Thai Language Support & Recurring Improvements",
    date: "2026-03-11",
    version: "1.4.7",
    tags: ["Feature", "Currency", "Recurring", "Localization"],
    description:
      "This release introduces Thai language support, expands currency coverage, improves CSV imports, and adds a new 6-month option for recurring transactions while making transaction updates more reliable.",
    items: [
      "Thai language is now supported",
      "Add Nepalese Rupee (NPR) to supported currencies",
      "Enhanced CSV import with better column mapping and deduplication",
      "6-month frequency option added to recurring transactions",
      "Improved reliability for transaction updates and category changes",
      "Fixed pie chart legend display issues",
    ],
  },
  {
    title: "Custom Categories, Regional Support & Faster Currency Flow",
    date: "2026-03-03",
    version: "1.4.6",
    tags: ["Feature", "Customization", "Currency", "Fix"],
    description:
      "Version 1.4.6 gives you more control over categorization, expands regional currency support, and makes support and feedback easier from inside the app.",
    items: [
      "Create custom transaction categories with your own icons and styles",
      "Added Bangladesh Taka (BDT), Belize Dollar (BZD), and Zambian Kwacha (ZMW)",
      "Moneko AI is now smarter and more helpful",
      "Send feature requests and bug reports directly from Settings",
      "Currency selector and totals now refresh more reliably",
    ],
  },
  {
    title: "Telegram Sync, Siri Shortcuts & Quick Actions",
    date: "2026-02-23",
    version: "1.4.4",
    tags: ["Feature", "Integration", "iOS", "Android", "Fix"],
    description:
      "This release brings powerful automation with Telegram sync, Siri Shortcuts, and faster access to your most-used actions.",
    items: [
      "Connect Telegram to sync your Moneko data and receive notifications",
      "Use Siri Shortcuts to log expenses and check balances hands-free",
      "Long-press the home FAB button for quick access to frequent actions",
      "Quick-add menu now shows your most-used categories and amounts",
      "Transaction search became faster and more accurate",
      "Currency conversion rates were updated for better accuracy",
      "Fixed issues with recurring transaction reminders",
      "Resolved date display inconsistencies across time zones",
      "Improved import handling for CSV files with special characters",
      "Fixed crash when opening large transaction histories",
      "Settlement calculations now handle edge cases better",
      "Dark mode contrast was improved for better readability",
      "Performance improvements for faster app startup",
      "Released production mobile build 1.4.4+102",
    ],
  },
  {
    title: "Account Control, Timezone Accuracy & Reliability Upgrade",
    date: "2026-02-11",
    version: "1.4.2",
    tags: ["Feature", "Fix", "Timezone", "Privacy", "Stability"],
    description:
      "This release gives you stronger account control, clearer timezone behavior, and more reliable day-to-day tracking.",
    items: [
      "You can now delete your account in Settings with a safer confirmation flow",
      "A clear Danger Zone section makes sensitive account actions easier to find",
      "Account removal now shows clearer progress and signs you out cleanly",
      "Personal data is cleaned up more thoroughly after account deletion",
      "Timezone settings are easier to understand and manage",
      "You can choose to always follow your device timezone",
      "Dates now stay more consistent across expenses, income, goals, and recurring items",
      "We fixed cases where items could appear one day early or late",
      "Date filters and daily/monthly totals now feel more accurate",
      "Recent transaction dates and labels now better match expectations",
      "Adding and editing transactions now handles dates more reliably",
      "AI-assisted logging now understands dates more accurately",
      "If AI cannot confidently detect dates, the app gives clearer feedback",
      "Recurring schedules are more stable and less likely to drift",
      "Recurring pages and cards now show schedule details more clearly",
      "Notification reliability was improved in difficult permission situations",
      "Avatar updates now handle upload failures more gracefully",
      "Language coverage was expanded for these updates",
      "Released production mobile build 1.4.2+100",
    ],
  },
  {
    title: "Precision Group Settling & Android UI Polish",
    date: "2026-02-08",
    version: "1.4.1",
    tags: ["Fix", "Android", "Localization"],
    description:
      "Version 1.4.1 improves shared-settlement accuracy, fixes Android layout spacing, and expands language support in key user flows.",
    items: [
      "Shared-settlement totals are now more precise and trustworthy",
      "Settlement previews now align better with final outcomes",
      "Settlement breakdown screens are clearer and easier to follow",
      "Settlement suggestions feel faster and more responsive",
      "Android top spacing issues were fixed for cleaner alignment",
      "Plan price labels now use clearer monthly and yearly wording",
      "Dashboard interactions were polished for smoother gestures",
      "Onboarding was simplified to reduce friction",
      "Text input behavior and focus handling were improved",
      "Language support was expanded across settlement and onboarding",
      "New shared-expense wording is clearer in supported languages",
      "Released production mobile build 1.4.1+99",
    ],
  },
  {
    title: "Complete Aesthetic Overhaul & Overview Dashboard",
    date: "2026-02-07",
    version: "1.4.0",
    tags: ["Feature", "Redesign", "UI"],
    description:
      "A major visual redesign with a new overview experience, richer insights, and clearer day-to-day money tracking.",
    items: [
      "A new overview page now shows your financial picture at a glance",
      "Account trends and category breakdowns are clearer and easier to read",
      "Transactions now feel easier to scan with better daily grouping",
      "Date filters were expanded for faster time-range comparisons",
      "Recurring planning was improved for more predictable future schedules",
      "Month-end behavior is more reliable for repeating entries",
      "Budget templates were expanded for different lifestyles",
      "AI quick logging now handles multiple items more clearly",
      "Insight cards now provide clearer recommendations and alerts",
      "Import flow became easier with better preview and mapping guidance",
      "Plan selection and subscription screens were simplified",
      "Onboarding now gives clearer guidance for first-time setup",
      "Loading and processing states are easier to understand",
      "Visual consistency improved across cards, sections, and empty states",
      "Language coverage expanded across the new experience",
      "Released production mobile build 1.4.0+97",
    ],
  },
  {
    title:
      "Bank Sync with Plaid & Tink, Apple Sign-In, IAP, AI Scenario Planning",
    date: "2026-01-28",
    version: "1.3.9",
    tags: ["Feature", "Integration", "AI", "Bank"],
    description:
      "A major release focused on easier bank connections, simpler sign-in, smarter planning tools, and stronger shared-finance experiences.",
    items: [
      "Bank connections were expanded across many countries",
      "Bank setup now adapts more smoothly based on your region",
      "Connection status and outcomes are clearer throughout the flow",
      "Apple Sign-In was added for faster, more secure login on iPhone",
      "Subscription purchase and restore flows were improved",
      "Plan selection now has clearer options and comparisons",
      "AI scenario planning lets you ask what-if money questions",
      "Scenario results now include clearer timelines and suggestions",
      "Voice input was added for faster transaction notes",
      "Budget templates were expanded for couples, families, and housemates",
      "Unequal split support was improved for shared expenses",
      "Shared-finance fairness and contribution visibility became much clearer",
      "Inviting others to a shared space became easier",
      "Currency support expanded to include more regions",
      "Recurring and quick-log experiences were refined",
      "Real-time updates are now more stable",
      "App icons and visuals were refreshed on mobile",
      "Onboarding was expanded with clearer step-by-step guidance",
      "Language coverage increased across newly added features",
      "Released production mobile build 1.3.9+95",
    ],
  },
  {
    title: "Spaces Feature & Partial Expense Split",
    date: "2026-01-16",
    version: "1.3.4",
    tags: ["Feature", "Expense Management", "Groups"],
    description:
      "Spaces help you separate money by life context, and partial split gives you flexible ways to share expenses fairly.",
    items: [
      "Create separate Spaces for personal, business, or travel money",
      "Move money between Spaces more easily",
      "Use independent budgets and reports for each Space",
      "Share Spaces with role-based permissions",
      "Split group expenses by exact amount or percentage",
      "Custom split controls make unequal sharing much easier",
      "Pocket and category flows were redesigned for faster use",
      "Dashboard and home screens better support Space-based workflows",
      "Regional support was expanded",
    ],
  },
  {
    title: "AI Scenario Planning, Audio Input, Onboarding Tour, Widgets",
    date: "2026-01-12",
    version: "1.3.3",
    tags: ["Feature", "AI", "Onboarding", "Widgets"],
    description:
      "This update introduced smarter planning tools, voice-friendly input, a guided tour, and richer home widgets.",
    items: [
      "Ask AI what-if questions to explore future money outcomes",
      "Save and revisit your planning scenarios",
      "Use voice input to log transaction notes faster",
      "A guided tour helps first-time users discover key features",
      "Home widgets were expanded and easier to customize",
      "Widget speed and reliability were improved on more screens",
      "Navigation and header experience became clearer",
      "Language updates were added for new features",
    ],
  },
  {
    title: "Dashboard Widgets, FAB Redesign, UI Rework",
    date: "2025-12-09",
    version: "1.3.0",
    tags: ["Feature", "UI", "Dashboard"],
    description:
      "A broad dashboard refresh with clearer widgets, faster quick actions, and stronger day-to-day money visibility.",
    items: [
      "Dashboard widgets were redesigned for clearer insights",
      "Net worth, budget progress, and recent activity views were improved",
      "Quick actions were redesigned for faster common tasks",
      "Importing from common file formats became easier and safer",
      "Home screen loading and refresh behavior was improved",
      "Category and color customization became easier to use",
      "Web compatibility and overall stability improved",
    ],
  },
  {
    title: "Remove Change Password, Minor Bug Fixes",
    date: "2025-12-06",
    version: "1.3.1",
    tags: ["Feature", "Fix", "Security"],
    description:
      "A cleanup release focused on smoother account handling, easier imports, and overall stability.",
    items: [
      "Password changes were moved to your sign-in account flow",
      "Import flow became easier with better file selection",
      "Mapping and duplicate prevention improved import confidence",
      "Homepage consistency was improved",
      "Recurring edit issues were resolved",
      "Dark mode visual consistency was improved",
      "General bug fixes across the app",
    ],
  },
  {
    title: "Pockets System & Adaptive Platform UI Migration",
    date: "2025-11-18",
    version: "1.2.0",
    tags: ["Feature", "UI", "Budget"],
    description:
      "A major budgeting milestone introducing Pockets and a full interface refresh for a better experience across devices.",
    items: [
      "Pockets introduced digital envelope budgeting",
      "Create multiple budget buckets for categories like food, rent, and fun",
      "Track each Pocket with clearer progress and low-balance signals",
      "Pocket details now include better activity visibility",
      "Navigation and core screens were redesigned for consistency",
      "The app now adapts better across phone, tablet, and web",
      "Theme behavior and visual polish were improved",
      "General bug fixes and web quality improvements",
    ],
  },
  {
    title: "Recurring Transactions, Savings Goals, Wallet Auth",
    date: "2025-11-17",
    version: "1.2.0",
    tags: ["Feature", "Recurring", "Goals", "Auth"],
    description:
      "This release introduced automation for recurring money flows, visual goals, wallet sign-in, and reminder tools.",
    items: [
      "Set recurring expenses and income with flexible schedules",
      "Edit, skip, or move recurring entries when plans change",
      "Savings goals were added with visual progress tracking",
      "Track contributions and goal milestones more clearly",
      "Wallet-based sign-in support was introduced",
      "Reminders were added for bills, limits, and shared payments",
      "Shared-expense screens and calculations were refined",
      "Web rollout and language support were expanded",
      "Brand visuals were refreshed across the app",
    ],
  },
  {
    title: "Household Mode, Reminders & Critical Stability",
    date: "2025-11-04",
    version: "1.1.0",
    tags: ["Feature", "Stability", "Household"],
    description:
      "A major stability release that introduced shared household finance features and resolved critical crash issues.",
    items: [
      "Household mode added shared finance spaces for families and partners",
      "Invite flows and member roles improved group collaboration",
      "Shared expenses and reminders became easier to manage",
      "Critical startup and crash issues were fixed across devices",
      "Launch reliability improved for first open and cold start",
      "Subscription and premium surfaces were introduced",
      "Multi-currency and regional support continued to expand",
      "Security and translation quality fixes were included",
    ],
  },
  {
    title: "Multi-Currency, Internationalization & Beta Release",
    date: "2025-10-21",
    version: "1.0.5",
    tags: ["Feature", "i18n", "Beta"],
    description:
      "This release prepared Moneko for broader global use with multi-currency support, language coverage, and stability improvements.",
    items: [
      "Multi-currency support was expanded for global use",
      "Currency display and conversion became clearer",
      "Large language expansion improved accessibility worldwide",
      "Regional visuals were improved",
      "Core transaction flow received stability improvements",
      "Early household groundwork was expanded",
      "Navigation and key screens were refined",
      "Brand identity updates were applied",
    ],
  },
  {
    title: "First Public Beta & Stable Release",
    date: "2025-10-18",
    version: "1.0.0",
    tags: ["Release", "Beta"],
    description:
      "The first public release of Moneko, delivering essential expense tracking, account access, and budgeting basics.",
    items: [
      "Launched on the App Store and Google Play",
      "Core expense tracking released with category and date support",
      "Create, edit, and delete transaction management added",
      "Basic budgeting and spending limits introduced",
      "Profile and account settings became available",
      "Google sign-in and cloud sync were enabled",
      "Offline-friendly caching support was added",
      "Subscription readiness was introduced",
    ],
  },
  {
    title: "Initial Application Setup - Flutter Foundation",
    date: "2025-05-12",
    version: "0.1.0",
    tags: ["Alpha", "Setup", "Foundation"],
    description:
      "The first foundation build of Moneko with core structure, navigation, theming, and early account features.",
    items: [
      "Initial app structure and core screens were created",
      "Early home and profile experiences were introduced",
      "Multi-screen navigation was set up",
      "Light and dark theme support was added",
      "Early design direction and user flows were established",
      "Authentication groundwork was integrated",
      "Data and state foundations were set up",
      "Project branding moved to Moneko",
    ],
  },
];

export function ChangelogRouteComponent() {
  const prefersReducedMotion = useReducedMotion();

  const sortedChangelogs = React.useMemo(
    () =>
      [...changelogs].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      }),
    [],
  );

  const timelineData = React.useMemo(() => {
    return sortedChangelogs.map((changelog) => ({
      title: (
        <div className="flex flex-col gap-2">
          <time className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase sm:text-xs">
            {formatDate(new Date(changelog.date))}
          </time>
          {changelog.version && (
            <span className="border-border bg-card text-foreground/90 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm">
              v{changelog.version}
            </span>
          )}
        </div>
      ),
      content: (
        <Card className="border-border/70 bg-card/80 group-hover:border-primary/20 relative overflow-hidden p-6 shadow-[0_10px_30px_-20px_hsl(var(--foreground)/0.35)] backdrop-blur-xl transition-all duration-300 sm:p-8">
          <div className="via-foreground/20 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
          <div className="flex flex-col gap-6">
            <header className="space-y-4">
              <h2 className="text-foreground max-w-[26ch] text-2xl font-semibold tracking-tight sm:text-3xl">
                {changelog.title}
              </h2>
              {changelog.tags && changelog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {changelog.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="border-border/70 bg-secondary/50 text-secondary-foreground rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.04em]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </header>

            <p className="text-muted-foreground max-w-[75ch] text-[15px] leading-7 sm:text-base">
              {changelog.description}
            </p>

            <Separator className="bg-border/70" />

            <ul className="text-foreground/90 list-none space-y-3.5 pl-0 text-sm sm:text-[15px]">
              {changelog.items.map((item, i) => (
                <li key={i} className="group/item flex items-start gap-3.5">
                  <span className="border-primary/35 bg-primary/70 group-hover/item:bg-primary mt-[7px] h-2 w-2 shrink-0 rounded-sm border transition-colors" />
                  <span className="text-foreground/85 leading-6">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ),
    }));
  }, [sortedChangelogs]);

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

      <HomeHeader />

      <div className="bg-background selection:bg-primary/20 relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[-220px] left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.14),transparent_62%)]" />
          <div className="absolute right-[-180px] bottom-[-240px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--foreground)/0.08),transparent_70%)] blur-2xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl pt-20 pb-20 md:pt-24 lg:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.75,
              ease: "easeOut",
            }}
            className="mb-8 space-y-6 px-5 sm:px-8 md:mb-12 lg:px-10"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
                Live Updates
              </span>
            </div>
            <h1 className="text-foreground max-w-[16ch] text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Moneko Product Changelog
            </h1>
            <p className="text-muted-foreground max-w-2xl text-base leading-7 sm:text-lg">
              We're constantly improving Moneko. Here's a timeline of our latest
              features, fixes, and improvements.
            </p>
          </motion.div>

          {/* New Clean Timeline Component */}
          <Timeline data={timelineData} />

          {/* Footer Callout */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 px-5 pb-8 text-center sm:px-8 md:mt-20 lg:px-10"
          >
            <p className="text-muted-foreground text-sm leading-6">
              Have a feature request?{" "}
              <a
                href="mailto:hello@moneko.io"
                className="text-primary decoration-primary/30 hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
              >
                Send us an email
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
