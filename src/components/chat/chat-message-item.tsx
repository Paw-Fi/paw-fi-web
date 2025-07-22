"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { CourseCard } from "@/components/ui/course-card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLightbulb, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { useEffect } from "react";
import { iconContainer } from "./chat-conversation-display";
import { extractFirstJson, formatTime as defaultFormatTime } from "@/utils/sanitize-course";

interface Message {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string; // Keeping as per original, map if needed for backend
  metadata?: Record<string, any>;
}

interface ChatMessageItemProps {
  message: Message;
  navigate?: (opts: { to: string }) => void;
  onOpenQuizModal?: () => void;
  formatTime?: (timestamp: number) => string;
}



const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  message,
  navigate,
  onOpenQuizModal,
  formatTime: formatTimeProp,
}) => {
  const isUser = message.role === "user";
  const { user } = useAuth();
  
  // Check if user has completed the financial assessment
  const { hasProfile, refetch: refetchProfile } = useFinancialHealthProfile(user?.id);

  const found = extractFirstJson(message.content);
  
  // Watch for quiz completion messages and refetch profile
  useEffect(() => {
    if (isUser && message.content.toLowerCase().includes("completed the questionnaire") && user?.id) {
      // Add a small delay then refetch profile to ensure it's been created
      setTimeout(() => {
        refetchProfile();
      }, 1000);
    }
  }, [message.content, isUser, user?.id, refetchProfile]);

  const Avatar = () => (
    <div
      className={`flex items-center justify-center h-10 w-10 rounded-full shrink-0 ${isUser ? "bg-[#F9F9F9] dark:bg-slate-600" : "bg-gradient-to-br from-purple-500 to-indigo-600"}`}>
     {
      isUser ? (
        <FontAwesomeIcon
        icon={isUser ? faUser : faLightbulb}
        className={`h-4 w-4 ${isUser ? "text-slate-500 dark:text-slate-300" : "text-white"}`}
      />
      ) : (
        iconContainer("size-6")
      )
     }
    </div>
  );

  const MessageBubble = ({ children }: { children: React.ReactNode }) => (
    <div
      className={`relative max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-4 py-3 shadow-md ${isUser
          ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-br-none"
          : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none"
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

  const renderMessageContent = () => {
    // Check if message contains QUESTIONNAIRE keyword
    const hasQuestionnaireKeyword = message.content.includes('``QUESTIONNAIRE``');
    
    if (found) {
      const { json, start, end } = found;
      const intro = message.content.slice(0, start).trim().replace("{{username}}", user?.user_metadata?.full_name|| "");
      const outro = message.content.slice(end).trim().replace("{{username}}", user?.user_metadata?.full_name|| "");
      return (
        <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}  >
          {intro && <ReactMarkdown>{intro}</ReactMarkdown>}
          <div className="my-3">
            <CourseCard
              title={json.title || ""}
              icon={json.icon || ""}
              description={json.description || ""}
              lessonCount={json.lesson_count || 0}
              onClick={() => navigate?.({ to: "/dashboard/learning" })}
            />
          </div>
          {outro && <ReactMarkdown>{outro}</ReactMarkdown>}
        </div>
      );
    }
    
    if (hasQuestionnaireKeyword && !isUser) {
      // Replace the QUESTIONNAIRE keyword with a button for assistant messages
      const messageText = message.content.replace(/``QUESTIONNAIRE``/g, '').replace("{{username}}", user?.user_metadata?.full_name|| "");
      
      return (
        <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
          <ReactMarkdown>{messageText.trim()}</ReactMarkdown>
          <div className="mt-3">
            <Button
              onClick={() => !hasProfile && onOpenQuizModal?.()}
              disabled={hasProfile}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                hasProfile
                  ? "bg-green-500 text-white cursor-default"
                  : "bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
              }`}
            >
              <FontAwesomeIcon icon={faClipboardCheck} className="h-4 w-4 mr-1" />
              {hasProfile ? "Assessment Completed ✓" : "Complete Financial Assessment"}
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
        <ReactMarkdown>{message.content.trim().replace("{{username}}", user?.user_metadata?.full_name|| "")}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={`flex items-end gap-3 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Avatar />}
      <MessageBubble>{renderMessageContent()}</MessageBubble>
      {isUser && <Avatar />}
    </div>
  );
};

export const ChatMessageItem = React.memo(ChatMessageItemComponent);
