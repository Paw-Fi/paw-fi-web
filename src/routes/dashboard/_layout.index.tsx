"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import {
  TrendingUp,
  BookOpen,
  Calculator,
  MessageCircle,
  Target,
  Award,
  Flame,
  DollarSign,
  GraduationCap,
  PiggyBank,
  Shield,
  Home,
  Calendar,
  ChevronRight,
  Plus,
  ArrowRight,
  Gift,
  Trophy,
  User,
  Lightbulb,
  X,
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

export const Route = createFileRoute("/dashboard/_layout/")({
  component: DashboardHome,
});

// Modern 2025 animation variants with ultra-smooth spring physics
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 100,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 120,
      mass: 0.8,
    },
  },
};

const cardHoverVariants: Variants = {
  rest: { 
    y: 0,
    scale: 1,
  },
  hover: { 
    y: -2,
    scale: 1.01,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 400,
      mass: 0.5,
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
        className="min-h-screen bg-background"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-8">
          {/* Test Panel - TEMPORARY FOR TESTING */}
          {showTestPanel && (
            <motion.div variants={itemVariants} className="mb-8">
              <GuidanceTestPanel onClose={() => setShowTestPanel(false)} />
            </motion.div>
          )}

          {/* Welcome Header - Apple-inspired */}
          <motion.div variants={itemVariants} className="mb-12">
            <div className="flex flex-col space-y-6 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-6">
                <Avatar className="h-20 w-20 ring-2 ring-border shadow-sm">
                  <AvatarImage src={monekoAvatar} alt="Moneko Avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                    M
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-4xl font-semibold text-foreground tracking-tight">
                    {getGreeting()}
                  </h1>
                  <p className="text-lg text-muted-foreground mt-1">
                    Ready to master your finances today?
                  </p>
                </div>
              </div>
              
              {/* Level and Streak Info - Redesigned */}
              <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-3">
                {currentLevelReward && (
                  <Card className="shadow-sm">
                    <CardContent className="flex items-center space-x-3 p-4 sm:p-5">
                      <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                        {React.createElement(currentLevelReward.icon, { className: "h-4 w-4" })}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">Level {levelInfo.level}</div>
                        <div className="text-xs text-muted-foreground">{currentLevelReward.title}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card className="shadow-sm">
                  <CardContent className="flex items-center space-x-3 p-4 sm:p-5">
                    <div className="p-2 rounded-lg bg-orange-500/90 text-white">
                      <Flame className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{currentStreak}</div>
                      <div className="text-xs text-muted-foreground">day streak</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>

          {/* XP Progress Bar - Clean Design */}
          <motion.div variants={itemVariants} className="mb-12">
            <Card className="shadow-sm">
              <CardHeader className="pb-4 px-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold flex items-center space-x-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      <span>Progress to Next Level</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {levelInfo.progressInLevel.toLocaleString()} / {(levelInfo.nextLevelXP - levelInfo.currentLevelXP).toLocaleString()} XP
                    </CardDescription>
                  </div>
                  {!levelInfo.isMaxLevel && (
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">
                        {levelInfo.xpNeededForNext.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">XP to level {levelInfo.level + 1}</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 sm:px-6">
                <div className="mb-6">
                  <Progress value={levelInfo.progressPercentage} className="h-3" />
                </div>
                
                {nextLevelReward && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Gift className="h-4 w-4" />
                      <span>Next reward: {nextLevelReward.reward}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRewardsModal(true)}
                    >
                      View All Rewards
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Dashboard Grid - Enhanced Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Left Column - 2 spans */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              
              {/* Financial Overview Card - Clean Design */}
              <motion.div variants={itemVariants} whileHover="hover" initial="rest">
                <motion.div variants={cardHoverVariants}>
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 rounded-lg bg-primary text-primary-foreground">
                            <DollarSign className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-semibold">Financial Overview</CardTitle>
                            <CardDescription>Your financial snapshot</CardDescription>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/dashboard/user-settings/profile">
                            Update Profile
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {financialProfileInsights.hasProfile ? (
                        <div className="space-y-8">
                          {/* Key Metrics Grid - Clean Design */}
                          {Object.keys(financialProfileInsights.keyMetrics).length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {financialProfileInsights.keyMetrics.monthlyIncome && (
                                <Card>
                                  <CardContent className="p-6 text-center">
                                    <DollarSign className="h-8 w-8 text-primary mx-auto mb-3" />
                                    <div className="text-2xl font-bold text-foreground mb-1">
                                      ${financialProfileInsights.keyMetrics.monthlyIncome.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground font-medium">Monthly Income</div>
                                  </CardContent>
                                </Card>
                              )}

                              {financialProfileInsights.keyMetrics.monthlySavings && (
                                <Card>
                                  <CardContent className="p-6 text-center">
                                    <PiggyBank className="h-8 w-8 text-secondary mx-auto mb-3" />
                                    <div className="text-2xl font-bold text-foreground mb-1">
                                      ${financialProfileInsights.keyMetrics.monthlySavings.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground font-medium">Monthly Savings</div>
                                  </CardContent>
                                </Card>
                              )}

                              {financialProfileInsights.keyMetrics.emergencyFund && (
                                <Card>
                                  <CardContent className="p-6 text-center">
                                    <Shield className="h-8 w-8 text-accent mx-auto mb-3" />
                                    <div className="text-2xl font-bold text-foreground mb-1">
                                      ${financialProfileInsights.keyMetrics.emergencyFund.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground font-medium">Emergency Fund</div>
                                  </CardContent>
                                </Card>
                              )}

                              {financialProfileInsights.keyMetrics.yearsToRetirement && (
                                <Card>
                                  <CardContent className="p-6 text-center">
                                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                                    <div className="text-2xl font-bold text-foreground mb-1">
                                      {financialProfileInsights.keyMetrics.yearsToRetirement}
                                    </div>
                                    <div className="text-sm text-muted-foreground font-medium">Years to Retire</div>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          )}

                          {/* Profile Completion - Clean */}
                          <Card>
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold">Profile Completion</h4>
                                <Badge variant="secondary">
                                  {financialProfileInsights.completionPercentage}%
                                </Badge>
                              </div>
                              <Progress value={financialProfileInsights.completionPercentage} className="h-2" />
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-2xl flex items-center justify-center">
                            <User className="h-10 w-10 text-muted-foreground" />
                          </div>
                          <h4 className="text-2xl font-semibold mb-3">Create Your Financial Profile</h4>
                          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Get personalized recommendations based on your financial goals and current situation
                          </p>
                          <Button size="lg" asChild>
                            <Link to="/dashboard/user-settings/profile">
                              <Plus className="mr-2 h-4 w-4" />
                              Create Profile
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Learning Progress Card - Clean */}
              <motion.div variants={itemVariants} whileHover="hover" initial="rest">
                <motion.div variants={cardHoverVariants}>
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                            <GraduationCap className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-semibold">Learning Progress</CardTitle>
                            <CardDescription>Your educational journey</CardDescription>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/dashboard/learning">
                            View All Courses
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {learningInsights.hasCourses ? (
                        <div className="space-y-8">
                          {/* Stats Grid - Clean */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-primary mb-2">
                                {learningInsights.completedLessons}
                              </div>
                              <div className="text-sm text-muted-foreground font-medium">Completed</div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-secondary mb-2">
                                {learningInsights.earnedXP}
                              </div>
                              <div className="text-sm text-muted-foreground font-medium">XP Earned</div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-accent-foreground mb-2">
                                {Math.round(learningInsights.progress)}%
                              </div>
                              <div className="text-sm text-muted-foreground font-medium">Progress</div>
                            </div>
                          </div>

                          {/* Progress Bar - Clean */}
                          <div className="mb-6">
                            <Progress value={learningInsights.progress} className="h-3" />
                          </div>

                          {/* Next Lesson - Clean */}
                          {learningInsights.nextLesson && (
                            <Card>
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="text-lg font-semibold mb-2">Continue Learning</h4>
                                    <p className="font-medium mb-1">{learningInsights.nextLesson.title}</p>
                                    <p className="text-sm text-muted-foreground">{learningInsights.currentCourse?.title}</p>
                                  </div>
                                  <Button size="sm" asChild>
                                    <Link to={`/dashboard/learning/${learningInsights.currentCourse?.course_id}/lesson/${learningInsights.nextLesson.lesson_id}` as any}>
                                      Continue
                                    </Link>
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Recent Activity */}
                          <Card>
                            <CardContent className="p-6">
                              <h4 className="text-lg font-semibold mb-4">Recent Activity</h4>
                              <Timeline/>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-2xl flex items-center justify-center">
                            <BookOpen className="h-10 w-10 text-muted-foreground" />
                          </div>
                          <h4 className="text-2xl font-semibold mb-3">Start Learning</h4>
                          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Begin your financial education journey with our comprehensive courses
                          </p>
                          <Button size="lg" asChild>
                            <Link to="/dashboard/learning">
                              <GraduationCap className="mr-2 h-4 w-4" />
                              Explore Courses
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
          </div>

            {/* Right Column - 1 span */}
            <div className="space-y-6 sm:space-y-8">
              
              {/* AI Assistant Card - Clean */}
              <motion.div variants={itemVariants} whileHover="hover" initial="rest">
                <motion.div variants={cardHoverVariants}>
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-lg bg-accent text-accent-foreground">
                          <MessageCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">Moneko AI</CardTitle>
                          <CardDescription>Your personal financial advisor</CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {conversationInsights.hasConversations ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-foreground mb-1">
                                  {conversationInsights.totalConversations}
                                </div>
                                <div className="text-xs text-muted-foreground font-medium">Chats</div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-foreground mb-1">
                                  {conversationInsights.totalMessages}
                                </div>
                                <div className="text-xs text-muted-foreground font-medium">Messages</div>
                              </CardContent>
                            </Card>
                          </div>

                          <Button 
                            size="lg" 
                            onClick={() => openChat('advisor')}
                            className="w-full"
                          >
                            Continue Chat
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground font-medium mb-3">Get personalized help with:</p>
                            <div className="space-y-3">
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Target className="h-4 w-4 mr-3 text-accent" />
                                Investment strategies
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <DollarSign className="h-4 w-4 mr-3 text-accent" />
                                Budget planning
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Shield className="h-4 w-4 mr-3 text-accent" />
                                Financial goals
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="lg" 
                            onClick={() => openChat('advisor')}
                            className="w-full"
                          >
                            Start Chat
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Quick Tools Card - Clean */}
              <motion.div variants={itemVariants} whileHover="hover" initial="rest">
                <motion.div variants={cardHoverVariants}>
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                            <Calculator className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold">Quick Tools</CardTitle>
                            <CardDescription>Financial calculators</CardDescription>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/calculators">
                            View All
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3">
                        {availableCalculators.slice(0, 4).map((calculator) => {
                          const IconComponent = calculator.icon;
                          return (
                            <motion.div key={calculator.title} whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
                              <Link to={calculator.path}>
                                <Card className="hover:bg-muted/50 transition-colors">
                                  <CardContent className="flex items-center p-4">
                                    <div className="p-2 rounded-lg bg-primary text-primary-foreground mr-4">
                                      <IconComponent className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm font-semibold mb-1">
                                        {calculator.title}
                                      </div>
                                      <Badge variant="secondary" className="text-xs">{calculator.category}</Badge>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  </CardContent>
                                </Card>
                              </Link>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Essential Lessons Card - Clean */}
              <motion.div variants={itemVariants} whileHover="hover" initial="rest">
                <motion.div variants={cardHoverVariants}>
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <div className="p-3 rounded-lg bg-muted text-muted-foreground">
                          <Lightbulb className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">Essential Lessons</CardTitle>
                          <CardDescription>Foundation knowledge</CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <Card>
                        <CardContent className="p-6">
                          <h4 className="text-lg font-semibold mb-2">Your 2025 Guide to Investing</h4>
                          <p className="text-muted-foreground text-sm mb-6">Master investment fundamentals with 20+ comprehensive lessons</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <BookOpen className="mr-2 h-4 w-4" />
                              20+ lessons available
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to="/dashboard/essentials">
                                Start Learning
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

        {/* Modern Rewards Modal */}
        {showRewardsModal && (
          <Modal
            isOpen={showRewardsModal}
            onClose={() => setShowRewardsModal(false)}
            width="xwide"
            contentClassName="p-0"
          >
            <Card className="w-full max-w-4xl max-h-full shadow-2xl overflow-hidden">
              {/* Header */}
              <CardHeader className="bg-primary text-primary-foreground p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary-foreground/20">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold mb-1">Rewards Roadmap</CardTitle>
                      <CardDescription className="text-primary-foreground/70">
                        {LEVEL_REWARDS.filter(r => levelInfo.level >= r.level).length} / {LEVEL_REWARDS.length} rewards unlocked
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRewardsModal(false)}
                    className="text-primary-foreground hover:bg-primary-foreground/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              
              {/* Scrollable Content */}
              <div className="max-h-96 overflow-y-auto">
                <CardContent className="p-8">
                  <div className="relative">
                    {/* Progress line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>
                    
                    <div className="space-y-6">
                      {LEVEL_REWARDS.map((reward, index) => {
                        const isUnlocked = levelInfo.level >= reward.level;
                        const isNext = !isUnlocked && reward.level === levelInfo.level + 1;
                        const xpRequired = LEVEL_REQUIREMENTS[reward.level - 1] || 0;
                        
                        return (
                          <motion.div
                            key={reward.level}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <Card className={cn(
                              "transition-all duration-300",
                              isUnlocked 
                                ? "bg-primary/5 border-primary/20" 
                                : isNext
                                ? "bg-muted/50 border-border"
                                : "bg-muted opacity-60"
                            )}>
                              <CardContent className="flex items-start gap-6 p-6">
                                {/* Level indicator */}
                                <div className="relative flex-shrink-0">
                                  <div className={cn(
                                    "p-4 rounded-xl shadow-sm",
                                    isUnlocked 
                                      ? "bg-primary text-primary-foreground" 
                                      : isNext
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-muted-foreground text-muted"
                                  )}>
                                    {isUnlocked ? (
                                      <CheckCircle className="h-6 w-6 text-white" />
                                    ) : (
                                      React.createElement(reward.icon, { className: "h-6 w-6 text-white" })
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <h3 className={cn(
                                        "text-2xl font-bold",
                                        isUnlocked ? "text-primary" 
                                        : isNext ? "text-muted-foreground" 
                                        : "text-muted-foreground"
                                      )}>
                                        Level {reward.level}
                                      </h3>
                                      {isNext && (
                                        <Badge variant="secondary">
                                          NEXT
                                        </Badge>
                                      )}
                                      {isUnlocked && (
                                        <Badge variant="secondary">
                                          ✓ UNLOCKED
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm font-medium text-muted-foreground">
                                      {xpRequired.toLocaleString()} XP
                                    </div>
                                  </div>
                                  
                                  <h4 className="text-lg font-semibold mb-2">
                                    {reward.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    {reward.description}
                                  </p>
                                  
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-lg bg-muted">
                                      <Gift className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium">
                                      🎁 {reward.reward}
                                    </span>
                                  </div>
                                  
                                  {isNext && (
                                    <Card>
                                      <CardContent className="p-4">
                                        <div className="text-sm font-medium mb-3">
                                          {levelInfo.xpNeededForNext.toLocaleString()} XP needed to unlock
                                        </div>
                                        <Progress 
                                          value={Math.min((currentXP / xpRequired) * 100, 100)} 
                                          className="h-2"
                                        />
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </div>
              
              {/* Footer */}
              <div className="p-6 bg-muted/30 border-t">
                <div className="text-center text-muted-foreground">
                  Keep learning and growing to unlock amazing rewards! 🚀
                </div>
              </div>
            </Card>
          </Modal>
        )}
    </>
  );
}

export default DashboardHome;