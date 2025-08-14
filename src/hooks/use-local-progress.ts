import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@tanstack/react-router';
import { useUserCourses } from '@/services/course-service';
import { useCookie } from '@/utils/use-cookie';
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import { useQuery } from '@tanstack/react-query';
import { fetchConversations } from '@/services/conversation-service';
import { supabase } from '@/lib/supabase';
import { AI_ROLES } from '@/components/chat/ai-roles';

export interface LocalProgressStep {
  id: string;
  title: string;
  description: string;
  path: string;
  isCompleted: boolean;
  isNextStep: boolean;
}

export interface LocalProgressStats {
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  nextStep: LocalProgressStep | null;
  isCompleted: boolean;
}

export const useLocalProgress = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { getCookie, setCookie } = useCookie();
  const { data: courses = [] } = useUserCourses(user?.id ?? "", { enabled: !!user });
  
  // Get real financial health profile
  const { profile: financialProfile, hasProfile } = useFinancialHealthProfile(user?.id);
  
  // Get real conversation data
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const result = await fetchConversations(supabase, AI_ROLES.FINANCIAL_ADVISOR);
        return result ? [result] : [];
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  
  // Stabilize dependencies
  const coursesLength = useMemo(() => courses?.length ?? 0, [courses]);
  const pathname = useMemo(() => location.pathname, [location.pathname]);
  const userId = useMemo(() => user?.id, [user?.id]);
  const hasConversations = useMemo(() => conversations.length > 0, [conversations]);
  
  const [steps, setSteps] = useState<LocalProgressStep[]>([]);
  const [stats, setStats] = useState<LocalProgressStats>({
    totalSteps: 0,
    completedSteps: 0,
    progressPercentage: 0,
    nextStep: null,
    isCompleted: false,
  });

  // Check if user has completed their financial profile
  const hasCompletedProfile = () => {
    return hasProfile && !!financialProfile;
  };

  // Check if user has real chat history with conversations
  const hasChatHistory = () => {
    if (!userId || conversationsLoading) return false;
    return hasConversations;
  };

  // Check if user has AI-generated lessons (courses)
  const hasAILessons = () => {
    return coursesLength > 0;
  };

  // Check if user has visited essentials page
  const hasVisitedEssentials = () => {
    const essentialsVisited = getCookie('moneko-essentials-visited');
    return essentialsVisited === 'true';
  };

  // Check if user has visited portfolio page
  const hasVisitedPortfolio = () => {
    const portfolioVisited = getCookie('moneko-portfolio-visited');
    return portfolioVisited === 'true';
  };

  // Check if user has visited goal tracker
  const hasVisitedGoalTracker = () => {
    const trackerVisited = getCookie('moneko-tracker-visited');
    return trackerVisited === 'true';
  };

  // Mark essentials as visited when user clicks on it
  const markEssentialsVisited = useCallback(() => {
    setCookie('moneko-essentials-visited', 'true', { days: 365 });
  }, [setCookie]);

  // Mark portfolio as visited when user clicks on it
  const markPortfolioVisited = useCallback(() => {
    setCookie('moneko-portfolio-visited', 'true', { days: 365 });
  }, [setCookie]);

  // Mark tracker as visited when user clicks on it
  const markTrackerVisited = useCallback(() => {
    setCookie('moneko-tracker-visited', 'true', { days: 365 });
  }, [setCookie]);


  // Update progress steps and stats
  useEffect(() => {
    const isLoggedIn = !!userId;
    const profileCompleted = hasCompletedProfile();
    const portfolioVisitedCompleted = hasVisitedPortfolio();
    const chatCompleted = hasChatHistory();
    const aiLessonsCompleted = hasAILessons();
    const essentialsCompleted = hasVisitedEssentials();
    const trackerCompleted = hasVisitedGoalTracker();

    const progressSteps: LocalProgressStep[] = [
      {
        id: 'account',
        title: 'Create Account',
        description: 'Sign up for a free account to access all features',
        path: '/register',
        isCompleted: isLoggedIn,
        isNextStep: !isLoggedIn,
      },
      {
        id: 'profile',
        title: 'Complete Profile',
        description: 'Set up your financial profile for personalized AI recommendations',
        path: '/dashboard/user-settings/profile',
        isCompleted: profileCompleted,
        isNextStep: isLoggedIn && !profileCompleted,
      },
      {
        id: 'portfolio',
        title: 'Explore Portfolio',
        description: 'View your personalized dashboard and financial overview',
        path: '/dashboard/portfolio',
        isCompleted: portfolioVisitedCompleted,
        isNextStep: profileCompleted && !portfolioVisitedCompleted,
      },
      {
        id: 'chat',
        title: 'Chat with AI',
        description: 'Generate personalized learning lessons through AI conversation',
        path: '/dashboard',
        isCompleted: chatCompleted,
        isNextStep: portfolioVisitedCompleted && !chatCompleted,
      },
      {
        id: 'learnin',
        title: 'Take AI Lessons',
        description: 'Learn from AI-generated lessons tailored to your goals',
        path: '/dashboard/learning',
        isCompleted: aiLessonsCompleted,
        isNextStep: chatCompleted && !aiLessonsCompleted,
      },
      {
        id: 'essentials',
        title: 'Financial Essentials',
        description: 'Master fundamental financial concepts through our curated courses',
        path: '/dashboard/essentials',
        isCompleted: essentialsCompleted,
        isNextStep: aiLessonsCompleted && !essentialsCompleted,
      },
      {
        id: 'tracker',
        title: 'Goal Tracker',
        description: 'Set and track your financial goals with AI assistance',
        path: '/dashboard/tracker',
        isCompleted: trackerCompleted,
        isNextStep: essentialsCompleted && !trackerCompleted,
      },
    ];

    // Update isNextStep to only show the first incomplete step
    const firstIncompleteIndex = progressSteps.findIndex(step => !step.isCompleted);
    progressSteps.forEach((step, index) => {
      step.isNextStep = index === firstIncompleteIndex;
    });

    setSteps(progressSteps);

    // Calculate stats
    const completed = progressSteps.filter(step => step.isCompleted).length;
    const total = progressSteps.length;
    const percentage = (completed / total) * 100;
    const nextStep = progressSteps.find(step => step.isNextStep) || null;

    setStats({
      totalSteps: total,
      completedSteps: completed,
      progressPercentage: percentage,
      nextStep,
      isCompleted: completed === total,
    });
  }, [userId, pathname, coursesLength, hasProfile, financialProfile, hasConversations, conversationsLoading]);

  // Auto-mark visited pages based on current location
  useEffect(() => {
    if (!userId) return;

    // Mark specific pages as visited when user navigates to them
    if (pathname === '/dashboard/essentials') {
      setCookie('moneko-essentials-visited', 'true', { days: 365 });
    } else if (pathname === '/dashboard/portfolio') {
      setCookie('moneko-portfolio-visited', 'true', { days: 365 });
    } else if (pathname.startsWith('/dashboard/tracker')) {
      setCookie('moneko-tracker-visited', 'true', { days: 365 });
    }
  }, [pathname, userId, setCookie]);

  return {
    steps,
    stats,
    markEssentialsVisited,
    markPortfolioVisited,
    markTrackerVisited,
  };
};