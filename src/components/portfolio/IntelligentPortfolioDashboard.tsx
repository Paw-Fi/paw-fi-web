import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import EnhancedAIConversation from './EnhancedAIConversation';
import PersonalizedLearningPanel from './PersonalizedLearningPanel';
import ProactiveAlertsPanel from './ProactiveAlertsPanel';
import TransparentDecisionInterface from './TransparentDecisionInterface';

interface DashboardSection {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  priority: number;
  visible: boolean;
  size: 'small' | 'medium' | 'large';
}

interface IntelligentPortfolioDashboardProps {
  goalId?: string;
  layout?: 'adaptive' | 'fixed';
  personalizeLayout?: boolean;
}

interface UserPreferences {
  layout_preferences: {
    sections: DashboardSection[];
    information_depth: 'beginner' | 'intermediate' | 'advanced';
    update_frequency: 'real-time' | 'hourly' | 'daily';
    alert_preferences: {
      show_risk_alerts: boolean;
      show_opportunities: boolean;
      show_educational_prompts: boolean;
      max_daily_alerts: number;
    };
  };
  ai_interaction_preferences: {
    preferred_personality: 'professional' | 'friendly' | 'casual';
    explanation_style: 'simple' | 'detailed' | 'technical';
    conversation_history_length: number;
  };
}

export const IntelligentPortfolioDashboard: React.FC<IntelligentPortfolioDashboardProps> = ({
  goalId,
  layout = 'adaptive',
  personalizeLayout = true
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(goalId);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user goals
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['user-goals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch user preferences and learning progress
  const { data: intelligenceData } = useQuery({
    queryKey: ['user-intelligence', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const [preferencesResult, learningResult, monitoringResult] = await Promise.all([
        supabase
          .from('user_investment_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_learning_progress')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_monitoring_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      return {
        preferences: preferencesResult.data,
        learning: learningResult.data,
        monitoring: monitoringResult.data
      };
    },
    enabled: !!user?.id
  });

  // Fetch enhanced portfolio recommendations with transparency
  const { data: enhancedRecommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['enhanced-recommendations', user?.id, selectedGoalId],
    queryFn: async () => {
      if (!user?.id || !selectedGoalId) return [];
      
      const { data, error } = await supabase.functions.invoke('portfolio-recommendations-engine', {
        body: {
          userId: user.id,
          goalId: selectedGoalId,
          includeMarketData: true,
          includePerformanceAnalysis: true
        }
      });

      if (error) throw error;
      return data?.recommendations || [];
    },
    enabled: !!user?.id && !!selectedGoalId,
    refetchInterval: userPreferences?.layout_preferences.update_frequency === 'real-time' ? 60000 : 
                     userPreferences?.layout_preferences.update_frequency === 'hourly' ? 3600000 : null
  });

  // Fetch proactive interventions
  const { data: proactiveAlerts } = useQuery({
    queryKey: ['proactive-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.functions.invoke('proactive-support-engine', {
        body: {
          userId: user.id,
          monitoringType: 'triggered',
          triggerEvent: 'dashboard_view'
        }
      });

      if (error) throw error;
      return data?.results?.[0]?.interventions || [];
    },
    enabled: !!user?.id,
    refetchInterval: 300000 // Check every 5 minutes
  });

  // Default dashboard sections
  const defaultSections: DashboardSection[] = [
    {
      id: 'ai_insights',
      title: 'AI Insights',
      component: AIInsightsPanel,
      priority: 1,
      visible: true,
      size: 'large'
    },
    {
      id: 'transparent_performance',
      title: 'Portfolio Performance',
      component: TransparentPerformancePanel,
      priority: 2,
      visible: true,
      size: 'medium'
    },
    {
      id: 'proactive_alerts',
      title: 'Smart Alerts',
      component: ProactiveAlertsPanel,
      priority: 3,
      visible: true,
      size: 'medium'
    },
    {
      id: 'conversation_interface',
      title: 'AI Assistant',
      component: EnhancedAIConversation,
      priority: 4,
      visible: true,
      size: 'large'
    },
    {
      id: 'learning_center',
      title: 'Learning Center',
      component: PersonalizedLearningPanel,
      priority: 5,
      visible: intelligenceData?.learning?.overall_financial_literacy_level < 7,
      size: 'medium'
    },
    {
      id: 'decision_transparency',
      title: 'Decision Explanations',  
      component: TransparentDecisionInterface,
      priority: 6,
      visible: enhancedRecommendations?.length > 0,
      size: 'large'
    }
  ];

  // Set default goal if none selected
  useEffect(() => {
    if (!selectedGoalId && goals && goals.length > 0) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  // Initialize user preferences
  useEffect(() => {
    if (intelligenceData) {
      const preferences: UserPreferences = {
        layout_preferences: {
          sections: defaultSections,
          information_depth: intelligenceData.learning?.overall_financial_literacy_level >= 7 ? 'advanced' :
                           intelligenceData.learning?.overall_financial_literacy_level >= 4 ? 'intermediate' : 'beginner',
          update_frequency: intelligenceData.monitoring?.monitoring_sensitivity === 'high' ? 'real-time' : 'hourly',
          alert_preferences: {
            show_risk_alerts: intelligenceData.monitoring?.risk_alerts_enabled ?? true,
            show_opportunities: intelligenceData.monitoring?.opportunity_alerts_enabled ?? true,
            show_educational_prompts: intelligenceData.monitoring?.educational_prompts_enabled ?? true,
            max_daily_alerts: intelligenceData.monitoring?.max_daily_alerts ?? 5
          }
        },
        ai_interaction_preferences: {
          preferred_personality: intelligenceData.preferences?.behavioral_preferences?.communication_style || 'friendly',
          explanation_style: intelligenceData.learning?.preferred_explanation_style || 'detailed',
          conversation_history_length: 20
        }
      };
      setUserPreferences(preferences);
      setIsLoading(false);
    }
  }, [intelligenceData]);

  if (isLoading || goalsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your intelligent portfolio dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Your Intelligent Portfolio Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Let's start by creating your first financial goal to get personalized AI insights.
        </p>
        <button
          onClick={() => window.location.href = '/portfolio/goals/new'}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Create Your First Goal
        </button>
      </motion.div>
    );
  }

  const visibleSections = userPreferences?.layout_preferences.sections
    .filter(section => section.visible)
    .sort((a, b) => a.priority - b.priority) || defaultSections;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Portfolio Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                AI-powered insights with complete transparency
              </p>
            </div>
            
            {/* Goal Selector */}
            {goals.length > 1 && (
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Goal:
                </label>
                <select
                  value={selectedGoalId || ''}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="block w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title} ({Math.round((goal.current_amount / goal.target_amount) * 100)}% complete)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedGoalId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`grid gap-6 ${
              layout === 'adaptive' 
                ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' 
                : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {visibleSections.map((section) => {
              const Component = section.component;
              return (
                <motion.div
                  key={section.id}
                  layout
                  className={`
                    ${section.size === 'large' ? 'lg:col-span-2' : ''}
                    ${section.size === 'small' ? 'lg:col-span-1' : ''}
                    bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700
                  `}
                >
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      {section.title}
                    </h2>
                    <Component
                      goalId={selectedGoalId}
                      userId={user?.id}
                      recommendations={enhancedRecommendations}
                      alerts={proactiveAlerts}
                      userPreferences={userPreferences}
                      intelligenceData={intelligenceData}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quick Access AI Assistant (Fixed Position) */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <button
          onClick={() => setActiveSection('conversation_interface')}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-colors"
          title="Chat with AI Assistant"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
};

// Placeholder components - these would be implemented separately
const AIInsightsPanel: React.FC<any> = ({ recommendations, userPreferences }) => (
  <div className="space-y-4">
    <div className="text-center py-8">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        AI Portfolio Insights
      </h3>
      <p className="text-gray-600 dark:text-gray-300">
        {recommendations?.length > 0 
          ? `${recommendations.length} AI recommendations with full transparency`
          : 'Your portfolio is performing well - no immediate actions needed'
        }
      </p>
      {recommendations?.length > 0 && (
        <div className="mt-4 space-y-2">
          {recommendations.slice(0, 3).map((rec: any, idx: number) => (
            <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-left">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">{rec.title}</h4>
              <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">{rec.description}</p>
              {rec.transparency && (
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                  Confidence: {Math.round(rec.transparency.confidence_score * 100)}% • 
                  Sources: {rec.transparency.data_sources.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const TransparentPerformancePanel: React.FC<any> = ({ goalId }) => (
  <div className="text-center py-8">
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
      Portfolio Performance
    </h3>
    <p className="text-gray-600 dark:text-gray-300">
      Transparent performance tracking with AI analysis coming soon...
    </p>
  </div>
);

export default IntelligentPortfolioDashboard;