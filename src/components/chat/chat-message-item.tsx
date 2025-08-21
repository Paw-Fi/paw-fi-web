"use client";

import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { useEffect } from "react";
import { iconContainer } from "./chat-conversation-display";
import { formatTime as defaultFormatTime } from "@/utils/sanitize-course";
import { GoalType } from "../goal-tracker/types";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { OptimizedImage } from "../seo/optimized-image";
import { UserAvatar } from "@/components/ui/user-avatar";

interface Message {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  metadata?: Record<string, any>;
}

interface ChatMessageItemProps {
  message: Message;
  onOpenQuizModal?: () => void;
  onGoalTemplateClick?: (goalType: GoalType) => void;
  formatTime?: (timestamp: number) => string;
  disableMsgParse?: boolean;
  onSendMessage?: (message: string) => void;
  agentIcon?: string;
  agentName?: string;
  userAvatarUrl?: string | null;
  isUserAvatarLoading?: boolean;
  user?: any;
  isActive?: boolean;
}

const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  message,
  onOpenQuizModal,
  onGoalTemplateClick,
  formatTime: formatTimeProp,
  disableMsgParse = false,
  onSendMessage,
  agentIcon,
  agentName,
  userAvatarUrl,
  isUserAvatarLoading,
  user,
  isActive,
}) => {
  const isUser = message.role === "user";
  // user is already passed as prop, no need to get it from useAuth
  const { hasProfile, refetch: refetchProfile } = useFinancialHealthProfile(user?.id);


  useEffect(() => {
    if (isUser && message.content.toLowerCase().includes("completed the questionnaire") && user?.id) {
      setTimeout(() => {
        refetchProfile();
      }, 1000);
    }
  }, [message.content, isUser, user?.id, refetchProfile]);

  const Avatar = () => (
    <div>
     {
      isUser ? (
        user ? (
          <UserAvatar
            size="md"
            showPremiumBorder={true}
            showPremiumCrown={true}
          />
        ) : (
          <div className="flex items-center justify-center h-10 w-10 rounded-full shrink-0 bg-[#F9F9F9] dark:bg-slate-600">
            <FontAwesomeIcon
              icon={faUser}
              className="size-4 text-slate-500 dark:text-slate-300"
            />
          </div>
        )
      ) : (
        agentIcon ? <OptimizedImage src={agentIcon} alt={agentName || "Agent"} className="size-10" /> : iconContainer("size-6")
      )
     }
    </div>
  );

  const MessageBubble = ({ children }: { children: React.ReactNode }) => (
    <div
      className={`relative max-w-[75%] sm:max-w-[70%] md:max-w-[65%] lg:max-w-[60%] rounded-2xl px-4 sm:px-5 py-3 sm:py-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${
        isUser
          ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-br-md ml-auto"
          : "bg-white/90 dark:bg-slate-700/90 text-slate-800 dark:text-slate-100 rounded-bl-md border border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm"
      }`}>
      {children}
      <div className={`mt-2 text-xs ${isUser ? "text-right text-purple-200/80" : "text-left text-slate-400 dark:text-slate-500"}`}>
        {(formatTimeProp || defaultFormatTime)(message.timestamp)}
        {message.metadata?.isStreaming && !isUser && (
          <span className="ml-2 inline-flex items-center">
            <div className="animate-pulse w-2 h-2 bg-emerald-400 rounded-full"></div>
          </span>
        )}
      </div>
    </div>
  );



  const renderMessageContent = useMemo(() => (
    <MarkdownRenderer
      content={message.content}
      className={isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}
      onOpenQuizModal={onOpenQuizModal}
      onGoalTemplateClick={onGoalTemplateClick}
      onSendMessage={onSendMessage}
      disableMessageParsing={disableMsgParse}
      isUserMessage={isUser}
    />
  ), [message.content, isUser, onOpenQuizModal, onGoalTemplateClick, onSendMessage, disableMsgParse]);

  return (
    <div className={`flex items-end gap-3 sm:gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Avatar />}
      <MessageBubble>{renderMessageContent}</MessageBubble>
      {isUser && <Avatar />}
    </div>
  );
};

export const ChatMessageItem = React.memo(ChatMessageItemComponent);