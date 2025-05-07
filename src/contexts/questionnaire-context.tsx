import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { QuestionnaireState } from '@/types/questions';
import { questions } from '@/types/questions';
import { getFromStorage, saveToStorage } from '@/utils/storage';

type QuestionnaireContextType = {
  state: QuestionnaireState;
  nextStep: () => void;
  prevStep: () => void;
  setAnswer: (questionId: string, answer: string | Array<string> | number) => void;
  resetQuestionnaire: () => void;
  isComplete: boolean;
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

  const setAnswer = (questionId: string, answer: string | Array<string> | number) => {
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