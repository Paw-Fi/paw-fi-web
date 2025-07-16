import { useState, useEffect } from 'react';
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
  
  const [steps, setSteps] = useState<LocalProgressStep[]>([]);
  const [stats, setStats] = useState<LocalProgressStats>({
    totalSteps: 0,
    completedSteps: 0,
    progressPercentage: 0,
    nextStep: null,
    isCompleted: false,
  });

  // Check if user has portfolio (dashboard data)
  const hasPortfolio = () => {
    // Check if user has any dashboard views/data
    // This is a simplified check - you might want to check actual dashboard data
    return !!user && location.pathname.startsWith('/dashboard');
  };

  // Check if user has chat history
  const hasChatHistory = () => {
    // Check if user has any conversation history
    // This would need to be implemented based on your chat storage
    if (!user) return false;
    
    // For now, we'll check if they've visited the chat page
    // In a real implementation, you'd check the actual conversation history length
    const chatVisited = getCookie('paw-fi-chat-visited');
    return chatVisited === 'true';
  };

  // Check if user has AI-generated lessons
  const hasAILessons = () => {
    // Check if user has any AI-generated lessons (courses length > 0)
    return courses && courses.length > 0;
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
  const markEssentialsVisited = () => {
    setCookie('paw-fi-essentials-visited', 'true', { days: 365 });
  };

  // Mark calculators as visited when user clicks on it
  const markCalculatorsVisited = () => {
    setCookie('paw-fi-calculators-visited', 'true', { days: 365 });
  };

  // Mark chat as visited when user visits chat page
  const markChatVisited = () => {
    setCookie('paw-fi-chat-visited', 'true', { days: 365 });
  };

  // Update progress steps and stats
  useEffect(() => {
    const isLoggedIn = !!user;
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
        path: '/dashboard/calculators',
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
  }, [user, location.pathname, courses, getCookie]);

  // Auto-mark steps as completed based on current location
  useEffect(() => {
    if (!user) return;

    const currentPath = location.pathname;

    // Mark chat as visited when on chat page
    if (currentPath.startsWith('/dashboard/chat')) {
      markChatVisited();
    }
  }, [location.pathname, user]);

  return {
    steps,
    stats,
    markEssentialsVisited,
    markCalculatorsVisited,
    markChatVisited,
  };
};