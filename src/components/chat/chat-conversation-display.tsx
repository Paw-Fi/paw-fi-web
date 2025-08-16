"use client";

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { ChatMessageItem } from "./chat-message-item";
import { ChatSuggestions } from "./chat-suggestions";
import { ChatInput } from './chat-input';
import logo from "@/assets/images/icon.svg";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { getPredictedResponses } from '@/services/conversation-service';
import { supabase } from '@/lib/supabase';
import { GoalType } from '../goal-tracker/types';
import { useAuth } from '@/contexts/auth-context';
import { useChatContext } from '@/contexts/chat-context';
import { useSubscription } from '@/hooks/use-subscription';
import { useLocation } from '@tanstack/react-router';
import FinancialHealthQuiz from '../financial-health/FinancialHealthQuiz';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { useAIChat } from '@/contexts/ai-chat-context';
import { FinancialHealthProfile, useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import { useUserGoals, createAllGoalsContext } from '@/hooks/goal-tracker/use-user-goals';
import { AI_ROLES, AI_ROLE } from './ai-roles';
import { BetaPill } from '../ui/beta-pill';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export interface ConversationMessage {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ChatConfig {
  enableGuestSessions?: boolean;
  enableSignupPrompt?: boolean;
  enableLoadingDuration?: boolean;
  onSignupPromptShow?: () => void;
  onGuestSessionUpdate?: (sessionId: string, courseId?: string) => void;
  // For goal tracker - use external message handler and existing messages
  useExternalMessages?: boolean;
  externalMessages?: ConversationMessage[];
  customMessageHandler?: (content: string) => Promise<void>;
  // UI customization
  showHeader?: boolean;
  showFooter?: boolean;
  showFloatingCloseButton?: boolean;
  showSignupModal?: boolean;
}

interface ChatConversationDisplayProps {
  // AI Role - required
  aiRole: AI_ROLE;
  
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
  messagesClassName?: string;
  
  // Header/Footer customization
  headerTitle?: string;
  headerGradientColors?: string;
  headerBackgroundColors?: string;
  backgroundGradient?: string;
  footerContent?: React.ReactNode;
  signupModalConfig?: {
    icon: React.ReactNode;
    title: string;
    description: string;
    buttonText: string;
  };
}

export const iconContainer = (size: string = "size-8", iconSrc?: string) => {
  return (
    <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
      <OptimizedImage src={iconSrc || logo} alt="AI Assistant" className={size} />
    </div>
  );
};

// Simple loading state hook - no timer logic to prevent parent rerenders
const useSimpleLoadingState = () => {
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const startLoading = useCallback(() => {
    setIsSendingMessage(true);
  }, []);
  
  const stopLoading = useCallback(() => {
    setIsSendingMessage(false);
  }, []);
  
  return {
    isSendingMessage,
    startLoading,
    stopLoading
  };
};

// Self-contained Loading Message Component with internal timer
const LoadingMessage = React.memo<{
  isSendingMessage: boolean;
  enableLoadingDuration?: boolean;
  agentIcon: string;
  agentName: string;
}>(({ isSendingMessage, enableLoadingDuration = false, agentIcon, agentName }) => {
  const [loadingDuration, setLoadingDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Internal timer that doesn't affect parent component
  useEffect(() => {
    if (isSendingMessage && enableLoadingDuration) {
      setLoadingDuration(0);
      timerRef.current = setInterval(() => {
        setLoadingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setLoadingDuration(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSendingMessage, enableLoadingDuration]);
  
  const loadingMessage = useMemo(() => {
    const MAX_TIME = 15;
    if (loadingDuration >= MAX_TIME + 45) {
      return "Almost done! Polishing the final reply";
    } else if (loadingDuration >= MAX_TIME + 30) {
      return "Organizing my ideas.. ✨";
    } else if (loadingDuration >= MAX_TIME + 15) {
      return "Searching for the best answer...";
    } else if (loadingDuration >= MAX_TIME) {
      return "Gathering thoughts...";
    }
    return "Gathering thoughts...";
  }, [loadingDuration]);
  
  if (!isSendingMessage) {
    return null;
  }
  
  const MAX_TIME_TO_SHOW_LOADING = 9;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
    >
      <div className="flex items-center gap-3 sm:gap-4 max-w-[70%] sm:max-w-[65%]">
        <OptimizedImage src={agentIcon} alt={agentName || "AI Assistant"} className="size-10" />
        <div className="bg-white/90 dark:bg-slate-700/90 rounded-2xl rounded-bl-md p-4 shadow-sm border border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            {enableLoadingDuration && loadingDuration >= MAX_TIME_TO_SHOW_LOADING ? (
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
    </motion.div>
  );
});

LoadingMessage.displayName = 'LoadingMessage';

// Memoized Messages List Component
const MessagesList = React.memo<{
  messages: ConversationMessage[];
  onOpenQuizModal: () => void;
  onGoalTemplateClick?: (goalType: GoalType) => void;
  disableMsgParse: boolean;
  onSendMessage: (content: string, manual_profile?: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => Promise<void>;
  agentIcon?: any;
  agentName?: string;
}>(({ messages, onOpenQuizModal, onGoalTemplateClick, disableMsgParse, onSendMessage, agentIcon, agentName }) => {
  const memoizedMessages = useMemo(() => {
    return messages.map((message) => {
      const contentHash = message.content.length > 0
        ? message.content.split("").reduce(
            (acc, char) => (acc * 31 + char.charCodeAt(0)) & 0xffffffff,
            0
          )
        : 0;
      return { ...message, contentHash };
    });
  }, [messages]);
  
  return (
    <AnimatePresence initial={false}>
      {memoizedMessages.map((message) => (
        <motion.div
          key={`${message.timestamp}-${message.role}-${message.contentHash}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChatMessageItem
            message={message}
            onOpenQuizModal={onOpenQuizModal}
            onGoalTemplateClick={onGoalTemplateClick}
            disableMsgParse={disableMsgParse}
            onSendMessage={onSendMessage}
            agentIcon={agentIcon}
            agentName={agentName}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
});

MessagesList.displayName = 'MessagesList';

export const ChatConversationDisplay: React.FC<ChatConversationDisplayProps> = ({
  aiRole,
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
  messagesClassName = "",
  headerTitle,
  headerGradientColors,
  headerBackgroundColors,
  backgroundGradient,
  footerContent,
  signupModalConfig,
  agentName
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  const { user } = useAuth();
  const { closeChat } = useAIChat();
  const { isActive } = useSubscription(user?.id || '');
  const location = useLocation();
  const isAuthenticated = !!user;

  // Chat context - primary source of truth
  const {
    getMessages,
    isSendingMessage,
    sendMessage,
    isConversationLoaded
  } = useChatContext();

  // Get messages from context
  const messages = chatConfig.useExternalMessages ? (chatConfig.externalMessages || []) : getMessages(aiRole);
  const isLoading = isSendingMessage(aiRole);
  
  // State management for UI only
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([
    ...initialSuggestedResponses || []
  ]);
  
  // Load financial health profile for authenticated users
  const { profile } = useFinancialHealthProfile(user?.id);
  
  // Load user goals for Financial Advisor mode
  const { data: userGoals } = useUserGoals();
  
  // Check if this is Financial Advisor mode
  const isFinancialAdvisorMode = aiRole === AI_ROLES.FINANCIAL_ADVISOR;
  
  // Shared handlers
  const handleSignupClick = () => {
    setShowSignupPrompt(false);
    navigate?.({ to: "/register", search: { redirect: "/dashboard" } });
  };

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
  
  // Memoized fetch suggestions to prevent unnecessary recreations
  const fetchSuggestions = useCallback(async (lastAssistantMessage: string) => {
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
  }, [messages]);

  // Auto-scroll effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Send message function - simplified using context
  const handleSendMessage = async (content: string, manual_profile?: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => {
    if (!content.trim() || isLoading) return;
    
    // If using custom message handler (like goal tracker), delegate to it
    if (chatConfig.customMessageHandler) {
      try {
        await chatConfig.customMessageHandler(content);
      } catch (error) {
        setConnectionError(typeof error === 'string' ? error : 'Connection error. Please try again.');
      }
      return;
    }
    
    setConnectionError(null);
    
    try {
      // Create goal context for Financial Advisor mode
      let goalContext = null;
      if (isFinancialAdvisorMode && userGoals && userGoals.length > 0) {
        goalContext = createAllGoalsContext(userGoals);
      }
      
      // Send message using context
      await sendMessage(aiRole, content, {
        profile: manual_profile || profile || undefined,
        goalContext
      });
      
      // Note: All response handling is now managed through chat context
      // Goal functions, course updates, and signup prompts are handled by the backend
      // State changes are applied optimistically through context
      
    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionError("Connection error. Please try again.");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestedResponses([]);
    handleSendMessage(suggestion);
  };

  // Optimized effect for fetching suggestions
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        fetchSuggestions(lastMessage.content);
      }
    }
  }, [messages, fetchSuggestions]);

  const handleDashboardCreated = async (profile: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => {
    setIsQuizModalOpen(false);
    handleSendMessage("I've completed the questionnaire", profile);
    // Note: Dashboard data will be refreshed through normal user interactions
    // No React Query invalidations needed - SSR maintains state during navigation
  };

  const isBackendProcessing = isAuthenticated && !isConversationLoaded(aiRole) && messages.length === 0;

  return (
    <>
      {/* Optional background wrapper */}
      <div className={backgroundGradient || "h-full flex flex-col"}>
        {/* Optional floating close button */}
        {chatConfig.showFloatingCloseButton && (
          <div className="absolute top-1.5 right-4 z-50">
            <button
              onClick={closeChat}
              className="size-5  transition-all duration-200 flex items-center justify-center group"
            >
            <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}

        {/* Optional header */}
        {chatConfig.showHeader && headerTitle && (
          <div className={`flex-shrink-0 border-b border-slate-200 dark:border-slate-700 ${headerBackgroundColors || "bg-gradient-to-r from-white to-emerald-50 dark:from-slate-800 dark:to-slate-700"}`}>
            <div className="px-6 py-2">
              <div className="text-center">
               <div className='flex items-center justify-center gap-1'>
               <h1 className={`text-md font-bold ${headerGradientColors || "bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-900 dark:from-white dark:via-emerald-200 dark:to-teal-100"} bg-clip-text text-transparent`}>
                  {headerTitle}
                </h1>
                <BetaPill size="small"/>
                </div>
               
              </div>
            </div>
          </div>
        )}

        {/* Chat Container */}
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
        <MessagesList
          messages={messages}
          onOpenQuizModal={() => setIsQuizModalOpen(true)}
          onGoalTemplateClick={onGoalTemplateClick}
          disableMsgParse={disableMsgParse}
          onSendMessage={handleSendMessage}
          agentIcon={agentIcon}
          agentName={agentName}
        />

        {/* Loading Message */}
        <LoadingMessage
          isSendingMessage={isLoading}
          enableLoadingDuration={chatConfig.enableLoadingDuration || false}
          agentIcon={typeof agentIcon === 'string' ? agentIcon : logo}
          agentName={agentName || 'AI Assistant'}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestedResponses.length > 0 && (
        <ChatSuggestions
          suggestions={suggestedResponses}
          onSuggestionClick={handleSuggestionClick}
          isSendingMessage={isLoading||isConversationMaxedOut}
        />
      )}

      {/* Input */}
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading||isConversationMaxedOut} 
        isMaxedOut={isConversationMaxedOut}
      />
        </div>

        {/* Optional footer */}
        {chatConfig.showFooter && footerContent && (
          <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
            <div className="px-6 pt-2 pb-1 text-center">
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                {footerContent}
              </div>
              <span className="text-xs text-center text-slate-400 dark:text-slate-400">AI can make mistakes, consider double checking important information.</span>
            </div>
          </div>
        )}
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

   {/* Configurable Signup Modal */}
   {chatConfig.showSignupModal && signupModalConfig && (
     <Modal
       isOpen={showSignupPrompt}
       onClose={() => setShowSignupPrompt(false)}
       disableOverlayClick={true}
       overlayClassName="bg-black/40"
       contentClassName="relative flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-primary/30 shadow-2xl w-[90vw] max-w-md mx-auto pointer-events-auto"
     >
       <div className="flex flex-col items-center w-full">
         <div className="mb-4 flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/80 to-primary/50 rounded-full shadow-lg">
           {signupModalConfig.icon}
         </div>
         <h2 className="text-2xl font-bold text-primary mb-2 text-center drop-shadow-sm">
           {signupModalConfig.title}
         </h2>
         <p className="text-gray-700 dark:text-gray-200 mb-3 text-center text-base font-medium">
           {signupModalConfig.description}
         </p>
         <div className="w-full flex flex-col gap-2">
           <Button 
             fullWidth 
             className="!bg-primary !text-white !font-bold !py-3 !rounded-xl !shadow-lg hover:!bg-primary/90 transition"
             onClick={handleSignupClick}
           >
             {signupModalConfig.buttonText}
           </Button>
         </div>
       </div>
     </Modal>
   )}
    </>
  );
};