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
          />
        ) : (
          <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0 bg-subtle-background">
            <FontAwesomeIcon
              icon={faUser}
              className="size-3 sm:size-4 text-muted-foreground-color"
            />
          </div>
        )
      ) : (
        agentIcon ? <OptimizedImage src={agentIcon} alt={agentName || "Agent"} className="size-8 sm:size-10 flex-shrink-0" /> : iconContainer("size-5 sm:size-6", undefined, true)
      )
     }
    </div>
  );

  const MessageBubble = ({ children }: { children: React.ReactNode }) => (
    <div
      className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] xl:max-w-[60%] rounded-2xl px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${
        isUser
          ? "bg-primary text-primary-foreground rounded-br-md ml-auto"
          : "bg-card text-foreground rounded-bl-md border shadow-sm"
      }`}>
      {children}
      <div className={`mt-1.5 sm:mt-2 text-xs ${isUser ? "text-right text-primary-foreground/80" : "text-left text-muted-foreground-color"}`}>
        {(formatTimeProp || defaultFormatTime)(message.timestamp)}
        {message.metadata?.isStreaming && !isUser && (
          <span className="ml-1.5 sm:ml-2 inline-flex items-center">
            <div className="animate-pulse w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full"></div>
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
    <div className={`flex items-end gap-2 sm:gap-3 md:gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Avatar />}
      <MessageBubble>{renderMessageContent}</MessageBubble>
      {isUser && <Avatar />}
    </div>
  );
};

export const ChatMessageItem = React.memo(ChatMessageItemComponent);