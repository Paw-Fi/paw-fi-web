import { useAuth } from './useAuth';
import { useSubscription as useExistingSubscription } from './use-subscription';

export interface SubscriptionAccess {
  maxGoals: number;
  fullPortfolioDetails: boolean;
  aiConversationMode: boolean;
  scenarioAnalysis: boolean;
  taxOptimization: boolean;
  multiGoalOrchestration: boolean;
  predictiveLifePlanning: boolean;
  weeklyCoaching: boolean;
  rebalancingAlerts: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
}

export function usePortfolioSubscription() {
  const { user } = useAuth();
  const existingSubscription = useExistingSubscription(user?.id);
  console.log("existingSubscription", existingSubscription);

  // Map the existing subscription plan to our tier system
  const getTierFromPlan = (isActive: boolean): 'free' | 'premium' | 'plus' => {
    if (!isActive) return 'free';
    
    return 'plus'
  };

  const tier = getTierFromPlan(existingSubscription.isActive);

  const access: SubscriptionAccess = {
    maxGoals: tier === 'free' ? 1 : tier === 'premium' ? 3 : Infinity,
    fullPortfolioDetails: tier !== 'free',
    aiConversationMode: tier === 'plus',
    scenarioAnalysis: tier !== 'free',
    taxOptimization: tier !== 'free',
    multiGoalOrchestration: tier === 'plus',
    predictiveLifePlanning: tier === 'plus',
    weeklyCoaching: tier !== 'free',
    rebalancingAlerts: tier !== 'free',
    prioritySupport: tier === 'plus',
    apiAccess: tier === 'plus',
  };

  const canAccessFeature = (feature: keyof SubscriptionAccess): boolean => {
    return access[feature] as boolean;
  };

  const hasActiveSubscription = existingSubscription.isActive;

  return {
    subscription: existingSubscription.subscription,
    tier,
    access,
    canAccessFeature,
    hasActiveSubscription,
    isLoading: existingSubscription.isLoading,
    error: existingSubscription.error,
  };
}

// Re-export the original useSubscription for backward compatibility
export { useSubscription } from './use-subscription';

// Utility hook for upgrade prompts
export function useUpgradeModal() {
  const openUpgrade = (feature?: string) => {
    // This would open your upgrade modal/redirect to pricing page
    console.log('Opening upgrade modal for feature:', feature);
    // You can integrate with your existing modal system or redirect to pricing
    window.location.href = '/pricing';
  };

  return {
    open: openUpgrade,
  };
}