"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { CourseCard } from "@/components/ui/course-card"; // Assuming CourseCard is appropriately structured
import { storeCourse } from "@/data/lessons";

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
  storeCourse: (course: any) => void;
  navigate: (opts: { to: string }) => void;
}

const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  message,
  formatTime,
  extractFirstJson,
  storeCourse,
  navigate,
}) => {
  const isUser = message.role === "user";
  const alignment = isUser ? "justify-end" : "justify-start";
  const bgColor = isUser ? "bg-primary" : "bg-white";
  const textColor = isUser ? "text-white" : "text-gray-800";
  const borderColor = isUser ? "border-primary" : "border-gray-200";

  // Use extractFirstJson to find JSON and split intro/outro
  const found = extractFirstJson(message.content);
  if (found) {
    const { json, start, end } = found;
    const intro = message.content.slice(0, start).trim();
    const outro = message.content.slice(end).trim();
    return (
      <div className={`flex ${alignment} mb-3`}>
        <div className={`max-w-[80%] rounded-lg border ${borderColor} ${bgColor} p-3 shadow-sm`}>
          {intro && (
            <div className={`prose prose-sm ${textColor} mb-2`}>
              <ReactMarkdown>{intro}</ReactMarkdown>
            </div>
          )}
          <CourseCard
            title={json.title || ""}
            description={json.description || ""}
            lessonCount={Array.isArray(json.lessons) ? json.lessons.length : (json.lessonCount || 0)}
            onClick={() => {
              storeCourse(json);
              navigate({ to: "/learning" });
            }}
          />
          {outro && (
            <div className={`prose prose-sm ${textColor} mt-2`}>
              <ReactMarkdown>{outro}</ReactMarkdown>
            </div>
          )}
          <div className={`mt-1 text-xs ${isUser ? "text-right text-purple-200" : "text-left text-gray-400"}`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // No JSON found, render as before
  return (
    <div className={`flex ${alignment} mb-3`}>
      <div className={`max-w-[80%] rounded-lg border ${borderColor} ${bgColor} p-3 shadow-sm`}>
        <div className={`prose prose-sm ${textColor}`}>
          <ReactMarkdown>{message.content.trim()}</ReactMarkdown>
        </div>
        <div className={`mt-1 text-xs ${isUser ? "text-right text-purple-200" : "text-left text-gray-400"}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

export const ChatMessageItem = React.memo(ChatMessageItemComponent);
