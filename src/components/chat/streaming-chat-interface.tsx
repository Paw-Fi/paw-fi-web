"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { ChatMessageItem } from "./chat-message-item";
import { ChatSuggestions } from "./chat-suggestions";
import { ChatInput } from './chat-input';
import { ChatSkeleton } from "../ui/chat-skeleton";
import logo from "@/assets/images/icon.svg";

export interface StreamingMessage {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface StreamingChatInterfaceProps {
  messages: StreamingMessage[];
  onMessageSend: (content: string) => Promise<void> | void;
  isLoading?: boolean;
  isSendingMessage?: boolean;
  isConversationsLoading?: boolean;
  
  // Agent customization
  agentName?: string;
  agentIcon?: React.ReactNode;
  welcomeMessage?: string;
  welcomeSubtitle?: string;
  
  // Suggestions
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  
  // Error handling
  connectionError?: string;
  
  // Navigation and modals (optional)
  navigate?: any;
  onOpenQuizModal?: () => void;
  
  // Styling
  className?: string;
  headerClassName?: string;
}

export const StreamingChatInterface: React.FC<StreamingChatInterfaceProps> = ({
  messages,
  onMessageSend,
  isLoading = false,
  isSendingMessage = false,
  isConversationsLoading = false,
  agentName = "AI Assistant",
  agentIcon,
  welcomeMessage = "Hi! I'm here to help you. Ask me anything to get started!",
  welcomeSubtitle = "Type a message below to begin our conversation.",
  suggestions = [],
  onSuggestionClick,
  connectionError,
  navigate,
  onOpenQuizModal,
  className = "",
  headerClassName = "",
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    if (shouldAutoScroll && chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  }, [shouldAutoScroll]);

  // Auto-scroll effect - scroll when new messages arrive or content updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom('smooth');
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Check if user has scrolled up manually to disable auto-scroll
  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isScrolledToBottom = 
        container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      setShouldAutoScroll(isScrolledToBottom);
    }
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else {
      onMessageSend(suggestion);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className={`flex w-full flex-1 flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-white/20 ${headerClassName}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            {agentIcon || (
              <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
                <img src={logo} alt="AI Assistant" className="size-6" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white/50" />
          </div>
          <div className="relative flex h-full flex-col">
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">{agentName}</h1>
          </div>
        </div>
      </div>

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
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {/* Conversations Loading Skeleton */}
        {isConversationsLoading && messages.length === 0 && (
          <ChatSkeleton 
            messageCount={4}
            colorScheme="purple"
          />
        )}

        {/* Empty State */}
        {messages.length === 0 && !isLoading && !isConversationsLoading && (
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
          </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            // Use stable key based on timestamp and role only - don't use content hash
            const key = `${message.timestamp}-${message.role}-${index}`;
            
            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              >
                <ChatMessageItem 
                  message={message} 
                  formatTime={formatTime}
                  navigate={navigate}
                  onOpenQuizModal={onOpenQuizModal}
                />
              </motion.div>
            );
          })}

          {/* Loading Message - only show if no streaming message exists */}
          {isLoading && !messages.some(msg => msg.metadata?.isStreaming) && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
            >
              <div className="flex justify-start">
                <div className="flex items-center gap-3 max-w-xs lg:max-w-md">
                  <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shrink-0">
                    {agentIcon || (
                      <img src={logo} alt="AI Assistant" className="size-6" />
                    )}
                  </div>
                  <div className="bg-white/80 dark:bg-slate-700 rounded-2xl p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.3s]"></div>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.15s]"></div>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400"></div>
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
      {suggestions.length > 0 && (
        <div className="px-4 sm:px-6 pb-2">
          <ChatSuggestions
            suggestions={suggestions}
            onSuggestionClick={handleSuggestionClick}
            isLoading={isLoading}
            isSendingMessage={isSendingMessage}
          />
        </div>
      )}

      {/* Input */}
      <div className="px-4 sm:px-6 pb-4">
        <ChatInput 
          onSendMessage={onMessageSend} 
          isLoading={isLoading || isSendingMessage} 
        />
      </div>
    </div>
  );
};