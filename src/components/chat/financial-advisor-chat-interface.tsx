"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useFinancialHealthProfile, formatProfileForAI } from "@/hooks/use-financial-health-profile";
import { ChatConversationDisplay, ConversationMessage } from "./chat-conversation-display";
import {
  fetchConversations,
  sendChatMessage,
} from "@/services/conversation-service";
import { supabase } from "@/lib/supabase";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { AI_ROLES } from "./ai-roles";
import logo from "@/assets/images/icon.svg";

type Message = ConversationMessage;

export function FinancialAdvisorChatInterface() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const queryClient = useQueryClient();
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
    
  // Load financial health profile for authenticated users
  const { profile } = useFinancialHealthProfile(user?.id);
  
  // Fetch conversations for authenticated users - only once initially
  const { 
    data: conversationsData,
    isLoading: isConversationsLoading,
  } = useQuery({
    queryKey: ['conversations', AI_ROLES.FINANCIAL_ADVISOR],
    queryFn: () => fetchConversations(supabase, AI_ROLES.FINANCIAL_ADVISOR),
    enabled: isAuthenticated,
    staleTime: Infinity, // Never refetch automatically
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const currentConversationId = useMemo(() => {
    if (!conversationsData) {
      return null;
    }
    return conversationsData.id;
  }, [conversationsData]);

const currentConversationData = conversationsData
  // Load messages from conversation data - only once initially
  const [hasLoadedInitialMessages, setHasLoadedInitialMessages] = useState(false);
  useEffect(() => {
    if (isAuthenticated && currentConversationData?.messages && !hasLoadedInitialMessages) {
      setMessages(currentConversationData.messages);
      setHasLoadedInitialMessages(true);
    }
  }, [isAuthenticated, currentConversationData, hasLoadedInitialMessages]);
  
  // Send message function - unified for both guest and authenticated users
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    setConnectionError(null);
    
    const getConsistentTimestamp = (): number => {
      if (typeof window === "undefined") {
        return 1717000000000;
      }
      return Date.now();
    };
    
    // Create optimistic user message
    const userMessage: Message = {
      content,
      role: "user",
      timestamp: getConsistentTimestamp(),
      chat_session_id: isAuthenticated ? currentConversationId || "" : "",
      userId: user?.id
    };
    
    // Optimistically add user message to UI
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Send message using proper supabase service function
      const response = await sendChatMessage(supabase, content, {
        conversationId: isAuthenticated ? currentConversationId : null,
        userId: user?.id || null,
        model: AI_ROLES.FINANCIAL_ADVISOR,
        profile: formatProfileForAI(user,profile)
      });
      
      
      // Create AI message from response
      const aiMessage: Message = {
        content: response.response || "I'm sorry, I couldn't generate a response.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: response.conversationId || userMessage.chat_session_id,
        userId: user?.id,
      };
      
      // Add AI message to UI
      setMessages(prev => [...prev, aiMessage]);
            
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        content: "Sorry, I had trouble connecting. Please check your connection or try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: userMessage.chat_session_id,
        userId: user?.id,
        metadata: { isError: true }
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setConnectionError("Connection error. Please try again.");
    } finally {
      setIsSendingMessage(false);
    }
  };


  return (
    <ChatConversationDisplay
      messages={messages}
      onMessageSend={handleSendMessage}
      isSendingMessage={isSendingMessage}
      agentName="Moneko AI - Financial Advisor"
      welcomeMessage="Hi! I'm Moneko, your AI financial advisor. I provide personalized financial guidance based on your situation. What financial question can I help you with today?"
      welcomeSubtitle="Ask me about budgeting, investing, debt management, or any financial topic!"
      connectionError={connectionError || undefined}
      isBackendProcessing={isConversationsLoading}
      headerClassName="p-4"
      agentIcon={
        <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
          <OptimizedImage src={logo} alt="Moneko AI" className="size-6" />
        </div>
      }
    />
  );
}