import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { goalQueryKeys } from "./use-goals";
import { getQuestionnaireTemplate } from "@/data/questionnaire-templates";
import type { CreateGoalRequest, QuestionnaireData, GoalType } from "@/components/goal-tracker/types";

interface CreateGoalWithAIParams extends CreateGoalRequest {
  userId?: string | null;
}

interface ValidationError {
  questionId: string;
  message: string;
}

// Validate questionnaire data against template rules
async function validateQuestionnaireData(
  goalType: GoalType, 
  answers: QuestionnaireData
): Promise<{ isValid: boolean; errors: ValidationError[] }> {
  try {
    // Get template for validation rules from local data
    const template = getQuestionnaireTemplate(goalType);

    if (!template) {
      console.warn('Could not find template for validation, proceeding without validation');
      return { isValid: true, errors: [] };
    }

    const questions = template.questions;

    const errors: ValidationError[] = [];

    questions.forEach((question: any) => {
      const answer = answers[question.id];
      
      // Required validation
      if (question.validation?.required && (!answer || answer === '')) {
        errors.push({
          questionId: question.id,
          message: `${question.question} is required`
        });
        return;
      }

      // Skip further validation if no answer provided and not required
      if (!answer && !question.validation?.required) {
        return;
      }

      // Type-specific validation
      switch (question.type) {
        case 'number':
        case 'currency':
        case 'percentage':
          const num = Number(answer);
          if (isNaN(num)) {
            errors.push({
              questionId: question.id,
              message: `${question.question} must be a valid number`
            });
          } else {
            if (question.validation?.min !== undefined && num < question.validation.min) {
              errors.push({
                questionId: question.id,
                message: `${question.question} must be at least ${question.validation.min}`
              });
            }
            if (question.validation?.max !== undefined && num > question.validation.max) {
              errors.push({
                questionId: question.id,
                message: `${question.question} must not exceed ${question.validation.max}`
              });
            }
          }
          break;

        case 'date':
          if (!Date.parse(answer)) {
            errors.push({
              questionId: question.id,
              message: `${question.question} must be a valid date`
            });
          }
          break;

        case 'single_choice':
          if (question.options && !question.options.some((opt: any) => opt.value === answer)) {
            errors.push({
              questionId: question.id,
              message: `${question.question} must be one of the provided options`
            });
          }
          break;

        case 'multiple_choice':
          if (Array.isArray(answer) && question.options) {
            const validValues = question.options.map((opt: any) => opt.value);
            const invalidAnswers = answer.filter(a => !validValues.includes(a));
            if (invalidAnswers.length > 0) {
              errors.push({
                questionId: question.id,
                message: `${question.question} contains invalid options: ${invalidAnswers.join(', ')}`
              });
            }
          }
          break;

        case 'text':
        case 'text_area':
          if (question.validation?.pattern) {
            const regex = new RegExp(question.validation.pattern);
            if (!regex.test(answer)) {
              errors.push({
                questionId: question.id,
                message: question.validation.error_message || 
                        `${question.question} format is invalid`
              });
            }
          }
          break;
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('Error validating questionnaire data:', error);
    // If validation fails, allow proceeding but log the error
    return { isValid: true, errors: [] };
  }
}

// Create goal with AI processing
async function createGoalWithAI(params: CreateGoalWithAIParams): Promise<any> {
  const { goalType, questionnaireAnswers, userId } = params;

  // Validate questionnaire data
  const validation = await validateQuestionnaireData(goalType, questionnaireAnswers);
  if (!validation.isValid) {
    const errorMessage = validation.errors.map(e => e.message).join(', ');
    throw new Error(`Validation failed: ${errorMessage}`);
  }

  // Call the AI goal generator function
  const requestBody = {
    userId,
    goalType,
    questionnaireAnswers,
  };

  const { data, error } = await supabase.functions.invoke('ai-goal-generator', {
    body: requestBody,
  });

  if (error) {
    console.error('Error calling AI goal generator:', error);
    throw new Error(error.message || 'Failed to generate goal with AI');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'AI goal generation failed');
  }

  return data;
}

// Hook for creating goals with AI
export function useCreateGoalWithAI() {
  const queryClient = useQueryClient();
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');

  const mutation = useMutation({
    mutationFn: async (params: CreateGoalWithAIParams) => {
      // Get user ID if not provided (can be null for guest users)
      let userId = params.userId;
      if (userId === undefined) {
        userId = (await supabase.auth.getUser()).data.user?.id || null;
      }

      setGenerationProgress(10);
      setCurrentStep('Validating questionnaire data...');

      // Validate questionnaire data
      const validation = await validateQuestionnaireData(params.goalType, params.questionnaireAnswers);
      if (!validation.isValid) {
        const errorMessage = validation.errors.map(e => e.message).join(', ');
        throw new Error(`Validation failed: ${errorMessage}`);
      }

      setGenerationProgress(25);
      setCurrentStep('Sending data to AI...');
      
      // Create goal with AI
      const result = await createGoalWithAI({ ...params, userId });
      
      setGenerationProgress(75);
      setCurrentStep('Processing AI response...');

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGenerationProgress(100);
      setCurrentStep('Goal created successfully!');

      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch goals data
      const userId = variables.userId || data.goal?.user_id;
      if (userId) {
        queryClient.invalidateQueries({ queryKey: goalQueryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: goalQueryKeys.metrics(userId) });
      }
      
      // Reset progress after a short delay
      setTimeout(() => {
        setGenerationProgress(0);
        setCurrentStep('');
      }, 1000);
    },
    onError: (error) => {
      console.error('Create goal with AI error:', error);
      setGenerationProgress(0);
      setCurrentStep('');
    },
  });

  return {
    createGoalWithAI: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    generationProgress,
    currentStep,
    reset: mutation.reset,
  };
}

// Hook for basic goal creation (without AI)
export function useCreateGoal() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (goalData: any) => {
      const { data, error } = await supabase
        .from('financial_goals')
        .insert(goalData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create goal: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch goals data
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.metrics(data.user_id) });
    },
  });

  return {
    createGoal: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}