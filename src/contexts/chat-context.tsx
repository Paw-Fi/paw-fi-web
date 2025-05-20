import { createContext, useContext, useEffect, useState } from 'react';
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

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatState>(() => 
    getFromStorage<ChatState>(STORAGE_KEY, defaultState)
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