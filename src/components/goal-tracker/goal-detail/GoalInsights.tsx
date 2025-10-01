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
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      label: 'Recommendation'
    },
    warning: {
      icon: faExclamationTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
      label: 'Warning'
    },
    opportunity: {
      icon: faStar,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
      label: 'Opportunity'
    },
    milestone: {
      icon: faBullseye,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      label: 'Milestone'
    },
    performance: {
      icon: faChartLine,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      label: 'Performance'
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          label: 'High Priority'
        };
      case 'medium':
        return {
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          label: 'Medium Priority'
        };
      default:
        return {
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
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
        className="bg-card rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <FontAwesomeIcon icon={faMagicWandSparkles} className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-medium text-foreground mb-2">
          Moneko Hasn't Shared Insights Yet
        </h3>
        <p className="text-muted-foreground mb-6">
          Let Moneko analyze your goal and provide personalized recommendations to help you succeed.
        </p>
        <motion.button
          onClick={generateNewInsights}
          disabled={isGeneratingNew}
          whileHover={!isGeneratingNew ? { scale: 1.05 } : {}}
          whileTap={!isGeneratingNew ? { scale: 0.95 } : {}}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium rounded-full shadow-sm hover:shadow-md transition-all duration-200"
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
            <h3 className="text-lg font-medium text-foreground">
              What Moneko Thinks
            </h3>
            {highPriorityCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
                {highPriorityCount} urgent
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Moneko's personalized insights for your goal journey
          </p>
        </div>

        {/* Generate New Button */}
        <motion.button
          onClick={generateNewInsights}
          disabled={isGeneratingNew}
          whileHover={!isGeneratingNew ? { scale: 1.05 } : {}}
          whileTap={!isGeneratingNew ? { scale: 0.95 } : {}}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium rounded-full shadow-sm hover:shadow-md transition-all duration-200 text-sm"
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
          className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm"
        >
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-destructive hover:text-destructive/80 transition-colors duration-200"
          >
            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* Insights Navigation and Display */}
      {filteredInsights.length > 0 && currentInsight && (
        <div className="bg-card rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          {/* Navigation Header */}
          <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img src={monekoIcon} alt="Moneko" className="size-5" />
                <span className="text-sm font-medium text-muted-foreground">
                  Insight {safeCurrentIndex + 1} of {filteredInsights.length}
                </span>
              </div>
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
                className="p-2 rounded-xl bg-moneko-background border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subtle-background transition-all duration-200"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4 text-muted-foreground" />
              </motion.button>
              
              <motion.button
                onClick={goToNextInsight}
                disabled={safeCurrentIndex >= filteredInsights.length - 1}
                whileHover={safeCurrentIndex < filteredInsights.length - 1 ? { scale: 1.1 } : {}}
                whileTap={safeCurrentIndex < filteredInsights.length - 1 ? { scale: 0.9 } : {}}
                className="p-2 rounded-xl bg-moneko-background border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subtle-background transition-all duration-200"
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>

          {/* MonekoAdvisorMessage Content */}
          <div className="p-6">
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
                  transparentBackground={true}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Navigation Dots */}
          {filteredInsights.length > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 bg-muted/20">
              {filteredInsights.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => goToInsight(index)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.8 }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === safeCurrentIndex
                      ? 'bg-primary'
                      : 'bg-muted hover:bg-muted-foreground/20'
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