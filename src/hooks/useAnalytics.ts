import { useCallback } from 'react';
import { trackEvent, getAnalyticsInstance } from '@/lib/analytics';

/**
 * Custom hook for Google Analytics tracking
 * Provides convenient methods to track events throughout the application
 */
export const useAnalytics = () => {
  const isAnalyticsAvailable = useCallback(() => {
    return typeof window !== 'undefined' && getAnalyticsInstance() !== null;
  }, []);

  const trackCustomEvent = useCallback((eventName: string, parameters?: Record<string, any>) => {
    if (isAnalyticsAvailable()) {
      trackEvent(eventName, parameters);
    }
  }, [isAnalyticsAvailable]);

  // Pre-defined event tracking methods for common actions
  const trackCalculatorUse = useCallback((calculatorType: string, result?: any) => {
    trackCustomEvent('calculator_use', {
      calculator_type: calculatorType,
      has_result: !!result,
    });
  }, [trackCustomEvent]);

  const trackLessonComplete = useCallback((courseId: string, lessonId: string) => {
    trackCustomEvent('lesson_complete', {
      course_id: courseId,
      lesson_id: lessonId,
    });
  }, [trackCustomEvent]);

  const trackDashboardAction = useCallback((action: string, widget?: string) => {
    trackCustomEvent('dashboard_action', {
      action,
      widget,
    });
  }, [trackCustomEvent]);

  const trackUserEngagement = useCallback((engagementType: string, duration?: number) => {
    trackCustomEvent('user_engagement', {
      engagement_type: engagementType,
      duration_seconds: duration,
    });
  }, [trackCustomEvent]);

  const trackSubscriptionEvent = useCallback((event: string, plan?: string) => {
    trackCustomEvent('subscription_event', {
      event,
      plan,
    });
  }, [trackCustomEvent]);

  return {
    isAnalyticsAvailable,
    trackEvent: trackCustomEvent,
    trackCalculatorUse,
    trackLessonComplete,
    trackDashboardAction,
    trackUserEngagement,
    trackSubscriptionEvent,
  };
};