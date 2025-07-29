import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { QuestionnaireTemplate, GoalType } from "@/components/goal-tracker/types";

// Query key factory for questionnaire templates
export const questionnaireQueryKeys = {
  all: ['questionnaire-templates'] as const,
  template: (goalType: string) => [...questionnaireQueryKeys.all, goalType] as const,
};

// Fetch questionnaire template for a goal type
async function fetchQuestionnaireTemplate(goalType: GoalType): Promise<QuestionnaireTemplate> {
  if (!goalType) {
    throw new Error('Goal type is required');
  }

  const { data, error } = await supabase
    .from('goal_questionnaire_templates')
    .select('*')
    .eq('goal_type', goalType)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching questionnaire template:', error);
    throw new Error(`Failed to fetch questionnaire template: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No active questionnaire template found for goal type: ${goalType}`);
  }

  // Parse the questions JSON if it's a string
  let questions;
  try {
    questions = typeof data.questions === 'string' 
      ? JSON.parse(data.questions) 
      : data.questions;
  } catch (parseError) {
    console.error('Error parsing questionnaire questions:', parseError);
    throw new Error('Invalid questionnaire template format');
  }

  // Parse AI model config if it's a string
  let aiModelConfig;
  try {
    aiModelConfig = typeof data.ai_model_config === 'string'
      ? JSON.parse(data.ai_model_config)
      : data.ai_model_config;
  } catch (parseError) {
    console.error('Error parsing AI model config:', parseError);
    // Use default config if parsing fails
    aiModelConfig = {
      model: "gemini-2.5-flash",
      temperature: 0.7,
      max_tokens: 3000,
    };
  }

  return {
    ...data,
    questions,
    ai_model_config: aiModelConfig,
  };
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
  const goalTypes: GoalType[] = ['retirement', 'home_buying', 'wealth', 'investment', 'custom'];
  
  return goalTypes.map(goalType => 
    useQuestionnaireTemplate(goalType)
  );
}