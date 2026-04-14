"use client";

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatMessageItem } from "./chat-message-item";
import { ChatSuggestions } from "./chat-suggestions";
import { ChatInput } from "./chat-input";
import logo from "@/assets/images/icon.svg";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { getPredictedResponses } from "@/services/conversation-service";
import { supabase } from "@/lib/supabase";
import { GoalType } from "../goal-tracker/types";
import { useAuth } from "@/contexts/auth-context";
import { useChatContext } from "@/contexts/chat-context";
import { useSubscription } from "@/hooks/use-subscription";
import { useAvatar } from "@/hooks/use-avatar";
import { useLocation } from "@tanstack/react-router";
import FinancialHealthQuiz from "../financial-health/FinancialHealthQuiz";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { useAIChat } from "@/contexts/ai-chat-context";
import {
  FinancialHealthProfile,
  useFinancialHealthProfile,
} from "@/hooks/use-financial-health-profile";
import {
  useUserGoals,
  createAllGoalsContext,
  GoalContextSummary,
} from "@/hooks/goal-tracker/use-user-goals";
import { AI_ROLES, AI_ROLE } from "./ai-roles";
import { BetaPill } from "../ui/beta-pill";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

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
  agentName: string;
  agentIcon: React.ReactNode;

  // External loading state (for custom message handlers)
  externalIsLoading?: boolean;
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

export const iconContainer = (
  size: string = "size-6 sm:size-8",
  iconSrc?: string,
  responsive: boolean = true,
) => {
  const containerSize = responsive ? "h-8 w-8 sm:h-10 sm:w-10" : "h-10 w-10";
  return (
    <div
      className={`relative flex items-center justify-center ${containerSize} bg-primary flex-shrink-0 rounded-full`}
    >
      <OptimizedImage
        src={iconSrc || logo}
        alt="AI Assistant"
        className={size}
      />
    </div>
  );
};

// Self-contained Loading Message Component with internal timer
const LoadingMessage = React.memo<{
  isSendingMessage: boolean;
  enableLoadingDuration?: boolean;
  agentIcon: string;
  agentName: string;
}>(
  ({
    isSendingMessage,
    enableLoadingDuration = false,
    agentIcon,
    agentName,
  }) => {
    const [loadingDuration, setLoadingDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Internal timer that doesn't affect parent component
    useEffect(() => {
      if (isSendingMessage && enableLoadingDuration) {
        setLoadingDuration(0);
        timerRef.current = setInterval(() => {
          setLoadingDuration((prev) => prev + 1);
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
        <div className="flex max-w-[75%] items-center gap-2 sm:max-w-[70%] sm:gap-3 md:max-w-[65%] md:gap-4">
          <OptimizedImage
            src={agentIcon}
            alt={agentName || "AI Assistant"}
            className="size-8 flex-shrink-0 sm:size-10"
          />
          <div className="bg-card rounded-2xl rounded-bl-md border p-3 shadow-sm sm:p-4">
            <div className="flex items-center space-x-3">
              {enableLoadingDuration &&
              loadingDuration >= MAX_TIME_TO_SHOW_LOADING ? (
                <div className="text-muted-foreground-color animate-pulse text-xs sm:text-sm">
                  {loadingMessage}
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full sm:h-2 sm:w-2"></div>
                  <div className="bg-primary/80 h-1.5 w-1.5 animate-pulse rounded-full sm:h-2 sm:w-2"></div>
                  <div className="bg-primary/60 h-1.5 w-1.5 animate-pulse rounded-full sm:h-2 sm:w-2"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

LoadingMessage.displayName = "LoadingMessage";

// Optimized Messages List Component with better memoization
const MessagesList = React.memo<{
  messages: ConversationMessage[];
  onOpenQuizModal: () => void;
  onGoalTemplateClick?: (goalType: GoalType) => void;
  disableMsgParse: boolean;
  onSendMessage: (
    content: string,
    manual_profile?: Pick<
      FinancialHealthProfile,
      "profile_description" | "profile_data"
    >,
  ) => Promise<void>;
  agentIcon?: any;
  agentName?: string;
  userAvatarUrl?: string | null;
  isUserAvatarLoading?: boolean;
  user?: any;
  isActive?: boolean;
}>(
  ({
    messages,
    onOpenQuizModal,
    onGoalTemplateClick,
    disableMsgParse,
    onSendMessage,
    agentIcon,
    agentName,
    userAvatarUrl,
    isUserAvatarLoading,
    user,
    isActive,
  }) => {
    const memoizedMessages = useMemo(() => {
      return messages.map((message) => {
        // More efficient hash calculation
        const contentHash =
          message.content.length > 0
            ? message.content
                .split("")
                .reduce(
                  (acc, char) => (acc * 31 + char.charCodeAt(0)) & 0xffffffff,
                  0,
                )
            : 0;
        return { ...message, contentHash };
      });
    }, [messages]);

    return (
      <AnimatePresence initial={false} mode="popLayout">
        {memoizedMessages.map((message) => (
          <motion.div
            key={`${message.timestamp}-${message.role}-${message.contentHash}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            layout
          >
            <ChatMessageItem
              message={message}
              onOpenQuizModal={onOpenQuizModal}
              onGoalTemplateClick={onGoalTemplateClick}
              disableMsgParse={disableMsgParse}
              onSendMessage={onSendMessage}
              agentIcon={agentIcon}
              agentName={agentName}
              userAvatarUrl={userAvatarUrl}
              isUserAvatarLoading={isUserAvatarLoading}
              user={user}
              isActive={isActive}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.messages.length === nextProps.messages.length &&
      prevProps.disableMsgParse === nextProps.disableMsgParse &&
      prevProps.agentIcon === nextProps.agentIcon &&
      prevProps.agentName === nextProps.agentName &&
      prevProps.userAvatarUrl === nextProps.userAvatarUrl &&
      prevProps.isUserAvatarLoading === nextProps.isUserAvatarLoading &&
      prevProps.user?.id === nextProps.user?.id &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.messages.every(
        (msg, index) =>
          msg.content === nextProps.messages[index]?.content &&
          msg.timestamp === nextProps.messages[index]?.timestamp,
      )
    );
  },
);

MessagesList.displayName = "MessagesList";

export const ChatConversationDisplay: React.FC<
  ChatConversationDisplayProps
> = ({
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
  agentName,
  externalIsLoading,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  const { user } = useAuth();
  const { closeChat } = useAIChat();
  const { isActive } = useSubscription(user?.id || "");
  const { avatarUrl, isAvatarLoading } = useAvatar();
  const location = useLocation();
  const isAuthenticated = !!user;

  // Chat context - primary source of truth
  const { getMessages, isSendingMessage, sendMessage, isConversationLoaded } =
    useChatContext();

  // Get messages from context
  const messages = chatConfig.useExternalMessages
    ? chatConfig.externalMessages || []
    : getMessages(aiRole);
  const isLoading = chatConfig.useExternalMessages
    ? externalIsLoading || false
    : isSendingMessage(aiRole);

  // State management for UI only
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([
    ...(initialSuggestedResponses || []),
  ]);

  // Load financial health profile for authenticated users
  const { profile } = useFinancialHealthProfile(user?.id);

  // Load user goals for Financial Advisor mode
  const { data: userGoals } = useUserGoals();

  // Check if this is Financial Advisor mode
  const isFinancialAdvisorMode = aiRole === AI_ROLES.FINANCIAL_ADVISOR;

  // Memoized shared handlers
  const handleSignupClick = useCallback(() => {
    setShowSignupPrompt(false);
    navigate?.({ to: "/register", search: { redirect: "/dashboard" } });
  }, [navigate]);

  // Memoized conversation maxed out check
  const isConversationMaxedOut = useMemo(
    () =>
      location.pathname !== "/onboarding" && !isActive && messages.length >= 8,
    [location.pathname, isActive, messages.length],
  );

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

  // Memoized fetch suggestions - only recreate when message count changes
  const fetchSuggestions = useCallback(
    async (
      lastAssistantMessage: string,
      currentMessages: ConversationMessage[],
    ) => {
      try {
        const contextMessages = currentMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Add the final assistant message to context
        contextMessages.push({
          role: "assistant",
          content: lastAssistantMessage,
        });

        const suggestions = await getPredictedResponses(
          supabase,
          lastAssistantMessage,
          contextMessages,
        );
        setSuggestedResponses(suggestions);
      } catch (error) {
        setSuggestedResponses([]);
      }
    },
    [],
  ); // Remove messages dependency to prevent recreations

  // Optimized auto-scroll effect - only trigger on message count change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages.length, scrollToBottom]); // Only depend on message count, not entire messages array

  // Memoized send message function to prevent unnecessary recreations
  const handleSendMessage = useCallback(
    async (
      content: string,
      manual_profile?: Pick<
        FinancialHealthProfile,
        "profile_description" | "profile_data"
      >,
    ) => {
      if (!content.trim() || isLoading) return;

      // If using custom message handler (like goal tracker), delegate to it
      if (chatConfig.customMessageHandler) {
        try {
          await chatConfig.customMessageHandler(content);
        } catch (error) {
          setConnectionError(
            typeof error === "string"
              ? error
              : "Connection error. Please try again.",
          );
        }
        return;
      }

      setConnectionError(null);

      try {
        // Create goal context for Financial Advisor mode
        let goalContext: {
          totalGoals: number;
          activeGoals: number;
          totalProgress: number;
          goalsSummary: GoalContextSummary[];
        } | null = null;
        if (isFinancialAdvisorMode && userGoals && userGoals.length > 0) {
          goalContext = createAllGoalsContext(userGoals);
        }

        // Send message using context
        await sendMessage(aiRole, content, {
          profile: manual_profile || profile || undefined,
          goalContext,
        });

        // Note: All response handling is now managed through chat context
        // Goal functions, course updates, and signup prompts are handled by the backend
        // State changes are applied optimistically through context
      } catch (error) {
        console.error("Error sending message:", error);
        setConnectionError("Connection error. Please try again.");
      }
    },
    [
      isLoading,
      chatConfig.customMessageHandler,
      sendMessage,
      aiRole,
      isFinancialAdvisorMode,
      userGoals,
      profile,
    ],
  );

  // Memoized suggestion click handler
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setSuggestedResponses([]);
      handleSendMessage(suggestion);
    },
    [handleSendMessage],
  );

  // Optimized effect for fetching suggestions - pass messages as parameter
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        fetchSuggestions(lastMessage.content, messages);
      }
    }
  }, [
    messages.length > 0 ? messages[messages.length - 1]?.content : "",
    fetchSuggestions,
  ]); // Only depend on last message content

  // Memoized dashboard created handler
  const handleDashboardCreated = useCallback(
    async (
      profile: Pick<
        FinancialHealthProfile,
        "profile_description" | "profile_data"
      >,
    ) => {
      setIsQuizModalOpen(false);
      handleSendMessage("I've completed the questionnaire", profile);
      // Note: Dashboard data will be refreshed through normal user interactions
      // No React Query invalidations needed - SSR maintains state during navigation
    },
    [handleSendMessage],
  );

  // Memoized backend processing check
  const isBackendProcessing = useMemo(
    () =>
      isAuthenticated && !isConversationLoaded(aiRole) && messages.length === 0,
    [isAuthenticated, isConversationLoaded, aiRole, messages.length],
  );

  return (
    <>
      {/* Optional background wrapper - Flex container for maximum height utilization */}
      <div
        className={
          backgroundGradient || "flex h-full min-h-0 flex-col overflow-hidden"
        }
      >
        {/* Optional floating close button */}
        {chatConfig.showFloatingCloseButton && (
          <div className="absolute top-1.5 right-4 z-50">
            <button
              onClick={closeChat}
              className="group flex size-5 items-center justify-center transition-all duration-200"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}

        {/* Optional header */}
        {chatConfig.showHeader && headerTitle && (
          <div
            className={`flex-shrink-0 border-b ${headerBackgroundColors || "bg-card"}`}
          >
            <div className="px-6 py-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <h1 className={`text-md text-foreground font-bold`}>
                    {headerTitle}
                  </h1>
                  <BetaPill size="small" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Container - Optimized for maximum height utilization */}
        <div
          className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 ${className}`}
        >
          {/* Error Messages */}
          {connectionError && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {connectionError}
              </p>
            </div>
          )}

          {/* Messages Area - Maximum height utilization with proper scrolling */}
          <div
            id="messages"
            className={`scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-smooth p-3 sm:space-y-6 sm:p-4 md:p-6 ${messagesClassName}`}
            ref={chatContainerRef}
          >
            {/* Backend Processing Skeleton - Mobile responsive */}
            {isBackendProcessing && (
              <div className="space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`flex animate-pulse items-end gap-2 sm:gap-3 md:gap-4 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                  >
                    {i % 2 !== 0 && (
                      <div className="bg-subtle-background h-8 w-8 shrink-0 rounded-full sm:h-10 sm:w-10"></div>
                    )}
                    <div
                      className={`w-4/5 rounded-2xl p-3 sm:w-3/5 sm:p-4 ${i % 2 === 0 ? "bg-subtle-background rounded-br-none" : "bg-subtle-background rounded-bl-none"}`}
                    >
                      <div
                        className={`bg-subtle-background/70 mb-1.5 h-3 w-3/4 rounded sm:mb-2 sm:h-4`}
                      ></div>
                      <div
                        className={`bg-subtle-background/70 h-3 w-full rounded sm:h-4`}
                      ></div>
                    </div>
                    {i % 2 === 0 && (
                      <div className="bg-subtle-background h-8 w-8 shrink-0 rounded-full sm:h-10 sm:w-10"></div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State - Mobile optimized */}
            {!isBackendProcessing && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center sm:py-12 md:py-16">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative mb-4 sm:mb-6"
                >
                  <div className="bg-subtle-background relative rounded-2xl border p-3 sm:p-4 md:p-6">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-primary h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16"
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
                    <div className="bg-primary absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full sm:h-6 sm:w-6">
                      <span className="text-primary-foreground text-xs font-bold">
                        AI
                      </span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                  className="space-y-2 sm:space-y-3"
                >
                  <h3 className="text-foreground text-base font-semibold sm:text-lg md:text-xl">
                    {welcomeMessage}
                  </h3>
                  <p className="text-muted-foreground-color mx-auto max-w-sm text-sm leading-relaxed sm:max-w-md sm:text-base">
                    {welcomeSubtitle}
                  </p>
                </motion.div>

                {/* Clear conversation button - only show if there are messages */}
                {messages.length > 0 && onClearConversation && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    onClick={onClearConversation}
                    className="text-muted-foreground-color hover:text-foreground hover:bg-subtle-background/50 mt-6 rounded-xl border px-4 py-2 text-sm transition-colors duration-200"
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
              userAvatarUrl={avatarUrl}
              isUserAvatarLoading={isAvatarLoading}
              user={user}
              isActive={isActive}
            />

            {/* Loading Message */}
            <LoadingMessage
              isSendingMessage={isLoading}
              enableLoadingDuration={chatConfig.enableLoadingDuration || false}
              agentIcon={typeof agentIcon === "string" ? agentIcon : logo}
              agentName={agentName || "AI Assistant"}
            />
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {suggestedResponses.length > 0 && (
            <ChatSuggestions
              suggestions={suggestedResponses}
              onSuggestionClick={handleSuggestionClick}
              isSendingMessage={isLoading || isConversationMaxedOut}
            />
          )}

          {/* Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading || isConversationMaxedOut}
            isMaxedOut={isConversationMaxedOut}
            agentName={agentName}
          />
        </div>

        {/* Optional footer */}
        {chatConfig.showFooter && footerContent && (
          <div className="bg-card flex-shrink-0 border-t">
            <div className="px-3 pt-1.5 pb-1 text-center sm:px-6 sm:pt-2">
              <div className="text-muted-foreground-color flex flex-wrap items-center justify-center gap-2 text-xs sm:gap-4">
                {footerContent}
              </div>
              <span className="text-muted-foreground-color text-center text-xs">
                AI can make mistakes, consider double checking important
                information.
              </span>
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
          contentClassName="relative flex flex-col items-center justify-center p-8 bg-card rounded-2xl border border-primary/30 shadow-2xl w-[90vw] max-w-md mx-auto pointer-events-auto"
        >
          <div className="flex w-full flex-col items-center">
            <div className="from-primary/80 to-primary/50 mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br shadow-lg">
              {signupModalConfig.icon}
            </div>
            <h2 className="text-primary mb-2 text-center text-2xl font-bold drop-shadow-sm">
              {signupModalConfig.title}
            </h2>
            <p className="text-muted-foreground mb-3 text-center text-base font-medium">
              {signupModalConfig.description}
            </p>
            <div className="flex w-full flex-col gap-2">
              <Button
                className="!bg-primary hover:!bg-primary/90 w-full !rounded-xl !py-3 !font-bold !text-white !shadow-lg transition"
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
