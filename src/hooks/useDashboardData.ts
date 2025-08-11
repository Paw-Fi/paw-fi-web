/**
 * Unified Dashboard Data Hook
 * Consolidates all dashboard-related data fetching with consistent patterns
 * Eliminates code duplication across dashboard components
 */

import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/hooks/use-dashboard';
import { useUserCourses } from '@/services/course-service';
import { useGamification } from '@/hooks/use-gamification';
import { useUserActivities } from '@/hooks/useUserActivities';
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import { useLocalProgress } from '@/hooks/use-local-progress';

export interface DashboardDataState {
  // User and auth
  user: any;
  isAuthenticated: boolean;
  
  // Dashboard data
  dashboardData: any;
  dashboardViews: any[];
  dashboardStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  dashboardError: string | null;
  
  // Courses
  remoteCourses: any[];
  coursesLoading: boolean;
  coursesError: any;
  
  // Gamification
  gamificationData: any;
  gamificationLoading: boolean;
  
  // Activities
  activities: any[];
  activitiesLoading: boolean;
  activitiesError: any;
  
  // Profile
  profileData: any;
  profileLoading: boolean;
  profileError: any;
  
  // Local progress
  progressSteps: any[];
  progressStats: any;
  
  // Combined loading states
  isLoading: boolean;
  hasError: boolean;
  errors: string[];
}

/**
 * Unified hook for all dashboard-related data fetching
 * Provides consistent error handling, loading states, and data access patterns
 */
export function useDashboardData(): DashboardDataState {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
  // Dashboard data with consistent user ID handling
  const { 
    dashboardData, 
    views: dashboardViews, 
    status: dashboardStatus, 
    error: dashboardError 
  } = useDashboard(user?.id);
  
  // Courses data with consistent pattern
  const { 
    data: remoteCourses = [], 
    isLoading: coursesLoading, 
    error: coursesError 
  } = useUserCourses(user?.id || "", { enabled: isAuthenticated });
  
  // Gamification data - already handles auth internally but expose loading state
  const { 
    gamificationData, 
    isLoading: gamificationLoading 
  } = useGamification();
  
  // Activities data - already handles auth internally
  const { 
    activities, 
    isLoading: activitiesLoading, 
    error: activitiesError 
  } = useUserActivities();
  
  // Financial profile data with consistent pattern
  const { 
    profile: profileData, 
    isLoading: profileLoading, 
    error: profileError 
  } = useFinancialHealthProfile(user?.id);
  
  // Local progress tracking
  const { 
    steps: progressSteps, 
    stats: progressStats 
  } = useLocalProgress();
  
  // Combine all loading states
  const isLoading = dashboardStatus === 'loading' || 
                   coursesLoading || 
                   gamificationLoading || 
                   activitiesLoading || 
                   profileLoading;
  
  // Combine all errors
  const errors: string[] = [];
  if (dashboardError) errors.push(`Dashboard: ${dashboardError}`);
  if (coursesError) errors.push(`Courses: ${coursesError.message || coursesError}`);
  if (activitiesError) errors.push(`Activities: ${activitiesError.message || activitiesError}`);
  if (profileError) errors.push(`Profile: ${profileError.message || profileError}`);
  
  const hasError = errors.length > 0;
  
  return {
    // User and auth
    user,
    isAuthenticated,
    
    // Dashboard data
    dashboardData,
    dashboardViews,
    dashboardStatus,
    dashboardError,
    
    // Courses
    remoteCourses,
    coursesLoading,
    coursesError,
    
    // Gamification
    gamificationData,
    gamificationLoading,
    
    // Activities
    activities,
    activitiesLoading,
    activitiesError,
    
    // Profile
    profileData,
    profileLoading,
    profileError,
    
    // Local progress
    progressSteps,
    progressStats,
    
    // Combined states
    isLoading,
    hasError,
    errors
  };
}

/**
 * Hook specifically for components that only need activity data
 * Provides consistent interface for activity-related components
 */
export function useDashboardActivities() {
  const { activities, activitiesLoading, activitiesError } = useDashboardData();
  
  return {
    activities,
    isLoading: activitiesLoading,
    error: activitiesError
  };
}

/**
 * Hook specifically for components that only need gamification data
 * Provides consistent interface for gamification-related components
 */
export function useDashboardGamification() {
  const { gamificationData, gamificationLoading } = useDashboardData();
  
  return {
    gamificationData,
    isLoading: gamificationLoading
  };
}