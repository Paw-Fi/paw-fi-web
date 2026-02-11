import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { formatDate } from "@/lib/utils";
import { Helmet } from "@dr.pogodin/react-helmet";
// @ts-ignore
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HomeHeader } from "@/components/index/header";

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
    version: "1.2.0-beta",
    tags: ["Feature", "Recurring", "Goals", "Auth"],
    description:
      "This beta introduced automation for recurring money flows, visual goals, wallet sign-in, and reminder tools.",
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
      "This release prepared Moneko for broader global use with multi-currency support, language coverage, and beta hardening.",
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
      "Public beta launched on mobile stores",
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
  const anchorId = getChangelogAnchorId(entry);

  return (
    <article
      id={anchorId}
      className="group relative scroll-mt-28 pb-14 md:scroll-mt-32 md:pb-20"
    >
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10">
        <div className="relative">
          <motion.a
            href={`#${anchorId}`}
            aria-label={`Jump to ${entry.version ? `v${entry.version}` : entry.title}`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="border-border/60 bg-background/85 supports-[backdrop-filter]:bg-background/70 hover:border-primary/35 sticky top-20 z-20 -mx-1 flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-xl transition-colors md:top-24 md:mx-0 md:flex-col md:items-start md:justify-start md:gap-2"
          >
            <time className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase md:text-[11px]">
              {formattedDate}
            </time>
            {entry.version && (
              <span className="border-border bg-card text-foreground/90 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm">
                v{entry.version}
              </span>
            )}
          </motion.a>

          <div className="pointer-events-none absolute top-5 left-3 z-10 md:left-[calc(100%+30px)]">
            <div className="relative flex h-3.5 w-3.5 items-center justify-center">
              <div className="bg-background ring-border/80 group-hover:ring-primary/50 absolute inset-0 rounded-full ring-2 transition-colors duration-300" />
              <div className="bg-primary/70 group-hover:bg-primary h-1.5 w-1.5 rounded-full transition-colors duration-300" />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.55, delay: index * 0.08 }}
          className="relative"
        >
          <Card className="border-border/70 bg-card/80 group-hover:border-primary/20 relative overflow-hidden p-6 shadow-[0_10px_30px_-20px_hsl(var(--foreground)/0.35)] backdrop-blur-xl transition-all duration-300 group-hover:shadow-[0_20px_40px_-24px_hsl(var(--foreground)/0.45)] sm:p-8">
            <div className="via-foreground/20 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
            <div className="flex flex-col gap-6">
              <header className="space-y-4">
                <h2 className="text-foreground max-w-[26ch] text-2xl font-semibold tracking-tight sm:text-3xl">
                  {entry.title}
                </h2>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
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
                {entry.description}
              </p>

              <Separator className="bg-border/70" />

              <ul className="text-foreground/90 list-none space-y-3.5 pl-0 text-sm sm:text-[15px]">
                {entry.items.map((item, i) => (
                  <li key={i} className="group/item flex items-start gap-3.5">
                    <span className="border-primary/35 bg-primary/70 group-hover/item:bg-primary mt-[7px] h-2 w-2 shrink-0 rounded-sm border transition-colors" />
                    <span className="text-foreground/85 leading-6">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </motion.div>
      </div>
      {!isLast && (
        <div className="via-border/70 pointer-events-none absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent to-transparent md:left-[240px]" />
      )}
    </article>
  );
}

function getChangelogAnchorId(entry: ChangelogEntry) {
  const base = entry.version
    ? `v-${entry.version}`
    : `${entry.date}-${entry.title}`;

  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ChangelogPage() {
  const sortedChangelogs = React.useMemo(
    () =>
      [...changelogs].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      }),
    [],
  );

  const changelogAnchorIds = React.useMemo(
    () => sortedChangelogs.map((entry) => getChangelogAnchorId(entry)),
    [sortedChangelogs],
  );

  const { scrollYProgress } = useScroll();
  const prefersReducedMotion = useReducedMotion();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  React.useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;

      const target = document.getElementById(hash);
      if (!target) return;

      requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start", behavior: "auto" });
      });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);

    return () => {
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [changelogAnchorIds]);

  React.useEffect(() => {
    const sections = changelogAnchorIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) return;

    let activeId = window.location.hash.replace(/^#/, "");

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          );

        const next = visibleEntries[0]?.target;
        if (!next || !(next instanceof HTMLElement)) return;

        const nextId = next.id;
        if (!nextId || nextId === activeId) return;

        activeId = nextId;
        const nextHash = `#${nextId}`;

        if (window.location.hash !== nextHash) {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}${nextHash}`,
          );
        }
      },
      {
        root: null,
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.6],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [changelogAnchorIds]);

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

      <div className="bg-background selection:bg-primary/20 relative min-h-screen overflow-hidden">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[-220px] left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.14),transparent_62%)]" />
          <div className="absolute right-[-180px] bottom-[-240px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--foreground)/0.08),transparent_70%)] blur-2xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-20 pb-20 sm:px-8 md:pt-24 lg:px-10 lg:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.75,
              ease: "easeOut",
            }}
            className="mb-16 space-y-6 md:mb-20"
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

          <div className="relative">
            <div className="bg-border/70 absolute top-5 bottom-5 left-[15px] w-px md:left-[255px]" />

            <motion.div
              className="from-primary/95 via-primary/45 absolute top-5 bottom-5 left-[15px] w-px origin-top bg-gradient-to-b to-transparent md:left-[255px]"
              style={{ scaleY: prefersReducedMotion ? 1 : scaleY }}
            />

            <div className="relative space-y-0">
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
            className="mt-16 pb-8 text-center md:mt-20"
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
