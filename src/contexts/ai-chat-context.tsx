import React, { createContext, useContext, useState, ReactNode } from 'react';

// AI options type
export interface AIOption {
  id: string;
  name: string;
  subtitle: string;
  color: string;
}

// AI chat context type
interface AIChatContextType {
  isOpen: boolean;
  selectedAI: string;
  openChat: (aiId?: string) => void;
  closeChat: () => void;
  toggleChat: (aiId?: string) => void;
  setSelectedAI: (aiId: string) => void;
}

// Create the context
const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

// AI options configuration
export const AI_OPTIONS: AIOption[] = [
  {
    id: 'advisor',
    name: 'Financial Advisor',
    subtitle: 'Investment & planning guidance',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'tracker',
    name: 'Goal Tracker',
    subtitle: 'Track and manage your financial goals',
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'educator',
    name: 'Financial Educator',
    subtitle: 'Learning & education',
    color: 'from-purple-500 to-purple-600'
  }
];

// Provider props
interface AIChatProviderProps {
  children: ReactNode;
}

// Provider component
export const AIChatProvider: React.FC<AIChatProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAI, setSelectedAI] = useState<string>('advisor');

  const openChat = (aiId?: string) => {
    if (aiId) {
      setSelectedAI(aiId);
    }
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const toggleChat = (aiId?: string) => {
    if (isOpen) {
      closeChat();
    } else {
      openChat(aiId);
    }
  };

  const contextValue: AIChatContextType = {
    isOpen,
    selectedAI,
    openChat,
    closeChat,
    toggleChat,
    setSelectedAI
  };

  return (
    <AIChatContext.Provider value={contextValue}>
      {children}
    </AIChatContext.Provider>
  );
};

// Custom hook to use the AI chat context
export const useAIChat = (): AIChatContextType => {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error('useAIChat must be used within an AIChatProvider');
  }
  return context;
};
