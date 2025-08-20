"use client";

import { useAuth } from "@/contexts/auth-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import {
  faArrowRight,
  faBookOpen,
  faBolt,
  faBullseye,
  faCalculator,
  faCalendarAlt,
  faChartLine,
  faCheckCircle,
  faChevronRight,
  faComments,
  faCreditCard,
  faDollarSign,
  faEdit,
  faExclamationTriangle,
  faFire,
  faGift,
  faGraduationCap,
  faHome,
  faLightbulb,
  faLock,
  faMoneyBillWave,
  faPercent,
  faPiggyBank,
  faPlus,
  faShieldAlt,
  faTimes,
  faTrophy,
  faUnlock,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery } from "@tanstack/react-query";
import { type Conversation } from "@/services/conversation-service";
import basicCourse from "@/data/basic-lessons.json";
import { getCurrentLevelInfo, LEVEL_REWARDS, LEVEL_REQUIREMENTS } from "@/components/rewards/rewards-level";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { Timeline } from "@/components/timeline/Timeline";
import { useAIChat } from "@/contexts/ai-chat-context";
import monekoAvatar from "@/assets/images/logo/moneko.png";

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
      // For now return empty array - conversation functionality to be implemented
      // TODO: Replace with actual conversation service call when backend is ready
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
        className="max-w-7xl mx-auto py-6 text-foreground dark:text-dark-foreground"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 p-1">
                <img 
                  src={monekoAvatar} 
                  alt="Moneko Avatar" 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {getGreeting()}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Ready to master your finances today?
                </p>
              </div>
            </div>
            
            {/* Level and Streak Info */}
            <div className="flex items-center space-x-4">
              {currentLevelReward && (
                <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-xl px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${currentLevelReward.color}`}>
                    <FontAwesomeIcon icon={currentLevelReward.icon} className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Level {levelInfo.level}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{currentLevelReward.title}</div>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-xl px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-red-500">
                  <FontAwesomeIcon icon={faFire} className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{currentStreak}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">day streak</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* XP Progress Bar */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Progress to Next Level</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {levelInfo.progressInLevel.toLocaleString()} / {(levelInfo.nextLevelXP - levelInfo.currentLevelXP).toLocaleString()} XP
                </p>
              </div>
              {!levelInfo.isMaxLevel && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {levelInfo.xpNeededForNext.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">XP to level {levelInfo.level + 1}</div>
                </div>
              )}
            </div>
            
            <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                style={{ width: `${levelInfo.progressPercentage}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              />
            </div>
            
            {nextLevelReward && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <FontAwesomeIcon icon={faGift} className="h-4 w-4" />
                  <span>Next reward: {nextLevelReward.reward}</span>
                </div>
                <button
                  onClick={() => setShowRewardsModal(true)}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-semibold"
                >
                  View All Rewards
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - 2 spans */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Financial Overview Card */}
            <motion.div variants={itemVariants}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      <FontAwesomeIcon icon={faDollarSign} className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Financial Overview</h3>
                      <p className="text-gray-600 dark:text-gray-400">Your financial snapshot</p>
                    </div>
                  </div>
                  <Link
                    to="/dashboard/user-settings/profile"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold"
                  >
                    Update Profile
                  </Link>
                </div>

                {financialProfileInsights.hasProfile ? (
                  <div className="space-y-6">
                    {/* Key Metrics Grid */}
                    {Object.keys(financialProfileInsights.keyMetrics).length > 0 && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {financialProfileInsights.keyMetrics.monthlyIncome && (
                          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 border border-green-200 dark:border-green-700">
                            <FontAwesomeIcon icon={faDollarSign} className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              ${financialProfileInsights.keyMetrics.monthlyIncome.toLocaleString()}
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300">Monthly Income</div>
                          </div>
                        )}

                        {financialProfileInsights.keyMetrics.monthlySavings && (
                          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-cyan-50 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700">
                            <FontAwesomeIcon icon={faPiggyBank} className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              ${financialProfileInsights.keyMetrics.monthlySavings.toLocaleString()}
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">Monthly Savings</div>
                          </div>
                        )}

                        {financialProfileInsights.keyMetrics.emergencyFund && (
                          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-pink-50 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700">
                            <FontAwesomeIcon icon={faShieldAlt} className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              ${financialProfileInsights.keyMetrics.emergencyFund.toLocaleString()}
                            </div>
                            <div className="text-sm text-purple-700 dark:text-purple-300">Emergency Fund</div>
                          </div>
                        )}

                        {financialProfileInsights.keyMetrics.yearsToRetirement && (
                          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 dark:from-orange-900/20 to-yellow-50 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-700">
                            <FontAwesomeIcon icon={faCalendarAlt} className="h-6 w-6 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {financialProfileInsights.keyMetrics.yearsToRetirement}
                            </div>
                            <div className="text-sm text-orange-700 dark:text-orange-300">Years to Retire</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Profile Completion */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Profile Completion</h4>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {financialProfileInsights.completionPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${financialProfileInsights.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 dark:from-purple-900/30 to-pink-100 dark:to-pink-900/30 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faUser} className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Create Your Financial Profile</h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Get personalized recommendations based on your financial goals</p>
                    <Link
                      to="/dashboard/user-settings/profile"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
                      Create Profile
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Learning Progress Card */}
            <motion.div variants={itemVariants}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                      <FontAwesomeIcon icon={faGraduationCap} className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Learning Progress</h3>
                      <p className="text-gray-600 dark:text-gray-400">Your educational journey</p>
                    </div>
                  </div>
                  <Link
                    to="/dashboard/learning"
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold"
                  >
                    View All Courses
                  </Link>
                </div>

                {learningInsights.hasCourses ? (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                          {learningInsights.completedLessons}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                          {learningInsights.earnedXP}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">XP Earned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                          {Math.round(learningInsights.progress)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Progress</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <motion.div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${learningInsights.progress}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>

                    {/* Next Lesson */}
                    {learningInsights.nextLesson && (
                      <div className="bg-gradient-to-r from-emerald-50 dark:from-emerald-900/20 to-teal-50 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">Continue Learning</h4>
                            <p className="text-emerald-700 dark:text-emerald-300 font-medium mb-1">{learningInsights.nextLesson.title}</p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">{learningInsights.currentCourse?.title}</p>
                          </div>
                          <Link
                            to={`/dashboard/learning/${learningInsights.currentCourse?.course_id}/lesson/${learningInsights.nextLesson.lesson_id}` as any}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Continue
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Recent Activity */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Activity</h4>
                      <Timeline/>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-100 dark:from-emerald-900/30 to-teal-100 dark:to-teal-900/30 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faBookOpen} className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Start Learning</h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Begin your financial education journey</p>
                    <Link
                      to="/dashboard/learning"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg"
                    >
                      <FontAwesomeIcon icon={faGraduationCap} className="mr-2 h-4 w-4" />
                      Explore Courses
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column - 1 span */}
          <div className="space-y-6">
            
            {/* AI Assistant Card */}
            <motion.div variants={itemVariants}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                    <FontAwesomeIcon icon={faComments} className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Assistant</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Your financial advisor</p>
                  </div>
                </div>

                {conversationInsights.hasConversations ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          {conversationInsights.totalConversations}
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-300">Chats</div>
                      </div>
                      <div className="text-center p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700 rounded-lg">
                        <div className="text-xl font-bold text-pink-600 dark:text-pink-400">
                          {conversationInsights.totalMessages}
                        </div>
                        <div className="text-xs text-pink-700 dark:text-pink-300">Messages</div>
                      </div>
                    </div>

                    <button
                      onClick={() => openChat('advisor')}
                      className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
                    >
                      Continue Chat
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">Get help with:</p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FontAwesomeIcon icon={faBullseye} className="h-3 w-3 mr-2 text-purple-500" />
                        Investment strategies
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FontAwesomeIcon icon={faDollarSign} className="h-3 w-3 mr-2 text-purple-500" />
                        Budget planning
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FontAwesomeIcon icon={faShieldAlt} className="h-3 w-3 mr-2 text-purple-500" />
                        Financial goals
                      </div>
                    </div>
                    <button
                      onClick={() => openChat('advisor')}
                      className="w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
                    >
                      Start Chat
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Tools Card */}
            <motion.div variants={itemVariants}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <FontAwesomeIcon icon={faCalculator} className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Tools</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Financial calculators</p>
                    </div>
                  </div>
                  <Link
                    to="/calculators"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold"
                  >
                    View All
                  </Link>
                </div>

                <div className="space-y-3">
                  {availableCalculators.slice(0, 4).map((calculator) => (
                    <Link
                      key={calculator.title}
                      to={calculator.path}
                      className="flex items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${calculator.color} text-white mr-3`}>
                        <FontAwesomeIcon icon={calculator.icon} className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {calculator.title}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{calculator.category}</div>
                      </div>
                      <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Essential Lessons Card */}
            <motion.div variants={itemVariants}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                    <FontAwesomeIcon icon={faLightbulb} className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Essential Lessons</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Foundation knowledge</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-cyan-50 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
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
            </motion.div>
          </div>
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