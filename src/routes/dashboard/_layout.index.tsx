"use client";

import { useAuth } from "@/contexts/auth-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import {
  faArrowRight,
  faAward,
  faBook,
  faBookOpen,
  faBolt,
  faBrain,
  faBullseye,
  faCalculator,
  faCalendarAlt,
  faChartBar,
  faChartLine,
  faCheckCircle,
  faChevronDown,
  faChevronRight,
  faClock,
  faCog,
  faCommentDots,
  faComments,
  faCreditCard,
  faDollarSign,
  faDumbbell,
  faEdit,
  faEnvelope,
  faExclamationTriangle,
  faEye,
  faFileAlt,
  faFileInvoiceDollar,
  faFire,
  faFlagCheckered,
  faGift,
  faGraduationCap,
  faHeart,
  faHeartbeat,
  faHistory,
  faHome,
  faInfoCircle,
  faKey,
  faLeaf,
  faLightbulb,
  faLock,
  faMoneyBillWave,
  faPercent,
  faPiggyBank,
  faPlus,
  faQuestionCircle,
  faRocket,
  faShieldAlt,
  faSignOutAlt,
  faSpinner,
  faStar,
  faTasks,
  faTimes,
  faTimesCircle,
  faTrophy,
  faUnlock,
  faUser,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "@/hooks/use-dashboard";
import { useUserCourses } from "@/services/course-service";
import { useSubscription } from "@/hooks/use-subscription";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { ActivityList } from '@/components/shared/ActivityList';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getConversations } from "@/services/conversation-service";
import basicCourse from "@/data/basic-lessons.json";
import { ProtectedRouteSubscription } from "@/components/auth/ProtectedRouteSubscription";
import { DailyBriefing } from "@/components/dashboard/DailyBriefing";
import { getCurrentLevelInfo, LEVEL_REWARDS, LEVEL_REQUIREMENTS } from "@/components/rewards/rewards-level";
import { useGamification } from "@/hooks/use-gamification";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { Activity, useUserActivities } from "@/hooks/useUserActivities";
import { Timeline } from "@/components/timeline/Timeline";
import { useAIChat } from "@/contexts/ai-chat-context";

export const Route = createFileRoute("/dashboard/_layout/")({
  component: DashboardHome,
});

// Modern 2025 animation variants with spring physics
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 100,
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 40, 
    scale: 0.95,
    rotateX: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 120,
      mass: 1,
    },
  },
};

const cardHoverVariants: Variants = {
  rest: { 
    y: 0,
    rotateX: 0,
    rotateY: 0,
  },
  hover: { 
    y: -4,
    rotateX: 1,
    rotateY: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    },
  },
};

function DashboardHome() {
  const { user } = useAuth();
  // Rewards modal state
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  // Real data hooks - NO MOCK DATA
  const { dashboardData, views, status: dashboardStatus } = useDashboard(user?.id);
  const { data: remoteCourses = [], isLoading: coursesLoading } = useUserCourses(user?.id || "", { enabled: !!user });
  const { subscription, features, paymentMethod, invoices, isLoading: subLoading, isActive } = useSubscription(user?.id);
  const { profile: financialProfile, isLoading: profileLoading, hasProfile } = useFinancialHealthProfile(user?.id);
  
  // Get completed lessons data using the same method as course detail page
  const { data: completedLessons = [], isLoading: isLoadingCompleted } = useCompletedLessons(user?.id);
  
  // Include essentials course with remote courses for consistent data
  const courses = useMemo(() => {
    return [basicCourse as any, ...remoteCourses];
  }, [remoteCourses]);
  
  // Fetch real conversation data
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => [],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate real portfolio insights from actual dashboard data
  const portfolioInsights = useMemo(() => {
    if (!dashboardData || !Array.isArray(dashboardData)) {
      return {
        hasPortfolio: views.length > 0,
        totalViews: views.length,
        totalWidgets: 0,
        financialScore: null,
        financialStatus: null,
        savingsGoals: 0,
        nextActions: 0,
        hasFinancialHealth: false,
      };
    }

    const financialHealthWidget = dashboardData.find(widget => widget.type === 'financialHealthScorecard');
    const savingsGoalsWidget = dashboardData.find(widget => widget.type === 'enhancedSavingsGoals');
    const nextActionWidget = dashboardData.find(widget => widget.type === 'nextBestAction');
    const debtWidget = dashboardData.find(widget => widget.type === 'debtVisualizer');
    const cashFlowWidget = dashboardData.find(widget => widget.type === 'quickCashFlowSummary');
    const retirementWidget = dashboardData.find(widget => widget.type === 'retirementReadiness');
    
    return {
      hasPortfolio: views.length > 0,
      totalViews: views.length,
      totalWidgets: dashboardData.length,
      financialScore: financialHealthWidget?.data?.overallScore || null,
      financialStatus: financialHealthWidget?.data?.overallStatus || null,
      savingsGoals: savingsGoalsWidget?.data?.items?.length || 0,
      nextActions: Array.isArray(nextActionWidget?.data) ? nextActionWidget.data.length : 0,
      hasFinancialHealth: !!financialHealthWidget,
      hasDebts: !!debtWidget && Array.isArray(debtWidget.data) && debtWidget.data.length > 0,
      hasCashFlow: !!cashFlowWidget,
      hasRetirementPlan: !!retirementWidget,
      widgets: {
        financial: financialHealthWidget,
        savings: savingsGoalsWidget,
        actions: nextActionWidget,
        debt: debtWidget,
        cashFlow: cashFlowWidget,
        retirement: retirementWidget,
      }
    };
  }, [dashboardData, views]);




  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
    
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  // Subscribe to user activities
  const { activities, isLoading: isActivitiesLoading, error: activitiesError } = useUserActivities();

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

  // Real calculator usage data (from available calculators)
  const availableCalculators = [
    {
      title: "Compound Interest",
      description: "Calculate investment growth with compound returns",
      icon: faChartLine,
      path: "/calculators/compound-calculator",
      color: "from-purple-500 to-pink-500",
      category: "Investment",
    },
    {
      title: "Mortgage Calculator",
      description: "Estimate monthly payments and total interest",
      icon: faHome,
      path: "/calculators/mortgage-calculator", 
      color: "from-blue-500 to-cyan-500",
      category: "Housing",
    },
    {
      title: "Savings Goals",
      description: "Plan and track your financial objectives",
      icon: faPiggyBank,
      path: "/calculators/saving-goals-calculator",
      color: "from-green-500 to-emerald-500",
      category: "Savings",
    },
    {
      title: "Investment Growth",
      description: "Project portfolio returns over time",
      icon: faPercent,
      path: "/calculators/investment-calculator",
      color: "from-orange-500 to-red-500",
      category: "Investment",
    },
    {
      title: "Auto Loan",
      description: "Calculate car loan payments and costs",
      icon: faMoneyBillWave,
      path: "/calculators/auto-loan-calculator",
      color: "from-red-500 to-pink-500",
      category: "Debt",
    },
    {
      title: "Retirement Planner",
      description: "Plan for your golden years",
      icon: faCreditCard,
      path: "/calculators/retirement-calculator",
      color: "from-indigo-500 to-purple-500",
      category: "Retirement",
    },
  ];

  const { gamificationData } = useGamification();

  const currentStreak = gamificationData.streak;
  const currentXP = gamificationData.xp;
  const levelInfo = getCurrentLevelInfo(currentXP);

  const currentLevelReward = LEVEL_REWARDS.find(r => r.level === levelInfo.level);
  const nextLevelReward = LEVEL_REWARDS.find(r => r.level === levelInfo.level + 1);


  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }


  return (
    <>
      <motion.div
        className="max-w-7xl mx-auto py-12 text-foreground dark:text-dark-foreground"
      >
           {/* Hero Header with Level Progression */}
           <motion.div
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-500 dark:from-purple-800 dark:via-purple-700 dark:to-indigo-800 p-8 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
   
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Greeting and Level Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  {getGreeting()}
                </h1>
                <p className="text-purple-200 dark:text-purple-300 text-lg">
                  Your daily financial mastery dashboard
                </p>
              </div>
              
              {/* Current Level Badge */}
              {currentLevelReward && (
                <motion.div
                  className="group relative inline-flex items-center gap-3 px-6 py-3 bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl cursor-pointer"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${currentLevelReward.color}`}>
                    <FontAwesomeIcon icon={currentLevelReward.icon} className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">Level {levelInfo.level}</div>
                    <div className="text-purple-200 dark:text-purple-300 text-sm">{currentLevelReward.title}</div>
                  </div>
                  
                  {/* Detailed hover tooltip */}
                  <motion.div
                    className="absolute top-full left-0 mt-2 p-4 bg-gray-900/95 dark:bg-black/90 backdrop-blur-xl border border-gray-700 dark:border-gray-600 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50 min-w-80"
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-white font-semibold mb-2">Level {levelInfo.level} Details</div>
                    <div className="text-gray-300 dark:text-gray-200 text-sm mb-3">{currentLevelReward.description}</div>
                    <div className="text-green-400 dark:text-green-300 text-sm font-medium">✨ {currentLevelReward.reward}</div>
                  </motion.div>
                </motion.div>
              )}
            </div>
            
            {/* Streak and Stats */}
            <div className="flex gap-4">
              <motion.div
                className="group relative px-6 py-4 bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl cursor-pointer"
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-400 to-red-500">
                    <FontAwesomeIcon icon={faFire} className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{currentStreak}</div>
                    <div className="text-orange-200 dark:text-orange-300 text-sm">day streak</div>
                  </div>
                </div>
                
                {/* Streak tooltip */}
                <motion.div
                  className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-gray-900/95 dark:bg-black/90 backdrop-blur-xl border border-gray-700 dark:border-gray-600 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50 whitespace-nowrap"
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-orange-400 dark:text-orange-300 font-semibold text-sm">Keep it burning! 🔥</div>
                  <div className="text-gray-300 dark:text-gray-200 text-xs">Daily learning streak</div>
                </motion.div>
              </motion.div>
            </div>
          </div>
          
          {/* XP Progress Bar */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-white/90">
              <span className="text-sm font-medium">
                {levelInfo.progressInLevel.toLocaleString()} / {(levelInfo.nextLevelXP - levelInfo.currentLevelXP).toLocaleString()} XP
              </span>
              {!levelInfo.isMaxLevel && (
                <span className="text-sm">
                  {levelInfo.xpNeededForNext.toLocaleString()} XP to level {levelInfo.level + 1}
                </span>
              )}
            </div>
            
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full relative"
                style={{ width: `${levelInfo.progressPercentage}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse"></div>
              </motion.div>
            </div>
            
            {/* Next Level Reward Preview & Rewards Button */}
            <div className="flex items-center justify-between">
              {nextLevelReward && (
                <motion.div
                  className="flex items-center gap-3 text-purple-200 text-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <FontAwesomeIcon icon={faGift} className="h-4 w-4" />
                  <span>Next reward: {nextLevelReward.reward} at Level {nextLevelReward.level}</span>
                </motion.div>
              )}
              
              <motion.button
                onClick={() => setShowRewardsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-xl text-white text-sm font-medium transition-all duration-200"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileTap={{ scale: 0.95 }}
              >
                <FontAwesomeIcon icon={faTrophy} className="h-4 w-4" />
                <span>View All Rewards</span>
                <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

        <div className="">
      

          {/* Main Content Grid */}
          <motion.div 
            className="grid gap-8 lg:grid-cols-12"
            variants={containerVariants}
          >
            {/* Left Column - Financial Overview & Portfolio */}
            <motion.div className="lg:col-span-8 space-y-8" variants={itemVariants}>
              
              {/* Financial Profile Widget */}
              <motion.div
                className="group relative overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-purple-200/50 dark:border-purple-700/50 shadow-2xl border-t-purple-500/80 dark:border-t-purple-400/80"
                variants={cardHoverVariants}
                initial="rest"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 dark:from-purple-400/20 via-pink-500/5 dark:via-pink-400/10 to-indigo-500/10 dark:to-indigo-400/20"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.2),transparent_50%)]"></div>
                <div className="relative p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 dark:from-purple-400 to-indigo-600 dark:to-indigo-500 text-white shadow-xl">
                        <FontAwesomeIcon icon={faUser} className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Profile</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {financialProfileInsights.hasProfile 
                            ? `${financialProfileInsights.completionPercentage}% complete` 
                            : "Complete your profile for personalized AI recommendations"
                          }
                        </p>
                      </div>
                    </div>
                    {financialProfileInsights.hasProfile && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                          {financialProfileInsights.completionPercentage}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Complete</div>
                      </div>
                    )}
                  </div>

                  {financialProfileInsights.hasProfile ? (
                    <>
                      {/* Completion Progress Bar */}
                      <div className="mb-6">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${financialProfileInsights.completionPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Key Metrics Grid */}
                      {Object.keys(financialProfileInsights.keyMetrics).length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          {financialProfileInsights.keyMetrics.monthlyIncome && (
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-cyan-50 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700">
                              <FontAwesomeIcon icon={faDollarSign} className="h-4 w-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                ${financialProfileInsights.keyMetrics.monthlyIncome.toLocaleString()}
                              </div>
                              <div className="text-xs text-blue-700 dark:text-blue-300">Monthly Income</div>
                            </div>
                          )}

                          {financialProfileInsights.keyMetrics.monthlySavings && (
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 border border-green-200 dark:border-green-700">
                              <FontAwesomeIcon icon={faPiggyBank} className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                ${financialProfileInsights.keyMetrics.monthlySavings.toLocaleString()}
                              </div>
                              <div className="text-xs text-green-700 dark:text-green-300">Monthly Savings</div>
                            </div>
                          )}

                          {financialProfileInsights.keyMetrics.emergencyFund && (
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-pink-50 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700">
                              <FontAwesomeIcon icon={faShieldAlt} className="h-4 w-4 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                ${financialProfileInsights.keyMetrics.emergencyFund.toLocaleString()}
                              </div>
                              <div className="text-xs text-purple-700 dark:text-purple-300">Emergency Fund</div>
                            </div>
                          )}

                          {financialProfileInsights.keyMetrics.yearsToRetirement && (
                            <div className="text-center p-3 rounded-xl bg-gradient-to-br from-orange-50 dark:from-orange-900/20 to-yellow-50 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-700">
                              <FontAwesomeIcon icon={faCalendarAlt} className="h-4 w-4 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
                              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                {financialProfileInsights.keyMetrics.yearsToRetirement}
                              </div>
                              <div className="text-xs text-orange-700 dark:text-orange-300">Years to Retire</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Profile Status */}
                      <div className="space-y-4">
                        {/* Filled Fields */}
                        {financialProfileInsights.filledFields.length > 0 && (
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                            <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center">
                              <FontAwesomeIcon icon={faCheckCircle} className="mr-2 h-4 w-4" />
                              Profile Information ({financialProfileInsights.filledFields.length} fields)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {financialProfileInsights.filledFields.map((field) => (
                                <span key={field.key} className="px-2 py-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                                  {field.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing Fields */}
                        {financialProfileInsights.missingFields.length > 0 && (
                          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                            <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 h-4 w-4" />
                              Missing Information ({financialProfileInsights.missingFields.length} fields)
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {financialProfileInsights.missingFields.map((field) => (
                                <span key={field.key} className="px-2 py-1 bg-amber-100 dark:bg-amber-800/30 text-amber-800 dark:text-amber-300 text-xs rounded-full">
                                  {field.label}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              Complete these fields to help our AI provide better personalized recommendations
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {financialProfileInsights.completionPercentage < 100 
                            ? "Complete your profile for better AI recommendations" 
                            : "Profile complete! Our AI can provide personalized advice"
                          }
                        </div>
                        <Link
                          to="/dashboard/user-settings/profile"
                          className="flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40"
                        >
                          <FontAwesomeIcon icon={faEdit} className="mr-2 h-4 w-4" />
                          <span className="text-sm font-semibold">Update Profile</span>
                        </Link>
                      </div>
                    </>
                  ) : (
                    /* No Profile State */
                    <div className="text-center">
                      <div className="mb-6 mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 dark:from-purple-900/30 to-pink-100 dark:to-pink-900/30 rounded-full flex items-center justify-center shadow-lg">
                        <FontAwesomeIcon icon={faUser} className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create Your Financial Profile</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">Help our AI understand your financial situation to provide personalized recommendations tailored to your needs</p>
                      <Link
                        to="/dashboard/user-settings/profile"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
                        Create Profile
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Learning Progress Section */}
              <motion.div
                className="group relative overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-purple-200/50 dark:border-purple-700/50 shadow-2xl hover:shadow-purple-500/20 dark:hover:shadow-purple-400/20 border-t-4 border-t-indigo-500/80 dark:border-t-indigo-400/80"
                variants={cardHoverVariants}
                initial="rest"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 dark:from-purple-400/20 via-pink-500/5 dark:via-pink-400/10 to-indigo-500/10 dark:to-indigo-400/20"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(168,85,247,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_40%,rgba(168,85,247,0.2),transparent_50%)]"></div>
                <div className="relative p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 dark:from-purple-400 to-pink-600 dark:to-pink-500 text-white shadow-xl">
                        <FontAwesomeIcon icon={faGraduationCap} className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Learning Journey</h3>
                        <p className="text-gray-600 dark:text-gray-400">Your educational progress and achievements</p>
                      </div>
                    </div>
                    <Link
                      to="/dashboard/learning"
                      className="flex items-center text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                    >
                      <span className="text-sm font-semibold mr-2">View All Courses</span>
                      <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
                    </Link>
                  </div>

                  {learningInsights.hasCourses ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-1">
                            {learningInsights.completedLessons}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Lessons Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-1">
                            {learningInsights.earnedXP}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">XP Earned</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600 mb-1">
                            {Math.round(learningInsights.progress)}%
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Progress</div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                        <motion.div 
                          className="bg-gradient-to-r from-purple-500 dark:from-purple-400 via-pink-500 dark:via-pink-400 to-indigo-500 dark:to-indigo-400 h-3 rounded-full relative"
                          initial={{ width: 0, x: -10 }}
                          animate={{ width: `${learningInsights.progress}%`, x: 0 }}
                          transition={{ 
                            type: "spring",
                            damping: 20,
                            stiffness: 100,
                            duration: 1.2,
                            delay: 0.5 
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        </motion.div>
                      </div>

                      {learningInsights.nextLesson && (
                        <motion.div 
                          className="bg-gradient-to-r from-purple-50/80 dark:from-purple-900/20 to-pink-50/80 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl p-6 backdrop-blur-sm border-t-4 border-t-purple-400/80 dark:border-t-purple-300/80"
                          transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <FontAwesomeIcon icon={faBolt} className="h-4 w-4 text-purple-600 dark:text-purple-400 mr-2" />
                                <h4 className="font-semibold text-purple-800 dark:text-purple-200">Continue Learning</h4>
                              </div>
                              <p className="text-purple-700 dark:text-purple-300 font-medium mb-2">{learningInsights.nextLesson.title}</p>
                              <p className="text-purple-600 dark:text-purple-400 text-sm mb-3">{learningInsights.nextLesson.description}</p>
                              <div className="text-xs text-purple-600 dark:text-purple-400">
                                Course: {learningInsights.currentCourse?.title}
                              </div>
                            </div>
                            <Link
                              to={`/dashboard/learning/${learningInsights.currentCourse?.course_id}/lesson/${learningInsights.nextLesson.lesson_id}`}
                              className="ml-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              Continue
                            </Link>
                          </div>
                        </motion.div>
                      )}

                     
                        <div className="p-4 bg-gradient-to-r from-gray-50 dark:from-gray-800 to-white dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Recent Activity</h4>
                          
                          <Timeline/>

                          {/* Error State */}
                          {activitiesError && (
                            <div className="text-center py-4">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-red-500 mb-2" />
                              <p className="text-sm text-red-600">Failed to load activities</p>
                            </div>
                          )}
                        </div>
                      
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mb-4 mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 dark:from-purple-900/30 to-pink-100 dark:to-pink-900/30 rounded-full flex items-center justify-center shadow-lg">
                        <FontAwesomeIcon icon={faBookOpen} className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Start Your Learning Journey</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">Unlock personalized courses tailored to your financial goals</p>
                      <Link
                        to="/dashboard/learning"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <FontAwesomeIcon icon={faGraduationCap} className="mr-2 h-4 w-4" />
                        Explore Courses
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Quick Actions & Tools */}
            <motion.div className="lg:col-span-4 space-y-8" variants={itemVariants}>
              
              {/* AI Assistant Section */}
              <motion.div
                className="group relative overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-purple-200/50 dark:border-purple-700/50 shadow-2xl hover:shadow-purple-500/20 dark:hover:shadow-purple-400/20 border-t-4 border-t-pink-500/80 dark:border-t-pink-400/80"
                variants={cardHoverVariants}
                initial="rest"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 dark:from-purple-400/20 via-pink-500/5 dark:via-pink-400/10 to-indigo-500/10 dark:to-indigo-400/20"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(236,72,153,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_30%,rgba(236,72,153,0.2),transparent_50%)]"></div>
                <div className="relative p-6">
                  <div className="flex items-center mb-4">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 dark:from-pink-400 to-purple-600 dark:to-purple-500 text-white shadow-xl">
                      <FontAwesomeIcon icon={faComments} className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">AI Assistant</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Your personal financial advisor</p>
                    </div>
                  </div>

                  {conversationInsights.hasConversations ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-pink-50 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-xl">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                            {conversationInsights.totalConversations}
                          </div>
                          <div className="text-xs text-purple-700 dark:text-purple-300">Conversations</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-pink-50 dark:from-pink-900/20 to-purple-50 dark:to-purple-900/20 border border-pink-200 dark:border-pink-700 rounded-xl">
                          <div className="text-2xl font-bold text-pink-600 dark:text-pink-400 mb-1">
                            {conversationInsights.totalMessages}
                          </div>
                          <div className="text-xs text-pink-700 dark:text-pink-300">Messages</div>
                        </div>
                      </div>

                      {conversationInsights.recentConversation && (
                        <div className="p-3 bg-gradient-to-r from-gray-50 dark:from-gray-800 to-white dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Recent Session</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(conversationInsights.recentConversation.updated_at).toLocaleDateString()}
                            {conversationInsights.recentConversation.is_active && (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div
                        onClick={() => openChat('advisor')}
                        className="inline-flex cursor-pointer items-center w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <FontAwesomeIcon icon={faComments} className="mr-2 h-4 w-4" />
                        Continue Conversation
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300">Ask me anything about:</p>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <FontAwesomeIcon icon={faBullseye} className="h-3 w-3 mr-2 text-purple-500 dark:text-purple-400" />
                          Investment strategies
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <FontAwesomeIcon icon={faDollarSign} className="h-3 w-3 mr-2 text-purple-500 dark:text-purple-400" />
                          Budget planning
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <FontAwesomeIcon icon={faShieldAlt} className="h-3 w-3 mr-2 text-purple-500 dark:text-purple-400" />
                          Financial goals
                        </div>
                      </div>
                      <div
                      onClick={() => openChat('advisor')}
                        className="inline-flex items-center w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <FontAwesomeIcon icon={faComments} className="mr-2 h-4 w-4" />
                        Start Conversation
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Subscription Status */}
              {/* {subscriptionInsights.isSubscribed && (
                <motion.div
                  className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl"
                  variants={cardHoverVariants}
                  initial="rest"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5"></div>
                  <div className="relative p-6">
                    <div className="flex items-center mb-4">
                      <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
                        <FontAwesomeIcon icon={faShieldAlt} className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Subscription</h3>
                        <p className="text-sm text-gray-600">Your plan details</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-green-800">{subscriptionInsights.plan}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            subscriptionInsights.isTrialing ? 'bg-yellow-100 text-yellow-800' :
                            subscriptionInsights.isCancelled ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {subscriptionInsights.isTrialing ? 'Trial' :
                             subscriptionInsights.isCancelled ? 'Ending' :
                             'Active'}
                          </span>
                        </div>
                        {subscriptionInsights.daysUntilRenewal && (
                          <div className="text-sm text-green-700">
                            {subscriptionInsights.isCancelled ? 'Ends' : 'Renews'} in {subscriptionInsights.daysUntilRenewal} days
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-gray-600">
                        <div className="flex items-center justify-between">
                          <span>Features unlocked:</span>
                          <span className="font-semibold">{subscriptionInsights.featuresCount}</span>
                        </div>
                        {subscriptionInsights.billingAmount && (
                          <div className="flex items-center justify-between mt-1">
                            <span>Last payment:</span>
                            <span className="font-semibold">${(subscriptionInsights.billingAmount / 100).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      <Link
                        to="/dashboard/membership"
                        className="inline-flex items-center w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                      >
                        <FontAwesomeIcon icon={faShieldAlt} className="mr-2 h-4 w-4" />
                        Manage Plan
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )} */}

              {/* Quick Calculators */}
              <motion.div
                className="group relative overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-purple-200/50 dark:border-purple-700/50 shadow-2xl hover:shadow-purple-500/20 dark:hover:shadow-purple-400/20 border-t-4 border-t-indigo-500/80 dark:border-t-indigo-400/80"
                variants={cardHoverVariants}
                initial="rest"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 dark:from-purple-400/20 via-pink-500/5 dark:via-pink-400/10 to-indigo-500/10 dark:to-indigo-400/20"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.2),transparent_50%)]"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 dark:from-purple-400 to-indigo-600 dark:to-indigo-500 text-white shadow-xl">
                        <FontAwesomeIcon icon={faCalculator} className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Quick Tools</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Financial calculators</p>
                      </div>
                    </div>
                    <Link
                      to="/calculators"
                      className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition-colors font-semibold"
                    >
                      View All ({availableCalculators.length})
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {availableCalculators.slice(0, 4).map((calculator) => (
                      <motion.div
                        key={calculator.title}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      >
                        <Link
                          to={calculator.path}
                          className="block group/item p-3 rounded-xl bg-gradient-to-r from-white/80 dark:from-gray-700/80 to-gray-50/80 dark:to-gray-600/80 border border-purple-200/30 dark:border-purple-700/30 hover:border-purple-300/50 dark:hover:border-purple-600/50 transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
                        >
                          <div className="flex items-center">
                            <div className={`mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${calculator.color} text-white shadow-sm`}>
                              <FontAwesomeIcon icon={calculator.icon} className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover/item:text-gray-800 dark:group-hover/item:text-gray-200">
                                {calculator.title}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{calculator.category}</div>
                            </div>
                            <FontAwesomeIcon 
                              icon={faChevronRight} 
                              className="h-3 w-3 text-gray-400 dark:text-gray-500 group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400 transition-colors" 
                            />
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Essential Lessons Quick Access */}
              <motion.div
                className="group relative overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-purple-200/50 dark:border-purple-700/50 shadow-2xl hover:shadow-purple-500/20 dark:hover:shadow-purple-400/20 border-t-4 border-t-purple-600/80 dark:border-t-purple-500/80"
                variants={cardHoverVariants}
                initial="rest"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 dark:from-purple-400/20 via-pink-500/5 dark:via-pink-400/10 to-indigo-500/10 dark:to-indigo-400/20"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.2),transparent_50%)]"></div>
                <div className="relative p-6">
                  <div className="flex items-center mb-4">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 dark:from-purple-400 to-pink-600 dark:to-pink-500 text-white shadow-xl">
                      <FontAwesomeIcon icon={faLightbulb} className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Essential Lessons</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Foundation knowledge</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-cyan-50 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-2">Your 2025 Guide to Investing</h4>
                      <p className="text-blue-700 dark:text-blue-300 text-xs mb-3">Master investment fundamentals with 20+ comprehensive lessons</p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          <FontAwesomeIcon icon={faBookOpen} className="mr-1" />
                          20+ lessons available
                        </div>
                        <Link
                          to="/dashboard/essentials"
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          Start Learning
                          <FontAwesomeIcon icon={faArrowRight} className="ml-1 h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

        {/* Rewards Modal */}
        {showRewardsModal && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRewardsModal(false)}
          />
          
          {/* Modal */}
          <motion.div
            className="fixed inset-4 md:inset-8 lg:inset-16 xl:inset-24 z-50 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <div className="relative w-full max-w-4xl max-h-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 dark:from-amber-400 to-orange-600 dark:to-orange-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/20 dark:bg-white/10">
                      <FontAwesomeIcon icon={faTrophy} className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Rewards Roadmap</h2>
                      <p className="text-amber-100 dark:text-amber-200">
                        {LEVEL_REWARDS.filter(r => levelInfo.level >= r.level).length} / {LEVEL_REWARDS.length} rewards unlocked
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRewardsModal(false)}
                    className="p-2 rounded-xl bg-white/20 dark:bg-white/10 hover:bg-white/30 dark:hover:bg-white/20 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Scrollable Content */}
              <div className="max-h-96 overflow-y-auto p-6 bg-white dark:bg-gray-900">
                <div className="relative">
                  {/* Progress line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-200 dark:from-amber-300 via-orange-300 dark:via-orange-400 to-amber-200 dark:to-amber-300"></div>
                  
                  <div className="space-y-4">
                    {LEVEL_REWARDS.map((reward, index) => {
                      const isUnlocked = levelInfo.level >= reward.level;
                      const isNext = !isUnlocked && reward.level === levelInfo.level + 1;
                      const xpRequired = LEVEL_REQUIREMENTS[reward.level - 1] || 0;
                      
                      return (
                        <motion.div
                          key={reward.level}
                          className={`relative flex items-start gap-4 p-4 rounded-xl transition-all duration-200 ${
                            isUnlocked 
                              ? 'bg-gradient-to-r from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700' 
                              : isNext
                              ? 'bg-gradient-to-r from-amber-50 dark:from-amber-900/20 to-yellow-50 dark:to-yellow-900/20 border-2 border-amber-300 dark:border-amber-600 ring-2 ring-amber-200 dark:ring-amber-600'
                              : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-75'
                          }`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          {/* Level indicator */}
                          <div className={`relative flex-shrink-0 p-3 rounded-xl shadow-lg ${
                            isUnlocked 
                              ? `bg-gradient-to-br ${reward.color}` 
                              : isNext
                              ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                              : 'bg-gradient-to-br from-gray-300 to-gray-400'
                          }`}>
                            <FontAwesomeIcon 
                              icon={isUnlocked ? faUnlock : reward.icon} 
                              className="h-4 w-4 text-white" 
                            />
                            {!isUnlocked && (
                              <div className="absolute -top-1 -right-1 p-1 bg-gray-600 dark:bg-gray-500 rounded-full">
                                <FontAwesomeIcon icon={faLock} className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${
                                  isUnlocked ? 'text-green-900 dark:text-green-200' : isNext ? 'text-amber-900 dark:text-amber-200' : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  Level {reward.level}
                                </span>
                                {isNext && (
                                  <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">
                                    NEXT
                                  </span>
                                )}
                                {isUnlocked && (
                                  <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">
                                    ✓ UNLOCKED
                                  </span>
                                )}
                              </div>
                              <div className={`text-sm font-medium ${
                                isUnlocked ? 'text-green-600 dark:text-green-400' : isNext ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {xpRequired.toLocaleString()} XP
                              </div>
                            </div>
                            
                            <h4 className={`font-bold mb-1 ${
                              isUnlocked ? 'text-green-900 dark:text-green-200' : isNext ? 'text-amber-900 dark:text-amber-200' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {reward.title}
                            </h4>
                            <p className={`text-sm mb-3 ${
                              isUnlocked ? 'text-green-700 dark:text-green-300' : isNext ? 'text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {reward.description}
                            </p>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`p-1.5 rounded-lg ${
                                isUnlocked ? 'bg-green-200 dark:bg-green-800' : isNext ? 'bg-amber-200 dark:bg-amber-800' : 'bg-gray-200 dark:bg-gray-700'
                              }`}>
                                <FontAwesomeIcon 
                                  icon={faGift} 
                                  className={`h-3 w-3 ${
                                    isUnlocked ? 'text-green-600 dark:text-green-300' : isNext ? 'text-amber-600 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'
                                  }`} 
                                />
                              </div>
                              <span className={`text-sm font-semibold ${
                                isUnlocked ? 'text-green-800 dark:text-green-200' : isNext ? 'text-amber-800 dark:text-amber-200' : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                🎁 {reward.reward}
                              </span>
                            </div>
                            
                            {isNext && (
                              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
                                <div className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-2">
                                  {levelInfo.xpNeededForNext.toLocaleString()} XP needed to unlock
                                </div>
                                <div className="h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-amber-400 dark:from-amber-300 to-orange-500 dark:to-orange-400 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((currentXP / xpRequired) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Keep learning and growing to unlock amazing rewards! 🚀
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </>
  );
}

export default DashboardHome;
