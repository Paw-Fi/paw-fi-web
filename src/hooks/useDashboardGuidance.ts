import { RefObject, useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';
import { dashboardGuidanceMonitor } from '@/utils/dashboard-guidance-monitor';
import { AI_ID } from '@/contexts/ai-chat-context';
import type { RightSidebarRef } from '@/components/dashboard/RightSidebar';

interface UseDashboardGuidanceOptions {
  enabled?: boolean;
  frequencyLevel?: 'high' | 'medium' | 'low';
  sidebarRef?: RefObject<RightSidebarRef | null>;
}

export const useDashboardGuidance = (options: UseDashboardGuidanceOptions = {}) => {
  const location = useLocation();
  const { 
    enabled = true, 
    frequencyLevel = 'medium', 
    sidebarRef 
  } = options;
  
  const previousLocationRef = useRef<string>('');
  
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Initialize the monitor with tooltip callbacks
    const showTooltip = (agentId: AI_ID, message: string, place?: 'left' | 'right' | 'top' | 'bottom') => {
      if (sidebarRef?.current) {
        // Small delay to ensure component is ready
        setTimeout(() => {
          sidebarRef.current?.showTooltip(agentId, message, place);
        }, 500);
      }
    };

    const hideTooltip = (agentId: AI_ID) => {
      if (sidebarRef?.current) {
        sidebarRef.current?.hideTooltip(agentId);
      }
    };

    dashboardGuidanceMonitor.initialize({
      onShowTooltip: showTooltip,
      onHideTooltip: hideTooltip
    });

    // Update preferences
    dashboardGuidanceMonitor.updatePreferences({
      guidanceEnabled: enabled,
      frequencyLevel
    });

    return () => {
      // Cleanup if component unmounts
      dashboardGuidanceMonitor.destroy();
    };
  }, [enabled, frequencyLevel, sidebarRef]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    
    const currentPath = location.pathname;
    
    // Avoid duplicate tracking for the same route
    if (currentPath === previousLocationRef.current) return;
    previousLocationRef.current = currentPath;

    // Extract route parameters (like goalId from /dashboard/tracker/123)
    const params: Record<string, string> = {};
    
    // Extract goalId if present
    const goalIdMatch = currentPath.match(/\/dashboard\/tracker\/([^\/]+)/);
    if (goalIdMatch) {
      params.goalId = goalIdMatch[1];
    }
    
    // Extract courseId if present  
    const courseIdMatch = currentPath.match(/\/dashboard\/(?:learning|essentials)\/([^\/]+)/);
    if (courseIdMatch) {
      params.courseId = courseIdMatch[1];
    }
    
    // Extract lessonId if present
    const lessonIdMatch = currentPath.match(/\/lesson\/([^\/]+)/);
    if (lessonIdMatch) {
      params.lessonId = lessonIdMatch[1];
    }

    // Track the route change
    dashboardGuidanceMonitor.trackRouteChange(currentPath, params);
  }, [location.pathname, enabled]);

  // Return utility functions for manual control
  return {
    trackUserAction: (action: string, data?: any) => {
      if (enabled && typeof window !== 'undefined') {
        dashboardGuidanceMonitor.trackUserAction(action, data);
      }
    },
    
    updatePreferences: (preferences: { guidanceEnabled?: boolean; frequencyLevel?: 'high' | 'medium' | 'low' }) => {
      if (typeof window !== 'undefined') {
        dashboardGuidanceMonitor.updatePreferences(preferences);
      }
    },
    
    hideAllTooltips: () => {
      if (typeof window !== 'undefined') {
        sidebarRef?.current?.hideAllTooltips();
      }
    },
    
    resetGuidanceState: () => {
      if (typeof window !== 'undefined') {
        dashboardGuidanceMonitor.resetGuidanceState();
      }
    },
    
    getGuidanceStats: () => {
      if (typeof window !== 'undefined') {
        return dashboardGuidanceMonitor.getGuidanceStats();
      }
      return null;
    }
  };
};