"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { CourseCard } from "@/components/ui/course-card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { iconContainer } from "./chat-interface";

interface Message {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string; // Keeping as per original, map if needed for backend
  metadata?: Record<string, any>;
}

interface ChatMessageItemProps {
  message: Message;
  formatTime: (timestamp: number) => string;
  extractFirstJson: (text: string) => { json: any; start: number; end: number } | null;
  navigate: (opts: { to: string }) => void;
}

const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  message,
  formatTime,
  extractFirstJson,
  navigate,
}) => {
  const isUser = message.role === "user";

  const found = extractFirstJson(message.content);

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
          : "bg-[#F9F9F9] dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none"
        }`}>
      {children}
      <div className={`mt-2 text-xs ${isUser ? "text-right text-purple-200/80" : "text-left text-slate-400 dark:text-slate-500"}`}>
        {formatTime(message.timestamp)}
      </div>
    </div>
  );

  const renderMessageContent = () => {
    if (found) {
      const { json, start, end } = found;
      const intro = message.content.slice(0, start).trim();
      const outro = message.content.slice(end).trim();
      return (
        <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}  >
          {intro && <ReactMarkdown>{intro}</ReactMarkdown>}
          <div className="my-3">
            <CourseCard
              title={json.title || ""}
              icon={json.icon || ""}
              description={json.description || ""}
              lessonCount={json.lesson_count || 0}
              onClick={() => navigate({ to: "/learning" })}
              isEmbedded={true}
            />
          </div>
          {outro && <ReactMarkdown>{outro}</ReactMarkdown>}
        </div>
      );
    }
    return (
      <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
        <ReactMarkdown>{message.content.trim()}</ReactMarkdown>
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
