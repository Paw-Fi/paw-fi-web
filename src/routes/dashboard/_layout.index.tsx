"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { getCanonicalUrl } from '@/utils/canonical';
import { seo } from '@/utils/seo';
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
  CreditCard
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery } from "@tanstack/react-query";
import { type Conversation } from "@/services/conversation-service";
import basicCourse from "@/data/basic-lessons.json";
import { getCurrentLevelInfo, LEVEL_REWARDS, LEVEL_REQUIREMENTS } from "@/components/rewards/rewards-level";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { Timeline } from "@/components/timeline/Timeline";
import { useAIChat } from "@/contexts/ai-chat-context";
import monekoAvatar from "@/assets/images/logo/moneko.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { GuidanceTestPanel } from "@/components/dashboard/GuidanceTestPanel";
import DownloadPage from "@/routes/download";

export const Route = createFileRoute("/dashboard/_layout/")({
  component: DashboardHome,
  head: () => {
    const pageUrl = getCanonicalUrl('/dashboard');
    const title = 'Dashboard Home - AI Portfolio Tracker & Learning | Moneko';
    const description = 'Personal finance command center. Track investments, monitor health, AI coaching, learning modules & wealth building calculators.';
    const keywords = 'personal finance dashboard, investment portfolio tracker, financial health monitor, AI financial coaching, financial education platform, wealth building tools, budgeting dashboard, retirement planning';
    const imageUrl = 'https://moneko.io/og-img.png';

    const meta = seo({
      title,
      description,
      keywords,
      url: pageUrl,
      image: imageUrl,
    });

    // Comprehensive structured data for dashboard home
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          "name": "Moneko",
          "url": "https://moneko.io",
          "logo": "https://moneko.io/icon.svg",
          "sameAs": [
            "https://www.facebook.com/monekoai/",
            "https://www.instagram.com/moneko_ai",
            "https://x.com/moneko_ai"
          ]
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          "name": "Moneko",
          "url": "https://moneko.io",
          "publisher": {
            "@id": "https://moneko.io/#organization"
          }
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          "url": pageUrl,
          "name": title,
          "description": description,
          "isPartOf": {
            "@id": "https://moneko.io/#website"
          },
          "about": [
            {
              "@type": "Thing",
              "name": "Personal Finance Dashboard"
            },
            {
              "@type": "Thing", 
              "name": "Investment Portfolio Tracking"
            },
            {
              "@type": "Thing",
              "name": "Financial Education Platform"
            },
            {
              "@type": "Thing",
              "name": "AI Financial Coaching"
            }
          ],
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://moneko.io"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Dashboard",
                "item": pageUrl
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": "Home",
                "item": pageUrl
              }
            ]
          },
          "inLanguage": "en-US"
        },
        {
          "@type": "WebApplication",
          "name": "Moneko Personal Finance Dashboard",
          "applicationCategory": "FinanceApplication",
          "applicationSubCategory": "Personal Finance Management",
          "operatingSystem": "Any",
          "description": "Comprehensive personal finance dashboard with AI-powered portfolio tracking, goal management, financial education, and smart calculators",
          "url": pageUrl,
          "author": {
            "@id": "https://moneko.io/#organization"
          },
          "publisher": {
            "@id": "https://moneko.io/#organization"
          },
          "featureList": [
            "Real-time portfolio tracking and analysis",
            "AI-powered financial health assessment",
            "Personalized investment recommendations",
            "Interactive financial education courses",
            "Smart budgeting and expense tracking",
            "Goal-based financial planning",
            "Advanced financial calculators",
            "Progress tracking and gamification",
            "Personalized AI financial coaching",
            "Comprehensive financial reporting"
          ],
          "browserRequirements": "Requires JavaScript and modern web browser",
          "offers": [
            {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "name": "Basic Dashboard Access",
              "description": "Free access to basic portfolio tracking and financial calculators"
            },
            {
              "@type": "Offer",
              "price": "9.99",
              "priceCurrency": "USD",
              "name": "Premium Dashboard Features",
              "description": "Full AI coaching, advanced analytics, personalized recommendations, and unlimited access",
              "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "price": "9.99",
                "priceCurrency": "USD",
                "unitText": "month"
              }
            }
          ]
        },
        {
          "@type": "Service",
          "name": "Personal Finance Management Platform",
          "description": "Comprehensive personal finance management with AI-powered insights, education, and portfolio tracking",
          "provider": {
            "@id": "https://moneko.io/#organization"
          },
          "serviceType": "Financial Technology Platform",
          "category": "Personal Finance Management",
          "areaServed": "Worldwide",
          "audience": {
            "@type": "Audience",
            "audienceType": "Individual Investors, Students, Young Professionals, Families"
          },
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Financial Tools and Services",
            "itemListElement": [
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Portfolio Tracking",
                  "description": "Real-time investment portfolio monitoring and analysis"
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "Financial Education",
                  "description": "Interactive courses and lessons on personal finance topics"
                }
              },
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": "AI Financial Coaching",
                  "description": "Personalized financial advice and recommendations powered by AI"
                }
              }
            ]
          }
        },
        {
          "@type": "ItemList",
          "name": "Dashboard Features",
          "description": "Key features available in the Moneko personal finance dashboard",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Financial Overview",
              "description": "Comprehensive view of income, savings, expenses, and financial health metrics"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Learning Progress",
              "description": "Track educational progress through financial courses and lessons with XP rewards"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "AI Assistant",
              "description": "24/7 AI-powered financial advisor for personalized guidance and support"
            },
            {
              "@type": "ListItem",
              "position": 4,
              "name": "Quick Tools",
              "description": "Access to essential financial calculators for planning and analysis"
            },
            {
              "@type": "ListItem",
              "position": 5,
              "name": "Goal Tracking",
              "description": "Monitor progress toward financial objectives with visual progress indicators"
            }
          ]
        }
      ]
    };
    
    return {
      title,
      meta,
      links: [
        {
          rel: 'canonical',
          href: pageUrl
        }
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
  
  const { subscription, features, invoices, isLoading: subLoading, isActive } = useSubscription(user?.id);
  
  // Get completed lessons data using the same method as course detail page
  const { data: completedLessons = [], isLoading: isLoadingCompleted } = useCompletedLessons(user?.id);
  
  // Include essentials course with remote courses for consistent data
  const courses = useMemo(() => {
    return [basicCourse as any, ...remoteCourses];
  }, [remoteCourses]);
  
  // Check if user has profile for proper display
  const hasProfile = !!financialProfile;
  
  // Fetch real conversation data
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations', user?.id],
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
    const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
    
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

    const totalLessons = courses.reduce((acc, course) => acc + course.lessons.length, 0);
    
    // Count completed lessons using the same logic as course detail page
    const totalCompletedLessons = completedLessons.length;
    
    // Calculate total available XP and earned XP
    const totalXP = courses.reduce((acc: number, course: any) => 
      acc + course.lessons.reduce((xpAcc: number, lesson: any) => xpAcc + (lesson.xp || 0), 0), 0
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
      const sortedCompleted = [...completedLessons].sort((a, b) => 
        new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime()
      );
      
      if (sortedCompleted[0]) {
        mostRecentCompletedLesson = sortedCompleted[0];
        // Find which course this lesson belongs to
        currentCourse = courses.find((course: any) => 
          course.lessons.some((lesson: any) => lesson.id === mostRecentCompletedLesson.lesson_id)
        );
      }
    }
    
    // If no completed lessons, default to essentials course
    if (!currentCourse) {
      currentCourse = courses.find((course: any) => course.course_id === basicCourse.course_id) || courses[0];
    }

    // Find next lesson using the same logic as course detail page
    let nextLesson: any = null;
    if (currentCourse) {
      const isEssentialsCourse = currentCourse.course_id === basicCourse.course_id;
      const courseCompletedLessons = completedLessons.filter(cl => 
        currentCourse.lessons.some((lesson: any) => lesson.id === cl.lesson_id)
      );
      
      if (isEssentialsCourse) {
        // For essentials course, find first lesson that's unlocked but not completed
        nextLesson = currentCourse.lessons.find((lesson: any, index: number) => {
          const isCompleted = courseCompletedLessons.some(cl => cl.lesson_id === lesson.id);
          if (isCompleted) return false;
          
          // First lesson is always unlocked
          if (index === 0) return true;
          
          // Subsequent lessons are unlocked if previous lesson is completed
          const previousLesson = currentCourse.lessons[index - 1];
          return courseCompletedLessons.some(cl => cl.lesson_id === previousLesson.id);
        });
      } else {
        // For other courses, use the lesson's unlocked property
        nextLesson = currentCourse.lessons.find((lesson: any) => 
          lesson.unlocked && !courseCompletedLessons.some(cl => cl.lesson_id === lesson.id)
        );
      }
    }

    // Get most recent lesson activity
    const recentActivity = mostRecentCompletedLesson ? 
      courses
        .flatMap((course: any) => course.lessons)
        .find((lesson: any) => lesson.id === mostRecentCompletedLesson.lesson_id) 
      : null;

    return {
      hasCourses: true,
      totalCourses: courses.length,
      totalLessons,
      completedLessons: totalCompletedLessons,
      progress: totalLessons > 0 ? (totalCompletedLessons / totalLessons) * 100 : 0,
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

    const isTrialing = subscription.status === 'trialing';
    const isCancelled = subscription.cancel_at_period_end;
    
    return {
      isSubscribed: isActive,
      plan: subscription.plan,
      status: subscription.status,
      daysUntilRenewal: subscription.days_until_next_payment,
      featuresCount: features.filter(f => f.included).length,
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
        keyMetrics: {}
      };
    }

    const quizAnswers = financialProfile.quiz_answers as any;
    
    // Define important fields for profile completion
    const importantFields = [
      { key: 'current_age', label: 'Age', value: quizAnswers.current_age },
      { key: 'net_monthly_income', label: 'Monthly Income', value: quizAnswers.net_monthly_income, format: 'currency' },
      { key: 'marital_status', label: 'Marital Status', value: quizAnswers.marital_status, format: 'text' },
      { key: 'dependents', label: 'Dependents', value: quizAnswers.dependents },
      { key: 'housing_cost', label: 'Housing Cost', value: quizAnswers.housing_cost, format: 'currency' },
      { key: 'savings_rate', label: 'Savings Rate', value: quizAnswers.savings_rate, format: 'percentage' },
      { key: 'emergency_fund', label: 'Emergency Fund', value: quizAnswers.emergency_fund, format: 'currency' },
      { key: 'retirement_age', label: 'Retirement Age', value: quizAnswers.retirement_age },
      { key: 'risk_tolerance', label: 'Risk Tolerance', value: quizAnswers.risk_tolerance, format: 'text' },
      { key: 'investment_experience', label: 'Investment Experience', value: quizAnswers.investment_experience, format: 'text' },
    ];

    // Calculate filled vs missing fields
    const filledFields = importantFields.filter(field => {
      const value = field.value;
      return value !== null && value !== undefined && value !== 0 && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    });

    const missingFields = importantFields.filter(field => {
      const value = field.value;
      return value === null || value === undefined || value === 0 || value === '' || 
             (Array.isArray(value) ? value.length === 0 : false);
    });

    const completionPercentage = Math.round((filledFields.length / importantFields.length) * 100);

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
      keyMetrics.monthlySavings = Math.round(quizAnswers.net_monthly_income * (quizAnswers.savings_rate / 100));
    }
    if (quizAnswers.emergency_fund) {
      keyMetrics.emergencyFund = quizAnswers.emergency_fund;
    }
    if (quizAnswers.current_age && quizAnswers.retirement_age) {
      keyMetrics.yearsToRetirement = Math.max(0, quizAnswers.retirement_age - quizAnswers.current_age);
    }

    return {
      hasProfile: true,
      completionPercentage,
      filledFields: filledFields.slice(0, 6), // Show top 6 filled fields
      missingFields: missingFields.slice(0, 4), // Show top 4 missing fields
      keyMetrics
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

    const activeConversations = conversations.filter(conv => conv.is_active).length;
    const totalMessages = conversations.reduce((acc, conv) => acc + (conv.messages?.length || 0), 0);
    const recentConversation = conversations
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      [0];

    return {
      hasConversations: true,
      totalConversations: conversations.length,
      recentConversation,
      totalMessages,
      activeConversations,
    };
  }, [conversations, conversationsLoading]);

  const {openChat} = useAIChat();

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

  const currentLevelReward = LEVEL_REWARDS.find(r => r.level === levelInfo.level);
  const nextLevelReward = LEVEL_REWARDS.find(r => r.level === levelInfo.level + 1);


  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span className="text-sm text-muted-foreground">Loading your dashboard...</span>
        </div>
      </div>
    );
  }


  return (
    <>
      <motion.div
        className="min-h-screen bg-moneko-background"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
          {/* Test Panel - TEMPORARY FOR TESTING */}
          {showTestPanel && (
            <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
              <GuidanceTestPanel onClose={() => setShowTestPanel(false)} />
            </motion.div>
          )}

          {/* Welcome Header - Clean Apple-inspired, Mobile Optimized */}
          <motion.div variants={itemVariants} className="mb-8 sm:mb-12 md:mb-16">
            <div className="flex flex-col space-y-6 sm:space-y-8 md:space-y-0 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col space-y-4 sm:space-y-6 md:space-y-0 md:flex-row md:items-center md:space-x-8">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24">
                  <AvatarImage src={monekoAvatar} alt="Moneko Avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-xl font-medium">
                    M
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 sm:space-y-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-foreground tracking-tight">
                    {getGreeting()}
                  </h1>
                  <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
                    Ready to master your finances today?
                  </p>
                </div>
              </div>

              {/* Level and Streak Info - Mobile Optimized */}
              <div className="flex gap-3 sm:gap-4">
                {currentLevelReward && (
                  <div className="bg-muted/30 dark:bg-slate-800/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 text-center flex-1 sm:flex-none">
                    <div className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-0.5 sm:mb-1">Level {levelInfo.level}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">{currentLevelReward.title}</div>
                  </div>
                )}

                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 text-center flex-1 sm:flex-none">
                  <div className="text-lg sm:text-xl md:text-2xl font-semibold text-orange-600 dark:text-orange-400 mb-0.5 sm:mb-1">
                    {currentStreak}
                  </div>
                  <div className="text-xs sm:text-sm text-orange-600/70 dark:text-orange-400/70">day streak</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* XP Progress Bar - Mobile Optimized */}
          <motion.div variants={itemVariants} className="mb-8 sm:mb-12 md:mb-16">
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-foreground mb-1 sm:mb-2">
                    Progress to Next Level
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {levelInfo.progressInLevel.toLocaleString()} / {(levelInfo.nextLevelXP - levelInfo.currentLevelXP).toLocaleString()} XP
                  </p>
                </div>
                {!levelInfo.isMaxLevel && (
                  <div className="text-left sm:text-right">
                    <div className="text-2xl sm:text-3xl md:text-4xl font-light text-primary mb-0.5 sm:mb-1">
                      {levelInfo.xpNeededForNext.toLocaleString()}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">XP to level {levelInfo.level + 1}</div>
                  </div>
                )}
              </div>

              <div className="mb-6 sm:mb-8">
                <Progress value={levelInfo.progressPercentage} className="h-2" />
              </div>

              {nextLevelReward && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pt-4 sm:pt-6 border-t border-border/50">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Next reward: {nextLevelReward.reward}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRewardsModal(true)}
                    className="text-primary hover:text-primary/80 transition-colors duration-200 w-full sm:w-auto"
                  >
                    View All Rewards
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Main Dashboard Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">

            {/* Left Column - 2 spans */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 md:space-y-8">
              
              {/* Financial Overview Card - Mobile Optimized */}
              <motion.div variants={itemVariants}>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
                      <div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-foreground mb-1 sm:mb-2">Financial Overview</h2>
                        <p className="text-sm sm:text-base text-muted-foreground">Your financial snapshot</p>
                      </div>
                      <Button variant="outline" size="sm" asChild className="rounded-full w-full sm:w-auto">
                        <Link to="/dashboard/user-settings/profile">
                          Update Profile
                        </Link>
                      </Button>
                    </div>

                    {financialProfileInsights.hasProfile ? (
                        <div className="space-y-6 sm:space-y-8">
                          {/* Key Metrics Grid - Mobile Optimized */}
                          {Object.keys(financialProfileInsights.keyMetrics).length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                              {financialProfileInsights.keyMetrics.monthlyIncome && (
                                <div className="bg-green-50/50 dark:bg-green-950/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-center">
                                  <div className="text-2xl sm:text-2xl md:text-3xl font-light text-foreground mb-1 sm:mb-2">
                                    ${financialProfileInsights.keyMetrics.monthlyIncome.toLocaleString()}
                                  </div>
                                  <div className="text-xs sm:text-sm text-muted-foreground">Monthly Income</div>
                                </div>
                              )}

                              {financialProfileInsights.keyMetrics.monthlySavings && (
                                <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-center">
                                  <div className="text-2xl sm:text-2xl md:text-3xl font-light text-foreground mb-1 sm:mb-2">
                                    ${financialProfileInsights.keyMetrics.monthlySavings.toLocaleString()}
                                  </div>
                                  <div className="text-xs sm:text-sm text-muted-foreground">Monthly Savings</div>
                                </div>
                              )}

                              {financialProfileInsights.keyMetrics.emergencyFund && (
                                <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-center">
                                  <div className="text-2xl sm:text-2xl md:text-3xl font-light text-foreground mb-1 sm:mb-2">
                                    ${financialProfileInsights.keyMetrics.emergencyFund.toLocaleString()}
                                  </div>
                                  <div className="text-xs sm:text-sm text-muted-foreground">Emergency Fund</div>
                                </div>
                              )}

                              {financialProfileInsights.keyMetrics.yearsToRetirement && (
                                <div className="bg-amber-50/50 dark:bg-amber-950/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-center">
                                  <div className="text-2xl sm:text-2xl md:text-3xl font-light text-foreground mb-1 sm:mb-2">
                                    {financialProfileInsights.keyMetrics.yearsToRetirement}
                                  </div>
                                  <div className="text-xs sm:text-sm text-muted-foreground">Years to Retire</div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Profile Completion - Mobile Optimized */}
                          <div className="bg-muted/20 dark:bg-slate-800/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <h4 className="text-base sm:text-lg font-medium">Profile Completion</h4>
                              <span className="text-sm font-medium text-primary">
                                {financialProfileInsights.completionPercentage}%
                              </span>
                            </div>
                            <Progress value={financialProfileInsights.completionPercentage} className="h-2" />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 sm:py-12 md:py-16">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-4 sm:mb-6 md:mb-8 bg-muted/30 rounded-2xl sm:rounded-3xl flex items-center justify-center">
                            <User className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground" />
                          </div>
                          <h3 className="text-xl sm:text-2xl font-light mb-3 sm:mb-4 px-4 text-foreground">Create Your Financial Profile</h3>
                          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-4">
                            Get personalized recommendations based on your financial goals and current situation
                          </p>
                          <Button size="lg" asChild className="rounded-full mx-4 w-auto">
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
                  <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
                      <div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-foreground mb-1 sm:mb-2">Learning Progress</h2>
                        <p className="text-sm sm:text-base text-muted-foreground">Your educational journey</p>
                      </div>
                      <Button variant="outline" size="sm" asChild className="rounded-full w-full sm:w-auto">
                        <Link to="/dashboard/learning">
                          View All Courses
                        </Link>
                      </Button>
                    </div>

                    {learningInsights.hasCourses ? (
                        <div className="space-y-6 sm:space-y-8">
                          {/* Stats Grid - Mobile Optimized: 3 columns even on mobile but smaller */}
                          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
                            <div className="bg-green-50/50 dark:bg-green-950/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 text-center">
                              <div className="text-xl sm:text-2xl md:text-3xl font-light text-foreground mb-1 sm:mb-2">
                                {learningInsights.completedLessons}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">Completed</div>
                            </div>
                            <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 text-center">
                              <div className="text-xl sm:text-2xl md:text-3xl font-light text-foreground mb-1 sm:mb-2">
                                {learningInsights.earnedXP}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">XP Earned</div>
                            </div>
                            <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 text-center">
                              <div className="text-xl sm:text-2xl md:text-3xl font-light text-foreground mb-1 sm:mb-2">
                                {Math.round(learningInsights.progress)}%
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">Progress</div>
                            </div>
                          </div>

                          {/* Progress Bar - Mobile Optimized */}
                          <div>
                            <Progress value={learningInsights.progress} className="h-2" />
                          </div>

                          {/* Next Lesson - Mobile Optimized */}
                          {learningInsights.nextLesson && (
                            <div className="bg-muted/20 dark:bg-slate-800/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
                                <div className="flex-1">
                                  <h4 className="text-base text-foreground sm:text-lg font-medium mb-2 sm:mb-3">Continue Learning</h4>
                                  <p className="text-sm text-foreground sm:text-base font-medium mb-1">{learningInsights.nextLesson.title}</p>
                                  <p className="text-xs text-foreground sm:text-sm">{learningInsights.currentCourse?.title}</p>
                                </div>
                                <Button size="sm" asChild className="rounded-full w-full sm:w-auto sm:ml-6">
                                  <Link to={`/dashboard/learning/${learningInsights.currentCourse?.course_id}/lesson/${learningInsights.nextLesson.lesson_id}` as any}>
                                    Continue
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Recent Activity - Mobile Optimized */}
                          <div className="bg-muted/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6">
                            <h4 className="text-base text-foreground sm:text-lg font-medium mb-4 sm:mb-6">Recent Activity</h4>
                            <Timeline/>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 sm:py-12 md:py-16">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-4 sm:mb-6 md:mb-8 bg-muted/30 rounded-2xl sm:rounded-3xl flex items-center justify-center">
                            <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground" />
                          </div>
                          <h3 className="text-xl sm:text-2xl font-light mb-3 sm:mb-4 px-4 text-foreground">Start Learning</h3>
                          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-4">
                            Begin your financial education journey with our comprehensive courses
                          </p>
                          <Button size="lg" asChild className="rounded-full mx-4 w-auto">
                            <Link to="/dashboard/learning">
                              Explore Courses
                            </Link>
                          </Button>
                        </div>
                      )}
                  </div>
              </motion.div>
         
          </div>

            {/* Right Column - 1 span, Mobile Optimized */}
            <div className="space-y-4 sm:space-y-6 md:space-y-8">

              {/* AI Assistant Card - Mobile Optimized */}
              <motion.div variants={itemVariants}>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
                    <div className="mb-6 sm:mb-8">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-foreground mb-1 sm:mb-2">Moneko AI</h2>
                      <p className="text-sm sm:text-base text-muted-foreground">Your personal financial advisor</p>
                    </div>

                    {conversationInsights.hasConversations ? (
                        <div className="space-y-4 sm:space-y-6">
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-muted/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                              <div className="text-xl sm:text-2xl font-light text-foreground mb-0.5 sm:mb-1">
                                {conversationInsights.totalConversations}
                              </div>
                              <div className="text-xs text-muted-foreground">Chats</div>
                            </div>
                            <div className="bg-muted/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                              <div className="text-xl sm:text-2xl font-light text-foreground mb-0.5 sm:mb-1">
                                {conversationInsights.totalMessages}
                              </div>
                              <div className="text-xs text-muted-foreground">Messages</div>
                            </div>
                          </div>

                          <Button
                            size="lg"
                            onClick={() => openChat('advisor')}
                            className="w-full rounded-full"
                          >
                            Continue Chat
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 sm:space-y-6">
                          <div className="space-y-3 sm:space-y-4">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Get personalized help with:</p>
                            <div className="space-y-2 sm:space-y-3">
                              <div className="text-xs sm:text-sm text-muted-foreground">Investment strategies</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">Budget planning</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">Financial goals</div>
                            </div>
                          </div>
                          <Button
                            size="lg"
                            onClick={() => openChat('advisor')}
                            className="w-full rounded-full"
                          >
                            Start Chat
                          </Button>
                        </div>
                      )}
                  </div>
              </motion.div>


              {/* Quick Tools Card - Mobile Optimized */}
              <motion.div variants={itemVariants}>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
                      <div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-foreground mb-1 sm:mb-2">Quick Tools</h2>
                        <p className="text-sm sm:text-base text-muted-foreground">Financial calculators</p>
                      </div>
                      <Button variant="outline" size="sm" asChild className="rounded-full w-full sm:w-auto">
                        <Link to="/calculators">
                          View All
                        </Link>
                      </Button>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      {availableCalculators.slice(0, 4).map((calculator) => {
                        return (
                          <motion.div key={calculator.title} whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                            <Link to={calculator.path}>
                              <div className="bg-muted/10 dark:bg-slate-800/10 hover:bg-muted/20 dark:hover:bg-slate-700/20 transition-colors duration-200 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">
                                      {calculator.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{calculator.category}</div>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
              </motion.div>


              {/* Essential Lessons Card - Mobile Optimized */}
              <motion.div variants={itemVariants}>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
                    <div className="mb-6 sm:mb-8">
                      <h2 className="text-lg text-foreground sm:text-xl md:text-2xl font-medium mb-1 sm:mb-2">Essential Lessons</h2>
                      <p className="text-sm text-foreground sm:text-base ">Foundation knowledge</p>
                    </div>

                    <div className="bg-muted/20 dark:bg-slate-800/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6">
                      <h4 className="text-base text-foreground sm:text-lg font-medium mb-2 sm:mb-3">Your 2025 Guide to Investing</h4>
                      <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">Master investment fundamentals with 20+ comprehensive lessons</p>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          20+ lessons available
                        </div>
                        <Button variant="outline" size="sm" asChild className="rounded-full w-full sm:w-auto">
                          <Link to="/dashboard/essentials">
                            Start Learning
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
              </motion.div>

            </div>
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
            <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-border/50 shadow-2xl">

              {/* Glassmorphism Header - Mobile Optimized */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
                <div className="relative px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <motion.div
                          className="relative p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/30 backdrop-blur-sm border border-yellow-300/20"
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <Trophy className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-yellow-600 dark:text-yellow-400" />
                          <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 animate-pulse"></div>
                        </motion.div>
                        <div>
                          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight">Achievement Path</h1>
                          <p className="text-sm sm:text-base md:text-lg text-muted-foreground/80">Your journey to financial mastery</p>
                        </div>
                      </div>

                      {/* Progress Stats */}

                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Content Area - Mobile Optimized */}
              <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
                <div className="max-h-[65vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/30">
                  <div className="relative">
                    
                    {/* Dynamic Progress Path - Mobile Optimized */}
                    <div className="absolute left-6 sm:left-8 md:left-12 top-4 sm:top-6 md:top-8 bottom-4 sm:bottom-6 md:bottom-8 w-px hidden sm:block">
                      <div className="h-full bg-gradient-to-b from-green-400/60 via-blue-400/60 to-purple-400/60 rounded-full"></div>
                    </div>

                    <div className="space-y-4 sm:space-y-6 md:space-y-8 pt-2 sm:pt-4">
                      {LEVEL_REWARDS.map((reward, index) => {
                        const isUnlocked = levelInfo.level >= reward.level;
                        const isNext = !isUnlocked && reward.level === levelInfo.level + 1;
                        const isFuture = reward.level > levelInfo.level + 1;
                        const xpRequired = LEVEL_REQUIREMENTS[reward.level - 1] || 0;
                        
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
                              damping: 15
                            }}
                            className="relative"
                          >
                            {/* Achievement Card - Mobile Optimized */}
                            <motion.div
                              className={cn(
                                "sm:ml-16 md:ml-20 rounded-2xl sm:rounded-3xl border transition-all duration-500 group",
                                "hover:shadow-lg hover:-translate-y-1",
                                isUnlocked
                                  ? "bg-gradient-to-br from-background to-green-50/50 dark:to-green-950/30 border-green-200/50 dark:border-green-800/50 shadow-green-100/50 dark:shadow-green-900/20"
                                  : isNext
                                  ? "bg-gradient-to-br from-background to-blue-50/50 dark:to-blue-950/30 border-blue-200/50 dark:border-blue-800/50 shadow-blue-100/50 dark:shadow-blue-900/20"
                                  : "bg-gradient-to-br from-background to-muted/30 border-border/30 opacity-60"
                              )}
                              whileHover={isUnlocked || isNext ? { scale: 1.02 } : {}}
                            >
                              <div className="p-4 sm:p-6 md:p-8">
                                {/* Level Header - Mobile Optimized */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                                    <motion.div
                                      className={cn(
                                        "text-2xl sm:text-2xl md:text-3xl font-bold tracking-tight",
                                        isUnlocked ? "text-green-600 dark:text-green-400"
                                        : isNext ? "text-blue-600 dark:text-blue-400"
                                        : "text-muted-foreground"
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
                                        className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-300/30"
                                      >
                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wide">NEXT</span>
                                      </motion.div>
                                    )}

                                    {isUnlocked && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-300/30"
                                      >
                                        <span className="text-xs font-semibold text-green-600 dark:text-green-400 tracking-wide flex items-center gap-1 sm:gap-1.5">
                                          <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                          UNLOCKED
                                        </span>
                                      </motion.div>
                                    )}
                                  </div>

                                  <div className="text-left sm:text-right">
                                    <div className="text-xs sm:text-sm font-medium text-muted-foreground">Required</div>
                                    <div className="text-base sm:text-lg font-semibold text-foreground">
                                      {xpRequired.toLocaleString()} XP
                                    </div>
                                  </div>
                                </div>

                                {/* Achievement Details - Mobile Optimized */}
                                <div className="space-y-3 sm:space-y-4">
                                  <div>
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-1 sm:mb-2">{reward.title}</h3>
                                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{reward.description}</p>
                                  </div>

                                  {/* Reward Display - Mobile Optimized */}
                                  <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-border/30 dark:border-slate-700/30">
                                    <motion.div
                                      className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-yellow-400/20 to-yellow-500/30"
                                      whileHover={{ rotate: [0, -5, 5, 0] }}
                                      transition={{ duration: 0.5 }}
                                    >
                                      <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400" />
                                    </motion.div>
                                    <div>
                                      <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1">Reward</div>
                                      <div className="text-sm sm:text-base font-semibold text-foreground">{reward.reward}</div>
                                    </div>
                                  </div>
                                  
                                  {/* Next Level Progress - Mobile Optimized */}
                                  {isNext && (
                                    <motion.div
                                      className="mt-4 sm:mt-6 p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/30 dark:border-blue-800/30"
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.3 }}
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                                        <div className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">
                                          Progress to unlock
                                        </div>
                                        <div className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">
                                          {levelInfo.xpNeededForNext.toLocaleString()} XP needed
                                        </div>
                                      </div>
                                      <div className="relative">
                                        <div className="h-2 sm:h-3 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden">
                                          <motion.div
                                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((currentXP / xpRequired) * 100, 100)}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                          />
                                        </div>
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                            </motion.div>

                            {/* Progress Path Node - Mobile Hidden */}
                            <motion.div
                              className="absolute left-6 sm:left-8 md:left-10 top-8 sm:top-10 md:top-12 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border-2 sm:border-3 md:border-4 border-background z-10 hidden sm:block"
                              style={{
                                background: isUnlocked
                                  ? 'linear-gradient(135deg, #10b981, #059669)'
                                  : isNext
                                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                                  : 'linear-gradient(135deg, #6b7280, #4b5563)'
                              }}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.08 + 0.1 }}
                              whileHover={{ scale: 1.2 }}
                            >
                              {isUnlocked && (
                                <motion.div
                                  className="absolute inset-0.5 sm:inset-1 rounded-full bg-white flex items-center justify-center"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: index * 0.08 + 0.3 }}
                                >
                                  <CheckCircle className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 text-green-500" />
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

export default DashboardHome;