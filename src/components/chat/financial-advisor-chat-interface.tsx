"use client";

import { useNavigate } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine } from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/contexts/auth-context";
import { ChatConversationDisplay } from "./chat-conversation-display";
import { AI_ROLES } from "./ai-roles";

export function FinancialAdvisorChatInterface() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Footer content for advisor interface
  const footerContent = user ? (
    // Show advisor session data for authenticated users
    <>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="font-medium">Advisor Session Active</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
        <span>Goal Tracking</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
        <span>Personalized guidance</span>
      </div>
    </>
  ) : (
    // Default indicators for guests or new users
    <>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span>Personal Guidance</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
        <span>Expert Advice</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
        <span>Investment Strategies</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
        <span>Budget Planning</span>
      </div>
    </>
  );
  
  return (
    <ChatConversationDisplay
      chatConfig={{
        aiRole: AI_ROLES.FINANCIAL_ADVISOR,
        enableGuestSessions: true,
        enableSignupPrompt: true,
        enableLoadingDuration: true,
        showHeader: true,
        showFooter: true,
        showFloatingCloseButton: true,
        showSignupModal: true,
      }}
      initialSuggestedResponses={[
        "I want to know how to save money", 
        "Help me create a retirement goal", 
        "I want to know how to invest", 
        "Show me my current goals"
      ]}
      welcomeMessage="Hi! I'm Moneko, your AI financial advisor. I provide personalized financial guidance and can help you track your financial goals. What can I help you with today?"
      welcomeSubtitle="Ask me about budgeting, investing, debt management, goal tracking, or any financial topic!"
      navigate={navigate}
      className="flex-1"
      headerTitle="Financial Advisor"
      headerSubtitle="Get personalized financial guidance and goal tracking with Moneko"
      headerGradientColors="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-100"
      headerBackgroundColors="bg-gradient-to-r from-white to-blue-50 dark:from-slate-800 dark:to-slate-700"
      backgroundGradient="h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-950 dark:via-indigo-950 dark:to-cyan-950 flex flex-col"
      footerContent={footerContent}
      signupModalConfig={{
        icon: <FontAwesomeIcon icon={faChartLine} className="text-white text-3xl" />,
        title: "Your personalized advice is ready!",
        description: "Register a free account to get personalized financial advice and access more features.",
        buttonText: "Register for Free"
      }}
    />
  );
}