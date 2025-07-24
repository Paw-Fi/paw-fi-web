import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@tanstack/react-router';
import { useUserCourses } from '@/services/course-service';
import { useCookie } from '@/utils/use-cookie';

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
  
  // Stabilize courses dependency by using only the length
  const coursesLength = useMemo(() => courses?.length ?? 0, [courses]);
  
  // Stabilize location dependency
  const pathname = useMemo(() => location.pathname, [location.pathname]);
  
  // Stabilize user dependency
  const userId = useMemo(() => user?.id, [user?.id]);
  
  const [steps, setSteps] = useState<LocalProgressStep[]>([]);
  const [stats, setStats] = useState<LocalProgressStats>({
    totalSteps: 0,
    completedSteps: 0,
    progressPercentage: 0,
    nextStep: null,
    isCompleted: false,
  });
  
  // Track if we've marked chat as visited to prevent infinite loops
  const [hasMarkedChatVisited, setHasMarkedChatVisited] = useState(false);

  // Check if user has portfolio (dashboard data)
  const hasPortfolio = () => {
    // Check if user has any dashboard views/data
    // This is a simplified check - you might want to check actual dashboard data
    return !!userId && pathname.startsWith('/dashboard');
  };

  // Check if user has chat history
  const hasChatHistory = () => {
    // Check if user has any conversation history
    // This would need to be implemented based on your chat storage
    if (!userId) return false;
    
    // For now, we'll check if they've visited the chat page
    // In a real implementation, you'd check the actual conversation history length
    const chatVisited = getCookie('paw-fi-chat-visited');
    return chatVisited === 'true';
  };

  // Check if user has AI-generated lessons
  const hasAILessons = () => {
    // Check if user has any AI-generated lessons (courses length > 0)
    return coursesLength > 0;
  };

  // Check if user has visited essentials page
  const hasVisitedEssentials = () => {
    const essentialsVisited = getCookie('paw-fi-essentials-visited');
    return essentialsVisited === 'true';
  };

  // Check if user has visited calculators page
  const hasVisitedCalculators = () => {
    const calculatorsVisited = getCookie('paw-fi-calculators-visited');
    return calculatorsVisited === 'true';
  };

  // Mark essentials as visited when user clicks on it
  const markEssentialsVisited = useCallback(() => {
    setCookie('paw-fi-essentials-visited', 'true', { days: 365 });
  }, [setCookie]);

  // Mark calculators as visited when user clicks on it
  const markCalculatorsVisited = useCallback(() => {
    setCookie('paw-fi-calculators-visited', 'true', { days: 365 });
  }, [setCookie]);

  // Mark chat as visited when user visits chat page
  const markChatVisited = useCallback(() => {
    setCookie('paw-fi-chat-visited', 'true', { days: 365 });
  }, [setCookie]);

  // Update progress steps and stats
  useEffect(() => {
    const isLoggedIn = !!userId;
    const portfolioCompleted = hasPortfolio();
    const chatCompleted = hasChatHistory();
    const aiLessonsCompleted = hasAILessons();
    const essentialsCompleted = hasVisitedEssentials();
    const calculatorsCompleted = hasVisitedCalculators();

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
        id: 'portfolio',
        title: 'Complete Portfolio',
        description: 'Answer the questionnaire to create your personalized financial portfolio',
        path: '/dashboard',
        isCompleted: portfolioCompleted,
        isNextStep: isLoggedIn && !portfolioCompleted,
      },
      {
        id: 'chat',
        title: 'Chat with AI',
        description: 'Generate personalized learning lessons through AI conversation',
        path: '/dashboard/chat',
        isCompleted: chatCompleted,
        isNextStep: portfolioCompleted && !chatCompleted,
      },
      {
        id: 'learning',
        title: 'Test AI Lessons',
        description: 'Take the AI-generated lessons and test your financial knowledge',
        path: '/dashboard/learning',
        isCompleted: aiLessonsCompleted,
        isNextStep: chatCompleted && !aiLessonsCompleted,
      },
      {
        id: 'essentials',
        title: 'Financial Essentials',
        description: 'Learn from our curated financial education lessons',
        path: '/dashboard/essentials',
        isCompleted: essentialsCompleted,
        isNextStep: aiLessonsCompleted && !essentialsCompleted,
      },
      {
        id: 'calculators',
        title: 'Financial Calculators',
        description: 'Use our comprehensive suite of financial calculators',
        path: '/calculators',
        isCompleted: calculatorsCompleted,
        isNextStep: essentialsCompleted && !calculatorsCompleted,
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
  }, [userId, pathname, coursesLength]);

  // Auto-mark steps as completed based on current location
  useEffect(() => {
    if (!userId) return;

    // Mark chat as visited when on chat page (only once)
    if (pathname.startsWith('/dashboard/chat') && !hasMarkedChatVisited) {
      setCookie('paw-fi-chat-visited', 'true', { days: 365 });
      setHasMarkedChatVisited(true);
    }
  }, [pathname, userId, hasMarkedChatVisited]);

  return {
    steps,
    stats,
    markEssentialsVisited,
    markCalculatorsVisited,
    markChatVisited,
  };
};