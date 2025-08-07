"use client";

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { Modal } from "../ui/modal";
import { useAuth } from "@/contexts/auth-context";
import { useAIChat } from "@/contexts/ai-chat-context";
import { ChatConversationDisplay } from "./chat-conversation-display";
import { AI_ROLES } from "./ai-roles";

export function FinancialEducatorChatInterface() {
  const { user } = useAuth();
  const { closeChat } = useAIChat();
  const navigate = useNavigate();
  
  // State for signup modal
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  
  
  const handleSignupClick = () => {
    setShowSignupPrompt(false);
    navigate({ to: "/register", search: { redirect: "/dashboard" } });
  };
  
  const handleGuestSessionUpdate = () => {
    // Handle guest session updates if needed
  };
  
  return (
    <>
      <div className="h-full bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:from-emerald-950 dark:via-teal-950 dark:to-green-950 flex flex-col">
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
        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-white to-emerald-50 dark:from-slate-800 dark:to-slate-700">
          <div className="px-6 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-900 dark:from-white dark:via-emerald-200 dark:to-teal-100 bg-clip-text text-transparent mb-2">
                Financial Education
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Learn personal finance with your AI educator Leo
              </p>
            </div>
          </div>
        </div>

        {/* Chat Container - Takes remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatConversationDisplay
            chatConfig={{
              aiRole: AI_ROLES.FINANCIAL_EDUCATOR,
              enableGuestSessions: true,
              enableSignupPrompt: true,
              enableLoadingDuration: true,
              onSignupPromptShow: handleSignupClick,
              onGuestSessionUpdate: handleGuestSessionUpdate,
            }}
            welcomeMessage="Hi I'm Moneko! I'll help you learn about personal finance. Type 'start' to begin or ask me anything."
            welcomeSubtitle="Ask me anything to get started!"
            navigate={navigate}
            className="flex-1"
          />
        </div>
        
        {/* Dynamic footer with learning progress data */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              {user ? (
                // Show learning session data for authenticated users
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="font-medium">Learning Session Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Progress saved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Personalized guidance</span>
                  </div>
                </>
              ) : (
                // Default indicators for guests or new users
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>Interactive Learning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                    <span>Personalized Lessons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Expert Knowledge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Progress Tracking</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={showSignupPrompt}
        onClose={() => setShowSignupPrompt(false)}
        disableOverlayClick={true}
        overlayClassName="bg-black/40"
        contentClassName="relative flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-primary/30 shadow-2xl w-[90vw] max-w-md mx-auto pointer-events-auto"
      >
        <div className="flex flex-col items-center w-full">
          <div className="mb-4 flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/80 to-primary/50 rounded-full shadow-lg">
            <FontAwesomeIcon icon={faGraduationCap} className="text-white text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2 text-center drop-shadow-sm">
            Your personalized lesson is ready!
          </h2>
          <p className="text-gray-700 dark:text-gray-200 mb-3 text-center text-base font-medium">
            Register a free account to view this personalized lesson and access more features.
          </p>
          <div className="w-full flex flex-col gap-2">
            <Button 
              fullWidth 
              className="!bg-primary !text-white !font-bold !py-3 !rounded-xl !shadow-lg hover:!bg-primary/90 transition"
              onClick={handleSignupClick}
            >
              Register for Free
            </Button>
          </div>
        </div>
      </Modal>

     
    </>
  );
}