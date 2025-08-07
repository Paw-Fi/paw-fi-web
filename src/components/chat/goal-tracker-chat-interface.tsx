"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useAIChat } from "@/contexts/ai-chat-context";
import { useFinancialHealthProfile, formatProfileForAI } from "@/hooks/use-financial-health-profile";
import { useUserGoals, createSingleGoalContext, createAllGoalsContext, UserGoal } from "@/hooks/goal-tracker/use-user-goals";
import { ChatConversationDisplay, ConversationMessage } from "./chat-conversation-display";
import { supabase } from "@/lib/supabase";
import { AI_ROLES } from "./ai-roles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye, faChartLine } from "@fortawesome/free-solid-svg-icons";

interface GoalTrackerChatInterfaceProps {
  goalId?: string; // Optional - when not provided, operates in global mode
  goal?: any; // Specific goal data (used when goalId provided)  
  onProgressUpdate?: () => void;
  onGoalUpdate?: () => void;
  className?: string;
  isExpanded?: boolean;
}

export function GoalTrackerChatInterface({ 
  goalId, 
  goal, 
  onProgressUpdate, 
  onGoalUpdate,
  className = "",
  isExpanded = false
}: GoalTrackerChatInterfaceProps) {
  const { user } = useAuth();
  const { addMessage, getMessages, clearMessages, closeChat } = useAIChat();
  const queryClient = useQueryClient();
  const isGlobalMode = !goalId; // Global mode when no specific goalId provided
  
  // State
  const [lastExecutedFunction, setLastExecutedFunction] = useState<string | null>(null);
    
  // Load financial health profile for authenticated users
  const { profile } = useFinancialHealthProfile(user?.id);
  
  // Fetch all user goals for global mode or context enhancement
  const { 
    data: userGoals, 
    isLoading: isGoalsLoading,
    error: goalsError 
  } = useUserGoals();
  
  // Custom message handler for goal tracker that integrates with existing AI context
  const handleGoalTrackerMessage = async (content: string) => {
    const messages = getMessages('tracker');
    
    const getConsistentTimestamp = (): number => {
      if (typeof window === "undefined") {
        return 1717000000000;
      }
      return Date.now();
    };
    
    // Create optimistic user message
    const userMessage: ConversationMessage = {
      content,
      role: "user",
      timestamp: getConsistentTimestamp(),
      chat_session_id: "", // Direct API mode - no conversation persistence yet
      userId: user?.id
    };
    
    // Optimistically add user message to context
    addMessage('tracker', userMessage);
    
    try {
      // Create intelligent context based on mode and available data
      let goalContext;
      
      if (isGlobalMode) {
        // Global mode: provide all goals context
        goalContext = userGoals ? createAllGoalsContext(userGoals) : {
          totalGoals: 0,
          activeGoals: 0,
          totalProgress: 0,
          goalsSummary: []
        };
      } else {
        // Single goal mode: provide specific goal context
        if (goal) {
          // Use provided goal data (frontend-first)
          goalContext = createSingleGoalContext(goal as UserGoal);
        } else if (userGoals && goalId) {
          // Fallback: find goal in user goals data
          const foundGoal = userGoals.find(g => g.id === goalId);
          goalContext = foundGoal ? createSingleGoalContext(foundGoal) : {
            goalId,
            goalTitle: 'Unknown Goal',
            currentAmount: 0,
            targetAmount: 0,
            progressPercentage: 0,
            goalType: 'savings',
            isOnTrack: false,
            milestones: [],
            status: 'active'
          };
        } else {
          // Minimal context when no data available
          goalContext = {
            goalId,
            goalTitle: 'Unknown Goal',
            currentAmount: 0,
            targetAmount: 0,
            progressPercentage: 0,
            goalType: 'savings',
            isOnTrack: false,
            milestones: [],
            status: 'active'
          };
        }
      }

      // Send message using goal tracker AI endpoint
      const { data: aiResponse, error: functionError } = await supabase.functions.invoke('goal-tracker-ai', {
        body: {
          message: content,
          goalContext,
          isGlobalMode,
          userId: user?.id,
          profile: formatProfileForAI(user, profile),
          conversationHistory: messages
            .map(msg => ({
              role: msg.role === 'assistant' ? 'model' : msg.role,
              parts: [{ text: msg.content }]
            }))
        },
      });

      if (functionError) {
        console.error('Supabase function error:', functionError);
        throw new Error(`Function error: ${functionError.message || 'Unknown error'}`);
      }

      if (!aiResponse) {
        throw new Error('No response received from AI function');
      }
      
      // Create AI message from response - prioritize function result message for actions like goal creation
      const functionResultMessage = aiResponse.function_result?.data?.message || aiResponse.function_result?.message;
      const aiMessage: ConversationMessage = {
        content: functionResultMessage || aiResponse.message || aiResponse.response || "I'm sorry, I couldn't process that request.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: userMessage.chat_session_id,
        userId: user?.id,
        metadata: {
          executedFunction: aiResponse.function_executed || aiResponse.executedFunction,
          functionResult: aiResponse.function_result || aiResponse.execution_result || aiResponse.functionResult,
          success: aiResponse.function_result?.success || aiResponse.execution_result?.success || aiResponse.success,
          cacheRefreshNeeded: aiResponse.cache_refresh_needed
        }
      };
      
      // Add AI message to context
      addMessage('tracker', aiMessage);

      // Handle function execution results and cache invalidation
      const executedFunction = aiResponse.function_executed || aiResponse.executedFunction;
      const cacheRefreshNeeded = aiResponse.cache_refresh_needed;
      
      if (executedFunction) {
        setLastExecutedFunction(executedFunction);
        
        // If cache refresh is needed, invalidate relevant queries
        if (cacheRefreshNeeded) {
          console.log('Invalidating cache due to function execution:', executedFunction);
          
          // Invalidate user goals cache (used by goal tracker index page)
          queryClient.invalidateQueries({ queryKey: ['user-goals', user?.id] });
          
          // Invalidate goals list queries (used by tracker index and hooks)
          queryClient.invalidateQueries({ queryKey: ['goals', 'list'] });
          queryClient.invalidateQueries({ queryKey: ['goals', 'list', user?.id] });
          
          // Invalidate specific goal detail queries if in single goal mode
          if (goalId) {
            queryClient.invalidateQueries({ queryKey: ['goals', 'detail', goalId] });
          }
          
          // Invalidate goal metrics
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: ['goals', 'metrics', user.id] });
          }
          
          // Invalidate financial health profile which may depend on goal data
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: ['financialHealthProfile', user.id] });
          }
          
          // Invalidate user activities to show new activities from AI actions
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: ['user-activities', user.id] });
          }
        }
        
        // Trigger appropriate callbacks based on function executed
        if (executedFunction.includes('progress') && onProgressUpdate) {
          setTimeout(onProgressUpdate, 1000); // Increased delay to allow cache invalidation
        }
        
        if ((executedFunction.includes('goal') || 
             executedFunction.includes('milestone') ||
             executedFunction.includes('timeline')) && onGoalUpdate) {
          setTimeout(onGoalUpdate, 1000); // Increased delay to allow cache invalidation
        }
      }
            
    } catch (error) {
      console.error('Goal tracker AI error:', error);
      
      // Add error message
      const errorMessage: ConversationMessage = {
        content: "Sorry, I had trouble processing your request. Please check your connection and try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: userMessage.chat_session_id,
        userId: user?.id,
        metadata: { isError: true }
      };
      
      addMessage('tracker', errorMessage);
      throw new Error(typeof error === 'string' ? error : 'Connection error. Please try again.');
    }
  };

  // Handle clearing conversation
  const handleClearConversation = () => {
    clearMessages('tracker');
    setLastExecutedFunction(null);
  };

  // Generate dynamic welcome message based on mode and context
  const getWelcomeMessage = () => {
    if (isGlobalMode) {
      const activeGoals = userGoals?.filter(g => g.status === 'active').length || 0;
      
      if (activeGoals === 0) {
        return "Hi! I'm Alex, your AI goal tracker. Ready to help you create and manage your financial goals through natural conversation.";
      } else if (activeGoals === 1) {
        return `Hi! I'm Alex, your AI goal tracker. You have 1 active financial goal. How can I help you manage it today?`;
      } else {
        const avgProgress = userGoals ? 
          Math.round(userGoals.reduce((sum, g) => sum + g.progress_percentage, 0) / userGoals.length) : 0;
        return `Hi! I'm Alex, your AI goal tracker. You have ${activeGoals} active goals with ${avgProgress}% average progress. How can I help you today?`;
      }
    }

    if (!goal) {
      return "Hi! I'm Alex, your AI goal tracker. I'm here to help you manage your financial goals through natural conversation.";
    }

    const progressText = goal.progress_percentage 
      ? `You're currently at ${Math.round(goal.progress_percentage)}% of your goal.`
      : "Let's get started on tracking your progress!";

    return `Hi! I'm Alex, your AI goal tracker for "${goal.title}". ${progressText} How can I help you today?`;
  };

  const getWelcomeSubtitle = () => {
    if (isGlobalMode) {
      return "Ask me about any of your goals - update progress, create new goals, manage milestones, or get insights across all your goals!";
    }

    if (!goal) {
      return "Ask me to update progress, manage milestones, adjust timelines, or get insights!";
    }

    const suggestions = [];
    if (goal.progress_percentage < 100) {
      suggestions.push("update progress");
    }
    if (goal.milestones?.length > 0) {
      suggestions.push("manage milestones");
    }
    suggestions.push("get insights", "adjust timeline");

    return `I can help you ${suggestions.join(", ")}, and more!`;
  };


  return (
    <div className="h-full bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950 flex flex-col">
      {/* Floating close button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={closeChat}
          className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        >
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-white to-orange-50 dark:from-slate-800 dark:to-slate-700">
        <div className="px-6 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-orange-800 to-amber-900 dark:from-white dark:via-orange-200 dark:to-amber-100 bg-clip-text text-transparent mb-2">
              Goal Tracker
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Track and achieve your financial goals with AI coach Alex
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container - Takes remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatConversationDisplay
          chatConfig={{
            aiRole: 'GOAL_TRACKER',
            enableGuestSessions: false,
            enableSignupPrompt: false,
            enableLoadingDuration: false,
            useExternalMessages: true,
            externalMessages: getMessages('tracker'),
            customMessageHandler: handleGoalTrackerMessage,
          }}
          initialSuggestedResponses={["I want to create a new goal", "I want to update my progress", "I want to manage milestones", "I want to adjust the timeline"]}
          welcomeMessage={getWelcomeMessage()}
          welcomeSubtitle={getWelcomeSubtitle()}
          onClearConversation={handleClearConversation}
          className="flex-1"
          agentIcon={
            <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-600">
              <FontAwesomeIcon 
                icon={isGlobalMode ? faChartLine : faBullseye} 
                className="w-5 h-5 text-white" 
              />
              {/* Notification badges */}
              {isGlobalMode && userGoals?.some(g => !g.is_on_track) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
              {!isGlobalMode && goal && !goal.is_on_track && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
          }
        />
      </div>
      
      {/* Dynamic footer with goal data */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {isGlobalMode && userGoals && userGoals.length > 0 ? (
              // Global mode: Show actual goal data
              <>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartLine} className="w-3 h-3 text-orange-600" />
                  <span className="font-medium">All Goals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>{userGoals.filter(g => g.status === 'active').length} active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>{Math.round(userGoals.reduce((sum, g) => sum + g.progress_percentage, 0) / userGoals.length)}% avg progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>${userGoals.reduce((sum, g) => sum + g.current_amount, 0).toLocaleString()} saved</span>
                </div>
                {lastExecutedFunction && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ {lastExecutedFunction.replace(/-/g, ' ')}
                    </span>
                  </div>
                )}
              </>
            ) : !isGlobalMode && goal ? (
              // Single goal mode: Show specific goal data
              <>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faBullseye} className="w-3 h-3 text-orange-600" />
                  <span className="font-medium">{goal.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>${(goal.current_amount || 0).toLocaleString()} saved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>{Math.round(goal.progress_percentage || 0)}% complete</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>${(goal.target_amount || 0).toLocaleString()} target</span>
                </div>
                {lastExecutedFunction && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ {lastExecutedFunction.replace(/-/g, ' ')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              // Default indicators when no data
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Goal Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>Progress Updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Smart Insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>AI Coaching</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}