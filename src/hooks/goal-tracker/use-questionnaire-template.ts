import { useQuery } from "@tanstack/react-query";
import { goalsQuestionTemplate, Question } from '@/types/financial-quiz-constants';
import { getQuestionnaireTemplate } from "@/data/questionnaire-templates";

export type GoalType = 'retirement' | 'home_buying' | 'wealth' | 'investment' | 'debt_payoff' | 'emergency_fund' | 'custom' | 'passive_income';

// Query key factory for questionnaire templates
export const questionnaireQueryKeys = {
  all: ['questionnaire-templates'] as const,
  template: (goalType: string) => [...questionnaireQueryKeys.all, goalType] as const,
};

// Fetch questionnaire template for a goal type (now from local data)
async function fetchQuestionnaireTemplate(goalType: GoalType) {
  if (!goalType) {
    throw new Error('Goal type is required');
  }
  const template = getQuestionnaireTemplate(goalType);
  if (!template) {
    throw new Error('No active questionnaire template found');
  }
  return template;
}

// Hook for fetching questionnaire template
export function useQuestionnaireTemplate(goalType?: GoalType) {
  const query = useQuery({
    queryKey: questionnaireQueryKeys.template(goalType || ''),
    queryFn: () => fetchQuestionnaireTemplate(goalType!),
    enabled: !!goalType,
    staleTime: 10 * 60 * 1000, // 10 minutes - templates don't change often
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry if template not found
      if (error.message.includes('No active questionnaire template found')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return {
    template: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isStale: query.isStale,
    isFetching: query.isFetching,
  };
}

// Hook for prefetching all questionnaire templates
export function usePrefetchQuestionnaireTemplates() {
  const goalTypes: GoalType[] = ['retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'emergency_fund', 'custom', 'passive_income'];
  
  return goalTypes.map(goalType => 
    useQuestionnaireTemplate(goalType)
  );
}