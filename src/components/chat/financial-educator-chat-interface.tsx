"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { Modal } from "../ui/modal";
import {
  fetchConversations,
  fetchConversation,
  type Message as ServiceMessage,
  type Conversation,
} from "@/services/conversation-service";
import { useAuth } from "@/contexts/auth-context";
import { useFinancialHealthProfile, FinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { ChatConversationDisplay, ConversationMessage } from "./chat-conversation-display";
import { supabase } from "@/lib/supabase";
import { sendChatMessage, updateGuestSession } from "@/services/conversation-service";
import { BetaPill } from "../ui/beta-pill";
import { FinancialHealthQuiz } from "@/components/financial-health/FinancialHealthQuiz";
import { AI_ROLES } from "./ai-roles";

// Cookie utility functions
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

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const getGuestSessionId = (): string | null => {
  return getCookie(GUEST_SESSION_COOKIE);
};

const setGuestSessionId = (sessionId: string) => {
  setCookie(GUEST_SESSION_COOKIE, sessionId, 365);
};

const GUEST_SESSION_COOKIE = "paw-fi-guest-session";
const INITIAL_SUGGESTIONS = ["Start"];

type Message = ConversationMessage;

interface ChatInterfaceProps {
}

export function FinancialEducatorChatInterface(props: ChatInterfaceProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = !!user;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Moneko is thinking...");
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [connectionError, setConnectionError] = useState<string | undefined>(undefined);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [hasUpdatedGuestSession, setHasUpdatedGuestSession] = useState(false);
  
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get guest session ID from cookie or create new one
  const getGuestSessionId = useCallback((): string => {
    let sessionId = getCookie(GUEST_SESSION_COOKIE);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      setCookie(GUEST_SESSION_COOKIE, sessionId, 365);
    }
    return sessionId;
  }, []);
  
  // Load financial health profile for authenticated users
  const { profile } = useFinancialHealthProfile(user?.id);
  console.log("profile", profile)
  
  // Fetch conversations for authenticated users
  const { 
    data: conversationsData,
    isLoading: isConversationsLoading,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchConversations(supabase),
    enabled: isAuthenticated,
    staleTime: 30000,
  });
  
  // Backend already filters by model, so use conversations directly
  const conversations = conversationsData || [];
  const currentConversationId = conversations[0]?.id || null;
  
  // Fetch current conversation messages for authenticated users
  const { 
    data: currentConversationData,
    isLoading: isConversationLoading,
    refetch: refetchConversation
  } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => fetchConversation(supabase, currentConversationId!),
    enabled: !!currentConversationId && isAuthenticated,
    staleTime: 10000,
  });
  
  // Load messages from conversation data
  useEffect(() => {
    if (isAuthenticated && currentConversationData?.messages) {
      setMessages(currentConversationData.messages);
    }
  }, [isAuthenticated, currentConversationData]);
  
  // Update guest session on login
  useEffect(() => {
    if (isAuthenticated && user?.id && !hasUpdatedGuestSession) {
      const guestSessionId = getCookie(GUEST_SESSION_COOKIE);
      if (guestSessionId) {
        updateGuestSession(guestSessionId, user.id);
        setHasUpdatedGuestSession(true);
      }
    }
  }, [isAuthenticated, user?.id, hasUpdatedGuestSession]);

  
  // Send message function - unified for both guest and authenticated users
  const handleSendMessage = async (content: string, manual_profile?: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => {
    if (!content.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    setIsLoading(true);
    setConnectionError(undefined);
    setLoadingMessage("Moneko is thinking...");
    setLoadingDuration(0);
    
    // Start loading timer
    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    loadingTimerRef.current = setInterval(() => {
      setLoadingDuration(prev => prev + 1);
    }, 1000);
    
    // Create optimistic user message
    const userMessage: Message = {
      content,
      role: "user",
      timestamp: Date.now(),
      chat_session_id: isAuthenticated ? currentConversationId || "" : getGuestSessionId(),
      userId: user?.id
    };
    
    // Optimistically add user message to UI
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Send message using proper supabase service function
      const response = await sendChatMessage(supabase, content, {
        conversationId: isAuthenticated ? currentConversationId : null,
        userId: user?.id || null,
        sessionId: isAuthenticated ? null : getGuestSessionId(),
        model: AI_ROLES.FINANCIAL_EDUCATOR,
        profile: manual_profile || (profile ?  profile.profile_description : null)
      });
      
      // For guest users, store the new session ID if provided
      if (!isAuthenticated && response.conversationId) {
        setGuestSessionId(response.conversationId);
      }
      
      // For authenticated users, if we got a new conversation ID, invalidate and refetch
      if (isAuthenticated && response.conversationId) {
        // Invalidate conversations query to refetch the list
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        // Invalidate the specific conversation query
        queryClient.invalidateQueries({ queryKey: ['conversation', response.conversationId] });
      }
      
      // Create AI message from response
      const aiMessage: Message = {
        content: response.response || "I'm sorry, I couldn't generate a response.",
        role: "assistant",
        timestamp: Date.now(),
        chat_session_id: response.conversationId || userMessage.chat_session_id,
        userId: user?.id,
        metadata: response.generatedLessons ? { courseRecommendation: response.generatedLessons } : undefined
      };
      
      // Add AI message to UI
      setMessages(prev => [...prev, aiMessage]);
      
      // Check for signup prompt
      if (!isAuthenticated && response.response?.includes('```json')) {
        setShowSignupPrompt(true);
      }
      
      // Refresh conversation data for authenticated users
      if (isAuthenticated) {
        refetchConversation();
        refetchConversations();
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        content: "Sorry, I had trouble connecting. Please check your connection or try again.",
        role: "assistant",
        timestamp: Date.now(),
        chat_session_id: userMessage.chat_session_id,
        userId: user?.id,
        metadata: { isError: true }
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setConnectionError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
      setIsSendingMessage(false);
      setLoadingMessage("Moneko is thinking...");
      setLoadingDuration(0);
      
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
  };
  
  // Handle quiz completion
  const handleQuizComplete = async (profile: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => {
    setIsQuizModalOpen(false);
    handleSendMessage("I've completed the questionnaire", profile);
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
    };
  }, []);
  
  const welcomeMessage = "Hi I'm Moneko! I'll help you learn about personal finance. Type 'start' to begin or ask me anything.";
  const isBackendProcessing = (isAuthenticated && (isConversationsLoading || isConversationLoading)) && messages.length === 0;
  
  return (
    <>
      <ChatConversationDisplay
        messages={messages}
        onMessageSend={handleSendMessage}
        isLoading={isLoading}
        isSendingMessage={isSendingMessage}
        agentName="Moneko AI"
        welcomeMessage={welcomeMessage}
        welcomeSubtitle="Ask me anything to get started!"
        loadingMessage={loadingMessage}
        suggestions={messages.length === 0 && !isLoading ? INITIAL_SUGGESTIONS : []}
        onSuggestionClick={handleSendMessage}
        connectionError={connectionError}
        isBackendProcessing={isBackendProcessing}
        loadingDuration={loadingDuration}
        onOpenQuizModal={() => setIsQuizModalOpen(true)}
        navigate={navigate}
        headerClassName="p-4"
        agentIcon={
          <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
            <img src="@/assets/images/icon.svg" alt="Moneko AI" className="size-8" />
            <BetaPill />
          </div>
        }
      />

      {/* Registration Modal */}
      <Modal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        disableOverlayClick={true}
        overlayClassName="bg-black/40"
        contentClassName="relative flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-primary/30 shadow-2xl w-[90vw] max-w-md mx-auto pointer-events-auto"
      >
        <div className="flex flex-col items-center w-full">
          <div className="mb-4 flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/80 to-primary/50 rounded-full shadow-lg">
            <FontAwesomeIcon icon={faGraduationCap} className="text-white text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2 text-center drop-shadow-sm">
            Your personalized lesson is ready!
          </h2>
          <p className="text-gray-700 dark:text-gray-200 mb-3 text-center text-base font-medium">
            Register a free account to view this personalized lesson and access more features.
          </p>
          <div className="w-full flex flex-col gap-2">
            <Link to="/register" search={{ redirect: "/dashboard/chat" }} className="w-full">
              <Button fullWidth className="!bg-primary !text-white !font-bold !py-3 !rounded-xl !shadow-lg hover:!bg-primary/90 transition">
                Register for Free
              </Button>
            </Link>
          </div>
        </div>
      </Modal>

      {/* Financial Health Quiz Modal */}
      <Modal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        title="Financial Health Assessment"
        description="Complete this assessment to get personalized financial advice"
        width="wide"
        fullHeight={true}
        disableOverlayClick
      >
        {user && (
          <FinancialHealthQuiz
            user={user}
            onDashboardCreated={handleQuizComplete}
          />
        )}
      </Modal>
    </>
  );
}