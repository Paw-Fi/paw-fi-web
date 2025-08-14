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
  onSendMessage?: (message: string) => void;
}

const ChatMessageItemComponent: React.FC<ChatMessageItemProps> = ({
  message,
  onOpenQuizModal,
  onGoalTemplateClick,
  formatTime: formatTimeProp,
  disableMsgParse = false,
  onSendMessage,
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
    
    // Convert interactive buttons to HTML elements
    content = content.replace(/``CONFIRM:([^`]+)``/gi, '<confirm-button data-type="$1"></confirm-button>');
    content = content.replace(/``QUICK_SAVE:([^`]+)``/gi, '<quick-save data-type="$1"></quick-save>');
    content = content.replace(/``FINANCIAL_ACTION:([^`]+)``/gi, '<financial-action data-type="$1"></financial-action>');
    content = content.replace(/``GOAL_ACTION:([^`]+)``/gi, '<goal-action data-type="$1"></goal-action>');
    content = content.replace(/``UPDATE_DATA:([^`]+)``/gi, '<update-data data-type="$1"></update-data>');
    content = content.replace(/``NAVIGATE:([^`]+)``/gi, '<navigate-button data-type="$1"></navigate-button>');
    content = content.replace(/``RESPONSE:([^`]+)``/gi, '<response-style data-type="$1"></response-style>');
    content = content.replace(/``PRIORITY:([^`]+)``/gi, '<priority-select data-type="$1"></priority-select>');
    content = content.replace(/``HABIT:([^`]+)``/gi, '<habit-track data-type="$1"></habit-track>');
    content = content.replace(/``AMOUNT:([^`]+)``/gi, '<amount-select data-type="$1"></amount-select>');
    content = content.replace(/``RISK:([^`]+)``/gi, '<risk-select data-type="$1"></risk-select>');
    content = content.replace(/``TIMELINE:([^`]+)``/gi, '<timeline-select data-type="$1"></timeline-select>');
    content = content.replace(/``CONFIDENCE:([^`]+)``/gi, '<confidence-track data-type="$1"></confidence-track>');
    content = content.replace(/``COMMITMENT:([^`]+)``/gi, '<commitment-level data-type="$1"></commitment-level>');

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
    
    // Interactive Button Components
    "confirm-button": ({ node, ...props }: any) => {
      const [options, label] = (props['data-type'] || '').split(':');
      const buttonOptions = options?.split('|') || [];
      
      return (
        <div className="mt-3 flex gap-2 flex-wrap">
          <p className="text-sm font-medium mb-2 w-full">{label}</p>
          {buttonOptions.map((option) => (
            <Button
              key={option}
              onClick={() => {
                const message = option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ');
                onSendMessage?.(message);
              }}
              className={`px-4 py-2 rounded-lg ${
                option.includes('yes') || option.includes('agree') || option.includes('proceed')
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              {option.replace(/_/g, ' ').charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      );
    },

    "quick-save": ({ node, ...props }: any) => {
      const [amounts, label] = (props['data-type'] || '').split(':');
      const amountOptions = amounts?.split('|') || [];
      
      return (
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {amountOptions.map((amount) => (
              <Button
                key={amount}
                onClick={() => {
                  const message = amount === 'other' || amount === 'custom'
                    ? 'I want to add a custom amount' 
                    : `I saved $${amount} today`;
                  onSendMessage?.(message);
                }}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg border border-green-300"
              >
                {amount === 'other' || amount === 'custom' ? 'Custom Amount' : `$${amount}`}
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "financial-action": ({ node, ...props }: any) => {
      const [actions, label] = (props['data-type'] || '').split(':');
      const actionOptions = actions?.split('|') || [];
      
      const actionIcons: Record<string, string> = {
        pay_debt: '💳', save_money: '💰', invest: '📈', budget: '📊',
        emergency_fund: '🛡️', debt_payoff: '💳', investment: '📈', retirement: '🏖️'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="grid grid-cols-2 gap-2">
            {actionOptions.map((action) => (
              <Button
                key={action}
                onClick={() => {
                  const message = `I want to focus on ${action.replace(/_/g, ' ')}`;
                  onSendMessage?.(message);
                }}
                className="flex items-center gap-2 px-3 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg border border-blue-200"
              >
                <span>{actionIcons[action] || '🎯'}</span>
                <span className="text-sm">{action.replace(/_/g, ' ').toUpperCase()}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "goal-action": ({ node, ...props }: any) => {
      const [actions, label] = (props['data-type'] || '').split(':');
      const actionOptions = actions?.split('|') || [];
      
      const goalActionIcons: Record<string, string> = {
        add_money: '💰', add_progress: '📈', extend_deadline: '📅', 
        add_milestone: '🎯', adjust_target: '🎯', set_reminder: '🔔'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {actionOptions.map((action) => (
              <Button
                key={action}
                onClick={() => {
                  const message = `I want to ${action.replace(/_/g, ' ')} for my goal`;
                  onSendMessage?.(message);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200"
              >
                <span>{goalActionIcons[action] || '⚡'}</span>
                <span className="text-sm capitalize">{action.replace(/_/g, ' ')}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "update-data": ({ node, ...props }: any) => {
      const [dataTypes, label] = (props['data-type'] || '').split(':');
      const dataOptions = dataTypes?.split('|') || [];
      
      const dataIcons: Record<string, string> = {
        income: '💵', expenses: '🧾', debt: '💳', assets: '🏦',
        new_job: '💼', pay_raise: '📈', expense_change: '🧾'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {dataOptions.map((dataType) => (
              <Button
                key={dataType}
                onClick={() => {
                  const message = `I need to update my ${dataType.replace(/_/g, ' ')} information`;
                  onSendMessage?.(message);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200"
              >
                <span>{dataIcons[dataType] || '📝'}</span>
                <span className="text-sm capitalize">{dataType.replace(/_/g, ' ')}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "navigate-button": ({ node, ...props }: any) => {
      const [destinations, label] = (props['data-type'] || '').split(':');
      const navOptions = destinations?.split('|') || [];
      
      const navIcons: Record<string, string> = {
        calculator: '🧮', dashboard: '📊', goals: '🎯', insights: '💡',
        compound_calculator: '📈', goal_tracker: '🎯', budget_planner: '📋'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {navOptions.map((destination) => (
              <Button
                key={destination}
                onClick={() => {
                  const message = `Take me to ${destination.replace(/_/g, ' ')}`;
                  onSendMessage?.(message);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg border border-indigo-200"
              >
                <span>{navIcons[destination] || '🔗'}</span>
                <span className="text-sm capitalize">{destination.replace(/_/g, ' ')}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "amount-select": ({ node, ...props }: any) => {
      const [amounts, label] = (props['data-type'] || '').split(':');
      const amountOptions = amounts?.split('|') || [];
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="grid grid-cols-3 gap-2">
            {amountOptions.map((amount) => (
              <Button
                key={amount}
                onClick={() => {
                  const message = amount === 'custom'
                    ? 'I want to enter a custom amount'
                    : `I choose $${amount}`;
                  onSendMessage?.(message);
                }}
                className="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg border border-green-200"
              >
                {amount === 'custom' ? 'Custom' : `$${amount}`}
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "priority-select": ({ node, ...props }: any) => {
      const [priorities, label] = (props['data-type'] || '').split(':');
      const priorityOptions = priorities?.split('|') || [];
      
      const priorityColors: Record<string, string> = {
        high: 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200',
        critical: 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200',
        medium: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border-yellow-200',
        important: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border-yellow-200',
        low: 'bg-green-50 hover:bg-green-100 text-green-800 border-green-200',
        nice_to_have: 'bg-green-50 hover:bg-green-100 text-green-800 border-green-200'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {priorityOptions.map((priority) => (
              <Button
                key={priority}
                onClick={() => {
                  const message = `This is ${priority.replace(/_/g, ' ')} priority for me`;
                  onSendMessage?.(message);
                }}
                className={`px-3 py-2 rounded-lg border ${priorityColors[priority] || 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200'}`}
              >
                {priority.replace(/_/g, ' ').charAt(0).toUpperCase() + priority.slice(1).replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "response-style": ({ node, ...props }: any) => {
      const [styles, label] = (props['data-type'] || '').split(':');
      const styleOptions = styles?.split('|') || [];
      
      const styleIcons: Record<string, string> = {
        detailed: '📋', quick: '⚡', examples: '💡', visual: '📊',
        step_by_step: '📋', overview: '🌐'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {styleOptions.map((style) => (
              <Button
                key={style}
                onClick={() => {
                  const message = `Please explain this with ${style.replace(/_/g, ' ')} style`;
                  onSendMessage?.(message);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-lg border border-cyan-200"
              >
                <span>{styleIcons[style] || '💬'}</span>
                <span className="text-sm capitalize">{style.replace(/_/g, ' ')}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "habit-track": ({ node, ...props }: any) => {
      const [habits, label] = (props['data-type'] || '').split(':');
      const habitOptions = habits?.split('|') || [];
      
      const habitIcons: Record<string, string> = {
        completed: '✅', yes: '✅', missed: '❌', no: '❌', 
        partial: '🟡', mostly: '🟡'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {habitOptions.map((habit) => (
              <Button
                key={habit}
                onClick={() => {
                  const message = `I ${habit} my financial habit`;
                  onSendMessage?.(message);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg border border-teal-200"
              >
                <span>{habitIcons[habit] || '📝'}</span>
                <span className="text-sm capitalize">{habit}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "risk-select": ({ node, ...props }: any) => {
      const [risks, label] = (props['data-type'] || '').split(':');
      const riskOptions = risks?.split('|') || [];
      
      const riskColors: Record<string, string> = {
        conservative: 'bg-green-50 hover:bg-green-100 text-green-800 border-green-200',
        low_risk: 'bg-green-50 hover:bg-green-100 text-green-800 border-green-200',
        moderate: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border-yellow-200',
        balanced: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border-yellow-200',
        aggressive: 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200',
        growth_focused: 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {riskOptions.map((risk) => (
              <Button
                key={risk}
                onClick={() => {
                  const message = `My risk tolerance is ${risk.replace(/_/g, ' ')}`;
                  onSendMessage?.(message);
                }}
                className={`px-3 py-2 rounded-lg border ${riskColors[risk] || 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200'}`}
              >
                {risk.replace(/_/g, ' ').charAt(0).toUpperCase() + risk.slice(1).replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "timeline-select": ({ node, ...props }: any) => {
      const [timelines, label] = (props['data-type'] || '').split(':');
      const timelineOptions = timelines?.split('|') || [];
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {timelineOptions.map((timeline) => (
              <Button
                key={timeline}
                onClick={() => {
                  const message = `I want this goal completed in ${timeline.replace(/_/g, ' ')}`;
                  onSendMessage?.(message);
                }}
                className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-lg border border-orange-200"
              >
                {timeline.replace(/_/g, ' ').charAt(0).toUpperCase() + timeline.slice(1).replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "confidence-track": ({ node, ...props }: any) => {
      const [levels, label] = (props['data-type'] || '').split(':');
      const confidenceOptions = levels?.split('|') || [];
      
      const confidenceLabels: Record<string, string> = {
        '1': 'Very Low', very_low: 'Very Low',
        '2': 'Low', low: 'Low', 
        '3': 'Neutral', neutral: 'Neutral',
        '4': 'High', high: 'High',
        '5': 'Very High', very_high: 'Very High'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {confidenceOptions.map((level) => (
              <Button
                key={level}
                onClick={() => {
                  const displayLevel = confidenceLabels[level] || level;
                  const message = `My confidence level is ${displayLevel}`;
                  onSendMessage?.(message);
                }}
                className="px-3 py-2 bg-violet-50 hover:bg-violet-100 text-violet-800 rounded-lg border border-violet-200"
              >
                {confidenceLabels[level] || level}
              </Button>
            ))}
          </div>
        </div>
      );
    },

    "commitment-level": ({ node, ...props }: any) => {
      const [levels, label] = (props['data-type'] || '').split(':');
      const commitmentOptions = levels?.split('|') || [];
      
      const commitmentIcons: Record<string, string> = {
        very_committed: '🔥', all_in: '🔥',
        somewhat: '👍', mostly: '👍',
        need_motivation: '💪', need_support: '🤝'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {commitmentOptions.map((level) => (
              <Button
                key={level}
                onClick={() => {
                  const message = `I am ${level.replace(/_/g, ' ')} to this plan`;
                  onSendMessage?.(message);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-800 rounded-lg border border-pink-200"
              >
                <span>{commitmentIcons[level] || '💪'}</span>
                <span className="text-sm capitalize">{level.replace(/_/g, ' ')}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    },
    
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
    setIsDetailModalOpen,
    onSendMessage
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