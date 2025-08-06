"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";

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
      <div className="flex-shrink-0 border-b border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-r from-white/90 to-purple-50/90 dark:from-slate-800/90 dark:to-slate-700/90">
        <div className="px-6 sm:px-8 lg:px-10">
          <div className="py-6 sm:py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-purple-800 to-indigo-900 dark:from-white dark:via-purple-200 dark:to-indigo-100 bg-clip-text text-transparent mb-3">
                Welcome to Moneko
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Let Moneko, your AI money coach, guide you to financial success
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modern Chat Container with proper constraints */}
      <div className="flex flex-col" style={{ height: '600px' }}>
        <ChatConversationDisplay
          messages={messages}
          onMessageSend={handleSendMessage}
          isSendingMessage={isSendingMessage}
          welcomeMessage="Hi! I'm Moneko, your AI money coach 👋 Tell me what financial goal you'd like to work on!"
          welcomeSubtitle="I'll help you create a personalized plan step by step."
          loadingDuration={loadingDuration}
          onGoalTemplateClick={handleGoalTemplateClick}
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