"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { CourseCard } from "@/components/ui/course-card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLightbulb, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useAIChat } from "@/contexts/ai-chat-context";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { useEffect } from "react";
import { iconContainer } from "./chat-conversation-display";
import { extractFirstJson, formatTime as defaultFormatTime } from "@/utils/sanitize-course";
import { useNavigate } from "@tanstack/react-router";
import { GoalType } from "../goal-tracker/types";

interface Message {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string; // Keeping as per original, map if needed for backend
  metadata?: Record<string, any>;
}

interface ChatMessageItemProps {
  message: Message;
  onOpenQuizModal?: () => void;
  onGoalTemplateClick?: (goalType: GoalType) => void;
  formatTime?: (timestamp: number) => string;
}



const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  message,
  onOpenQuizModal,
  onGoalTemplateClick,
  formatTime: formatTimeProp,
}) => {
  const isUser = message.role === "user";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { closeChat, openChat } = useAIChat();
  
  // Check if user has completed the financial assessment
  const { hasProfile, refetch: refetchProfile } = useFinancialHealthProfile(user?.id);

  const handleCourseClick = (courseId: string) => () => {
    closeChat();
    navigate({ to: `/dashboard/learning/${courseId}` });
  };

  
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

  const renderMessageContent = () => {

    // Check if message contains QUESTIONNAIRE keyword
    const hasQuestionnaireKeyword = message.content.includes('``QUESTIONNAIRE``');
    
    // Check for goal completion pattern ``GOAL:id`` - find all matches
    const goalMatches = [...message.content.matchAll(/``GOAL:([^`]+)``/g)];
    
    // Check for AI button patterns ``BUTTON:advisor`` or ``BUTTON:educator``
    const buttonMatches = [...message.content.matchAll(/``BUTTON:([^`]+)``/g)];
    
    // Check for goal template patterns
    const goalTemplates: GoalType[] = ['retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'emergency_fund', 'custom'];
    const detectedTemplate = goalTemplates.find(template => 
      message.content.includes(`\`\`${template}\`\``)
    );
    
    // Check for course card pattern - this was missing but referenced later
    const courseCardMatch = message.content.includes('```json') && message.content.includes('```');
    
    if (courseCardMatch) {
      const start = message.content.indexOf('```json');
      const jsonStart = start + 7; // Skip '```json'
      const jsonEnd = message.content.indexOf('```', jsonStart); // Find closing ```
      
      if (start === -1 || jsonEnd === -1) {
        // Fallback if parsing fails - just render as markdown
        return (
          <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
            <ReactMarkdown>{message.content.replace("{{username}}", user?.user_metadata?.full_name || "")}</ReactMarkdown>
          </div>
        );
      }
      
      try {
        const jsonString = message.content.slice(jsonStart, jsonEnd).trim();
        const json = JSON.parse(jsonString);
        const intro = message.content.slice(0, start).trim().replace("{{username}}", user?.user_metadata?.full_name || "");
        const outro = message.content.slice(jsonEnd + 3).trim().replace("{{username}}", user?.user_metadata?.full_name || ""); // +3 to skip closing ```
        
        return (
          <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
            {intro && <ReactMarkdown>{intro}</ReactMarkdown>}
            <div className="my-3">
              <CourseCard
                title={json.title || ""}
                icon={json.icon || ""}
                description={json.description || ""}
                lessonCount={json.lesson_count || 0}
                onClick={handleCourseClick(json.id)}
              />
            </div>
            {outro && <ReactMarkdown>{outro}</ReactMarkdown>}
          </div>
        );
      } catch (error) {
        console.error('Error parsing course JSON:', error);
        // Fallback if JSON parsing fails - just render as markdown
        return (
          <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
            <ReactMarkdown>{message.content.replace("{{username}}", user?.user_metadata?.full_name || "")}</ReactMarkdown>
          </div>
        );
      }
    }
    
    // Handle AI button patterns ``BUTTON:advisor`` or ``BUTTON:educator``
    if (buttonMatches.length > 0 && !isUser) {
      // Remove all button patterns from text for clean display
      const messageText = message.content.replace(/``BUTTON:[^`]+``/g, '').trim();
      
      const aiButtonLabels: Record<string, { label: string; aiId: 'advisor' | 'educator';}> = {
        advisor: { 
          label: "Chat with Ollie", 
          aiId: 'advisor', 
        },
        educator: { 
          label: "Chat with Leo", 
          aiId: 'educator', 
        }
      };
      
      return (
        <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
          <ReactMarkdown>{messageText.replace("{{username}}", user?.user_metadata?.full_name || "")}</ReactMarkdown>
          
          <div className="mt-3 space-y-2">
            {buttonMatches.map((match, index) => {
              const aiType = match[1]; // advisor or educator
              const buttonInfo = aiButtonLabels[aiType];
              
              if (!buttonInfo) return null;
              
              return (
                <Button
                  key={index}
                  onClick={() => {
                    closeChat();
                    openChat(buttonInfo.aiId)
                  }}
                  className="w-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-between"
                >
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faLightbulb} className="h-4 w-4" />
                    <span>{buttonInfo.label}</span>
                  </div>
                </Button>
              );
            })}
          </div>
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
    
    // Handle multiple goal completion buttons ``GOAL:id``
    if (goalMatches.length > 0 && !isUser) {
      // Remove all goal patterns from text for clean display
      const messageText = message.content.replace(/``GOAL:[^`]+``/g, '').trim();
      
      return (
        <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
          <ReactMarkdown>{messageText.replace("{{username}}", user?.user_metadata?.full_name|| "")}</ReactMarkdown>
          
          
        </div>
      );
    }
    
    // Handle goal template buttons
    if (detectedTemplate && !isUser && onGoalTemplateClick) {
      const templateLabels: Record<GoalType, string> = {
        retirement: "Retirement Planning",
        home_buying: "Home Buying",
        wealth: "Wealth Building",
        investment: "Investment Portfolio",
        debt_payoff: "Debt Payoff",
        emergency_fund: "Emergency Fund",
        custom: "Custom Goal"
      };
      
      const messageText = message.content.replace(new RegExp(`\`\`${detectedTemplate}\`\``, 'g'), '').trim();
      
      return (
        <div className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 ${isUser ? 'text-white prose-headings:text-white prose-strong:text-white prose-em:text-purple-100 prose-a:text-purple-200 hover:prose-a:text-purple-100 prose-code:text-purple-200 prose-code:bg-purple-700/50 prose-pre:bg-purple-800/50 prose-li:text-white prose-blockquote:text-purple-100 prose-blockquote:border-purple-300' : 'prose-slate dark:prose-invert'}`}>
          <ReactMarkdown>{messageText.replace("{{username}}", user?.user_metadata?.full_name|| "")}</ReactMarkdown>
          <div className="mt-3">
            <Button
              onClick={() => onGoalTemplateClick(detectedTemplate)}
              className="bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faClipboardCheck} className="h-4 w-4" />
              Start {templateLabels[detectedTemplate]} Setup
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
    <div className={`flex items-end gap-3 sm:gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Avatar />}
      <MessageBubble>{renderMessageContent()}</MessageBubble>
      {isUser && <Avatar />}
    </div>
  );
};

export const ChatMessageItem = React.memo(ChatMessageItemComponent);
