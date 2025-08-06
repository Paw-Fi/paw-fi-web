"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useAIChat } from "@/contexts/ai-chat-context";
import { useFinancialHealthProfile, formatProfileForAI, FinancialHealthProfile } from "@/hooks/use-financial-health-profile";
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
  const { closeChat } = useAIChat();
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
  const handleSendMessage = async (content: string,manual_profile?: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => {
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
    <div className="h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-950 dark:via-indigo-950 dark:to-cyan-950 flex flex-col">
      {/* Floating close button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={closeChat}
          className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        >
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-white to-blue-50 dark:from-slate-800 dark:to-slate-700">
        <div className="px-6 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-100 bg-clip-text text-transparent mb-2">
              Financial Advisor
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Get personalized financial guidance with your AI advisor Ollie
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container - Takes remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatConversationDisplay
          messages={messages}
          onMessageSend={handleSendMessage}
          isSendingMessage={isSendingMessage}
          agentName="Moneko AI - Financial Advisor"
          welcomeMessage="Hi! I'm Moneko, your AI financial advisor. I provide personalized financial guidance based on your situation. What financial question can I help you with today?"
          welcomeSubtitle="Ask me about budgeting, investing, debt management, or any financial topic!"
          connectionError={connectionError || undefined}
          isBackendProcessing={isConversationsLoading}
          className="flex-1"
          agentIcon={
            <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
              <OptimizedImage src={logo} alt="Moneko AI" className="size-6" />
            </div>
          }
        />
      </div>
      
      {/* Dynamic footer with user profile data */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {profile && user ? (
              // Show user's financial profile data
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Profile Active</span>
                </div>
                {profile.profile_data?.financial_goals && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <span>{profile.profile_data.financial_goals.length} goals tracked</span>
                  </div>
                )}
                {profile.profile_data?.risk_tolerance && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <span>{profile.profile_data.risk_tolerance} risk tolerance</span>
                  </div>
                )}
                {profile.profile_data?.income_range && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>{profile.profile_data.income_range} income</span>
                  </div>
                )}
              </>
            ) : (
              // Default indicators
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Personal Guidance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Expert Advice</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  <span>Investment Strategies</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Budget Planning</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}