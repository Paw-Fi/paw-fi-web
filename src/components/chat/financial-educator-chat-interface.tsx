"use client";

import { useNavigate } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap } from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/contexts/auth-context";
import { ChatConversationDisplay } from "./chat-conversation-display";
import { AI_ROLES } from "./ai-roles";
import { OptimizedImage } from "../seo/optimized-image";
import finniLogo from '@/assets/images/avatar/finni.png';

export function FinancialEducatorChatInterface() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Footer content for educator interface
  const footerContent = user ? (
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
  );
  
  return (
    <ChatConversationDisplay
      chatConfig={{
        aiRole: AI_ROLES.FINANCIAL_EDUCATOR,
        enableGuestSessions: true,
        enableSignupPrompt: true,
        enableLoadingDuration: true,
        showHeader: true,
        showFooter: true,
        showFloatingCloseButton: true,
        showSignupModal: true,
      }}
      agentIcon={finniLogo}
      agentName="Finni"
      welcomeMessage="Hi I'm Moneko! I'll help you learn about personal finance. Type 'start' to begin or ask me anything."
      welcomeSubtitle="Ask me anything to get started!"
      navigate={navigate}
      className="flex-1"
      headerTitle="Financial Education"
      headerSubtitle="Learn personal finance with your AI educator Leo"
      headerGradientColors="bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-900 dark:from-white dark:via-emerald-200 dark:to-teal-100"
      headerBackgroundColors="bg-gradient-to-r from-white to-emerald-50 dark:from-slate-800 dark:to-slate-700"
      backgroundGradient="h-full bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:from-emerald-950 dark:via-teal-950 dark:to-green-950 flex flex-col"
      footerContent={footerContent}
      signupModalConfig={{
        icon: <FontAwesomeIcon icon={faGraduationCap} className="text-white text-3xl" />,
        title: "Your personalized lesson is ready!",
        description: "Register a free account to view this personalized lesson and access more features.",
        buttonText: "Register for Free"
      }}
    />
  );
}