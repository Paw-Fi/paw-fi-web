import { createContext, useContext, useEffect, useState, useReducer } from 'react';
import type { ReactNode } from 'react';
import { getFromStorage, saveToStorage } from '@/utils/storage';
import type { Question } from '@/types/learning.types';
import { questions } from '@/data/chat';

// Define the Chat state type
export interface ChatState {
  currentStep: number;
  answers: Record<string, string | string[] | number | Record<string, string>>;
}

type ChatContextType = {
  state: ChatState;
  nextStep: () => void;
  prevStep: () => void;
  setAnswer: (questionId: string, answer: string | string[] | number | Record<string, string>) => void;
  resetChat: () => void;
  isComplete: boolean;
  questions: Question[];
};

const STORAGE_KEY = 'chat';

const defaultState: ChatState = {
  currentStep: 0,
  answers: {},
};

const chatReducer = (state: ChatState, action: { type: string; payload: any }) => {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, questions.length) };
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
    case 'SET_ANSWER':
      return { ...state, answers: { ...state.answers, [action.payload.questionId]: action.payload.answer } };
    case 'RESET_CHAT':
      return defaultState;
    default:
      return state;
  }
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, defaultState);

  // Hydrate from localStorage on client
  useEffect(() => {
    const stored = getFromStorage(STORAGE_KEY);
    if (stored) {
      dispatch({ type: 'HYDRATE', payload: JSON.parse(stored) });
    }
  }, []);

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

  const resetChat = () => {
    setState(defaultState);
  };

  return (
    <ChatContext.Provider
      value={{
        state,
        nextStep,
        prevStep,
        setAnswer,
        resetChat,
        isComplete,
        questions,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}