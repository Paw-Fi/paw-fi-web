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
  faBrain
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import type { Insight } from "@/components/goal-tracker/types";
import { useAuth } from "@/contexts/auth-context";

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
  const [isExpanded, setIsExpanded] = useState(false);
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
      className="bg-gradient-to-br from-white via-white to-indigo-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-indigo-900/20 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm"
    >
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 dark:from-indigo-400/30 dark:to-indigo-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-indigo-500/20 dark:border-indigo-400/30">
              <FontAwesomeIcon icon={faMagicWandSparkles} className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            
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
              <FontAwesomeIcon icon={faBrain} className="w-3 h-3" />
            )}
            <span>{isGeneratingNew ? 'Thinking...' : 'Review Again'}</span>
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

        {/* Insights Display */}
        <div className="space-y-4">
          {/* Preview Mode - Top Insights */}
          {!isExpanded && topInsights.map((insight, index) => {
            const typeConfig = insightTypeConfigs[insight.type] || insightTypeConfigs.recommendation;
            const priorityConfig = getPriorityConfig(insight.priority);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 ${typeConfig.bgColor} rounded-lg flex items-center justify-center`}>
                    <FontAwesomeIcon icon={typeConfig.icon} className={`w-4 h-4 ${typeConfig.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {insight.title}
                      </h4>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <div className={`px-2 py-0.5 ${priorityConfig.bgColor} ${priorityConfig.color} rounded-full text-xs font-medium`}>
                          {insight.priority}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                      {insight.content.length > 120 
                        ? `${insight.content.substring(0, 120)}...` 
                        : insight.content
                      }
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {insight.actionable && (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                            Actionable
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Expanded Mode - All Insights with Full Features */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Filters and Sort */}
                <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
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
                              <div className={`flex-shrink-0 w-12 h-12 ${typeConfig.bgColor} rounded-xl flex items-center justify-center`}>
                                <FontAwesomeIcon icon={typeConfig.icon} className={`w-6 h-6 ${typeConfig.color}`} />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {insight.title}
                                  </h3>
                                  
                                  <div className={`px-2 py-1 ${priorityConfig.bgColor} ${priorityConfig.color} rounded-full text-xs font-medium`}>
                                    {priorityConfig.label}
                                  </div>
                                  
                                  <div className={`px-2 py-1 ${typeConfig.bgColor} ${typeConfig.color} rounded-full text-xs font-medium`}>
                                    {typeConfig.label}
                                  </div>
                                  
                                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                    <FontAwesomeIcon icon={faBrain} className="w-3 h-3" />
                                    Moneko
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                  <div className="flex items-center gap-1">
                                    <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                                    {getTimeSinceCreated((insight as any).created_at || '')}
                                  </div>
                                  
                                  {(insight as any).ai_confidence_score && (
                                    <div className="flex items-center gap-1">
                                      <FontAwesomeIcon icon={faBullseye} className="w-3 h-3" />
                                      {Math.round((insight as any).ai_confidence_score * 100)}% confidence
                                    </div>
                                  )}
                                  
                                  {insight.actionable && (
                                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                      <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                                      Actionable
                                    </div>
                                  )}
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
                                <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4 text-gray-400" />
                              </motion.div>
                            </motion.button>
                          </div>

                          {/* Content Preview */}
                          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {isInsightExpanded ? insight.content : `${insight.content.substring(0, 200)}${insight.content.length > 200 ? '...' : ''}`}
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

                              {/* Action Buttons */}
                              <div className="flex items-center gap-3">
                                {actions.map((action) => (
                                  <motion.button
                                    key={action.id}
                                    onClick={() => handleInsightAction((insight as any).id || '', action.id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
                                      action.type === 'primary'
                                        ? 'bg-pink-600 hover:bg-pink-700 text-white'
                                        : action.type === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    <FontAwesomeIcon icon={action.icon} className="w-3 h-3" />
                                    {action.label}
                                  </motion.button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Expand/Collapse Button */}
        {insights.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors group"
            >
              <span>
                {isExpanded 
                  ? `Show Less` 
                  : insights.length > 3 
                    ? `View All ${insights.length} Insights` 
                    : `View All Insights`
                }
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <FontAwesomeIcon icon={faArrowDown} className="w-4 h-4" />
              </motion.div>
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}