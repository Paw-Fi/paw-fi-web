"use client";

import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { CourseCard } from "@/components/ui/course-card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLightbulb, faClipboardCheck, faEye } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useAIChat } from "@/contexts/ai-chat-context";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { useEffect } from "react";
import { iconContainer } from "./chat-conversation-display";
import { formatTime as defaultFormatTime } from "@/utils/sanitize-course";
import { useNavigate } from "@tanstack/react-router";
import { GoalType } from "../goal-tracker/types";
import { parseMessageContent } from "@/utils/message-parser";
import { DetailedContentModal } from "./detailed-content-modal";

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
}

const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  message,
  onOpenQuizModal,
  onGoalTemplateClick,
  formatTime: formatTimeProp,
  disableMsgParse = false,
}) => {
  const isUser = message.role === "user";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { closeChat, openChat } = useAIChat();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const { hasProfile, refetch: refetchProfile } = useFinancialHealthProfile(user?.id);

  const handleCourseClick = (courseId: string) => () => {
    closeChat();
    navigate({ to: `/dashboard/learning/${courseId}` });
  };

  useEffect(() => {
    if (isUser && message.content.toLowerCase().includes("completed the questionnaire") && user?.id) {
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

  // Pre-process content to convert special formats to HTML
  const processedContent = useMemo(() => {
    let content = message.content;

    // Don't process user messages or when parsing is disabled
    if (isUser || disableMsgParse) {
      return content.replace("{{username}}", user?.user_metadata?.full_name || "");
    }

    // Handle course cards
    const courseCardMatch = content.includes('```json') && content.includes('```');
    if (courseCardMatch) {
      const start = content.indexOf('```json');
      const jsonStart = start + 7;
      const jsonEnd = content.indexOf('```', jsonStart);
      if (start !== -1 && jsonEnd !== -1) {
        try {
          const jsonString = content.slice(jsonStart, jsonEnd).trim();
          const json = JSON.parse(jsonString);
          const intro = content.slice(0, start).trim();
          const after = content.slice(jsonEnd + 3).trim();
          
          content = `${intro}
<course-card data-course='${JSON.stringify(json)}'></course-card>
${after}`;
        } catch (error) {
          console.error('Error parsing course JSON:', error);
        }
      }
    }

    // Convert AI buttons to HTML elements
    content = content.replace(/``BUTTON:([^`]+)``/gi, '<ai-button data-type="$1"></ai-button>');

    // Convert questionnaire trigger to HTML element
    content = content.replace(/``QUESTIONNAIRE``/gi, '<questionnaire-button></questionnaire-button>');

    // Convert goal templates to HTML elements
    const goalTemplates: GoalType[] = ['retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'emergency_fund', 'passive_income', 'custom'];
    goalTemplates.forEach(template => {
      const regex = new RegExp('``' + template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '``', 'g');
      content = content.replace(regex, `<goal-template data-type="${template}"></goal-template>`);
    });

    // Remove goal matches (keeping original logic)
    content = content.replace(/``GOAL:[^`]+``/gi, '');

    // Handle long content parsing
    const parsedMessage = parseMessageContent(content);
    if (parsedMessage.hasLongContent) {
      content = `${parsedMessage.shortContent}
<view-details-button data-sections='${JSON.stringify(parsedMessage.sections)}'></view-details-button>`;
    }

    return content.replace("{{username}}", user?.user_metadata?.full_name || "");
  }, [message.content, isUser, disableMsgParse, user?.user_metadata?.full_name]);

  // Custom components for rehypeRaw
  const customComponents = useMemo(() => ({
    a: ({ node, ...props }: any) => (
      <a {...props} target="_blank" className="text-primary font-bold no-underline" />
    ),
    
    "course-card": ({ node, ...props }: any) => {
      try {
        const courseData = JSON.parse(props['data-course'] || '{}');
        return (
          <div className="my-3">
            <CourseCard
              title={courseData.title || ""}
              icon={courseData.icon || ""}
              description={courseData.description || ""}
              lessonCount={courseData.lesson_count || 0}
              onClick={handleCourseClick(courseData.id)}
            />
          </div>
        );
      } catch (error) {
        console.error('Error rendering course card:', error);
        return null;
      }
    },

    "ai-button": ({ node, ...props }: any) => {
      const aiType = props['data-type'];
      const aiButtonLabels: Record<string, { label: string; aiId: 'advisor' | 'educator';}> = {
        advisor: { label: "Chat with Ollie", aiId: 'advisor' },
        educator: { label: "Chat with Leo", aiId: 'educator' }
      };
      
      const buttonInfo = aiButtonLabels[aiType];
      if (!buttonInfo) return null;

      return (
        <div className="mt-3">
          <Button
            onClick={() => { closeChat(); openChat(buttonInfo.aiId); }}
            className="w-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-between"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faLightbulb} className="h-4 w-4" />
              <span>{buttonInfo.label}</span>
            </div>
          </Button>
        </div>
      );
    },

    "questionnaire-button": ({ node, ...props }: any) => (
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
    ),

    "goal-template": ({ node, ...props }: any) => {
      const goalType = props['data-type'] as GoalType;
      const templateLabels: Record<GoalType, string> = {
        retirement: "Retirement Planning",
        home_buying: "Home Buying",
        wealth: "Wealth Building",
        investment: "Investment Portfolio",
        debt_payoff: "Debt Payoff",
        emergency_fund: "Emergency Fund",
        passive_income: "Passive Income",
        custom: "Custom Goal"
      };

      if (!onGoalTemplateClick) return null;

      return (
        <div className="mt-3">
          <Button
            onClick={() => onGoalTemplateClick(goalType)}
            className="bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faClipboardCheck} className="h-4 w-4" />
            Start {templateLabels[goalType]} Setup
          </Button>
        </div>
      );
    },

    "view-details-button": ({ node, ...props }: any) => {
      try {
        const sections = JSON.parse(props['data-sections'] || '[]');
        return (
          <>
            <div className="mt-3 not-prose">
              <Button
                onClick={() => setIsDetailModalOpen(true)}
                variant="outline"
                size="sm"
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                View detailed information ({sections.length} sections)
              </Button>
            </div>
            <DetailedContentModal
              isOpen={isDetailModalOpen}
              onClose={() => setIsDetailModalOpen(false)}
              sections={sections}
              title="Detailed Financial Guidance"
            />
          </>
        );
      } catch (error) {
        console.error('Error rendering view details button:', error);
        return null;
      }
    }
  }), [
    handleCourseClick, 
    closeChat, 
    openChat, 
    hasProfile, 
    onOpenQuizModal, 
    onGoalTemplateClick, 
    isDetailModalOpen, 
    setIsDetailModalOpen
  ]);

  const renderMessageContent = useMemo(() => (
    <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={customComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  ), [processedContent, isUser, customComponents]);

  return (
    <div className={`flex items-end gap-3 sm:gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Avatar />}
      <MessageBubble>{renderMessageContent}</MessageBubble>
      {isUser && <Avatar />}
    </div>
  );
};

export const ChatMessageItem = React.memo(ChatMessageItemComponent);