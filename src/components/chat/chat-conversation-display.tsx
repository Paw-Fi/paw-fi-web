"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { ChatMessageItem } from "./chat-message-item";
import { ChatSuggestions } from "./chat-suggestions";
import { ChatInput } from './chat-input';
import logo from "@/assets/images/icon.svg";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { getPredictedResponses } from '@/services/conversation-service';
import { supabase } from '@/lib/supabase';
import { GoalType } from '../goal-tracker/types';

export interface ConversationMessage {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface ChatConversationDisplayProps {
  messages: ConversationMessage[];
  onMessageSend: (content: string) => Promise<void> | void;
  isSendingMessage?: boolean;
  
  // Optional customization
  agentName?: string;
  agentIcon?: React.ReactNode;
  welcomeMessage?: string;
  welcomeSubtitle?: string;

  
  // Error handling
  connectionError?: string;
  mergeError?: string;
  
  // Loading states
  isBackendProcessing?: boolean;
  loadingDuration?: number;
  
  // Voice modal (optional)
  onOpenVoiceModal?: () => void;
  
  // Quiz modal (optional)  
  onOpenQuizModal?: () => void;
  
  // Goal template handling (for AI onboarding)
  onGoalTemplateClick?: (goalType: GoalType) => void;
  
  // Navigation
  navigate?: any;

  initialSuggestedResponses?: string[];
  
  // Clear conversation
  onClearConversation?: () => void;

  
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
  messages,
  onMessageSend,
  isSendingMessage = false,
  agentIcon,
  welcomeMessage = "Hi! I'm here to help you. Ask me anything to get started!",
  welcomeSubtitle = "Type a message below to begin our conversation.",
  connectionError,
  mergeError,
  isBackendProcessing = false,
  loadingDuration = 0,
  onOpenVoiceModal,
  onOpenQuizModal,
  onGoalTemplateClick,
  navigate,
  initialSuggestedResponses,
  onClearConversation,
  className = "",
  headerClassName = "",
  messagesClassName = ""
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
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

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestedResponses([]);
      onMessageSend(suggestion);
    
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
  

  return (
    <div className={`flex w-full flex-1 flex-col px-4 overflow-hidden h-full ${className}`}>    

      {/* Error Messages */}
      {(connectionError || mergeError) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {connectionError || mergeError}
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
                className={`flex animate-pulse items-end gap-3 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
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
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
            <div className="mb-4 rounded-full bg-white/30 p-4 backdrop-blur-md dark:bg-slate-800/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium">{welcomeMessage}</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">{welcomeSubtitle}</p>
            
            {/* Clear conversation button - only show if there are messages */}
            {messages.length > 0 && onClearConversation && (
              <button
                onClick={onClearConversation}
                className="mt-4 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Clear Conversation
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
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
                  onOpenQuizModal={onOpenQuizModal}
                  onGoalTemplateClick={onGoalTemplateClick}
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
                <div className="flex items-center gap-3 max-w-xs lg:max-w-md">
                  <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shrink-0">
                    {agentIcon || iconContainer("size-6")}
                  </div>
                  <div className="bg-white/80 dark:bg-slate-700 rounded-2xl p-4">
                    <div className="flex items-center space-x-3">
                      {loadingDuration >= MAX_TIME_TO_SHOW_LOADING ? (
                        <div className="text-slate-600 dark:text-slate-300 text-sm animate-pulse">
                          {loadingMessage}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.3s]"></div>
                          <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.15s]"></div>
                          <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400"></div>
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
          isSendingMessage={isSendingMessage}
        />
      )}

      {/* Input */}
      <ChatInput 
        onSendMessage={onMessageSend} 
        isLoading={isSendingMessage} 
      />
    </div>
  );
};