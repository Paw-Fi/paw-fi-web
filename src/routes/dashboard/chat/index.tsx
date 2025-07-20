"use client";

import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faArrowLeft,
  faRobot,
  faHandHoldingUsd,
  faBrain,
  faChartBar,
  faBullseye,
} from "@fortawesome/free-solid-svg-icons";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useAuth } from "@/contexts/auth-context";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { useDashboard } from "@/hooks/use-dashboard";

export const Route = createFileRoute("/dashboard/chat/")({
  component: FinancialAdvisorChat,
  head: () => {
    const title = "AI Financial Advisor | Moneko - Portfolio & Investment Guidance";
    const description = "Chat with our AI Financial Advisor for personalized investment advice, portfolio analysis, and strategic financial planning.";
    const keywords = "AI financial advisor, investment advice, portfolio analysis, financial planning, wealth management";
    const imageUrl = 'https://moneko.io/og-img.png';
    const pageUrl = getCanonicalUrl('/dashboard/chat');

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: imageUrl,
      url: pageUrl,
    });    
    return {      
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});

function FinancialAdvisorChat() {
  const { user } = useAuth();
  const searchParams = useSearch({ from: '/dashboard/chat/' });
  const initialQuestion = (searchParams as any)?.q || '';
  
  // Get user's financial context for enhanced AI responses
  const { profile: financialProfile, hasProfile } = useFinancialHealthProfile(user?.id);
  const { dashboardData } = useDashboard(user?.id);

  // Create context-aware initial message
  const getInitialMessage = () => {
    if (initialQuestion) return initialQuestion;
    
    let contextMessage = "Hello! I'm your AI Financial Advisor. I'm here to help you with investment strategies, portfolio optimization, and financial planning.";
    
    if (hasProfile && financialProfile) {
      const profile = financialProfile.profile_data;
      contextMessage += `\n\nI can see you're ${profile.demographics.age} years old with $${profile.calculated_metrics.total_assets?.toLocaleString() || 0} in total assets. `;
      
      if (profile.calculated_metrics.years_to_retirement) {
        contextMessage += `With ${profile.calculated_metrics.years_to_retirement} years to retirement, `;
      }
      
      contextMessage += "I'm ready to provide personalized advice based on your financial situation.";
    }
    
    contextMessage += "\n\nWhat financial questions can I help you with today?";
    return contextMessage;
  };

  const advisorPrompts = [
    "Analyze my current portfolio allocation",
    "What's my optimal investment strategy?", 
    "How can I reduce my financial risk?",
    "Should I rebalance my investments?",
    "What are the best tax-advantaged accounts for me?",
    "How much should I save for retirement?",
    "Review my emergency fund strategy",
    "What investment opportunities match my risk profile?"
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <motion.div 
        className="bg-white/80 backdrop-blur-sm border-b border-blue-200 px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 text-white shadow-md">
                <FontAwesomeIcon icon={faChartLine} className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Financial Advisor</h1>
                <p className="text-sm text-gray-600">Portfolio guidance & investment strategies</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faBrain} className="h-4 w-4 mr-2 text-blue-500" />
              <span>AI-Powered Analysis</span>
            </div>
            <div className="flex items-center">
              <FontAwesomeIcon icon={faChartBar} className="h-4 w-4 mr-2 text-purple-500" />
              <span>Real-time Insights</span>
            </div>
            <div className="flex items-center">
              <FontAwesomeIcon icon={faBullseye} className="h-4 w-4 mr-2 text-indigo-500" />
              <span>Personalized Advice</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Context Panel - Show if user has financial data */}
      {hasProfile && financialProfile && (
        <motion.div 
          className="bg-gradient-to-r from-blue-100 via-purple-100 to-indigo-100 border-b border-blue-200 px-6 py-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <FontAwesomeIcon icon={faRobot} className="h-4 w-4 mr-2 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  I have access to your financial profile for personalized advice
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-blue-700">
                <span>Assets: ${financialProfile.profile_data.calculated_metrics.total_assets?.toLocaleString()}</span>
                <span>Monthly Savings: ${financialProfile.profile_data.calculated_metrics.monthly_savings?.toLocaleString()}</span>
                <span>Risk: {financialProfile.profile_data.risk_profile.investment_knowledge}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Chat Interface */}
      <motion.div 
        className="flex-1 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <ChatInterface 
          initialQuestion={getInitialMessage()}
          suggestedPrompts={advisorPrompts}
          assistantType="financial-advisor"
          placeholder="Ask about investments, portfolio analysis, financial planning..."
          userProfile={hasProfile ? financialProfile : undefined}
        />
      </motion.div>
    </div>
  );
}
