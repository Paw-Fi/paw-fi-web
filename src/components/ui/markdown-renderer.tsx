"use client";

import React, { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useAIChat } from "@/contexts/ai-chat-context";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { useNavigate } from "@tanstack/react-router";
import { GoalType } from "../goal-tracker/types";
import { parseMessageContent, MessageSection } from "@/utils/message-parser";
import { DetailedContentModal } from "../chat/detailed-content-modal";
import { Markdown } from "@/components/ui/markdown";
import { createMarkdownComponents } from "@/components/ui/markdown-components";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onOpenQuizModal?: () => void;
  onGoalTemplateClick?: (goalType: GoalType) => void;
  onSendMessage?: (message: string) => void;
  disableMessageParsing?: boolean;
  isUserMessage?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
  onOpenQuizModal,
  onGoalTemplateClick,
  onSendMessage,
  disableMessageParsing = false,
  isUserMessage = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { closeChat, openChat } = useAIChat();
  const { hasProfile } = useFinancialHealthProfile(user?.id);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [modalSections, setModalSections] = React.useState<MessageSection[]>([]);

  const handleCourseClick = (courseId: string) => () => {
    closeChat();
    navigate({ to: `/dashboard/learning/${courseId}` });
  };

  // Helper function to process section content - removes interactive elements for better UX
  const processSectionContent = (content: string): string => {
    let processed = content;
    
    // Remove all interactive button syntax from detailed modal content
    // The detailed modal should be for reading, not for taking actions
    processed = processed.replace(/``UPDATE_PROFILE(?::[^`]+)?``/gi, '');
    processed = processed.replace(/``BUTTON:[^`]+``/gi, '');
    processed = processed.replace(/``CONFIRM:[^`]+``/gi, '');
    processed = processed.replace(/``QUICK_SAVE:[^`]+``/gi, '');
    processed = processed.replace(/``FINANCIAL_ACTION:[^`]+``/gi, '');
    processed = processed.replace(/``GOAL_ACTION:[^`]+``/gi, '');
    processed = processed.replace(/`GOAL_ACTION:[^`]+`/gi, '');
    processed = processed.replace(/``UPDATE_DATA:[^`]+``/gi, '');
    processed = processed.replace(/``RESPONSE:[^`]+``/gi, '');
    processed = processed.replace(/``PRIORITY:[^`]+``/gi, '');
    processed = processed.replace(/``HABIT:[^`]+``/gi, '');
    processed = processed.replace(/``AMOUNT:[^`]+``/gi, '');
    processed = processed.replace(/``RISK:[^`]+``/gi, '');
    processed = processed.replace(/``TIMELINE:[^`]+``/gi, '');
    processed = processed.replace(/``CONFIDENCE:[^`]+``/gi, '');
    processed = processed.replace(/``COMMITMENT:[^`]+``/gi, '');
    processed = processed.replace(/``QUESTIONNAIRE``/gi, '');
    
    // Clean up any extra whitespace left behind
    processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return processed;
  };

  // Pre-process content to convert special formats to HTML
  const processedContent = useMemo(() => {
    let processedContent = content;
console.log(content)
    // Don't process user messages
    if (isUserMessage) {
      return processedContent.replace("{{username}}", user?.user_metadata?.full_name || "");
    }

    // Handle course cards
    const courseCardMatch = processedContent.includes('```json') && processedContent.includes('```');
    if (courseCardMatch) {
      const start = processedContent.indexOf('```json');
      const jsonStart = start + 7;
      const jsonEnd = processedContent.indexOf('```', jsonStart);
      if (start !== -1 && jsonEnd !== -1) {
        try {
          const jsonString = processedContent.slice(jsonStart, jsonEnd).trim();
          const json = JSON.parse(jsonString);
          const intro = processedContent.slice(0, start).trim();
          const after = processedContent.slice(jsonEnd + 3).trim();
          
          processedContent = `${intro}
<course-card data-course='${JSON.stringify(json)}'></course-card>
${after}`;
        } catch (error) {
          console.error('Error parsing course JSON:', error);
        }
      }
    }

    // Convert AI buttons to HTML elements
    processedContent = processedContent.replace(/``BUTTON:([^`]+)``/gi, '<ai-button data-type="$1"></ai-button>');
    
    // Convert interactive buttons to HTML elements
    processedContent = processedContent.replace(/``CONFIRM:([^`]+)``/gi, '<confirm-button data-type="$1"></confirm-button>');
    processedContent = processedContent.replace(/``QUICK_SAVE:([^`]+)``/gi, '<quick-save data-type="$1"></quick-save>');
    processedContent = processedContent.replace(/``FINANCIAL_ACTION:([^`]+)``/gi, '<financial-action data-type="$1"></financial-action>');
    processedContent = processedContent.replace(/``GOAL_ACTION:([^`]+)``/gi, '<goal-action data-type="$1"></goal-action>');
    processedContent = processedContent.replace(/`GOAL_ACTION:([^`]+)`/gi, '<goal-action data-type="$1"></goal-action>');
    processedContent = processedContent.replace(/``UPDATE_DATA:([^`]+)``/gi, '<update-data data-type="$1"></update-data>');
    processedContent = processedContent.replace(/``RESPONSE:([^`]+)``/gi, '<response-style data-type="$1"></response-style>');
    processedContent = processedContent.replace(/``PRIORITY:([^`]+)``/gi, '<priority-select data-type="$1"></priority-select>');
    processedContent = processedContent.replace(/``HABIT:([^`]+)``/gi, '<habit-track data-type="$1"></habit-track>');
    processedContent = processedContent.replace(/``AMOUNT:([^`]+)``/gi, '<amount-select data-type="$1"></amount-select>');
    processedContent = processedContent.replace(/``RISK:([^`]+)``/gi, '<risk-select data-type="$1"></risk-select>');
    processedContent = processedContent.replace(/``TIMELINE:([^`]+)``/gi, '<timeline-select data-type="$1"></timeline-select>');
    processedContent = processedContent.replace(/``CONFIDENCE:([^`]+)``/gi, '<confidence-track data-type="$1"></confidence-track>');
    processedContent = processedContent.replace(/``COMMITMENT:([^`]+)``/gi, '<commitment-level data-type="$1"></commitment-level>');

    // Convert questionnaire trigger to HTML element
    processedContent = processedContent.replace(/``QUESTIONNAIRE``/gi, '<questionnaire-button></questionnaire-button>');
    
    // Convert update profile trigger to HTML element
    processedContent = processedContent.replace(/``UPDATE_PROFILE``/gi, '<update-profile-button></update-profile-button>');
    
    // Convert parameterized UPDATE_PROFILE buttons to HTML elements
    processedContent = processedContent.replace(/``UPDATE_PROFILE:([^`]+)``/gi, '<update-profile-button data-params="$1"></update-profile-button>');

    // Convert goal templates to HTML elements
    const goalTemplates: GoalType[] = ['retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'emergency_fund', 'passive_income', 'custom'];
    goalTemplates.forEach(template => {
      const regex = new RegExp('``' + template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '``', 'g');
      processedContent = processedContent.replace(regex, `<goal-template data-type="${template}"></goal-template>`);
    });

    // Remove goal matches (keeping original logic)
    processedContent = processedContent.replace(/``GOAL:[^`]+``/gi, '');

    // Remove thinking tags and their content (for AI internal monologue)
    processedContent = processedContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

    // Handle long content parsing (only if not disabled)
    if (!disableMessageParsing) {
      // Parse sections from the original content to get structure
      const parsedMessage = parseMessageContent(content);
      // Only show details button if there are 2 or more sections
      if (parsedMessage.hasLongContent && parsedMessage.sections.length >= 2) {
        // Process each section's content with the same transformations
        const processedSections = parsedMessage.sections.map(section => ({
          ...section,
          content: processSectionContent(section.content),
          subsections: section.subsections?.map(sub => ({
            ...sub,
            content: processSectionContent(sub.content)
          }))
        }));
        
        // Properly escape JSON data for HTML attribute
        const escapedSections = JSON.stringify(processedSections).replace(/'/g, '&apos;').replace(/"/g, '&quot;');
        processedContent = `${processSectionContent(parsedMessage.shortContent)}
<view-details-button data-sections="${escapedSections}"></view-details-button>`;
      }
    }

    return processedContent.replace("{{username}}", user?.user_metadata?.full_name || "");
  }, [content, isUserMessage, disableMessageParsing, user?.user_metadata?.full_name]);

  // Create custom components using the new factory function
  const customComponents = createMarkdownComponents({
    onOpenQuizModal,
    onGoalTemplateClick,
    onSendMessage,
    isDetailModalOpen,
    setIsDetailModalOpen,
    handleCourseClick,
    setModalSections,
    navigate,
    closeChat,
    openChat,
    hasProfile,
  });

  return (
    <>
      <Markdown
        content={processedContent}
        components={customComponents}
        className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 prose-slate dark:prose-invert ${className}`}
      />
      <DetailedContentModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        sections={modalSections}
      />
    </>
  );
};