"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AI_ROLE, AI_ROLES } from '@/components/chat/ai-roles';
import { ConversationMessage } from '@/components/chat/chat-conversation-display';
import { fetchConversations, sendChatMessage } from '@/services/conversation-service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { FinancialHealthProfile, formatProfileForAI } from '@/hooks/use-financial-health-profile';

interface ConversationState {
  messages: ConversationMessage[];
  isLoaded: boolean;
  isLoading: boolean;
  conversationId: string | null;
}

interface ChatContextValue {
  // State for each AI role
  conversations: Record<AI_ROLE, ConversationState>;
  
  // Actions
  loadInitialMessages: (aiRole: AI_ROLE) => Promise<void>;
  sendMessage: (
    aiRole: AI_ROLE, 
    content: string, 
    options?: {
      profile?: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>;
      goalContext?: any;
      sessionId?: string;
    }
  ) => Promise<any>;
  addMessage: (aiRole: AI_ROLE, message: ConversationMessage) => void;
  clearConversation: (aiRole: AI_ROLE) => void;
  
  // Loading states
  isSendingMessage: (aiRole: AI_ROLE) => boolean;
  getMessages: (aiRole: AI_ROLE) => ConversationMessage[];
  isConversationLoaded: (aiRole: AI_ROLE) => boolean;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const initialConversationState: ConversationState = {
  messages: [],
  isLoaded: false,
  isLoading: false,
  conversationId: null,
};

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
  const [conversations, setConversations] = useState<Record<AI_ROLE, ConversationState>>(() => ({
    [AI_ROLES.FINANCIAL_ADVISOR]: { ...initialConversationState },
    [AI_ROLES.FINANCIAL_EDUCATOR]: { ...initialConversationState },
  } as Record<AI_ROLE, ConversationState>));
  
  const [sendingStates, setSendingStates] = useState<Record<AI_ROLE, boolean>>(() => ({
    [AI_ROLES.FINANCIAL_ADVISOR]: false,
    [AI_ROLES.FINANCIAL_EDUCATOR]: false,
  } as Record<AI_ROLE, boolean>));
  
  // Cookie utility functions for guest sessions
  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  const getGuestSessionId = (): string => {
    let sessionId = getCookie("moneko-guest-session");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      setCookie("moneko-guest-session", sessionId, 365);
    }
    return sessionId;
  };

  const getConsistentTimestamp = (): number => {
    if (typeof window === "undefined") {
      return 1717000000000;
    }
    return Date.now();
  };

  const loadInitialMessages = useCallback(async (aiRole: AI_ROLE) => {
    // Don't reload if already loaded or loading
    if (conversations[aiRole].isLoaded || conversations[aiRole].isLoading || !isAuthenticated) {
      return;
    }
    
    setConversations(prev => ({
      ...prev,
      [aiRole]: { ...prev[aiRole], isLoading: true }
    }));
    
    try {
      const data = await fetchConversations(supabase, aiRole);
      setConversations(prev => ({
        ...prev,
        [aiRole]: {
          messages: data?.messages || [],
          isLoaded: true,
          isLoading: false,
          conversationId: data?.id || null,
        }
      }));
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setConversations(prev => ({
        ...prev,
        [aiRole]: { ...prev[aiRole], isLoading: false }
      }));
    }
  }, [conversations, isAuthenticated]);

  const addMessage = useCallback((aiRole: AI_ROLE, message: ConversationMessage) => {
    setConversations(prev => ({
      ...prev,
      [aiRole]: {
        ...prev[aiRole],
        messages: [...prev[aiRole].messages, message]
      }
    }));
  }, []);

  const sendMessage = useCallback(async (
    aiRole: AI_ROLE, 
    content: string, 
    options: {
      profile?: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>;
      goalContext?: any;
      sessionId?: string;
    } = {}
  ) => {
    if (!content.trim() || sendingStates[aiRole]) return;
    
    setSendingStates(prev => ({ ...prev, [aiRole]: true }));
    
    try {
      // Create optimistic user message
      const userMessage: ConversationMessage = {
        content,
        role: "user",
        timestamp: getConsistentTimestamp(),
        chat_session_id: isAuthenticated 
          ? conversations[aiRole].conversationId || "" 
          : (options.sessionId || getGuestSessionId()),
        userId: user?.id
      };
      
      // Add user message immediately to React state for instant UI feedback
      addMessage(aiRole, userMessage);
      
      // Send message to backend (backend will handle all database operations)
      const response = await sendChatMessage(supabase, content, {
        conversationId: isAuthenticated ? conversations[aiRole].conversationId : null,
        userId: user?.id || null,
        sessionId: isAuthenticated ? null : (options.sessionId || getGuestSessionId()),
        model: aiRole,
        profile: formatProfileForAI(user, options.profile ? {
          profile_description: options.profile.profile_description,
          quiz_answers: options.profile.profile_data
        } : null),
        ...(options.goalContext && { goalContext: options.goalContext }),
      });
      
      // Update conversation ID if we got a new one
      if (response.conversationId && !conversations[aiRole].conversationId) {
        setConversations(prev => ({
          ...prev,
          [aiRole]: {
            ...prev[aiRole],
            conversationId: response.conversationId || null
          }
        }));
      }
      
      const aiMessage: ConversationMessage = {
        content: response.response || "I'm sorry, I couldn't generate a response.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: response.conversationId || userMessage.chat_session_id,
        userId: user?.id,
        metadata: response.generatedLessons ? { courseRecommendation: response.generatedLessons } : undefined
      };
      
      addMessage(aiRole, aiMessage);
      
      return response;
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ConversationMessage = {
        content: "Sorry, I had trouble connecting. Please check your connection or try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: conversations[aiRole].conversationId || getGuestSessionId(),
        userId: user?.id,
        metadata: { isError: true }
      };
      
      addMessage(aiRole, errorMessage);
      throw error;
    } finally {
      setSendingStates(prev => ({ ...prev, [aiRole]: false }));
    }
  }, [conversations, sendingStates, isAuthenticated, user, addMessage]);

  const clearConversation = useCallback((aiRole: AI_ROLE) => {
    setConversations(prev => ({
      ...prev,
      [aiRole]: { ...initialConversationState }
    }));
  }, []);

  const isSendingMessage = useCallback((aiRole: AI_ROLE) => {
    return sendingStates[aiRole];
  }, [sendingStates]);

  const getMessages = useCallback((aiRole: AI_ROLE) => {
    return conversations[aiRole].messages;
  }, [conversations]);

  const isConversationLoaded = useCallback((aiRole: AI_ROLE) => {
    return conversations[aiRole].isLoaded;
  }, [conversations]);

  const value: ChatContextValue = {
    conversations,
    loadInitialMessages,
    sendMessage,
    addMessage,
    clearConversation,
    isSendingMessage,
    getMessages,
    isConversationLoaded,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}