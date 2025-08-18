"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSignInAlt } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { ChatConversationDisplay, ConversationMessage } from "@/components/chat/chat-conversation-display";
import { QuestionnaireFlow } from "@/components/goal-tracker/questionnaire/QuestionnaireFlow";
import { GoalPresentationFlow } from "@/components/goal-tracker/goal-presentation";
import { getQuestionnaireTemplate } from "@/data/questionnaire-templates";
import { supabase } from "@/lib/supabase";
import type { 
  GoalType, 
  GoalCreationResult 
} from "@/components/goal-tracker/types";
import { ActivityActions } from "@/utils/reward-actions-clone";
import { logUserActivity } from "@/utils/activity-logger-clone";
import { useAuth } from "@/contexts/auth-context";
import { Modal } from "../ui/modal";
import monekoIcon from "@assets/images/avatar/moneko.png"

interface AIIntroComponentProps {
  className?: string;
  initialMessage?: string;
}

// Cookie utility functions
const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const GUEST_GOALS_COOKIE = "moneko-guest-goals";

// Guest goal management functions
const getGuestGoalIds = (): string[] => {
  const goalIds = getCookie(GUEST_GOALS_COOKIE);
  return goalIds ? JSON.parse(goalIds) : [];
};

const addGuestGoalId = (goalId: string) => {
  const existingGoalIds = getGuestGoalIds();
  const updatedGoalIds = [...existingGoalIds, goalId];
  setCookie(GUEST_GOALS_COOKIE, JSON.stringify(updatedGoalIds), 365);
};

const clearGuestGoalIds = () => {
  deleteCookie(GUEST_GOALS_COOKIE);
};

export function AIIntroComponent({ className = "", initialMessage }: AIIntroComponentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isQuestionnaireModalOpen, setIsQuestionnaireModalOpen] = useState(false);
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState<GoalType | null>(null);
  const [goalData, setGoalData] = useState<GoalCreationResult | null>(null);
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [hasUpdatedGuestGoals, setHasUpdatedGuestGoals] = useState(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update guest goals when user logs in
  const updateGuestGoals = useCallback(async (userId: string) => {
    const guestGoalIds = getGuestGoalIds();
    
    if (guestGoalIds.length === 0) {
      return;
    }
    
    try {
      console.log(`Migrating ${guestGoalIds.length} guest goals to user ${userId}`);
      
      // Update each guest goal with the user ID and log activity
      for (const goalId of guestGoalIds) {
        // First, get the goal details for activity logging
        const { data: goalData, error: fetchError } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('id', goalId)
          .is('user_id', null)
          .single();
        
        if (fetchError) {
          console.error(`Failed to fetch guest goal ${goalId}:`, fetchError);
          return;
        }
        
        if (!goalData) {
          console.warn(`Guest goal ${goalId} not found or already migrated`);
          return;
        }
        
        // Update the goal with user ID
        const { error: updateError } = await supabase
          .from('financial_goals')
          .update({ user_id: userId })
          .eq('id', goalId)
          .is('user_id', null);
        
        if (updateError) {
          console.error(`Failed to migrate guest goal ${goalId}:`, updateError);
          continue;
        }
        
        // Log the goal creation activity with original creation timestamp
        try {
          await logUserActivity( userId, {
            type: 'goal',
            action: ActivityActions.GOAL_CREATED,
            source: 'ai-goal-generator-migration',
            metadata: {
              goalId: goalData.id,
              goalTitle: goalData.title,
              goalType: goalData.goal_type,
              targetAmount: goalData.target_amount,
              targetDate: goalData.target_date,
              migratedFromGuest: true,
              originalCreatedAt: goalData.created_at
            },
            timestamp: goalData.created_at // Use original creation time
          });
          
          console.log(`Successfully migrated guest goal ${goalId} to user ${userId} with activity log`);
        } catch (activityError) {
          console.warn(`Failed to log activity for migrated goal ${goalId}:`, activityError);
          // Continue even if activity logging fails
        }
      }
      
      // Clear guest goal IDs after successful migration
      clearGuestGoalIds();
      console.log(`Completed migration of ${guestGoalIds.length} guest goals with activity logging`);
      
    } catch (error) {
      console.error('Failed to migrate guest goals:', error);
    }
  }, []);
  
  // Handle guest goal migration on login
  useEffect(() => {
    if (user?.id && !hasUpdatedGuestGoals) {
      updateGuestGoals(user.id);
      setHasUpdatedGuestGoals(true);
    }
  }, [user?.id, hasUpdatedGuestGoals, updateGuestGoals]);

  // Initialize with welcome message or process initial message if provided
  useEffect(() => {
    const initializeChat = async () => {
      // If there's an initial message, get both welcome and response
      if (initialMessage?.trim()) {
        const userMessage: ConversationMessage = {
          content: initialMessage,
          role: "user",
          timestamp: Date.now(),
          chat_session_id: "intro-session",
        };
        
        // Show user message immediately and start loading indicators
        setMessages([userMessage]);
        setIsSendingMessage(true);
        setLoadingDuration(0);
        
        // Start loading timer
        if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = setInterval(() => {
          setLoadingDuration(prev => prev + 1);
        }, 1000);
        
        // Get both welcome message and response from the backend
        try {
          const response = await fetch(`${supabase.supabaseUrl}/functions/v1/ai-onboarding-coach`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabase.supabaseKey}`,
            },
            body: JSON.stringify({ 
              message: initialMessage, 
              withWelcomeAndResponse: true 
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            const initialMessages = [userMessage];
            
            // Add welcome message
            const welcomeMessage: ConversationMessage = {
              content: data.welcome,
              role: "assistant",
              timestamp: Date.now() + 1,
              chat_session_id: "intro-session",
            };
            initialMessages.push(welcomeMessage);
            
            // Add AI response to user's message
            const aiMessage: ConversationMessage = {
              content: data.response || "I'm sorry, I couldn't generate a response.",
              role: "assistant",
              timestamp: Date.now() + 2,
              chat_session_id: "intro-session",
            };
            initialMessages.push(aiMessage);
            
            setMessages(initialMessages);
          }
        } catch (aiError) {
          console.error('Failed to process initial message:', aiError);
          // Add error message if API fails
          const errorMessage: ConversationMessage = {
            content: "Sorry, I had trouble connecting. Please check your connection or try again.",
            role: "assistant",
            timestamp: Date.now() + 1,
            chat_session_id: "intro-session",
            metadata: { isError: true }
          };
          setMessages([userMessage, errorMessage]);
        } finally {
          // Stop loading indicators
          setIsSendingMessage(false);
          setLoadingDuration(0);
          
          if (loadingTimerRef.current) {
            clearInterval(loadingTimerRef.current);
            loadingTimerRef.current = null;
          }
        }
        
        return;
      }

      // No initial message, so load the welcome message only
      try {
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/ai-onboarding-coach`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`,
          },
          body: JSON.stringify({ isFirstMessage: true }),
        });

        if (!response.ok) {
          throw new Error('Failed to initialize chat');
        }

        const data = await response.json();
        
        const welcomeMessage: ConversationMessage = {
          content: data.response,
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: "intro-session",
        };

        setMessages([welcomeMessage]);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        // Fallback message
        const fallbackMessage: ConversationMessage = {
          content: `Hey! I'm Moneko—your AI money coach 👋 No worries, you're in the right place. I'll help you build a retirement plan step by step.

Here's how it works:
• You tell me your goal
• I get a quick snapshot of your finances  
• I build a simple, personalized plan

Sound good?`,
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: "intro-session",
        };
        
        setMessages([fallbackMessage]);
      }
    };

    initializeChat();
  }, [initialMessage]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    setLoadingDuration(0);
    
    // Start loading timer
    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    loadingTimerRef.current = setInterval(() => {
      setLoadingDuration(prev => prev + 1);
    }, 1000);
    
    // Create optimistic user message
    const userMessage: ConversationMessage = {
      content,
      role: "user",
      timestamp: Date.now(),
      chat_session_id: "intro-session",
    };
    
    // Optimistically add user message to UI
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/ai-onboarding-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Create AI message from response
      const aiMessage: ConversationMessage = {
        content: data.response || "I'm sorry, I couldn't generate a response.",
        role: "assistant",
        timestamp: Date.now(),
        chat_session_id: "intro-session",
      };
      
      // Add AI message to UI
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ConversationMessage = {
        content: "Sorry, I had trouble connecting. Please check your connection or try again.",
        role: "assistant",
        timestamp: Date.now(),
        chat_session_id: "intro-session",
        metadata: { isError: true }
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSendingMessage(false);
      setLoadingDuration(0);
      
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
  };

  const handleGoalTemplateClick = (goalType: GoalType) => {
    setSelectedGoalType(goalType);
    setIsQuestionnaireModalOpen(true);
  };

  const handleQuestionnaireComplete = (result: GoalCreationResult) => {
    // Store goal ID in cookie for guest users
    if (!user && result.goal?.id) {
      addGuestGoalId(result.goal.id);
    }
    
    setGoalData(result);
    setIsQuestionnaireModalOpen(false);
    setIsPresentationModalOpen(true);
  };

  const handlePresentationComplete = () => {
    setIsPresentationModalOpen(false);
    setGoalData(null);
    // Navigate to tracker dashboard for logged-in users
    navigate({ to: '/dashboard/tracker/' + goalData?.goal?.id });
  };

  const handleRegistrationPrompt = () => {
    setIsPresentationModalOpen(false);
    setGoalData(null);
    // Navigate to registration/login page
    navigate({ to: '/register', search: { redirect: '/dashboard/tracker/' + goalData?.goal?.id } });
  };

  const handleCloseModal = () => {
    setIsQuestionnaireModalOpen(false);
    setSelectedGoalType(null);
  };

  const handleClosePresentationModal = () => {
    setIsPresentationModalOpen(false);
    setGoalData(null);
  };

  const handleLogin = () => {
    navigate({ to: '/login', search: { redirect: '/dashboard' } });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
    };
  }, []);

  const questionnaireTemplate = selectedGoalType ? getQuestionnaireTemplate(selectedGoalType) : null;

  return (
    <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden ${className}`}>
      {/* Modern Header with proper constraints */}
      <div className="flex-shrink-0 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-r from-white/90 to-purple-50/90 dark:from-slate-800/90 dark:to-slate-700/90 relative">
        <div className="px-6 sm:px-8 lg:px-10">
          <div className="py-6 sm:py-8">
            {/* Login Button - Only show for non-logged in users */}
            { (
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                <Button
                  onClick={handleLogin}
                  variant="outline"
                >
                  <FontAwesomeIcon icon={faSignInAlt} className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                  <span className="sm:hidden">Login</span>
                </Button>
                {/* <Button onClick={()=>{
                  setIsPresentationModalOpen(true)
                  setSelectedGoalType("saving")
                  setGoalData({
                    "success": true,
                    "goal": {
                        "id": "f16d03c9-1024-459f-9e55-b87392557970",
                        "user_id": "77b1fd0b-f477-4a23-9d4e-aa632fd9efba",
                        "title": "Achieve $1,000/Month in Passive Income",
                        "description": "This goal is to build a diversified portfolio of income-producing assets with the objective of generating $1,000 per month in durable, passive income. The strategy focuses on capital appreciation and the systematic reinvestment of dividends and interest to accelerate growth, transitioning to income distribution upon reaching the target capital.",
                        "goal_type": "passive_income",
                        "category": null,
                        "target_amount": 267000,
                        "current_amount": 0,
                        "currency": "USD",
                        "start_date": "2025-08-07",
                        "target_date": "2073-08-07",
                        "estimated_completion_date": null,
                        "ai_questionnaire_data": {
                            "effort_level": "low",
                            "time-horizon": "medium",
                            "risk_tolerance": "moderate",
                            "target_monthly_income": "1000",
                            "income_stream_preferences": [
                                "reits"
                            ],
                            "current_investment_capital": "3400",
                            "monthly_investment_capacity": "100"
                        },
                        "ai_generated_strategy": "The core strategy is to accumulate a target capital of $267,000 by investing in a diversified portfolio of income-producing assets. This capital amount is calculated to generate $1,000 per month ($12,000 annually) based on a projected average portfolio yield of 4.5%.\n\n**Portfolio Allocation (Low Effort / Moderate Risk):**\nTo align with your 'low effort' preference and 'moderate' risk tolerance, we will use broad-market Exchange Traded Funds (ETFs):\n*   **60% Dividend Stock ETF (e.g., Schwab U.S. Dividend Equity ETF - SCHD):** For exposure to financially strong companies with a history of paying dividends, offering a blend of income and capital growth.\n*   **30% Real Estate ETF (e.g., Vanguard Real Estate ETF - VNQ):** To align with your preference for REITs, providing diversified exposure to income-producing real estate.\n*   **10% Total Bond Market ETF (e.g., Vanguard Total Bond Market ETF - BND):** To add stability and a reliable income floor to the portfolio, reducing overall volatility.\n\n**Execution Phases:**\n1.  **Accumulation Phase (Now until ~2073):** For the entire duration of the goal, all dividends and interest payments will be automatically reinvested. This leverages the power of compound growth, where your earnings begin to earn their own money. You will contribute a minimum of $100 every month.\n2.  **Distribution Phase (Post-2073):** Once the $267,000 capital target is reached, you will turn off dividend reinvestment and begin withdrawing the monthly income generated by the portfolio.",
                        "ai_generated_milestones": [
                            {
                                "type": "action",
                                "title": "Initial Capital Deployment",
                                "dueDate": "2025-09-07",
                                "priority": "critical",
                                "aiRationale": "This first step is critical to put your existing capital to work immediately, initiating the compounding process. The allocation is designed to align with your moderate risk tolerance and preference for REITs.",
                                "description": "Invest your current capital of $3,400 into a diversified portfolio according to the recommended 60/30/10 allocation strategy. $2,040 into a Dividend ETF (SCHD), $1,020 into a REIT ETF (VNQ), and $340 into a Bond ETF (BND)."
                            },
                            {
                                "type": "habit",
                                "title": "Establish Automated Monthly Investment",
                                "dueDate": "2025-09-07",
                                "priority": "critical",
                                "frequency": "monthly",
                                "aiRationale": "Consistency is key to long-term success. Automating your monthly contributions ensures you are continuously building your asset base, which is the engine of your future passive income.",
                                "description": "Set up an automated monthly investment of $100 to be allocated across your portfolio. This creates a disciplined investment habit, crucial for reaching the long-term goal.",
                                "habitDescription": "Automatically invest $100 into your passive income portfolio."
                            },
                            {
                                "type": "savings",
                                "title": "Achieve $25/Month in Passive Income",
                                "dueDate": "2028-02-07",
                                "priority": "high",
                                "aiRationale": "This is your first tangible income-focused milestone. Reaching this proves the strategy is working and provides motivation. It requires growing your capital from $3,400 to approximately $6,700.",
                                "description": "Continue investing and reinvesting dividends until your portfolio is generating an average of $25 per month ($300 annually) in passive income.",
                                "targetAmount": 25
                            },
                            {
                                "type": "savings",
                                "title": "Achieve $100/Month in Passive Income",
                                "dueDate": "2039-08-07",
                                "priority": "high",
                                "aiRationale": "Achieving a three-figure monthly income represents a significant scaling-up of your passive income stream and demonstrates the power of consistent compounding over several years. This requires a portfolio of approximately $26,700.",
                                "description": "Through consistent contributions and dividend reinvestment, grow your portfolio until it generates an average of $100 per month ($1,200 annually) in passive income.",
                                "targetAmount": 100
                            },
                            {
                                "type": "savings",
                                "title": "Achieve $250/Month in Passive Income",
                                "dueDate": "2052-08-07",
                                "priority": "medium",
                                "aiRationale": "This milestone marks the point where your passive income becomes a substantial supplementary cash flow, covering significant monthly expenses. It requires a portfolio of approximately $66,700.",
                                "description": "Continue executing the strategy to grow your portfolio until it generates an average of $250 per month ($3,000 annually) in passive income.",
                                "targetAmount": 250
                            },
                            {
                                "type": "review",
                                "title": "Annual Strategy & Contribution Review",
                                "dueDate": "2026-08-07",
                                "priority": "medium",
                                "aiRationale": "Regular reviews are essential to ensure the strategy remains aligned with your goals and that the portfolio's performance is on track. This is also the designated time to evaluate if you can increase your contribution rate to accelerate the timeline.",
                                "description": "One year from now, review your portfolio's performance against the 4.5% target yield. Assess your financial situation to see if the $100 monthly contribution can be increased."
                            }
                        ],
                        "ai_insights": null,
                        "status": "active",
                        "progress_percentage": 0,
                        "is_on_track": true,
                        "created_at": "2025-08-07T11:51:30.414903+00:00",
                        "updated_at": "2025-08-07T11:51:30.414903+00:00",
                        "completed_at": null
                    },
                    "milestones": [
                        {
                            "id": "0f07fd93-5747-4918-b939-f4d2454f6a65",
                            "goal_id": "f16d03c9-1024-459f-9e55-b87392557970",
                            "title": "Initial Capital Deployment",
                            "description": "Invest your current capital of $3,400 into a diversified portfolio according to the recommended 60/30/10 allocation strategy. $2,040 into a Dividend ETF (SCHD), $1,020 into a REIT ETF (VNQ), and $340 into a Bond ETF (BND).",
                            "milestone_type": "action",
                            "target_amount": null,
                            "current_amount": 0,
                            "habit_description": null,
                            "frequency": null,
                            "habit_target_value": null,
                            "start_date": "2025-08-07",
                            "due_date": "2025-09-07",
                            "completed_date": null,
                            "status": "pending",
                            "progress_percentage": 0,
                            "is_ai_generated": true,
                            "display_order": 0,
                            "priority": "critical",
                            "created_at": "2025-08-07T11:51:31.170404+00:00",
                            "updated_at": "2025-08-07T11:51:31.170404+00:00"
                        },
                        {
                            "id": "42fea0e6-7534-4bf3-b63e-323764a00316",
                            "goal_id": "f16d03c9-1024-459f-9e55-b87392557970",
                            "title": "Establish Automated Monthly Investment",
                            "description": "Set up an automated monthly investment of $100 to be allocated across your portfolio. This creates a disciplined investment habit, crucial for reaching the long-term goal.",
                            "milestone_type": "habit",
                            "target_amount": null,
                            "current_amount": 0,
                            "habit_description": "Automatically invest $100 into your passive income portfolio.",
                            "frequency": "monthly",
                            "habit_target_value": null,
                            "start_date": "2025-08-07",
                            "due_date": "2025-09-07",
                            "completed_date": null,
                            "status": "pending",
                            "progress_percentage": 0,
                            "is_ai_generated": true,
                            "display_order": 1,
                            "priority": "critical",
                            "created_at": "2025-08-07T11:51:31.170404+00:00",
                            "updated_at": "2025-08-07T11:51:31.170404+00:00"
                        },
                        {
                            "id": "79736d29-0165-451a-8757-6e123d95575a",
                            "goal_id": "f16d03c9-1024-459f-9e55-b87392557970",
                            "title": "Achieve $25/Month in Passive Income",
                            "description": "Continue investing and reinvesting dividends until your portfolio is generating an average of $25 per month ($300 annually) in passive income.",
                            "milestone_type": "savings",
                            "target_amount": 25,
                            "current_amount": 0,
                            "habit_description": null,
                            "frequency": null,
                            "habit_target_value": null,
                            "start_date": "2025-08-07",
                            "due_date": "2028-02-07",
                            "completed_date": null,
                            "status": "pending",
                            "progress_percentage": 0,
                            "is_ai_generated": true,
                            "display_order": 2,
                            "priority": "high",
                            "created_at": "2025-08-07T11:51:31.170404+00:00",
                            "updated_at": "2025-08-07T11:51:31.170404+00:00"
                        },
                        {
                            "id": "dcb6c5bf-1d15-4766-9651-53de4f16678e",
                            "goal_id": "f16d03c9-1024-459f-9e55-b87392557970",
                            "title": "Achieve $100/Month in Passive Income",
                            "description": "Through consistent contributions and dividend reinvestment, grow your portfolio until it generates an average of $100 per month ($1,200 annually) in passive income.",
                            "milestone_type": "savings",
                            "target_amount": 100,
                            "current_amount": 0,
                            "habit_description": null,
                            "frequency": null,
                            "habit_target_value": null,
                            "start_date": "2025-08-07",
                            "due_date": "2039-08-07",
                            "completed_date": null,
                            "status": "pending",
                            "progress_percentage": 0,
                            "is_ai_generated": true,
                            "display_order": 3,
                            "priority": "high",
                            "created_at": "2025-08-07T11:51:31.170404+00:00",
                            "updated_at": "2025-08-07T11:51:31.170404+00:00"
                        },
                        {
                            "id": "119b6c07-5b3e-4df3-a246-807d5b59b450",
                            "goal_id": "f16d03c9-1024-459f-9e55-b87392557970",
                            "title": "Achieve $250/Month in Passive Income",
                            "description": "Continue executing the strategy to grow your portfolio until it generates an average of $250 per month ($3,000 annually) in passive income.",
                            "milestone_type": "savings",
                            "target_amount": 250,
                            "current_amount": 0,
                            "habit_description": null,
                            "frequency": null,
                            "habit_target_value": null,
                            "start_date": "2025-08-07",
                            "due_date": "2052-08-07",
                            "completed_date": null,
                            "status": "pending",
                            "progress_percentage": 0,
                            "is_ai_generated": true,
                            "display_order": 4,
                            "priority": "medium",
                            "created_at": "2025-08-07T11:51:31.170404+00:00",
                            "updated_at": "2025-08-07T11:51:31.170404+00:00"
                        },
                        {
                            "id": "f0dcb544-bb8a-40fc-80f4-68d972f42171",
                            "goal_id": "f16d03c9-1024-459f-9e55-b87392557970",
                            "title": "Annual Strategy & Contribution Review",
                            "description": "One year from now, review your portfolio's performance against the 4.5% target yield. Assess your financial situation to see if the $100 monthly contribution can be increased.",
                            "milestone_type": "review",
                            "target_amount": null,
                            "current_amount": 0,
                            "habit_description": null,
                            "frequency": null,
                            "habit_target_value": null,
                            "start_date": "2025-08-07",
                            "due_date": "2026-08-07",
                            "completed_date": null,
                            "status": "pending",
                            "progress_percentage": 0,
                            "is_ai_generated": true,
                            "display_order": 5,
                            "priority": "medium",
                            "created_at": "2025-08-07T11:51:31.170404+00:00",
                            "updated_at": "2025-08-07T11:51:31.170404+00:00"
                        }
                    ],
                    "strategy": "The core strategy is to accumulate a target capital of $267,000 by investing in a diversified portfolio of income-producing assets. This capital amount is calculated to generate $1,000 per month ($12,000 annually) based on a projected average portfolio yield of 4.5%.\n\n**Portfolio Allocation (Low Effort / Moderate Risk):**\nTo align with your 'low effort' preference and 'moderate' risk tolerance, we will use broad-market Exchange Traded Funds (ETFs):\n*   **60% Dividend Stock ETF (e.g., Schwab U.S. Dividend Equity ETF - SCHD):** For exposure to financially strong companies with a history of paying dividends, offering a blend of income and capital growth.\n*   **30% Real Estate ETF (e.g., Vanguard Real Estate ETF - VNQ):** To align with your preference for REITs, providing diversified exposure to income-producing real estate.\n*   **10% Total Bond Market ETF (e.g., Vanguard Total Bond Market ETF - BND):** To add stability and a reliable income floor to the portfolio, reducing overall volatility.\n\n**Execution Phases:**\n1.  **Accumulation Phase (Now until ~2073):** For the entire duration of the goal, all dividends and interest payments will be automatically reinvested. This leverages the power of compound growth, where your earnings begin to earn their own money. You will contribute a minimum of $100 every month.\n2.  **Distribution Phase (Post-2073):** Once the $267,000 capital target is reached, you will turn off dividend reinvestment and begin withdrawing the monthly income generated by the portfolio.",
                    "insights": [
                        {
                            "actionable": true,
                            "priority": "critical",
                            "title": "Timeline & Contribution Misalignment",
                            "type": "risk_warning",
                            "content": "Based on your current investment capacity of $100/month and a starting capital of $3,400, achieving the $267,000 capital base required for your goal will take approximately 48 years. This is significantly longer than a typical 'medium' time horizon. To shorten this timeline, the most effective action is to increase your monthly investment amount."
                        },
                        {
                            "type": "strategy_insight",
                            "priority": "high",
                            "title": "The Power of Reinvesting Dividends",
                            "content": "During the initial years (the 'accumulation phase'), it is crucial to reinvest all dividends and interest back into the portfolio. This process, known as compounding, allows your investments to generate their own earnings, dramatically accelerating the growth of your capital base over the long term. Do not withdraw any income until the final goal is met.",
                            "actionable": false
                        },
                        {
                            "priority": "high",
                            "type": "opportunity",
                            "title": "Opportunity to Accelerate Timeline",
                            "actionable": true,
                            "content": "You can significantly accelerate your goal timeline by increasing your monthly contributions. For example, increasing your monthly investment from $100 to $300 could reduce the timeline by more than 20 years. Review your budget for opportunities to allocate more capital to this goal."
                        },
                        {
                            "priority": "medium",
                            "type": "behavioral_tip",
                            "actionable": true,
                            "title": "Automate Your Investments",
                            "content": "The most effective way to ensure consistent progress is to automate your investments. Set up a recurring monthly transfer of $100 from your bank account to your brokerage account. This 'pay yourself first' strategy removes the need for manual action and keeps you on track regardless of market sentiment."
                        }
                    ],
                    "projections": {
                        "confidenceLevel": 0.6,
                        "monthlyRequired": 100,
                        "projectedFinalAmount": 267000
                    },
                    "message": "🎉 Great! I've created your **Achieve $1,000/Month in Passive Income** goal with a target of $267,000 by 8/7/2073. I've also generated 6 milestones to help you stay on track.\n\n``GOAL:f16d03c9-1024-459f-9e55-b87392557970``",
                    "debug": {
                        "message": "Goal generated and stored successfully",
                        "timestamp": "2025-08-07T11:51:31.388Z",
                        "goalId": "f16d03c9-1024-459f-9e55-b87392557970",
                        "milestonesCreated": 6
                    }
                })
                }}>
                  test
                </Button> */}
              </div>
            )}
            
          
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-purple-800 to-indigo-900 dark:from-white dark:via-purple-200 dark:to-indigo-100 bg-clip-text text-transparent mb-3">
                Welcome to Moneko
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                {user 
                  ? "Continue your financial journey with your AI money coach" 
                  : "Let Moneko, your AI money coach, guide you to financial success"
                }
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modern Chat Container with proper constraints */}
      <div className="flex flex-col" style={{ height: '600px' }}>
        <ChatConversationDisplay
        agentName="Moneko"
        aiRole="goal_tracker"
        agentIcon={monekoIcon}
          chatConfig={
           {
            useExternalMessages: true,
            externalMessages: messages,
            customMessageHandler: handleSendMessage,
           }
          }
          welcomeMessage="Hi! I'm Moneko, your AI money coach 👋 Tell me what financial goal you'd like to work on!"
          welcomeSubtitle="I'll help you create a personalized plan step by step."
          onGoalTemplateClick={handleGoalTemplateClick}
          disableMsgParse={true}
          className="flex-1"
        />
      </div>

      {/* Questionnaire Modal */}
      <Modal
        isOpen={isQuestionnaireModalOpen}
        onClose={handleCloseModal}      
        width="wide"
        fullHeight={true}
        disableOverlayClick
      >
        <div className="flex-1 h-full overflow-hidden">
          {selectedGoalType && questionnaireTemplate && (
            <div className="h-full flex-1 overflow-y-auto p-6">
              <QuestionnaireFlow
                goalType={selectedGoalType}
                template={questionnaireTemplate}
                onComplete={handleQuestionnaireComplete}
                onCancel={handleCloseModal}
                userId={user?.id || null}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Goal Presentation Modal */}
      <Modal
        isOpen={isPresentationModalOpen}
        onClose={handleClosePresentationModal}
        width="xwide"
        fullHeight={true}
        disableOverlayClick
      >
          {goalData && (
            <GoalPresentationFlow
              goalData={goalData}
              isLoggedIn={!!user}
              onComplete={handlePresentationComplete}
              onRegister={handleRegistrationPrompt}
            />
          )}
      </Modal>
    </div>
  );
}