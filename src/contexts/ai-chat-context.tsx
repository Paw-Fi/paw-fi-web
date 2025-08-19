import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Message type for conversation history
export interface ConversationMessage {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// AI options type
export interface AIOption {
  id: string;
  name: string;
  subtitle: string;
  color: string;
}

export type AI_ID = "advisor" | "educator";

// AI chat context type
interface AIChatContextType {
  isOpen: boolean;
  selectedAI: AI_ID;
  openChat: (aiId?: AI_ID) => void;
  closeChat: () => void;
  toggleChat: (aiId?: AI_ID) => void;
  setSelectedAI: (aiId: AI_ID) => void;
  
  // Conversation history management
  messages: Record<AI_ID, ConversationMessage[]>;
  addMessage: (aiId: AI_ID, message: ConversationMessage) => void;
  clearMessages: (aiId: AI_ID) => void;
  clearAllMessages: () => void; // Clear all chat history for user logout
  getMessages: (aiId: AI_ID) => ConversationMessage[];
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
  const [selectedAI, setSelectedAI] = useState<AI_ID>('advisor');
  
  // Initialize messages as empty - chat history should come from database only
  const [messages, setMessages] = useState<Record<AI_ID, ConversationMessage[]>>(() => ({
    advisor: [],
    educator: []
  }));

  const openChat = (aiId?: AI_ID) => {
    if (aiId) {
      setSelectedAI(aiId);
    }
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const toggleChat = (aiId?: AI_ID) => {
    if (isOpen) {
      closeChat();
    } else {
      openChat(aiId);
    }
  };

  const addMessage = (aiId: AI_ID, message: ConversationMessage) => {
    setMessages(prev => ({
      ...prev,
      [aiId]: [...prev[aiId], message]
    }));
  };

  const clearMessages = (aiId: AI_ID) => {
    setMessages(prev => ({
      ...prev,
      [aiId]: []
    }));
  };

  const clearAllMessages = () => {
    setMessages({
      advisor: [],
      educator: []
    });
  };

  const getMessages = (aiId: AI_ID) => {
    return messages[aiId] || [];
  };

  const contextValue: AIChatContextType = {
    isOpen,
    selectedAI,
    openChat,
    closeChat,
    toggleChat,
    setSelectedAI,
    messages,
    addMessage,
    clearMessages,
    clearAllMessages,
    getMessages
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
