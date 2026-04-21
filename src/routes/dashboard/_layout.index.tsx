"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  createFileRoute,
  lazyRouteComponent,
  Link,
} from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { motion, Variants } from "framer-motion";
import {
  TrendingUp,
  BookOpen,
  Calculator,
  MessageCircle,
  Target,
  Flame,
  DollarSign,
  GraduationCap,
  PiggyBank,
  Shield,
  Home,
  Calendar,
  Plus,
  ArrowRight,
  Gift,
  Trophy,
  User,
  CheckCircle,
  CreditCard,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery } from "@tanstack/react-query";
import { type Conversation } from "@/services/conversation-service";
import basicCourse from "@/data/basic-lessons.json";
import {
  getCurrentLevelInfo,
  LEVEL_REWARDS,
  LEVEL_REQUIREMENTS,
} from "@/components/rewards/rewards-level";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { Timeline } from "@/components/timeline/Timeline";
import { useAIChat } from "@/contexts/ai-chat-context";
import monekoAvatar from "@/assets/images/logo/moneko.png";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { GuidanceTestPanel } from "@/components/dashboard/GuidanceTestPanel";

export const Route = createFileRoute("/dashboard/_layout/")({
  component: lazyRouteComponent(
    () => import("@/components/performance/dashboard-home-route-component"),
    "DashboardHomeRouteComponent",
  ),
  head: () => {
    const pageUrl = getCanonicalUrl("/dashboard");
    const title = "Dashboard Home - AI Portfolio Tracker & Learning | Moneko";
    const description =
      "Personal finance command center. Track investments, monitor health, AI coaching, learning modules & wealth building calculators.";
    const keywords =
      "personal finance dashboard, investment portfolio tracker, financial health monitor, AI financial coaching, financial education platform, wealth building tools, budgeting dashboard, retirement planning";
    const imageUrl = "https://moneko.io/og-img.png";

    const meta = seo({
      title,
      description,
      keywords,
      url: pageUrl,
      image: imageUrl,
    });

    return {
      title,
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

// Subtle Apple-inspired animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // Apple-like easing
    },
  },
};

function DashboardHome() {
  const { user } = useAuth();
  // Rewards modal state
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  // Test panel state - set to true for testing the new floating bubble system
  const [showTestPanel, setShowTestPanel] = useState(false);

  // UNIFIED DATA HOOK - eliminates code duplication across dashboard
  const {
    dashboardData,
    dashboardViews: views,
    remoteCourses,
    coursesLoading,
    gamificationData,
    profileData: financialProfile,
    profileLoading,
  } = useDashboardData();

  const {
    subscription,
    features,
    invoices,
    isLoading: subLoading,
    isActive,
  } = useSubscription(user?.id);

  // Get completed lessons data using the same method as course detail page
  const { data: completedLessons = [], isLoading: isLoadingCompleted } =
    useCompletedLessons(user?.id);

  // Include essentials course with remote courses for consistent data
  const courses = useMemo(() => {
    return [basicCourse as any, ...remoteCourses];
  }, [remoteCourses]);

  // Check if user has profile for proper display
  const hasProfile = !!financialProfile;

  // Fetch real conversation data
  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery<Conversation[]>({
      queryKey: ["conversations", user?.id],
      queryFn: async () => {
        if (!user) return [];
        // Conversation functionality - returns empty array for initial implementation
        return [] as Conversation[];
      },
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
    });

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.user_metadata?.full_name?.split(" ")[0] || "there";

    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  // Calculate real learning progress from actual course data using consistent logic
  const learningInsights = useMemo(() => {
    if (coursesLoading || isLoadingCompleted || !courses.length) {
      return {
        hasCourses: false,
        totalCourses: 0,
        totalLessons: 0,
        completedLessons: 0,
        progress: 0,
        currentCourse: null,
        nextLesson: null,
        totalXP: 0,
        earnedXP: 0,
        recentActivity: null,
      };
    }

    const totalLessons = courses.reduce(
      (acc, course) => acc + course.lessons.length,
      0,
    );

    // Count completed lessons using the same logic as course detail page
    const totalCompletedLessons = completedLessons.length;

    // Calculate total available XP and earned XP
    const totalXP = courses.reduce(
      (acc: number, course: any) =>
        acc +
        course.lessons.reduce(
          (xpAcc: number, lesson: any) => xpAcc + (lesson.xp || 0),
          0,
        ),
      0,
    );

    const earnedXP = completedLessons.reduce((acc, completedLesson) => {
      // Find the lesson across all courses
      const lesson = courses
        .flatMap((course: any) => course.lessons)
        .find((l: any) => l.id === completedLesson.lesson_id);
      return acc + (lesson?.xp || 0);
    }, 0);

    // Find current course with most recent activity
    let currentCourse: any = null;
    let mostRecentCompletedLesson: any = null;

    if (completedLessons.length > 0) {
      // Get the most recent completed lesson (using created_at instead of completed_at)
      const sortedCompleted = [...completedLessons].sort(
        (a, b) =>
          new Date((b as any).created_at || 0).getTime() -
          new Date((a as any).created_at || 0).getTime(),
      );

      if (sortedCompleted[0]) {
        mostRecentCompletedLesson = sortedCompleted[0];
        // Find which course this lesson belongs to
        currentCourse = courses.find((course: any) =>
          course.lessons.some(
            (lesson: any) => lesson.id === mostRecentCompletedLesson.lesson_id,
          ),
        );
      }
    }

    // If no completed lessons, default to essentials course
    if (!currentCourse) {
      currentCourse =
        courses.find(
          (course: any) => course.course_id === basicCourse.course_id,
        ) || courses[0];
    }

    // Find next lesson using the same logic as course detail page
    let nextLesson: any = null;
    if (currentCourse) {
      const isEssentialsCourse =
        currentCourse.course_id === basicCourse.course_id;
      const courseCompletedLessons = completedLessons.filter((cl) =>
        currentCourse.lessons.some((lesson: any) => lesson.id === cl.lesson_id),
      );

      if (isEssentialsCourse) {
        // For essentials course, find first lesson that's unlocked but not completed
        nextLesson = currentCourse.lessons.find(
          (lesson: any, index: number) => {
            const isCompleted = courseCompletedLessons.some(
              (cl) => cl.lesson_id === lesson.id,
            );
            if (isCompleted) return false;

            // First lesson is always unlocked
            if (index === 0) return true;

            // Subsequent lessons are unlocked if previous lesson is completed
            const previousLesson = currentCourse.lessons[index - 1];
            return courseCompletedLessons.some(
              (cl) => cl.lesson_id === previousLesson.id,
            );
          },
        );
      } else {
        // For other courses, use the lesson's unlocked property
        nextLesson = currentCourse.lessons.find(
          (lesson: any) =>
            lesson.unlocked &&
            !courseCompletedLessons.some((cl) => cl.lesson_id === lesson.id),
        );
      }
    }

    // Get most recent lesson activity
    const recentActivity = mostRecentCompletedLesson
      ? courses
          .flatMap((course: any) => course.lessons)
          .find(
            (lesson: any) => lesson.id === mostRecentCompletedLesson.lesson_id,
          )
      : null;

    return {
      hasCourses: true,
      totalCourses: courses.length,
      totalLessons,
      completedLessons: totalCompletedLessons,
      progress:
        totalLessons > 0 ? (totalCompletedLessons / totalLessons) * 100 : 0,
      currentCourse,
      nextLesson,
      totalXP,
      earnedXP,
      recentActivity,
    };
  }, [courses, coursesLoading, completedLessons, isLoadingCompleted]);

  // Real subscription insights
  const subscriptionInsights = useMemo(() => {
    if (subLoading || !subscription) {
      return {
        isSubscribed: false,
        plan: null,
        status: null,
        daysUntilRenewal: null,
        featuresCount: 0,
        billingAmount: null,
        isTrialing: false,
        isCancelled: false,
      };
    }

    const isTrialing = subscription.status === "trialing";
    const isCancelled = subscription.cancel_at_period_end;

    return {
      isSubscribed: isActive,
      plan: subscription.plan,
      status: subscription.status,
      daysUntilRenewal: subscription.days_until_next_payment,
      featuresCount: features.filter((f) => f.included).length,
      billingAmount: invoices[0]?.amount_paid || null,
      isTrialing,
      isCancelled,
      nextPaymentDate: subscription.next_payment_date,
    };
  }, [subscription, features, invoices, isActive, subLoading]);

  // Enhanced financial profile insights for widget
  const financialProfileInsights = useMemo(() => {
    if (profileLoading || !hasProfile || !financialProfile) {
      return {
        hasProfile: false,
        completionPercentage: 0,
        filledFields: [],
        missingFields: [],
        keyMetrics: {},
      };
    }

    const quizAnswers = financialProfile.quiz_answers as any;

    // Define important fields for profile completion
    const importantFields = [
      { key: "current_age", label: "Age", value: quizAnswers.current_age },
      {
        key: "net_monthly_income",
        label: "Monthly Income",
        value: quizAnswers.net_monthly_income,
        format: "currency",
      },
      {
        key: "marital_status",
        label: "Marital Status",
        value: quizAnswers.marital_status,
        format: "text",
      },
      { key: "dependents", label: "Dependents", value: quizAnswers.dependents },
      {
        key: "housing_cost",
        label: "Housing Cost",
        value: quizAnswers.housing_cost,
        format: "currency",
      },
      {
        key: "savings_rate",
        label: "Savings Rate",
        value: quizAnswers.savings_rate,
        format: "percentage",
      },
      {
        key: "emergency_fund",
        label: "Emergency Fund",
        value: quizAnswers.emergency_fund,
        format: "currency",
      },
      {
        key: "retirement_age",
        label: "Retirement Age",
        value: quizAnswers.retirement_age,
      },
      {
        key: "risk_tolerance",
        label: "Risk Tolerance",
        value: quizAnswers.risk_tolerance,
        format: "text",
      },
      {
        key: "investment_experience",
        label: "Investment Experience",
        value: quizAnswers.investment_experience,
        format: "text",
      },
    ];

    // Calculate filled vs missing fields
    const filledFields = importantFields.filter((field) => {
      const value = field.value;
      return (
        value !== null &&
        value !== undefined &&
        value !== 0 &&
        value !== "" &&
        (Array.isArray(value) ? value.length > 0 : true)
      );
    });

    const missingFields = importantFields.filter((field) => {
      const value = field.value;
      return (
        value === null ||
        value === undefined ||
        value === 0 ||
        value === "" ||
        (Array.isArray(value) ? value.length === 0 : false)
      );
    });

    const completionPercentage = Math.round(
      (filledFields.length / importantFields.length) * 100,
    );

    // Calculate key metrics from filled data
    const keyMetrics: {
      monthlyIncome?: number;
      monthlySavings?: number;
      emergencyFund?: number;
      yearsToRetirement?: number;
    } = {};

    if (quizAnswers.net_monthly_income) {
      keyMetrics.monthlyIncome = quizAnswers.net_monthly_income;
    }
    if (quizAnswers.savings_rate && quizAnswers.net_monthly_income) {
      keyMetrics.monthlySavings = Math.round(
        quizAnswers.net_monthly_income * (quizAnswers.savings_rate / 100),
      );
    }
    if (quizAnswers.emergency_fund) {
      keyMetrics.emergencyFund = quizAnswers.emergency_fund;
    }
    if (quizAnswers.current_age && quizAnswers.retirement_age) {
      keyMetrics.yearsToRetirement = Math.max(
        0,
        quizAnswers.retirement_age - quizAnswers.current_age,
      );
    }

    return {
      hasProfile: true,
      completionPercentage,
      filledFields: filledFields.slice(0, 6), // Show top 6 filled fields
      missingFields: missingFields.slice(0, 4), // Show top 4 missing fields
      keyMetrics,
    };
  }, [financialProfile, profileLoading, hasProfile]);

  // Real conversation insights
  const conversationInsights = useMemo(() => {
    if (conversationsLoading || !conversations.length) {
      return {
        hasConversations: false,
        totalConversations: 0,
        recentConversation: null,
        totalMessages: 0,
        activeConversations: 0,
      };
    }

    const activeConversations = conversations.filter(
      (conv) => conv.is_active,
    ).length;
    const totalMessages = conversations.reduce(
      (acc, conv) => acc + (conv.messages?.length || 0),
      0,
    );
    const recentConversation = conversations.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0];

    return {
      hasConversations: true,
      totalConversations: conversations.length,
      recentConversation,
      totalMessages,
      activeConversations,
    };
  }, [conversations, conversationsLoading]);

  const { openChat } = useAIChat();

  // Modern calculator data with Lucide icons
  const availableCalculators = [
    {
      title: "Compound Interest",
      description: "Calculate investment growth with compound returns",
      icon: TrendingUp,
      path: "/calculators/compound-calculator",
      color: "bg-primary",
      category: "Investment",
    },
    {
      title: "Mortgage Calculator",
      description: "Estimate monthly payments and total interest",
      icon: Home,
      path: "/calculators/mortgage-calculator",
      color: "bg-secondary",
      category: "Housing",
    },
    {
      title: "Savings Goals",
      description: "Plan and track your financial objectives",
      icon: PiggyBank,
      path: "/calculators/saving-goals-calculator",
      color: "bg-accent",
      category: "Savings",
    },
    {
      title: "Investment Growth",
      description: "Project portfolio returns over time",
      icon: Target,
      path: "/calculators/investment-calculator",
      color: "bg-muted",
      category: "Investment",
    },
    {
      title: "Auto Loan",
      description: "Calculate car loan payments and costs",
      icon: DollarSign,
      path: "/calculators/auto-loan-calculator",
      color: "bg-primary/90",
      category: "Debt",
    },
    {
      title: "Retirement Planner",
      description: "Plan for your golden years",
      icon: CreditCard,
      path: "/calculators/retirement-calculator",
      color: "bg-secondary/90",
      category: "Retirement",
    },
  ];

  const currentStreak = gamificationData.streak;
  const currentXP = gamificationData.xp;
  const levelInfo = getCurrentLevelInfo(currentXP);

  const currentLevelReward = LEVEL_REWARDS.find(
    (r) => r.level === levelInfo.level,
  );
  const nextLevelReward = LEVEL_REWARDS.find(
    (r) => r.level === levelInfo.level + 1,
  );

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="flex items-center space-x-3">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
          <span className="text-muted-foreground text-sm">
            Loading your dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="bg-moneko-background min-h-screen"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
          {/* Test Panel - TEMPORARY FOR TESTING */}
          {showTestPanel && (
            <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
              <GuidanceTestPanel onClose={() => setShowTestPanel(false)} />
            </motion.div>
          )}

          {/* Welcome Header - Clean Apple-inspired, Mobile Optimized */}
          <motion.div
            variants={itemVariants}
            className="mb-8 sm:mb-12 md:mb-16"
          >
            <div className="flex flex-col space-y-6 sm:space-y-8 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="flex flex-col space-y-4 sm:space-y-6 md:flex-row md:items-center md:space-y-0 md:space-x-8">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24">
                  <AvatarImage src={monekoAvatar} alt="Moneko Avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-medium sm:text-xl">
                    M
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 sm:space-y-2">
                  <h1 className="text-foreground text-2xl font-light tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
                    {getGreeting()}
                  </h1>
                  <p className="text-muted-foreground text-base sm:text-lg md:text-xl">
                    Ready to master your finances today?
                  </p>
                </div>
              </div>

              {/* Level and Streak Info - Mobile Optimized */}
              <div className="flex gap-3 sm:gap-4">
                {currentLevelReward && (
                  <div className="bg-muted/30 flex-1 rounded-xl p-3 text-center sm:flex-none sm:rounded-2xl sm:p-4 md:p-6 dark:bg-slate-800/30">
                    <div className="text-foreground mb-0.5 text-lg font-semibold sm:mb-1 sm:text-xl md:text-2xl">
                      Level {levelInfo.level}
                    </div>
                    <div className="text-muted-foreground truncate text-xs sm:text-sm">
                      {currentLevelReward.title}
                    </div>
                  </div>
                )}

                <div className="flex-1 rounded-xl bg-orange-50 p-3 text-center sm:flex-none sm:rounded-2xl sm:p-4 md:p-6 dark:bg-orange-950/30">
                  <div className="mb-0.5 text-lg font-semibold text-orange-600 sm:mb-1 sm:text-xl md:text-2xl dark:text-orange-400">
                    {currentStreak}
                  </div>
                  <div className="text-xs text-orange-600/70 sm:text-sm dark:text-orange-400/70">
                    day streak
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* XP Progress Bar - Mobile Optimized */}
          <motion.div
            variants={itemVariants}
            className="mb-8 sm:mb-12 md:mb-16"
          >
            <div className="rounded-2xl bg-white p-4 sm:rounded-3xl sm:p-6 md:p-8 dark:bg-slate-900">
              <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                <div>
                  <h2 className="text-foreground mb-1 text-lg font-medium sm:mb-2 sm:text-xl md:text-2xl">
                    Progress to Next Level
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    {levelInfo.progressInLevel.toLocaleString()} /{" "}
                    {(
                      levelInfo.nextLevelXP - levelInfo.currentLevelXP
                    ).toLocaleString()}{" "}
                    XP
                  </p>
                </div>
                {!levelInfo.isMaxLevel && (
                  <div className="text-left sm:text-right">
                    <div className="text-primary mb-0.5 text-2xl font-light sm:mb-1 sm:text-3xl md:text-4xl">
                      {levelInfo.xpNeededForNext.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground text-xs sm:text-sm">
                      XP to level {levelInfo.level + 1}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6 sm:mb-8">
                <Progress
                  value={levelInfo.progressPercentage}
                  className="h-2"
                />
              </div>

              {nextLevelReward && (
                <div className="border-border/50 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:pt-6">
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    Next reward: {nextLevelReward.reward}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRewardsModal(true)}
                    className="text-primary hover:text-primary/80 w-full transition-colors duration-200 sm:w-auto"
                  >
                    View All Rewards
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Main Dashboard Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 lg:grid-cols-3">
            {/* Left Column - 2 spans */}
            <div className="space-y-4 sm:space-y-6 md:space-y-8 lg:col-span-2">
              {/* Financial Overview Card - Mobile Optimized */}
              <motion.div variants={itemVariants}>
                <div className="rounded-2xl bg-white p-4 sm:rounded-3xl sm:p-6 md:p-8 dark:bg-slate-900">
                  <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                    <div>
                      <h2 className="text-foreground mb-1 text-lg font-medium sm:mb-2 sm:text-xl md:text-2xl">
                        Financial Overview
                      </h2>
                      <p className="text-muted-foreground text-sm sm:text-base">
                        Your financial snapshot
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full rounded-full sm:w-auto"
                    >
                      <Link to="/dashboard/user-settings/profile">
                        Update Profile
                      </Link>
                    </Button>
                  </div>

                  {financialProfileInsights.hasProfile ? (
                    <div className="space-y-6 sm:space-y-8">
                      {/* Key Metrics Grid - Mobile Optimized */}
                      {Object.keys(financialProfileInsights.keyMetrics).length >
                        0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6">
                          {financialProfileInsights.keyMetrics
                            .monthlyIncome && (
                            <div className="rounded-xl bg-green-50/50 p-4 text-center sm:rounded-2xl sm:p-5 md:p-6 dark:bg-green-950/30">
                              <div className="text-foreground mb-1 text-2xl font-light sm:mb-2 sm:text-2xl md:text-3xl">
                                $
                                {financialProfileInsights.keyMetrics.monthlyIncome.toLocaleString()}
                              </div>
                              <div className="text-muted-foreground text-xs sm:text-sm">
                                Monthly Income
                              </div>
                            </div>
                          )}

                          {financialProfileInsights.keyMetrics
                            .monthlySavings && (
                            <div className="rounded-xl bg-blue-50/50 p-4 text-center sm:rounded-2xl sm:p-5 md:p-6 dark:bg-blue-950/30">
                              <div className="text-foreground mb-1 text-2xl font-light sm:mb-2 sm:text-2xl md:text-3xl">
                                $
                                {financialProfileInsights.keyMetrics.monthlySavings.toLocaleString()}
                              </div>
                              <div className="text-muted-foreground text-xs sm:text-sm">
                                Monthly Savings
                              </div>
                            </div>
                          )}

                          {financialProfileInsights.keyMetrics
                            .emergencyFund && (
                            <div className="rounded-xl bg-purple-50/50 p-4 text-center sm:rounded-2xl sm:p-5 md:p-6 dark:bg-purple-950/30">
                              <div className="text-foreground mb-1 text-2xl font-light sm:mb-2 sm:text-2xl md:text-3xl">
                                $
                                {financialProfileInsights.keyMetrics.emergencyFund.toLocaleString()}
                              </div>
                              <div className="text-muted-foreground text-xs sm:text-sm">
                                Emergency Fund
                              </div>
                            </div>
                          )}

                          {financialProfileInsights.keyMetrics
                            .yearsToRetirement && (
                            <div className="rounded-xl bg-amber-50/50 p-4 text-center sm:rounded-2xl sm:p-5 md:p-6 dark:bg-amber-950/30">
                              <div className="text-foreground mb-1 text-2xl font-light sm:mb-2 sm:text-2xl md:text-3xl">
                                {
                                  financialProfileInsights.keyMetrics
                                    .yearsToRetirement
                                }
                              </div>
                              <div className="text-muted-foreground text-xs sm:text-sm">
                                Years to Retire
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Profile Completion - Mobile Optimized */}
                      <div className="bg-muted/20 rounded-xl p-4 sm:rounded-2xl sm:p-5 md:p-6 dark:bg-slate-800/20">
                        <div className="mb-3 flex items-center justify-between sm:mb-4">
                          <h4 className="text-base font-medium sm:text-lg">
                            Profile Completion
                          </h4>
                          <span className="text-primary text-sm font-medium">
                            {financialProfileInsights.completionPercentage}%
                          </span>
                        </div>
                        <Progress
                          value={financialProfileInsights.completionPercentage}
                          className="h-2"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center sm:py-12 md:py-16">
                      <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl sm:mb-6 sm:h-20 sm:w-20 sm:rounded-3xl md:mb-8 md:h-24 md:w-24">
                        <User className="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" />
                      </div>
                      <h3 className="text-foreground mb-3 px-4 text-xl font-light sm:mb-4 sm:text-2xl">
                        Create Your Financial Profile
                      </h3>
                      <p className="text-muted-foreground mx-auto mb-6 max-w-md px-4 text-sm leading-relaxed sm:mb-8 sm:text-base">
                        Get personalized recommendations based on your financial
                        goals and current situation
                      </p>
                      <Button
                        size="lg"
                        asChild
                        className="mx-4 w-auto rounded-full"
                      >
                        <Link to="/dashboard/user-settings/profile">
                          Create Profile
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Learning Progress Card - Mobile Optimized */}
              <motion.div variants={itemVariants}>
                <div className="rounded-2xl bg-white p-4 sm:rounded-3xl sm:p-6 md:p-8 dark:bg-slate-900">
                  <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                    <div>
                      <h2 className="text-foreground mb-1 text-lg font-medium sm:mb-2 sm:text-xl md:text-2xl">
                        Learning Progress
                      </h2>
                      <p className="text-muted-foreground text-sm sm:text-base">
                        Your educational journey
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full rounded-full sm:w-auto"
                    >
                      <Link to="/dashboard/learning">View All Courses</Link>
                    </Button>
                  </div>

                  {learningInsights.hasCourses ? (
                    <div className="space-y-6 sm:space-y-8">
                      {/* Stats Grid - Mobile Optimized: 3 columns even on mobile but smaller */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
                        <div className="rounded-xl bg-green-50/50 p-3 text-center sm:rounded-2xl sm:p-4 md:p-6 dark:bg-green-950/30">
                          <div className="text-foreground mb-1 text-xl font-light sm:mb-2 sm:text-2xl md:text-3xl">
                            {learningInsights.completedLessons}
                          </div>
                          <div className="text-muted-foreground text-xs sm:text-sm">
                            Completed
                          </div>
                        </div>
                        <div className="rounded-xl bg-blue-50/50 p-3 text-center sm:rounded-2xl sm:p-4 md:p-6 dark:bg-blue-950/30">
                          <div className="text-foreground mb-1 text-xl font-light sm:mb-2 sm:text-2xl md:text-3xl">
                            {learningInsights.earnedXP}
                          </div>
                          <div className="text-muted-foreground text-xs sm:text-sm">
                            XP Earned
                          </div>
                        </div>
                        <div className="rounded-xl bg-purple-50/50 p-3 text-center sm:rounded-2xl sm:p-4 md:p-6 dark:bg-purple-950/30">
                          <div className="text-foreground mb-1 text-xl font-light sm:mb-2 sm:text-2xl md:text-3xl">
                            {Math.round(learningInsights.progress)}%
                          </div>
                          <div className="text-muted-foreground text-xs sm:text-sm">
                            Progress
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar - Mobile Optimized */}
                      <div>
                        <Progress
                          value={learningInsights.progress}
                          className="h-2"
                        />
                      </div>

                      {/* Next Lesson - Mobile Optimized */}
                      {learningInsights.nextLesson && (
                        <div className="bg-muted/20 rounded-xl p-4 sm:rounded-2xl sm:p-5 md:p-6 dark:bg-slate-800/20">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                            <div className="flex-1">
                              <h4 className="text-foreground mb-2 text-base font-medium sm:mb-3 sm:text-lg">
                                Continue Learning
                              </h4>
                              <p className="text-foreground mb-1 text-sm font-medium sm:text-base">
                                {learningInsights.nextLesson.title}
                              </p>
                              <p className="text-foreground text-xs sm:text-sm">
                                {learningInsights.currentCourse?.title}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              asChild
                              className="w-full rounded-full sm:ml-6 sm:w-auto"
                            >
                              <Link
                                to={
                                  `/dashboard/learning/${learningInsights.currentCourse?.course_id}/lesson/${learningInsights.nextLesson.lesson_id}` as any
                                }
                              >
                                Continue
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Recent Activity - Mobile Optimized */}
                      <div className="bg-muted/20 rounded-xl p-4 sm:rounded-2xl sm:p-5 md:p-6">
                        <h4 className="text-foreground mb-4 text-base font-medium sm:mb-6 sm:text-lg">
                          Recent Activity
                        </h4>
                        <Timeline />
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center sm:py-12 md:py-16">
                      <div className="bg-muted/30 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl sm:mb-6 sm:h-20 sm:w-20 sm:rounded-3xl md:mb-8 md:h-24 md:w-24">
                        <BookOpen className="text-muted-foreground h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12" />
                      </div>
                      <h3 className="text-foreground mb-3 px-4 text-xl font-light sm:mb-4 sm:text-2xl">
                        Start Learning
                      </h3>
                      <p className="text-muted-foreground mx-auto mb-6 max-w-md px-4 text-sm leading-relaxed sm:mb-8 sm:text-base">
                        Begin your financial education journey with our
                        comprehensive courses
                      </p>
                      <Button
                        size="lg"
                        asChild
                        className="mx-4 w-auto rounded-full"
                      >
                        <Link to="/dashboard/learning">Explore Courses</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Column - 1 span, Mobile Optimized */}
            {/* TODO: Restore right column cards - see DashboardRightColumn component */}
          </div>
        </div>
      </motion.div>

      {/* Premium Rewards Experience - Mobile Optimized */}
      {showRewardsModal && (
        <Modal
          isOpen={showRewardsModal}
          onClose={() => setShowRewardsModal(false)}
          width="xwide"
          contentClassName="p-0 bg-gradient-to-br from-background via-background to-muted/20"
        >
          <div className="border-border/50 max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border bg-white/95 shadow-2xl backdrop-blur-xl sm:rounded-3xl dark:bg-slate-900/95">
            {/* Glassmorphism Header - Mobile Optimized */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
              <div className="relative px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
                      <motion.div
                        className="relative rounded-xl border border-yellow-300/20 bg-gradient-to-br from-yellow-400/20 to-yellow-500/30 p-2 backdrop-blur-sm sm:rounded-2xl sm:p-3 md:p-4"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <Trophy className="h-5 w-5 text-yellow-600 sm:h-6 sm:w-6 md:h-7 md:w-7 dark:text-yellow-400" />
                        <div className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 sm:h-3 sm:w-3"></div>
                      </motion.div>
                      <div>
                        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-4xl">
                          Achievement Path
                        </h1>
                        <p className="text-muted-foreground/80 text-sm sm:text-base md:text-lg">
                          Your journey to financial mastery
                        </p>
                      </div>
                    </div>

                    {/* Progress Stats */}
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Content Area - Mobile Optimized */}
            <div className="px-4 pb-6 sm:px-6 sm:pb-8 md:px-8">
              <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/30 max-h-[65vh] overflow-y-auto">
                <div className="relative">
                  {/* Dynamic Progress Path - Mobile Optimized */}
                  <div className="absolute top-4 bottom-4 left-6 hidden w-px sm:top-6 sm:bottom-6 sm:left-8 sm:block md:top-8 md:bottom-8 md:left-12">
                    <div className="h-full rounded-full bg-gradient-to-b from-green-400/60 via-blue-400/60 to-purple-400/60"></div>
                  </div>

                  <div className="space-y-4 pt-2 sm:space-y-6 sm:pt-4 md:space-y-8">
                    {LEVEL_REWARDS.map((reward, index) => {
                      const isUnlocked = levelInfo.level >= reward.level;
                      const isNext =
                        !isUnlocked && reward.level === levelInfo.level + 1;
                      const isFuture = reward.level > levelInfo.level + 1;
                      const xpRequired =
                        LEVEL_REQUIREMENTS[reward.level - 1] || 0;

                      return (
                        <motion.div
                          key={reward.level}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: index * 0.08,
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                          }}
                          className="relative"
                        >
                          {/* Achievement Card - Mobile Optimized */}
                          <motion.div
                            className={cn(
                              "group rounded-2xl border transition-all duration-500 sm:ml-16 sm:rounded-3xl md:ml-20",
                              "hover:-translate-y-1 hover:shadow-lg",
                              isUnlocked
                                ? "from-background border-green-200/50 bg-gradient-to-br to-green-50/50 shadow-green-100/50 dark:border-green-800/50 dark:to-green-950/30 dark:shadow-green-900/20"
                                : isNext
                                  ? "from-background border-blue-200/50 bg-gradient-to-br to-blue-50/50 shadow-blue-100/50 dark:border-blue-800/50 dark:to-blue-950/30 dark:shadow-blue-900/20"
                                  : "from-background to-muted/30 border-border/30 bg-gradient-to-br opacity-60",
                            )}
                            whileHover={
                              isUnlocked || isNext ? { scale: 1.02 } : {}
                            }
                          >
                            <div className="p-4 sm:p-6 md:p-8">
                              {/* Level Header - Mobile Optimized */}
                              <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-0">
                                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                                  <motion.div
                                    className={cn(
                                      "text-2xl font-bold tracking-tight sm:text-2xl md:text-3xl",
                                      isUnlocked
                                        ? "text-green-600 dark:text-green-400"
                                        : isNext
                                          ? "text-blue-600 dark:text-blue-400"
                                          : "text-muted-foreground",
                                    )}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: index * 0.1 + 0.2 }}
                                  >
                                    {reward.level}
                                  </motion.div>

                                  {isNext && (
                                    <motion.div
                                      initial={{ scale: 0, rotate: -10 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      className="rounded-full border border-blue-300/30 bg-gradient-to-r from-blue-500/20 to-blue-600/20 px-2 py-1 sm:px-3 sm:py-1.5"
                                    >
                                      <span className="text-xs font-semibold tracking-wide text-blue-600 dark:text-blue-400">
                                        NEXT
                                      </span>
                                    </motion.div>
                                  )}

                                  {isUnlocked && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="rounded-full border border-green-300/30 bg-gradient-to-r from-green-500/20 to-emerald-600/20 px-2 py-1 sm:px-3 sm:py-1.5"
                                    >
                                      <span className="flex items-center gap-1 text-xs font-semibold tracking-wide text-green-600 sm:gap-1.5 dark:text-green-400">
                                        <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        UNLOCKED
                                      </span>
                                    </motion.div>
                                  )}
                                </div>

                                <div className="text-left sm:text-right">
                                  <div className="text-muted-foreground text-xs font-medium sm:text-sm">
                                    Required
                                  </div>
                                  <div className="text-foreground text-base font-semibold sm:text-lg">
                                    {xpRequired.toLocaleString()} XP
                                  </div>
                                </div>
                              </div>

                              {/* Achievement Details - Mobile Optimized */}
                              <div className="space-y-3 sm:space-y-4">
                                <div>
                                  <h3 className="text-foreground mb-1 text-lg font-semibold sm:mb-2 sm:text-xl md:text-2xl">
                                    {reward.title}
                                  </h3>
                                  <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                                    {reward.description}
                                  </p>
                                </div>

                                {/* Reward Display - Mobile Optimized */}
                                <div className="border-border/30 flex items-center gap-2 rounded-xl border bg-white/50 p-3 sm:gap-3 sm:rounded-2xl sm:p-4 dark:border-slate-700/30 dark:bg-slate-800/50">
                                  <motion.div
                                    className="rounded-lg bg-gradient-to-br from-yellow-400/20 to-yellow-500/30 p-2 sm:rounded-xl sm:p-3"
                                    whileHover={{ rotate: [0, -5, 5, 0] }}
                                    transition={{ duration: 0.5 }}
                                  >
                                    <Gift className="h-4 w-4 text-yellow-600 sm:h-5 sm:w-5 dark:text-yellow-400" />
                                  </motion.div>
                                  <div>
                                    <div className="text-muted-foreground mb-0.5 text-xs font-medium sm:mb-1 sm:text-sm">
                                      Reward
                                    </div>
                                    <div className="text-foreground text-sm font-semibold sm:text-base">
                                      {reward.reward}
                                    </div>
                                  </div>
                                </div>

                                {/* Next Level Progress - Mobile Optimized */}
                                {isNext && (
                                  <motion.div
                                    className="mt-4 rounded-xl border border-blue-200/30 bg-gradient-to-br from-blue-50/50 to-blue-100/30 p-4 sm:mt-6 sm:rounded-2xl sm:p-5 md:p-6 dark:border-blue-800/30 dark:from-blue-950/30 dark:to-blue-900/20"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                                      <div className="text-xs font-semibold text-blue-700 sm:text-sm dark:text-blue-300">
                                        Progress to unlock
                                      </div>
                                      <div className="text-xs font-medium text-blue-600 sm:text-sm dark:text-blue-400">
                                        {levelInfo.xpNeededForNext.toLocaleString()}{" "}
                                        XP needed
                                      </div>
                                    </div>
                                    <div className="relative">
                                      <div className="h-2 overflow-hidden rounded-full bg-blue-100 sm:h-3 dark:bg-blue-900/30">
                                        <motion.div
                                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500"
                                          initial={{ width: 0 }}
                                          animate={{
                                            width: `${Math.min((currentXP / xpRequired) * 100, 100)}%`,
                                          }}
                                          transition={{
                                            duration: 1,
                                            delay: 0.5,
                                          }}
                                        />
                                      </div>
                                      <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </motion.div>

                          {/* Progress Path Node - Mobile Hidden */}
                          <motion.div
                            className="border-background absolute top-8 left-6 z-10 hidden h-4 w-4 rounded-full border-2 sm:top-10 sm:left-8 sm:block sm:h-5 sm:w-5 sm:border-3 md:top-12 md:left-10 md:h-6 md:w-6 md:border-4"
                            style={{
                              background: isUnlocked
                                ? "linear-gradient(135deg, #10b981, #059669)"
                                : isNext
                                  ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                                  : "linear-gradient(135deg, #6b7280, #4b5563)",
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.08 + 0.1 }}
                            whileHover={{ scale: 1.2 }}
                          >
                            {isUnlocked && (
                              <motion.div
                                className="absolute inset-0.5 flex items-center justify-center rounded-full bg-white sm:inset-1"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.08 + 0.3 }}
                              >
                                <CheckCircle className="h-2 w-2 text-green-500 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                              </motion.div>
                            )}
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
