"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSignInAlt } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { ChatConversationDisplay, ConversationMessage } from "@/components/chat/chat-conversation-display";
import { QuestionnaireFlow } from "@/components/goal-tracker/questionnaire/QuestionnaireFlow";
import { GoalPresentationFlow } from "@/components/goal-tracker/goal-presentation";
import { getQuestionnaireTemplate, type QuestionnaireTemplate } from "@/data/questionnaire-templates";
import { supabase } from "@/lib/supabase";
import type { 
  GoalType, 
  GoalCreationResult 
} from "@/components/goal-tracker/types";
import { ActivityActions } from "@/utils/reward-actions-clone";
import { logUserActivity } from "@/utils/activity-logger-clone";
import { useAuth } from "@/contexts/auth-context";
import { Modal } from "../ui/modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import monekoIcon from "@assets/images/logo/moneko.png"

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
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
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
    const runMigration = async () => {
      if (user?.id && !hasUpdatedGuestGoals) {
        await updateGuestGoals(user.id);
        setHasUpdatedGuestGoals(true);
      }
    };

    runMigration();
  }, [user?.id, hasUpdatedGuestGoals, updateGuestGoals]);

  // Initialize with welcome message or process initial message if provided
  useEffect(() => {
    const abortController = new AbortController();
    let isInitializing = false;
    
    const initializeChat = async () => {
      // Prevent multiple concurrent initializations
      if (isInitializing) return;
      isInitializing = true;

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

        // Add timeout protection
        const timeoutId = setTimeout(() => {
          if (!abortController.signal.aborted) {
            console.warn('Initial message processing timed out, resetting state');
            setIsSendingMessage(false);
            setLoadingDuration(0);
            if (loadingTimerRef.current) {
              clearInterval(loadingTimerRef.current);
              loadingTimerRef.current = null;
            }
          }
        }, 30000); // 30 second timeout
        
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
            signal: abortController.signal,
          });

          // Clear timeout since request completed
          clearTimeout(timeoutId);

          if (abortController.signal.aborted) return;

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
            
            if (!abortController.signal.aborted) {
              setMessages(initialMessages);
            }
          }
        } catch (aiError) {
          clearTimeout(timeoutId);
          if (abortController.signal.aborted) return;
          
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
          // Always reset state, regardless of success/failure
          if (!abortController.signal.aborted) {
            setIsSendingMessage(false);
            setLoadingDuration(0);
            
            if (loadingTimerRef.current) {
              clearInterval(loadingTimerRef.current);
              loadingTimerRef.current = null;
            }
          }
          isInitializing = false;
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
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

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

        if (!abortController.signal.aborted) {
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        
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
      } finally {
        isInitializing = false;
      }
    };

    initializeChat();

    // Cleanup function to abort requests and reset state
    return () => {
      abortController.abort();
      isInitializing = false;
      // Emergency state reset in case of component unmount during API call
      setIsSendingMessage(false);
      setLoadingDuration(0);
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
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

    // Add timeout protection for message sending
    const timeoutId = setTimeout(() => {
      console.warn('Message sending timed out, resetting state');
      setIsSendingMessage(false);
      setLoadingDuration(0);
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }, 30000); // 30 second timeout
    
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

      // Clear timeout since request completed
      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
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
      // Always reset state, regardless of success/failure
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

  const handleGoalCreated = (result: GoalCreationResult) => {
    setGoalData(result);
    setIsQuestionnaireModalOpen(false);
    // Show registration prompt first if user is not logged in
    if (!user) {
      setShowRegistrationPrompt(true);
    } else {
      setIsPresentationModalOpen(true);
    }
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

  const handleRegisterFromPrompt = () => {
    setShowRegistrationPrompt(false);
    setGoalData(null);
    // Navigate to registration/login page
    navigate({ to: '/register', search: { redirect: '/dashboard/tracker/' + goalData?.goal?.id } });
  };

  const handleSkipRegistration = () => {
    setShowRegistrationPrompt(false);
    setIsPresentationModalOpen(true);
  };

  const handleCloseRegistrationPrompt = () => {
    setShowRegistrationPrompt(false);
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
  <div className={`flex flex-col flex-1 bg-card rounded-none sm:rounded-2xl shadow-none sm:shadow-sm hover:shadow-md transition-all duration-200 border-0 sm:border overflow-hidden ${className}`}>
    {/* Compact Header - Progressive enhancement: show more on desktop, minimal on mobile */}
    <div className="flex-shrink-0 border-b bg-card">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-4 py-3 sm:py-3 gap-2 sm:gap-0">
        {/* Main title row */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between w-full sm:w-auto"
        >
          <Link to="/" className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <h1 className="text-mobile-lg sm:text-xl lg:text-2xl font-bold text-foreground">
              Welcome to <span className="text-primary">Moneko</span>
            </h1>

            {/* Desktop subtitle - hidden on mobile for space efficiency */}
            <p className="hidden md:block text-sm lg:text-base text-muted-foreground-color font-medium">
              Your AI Financial Coach
            </p>
          </Link>
           {/* Login Button - Mobile compact, desktop full */}
           {!user && (
             <Button
               onClick={handleLogin}
               variant="outline"
               className="block lg:hidden text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto touch-manipulation ml-3 sm:ml-0"
             >
               <FontAwesomeIcon icon={faSignInAlt} className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
               <span>Login</span>
             </Button>
           )}

        </motion.div>

        {/* Desktop-only feature highlights - completely hidden on mobile */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground-color">
          {/* Login Button - Mobile compact, desktop full */}
          {!user && (
            <Button
              onClick={handleLogin}
              variant="outline"
              className="text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 h-auto touch-manipulation ml-3 sm:ml-0"
            >
              <FontAwesomeIcon icon={faSignInAlt} className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
              <span>Login</span>
            </Button>
          )}
        </div>
        </div>
      </div>

      {/* Chat Container - Maximum height expansion with proper flex constraints */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ChatConversationDisplay
          agentName="Moneko"
          aiRole="goal_tracker"
          agentIcon={monekoIcon}
          chatConfig={{
            useExternalMessages: true,
            externalMessages: messages,
            customMessageHandler: handleSendMessage,
            enableLoadingDuration: true,
          }}
          externalIsLoading={isSendingMessage}
          welcomeMessage="Hi! I'm Moneko, your AI money coach 👋 Tell me what financial goal you'd like to work on!"
          welcomeSubtitle="I'll help you create a personalized plan step by step."
          onGoalTemplateClick={handleGoalTemplateClick}
          disableMsgParse={true}
          className="flex-1 min-h-0 h-full"
        />
      </div>


      {/* Questionnaire Modal - Mobile responsive */}
      <Modal
        isOpen={isQuestionnaireModalOpen}
        onClose={handleCloseModal}
        width="xwide"
        fullHeight={true}
      >
        <div className="flex-1 h-full overflow-hidden">
          {selectedGoalType && questionnaireTemplate && (
            <div className="h-full flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
              <QuestionnaireFlow
                goalType={selectedGoalType as GoalType}
                template={questionnaireTemplate as QuestionnaireTemplate}
                onComplete={handleGoalCreated}
                onCancel={handleCloseModal}
                userId={user?.id || null}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Registration Prompt Modal */}
      <Modal
        isOpen={showRegistrationPrompt}
        onClose={handleCloseRegistrationPrompt}
        width="wide"
      >
        <div className="p-6 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-6"
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <img src={monekoIcon} alt="Moneko" className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Your Financial Plan is Ready! 🎉
                </h2>
                <p className="text-muted-foreground-color">
                  Create a free account to save your personalized plan and start tracking your progress.
                </p>
              </div>
            </div>

            {/* Benefits Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-foreground mb-1">Track Progress</h3>
                  <p className="text-sm text-muted-foreground-color">Monitor your savings and milestones</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-foreground mb-1">Stay Motivated</h3>
                  <p className="text-sm text-muted-foreground-color">Get reminders and celebrate wins</p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-foreground mb-1">AI Coaching</h3>
                  <p className="text-sm text-muted-foreground-color">Get personalized financial advice</p>
                </CardContent>
              </Card>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-4">
              <Button 
                onClick={handleRegisterFromPrompt}
                size="lg" 
                className="w-full"
              >
                <FontAwesomeIcon icon={faUser} className="w-4 h-4 mr-2" />
                Create Free Account
              </Button>
              
              <Button 
                onClick={handleLogin}
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                <FontAwesomeIcon icon={faSignInAlt} className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </div>

            {/* Skip Option - Minimal visibility */}
            <div className="pt-4">
              <button
                onClick={handleSkipRegistration}
                className="text-xs text-muted-foreground-color hover:text-foreground transition-colors duration-200 underline cursor-pointer"
              >
                I'll do it later
              </button>
            </div>
          </motion.div>
        </div>
      </Modal>

      {/* Goal Presentation Modal - Mobile responsive */}
      <Modal
        isOpen={isPresentationModalOpen}
        onClose={handleClosePresentationModal}
        width="xwide"
        fullHeight={true}
      >
        <div className="h-full overflow-hidden">
          {goalData && (
            <div id="goal-presentation-scroll" className="h-full overflow-y-auto overscroll-contain">
              <GoalPresentationFlow
                goalData={goalData as GoalCreationResult}
                isLoggedIn={!!user}
                onComplete={handlePresentationComplete}
                onRegister={handleRegistrationPrompt}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}