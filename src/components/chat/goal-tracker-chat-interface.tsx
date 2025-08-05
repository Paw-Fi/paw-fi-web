"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useFinancialHealthProfile, formatProfileForAI } from "@/hooks/use-financial-health-profile";
import { useUserGoals, createSingleGoalContext, createAllGoalsContext, UserGoal } from "@/hooks/goal-tracker/use-user-goals";
import { ChatConversationDisplay, ConversationMessage } from "./chat-conversation-display";
import { supabase } from "@/lib/supabase";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { AI_ROLES } from "./ai-roles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye, faChartLine } from "@fortawesome/free-solid-svg-icons";

type Message = ConversationMessage;

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
  const isAuthenticated = !!user;
  const queryClient = useQueryClient();
  const isGlobalMode = !goalId; // Global mode when no specific goalId provided
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastExecutedFunction, setLastExecutedFunction] = useState<string | null>(null);
    
  // Load financial health profile for authenticated users
  const { profile } = useFinancialHealthProfile(user?.id);
  
  // Fetch all user goals for global mode or context enhancement
  const { 
    data: userGoals, 
    isLoading: isGoalsLoading,
    error: goalsError 
  } = useUserGoals();
  
  // For now, Goal Tracker uses direct API without conversation persistence
  // TODO: Integrate with conversation system when GOAL_TRACKER model is added
  const isConversationsLoading = false;
  
  // Enhanced send message function for goal tracker
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    setConnectionError(null);
    
    const getConsistentTimestamp = (): number => {
      if (typeof window === "undefined") {
        return 1717000000000;
      }
      return Date.now();
    };
    
    // Create optimistic user message
    const userMessage: Message = {
      content,
      role: "user",
      timestamp: getConsistentTimestamp(),
      chat_session_id: "", // Direct API mode - no conversation persistence yet
      userId: user?.id
    };
    
    // Optimistically add user message to UI
    setMessages(prev => [...prev, userMessage]);
    
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
          profile: formatProfileForAI(user, profile)
        },
      });

      if (functionError) {
        console.error('Supabase function error:', functionError);
        throw new Error(`Function error: ${functionError.message || 'Unknown error'}`);
      }

      if (!aiResponse) {
        throw new Error('No response received from AI function');
      }
      
      // Create AI message from response
      const aiMessage: Message = {
        content: aiResponse.message || aiResponse.response || "I'm sorry, I couldn't process that request.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: userMessage.chat_session_id,
        userId: user?.id,
        metadata: {
          executedFunction: aiResponse.function_executed || aiResponse.executedFunction,
          functionResult: aiResponse.execution_result || aiResponse.functionResult,
          success: aiResponse.execution_result?.success || aiResponse.success
        }
      };
      
      // Add AI message to UI
      setMessages(prev => [...prev, aiMessage]);

      // Handle function execution results
      const executedFunction = aiResponse.function_executed || aiResponse.executedFunction;
      if (executedFunction) {
        setLastExecutedFunction(executedFunction);
        
        // Trigger appropriate callbacks based on function executed
        if (executedFunction.includes('progress') && onProgressUpdate) {
          setTimeout(onProgressUpdate, 500); // Small delay for UI smoothness
        }
        
        if ((executedFunction.includes('goal') || 
             executedFunction.includes('milestone') ||
             executedFunction.includes('timeline')) && onGoalUpdate) {
          setTimeout(onGoalUpdate, 500);
        }
      }
            
    } catch (error) {
      console.error('Goal tracker AI error:', error);
      
      // Add error message
      const errorMessage: Message = {
        content: "Sorry, I had trouble processing your request. Please check your connection and try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: userMessage.chat_session_id,
        userId: user?.id,
        metadata: { isError: true }
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setConnectionError("Connection error. Please try again.");
    } finally {
      setIsSendingMessage(false);
    }
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
    <div className={className}>
      <ChatConversationDisplay
        messages={messages}
        onMessageSend={handleSendMessage}
        isSendingMessage={isSendingMessage}
        agentName="Alex - Goal Tracker AI"
        welcomeMessage={getWelcomeMessage()}
        welcomeSubtitle={getWelcomeSubtitle()}
        connectionError={connectionError || undefined}
        isBackendProcessing={isConversationsLoading}
        headerClassName="p-4"
        agentIcon={
          <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600">
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
        placeholder={
          isGlobalMode 
            ? "Ask Alex about your goals..." 
            : goal 
              ? `Ask Alex about "${goal.title}"...` 
              : "Ask Alex about your goals..."
        }
        suggestedPrompts={
          isGlobalMode ? [
            "Show me all my goals",
            "Which goals need attention?", 
            "Create a new savings goal",
            "What's my overall progress?",
            "Update progress on my emergency fund"
          ] : goal ? [
            "Add $500 to my progress",
            "How am I tracking towards my goal?",
            "Create a new milestone",
            "When will I reach my target?",
            "Give me insights on my progress"
          ] : [
            "How do I update my goal progress?",
            "What functions are available?",
            "Help me manage my milestones",
            "Show me goal insights"
          ]
        }
      />
      
      {/* Context Display */}
      {(isGlobalMode || goal) && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {isGlobalMode ? (
              // Global mode context
              <>
                <div className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faChartLine} className="w-3 h-3" />
                  <span>All Goals</span>
                </div>
                {userGoals && userGoals.length > 0 && (
                  <>
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                    <span>{userGoals.filter(g => g.status === 'active').length} active</span>
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                    <span>
                      {Math.round(userGoals.reduce((sum, g) => sum + g.progress_percentage, 0) / userGoals.length)}% avg progress
                    </span>
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                    <span>
                      ${userGoals.reduce((sum, g) => sum + g.current_amount, 0).toLocaleString()} saved
                    </span>
                  </>
                )}
              </>
            ) : (
              // Single goal mode context
              <>
                <div className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faBullseye} className="w-3 h-3" />
                  <span>{goal.title}</span>
                </div>
                <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                <span>${(goal.current_amount || 0).toLocaleString()} / ${(goal.target_amount || 0).toLocaleString()}</span>
                <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                <span>{Math.round(goal.progress_percentage || 0)}% complete</span>
              </>
            )}
            
            {lastExecutedFunction && (
              <>
                <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                <span className="text-green-600 dark:text-green-400">
                  ✓ {lastExecutedFunction.replace(/-/g, ' ')}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}