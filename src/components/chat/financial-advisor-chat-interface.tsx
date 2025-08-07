"use client";

import { useAuth } from "@/contexts/auth-context";
import { useAIChat } from "@/contexts/ai-chat-context";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { ChatConversationDisplay } from "./chat-conversation-display";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { AI_ROLES } from "./ai-roles";
import logo from "@/assets/images/icon.svg";

export function FinancialAdvisorChatInterface() {
  const { user } = useAuth();
  const { closeChat } = useAIChat();
  
  // Load financial health profile for authenticated users  
  const { profile } = useFinancialHealthProfile(user?.id);


  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-950 dark:via-indigo-950 dark:to-cyan-950 flex flex-col">
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
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-white to-blue-50 dark:from-slate-800 dark:to-slate-700">
        <div className="px-6 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-100 bg-clip-text text-transparent mb-2">
              Financial Advisor
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Get personalized financial guidance with your AI advisor Ollie
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container - Takes remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatConversationDisplay
          chatConfig={{
            aiRole: AI_ROLES.FINANCIAL_ADVISOR,
            enableGuestSessions: false,
            enableSignupPrompt: false,
            enableLoadingDuration: false,
          }}
          welcomeMessage="Hi! I'm Moneko, your AI financial advisor. I provide personalized financial guidance based on your situation. What financial question can I help you with today?"
          welcomeSubtitle="Ask me about budgeting, investing, debt management, or any financial topic!"
          className="flex-1"
          agentIcon={
            <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
              <OptimizedImage src={logo} alt="Moneko AI" className="size-6" />
            </div>
          }
        />
      </div>
      
      {/* Dynamic footer with user profile data */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {profile && user ? (
              // Show user's financial profile data
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Profile Active</span>
                </div>
                {profile.profile_data?.financial_goals && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <span>{profile.profile_data.financial_goals.length} goals tracked</span>
                  </div>
                )}
                {profile.profile_data?.risk_tolerance && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    <span>{profile.profile_data.risk_tolerance} risk tolerance</span>
                  </div>
                )}
                {profile.profile_data?.income_range && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>{profile.profile_data.income_range} income</span>
                  </div>
                )}
              </>
            ) : (
              // Default indicators
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}