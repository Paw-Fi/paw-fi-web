import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getFromStorage, saveToStorage } from '@/utils/storage';
import type { Question } from '@/types/learning.types';
import { questions } from '@/data/questionnaire';

// Define the questionnaire state type
export interface QuestionnaireState {
  currentStep: number;
  answers: Record<string, string | string[] | number | Record<string, string>>;
}

type QuestionnaireContextType = {
  state: QuestionnaireState;
  nextStep: () => void;
  prevStep: () => void;
  setAnswer: (questionId: string, answer: string | string[] | number | Record<string, string>) => void;
  resetQuestionnaire: () => void;
  isComplete: boolean;
  questions: Question[];
};

const STORAGE_KEY = 'questionnaire';

const defaultState: QuestionnaireState = {
  currentStep: 0,
  answers: {},
};

const QuestionnaireContext = createContext<QuestionnaireContextType | undefined>(undefined);

export function QuestionnaireProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuestionnaireState>(() => 
    getFromStorage<QuestionnaireState>(STORAGE_KEY, defaultState)
  );



const isComplete = state.currentStep >= questions.length;

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveToStorage(STORAGE_KEY, state);
  }, [state]);

  const nextStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, questions.length),
    }));
  };

  const prevStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  };

  const setAnswer = (questionId: string, answer: string | string[] | number | Record<string, string>) => {
    setState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answer,
      },
    }));
  };

  const resetQuestionnaire = () => {
    setState(defaultState);
  };

  return (
    <QuestionnaireContext.Provider
      value={{
        state,
        nextStep,
        prevStep,
        setAnswer,
        resetQuestionnaire,
        isComplete,
        questions,
      }}
    >
      {children}
    </QuestionnaireContext.Provider>
  );
}

export function useQuestionnaire() {
  const context = useContext(QuestionnaireContext);
  if (context === undefined) {
    throw new Error('useQuestionnaire must be used within a QuestionnaireProvider');
  }
  return context;
}