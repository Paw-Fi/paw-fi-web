"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatMessageItem } from "./chat-message-item";
import { ChatSuggestions } from "./chat-suggestions";
import { ChatInput } from './chat-input';
import logo from "@/assets/images/icon.svg";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { 
  getPredictedResponses,
  fetchConversations,
  sendChatMessage,
  updateGuestSession
} from '@/services/conversation-service';
import { supabase } from '@/lib/supabase';
import { GoalType } from '../goal-tracker/types';
import { useAuth } from '@/contexts/auth-context';
import { useSubscription } from '@/hooks/use-subscription';
import { useLocation, useRouter } from '@tanstack/react-router';
import FinancialHealthQuiz from '../financial-health/FinancialHealthQuiz';
import { Modal } from '../ui/modal';
import { FinancialHealthProfile, useFinancialHealthProfile, formatProfileForAI } from '@/hooks/use-financial-health-profile';

export interface ConversationMessage {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  userId?: string;
  metadata?: Record<string, any>;
}

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

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const GUEST_SESSION_COOKIE = "moneko-guest-session";
const GUEST_COURSE_COOKIE = "moneko-guest-course";

export interface ChatConfig {
  aiRole: string;
  enableGuestSessions?: boolean;
  enableSignupPrompt?: boolean;
  enableLoadingDuration?: boolean;
  onSignupPromptShow?: () => void;
  onGuestSessionUpdate?: (sessionId: string, courseId?: string) => void;
  // For goal tracker - use external message handler and existing messages
  useExternalMessages?: boolean;
  externalMessages?: ConversationMessage[];
  customMessageHandler?: (content: string) => Promise<void>;
}

interface ChatConversationDisplayProps {
  // Chat configuration
  chatConfig: ChatConfig;
  
  // Optional customization
  agentName?: string;
  agentIcon?: React.ReactNode;
  welcomeMessage?: string;
  welcomeSubtitle?: string;
  
  // Goal template handling (for AI onboarding)
  onGoalTemplateClick?: (goalType: GoalType) => void;
  
  // Navigation
  navigate?: any;

  initialSuggestedResponses?: string[];
  
  // Clear conversation
  onClearConversation?: () => void;
  
  // Message parsing control
  disableMsgParse?: boolean;
  
  // Chat container customization
  className?: string;
  headerClassName?: string;
  messagesClassName?: string;
}

export const iconContainer = (size: string = "size-8", iconSrc?: string) => {
  return (
    <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
      <OptimizedImage src={iconSrc || logo} alt="AI Assistant" className={size} />
    </div>
  );
};

export const ChatConversationDisplay: React.FC<ChatConversationDisplayProps> = ({
  chatConfig,
  agentIcon,
  welcomeMessage = "Hi! I'm here to help you. Ask me anything to get started!",
  welcomeSubtitle = "Type a message below to begin our conversation.",
  onGoalTemplateClick,
  navigate,
  initialSuggestedResponses,
  onClearConversation,
  disableMsgParse = false,
  className = "",
  headerClassName = "",
  messagesClassName = ""
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const { isActive } = useSubscription(user?.id || '');
  const location = useLocation();
  const queryClient = useQueryClient();
  const isAuthenticated = !!user;

  // State management - moved from parent components
  const [internalMessages, setInternalMessages] = useState<ConversationMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [hasUpdatedGuestSession, setHasUpdatedGuestSession] = useState(false);
  
  // Use external messages if provided, otherwise use internal state
  const messages = chatConfig.useExternalMessages ? (chatConfig.externalMessages || []) : internalMessages;
  
  // Load financial health profile for authenticated users
  const { profile } = useFinancialHealthProfile(user?.id);
  
  // Get guest session ID from cookie or create new one
  const getGuestSessionId = useCallback((): string => {
    let sessionId = getCookie(GUEST_SESSION_COOKIE);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      setCookie(GUEST_SESSION_COOKIE, sessionId, 365);
    }
    return sessionId;
  }, []);

  // Fetch conversations for authenticated users - only if not using external messages
  const { 
    data: conversationsData,
    isLoading: isConversationsLoading,
  } = useQuery({
    queryKey: ['conversations', chatConfig.aiRole],
    queryFn: () => fetchConversations(supabase, chatConfig.aiRole),
    enabled: isAuthenticated && !chatConfig.useExternalMessages,
    staleTime: Infinity, // Never refetch automatically
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const currentConversationId = conversationsData?.id || null;

  // Load messages from conversation data - only once initially (only if not using external messages)
  const [hasLoadedInitialMessages, setHasLoadedInitialMessages] = useState(false);
  useEffect(() => {
    if (!chatConfig.useExternalMessages && isAuthenticated && conversationsData?.messages && !hasLoadedInitialMessages) {
      setInternalMessages(conversationsData.messages);
      setHasLoadedInitialMessages(true);
    }
  }, [chatConfig.useExternalMessages, isAuthenticated, conversationsData, hasLoadedInitialMessages]);

  // Update guest session on login (for educator interface)
  useEffect(() => {
    if (chatConfig.enableGuestSessions && isAuthenticated && user?.id && !hasUpdatedGuestSession) {
      const guestSessionId = getCookie(GUEST_SESSION_COOKIE);
      if (guestSessionId) {
        updateGuestSession(guestSessionId, user.id)
          .then(() => {
            // Clean up guest cookies after successful session transfer
            deleteCookie(GUEST_SESSION_COOKIE);
            deleteCookie(GUEST_COURSE_COOKIE);
          })
          .catch((error) => {
            console.error('Failed to update guest session:', error);
          });
        setHasUpdatedGuestSession(true);
      }
    }
  }, [chatConfig.enableGuestSessions, isAuthenticated, user?.id, hasUpdatedGuestSession]);

  const isConversationMaxedOut = location.pathname!='/onboarding' && !isActive&&messages.length>=8;
  
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Send message function - unified for both guest and authenticated users
  const handleSendMessage = async (content: string, manual_profile?: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => {
    if (!content.trim() || isSendingMessage) return;
    
    // If using custom message handler (like goal tracker), delegate to it
    if (chatConfig.customMessageHandler) {
      setIsSendingMessage(true);
      setConnectionError(null);
      try {
        await chatConfig.customMessageHandler(content);
      } catch (error) {
        setConnectionError(typeof error === 'string' ? error : 'Connection error. Please try again.');
      } finally {
        setIsSendingMessage(false);
      }
      return;
    }
    
    setIsSendingMessage(true);
    setConnectionError(null);
    
    if (chatConfig.enableLoadingDuration) {
      setLoadingDuration(0);
      // Start loading timer
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = setInterval(() => {
        setLoadingDuration(prev => prev + 1);
      }, 1000);
    }
    
    const getConsistentTimestamp = (): number => {
      if (typeof window === "undefined") {
        return 1717000000000;
      }
      return Date.now();
    };
    
    // Create optimistic user message
    const userMessage: ConversationMessage = {
      content,
      role: "user",
      timestamp: getConsistentTimestamp(),
      chat_session_id: isAuthenticated ? currentConversationId || "" : (chatConfig.enableGuestSessions ? getGuestSessionId() : ""),
      userId: user?.id
    };
    
    // Optimistically add user message to UI (only for internal messages)
    if (!chatConfig.useExternalMessages) {
      setInternalMessages(prev => [...prev, userMessage]);
    }
    
    try {
      // Send message using proper supabase service function
      const response = await sendChatMessage(supabase, content, {
        conversationId: isAuthenticated ? currentConversationId : null,
        userId: user?.id || null,
        sessionId: isAuthenticated ? null : (chatConfig.enableGuestSessions ? getGuestSessionId() : null),
        model: chatConfig.aiRole,
        profile: formatProfileForAI(user, manual_profile || profile)
      });
      
      // For guest users (educator only), store the new session ID and course ID if provided
      if (!isAuthenticated && chatConfig.enableGuestSessions) {
        if (response.conversationId) {
          setCookie(GUEST_SESSION_COOKIE, response.conversationId, 365);
        }
        if (response.course_id) {
          setCookie(GUEST_COURSE_COOKIE, response.course_id, 365);
        }
        if (response.conversationId) {
          chatConfig.onGuestSessionUpdate?.(response.conversationId, response.course_id);
        }
      }
      
      // Create AI message from response
      const aiMessage: ConversationMessage = {
        content: response.response || "I'm sorry, I couldn't generate a response.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: response.conversationId || userMessage.chat_session_id,
        userId: user?.id,
        metadata: response.generatedLessons ? { courseRecommendation: response.generatedLessons } : undefined
      };
      
      // Add AI message to UI (only for internal messages)
      if (!chatConfig.useExternalMessages) {
        setInternalMessages(prev => [...prev, aiMessage]);
      }
      
      // Check for signup prompt (educator only)
      if (chatConfig.enableSignupPrompt && !isAuthenticated && response.response?.includes('```json')) {
        setShowSignupPrompt(true);
        chatConfig.onSignupPromptShow?.();
      } else if (isAuthenticated && response.response?.includes('```json')) {
        await queryClient.invalidateQueries({ queryKey: ['user-courses', user.id] });
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message (only for internal messages)
      if (!chatConfig.useExternalMessages) {
        const errorMessage: ConversationMessage = {
          content: "Sorry, I had trouble connecting. Please check your connection or try again.",
          role: "assistant",
          timestamp: getConsistentTimestamp(),
          chat_session_id: userMessage.chat_session_id,
          userId: user?.id,
          metadata: { isError: true }
        };
        
        setInternalMessages(prev => [...prev, errorMessage]);
      }
      setConnectionError("Connection error. Please try again.");
    } finally {
      setIsSendingMessage(false);
      
      if (chatConfig.enableLoadingDuration) {
        setLoadingDuration(0);
        if (loadingTimerRef.current) {
          clearInterval(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestedResponses([]);
    handleSendMessage(suggestion);
  };

  const MAX_TIME_TO_SHOW_LOADING = 9;
  const [loadingMessage, setLoadingMessage] = useState<string>("Moneko is thinking...");
  
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([
    ...initialSuggestedResponses || []
  ]);

  useEffect(() => {
    if(messages.length > 0) {
      fetchSuggestions(messages[messages.length - 1].content);
    }
  }, [messages]);
  
  // Fetch suggested responses based on assistant message
  const fetchSuggestions = async (lastAssistantMessage: string) => {
    try {
      const contextMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the final assistant message to context
      contextMessages.push({
        role: 'assistant',
        content: lastAssistantMessage
      });
      
      const suggestions = await getPredictedResponses(supabase, lastAssistantMessage, contextMessages);
      setSuggestedResponses(suggestions);
    } catch (error) {
      setSuggestedResponses([]);
    }
  };

  useEffect(() => {
    if(loadingDuration >= MAX_TIME_TO_SHOW_LOADING && !isSendingMessage) {
     
    }
  }, [messages]);

    // Update loading message based on duration
    useEffect(() => {
      if (loadingDuration === MAX_TIME_TO_SHOW_LOADING) {
        setLoadingMessage("Crafting your personalized financial lessons... 📚");
      } else if (loadingDuration === MAX_TIME_TO_SHOW_LOADING + 15) {
        setLoadingMessage("Building knowledge blocks just for you! Almost there... 🧩");
      } else if (loadingDuration === MAX_TIME_TO_SHOW_LOADING + 30) {
        setLoadingMessage("Creating something special! Your financial wisdom is on the way... ✨");
      } else if (loadingDuration === MAX_TIME_TO_SHOW_LOADING + 45) {
        setLoadingMessage("Almost done! Did you know? Small, consistent steps lead to big financial growth. 🌱");
      }
    }, [loadingDuration]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (loadingTimerRef.current) {
          clearInterval(loadingTimerRef.current);
        }
      };
    }, []);

    const handleDashboardCreated = async (profile: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => {
      setIsQuizModalOpen(false);
      handleSendMessage("I've completed the questionnaire", profile);
      await queryClient.invalidateQueries({ queryKey: ["dashboard-views"] });
    };

    const isBackendProcessing = (isAuthenticated && isConversationsLoading) && messages.length === 0;
  

  return (
    <>
    <div className={`flex w-full flex-1 flex-col px-4 overflow-hidden h-full ${className}`}>    

      {/* Error Messages */}
      {connectionError && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {connectionError}
          </p>
        </div>
      )}

      {/* Messages Area */}
      <div 
        id="messages" 
        className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth ${messagesClassName}`}
        ref={chatContainerRef}
      >
        {/* Backend Processing Skeleton */}
        {isBackendProcessing && (
          <div className="space-y-6 p-4 sm:p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`flex animate-pulse items-end gap-3 sm:gap-4 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                >
                  {i % 2 !== 0 && (
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200/80 dark:bg-slate-700/80"></div>
                  )}
                  <div
                    className={`w-3/5 rounded-2xl p-4 ${
                      i % 2 === 0 
                        ? "rounded-br-none bg-gradient-to-br from-purple-400/50 to-indigo-500/50" 
                        : "rounded-bl-none bg-slate-200/80 dark:bg-slate-700/80"
                    }`}
                  >
                    <div
                      className={`mb-2 h-4 rounded ${
                        i % 2 === 0 
                          ? "bg-purple-300/50 dark:bg-purple-600/50" 
                          : "bg-slate-300/50 dark:bg-slate-600/50"
                      } w-3/4`}
                    ></div>
                    <div
                      className={`h-4 rounded ${
                        i % 2 === 0 
                          ? "bg-purple-300/50 dark:bg-purple-600/50" 
                          : "bg-slate-300/50 dark:bg-slate-600/50"
                      } w-full`}
                    ></div>
                  </div>
                  {i % 2 === 0 && (
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200/80 dark:bg-slate-700/80"></div>
                  )}
                </div>
              ))}
            </div>
        )}

        {/* Empty State */}
        {!isBackendProcessing && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="mb-6 relative"
              >
                <div className="relative p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-purple-100/80 to-indigo-100/80 dark:from-purple-900/30 dark:to-indigo-900/30 backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 sm:h-16 sm:w-16 text-purple-600 dark:text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="space-y-3"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-200">{welcomeMessage}</h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">{welcomeSubtitle}</p>
              </motion.div>
              
              {/* Clear conversation button - only show if there are messages */}
              {messages.length > 0 && onClearConversation && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={onClearConversation}
                  className="mt-6 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200"
                >
                  Clear Conversation
                </motion.button>
              )}
            </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const contentHash =
              message.content.length > 0
                ? message.content
                    .split("")
                    .reduce(
                      (acc, char) =>
                        (acc * 31 + char.charCodeAt(0)) & 0xffffffff,
                      0,
                    )
                : 0;
            return (
              <motion.div
                key={`${message.timestamp}-${message.role}-${contentHash}`}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              >
                <ChatMessageItem 
                  message={message} 
                  onOpenQuizModal={() => setIsQuizModalOpen(true)}
                  onGoalTemplateClick={onGoalTemplateClick}
                  disableMsgParse={disableMsgParse}
                />
              </motion.div>
            );
          })}

          {/* Loading Message */}
          {isSendingMessage && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
            >
              <div className="flex justify-start">
                <div className="flex items-center gap-3 sm:gap-4 max-w-[70%] sm:max-w-[65%]">
                  <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shrink-0">
                    {agentIcon || iconContainer("size-6")}
                  </div>
                  <div className="bg-white/90 dark:bg-slate-700/90 rounded-2xl rounded-bl-md p-4 shadow-sm border border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      {loadingDuration >= MAX_TIME_TO_SHOW_LOADING ? (
                        <div className="text-slate-600 dark:text-slate-300 text-sm animate-pulse">
                          {loadingMessage}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.3s]"></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.15s]"></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestedResponses.length > 0 && (
        <ChatSuggestions
          suggestions={suggestedResponses}
          onSuggestionClick={handleSuggestionClick}
          isSendingMessage={isSendingMessage||isConversationMaxedOut}
        />
      )}

      {/* Input */}
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isSendingMessage||isConversationMaxedOut} 
        isMaxedOut={isConversationMaxedOut}
      />
    </div>
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
         onDashboardCreated={handleDashboardCreated}
       />
     )}
   </Modal>

   {/* Signup Modal (for educator interface) */}
   {chatConfig.enableSignupPrompt && (
     <Modal
       isOpen={showSignupPrompt}
       onClose={() => setShowSignupPrompt(false)}
       disableOverlayClick={true}
       overlayClassName="bg-black/40"
       contentClassName="relative flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-primary/30 shadow-2xl w-[90vw] max-w-md mx-auto pointer-events-auto"
     >
       <div className="flex flex-col items-center w-full">
         <div className="mb-4 flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/80 to-primary/50 rounded-full shadow-lg">
           {/* We'll need to import FontAwesome or use a different icon */}
           <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
             <path d="M12 14l9-5-9-5-9 5 9 5z"/>
             <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
           </svg>
         </div>
         <h2 className="text-2xl font-bold text-primary mb-2 text-center drop-shadow-sm">
           Your personalized lesson is ready!
         </h2>
         <p className="text-gray-700 dark:text-gray-200 mb-3 text-center text-base font-medium">
           Register a free account to view this personalized lesson and access more features.
         </p>
         <div className="w-full flex flex-col gap-2">
           <button 
             onClick={() => {
               // Trigger the signup prompt callback to handle navigation
               chatConfig.onSignupPromptShow?.();
               setShowSignupPrompt(false);
             }}
             className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg hover:bg-primary/90 transition"
           >
             Register for Free
           </button>
         </div>
       </div>
     </Modal>
   )}
    </>
  );
};