"use client";

import { useAuth } from "@/contexts/auth-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRocket,
  faChartLine,
  faGraduationCap,
  faCalculator,
  faComments,
  faArrowRight,
  faPlus,
  faBookOpen,
  faLightbulb,
  faBullseye,
  faClock,
  faAward,
  faFire,
  faEye,
  faHome,
  faMoneyBillWave,
  faPercent,
  faPiggyBank,
  faCreditCard,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faDollarSign,
  faCalendarAlt,
  faUser,
  faShieldAlt,
  faTrophy,
  faHistory,
  faSpinner,
  faChevronRight,
  faBolt,
  faChartBar,
  faHeartbeat,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { useDashboard } from "@/hooks/use-dashboard";
import { useUserCourses } from "@/services/course-service";
import { useSubscription } from "@/hooks/use-subscription";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getConversations } from "@/services/conversation-service";
import { ProtectedRouteSubscription } from "@/components/auth/ProtectedRouteSubscription";
import { DailyBriefing } from "@/components/dashboard/DailyBriefing";
import { FloatingChatButton } from "@/components/dashboard-chat/FloatingChatButton";

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
  
  // Real data hooks - NO MOCK DATA
  const { dashboardData, views, status: dashboardStatus } = useDashboard(user?.id);
  const { data: courses = [], isLoading: coursesLoading } = useUserCourses(user?.id || "", { enabled: !!user });
  const { subscription, features, paymentMethod, invoices, isLoading: subLoading, isActive } = useSubscription(user?.id);
  const { profile: financialProfile, isLoading: profileLoading, hasProfile } = useFinancialHealthProfile(user?.id);
  
  // Fetch real conversation data
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => getConversations(supabase),
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

  // Calculate real learning progress from actual course data
  const learningInsights = useMemo(() => {
    if (coursesLoading || !courses.length) {
      return {
        hasCourses: false,
        totalCourses: 0,
        totalLessons: 0,
        completedLessons: 0,
        progress: 0,
        currentCourse: null,
        nextLesson: null,
        totalXP: 0,
        recentActivity: null,
      };
    }

    const totalLessons = courses.reduce((acc, course) => acc + course.lessons.length, 0);
    const completedLessons = courses.reduce((acc, course) => 
      acc + course.lessons.filter(lesson => lesson.unlocked).length, 0
    );
    
    const totalXP = courses.reduce((acc, course) => 
      acc + course.lessons.filter(lesson => lesson.unlocked).reduce((xpAcc, lesson) => xpAcc + (lesson.xp || 0), 0), 0
    );

    // Find current course (one with most recent progress)
    const currentCourse = courses.find(course => 
      course.lessons.some(lesson => lesson.unlocked && lesson.lesson_id !== course.lessons[0]?.lesson_id)
    ) || courses[0];

    // Find next lesson to unlock
    const nextLesson = currentCourse?.lessons?.find(lesson => !lesson.unlocked) || null;

    // Get most recent lesson completed
    const recentLesson = courses
      .flatMap(course => course.lessons.filter(lesson => lesson.unlocked))
      .sort((a, b) => (b.lesson_id || '').localeCompare(a.lesson_id || ''))
      [0] || null;

    return {
      hasCourses: true,
      totalCourses: courses.length,
      totalLessons,
      completedLessons,
      progress: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
      currentCourse,
      nextLesson,
      totalXP,
      recentActivity: recentLesson,
    };
  }, [courses, coursesLoading]);

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

  // Real financial profile insights
  const financialProfileInsights = useMemo(() => {
    if (profileLoading || !hasProfile || !financialProfile) {
      return {
        hasProfile: false,
        age: null,
        monthlyIncome: null,
        monthlySavings: null,
        totalAssets: null,
        yearsToRetirement: null,
        riskProfile: null,
        topPriorities: [],
        emergencyFund: null,
        debtAmount: null,
      };
    }

    const profileData = financialProfile.profile_data;
    
    return {
      hasProfile: true,
      age: profileData.demographics.age,
      monthlyIncome: profileData.demographics.income.net,
      monthlyExpenses: profileData.demographics.expenses,
      monthlySavings: profileData.calculated_metrics.monthly_savings,
      totalAssets: profileData.calculated_metrics.total_assets,
      yearsToRetirement: profileData.calculated_metrics.years_to_retirement,
      riskProfile: profileData.risk_profile.investment_knowledge,
      topPriorities: profileData.goals_and_timeline.financial_priorities.slice(0, 3),
      emergencyFund: profileData.financial_situation.emergency_fund,
      debtAmount: profileData.financial_situation.debt_amount,
      retirementGoal: profileData.goals_and_timeline.target_retirement,
      retirementAge: profileData.goals_and_timeline.retirement_age,
      cashSavings: profileData.financial_situation.cash_savings,
      investments: profileData.financial_situation.other_investments,
      pensionValue: profileData.financial_situation.pension_value,
    };
  }, [financialProfile, hasProfile, profileLoading]);

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

  // Real calculator usage data (from available calculators)
  const availableCalculators = [
    {
      title: "Compound Interest",
      description: "Calculate investment growth with compound returns",
      icon: faChartLine,
      path: "/dashboard/calculators/compound-calculator",
      color: "from-purple-500 to-pink-500",
      category: "Investment",
    },
    {
      title: "Mortgage Calculator",
      description: "Estimate monthly payments and total interest",
      icon: faHome,
      path: "/dashboard/calculators/mortgage-calculator", 
      color: "from-blue-500 to-cyan-500",
      category: "Housing",
    },
    {
      title: "Savings Goals",
      description: "Plan and track your financial objectives",
      icon: faPiggyBank,
      path: "/dashboard/calculators/saving-goals-calculator",
      color: "from-green-500 to-emerald-500",
      category: "Savings",
    },
    {
      title: "Investment Growth",
      description: "Project portfolio returns over time",
      icon: faPercent,
      path: "/dashboard/calculators/investment-calculator",
      color: "from-orange-500 to-red-500",
      category: "Investment",
    },
    {
      title: "Auto Loan",
      description: "Calculate car loan payments and costs",
      icon: faMoneyBillWave,
      path: "/dashboard/calculators/auto-loan-calculator",
      color: "from-red-500 to-pink-500",
      category: "Debt",
    },
    {
      title: "Retirement Planner",
      description: "Plan for your golden years",
      icon: faCreditCard,
      path: "/dashboard/calculators/retirement-calculator",
      color: "from-indigo-500 to-purple-500",
      category: "Retirement",
    },
  ];

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  const isLoading = coursesLoading || subLoading || profileLoading || conversationsLoading;

  return (
    <ProtectedRouteSubscription>
      <motion.div
        className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-indigo-100/60 dark:from-slate-900 dark:via-purple-900/20 dark:to-indigo-900/30"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Daily Briefing - The Centerpiece */}
        <motion.section 
          className="px-4 py-8 sm:px-6 lg:px-8"
          variants={itemVariants}
        >
          <div className="mx-auto max-w-7xl">
            <DailyBriefing 
              userProgress={{
                streak: 7, // TODO: Get from actual user data
                xp: learningInsights.hasCourses ? learningInsights.totalXP : 0,
                level: Math.floor((learningInsights.hasCourses ? learningInsights.totalXP : 0) / 500) + 1,
                completedQuests: [] // TODO: Get from actual user data
              }}
              onCompleteQuest={(questId) => {
                // TODO: Handle quest completion
                console.log('Quest completed:', questId);
              }}
            />
          </div>
        </motion.section>

        <div className="mx-auto max-w-7xl">
      

          {/* Main Content Grid */}
          <motion.div 
            className="grid gap-8 lg:grid-cols-12"
            variants={containerVariants}
          >
            {/* Left Column - Financial Overview & Portfolio */}
            <motion.div className="lg:col-span-8 space-y-8" variants={itemVariants}>
              
              {/* Financial Health Overview */}
              {financialProfileInsights.hasProfile ? (
                <motion.div
                  className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-purple-200/50 shadow-2xl hover:shadow-purple-500/20 border-t-4 border-t-purple-500/80"
                  variants={cardHoverVariants}
                  initial="rest"
                  whileHover="hover"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-indigo-500/10"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_50%)]"></div>
                  <div className="relative p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl">
                          <FontAwesomeIcon icon={faHeartbeat} className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Financial Health</h3>
                          <p className="text-gray-600">Your complete financial snapshot</p>
                        </div>
                      </div>
                      {portfolioInsights.hasFinancialHealth && (
                        <div className="text-right">
                          <div className="text-3xl font-bold text-green-600">
                            {portfolioInsights.financialScore}
                          </div>
                          <div className="text-sm text-gray-600">{portfolioInsights.financialStatus}</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                        <FontAwesomeIcon icon={faDollarSign} className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          ${financialProfileInsights.monthlyIncome?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-blue-700">Monthly Income</div>
                      </div>

                      <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                        <FontAwesomeIcon icon={faPiggyBank} className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          ${financialProfileInsights.monthlySavings?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-green-700">Monthly Savings</div>
                      </div>

                      <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                        <FontAwesomeIcon icon={faChartBar} className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          ${financialProfileInsights.totalAssets?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-purple-700">Total Assets</div>
                      </div>

                      <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200">
                        <FontAwesomeIcon icon={faCalendarAlt} className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {financialProfileInsights.yearsToRetirement || 0}
                        </div>
                        <div className="text-sm text-orange-700">Years to Retire</div>
                      </div>
                    </div>

                    {financialProfileInsights.topPriorities.length > 0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl">
                        <h4 className="font-semibold text-gray-900 mb-2">Top Financial Priorities</h4>
                        <div className="flex flex-wrap gap-2">
                          {financialProfileInsights.topPriorities.map((priority, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                            >
                              {priority}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Risk Profile: <span className="font-semibold">{financialProfileInsights.riskProfile}</span>
                      </div>
                      <Link
                        to="/dashboard/portfolio"
                        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <span className="text-sm font-semibold mr-2">View Details</span>
                        <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-purple-200/50 shadow-2xl hover:shadow-purple-500/20 border-t-4 border-t-pink-500/80"
                  variants={cardHoverVariants}
                  initial="rest"
                  whileHover="hover"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-indigo-500/10"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_50%)]"></div>
                  <div className="relative p-8 text-center">
                    <div className="mb-6 mx-auto w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center shadow-lg">
                      <FontAwesomeIcon icon={faUser} className="h-10 w-10 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Financial Profile</h3>
                    <p className="text-gray-600 mb-6">Get personalized insights by completing your financial health assessment</p>
                    <Link
                      to="/dashboard/portfolio"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
                      Start Assessment
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Learning Progress Section */}
              <motion.div
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-purple-200/50 shadow-2xl hover:shadow-purple-500/20 border-t-4 border-t-indigo-500/80"
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-indigo-500/10"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(168,85,247,0.1),transparent_50%)]"></div>
                <div className="relative p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl">
                        <FontAwesomeIcon icon={faGraduationCap} className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Learning Journey</h3>
                        <p className="text-gray-600">Your educational progress and achievements</p>
                      </div>
                    </div>
                    <Link
                      to="/dashboard/learning"
                      className="flex items-center text-green-600 hover:text-green-800 transition-colors"
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
                          <div className="text-sm text-gray-600">Lessons Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-1">
                            {learningInsights.totalXP}
                          </div>
                          <div className="text-sm text-gray-600">XP Earned</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600 mb-1">
                            {Math.round(learningInsights.progress)}%
                          </div>
                          <div className="text-sm text-gray-600">Progress</div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                        <motion.div 
                          className="bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 h-3 rounded-full relative"
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
                          className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 border border-purple-200 rounded-2xl p-6 backdrop-blur-sm border-t-4 border-t-purple-400/80"
                          whileHover={{ y: -2 }}
                          transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <FontAwesomeIcon icon={faBolt} className="h-4 w-4 text-purple-600 mr-2" />
                                <h4 className="font-semibold text-purple-800">Continue Learning</h4>
                              </div>
                              <p className="text-purple-700 font-medium mb-2">{learningInsights.nextLesson.title}</p>
                              <p className="text-purple-600 text-sm mb-3">{learningInsights.nextLesson.description}</p>
                              <div className="text-xs text-purple-600">
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

                      {learningInsights.recentActivity && (
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl">
                          <h4 className="font-semibold text-gray-900 mb-2">Recent Activity</h4>
                          <div className="flex items-center text-sm text-gray-600">
                            <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-green-500 mr-2" />
                            Completed: {learningInsights.recentActivity.title}
                            {learningInsights.recentActivity.xp && (
                              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                +{learningInsights.recentActivity.xp} XP
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mb-4 mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center shadow-lg">
                        <FontAwesomeIcon icon={faBookOpen} className="h-8 w-8 text-purple-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Start Your Learning Journey</h4>
                      <p className="text-gray-600 mb-4">Unlock personalized courses tailored to your financial goals</p>
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
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-purple-200/50 shadow-2xl hover:shadow-purple-500/20 border-t-4 border-t-pink-500/80"
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-indigo-500/10"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(236,72,153,0.1),transparent_50%)]"></div>
                <div className="relative p-6">
                  <div className="flex items-center mb-4">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-xl">
                      <FontAwesomeIcon icon={faComments} className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">AI Assistant</h3>
                      <p className="text-sm text-gray-600">Your personal financial advisor</p>
                    </div>
                  </div>

                  {conversationInsights.hasConversations ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                          <div className="text-2xl font-bold text-purple-600 mb-1">
                            {conversationInsights.totalConversations}
                          </div>
                          <div className="text-xs text-purple-700">Conversations</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-xl">
                          <div className="text-2xl font-bold text-pink-600 mb-1">
                            {conversationInsights.totalMessages}
                          </div>
                          <div className="text-xs text-pink-700">Messages</div>
                        </div>
                      </div>

                      {conversationInsights.recentConversation && (
                        <div className="p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl">
                          <div className="text-sm font-semibold text-gray-900 mb-1">Recent Session</div>
                          <div className="text-xs text-gray-600">
                            {new Date(conversationInsights.recentConversation.updated_at).toLocaleDateString()}
                            {conversationInsights.recentConversation.is_active && (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <Link
                        to="/dashboard/chat"
                        className="inline-flex items-center w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <FontAwesomeIcon icon={faComments} className="mr-2 h-4 w-4" />
                        Continue Conversation
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-700">Ask me anything about:</p>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <FontAwesomeIcon icon={faBullseye} className="h-3 w-3 mr-2 text-purple-500" />
                          Investment strategies
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FontAwesomeIcon icon={faDollarSign} className="h-3 w-3 mr-2 text-purple-500" />
                          Budget planning
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FontAwesomeIcon icon={faShieldAlt} className="h-3 w-3 mr-2 text-purple-500" />
                          Financial goals
                        </div>
                      </div>
                      <Link
                        to="/dashboard/chat"
                        className="inline-flex items-center w-full px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <FontAwesomeIcon icon={faComments} className="mr-2 h-4 w-4" />
                        Start Conversation
                      </Link>
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
                  whileHover="hover"
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
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-purple-200/50 shadow-2xl hover:shadow-purple-500/20 border-t-4 border-t-indigo-500/80"
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-indigo-500/10"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.1),transparent_50%)]"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl">
                        <FontAwesomeIcon icon={faCalculator} className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Quick Tools</h3>
                        <p className="text-sm text-gray-600">Financial calculators</p>
                      </div>
                    </div>
                    <Link
                      to="/dashboard/calculators"
                      className="text-xs text-orange-600 hover:text-orange-800 transition-colors font-semibold"
                    >
                      View All ({availableCalculators.length})
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {availableCalculators.slice(0, 4).map((calculator) => (
                      <motion.div
                        key={calculator.title}
                        whileHover={{ x: 4 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      >
                        <Link
                          to={calculator.path}
                          className="block group/item p-3 rounded-xl bg-gradient-to-r from-white/80 to-gray-50/80 border border-purple-200/30 hover:border-purple-300/50 transition-all duration-200 hover:shadow-lg backdrop-blur-sm"
                        >
                          <div className="flex items-center">
                            <div className={`mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${calculator.color} text-white shadow-sm`}>
                              <FontAwesomeIcon icon={calculator.icon} className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900 group-hover/item:text-gray-800">
                                {calculator.title}
                              </div>
                              <div className="text-xs text-gray-600">{calculator.category}</div>
                            </div>
                            <FontAwesomeIcon 
                              icon={faChevronRight} 
                              className="h-3 w-3 text-gray-400 group-hover/item:text-purple-600 transition-colors" 
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
                className="group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl border border-purple-200/50 shadow-2xl hover:shadow-purple-500/20 border-t-4 border-t-purple-600/80"
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-indigo-500/10"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.1),transparent_50%)]"></div>
                <div className="relative p-6">
                  <div className="flex items-center mb-4">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl">
                      <FontAwesomeIcon icon={faLightbulb} className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Essential Lessons</h3>
                      <p className="text-sm text-gray-600">Foundation knowledge</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
                      <h4 className="font-semibold text-blue-800 text-sm mb-2">Your 2025 Guide to Investing</h4>
                      <p className="text-blue-700 text-xs mb-3">Master investment fundamentals with 20+ comprehensive lessons</p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-blue-600">
                          <FontAwesomeIcon icon={faBookOpen} className="mr-1" />
                          20+ lessons available
                        </div>
                        <Link
                          to="/dashboard/essentials"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
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
      <FloatingChatButton/>
    </ProtectedRouteSubscription>
  );
}

export default DashboardHome;
