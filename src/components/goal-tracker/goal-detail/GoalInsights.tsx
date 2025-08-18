import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faLightbulb,
  faExclamationTriangle,
  faBullseye,
  faChartLine,
  faMagicWandSparkles,
  faStar,
  faCheckCircle,
  faClock,
  faRocket,
  faTrash,
  faChevronLeft,
  faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";
import type { Insight, AdvisorTone } from "@/components/goal-tracker/types";
import { useAuth } from "@/contexts/auth-context";
import MonekoAdvisorMessage from "@/components/ui/MonekoAdvisorMessage";
import monekoIcon from "@/assets/images/icon.svg";
import { useSubscription } from "@/hooks/use-subscription";
import { DashboardBlockModal } from "@/components/dashboard/DashboardBlockModal";

interface GoalInsightsProps {
  insights: Insight[];
  goal: any;
  onInsightUpdate: () => void;
  onOptimisticUpdate?: (action: { type: string; insightId?: string; insight?: any; updates?: any }) => void;
  onSubscriptionRequired?: () => void;
}

interface InsightTypeConfig {
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}

export function GoalInsights({ 
  insights,
  goal,
  onInsightUpdate,
  onOptimisticUpdate,
  onSubscriptionRequired
}: GoalInsightsProps) {
  const { user } = useAuth();
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [isGeneratingNew, setIsGeneratingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isActive } = useSubscription(user?.id);

  const insightTypeConfigs: Record<string, InsightTypeConfig> = {
    recommendation: {
      icon: faLightbulb,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-500/30',
      label: 'Recommendation'
    },
    warning: {
      icon: faExclamationTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-500/30',
      label: 'Warning'
    },
    opportunity: {
      icon: faStar,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-500/30',
      label: 'Opportunity'
    },
    milestone: {
      icon: faBullseye,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-500/30',
      label: 'Milestone'
    },
    performance: {
      icon: faChartLine,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-500/30',
      label: 'Performance'
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          label: 'High Priority'
        };
      case 'medium':
        return {
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
          label: 'Medium Priority'
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700/30',
          label: 'Low Priority'
        };
    }
  };

  const getInsightTypeConfig = (insight: any): InsightTypeConfig => {
    const insightType = insight?.insight_type || insight?.type || 'recommendation';
    return insightTypeConfigs[insightType] || insightTypeConfigs.recommendation;
  };

  // Convert insight to advisor message format
  const convertInsightToAdvisorMessage = (insight: Insight) => {
    const getAdvisorTone = (priority: string, type: string): AdvisorTone => {
      if (priority === 'high') return 'motivational';
      if (type === 'warning') return 'reassuring';
      if (type === 'opportunity') return 'congratulatory';
      if (type === 'recommendation') return 'encouraging';
      return 'informative';
    };

    return {
      message: insight.content,
      tone: getAdvisorTone(insight.priority || 'low', (insight as any).insight_type || (insight as any).type || 'recommendation')
    };
  };

  // Navigation functions
  const goToNextInsight = () => {
    if (currentInsightIndex < filteredInsights.length - 1) {
      setCurrentInsightIndex(currentInsightIndex + 1);
    }
  };

  const goToPrevInsight = () => {
    if (currentInsightIndex > 0) {
      setCurrentInsightIndex(currentInsightIndex - 1);
    }
  };

  const goToInsight = (index: number) => {
    if (index >= 0 && index < filteredInsights.length) {
      setCurrentInsightIndex(index);
    }
  };

  // Filter insights excluding dismissed ones, sorted by priority
  const filteredInsights = insights
    .filter(insight => !dismissedInsights.has((insight as any).id || ''))
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
      return bPriority - aPriority;
    });

  // Reset index when insights change to prevent out-of-bounds errors
  useEffect(() => {
    if (filteredInsights.length > 0 && currentInsightIndex >= filteredInsights.length) {
      setCurrentInsightIndex(0);
    }
  }, [filteredInsights.length, currentInsightIndex]);

  // Ensure current index is within bounds and reset if needed
  const safeCurrentIndex = filteredInsights.length > 0 ? Math.min(Math.max(0, currentInsightIndex), filteredInsights.length - 1) : 0;
  const currentInsight = filteredInsights.length > 0 ? filteredInsights[safeCurrentIndex] : null;


  const dismissCurrentInsight = async () => {
    if (!currentInsight || !user?.id) {
      setError('User not authenticated');
      return;
    }

    const insightId = (currentInsight as any).id;
    setDismissedInsights(prev => new Set([...prev, insightId]));
    
    // Navigate to next insight or previous if this was the last one
    if (safeCurrentIndex >= filteredInsights.length - 1) {
      setCurrentInsightIndex(Math.max(0, safeCurrentIndex - 1));
    }

    if (onOptimisticUpdate) {
      onOptimisticUpdate({ type: 'dismiss', insightId });
    }

    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { error: updateError } = await supabase
        .from('goal_insights')
        .update({ 
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', insightId)
        .eq('goal_id', goal.id);

      if (updateError) throw updateError;
      onInsightUpdate();
    } catch (error) {
      setDismissedInsights(prev => {
        const newSet = new Set(prev);
        newSet.delete(insightId);
        return newSet;
      });
      onInsightUpdate();
      console.error('Failed to dismiss insight:', error);
      setError(error instanceof Error ? error.message : 'Failed to dismiss insight');
    }
  };

  const generateNewInsights = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }
    if(!isActive)
    {
      onSubscriptionRequired?.();
      return;
    }

    setIsGeneratingNew(true);
    setError(null);

    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase.functions.invoke('goal-insights-generator', {
        body: {
          goalId: goal.id,
          userId: user.id
        }
      });

      if (error) throw error;
      
      // Check if new insights were actually generated
      if (data && data.insights && data.insights.length > 0) {
        console.log(`Generated ${data.insights.length} new insights`);
      } else {
        console.log('No new insights generated - may have recent insights');
      }
      
      onInsightUpdate();
    } catch (error) {
      console.error('Failed to generate new insights:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate insights');
    } finally {
      setIsGeneratingNew(false);
    }
  };


  const markAsHelpful = async () => {
    if (!currentInsight || !user?.id) return;

    const insightId = (currentInsight as any).id;
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase
        .from('goal_insights')
        .update({ user_feedback: 'helpful' })
        .eq('id', insightId)
        .eq('goal_id', goal.id);
      onInsightUpdate();
    } catch (error) {
      console.error('Failed to mark as helpful:', error);
    }
  };

  const highPriorityCount = insights.filter(i => i.priority === 'high').length;

  // Empty state with generate button
  if (insights.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-br from-white via-white to-indigo-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-indigo-900/20 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6">
          <FontAwesomeIcon icon={faMagicWandSparkles} className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Moneko Hasn't Shared Insights Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Let Moneko analyze your goal and provide personalized recommendations to help you succeed.
        </p>
        <motion.button
          onClick={generateNewInsights}
          disabled={isGeneratingNew}
          whileHover={!isGeneratingNew ? { scale: 1.05 } : {}}
          whileTap={!isGeneratingNew ? { scale: 0.95 } : {}}
          className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/25 transition-colors"
        >
          {isGeneratingNew ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
            </motion.div>
          ) : (
            <FontAwesomeIcon icon={faRocket} className="w-4 h-4" />
          )}
          <span>{isGeneratingNew ? 'Moneko is thinking...' : 'Get Moneko\'s First Insights'}</span>
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              What Moneko Thinks
            </h3>
            {highPriorityCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
                {highPriorityCount} urgent
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Moneko's personalized insights for your goal journey
          </p>
        </div>

        {/* Generate New Button */}
        <motion.button
          onClick={generateNewInsights}
          disabled={isGeneratingNew}
          whileHover={!isGeneratingNew ? { scale: 1.05 } : {}}
          whileTap={!isGeneratingNew ? { scale: 0.95 } : {}}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-lg shadow-pink-500/25 transition-colors text-sm"
        >
          {isGeneratingNew ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
            </motion.div>
          ) : (
            <img src={monekoIcon} alt="Moneko Icon" className="size-4" />
          )}
          <span>{isGeneratingNew ? 'Thinking...' : 'Ask Moneko Again'}</span>
        </motion.button>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm"
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* Insights Navigation and Display */}
      {filteredInsights.length > 0 && currentInsight && (
        <div className="space-y-4">
          {/* Navigation Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Insight {safeCurrentIndex + 1} of {filteredInsights.length}
              </span>
              {/* Priority and Type Badges */}
              {currentInsight && (
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 ${getPriorityConfig(currentInsight.priority).bgColor} ${getPriorityConfig(currentInsight.priority).color} rounded-full text-xs font-medium`}>
                    {getPriorityConfig(currentInsight.priority).label}
                  </div>
                  <div className={`px-2 py-1 ${getInsightTypeConfig(currentInsight).bgColor} ${getInsightTypeConfig(currentInsight).color} rounded-full text-xs font-medium`}>
                    {getInsightTypeConfig(currentInsight).label}
                  </div>
                </div>
              )}
            </div>
            
            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={goToPrevInsight}
                disabled={safeCurrentIndex === 0}
                whileHover={safeCurrentIndex > 0 ? { scale: 1.1 } : {}}
                whileTap={safeCurrentIndex > 0 ? { scale: 0.9 } : {}}
                className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </motion.button>
              
              <motion.button
                onClick={goToNextInsight}
                disabled={safeCurrentIndex >= filteredInsights.length - 1}
                whileHover={safeCurrentIndex < filteredInsights.length - 1 ? { scale: 1.1 } : {}}
                whileTap={safeCurrentIndex < filteredInsights.length - 1 ? { scale: 0.9 } : {}}
                className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </motion.button>
            </div>
          </div>

          {/* Current Insight as Advisor Message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={safeCurrentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MonekoAdvisorMessage
                message={convertInsightToAdvisorMessage(currentInsight)}
                showMessage={true}
                typewriterSpeed={80}
              />
            </motion.div>
          </AnimatePresence>

      

          {/* Insight Dots Navigation */}
          {filteredInsights.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {filteredInsights.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => goToInsight(index)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === safeCurrentIndex
                      ? 'bg-pink-600'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}