import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faChartLine,
  faTrophy,
  faExclamationTriangle,
  faRefresh,
  faArrowRight,
  faBullseye,
  faWandSparkles,
  faCheckCircle,
  faFilter,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/hooks/goal-tracker/use-goals";
import { memo, useCallback, useState, useMemo, useEffect } from "react";
import { useTrackerIndexWalkthrough } from "@/hooks/walkthrough/use-tracker-index-walkthrough";
import { useSpotlightGoals } from "@/hooks/goal-tracker/use-spotlight-goals";
import { getGoalIcon } from "@/lib/utils/goal-icons";
import travelBgImage from "@/assets/images/tracker/spotlight-travel.svg";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

const trackerSearchSchema = z.object({
  filter: z
    .enum(["all", "on-track", "needs-attention", "completed"])
    .optional()
    .default("all"),
  sort: z
    .enum(["due-date", "progress", "recently-updated"])
    .optional()
    .default("due-date"),
});

export const Route = createFileRoute("/dashboard/tracker/")({
  validateSearch: trackerSearchSchema,
  component: GoalsTracker,
  head: () => {
    const canonicalUrl = getCanonicalUrl("/dashboard/tracker/");
    const title = "Goal Tracker - AI-Powered Achievement & Progress | Moneko";
    const description =
      "Set, track & achieve financial goals with AI insights, smart milestones & personalized strategies for wealth building.";
    const keywords =
      "financial goal tracker, AI financial planning, savings goals, investment goals, milestone management, financial objectives, goal setting, progress tracking, wealth building goals, retirement planning goals";

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    // Comprehensive structured data for goal tracking platform
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          "@id": `${canonicalUrl}#webapp`,
          name: "Moneko Goal Tracker",
          description:
            "AI-powered financial goal tracking and achievement platform with smart milestones and personalized strategies",
          url: canonicalUrl,
          applicationCategory: "ProductivityApplication",
          applicationSubCategory: "Goal Management",
          operatingSystem: "Web Browser",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            validFrom: "2024-01-01",
          },
          featureList: [
            "AI-Powered Goal Strategy",
            "Smart Milestone Creation",
            "Progress Tracking & Analytics",
            "Achievement Celebration",
            "Deadline Management",
            "Visual Progress Indicators",
            "Goal Categories & Tags",
            "Motivational Insights",
            "Performance Analytics",
            "Goal Templates",
          ],
          screenshot: "https://moneko.io/og-img.png",
          softwareVersion: "2.0",
          audience: {
            "@type": "Audience",
            audienceType: [
              "Goal Setters",
              "Financial Planners",
              "Savers",
              "Investors",
              "Young Professionals",
            ],
          },
        },
        {
          "@type": "Service",
          "@id": `${canonicalUrl}#service`,
          name: "Personal Financial Goal Management",
          description:
            "Comprehensive financial goal tracking service with AI-powered insights and milestone management",
          provider: {
            "@type": "Organization",
            "@id": "https://moneko.io#organization",
            name: "Moneko",
            description:
              "AI-powered personal finance platform providing goal tracking, education, and portfolio management tools, founded by CFA charterholder Sabina Shao",
            url: "https://moneko.io",
            logo: "https://moneko.io/og-img.png",
            founder: {
              "@type": "Person",
              name: "Sabina Shao",
              jobTitle: "CEO & Financial Education Expert",
              hasCredential: "CFA Charterholder",
              knowsAbout: [
                "Personal Finance",
                "Financial Goal Setting",
                "Investment Strategy",
                "Wealth Building",
              ],
              yearsOfExperience: "10+",
            },
          },
          serviceType: "Financial Goal Management",
          areaServed: [
            "United States",
            "Canada",
            "United Kingdom",
            "Australia",
          ],
          audience: {
            "@type": "Audience",
            audienceType: [
              "Individual Savers",
              "Investment Goal Setters",
              "Retirement Planners",
            ],
          },
          hasOfferingCatalog: {
            "@type": "OfferingCatalog",
            name: "Goal Management Features",
            itemListElement: [
              {
                "@type": "Service",
                name: "AI Goal Strategy",
                description:
                  "Personalized strategies and recommendations for achieving financial goals faster",
              },
              {
                "@type": "Service",
                name: "Smart Milestones",
                description:
                  "Intelligent breakdown of large goals into achievable milestones with timeline management",
              },
              {
                "@type": "Service",
                name: "Progress Analytics",
                description:
                  "Real-time tracking with visual progress indicators and performance insights",
              },
            ],
          },
        },
        {
          "@type": "Organization",
          "@id": "https://moneko.io#organization",
          name: "Moneko",
          alternateName: "Moneko Financial Platform",
          description:
            "Leading AI-powered personal finance platform providing comprehensive goal tracking, education, and wealth management tools",
          url: "https://moneko.io",
          logo: {
            "@type": "ImageObject",
            url: "https://moneko.io/og-img.png",
            width: "1200",
            height: "630",
          },
          image: "https://moneko.io/og-img.png",
          foundingDate: "2024",
          areaServed: [
            "United States",
            "Canada",
            "United Kingdom",
            "Australia",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "support@moneko.io",
            availableLanguage: "English",
          },
          sameAs: [
            "https://x.com/moneko_ai",
            "https://linkedin.com/company/moneko-ai",
          ],
        },
        {
          "@type": "ItemList",
          "@id": `${canonicalUrl}#features`,
          name: "Goal Tracker Features",
          description:
            "Comprehensive features of Moneko's financial goal tracking and management platform",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              item: {
                "@type": "Service",
                name: "AI-Powered Goal Strategy",
                description:
                  "Personalized strategies and recommendations based on your financial situation and timeline",
              },
            },
            {
              "@type": "ListItem",
              position: 2,
              item: {
                "@type": "Service",
                name: "Smart Milestone Tracking",
                description:
                  "Intelligent breakdown of goals into achievable milestones with automatic progress updates",
              },
            },
            {
              "@type": "ListItem",
              position: 3,
              item: {
                "@type": "Service",
                name: "Visual Progress Analytics",
                description:
                  "Real-time progress tracking with charts, graphs, and performance insights",
              },
            },
            {
              "@type": "ListItem",
              position: 4,
              item: {
                "@type": "Service",
                name: "Goal Categories",
                description:
                  "Organize goals by category: savings, investment, retirement, debt payoff, and more",
              },
            },
            {
              "@type": "ListItem",
              position: 5,
              item: {
                "@type": "Service",
                name: "Deadline Management",
                description:
                  "Smart deadline tracking with alerts and notifications to keep you on track",
              },
            },
            {
              "@type": "ListItem",
              position: 6,
              item: {
                "@type": "Service",
                name: "Achievement Celebration",
                description:
                  "Milestone achievements and progress celebrations to maintain motivation",
              },
            },
          ],
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${canonicalUrl}#breadcrumb`,
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Dashboard",
              item: {
                "@type": "WebPage",
                "@id": "https://moneko.io/dashboard",
              },
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Goal Tracker",
              item: {
                "@type": "WebPage",
                "@id": canonicalUrl,
              },
            },
          ],
        },
      ],
    };

    // GEO-Optimized FAQ Schema for Goal Tracker
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Moneko's AI-powered goal tracking work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Moneko's AI analyzes your financial situation, timeline, and goals to provide personalized strategies and smart milestones. Our system, designed by CFA charterholder Sabina Shao, breaks down large financial goals into achievable steps with realistic timelines and progress tracking.",
          },
        },
        {
          "@type": "Question",
          name: "What types of financial goals can I track with Moneko?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can track all types of financial goals including savings targets, investment milestones, debt payoff plans, retirement savings, emergency fund building, and major purchases like homes or cars. Our expert-designed system adapts to any financial objective.",
          },
        },
        {
          "@type": "Question",
          name: "How reliable are Moneko's goal achievement strategies?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Our strategies are based on proven financial planning principles developed by CFA charterholder Sabina Shao with over 10 years of experience. The AI recommendations follow established wealth-building methodologies and are continuously refined based on user success rates.",
          },
        },
        {
          "@type": "Question",
          name: "Can Moneko help me stay motivated to achieve my financial goals?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Moneko includes milestone celebrations, progress visualization, achievement tracking, and motivational insights designed by behavioral finance experts. Our system helps maintain momentum through positive reinforcement and clear progress indicators.",
          },
        },
      ],
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: canonicalUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(faqSchema),
        },
      ],
    };
  },
});

function GoalsTracker() {
  const { user } = useAuth();
  const { goals, isLoading, error, refetch } = useGoals(user?.id);
  const { autoStartWalkthrough, startWalkthrough } =
    useTrackerIndexWalkthrough();

  // Move all useMemo hooks before any conditional returns
  const sortedGoals = useMemo(() => {
    if (!goals) return [];

    return goals.sort((a, b) => {
      if (!a.target_date && !b.target_date) return 0;
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return (
        new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
      );
    });
  }, [goals]);

  // Use the new spotlight hook for better performance
  const spotlightGoals = useSpotlightGoals(goals);

  const statsData = useMemo(() => {
    if (!goals || goals.length === 0) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        onTrackPercentage: 0,
      };
    }

    const getGoalStatus = (goal) => {
      if (goal.status === "completed") return "completed";

      const progress =
        goal.current_amount && goal.target_amount
          ? (goal.current_amount / goal.target_amount) * 100
          : 0;

      const daysUntilTarget = goal.target_date
        ? Math.ceil(
            (new Date(goal.target_date).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      if (progress >= 50 || daysUntilTarget > 30) return "on-track";
      return "needs-attention";
    };

    const totalGoals = goals.length;
    const activeGoals = goals.filter((goal) => goal.status === "active").length;
    const completedGoals = goals.filter(
      (goal) => goal.status === "completed",
    ).length;
    const onTrackGoals = goals.filter(
      (goal) => getGoalStatus(goal) === "on-track",
    ).length;
    const onTrackPercentage = Math.round((onTrackGoals / totalGoals) * 100);

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      onTrackPercentage,
    };
  }, [goals]);

  const hasGoals = goals && goals.length > 0;

  // Auto-start walkthrough for new users
  useEffect(() => {
    if (hasGoals) {
      autoStartWalkthrough();
    }
  }, [hasGoals, autoStartWalkthrough]);

  // Now the early returns after all hooks are called
  if (isLoading) {
    return <GoalsLoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const getGoalStatus = (goal) => {
    if (goal.status === "completed") return "completed";

    const progress =
      goal.current_amount && goal.target_amount
        ? (goal.current_amount / goal.target_amount) * 100
        : 0;

    const daysUntilTarget = goal.target_date
      ? Math.ceil(
          (new Date(goal.target_date).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    if (progress >= 50 || daysUntilTarget > 30) return "on-track";
    return "needs-attention";
  };

  const pageVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.8, 0.5, 1],
      },
    },
  };

  return (
    <motion.main
      className="min-h-screen"
      role="main"
      aria-label="Goals Dashboard"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 font-medium focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        Skip to main content
      </a>

      {/* Compact Header - Mobile Optimized */}
      <div className="border-border/50 border-b">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <div
            className="flex items-center justify-between gap-3 sm:gap-6"
            data-tour="page-header"
          >
            <div className="min-w-0 flex-1">
              <h1 className="text-mobile-lg text-foreground mb-1 font-light sm:mb-2 sm:text-3xl md:text-4xl">
                Goals
              </h1>
              <p className="text-muted-foreground text-mobile-sm sm:text-base md:text-lg">
                Track & achieve financial goals
              </p>
            </div>
            <div className="shrink-0">
              <Link to="/dashboard/tracker/create">
                <button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-mobile-sm flex min-h-[44px] min-w-[44px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-full px-4 py-2.5 font-medium shadow-sm transition-all duration-200 hover:shadow-md sm:px-6 sm:py-3 sm:text-base"
                  data-tour="create-goal-btn"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Goal</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized Spacing */}
      <div
        id="main-content"
        className="mx-auto max-w-7xl space-y-4 px-0 py-4 sm:space-y-6 sm:px-6 sm:py-6 md:space-y-8 md:px-8 md:py-8"
        tabIndex={-1}
      >
        {hasGoals ? (
          <>
            {/* Compact Stats - Mobile First */}
            <div data-tour="stats-bar" className="px-3 sm:px-0">
              <StatsBar stats={statsData} />
            </div>

            {/* Spotlight Section - Compact Mobile */}
            <div data-tour="spotlight-section" className="px-3 sm:px-0">
              <SpotlightSection
                spotlightGoals={spotlightGoals}
                getGoalStatus={getGoalStatus}
              />
            </div>

            {/* Goals List - Edge-to-edge on Mobile */}
            <div data-tour="goals-list">
              <CommandCenter
                goals={sortedGoals}
                getGoalStatus={getGoalStatus}
                onUpdate={refetch}
              />
            </div>
          </>
        ) : (
          <EmptyGoalsState />
        )}
      </div>
    </motion.main>
  );
}

// Compact Spotlight Section - Mobile Optimized
const SpotlightSection = memo(function SpotlightSection({
  spotlightGoals,
  getGoalStatus,
}: {
  spotlightGoals: any[];
  getGoalStatus: (goal: any) => string;
}) {
  if (!spotlightGoals || spotlightGoals.length === 0) return null;

  return (
    <motion.section
      className="space-y-3 sm:space-y-4 md:space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-mobile-base text-foreground font-medium sm:text-xl md:text-2xl">
        Spotlight
      </h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 md:gap-6 lg:grid-cols-3">
        {spotlightGoals.map((goal, index) => (
          <SpotlightCard
            key={goal.id}
            goal={goal}
            type={goal.spotlightType}
            icon={getGoalIcon(goal)}
            status={getGoalStatus(goal)}
            reason={goal.spotlightReason}
            priority={index + 1}
          />
        ))}
      </div>
    </motion.section>
  );
});

// Compact Spotlight Card - Mobile Optimized
const SpotlightCard = memo(function SpotlightCard({
  goal,
  type,
  icon,
  status,
  reason,
  priority,
}: {
  goal: any;
  type:
    | "critical"
    | "urgency"
    | "attention"
    | "upcoming"
    | "success"
    | "momentum"
    | "stagnant";
  icon: any;
  status: string;
  reason?: string;
  priority?: number;
}) {
  const daysUntilTarget = goal.target_date
    ? Math.ceil(
        (new Date(goal.target_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <Link to={`/dashboard/tracker/${goal.id}`} params={{ goalId: goal.id }}>
      <motion.div
        className="bg-moneko-background min-h-[80px] cursor-pointer touch-manipulation rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:min-h-[120px] sm:rounded-2xl sm:p-6 md:rounded-3xl md:p-8"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="space-y-2 text-center sm:space-y-3 md:space-y-4">
          {/* Days Display - Compact on Mobile */}
          <div className="text-foreground text-xl font-light sm:text-2xl md:text-3xl">
            {daysUntilTarget > 0
              ? `${daysUntilTarget} Days`
              : daysUntilTarget === 0
                ? "Due Today"
                : "Overdue"}
          </div>

          {/* Goal Title - Compact Typography */}
          <div className="text-mobile-sm text-muted-foreground line-clamp-2 leading-tight font-medium sm:text-sm md:text-base">
            Until {goal.title}
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

// Compact Stats Bar - Mobile Optimized
const StatsBar = memo(function StatsBar({ stats }: { stats: any }) {
  const statItems = [
    {
      label: "Total",
      value: stats.totalGoals,
      icon: faBullseye,
      bgColor: "bg-blue-50/50 dark:bg-blue-950/30",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Active",
      value: stats.activeGoals,
      icon: faChartLine,
      bgColor: "bg-green-50/50 dark:bg-green-950/30",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      label: "Completed",
      value: stats.completedGoals,
      icon: faTrophy,
      bgColor: "bg-amber-50/50 dark:bg-amber-950/30",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Progress",
      value: `${stats.onTrackPercentage}%`,
      icon: faCheckCircle,
      bgColor: "bg-purple-50/50 dark:bg-purple-950/30",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <motion.section
      className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-6 lg:grid-cols-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {statItems.map((stat) => (
        <motion.div
          key={stat.label}
          className={`${stat.bgColor} min-h-[80px] rounded-xl p-3 text-center transition-all duration-200 hover:shadow-sm sm:min-h-[120px] sm:rounded-2xl sm:p-4 md:p-6`}
          whileHover={{ y: -1 }}
        >
          <div
            className={`h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 ${stat.iconBg} mx-auto mb-2 flex items-center justify-center rounded-lg sm:mb-3 sm:rounded-xl`}
          >
            <FontAwesomeIcon
              icon={stat.icon}
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 ${stat.iconColor}`}
            />
          </div>
          <div className="text-foreground mb-0.5 text-xl font-light sm:mb-1 sm:text-2xl md:text-3xl">
            {stat.value}
          </div>
          <div className="text-mobile-xs text-muted-foreground font-medium sm:text-xs md:text-sm">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </motion.section>
  );
});

// Compact Goals List - Mobile Edge-to-Edge
const CommandCenter = memo(function CommandCenter({
  goals,
  getGoalStatus,
  onUpdate,
}: {
  goals: any[];
  getGoalStatus: (goal: any) => string;
  onUpdate: () => void;
}) {
  return (
    <motion.section
      className="bg-moneko-background overflow-hidden rounded-none shadow-none transition-all duration-200 hover:shadow-md sm:rounded-2xl sm:shadow-sm md:rounded-3xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header - Compact on Mobile */}
      <div className="p-3 px-3 pb-2 sm:p-6 sm:pb-4 md:p-8 md:pb-6">
        <h2 className="text-mobile-base text-foreground font-medium sm:text-xl md:text-2xl">
          Goals
        </h2>
      </div>

      {/* Goals List */}
      <div className="space-y-0">
        {goals.length === 0 ? (
          <div className="px-4 py-8 text-center sm:py-12 md:py-16">
            <FontAwesomeIcon
              icon={faFilter}
              className="text-muted-foreground mb-2 h-8 w-8 sm:mb-3 sm:h-10 sm:w-10 md:mb-4 md:h-12 md:w-12"
            />
            <p className="text-mobile-sm text-muted-foreground sm:text-sm md:text-base">
              No goals match your current filter
            </p>
          </div>
        ) : (
          goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} getGoalStatus={getGoalStatus} />
          ))
        )}
      </div>
    </motion.section>
  );
});

// Compact Goal Card - Mobile Optimized
const GoalCard = memo(function GoalCard({
  goal,
  getGoalStatus,
}: {
  goal: any;
  getGoalStatus: (goal: any) => string;
}) {
  const progress =
    goal.current_amount && goal.target_amount
      ? (goal.current_amount / goal.target_amount) * 100
      : 0;

  return (
    <Link to={`/dashboard/tracker/${goal.id}`} params={{ goalId: goal.id }}>
      <motion.div
        className="group hover:bg-subtle-background/50 border-border/30 min-h-[60px] cursor-pointer touch-manipulation border-b px-3 py-3 transition-all duration-200 last:border-0 sm:min-h-[72px] sm:px-6 sm:py-4 md:px-8 md:py-5"
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
          {/* Compact Icon */}
          <div className="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl md:h-10 md:w-10">
            <FontAwesomeIcon
              icon={getGoalIcon(goal)}
              className="text-muted-foreground h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5"
            />
          </div>

          {/* Content - Compact */}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between sm:mb-2">
              <h3 className="text-mobile-sm text-foreground truncate font-medium sm:text-sm md:text-base">
                {goal.title}
              </h3>
              <span className="text-mobile-xs text-muted-foreground ml-2 flex-shrink-0 font-medium sm:ml-3 sm:text-xs md:ml-4 md:text-sm">
                {Math.round(progress)}%
              </span>
            </div>

            {/* Compact Progress Bar */}
            <div className="bg-muted h-1 w-full rounded-full sm:h-1.5 md:h-2">
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          <FontAwesomeIcon
            icon={faChevronRight}
            className="text-muted-foreground group-hover:text-foreground h-3 w-3 flex-shrink-0 transition-colors duration-200 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4"
          />
        </div>
      </motion.div>
    </Link>
  );
});

// Compact Empty State - Mobile Optimized
const EmptyGoalsState = memo(function EmptyGoalsState() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center px-4 py-8 sm:py-12 md:py-16 lg:py-20"
      role="region"
      aria-labelledby="empty-state-heading"
    >
      <div className="max-w-lg text-center">
        {/* Compact Icon Design */}
        <div className="relative mb-6 sm:mb-8 md:mb-10">
          <motion.div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl shadow-2xl sm:h-28 sm:w-28 sm:rounded-2xl md:h-36 md:w-36 md:rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
            animate={{
              rotate: [0, 5, 0, -5, 0],
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl sm:h-14 sm:w-14 sm:rounded-xl md:h-18 md:w-18 md:rounded-2xl">
              <FontAwesomeIcon
                icon={faBullseye}
                className="h-5 w-5 text-white sm:h-7 sm:w-7 md:h-9 md:w-9"
                aria-hidden="true"
              />
            </div>
          </motion.div>

          <motion.div
            className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl sm:-right-2 sm:-bottom-2 sm:h-11 sm:w-11 md:-right-4 md:-bottom-4 md:h-14 md:w-14"
            animate={{
              y: [0, -8, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <FontAwesomeIcon
              icon={faPlus}
              className="h-3 w-3 text-white sm:h-4 sm:w-4 md:h-5 md:w-5"
              aria-hidden="true"
            />
          </motion.div>
        </div>

        {/* Compact Typography */}
        <motion.h2
          id="empty-state-heading"
          className="text-mobile-lg mb-2 leading-tight font-bold text-gray-900 sm:mb-3 sm:text-2xl md:mb-4 md:text-3xl dark:text-white"
        >
          Start Your Financial Journey
        </motion.h2>

        <motion.p className="text-mobile-sm mx-auto mb-6 max-w-md px-2 leading-relaxed text-gray-600 sm:mb-8 sm:text-base md:mb-10 md:text-lg dark:text-gray-400">
          Transform your financial dreams into achievable goals with AI-powered
          strategies.
        </motion.p>

        {/* Compact Benefits Grid */}
        <div
          className="mb-6 grid grid-cols-3 gap-2.5 sm:mb-8 sm:gap-4 md:mb-10 md:gap-6"
          role="list"
          aria-label="Goal tracker benefits"
        >
          {[
            {
              icon: faWandSparkles,
              label: "AI Strategy",
              color: "from-blue-500 to-blue-600",
            },
            {
              icon: faBullseye,
              label: "Milestones",
              color: "from-green-500 to-emerald-600",
            },
            {
              icon: faTrophy,
              label: "Progress",
              color: "from-purple-500 to-purple-600",
            },
          ].map((benefit, index) => (
            <motion.div
              key={benefit.label}
              className="text-center"
              role="listitem"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.2 + index * 0.1,
                duration: 0.4,
                ease: [0.25, 0.8, 0.5, 1],
              }}
            >
              <div
                className={`mx-auto h-10 w-10 bg-gradient-to-br sm:h-12 sm:w-12 md:h-14 md:w-14 ${benefit.color} mb-1.5 flex items-center justify-center rounded-lg shadow-lg sm:mb-2 sm:rounded-xl md:mb-3 md:rounded-2xl`}
              >
                <FontAwesomeIcon
                  icon={benefit.icon}
                  className="h-4 w-4 text-white sm:h-5 sm:w-5 md:h-6 md:w-6"
                  aria-hidden="true"
                />
              </div>
              <p className="text-mobile-xs font-semibold text-gray-700 sm:text-xs md:text-sm dark:text-gray-300">
                {benefit.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Enhanced CTA */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/dashboard/tracker/create"
            aria-describedby="empty-state-heading"
          >
            <button
              className="group flex h-11 min-h-[44px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-blue-600 to-purple-600 px-5 text-sm font-bold text-white shadow-2xl transition-all duration-300 hover:from-blue-700 hover:to-purple-700 sm:h-12 sm:w-auto sm:gap-3 sm:rounded-2xl sm:px-6 sm:text-base md:h-14 md:px-8 md:text-lg lg:px-10 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600"
              aria-label="Create your first financial goal"
            >
              <FontAwesomeIcon
                icon={faWandSparkles}
                className="transition-transform group-hover:rotate-12"
                aria-hidden="true"
              />
              <span className="xs:inline hidden">Create Your First Goal</span>
              <span className="xs:hidden">Create Goal</span>
              <FontAwesomeIcon
                icon={faArrowRight}
                className="transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
});

// Compact Loading Skeleton - Mobile Optimized
const GoalsLoadingSkeleton = memo(function GoalsLoadingSkeleton() {
  return (
    <main
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      role="main"
      aria-label="Loading goal tracker data"
    >
      <div aria-live="polite" aria-label="Loading your goals">
        <span className="sr-only">
          Loading your financial goals, please wait...
        </span>
      </div>

      {/* Compact Header Skeleton */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            <div className="flex-1 space-y-1.5 sm:space-y-2">
              <div className="h-5 w-20 animate-pulse rounded bg-gray-200/60 sm:h-6 sm:w-24 md:h-8 md:w-32 dark:bg-gray-700/60"></div>
              <div className="h-3.5 w-36 animate-pulse rounded bg-gray-200/60 sm:h-4 sm:w-48 md:h-5 md:w-64 dark:bg-gray-700/60"></div>
            </div>
            <div className="h-11 w-11 animate-pulse rounded-full bg-gray-200/60 sm:w-40 dark:bg-gray-700/60"></div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-0 py-4 sm:space-y-6 sm:px-6 sm:py-6 md:space-y-8 md:px-8 md:py-8">
        {/* Stats Skeleton - Compact on Mobile */}
        <div className="px-3 sm:px-0">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-6 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="min-h-[80px] animate-pulse space-y-2 rounded-xl border border-gray-200 bg-white p-3 text-center sm:min-h-[120px] sm:space-y-3 sm:rounded-2xl sm:p-4 md:p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mx-auto h-8 w-8 rounded-lg bg-gray-200/60 sm:h-10 sm:w-10 sm:rounded-xl md:h-12 md:w-12 dark:bg-gray-700/60"></div>
                <div className="mx-auto h-4 w-10 rounded bg-gray-200/60 sm:h-5 sm:w-12 md:h-6 md:w-16 dark:bg-gray-700/60"></div>
                <div className="mx-auto h-2.5 w-12 rounded bg-gray-200/60 sm:h-3 sm:w-16 md:h-4 md:w-20 dark:bg-gray-700/60"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Spotlight Skeleton - Compact */}
        <div className="space-y-3 px-3 sm:space-y-4 sm:px-0">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200/60 sm:h-5 sm:w-20 md:h-6 md:w-24 dark:bg-gray-700/60"></div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 md:gap-6 lg:grid-cols-3">
            <div className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white sm:h-28 sm:rounded-2xl md:h-32 dark:border-gray-700 dark:bg-gray-800"></div>
            <div className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white sm:h-28 sm:rounded-2xl md:h-32 dark:border-gray-700 dark:bg-gray-800"></div>
            <div className="hidden h-20 animate-pulse rounded-xl border border-gray-200 bg-white sm:h-28 sm:rounded-2xl md:h-32 lg:block dark:border-gray-700 dark:bg-gray-800"></div>
          </div>
        </div>

        {/* Goals List Skeleton - Edge-to-edge Mobile */}
        <div className="space-y-3 sm:space-y-4">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200/60 px-3 sm:h-5 sm:w-20 sm:px-0 md:h-6 md:w-24 dark:bg-gray-700/60"></div>
          <div className="space-y-0">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-none border-b border-gray-200 bg-white sm:h-20 sm:rounded-2xl sm:border md:h-24 dark:border-gray-700 dark:bg-gray-800"
              ></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
});

// Compact Error State - Mobile Optimized
const ErrorState = memo(function ErrorState({
  error,
  onRetry,
}: {
  error: any;
  onRetry: () => void;
}) {
  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900"
      role="main"
    >
      <div className="max-w-md px-4 text-center sm:px-6">
        <motion.div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl shadow-2xl sm:mb-6 sm:h-20 sm:w-20 sm:rounded-2xl md:mb-8 md:h-24 md:w-24 md:rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 101, 101, 0.1) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 5, 0, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 sm:h-10 sm:w-10 sm:rounded-xl md:h-12 md:w-12 md:rounded-2xl">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="h-4 w-4 text-white sm:h-5 sm:w-5 md:h-6 md:w-6"
              aria-hidden="true"
            />
          </div>
        </motion.div>

        <h2 className="text-mobile-lg mb-2 leading-tight font-bold text-gray-900 sm:mb-3 sm:text-xl md:mb-4 md:text-2xl dark:text-white">
          Failed to Load Goals
        </h2>

        <p className="text-mobile-sm mb-4 leading-relaxed text-gray-600 sm:mb-6 sm:text-sm md:mb-8 md:text-base dark:text-gray-400">
          {error?.message ||
            "Something went wrong while loading your goals. Please try again."}
        </p>

        <div role="alert" aria-live="polite" className="sr-only">
          Error loading goals: {error?.message || "Unknown error occurred"}
        </div>

        <motion.button
          onClick={handleRetry}
          className="text-mobile-sm mx-auto flex h-11 min-h-[44px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 sm:h-12 sm:w-auto sm:px-8 sm:text-sm md:text-base dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600"
          aria-label="Retry loading goals"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FontAwesomeIcon
            icon={faRefresh}
            className="h-4 w-4"
            aria-hidden="true"
          />
          <span>Try Again</span>
        </motion.button>
      </div>
    </main>
  );
});

export default GoalsTracker;
