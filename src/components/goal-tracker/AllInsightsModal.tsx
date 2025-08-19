import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faLightbulb, 
  faExclamationTriangle, 
  faBullseye, 
  faFlag, 
  faChartLine, 
  faCheckCircle, 
  faUpLong, 
  faTrash, 
  faClock, 
  faBrain, 
  faRocket, 
  faArrowUp 
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function AllInsightsModal({ 
  isOpen, 
  onClose, 
  insights,
  goal,
  onInsightUpdate,
  onOptimisticUpdate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  insights: any[];
  goal: any;
  onInsightUpdate: () => void;
  onOptimisticUpdate?: (action: { type: string; insightId?: string; insight?: any; updates?: any }) => void;
}) {
  const { user } = useAuth();
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [isGeneratingNew, setIsGeneratingNew] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'type'>('priority');
  const [error, setError] = useState<string | null>(null);

  const insightTypeConfigs: Record<string, any> = {
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
      icon: faBullseye,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-500/30',
      label: 'Opportunity'
    },
    milestone: {
      icon: faFlag,
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
          label: 'High Priority',
          order: 3
        };
      case 'medium':
        return {
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
          label: 'Medium Priority',
          order: 2
        };
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-700/30',
          label: 'Low Priority',
          order: 1
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
    .filter(insight => !dismissedInsights.has(insight.id))
    .filter(insight => selectedFilter === 'all' || insight.insight_type === selectedFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return getPriorityConfig(b.priority).order - getPriorityConfig(a.priority).order;
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'type':
          return a.insight_type.localeCompare(b.insight_type);
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

    // Apply optimistic update immediately
    setDismissedInsights(prev => new Set([...prev, insightId]));
    if (onOptimisticUpdate) {
      onOptimisticUpdate({ type: 'dismiss', insightId });
    }

    try {
      // Import supabase from the lib
      const { supabase } = await import('@/lib/supabase');
      
      // Mark insight as dismissed in the database
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
      // Revert optimistic update on error
      setDismissedInsights(prev => {
        const newSet = new Set(prev);
        newSet.delete(insightId);
        return newSet;
      });
      onInsightUpdate(); // This will refetch and revert parent optimistic state
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
      // Import supabase from the lib
      const { supabase } = await import('@/lib/supabase');
      
      // Call the goal-insights-generator function
      const { data, error } = await supabase.functions.invoke('goal-insights-generator', {
        body: {
          goalId: goal.id,
          userId: user.id
        }
      });

      if (error) throw error;

      // Note: New insights generation doesn't need optimistic updates
      // since we're creating new data, not modifying existing data
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
      // Import supabase from the lib
      const { supabase } = await import('@/lib/supabase');
      
      switch (action) {
        case 'helpful':
          // Apply optimistic update immediately
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
          return; // dismissInsight handles its own optimistic updates
          
        case 'implement':
          // Apply optimistic update immediately
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

          // Track that user wants to implement this insight
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
      // Revert optimistic update on error by refetching
      onInsightUpdate();
      console.error('Failed to handle insight action:', error);
      setError(error instanceof Error ? error.message : 'Failed to process action');
    }
  };

  const getInsightActions = (insight: any) => {
    const actions: Array<{
      id: string;
      label: string;
      type: string;
      icon: any;
    }> = [];
    
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

  const insightTypes = ['all', ...new Set(insights.map(i => i.insight_type))];
  const highPriorityCount = insights.filter(i => i.priority === 'high' && !dismissedInsights.has(i.id)).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      width="xwide"
    >
      <div className="p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-pink-500/20 to-pink-600/10 dark:from-pink-400/30 dark:to-pink-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-pink-500/20 dark:border-pink-400/30">
              <FontAwesomeIcon
                icon={faLightbulb}
                className="w-7 h-7 text-pink-600 dark:text-pink-400"
              />
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  All of Moneko's Insights
                </h1>
                {highPriorityCount > 0 && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
                    {highPriorityCount} urgent
                  </div>
                )}
                {insights.filter(i => i.is_ai_generated).length > 0 && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    <FontAwesomeIcon icon={faBrain} className="w-3 h-3" />
                    Moneko
                  </div>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Everything Moneko has learned about "{goal.title}"
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <motion.button
            onClick={generateNewInsights}
            disabled={isGeneratingNew}
            whileHover={!isGeneratingNew ? { scale: 1.05 } : {}}
            whileTap={!isGeneratingNew ? { scale: 0.95 } : {}}
            className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/25 transition-colors"
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
            <span>{isGeneratingNew ? 'Moneko is thinking...' : 'Ask Moneko for More'}</span>
          </motion.button>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
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

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400 mb-6"
          >
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5" />
            <span className="font-medium">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Insights List */}
        {filteredAndSortedInsights.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
              <FontAwesomeIcon icon={faLightbulb} className="w-10 h-10 text-gray-400" />
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
              <FontAwesomeIcon icon={faRocket} className="w-4 h-4" />
              Get Moneko's First Insights
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedInsights.map((insight, index) => {
              const typeConfig = insightTypeConfigs[insight.insight_type] || insightTypeConfigs.recommendation;
              const priorityConfig = getPriorityConfig(insight.priority);
              const isExpanded = expandedInsights.has(insight.id);
              const actions = getInsightActions(insight);

              return (
                <motion.div
                  key={insight.id}
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

                            {insight.is_ai_generated && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                <FontAwesomeIcon icon={faBrain} className="w-3 h-3" />
                                Moneko
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                              {getTimeSinceCreated(insight.created_at)}
                            </div>
                            
                            {insight.ai_confidence_score && (
                              <div className="flex items-center gap-1">
                                <FontAwesomeIcon icon={faBullseye} className="w-3 h-3" />
                                {Math.round(insight.ai_confidence_score * 100)}% confidence
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
                        onClick={() => toggleInsightExpansion(insight.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      </motion.button>
                    </div>

                    {/* Content Preview */}
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {isExpanded ? insight.content : `${insight.content.substring(0, 200)}${insight.content.length > 200 ? '...' : ''}`}
                    </p>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600"
                      >
                        {insight.ai_confidence_score && (
                          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Moneko's Confidence
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {Math.round(insight.ai_confidence_score * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <motion.div
                                className="h-2 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${insight.ai_confidence_score * 100}%` }}
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
                              onClick={() => handleInsightAction(insight.id, action.id)}
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
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="px-6"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
