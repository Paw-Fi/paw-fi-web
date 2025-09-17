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
      icon: faBullseye,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
      label: 'Opportunity'
    },
    milestone: {
      icon: faFlag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      label: 'Milestone'
    },
    performance: {
      icon: faChartLine,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      label: 'Performance'
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          label: 'High Priority',
          order: 3
        };
      case 'medium':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          label: 'Medium Priority',
          order: 2
        };
      default:
        return {
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
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
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0 w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center shadow-sm">
              <FontAwesomeIcon
                icon={faLightbulb}
                className="w-8 h-8 text-primary"
              />
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-light text-foreground">
                  All of Moneko's Insights
                </h1>
                {highPriorityCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-full text-sm font-medium">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
                    {highPriorityCount} urgent
                  </div>
                )}
                {insights.filter(i => i.is_ai_generated).length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    <FontAwesomeIcon icon={faBrain} className="w-3 h-3" />
                    Moneko
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">
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
            className="flex items-center gap-3 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground font-medium rounded-full shadow-sm hover:shadow-md transition-all duration-200"
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
        <div className="flex flex-wrap items-center gap-6 mb-8 p-6 bg-muted/50 rounded-3xl">
          {/* Type Filter */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Filter:</span>
            <div className="flex gap-2">
              {insightTypes.map((type) => (
                <motion.button
                  key={type}
                  onClick={() => setSelectedFilter(type)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 capitalize ${
                    selectedFilter === type
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card text-muted-foreground hover:bg-card/80 hover:text-foreground'
                  }`}
                >
                  {type}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 text-sm bg-card border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
            >
              <option value="priority">Priority</option>
              <option value="date">Date</option>
              <option value="type">Type</option>
            </select>
          </div>

          {/* Stats */}
          <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
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
            className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive mb-6"
          >
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5" />
            <span className="font-medium">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-destructive hover:text-destructive/80 transition-colors duration-200"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Insights List */}
        {filteredAndSortedInsights.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto bg-muted rounded-3xl flex items-center justify-center mb-8 shadow-sm">
              <FontAwesomeIcon icon={faLightbulb} className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-light text-foreground mb-3">
              Moneko Hasn't Shared Insights Yet
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Let Moneko analyze your goal and provide personalized recommendations to help you succeed.
            </p>
            <motion.button
              onClick={generateNewInsights}
              disabled={isGeneratingNew}
              whileHover={!isGeneratingNew ? { scale: 1.05 } : {}}
              whileTap={!isGeneratingNew ? { scale: 0.95 } : {}}
              className="inline-flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground font-medium rounded-full shadow-sm hover:shadow-md transition-all duration-200"
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
                  className={`bg-card rounded-3xl border-2 ${typeConfig.borderColor} hover:shadow-md transition-all duration-200 group`}
                >
                  {/* Insight Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`flex-shrink-0 w-12 h-12 ${typeConfig.bgColor} rounded-xl flex items-center justify-center`}>
                          <FontAwesomeIcon icon={typeConfig.icon} className={`w-6 h-6 ${typeConfig.color}`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <h3 className="text-lg font-medium text-foreground">
                              {insight.title}
                            </h3>
                            
                            <div className={`px-3 py-1 ${priorityConfig.bgColor} ${priorityConfig.color} rounded-full text-xs font-medium`}>
                              {priorityConfig.label}
                            </div>
                            
                            <div className={`px-3 py-1 ${typeConfig.bgColor} ${typeConfig.color} rounded-full text-xs font-medium`}>
                              {typeConfig.label}
                            </div>

                            {insight.is_ai_generated && (
                              <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                <FontAwesomeIcon icon={faBrain} className="w-3 h-3" />
                                Moneko
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
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
                              <div className="flex items-center gap-1 text-success">
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
                        className="p-2 hover:bg-muted rounded-2xl transition-all duration-200"
                      >
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FontAwesomeIcon icon={faArrowUp} className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </motion.button>
                    </div>

                    {/* Content Preview */}
                    <p className="text-muted-foreground leading-relaxed">
                      {isExpanded ? insight.content : `${insight.content.substring(0, 200)}${insight.content.length > 200 ? '...' : ''}`}
                    </p>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-border"
                      >
                        {insight.ai_confidence_score && (
                          <div className="mb-6 p-4 bg-muted/50 rounded-2xl">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">
                                Moneko's Confidence
                              </span>
                              <span className="text-sm font-semibold text-foreground">
                                {Math.round(insight.ai_confidence_score * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <motion.div
                                className="h-2 bg-primary rounded-full"
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
                              className={`flex items-center gap-2 px-4 py-2 font-medium rounded-full transition-all duration-200 ${
                                action.type === 'primary'
                                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md'
                                  : action.type === 'danger'
                                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm hover:shadow-md'
                                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
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
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="px-8 py-3 rounded-full hover:scale-105 transition-all duration-200"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
