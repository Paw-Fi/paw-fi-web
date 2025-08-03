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
  faArrowRight,
  faArrowDown,
  faArrowUp,
  faClock,
  faRocket,
  faTrash,
  faUpLong,
  faFlag,
  faBrain,
  faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import type { Insight } from "@/components/goal-tracker/types";
import { useAuth } from "@/contexts/auth-context";
import classNames from "classnames";
import monekoIcon from "@/assets/images/icon.svg";

interface GoalInsightsProps {
  insights: Insight[];
  goal: any;
  onInsightUpdate: () => void;
  onOptimisticUpdate?: (action: { type: string; insightId?: string; insight?: any; updates?: any }) => void;
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
  onOptimisticUpdate
}: GoalInsightsProps) {
  const { user } = useAuth();
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [isGeneratingNew, setIsGeneratingNew] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'type'>('priority');
  const [error, setError] = useState<string | null>(null);

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

  const getTimeSinceCreated = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const filteredAndSortedInsights = insights
    .filter(insight => !dismissedInsights.has((insight as any).id || ''))
    .filter(insight => selectedFilter === 'all' || insight.type === selectedFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
          return bPriority - aPriority;
        case 'date':
          return new Date((b as any).created_at || '').getTime() - new Date((a as any).created_at || '').getTime();
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

  const toggleInsightExpansion = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  const dismissInsight = async (insightId: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    setDismissedInsights(prev => new Set([...prev, insightId]));
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
      onInsightUpdate();
    } catch (error) {
      console.error('Failed to generate new insights:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate insights');
    } finally {
      setIsGeneratingNew(false);
    }
  };

  const handleInsightAction = async (insightId: string, action: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    try {
      const { supabase } = await import('@/lib/supabase');
      
      switch (action) {
        case 'helpful':
          if (onOptimisticUpdate) {
            onOptimisticUpdate({ 
              type: 'update', 
              insightId, 
              updates: { user_feedback: 'helpful' } 
            });
          }

          await supabase
            .from('goal_insights')
            .update({ user_feedback: 'helpful' })
            .eq('id', insightId)
            .eq('goal_id', goal.id);
          break;
          
        case 'dismiss':
          await dismissInsight(insightId);
          return;
          
        case 'implement':
          if (onOptimisticUpdate) {
            onOptimisticUpdate({ 
              type: 'update', 
              insightId, 
              updates: { 
                user_feedback: 'implemented',
                implemented_at: new Date().toISOString()
              } 
            });
          }

          await supabase
            .from('goal_insights')
            .update({ 
              user_feedback: 'implemented',
              implemented_at: new Date().toISOString()
            })
            .eq('id', insightId)
            .eq('goal_id', goal.id);
          break;
      }
      onInsightUpdate();
    } catch (error) {
      onInsightUpdate();
      console.error('Failed to handle insight action:', error);
      setError(error instanceof Error ? error.message : 'Failed to process action');
    }
  };

  const getInsightActions = (insight: any) => {
    const actions = [];
    
    if (insight.actionable) {
      actions.push({
        id: 'implement',
        label: 'Implement',
        type: 'primary',
        icon: faCheckCircle
      });
    }
    
    actions.push(
      {
        id: 'helpful',
        label: 'Helpful',
        type: 'secondary',
        icon: faUpLong
      },
      {
        id: 'dismiss',
        label: 'Dismiss',
        type: 'danger',
        icon: faTrash
      }
    );
    
    return actions;
  };

  const insightTypes = ['all', ...new Set(insights.map(i => i.type))];

  // Show only top 3 insights, prioritized by priority
  const topInsights = insights
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
      
      return bPriority - aPriority;
    })
    .slice(0, 3);

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
      className=""
    >
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            
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
                <img src={monekoIcon} alt="Moneko Icon" className="size-8" />
            )}
            <span>{isGeneratingNew ? 'Thinking...' : 'Ask Moneko Again'}</span>
          </motion.button>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 mb-4 text-sm"
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

        {/* Insights Display - Always Show All */}
        <div className="space-y-6">
          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-4 p-4 ">
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter:</span>
              <div className="flex gap-2">
                {insightTypes.map((type) => (
                  <motion.button
                    key={type}
                    onClick={() => setSelectedFilter(type)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                      selectedFilter === type
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="priority">Priority</option>
                <option value="date">Date</option>
                <option value="type">Type</option>
              </select>
            </div>

            {/* Stats */}
            <div className="ml-auto flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{filteredAndSortedInsights.length} insights shown</span>
              <span>•</span>
              <span>{insights.length} total</span>
            </div>
          </div>

          {/* All Insights */}
          <div className="space-y-4">
            {filteredAndSortedInsights.map((insight, index) => {
              const typeConfig = insightTypeConfigs[insight.type] || insightTypeConfigs.recommendation;
              const priorityConfig = getPriorityConfig(insight.priority);
              const isInsightExpanded = expandedInsights.has((insight as any).id || '');
              const actions = getInsightActions(insight);

              return (
                <motion.div
                  key={(insight as any).id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white dark:bg-gray-700/50 rounded-xl border-2 ${typeConfig.borderColor} hover:shadow-lg transition-all group`}
                >
                  {/* Insight Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                    
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {insight.title}
                            </h3>
                            
                            <div className={`px-2 py-1 ${priorityConfig.bgColor} ${priorityConfig.color} rounded-full text-xs font-medium`}>
                              {priorityConfig.label}
                            </div>
                            
                            <div className={`px-2 py-1 ${typeConfig.bgColor} ${typeConfig.color} rounded-full text-xs font-medium`}>
                              {typeConfig.label}
                            </div>
                            
                         
                          
                         
                        </div>
                      </div>

                      {/* Expand Button */}
                      <motion.button
                        onClick={() => toggleInsightExpansion((insight as any).id || '')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <motion.div
                          animate={{ rotate: isInsightExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      </motion.button>
                    </div>

                    {/* Content Preview */}
                    <p className={classNames("text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2",
                      {
                        "h-28": isInsightExpanded,
                        "h-12": !isInsightExpanded
                      }
                    )}>
                      {insight.content}
                    </p>

                    {/* Expanded Content */}
                    {isInsightExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600"
                      >
                        {(insight as any).ai_confidence_score && (
                          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Moneko's Confidence
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {Math.round((insight as any).ai_confidence_score * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <motion.div
                                className="h-2 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(insight as any).ai_confidence_score * 100}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                              />
                            </div>
                          </div>
                        )}

                    
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </motion.div>
  );
}