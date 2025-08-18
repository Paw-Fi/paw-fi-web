"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb, faClipboardCheck, faEye, faUser } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { GoalType } from "../goal-tracker/types";
import { CourseCard } from "@/components/ui/course-card";
import { MessageSection } from "@/utils/message-parser";

interface MarkdownComponentsProps {
  onOpenQuizModal?: () => void;
  onGoalTemplateClick?: (goalType: GoalType) => void;
  onSendMessage?: (message: string) => void;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (open: boolean) => void;
  handleCourseClick: (courseId: string) => () => void;
  setModalSections?: (sections: MessageSection[]) => void;
  navigate?: any;
  closeChat?: () => void;
  openChat?: (aiId: 'advisor' | 'educator') => void;
  hasProfile?: boolean;
}

// Minimal version for use in contexts without hooks - removes interactive elements
export const createMinimalMarkdownComponents = () => {
  return {
    a: ({ node, ...props }: any) => (
      <a {...props} target="_blank" className="text-primary dark:text-dark-primary font-bold no-underline" />
    ),
    
    // Standard code block handling
    code: ({ node, inline, children, ...props }: any) => {
      if (inline) {
        return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>{children}</code>;
      }
      
      return (
        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
          <code {...props}>{children}</code>
        </pre>
      );
    },
  };
};

export const createMarkdownComponents = ({
  onOpenQuizModal,
  onGoalTemplateClick,
  onSendMessage,
  setIsDetailModalOpen,
  handleCourseClick,
  setModalSections,
  navigate,
  closeChat,
  openChat,
  hasProfile,
}: MarkdownComponentsProps) => {

  return {
    a: ({ node, ...props }: any) => (
      <a {...props} target="_blank" className="text-primary dark:text-dark-primary font-bold no-underline" />
    ),
    
    // Interactive Button Components
    "confirm-button": ({ node, ...props }: any) => {
      const [options, label] = (props['data-type'] || '').split(':');
      const buttonOptions = options?.split('|') || [];
      
      return (
        <div className="mt-3 flex gap-2 flex-wrap">
          <p className="text-sm font-medium mb-2 w-full text-foreground dark:text-dark-foreground">{label}</p>
          {buttonOptions.map((option: string) => (
            <Button
              key={option}
              onClick={() => {
                const message = option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ');
                onSendMessage?.(message);
              }}
              className={`px-4 py-2 rounded-lg ${
                option.includes('yes') || option.includes('agree') || option.includes('proceed')
                  ? 'bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white'
                  : 'bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white'
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {amountOptions.map((amount: string) => (
              <Button
                key={amount}
                onClick={() => {
                  const message = amount === 'other' || amount === 'custom'
                    ? 'I want to add a custom amount' 
                    : `I saved $${amount} today`;
                  onSendMessage?.(message);
                }}
                className="px-3 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-800 dark:text-green-400 rounded-lg border border-green-300 dark:border-green-700"
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
          <p className="text-sm font-medium mb-3 text-foreground dark:text-dark-foreground">{label}</p>
          <div className="grid grid-cols-2 gap-2">
            {actionOptions.map((action: string) => (
              <Button
                key={action}
                onClick={() => {
                  const message = `I want to focus on ${action.replace(/_/g, ' ')}`;
                  onSendMessage?.(message);
                }}
                className="flex items-center gap-2 px-3 py-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-700"
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
        add_milestone: '🎯', adjust_target: '🎯', set_reminder: '🔔',
        create: '➕', update: '✏️', delete: '🗑️', 
        change_status: '🔄', change_priority: '⭐'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3 text-foreground dark:text-dark-foreground">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {actionOptions.map((action: string) => (
             <Button
             key={action}
             onClick={() => {
               // Generate more specific messages based on action type
               const actionMessages: Record<string, string> = {
                 create: 'I want to create a new milestone',
                 update: 'I want to update this milestone',
                 delete: 'I want to delete this milestone',
                 change_status: 'I want to change the status',
                 change_priority: 'I want to change the priority'
               };
               
               const message = actionMessages[action] || `I want to ${action.replace(/_/g, ' ')} for my goal`;
               onSendMessage?.(message);
             }}
           >
             <span className="text-purple-400 dark:text-purple-300 hover:text-cyan-400 dark:hover:text-cyan-300 transition-colors duration-300">
               {goalActionIcons[action] || '⚡'}
             </span>
             <span className="capitalize">
               {action.replace(/_/g, ' ')}
             </span>
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
            {dataOptions.map((dataType: string) => (
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

    "amount-select": ({ node, ...props }: any) => {
      const [amounts, label] = (props['data-type'] || '').split(':');
      const amountOptions = amounts?.split('|') || [];
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3">{label}</p>
          <div className="grid grid-cols-3 gap-2">
            {amountOptions.map((amount: string) => (
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
            {priorityOptions.map((priority: string) => (
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
            {styleOptions.map((style: string) => (
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
            {habitOptions.map((habit: string) => (
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
            {riskOptions.map((risk: string) => (
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
            {timelineOptions.map((timeline: string) => (
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
            {confidenceOptions.map((level: string) => (
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
            {commitmentOptions.map((level: string) => (
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
        advisor: { label: "Chat with Moneko", aiId: 'advisor' },
        educator: { label: "Chat with Finni", aiId: 'educator' }
      };
      
      const buttonInfo = aiButtonLabels[aiType];
      if (!buttonInfo) return null;

      return (
        <div className="mt-3">
          <Button
            onClick={() => { closeChat?.(); openChat?.(buttonInfo.aiId); }}
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

    "questionnaire-button": () => (
      <div className="mt-3">
        <Button
          onClick={() => !hasProfile && onOpenQuizModal?.()}
          disabled={!!hasProfile}
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

    "update-profile-button": ({ node, ...props }: any) => {
      const params = props['data-params'];
      
      // If no params, show the simple update profile button
      if (!params) {
        return (
          <div className="mt-3">
            <Button
              onClick={() => {
                navigate?.({ to: '/dashboard/user-settings/profile' });
                closeChat?.();
              }}
              className="bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
              Update Your Financial Profile
            </Button>
          </div>
        );
      }
      
      // Parse parameters: "income|expenses:Update Income and Expenses"
      const [categories, label] = params.split(':');
      const categoryList = categories?.split('|') || [];
      
      const categoryIcons: Record<string, string> = {
        income: '💵',
        expenses: '🧾', 
        debt: '💳',
        assets: '🏦',
        savings: '💰',
        investments: '📈'
      };
      
      return (
        <div className="mt-3">
          <p className="text-sm font-medium mb-3 text-foreground dark:text-dark-foreground">{label || 'Update Financial Information'}</p>
          <div className="flex gap-2 flex-wrap">
            {categoryList.map((category: string) => (
              <Button
                key={category}
                onClick={() => {
                  navigate?.({ to: '/dashboard/user-settings/profile' });
                  closeChat?.();
                }}
                className="flex items-center gap-2 px-3 py-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-700"
              >
                <span>{categoryIcons[category] || '📊'}</span>
                <span className="text-sm capitalize">{category.replace(/_/g, ' ')}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    },

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
        // Decode escaped JSON data
        const escapedData = props['data-sections'] || '[]';
        const unescapedData = escapedData.replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        const sections = JSON.parse(unescapedData);
        return (
          <>
            <div className="mt-3 not-prose">
              <Button
                onClick={() => {
                  setModalSections?.(sections);
                  setIsDetailModalOpen(true);
                }}
                variant="outline"
                size="sm"
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                View detailed information ({sections.length} sections)
              </Button>
            </div>
          </>
        );
      } catch (error) {
        console.error('Error rendering view details button:', error);
        return null;
      }
    },
  };
};