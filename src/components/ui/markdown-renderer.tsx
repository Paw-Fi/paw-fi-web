"use client";

import React, { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useAIChat } from "@/contexts/ai-chat-context";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { useNavigate } from "@tanstack/react-router";
import { GoalType } from "../goal-tracker/types";
import { parseMessageContent, MessageSection } from "@/utils/message-parser";
import { smartExtractContent, ExtractedContent } from "@/utils/smart-content-extractor";
import { DetailedContentModal } from "../chat/detailed-content-modal";
import { Markdown } from "@/components/ui/markdown";
import { createMarkdownComponents } from "@/components/ui/markdown-components";
import { CourseCard } from "@/components/ui/course-card";

// Temporary fix: Extract course card data using robust JSON extraction
const extractCourseCardData = (content: string) => {
  // Find the start of the JSON object by looking for the course data pattern
  const jsonStart = content.indexOf('{"id":"lesson-car-goal-1"');
  if (jsonStart === -1) {
    return null;
  }
  
  // Use bracket counting to find the end of the JSON object
  let braceCount = 0;
  let jsonEnd = -1;
  
  for (let i = jsonStart; i < content.length; i++) {
    const char = content[i];
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1; // Include the closing brace
        break;
      }
    }
  }
  
  if (jsonEnd === -1) {
    return null;
  }
  
  const jsonString = content.substring(jsonStart, jsonEnd);
  
  try {
    const courseData = JSON.parse(jsonString);
    return courseData;
  } catch (error) {
    return null;
  }
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
  const [extractedContent, setExtractedContent] = React.useState<ExtractedContent | null>(null);

  // Temporary fix: Extract course card data
  const courseCardData = extractCourseCardData(content);
  
  // Remove course card more robustly
  let contentWithoutCourseCard = content;
  const startIndex = content.indexOf("<course-card");
  if (startIndex !== -1) {
    const endIndex = content.indexOf(">", startIndex);
    if (endIndex !== -1) {
      contentWithoutCourseCard = content.substring(0, startIndex) + content.substring(endIndex + 1);
    }
  }
  contentWithoutCourseCard = contentWithoutCourseCard.trim();

  const handleCourseClick = (courseId: string) => () => {
    closeChat();
    navigate({ to: `/dashboard/learning/${courseId}` });
  };


  // Smart extraction function with comprehensive error handling
  const performSmartExtraction = (rawContent: string) => {
    if (!rawContent || typeof rawContent !== 'string') {
      console.warn('Smart extraction: Invalid input content');
      return null;
    }

    try {
      const extracted = smartExtractContent(rawContent);
      setExtractedContent(extracted);
      
      // Validate extraction result
      if (!extracted || typeof extracted !== 'object') {
        console.warn('Smart extraction: Invalid extraction result');
        return null;
      }

      // Log extraction metrics for monitoring
      if (extracted.details.length > 0) {
        console.info(`Smart extraction successful: ${extracted.details.length} sections, ${(extracted.metadata.compressionRatio * 100).toFixed(1)}% compression in ${extracted.metadata.processingTime.toFixed(1)}ms`);
      }
      
      return extracted;
    } catch (error) {
      console.error('Smart extraction completely failed:', error);
      setExtractedContent(null);
      return null;
    }
  };

  // Enhanced content processing with smart extraction  
  const processedContent = React.useMemo(() => {
    // Don't process user messages
    if (isUserMessage) {
      return content.replace("{{username}}", user?.user_metadata?.full_name || "");
    }

    // Check if content has course cards - backend now sends HTML format directly
    const hasHtmlCourseCard = content.includes('<course-card');
    
    // Declare finalContent here to be used throughout the function
    let finalContent = content;
    
    if (hasHtmlCourseCard) {
      // Apply basic interactive element conversion but skip smart extraction
      let courseCardContent = content;
      
      // Only apply essential interactive element conversions (no extraction logic)
      courseCardContent = courseCardContent.replace(/``BUTTON:([^`]+)``/gi, '<ai-button data-type=\"$1\"></ai-button>');
      courseCardContent = courseCardContent.replace(/``CONFIRM:([^`]+)``/gi, '<confirm-button data-type=\"$1\"></confirm-button>');
      courseCardContent = courseCardContent.replace(/``QUICK_SAVE:([^`]+)``/gi, '<quick-save data-type=\"$1\"></quick-save>');
      courseCardContent = courseCardContent.replace(/``FINANCIAL_ACTION:([^`]+)``/gi, '<financial-action data-type=\"$1\"></financial-action>');
      courseCardContent = courseCardContent.replace(/``GOAL_ACTION:([^`]+)``/gi, '<goal-action data-type=\"$1\"></goal-action>');
      courseCardContent = courseCardContent.replace(/`GOAL_ACTION:([^`]+)`/gi, '<goal-action data-type=\"$1\"></goal-action>');
      courseCardContent = courseCardContent.replace(/``UPDATE_DATA:([^`]+)``/gi, '<update-data data-type=\"$1\"></update-data>');
      courseCardContent = courseCardContent.replace(/``RESPONSE:([^`]+)``/gi, '<response-style data-type=\"$1\"></response-style>');
      courseCardContent = courseCardContent.replace(/``PRIORITY:([^`]+)``/gi, '<priority-select data-type=\"$1\"></priority-select>');
      courseCardContent = courseCardContent.replace(/``HABIT:([^`]+)``/gi, '<habit-track data-type=\"$1\"></habit-track>');
      courseCardContent = courseCardContent.replace(/``AMOUNT:([^`]+)``/gi, '<amount-select data-type=\"$1\"></amount-select>');
      courseCardContent = courseCardContent.replace(/``RISK:([^`]+)``/gi, '<risk-select data-type=\"$1\"></risk-select>');
      courseCardContent = courseCardContent.replace(/``TIMELINE:([^`]+)``/gi, '<timeline-select data-type=\"$1\"></timeline-select>');
      courseCardContent = courseCardContent.replace(/``CONFIDENCE:([^`]+)``/gi, '<confidence-track data-type=\"$1\"></confidence-track>');
      courseCardContent = courseCardContent.replace(/``COMMITMENT:([^`]+)``/gi, '<commitment-level data-type=\"$1\"></commitment-level>');
      courseCardContent = courseCardContent.replace(/``QUESTIONNAIRE``/gi, '<questionnaire-button></questionnaire-button>');
      courseCardContent = courseCardContent.replace(/``UPDATE_PROFILE``/gi, '<update-profile-button></update-profile-button>');
      courseCardContent = courseCardContent.replace(/``UPDATE_PROFILE:([^`]+)``/gi, '<update-profile-button data-params=\"$1\"></update-profile-button>');

      // Convert goal templates
      const goalTemplates: GoalType[] = ['retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'emergency_fund', 'passive_income', 'custom'];
      goalTemplates.forEach(template => {
        const regex = new RegExp('``' + template.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '``', 'g');
        courseCardContent = courseCardContent.replace(regex, `<goal-template data-type=\"${template}\"></goal-template>`);
      });

      // Remove goal matches and thinking tags
      courseCardContent = courseCardContent.replace(/``GOAL:[^`]+``/gi, '');
      courseCardContent = courseCardContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
      
      // Return the processed course card content directly
      finalContent = courseCardContent.replace("{{username}}", user?.user_metadata?.full_name || "");
      return finalContent;
    }
    
    // Apply smart extraction if not disabled and no course cards present
    if (!disableMessageParsing) {
      try {
        // Use smart extraction with the original content (before button processing)
        const extracted = performSmartExtraction(content);
        
        if (extracted && extracted.shouldShowDetails && extracted.details.length > 0) {
          
          // Use the smart-extracted summary as the main content
          finalContent = extracted.summary;
          
          // Convert extracted details to MessageSection format and store for modal
          const smartSections: MessageSection[] = extracted.details.map(detail => ({
            title: detail.title,
            content: processSectionContent(detail.content),
            subsections: undefined,
          }));
          
          setModalSections(smartSections);
          
          // Add the view details button with smart extraction data
          const escapedSections = JSON.stringify(smartSections).replace(/'/g, '&apos;').replace(/"/g, '&quot;');
          finalContent += `
<view-details-button data-sections="${escapedSections}" data-smart="true" data-compression="${(extracted.metadata.compressionRatio * 100).toFixed(1)}"></view-details-button>`;
        } else {
          // Fall back to legacy parsing if smart extraction didn't find content to extract
          const parsedMessage = parseMessageContent(content, false); // Disable smart extraction in legacy parser
          
          if (parsedMessage.hasLongContent && parsedMessage.sections.length >= 2) {
            const processedSections = parsedMessage.sections.map(section => ({
              ...section,
              content: processSectionContent(section.content),
              subsections: section.subsections?.map(sub => ({
                ...sub,
                content: processSectionContent(sub.content)
              }))
            }));
            
            setModalSections(processedSections);
            const escapedSections = JSON.stringify(processedSections).replace(/'/g, '&apos;').replace(/"/g, '&quot;');
            finalContent = `${processSectionContent(parsedMessage.shortContent)}
<view-details-button data-sections="${escapedSections}" data-smart="false"></view-details-button>`;
          }
        }
      } catch (error) {
        // Continue with original content processing
      }
    }

    // Convert all interactive elements to HTML (apply to final content)
    finalContent = finalContent.replace(/``BUTTON:([^`]+)``/gi, '<ai-button data-type="$1"></ai-button>');
    finalContent = finalContent.replace(/``CONFIRM:([^`]+)``/gi, '<confirm-button data-type="$1"></confirm-button>');
    finalContent = finalContent.replace(/``QUICK_SAVE:([^`]+)``/gi, '<quick-save data-type="$1"></quick-save>');
    finalContent = finalContent.replace(/``FINANCIAL_ACTION:([^`]+)``/gi, '<financial-action data-type="$1"></financial-action>');
    finalContent = finalContent.replace(/``GOAL_ACTION:([^`]+)``/gi, '<goal-action data-type="$1"></goal-action>');
    finalContent = finalContent.replace(/`GOAL_ACTION:([^`]+)`/gi, '<goal-action data-type="$1"></goal-action>');
    finalContent = finalContent.replace(/``UPDATE_DATA:([^`]+)``/gi, '<update-data data-type="$1"></update-data>');
    finalContent = finalContent.replace(/``RESPONSE:([^`]+)``/gi, '<response-style data-type="$1"></response-style>');
    finalContent = finalContent.replace(/``PRIORITY:([^`]+)``/gi, '<priority-select data-type="$1"></priority-select>');
    finalContent = finalContent.replace(/``HABIT:([^`]+)``/gi, '<habit-track data-type="$1"></habit-track>');
    finalContent = finalContent.replace(/``AMOUNT:([^`]+)``/gi, '<amount-select data-type="$1"></amount-select>');
    finalContent = finalContent.replace(/``RISK:([^`]+)``/gi, '<risk-select data-type="$1"></risk-select>');
    finalContent = finalContent.replace(/``TIMELINE:([^`]+)``/gi, '<timeline-select data-type="$1"></timeline-select>');
    finalContent = finalContent.replace(/``CONFIDENCE:([^`]+)``/gi, '<confidence-track data-type="$1"></confidence-track>');
    finalContent = finalContent.replace(/``COMMITMENT:([^`]+)``/gi, '<commitment-level data-type="$1"></commitment-level>');
    finalContent = finalContent.replace(/``QUESTIONNAIRE``/gi, '<questionnaire-button></questionnaire-button>');
    finalContent = finalContent.replace(/``UPDATE_PROFILE``/gi, '<update-profile-button></update-profile-button>');
    finalContent = finalContent.replace(/``UPDATE_PROFILE:([^`]+)``/gi, '<update-profile-button data-params="$1"></update-profile-button>');

    // Convert goal templates to HTML elements
    const goalTemplates: GoalType[] = ['retirement', 'home_buying', 'wealth', 'investment', 'debt_payoff', 'emergency_fund', 'passive_income', 'custom'];
    goalTemplates.forEach(template => {
      const regex = new RegExp('``' + template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '``', 'g');
      finalContent = finalContent.replace(regex, `<goal-template data-type="${template}"></goal-template>`);
    });

    // Remove goal matches and thinking tags
    finalContent = finalContent.replace(/``GOAL:[^`]+``/gi, '');
    finalContent = finalContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

    return finalContent.replace("{{username}}", user?.user_metadata?.full_name || "");
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
    extractedContent, // Pass extracted content for debugging/analytics
  });

  return (
    <>
      <Markdown
        content={courseCardData ? contentWithoutCourseCard : processedContent}
        components={customComponents}
        className={`prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 prose-slate dark:prose-invert ${className}`}
      />
      
      {/* Temporary fix: Render course card directly if found */}
      {courseCardData && (
        <div className="my-3">
          <CourseCard
            title={courseCardData.title || ""}
            icon={courseCardData.icon || "📚"}
            description={courseCardData.description || ""}
            lessonCount={courseCardData.lesson_count || courseCardData.lessonCount || 1}
            onClick={handleCourseClick(courseCardData.id)}
          />
          
        </div>
      )}
      
      <DetailedContentModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        sections={modalSections}
        extractedContent={extractedContent} // Pass for enhanced modal features
      />
    </>
  );
};