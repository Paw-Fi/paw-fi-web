import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getFromStorage, saveToStorage } from '@/utils/storage';
import type { Question } from '@/types/learning.types';

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

// Define all questionnaire questions
const questions: Question[] = [
  {
    id: 'investingExperience',
    type: 'scq',
    question: "What's your experience with investing?",
    explanation: "This helps me tailor content to your needs.",
    options: [
      {
        id: 'beginner',
        content: "Just Starting",
        description: "I'm new to investing and saving.",
        isCorrect: false
      },
      {
        id: 'intermediate',
        content: "Some Experience",
        description: "I know the basics but want to learn more.",
        isCorrect: false
      },
      {
        id: 'advanced',
        content: "Experienced",
        description: "I'm comfortable with investing concepts.",
        isCorrect: false
      }
    ]
  },
  {
    id: 'financialGoals',
    type: 'mcq',
    question: "What are your financial goals?",
    explanation: "Select all that apply to your situation.",
    itemsPerRow: 2, // Display options in a 2-column grid
    options: [
      { id: 'emergencyFund', content: 'Emergency fund', isCorrect: false },
      { id: 'retirement', content: 'Retirement', isCorrect: false },
      { id: 'homePurchase', content: 'Home purchase', isCorrect: false },
      { id: 'travel', content: 'Travel', isCorrect: false },
      { id: 'education', content: 'Education', isCorrect: false },
      { id: 'debtPayoff', content: 'Debt payoff', isCorrect: false },
      { id: 'startingBusiness', content: 'Starting a business', isCorrect: false },
      { id: 'familyPlanning', content: 'Family planning', isCorrect: false },
      { id: 'majorPurchase', content: 'Major purchase', isCorrect: false },
      { id: 'wealthBuilding', content: 'Wealth building', isCorrect: false }
    ]
  },
  {
    id: 'monthlySavings',
    type: 'text-input',
    question: "How much can you save monthly?",
    explanation: "Even small amounts add up over time! This helps me suggest realistic goals.",
    prefix: "$",
    placeholder: "0",
    validation: {
      pattern: "^\\d+(\\.\\d{1,2})?$",  // Dollars with optional cents
      min: 0,
      required: true,
      errorMessage: "Please enter a valid dollar amount"
    }
  }
];

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