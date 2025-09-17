import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  faListCheck,
  faPlus,
  faEdit,
  faTrash,
  faCheck,
  faFlag,
  faDollarSign,
  faCalendarAlt,
  faRobot,
  faUser,
  faBullseye,
  faRepeat,
  faExclamationTriangle,
  faCheckCircle,
  faClock,
  faGripVertical,
  faStar,
  faLightbulb,
  faChartLine,
  faChevronDown,
  faChevronUp,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import type { GoalMilestone, MilestoneType, MilestoneFrequency, MilestonePriority, MilestoneStatus } from "@/components/goal-tracker/types/milestone-types";
import { useState, useEffect, useOptimistic } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { toast } from "react-toastify";

interface MilestonesListProps {
  milestones: GoalMilestone[];
  goalId: string;
  onMilestoneUpdate: (reorderedItems?: GoalMilestone[]) => void;
  onOptimisticUpdate?: (action: { type: string; milestoneId?: string; milestone?: GoalMilestone; updates?: Partial<GoalMilestone> }) => void;
  isSubscriptionActive?: boolean;
  onSubscriptionRequired?: () => void;
}

interface MilestoneFormData {
  title: string;
  description: string;
  milestone_type: MilestoneType;
  target_amount?: number;
  due_date: string;
  habit_description?: string;
  frequency?: MilestoneFrequency;
  habit_target_value?: number;
  priority: MilestonePriority;
}

export function MilestonesList({ milestones, goalId, onMilestoneUpdate, onOptimisticUpdate, isSubscriptionActive, onSubscriptionRequired }: MilestonesListProps) {
  const { user } = useAuth();
  const [orderedMilestones, setOrderedMilestones] = useState<GoalMilestone[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<GoalMilestone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [inlineEditingMilestone, setInlineEditingMilestone] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: '',
    description: '',
    milestone_type: 'amount',
    due_date: '',
    priority: 'medium'
  });

  // Optimistic state
  const [optimisticMilestones, setOptimisticMilestones] = useOptimistic(
    milestones,
    (state, action: { type: string; milestoneId?: string; milestone?: GoalMilestone; updates?: Partial<GoalMilestone> }) => {
      switch (action.type) {
        case 'update':
          return state.map(m => m.id === action.milestoneId ? { ...m, ...action.updates } : m);
        case 'add':
          return [...state, action.milestone!];
        case 'delete':
          return state.filter(m => m.id !== action.milestoneId);
        case 'reorder':
          return action.milestone ? [action.milestone] : state;
        default:
          return state;
      }
    }
  );

  const currentMilestones = optimisticMilestones || milestones;

  useEffect(() => {
    setOrderedMilestones(currentMilestones.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
  }, [currentMilestones]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      milestone_type: 'amount',
      due_date: '',
      priority: 'medium'
    });
    setShowCreateForm(false);
    setEditingMilestone(null);
    setInlineEditingMilestone(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const milestoneData = {
        ...formData,
        goal_id: goalId,
        user_id: user.id,
      };

      if (editingMilestone) {
        // Optimistically update milestone
        const optimisticUpdates = { ...milestoneData, updated_at: new Date().toISOString() };
        setOptimisticMilestones({ type: 'update', milestoneId: editingMilestone.id, updates: optimisticUpdates });
        if (onOptimisticUpdate) {
          onOptimisticUpdate({ type: 'update', milestoneId: editingMilestone.id, updates: optimisticUpdates });
        }

        const { error } = await supabase.functions.invoke('goal-milestone-manager', {
          body: {
            action: 'update',
            payload: { ...milestoneData, id: editingMilestone.id },
            userId: user.id,
          },
        });

        if (error) throw error;
      } else {
        // Optimistically add milestone
        const tempMilestone: GoalMilestone = {
          ...milestoneData,
          id: `temp-${Date.now()}`,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_ai_generated: false,
          display_order: orderedMilestones.length,
          current_amount: 0,
          start_date: new Date().toISOString(),
          progress_percentage: 0
        } as GoalMilestone;

        setOptimisticMilestones({ type: 'add', milestone: tempMilestone });
        if (onOptimisticUpdate) {
          onOptimisticUpdate({ type: 'add', milestone: tempMilestone });
        }

        const { error } = await supabase.functions.invoke('goal-milestone-manager', {
          body: {
            action: 'create',
            payload: milestoneData,
            userId: user.id,
          },
        });

        if (error) throw error;
      }

      onMilestoneUpdate();
      resetForm();
      toast.success(editingMilestone ? 'Milestone updated successfully!' : 'Milestone created successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save milestone';
      setError(errorMessage);
      toast.error(errorMessage);
      onMilestoneUpdate(); // Revert optimistic updates
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMilestoneComplete = async (milestone: GoalMilestone) => {
    if (!user?.id) return;

    const newStatus: MilestoneStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    const updates = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // Store original state for reverting
    const originalUpdates = {
      status: milestone.status,
      updated_at: milestone.updated_at
    };

    // Optimistic update
    setOptimisticMilestones({ type: 'update', milestoneId: milestone.id, updates });
    if (onOptimisticUpdate) {
      onOptimisticUpdate({ type: 'update', milestoneId: milestone.id, updates });
    }

    try {
      const { error } = await supabase.functions.invoke('goal-milestone-manager', {
        body: {
          action: 'update',
          payload: { ...updates, id: milestone.id },
          userId: user.id,
        },
      });

      if (error) throw error;
      onMilestoneUpdate();
      toast.success(`Milestone ${newStatus === 'completed' ? 'completed' : 'reopened'} successfully!`);
    } catch (err) {
      console.error('Failed to toggle milestone completion:', err);
      toast.error('Failed to update milestone status');
      
      // Revert the optimistic update
      setOptimisticMilestones({ type: 'update', milestoneId: milestone.id, updates: originalUpdates });
      if (onOptimisticUpdate) {
        onOptimisticUpdate({ type: 'update', milestoneId: milestone.id, updates: originalUpdates });
      }
      
      // Also trigger parent update to ensure consistency
      onMilestoneUpdate();
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    if (!user?.id) return;

    // Find the milestone to delete (for reverting if needed)
    const milestoneToDelete = orderedMilestones.find(m => m.id === milestoneId);
    if (!milestoneToDelete) return;

    // Optimistic delete
    setOptimisticMilestones({ type: 'delete', milestoneId });
    if (onOptimisticUpdate) {
      onOptimisticUpdate({ type: 'delete', milestoneId });
    }

    try {
      const { error } = await supabase.functions.invoke('goal-milestone-manager', {
        body: {
          action: 'delete',
          payload: { id: milestoneId },
          userId: user.id,
        },
      });

      if (error) throw error;
      onMilestoneUpdate();
      toast.success('Milestone deleted successfully!');
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      toast.error('Failed to delete milestone');
      
      // Revert the optimistic delete by adding the milestone back
      setOptimisticMilestones({ type: 'add', milestone: milestoneToDelete });
      if (onOptimisticUpdate) {
        onOptimisticUpdate({ type: 'add', milestone: milestoneToDelete });
      }
      
      // Also trigger parent update to ensure consistency
      onMilestoneUpdate();
    }
  };

  const toggleExpanded = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
    } else {
      newExpanded.add(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  const startInlineEdit = (milestone: GoalMilestone) => {
    if (!isSubscriptionActive) {
      onSubscriptionRequired?.();
      return;
    }
    
    setInlineEditingMilestone(milestone.id);
    setFormData({
      title: milestone.title,
      description: milestone.description || '',
      milestone_type: milestone.milestone_type,
      target_amount: milestone.target_amount,
      due_date: milestone.due_date,
      habit_description: milestone.habit_description,
      frequency: milestone.frequency,
      habit_target_value: milestone.habit_target_value,
      priority: milestone.priority
    });
  };

  const cancelInlineEdit = () => {
    setInlineEditingMilestone(null);
    setFormData({
      title: '',
      description: '',
      milestone_type: 'amount',
      due_date: '',
      priority: 'medium'
    });
    setError(null);
  };

  const saveInlineEdit = async (milestoneId: string) => {
    if (!user?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const milestoneData = {
        ...formData,
        goal_id: goalId,
        user_id: user.id,
      };

      // Optimistically update milestone
      const optimisticUpdates = { ...milestoneData, updated_at: new Date().toISOString() };
      setOptimisticMilestones({ type: 'update', milestoneId, updates: optimisticUpdates });
      if (onOptimisticUpdate) {
        onOptimisticUpdate({ type: 'update', milestoneId, updates: optimisticUpdates });
      }

      const { error } = await supabase.functions.invoke('goal-milestone-manager', {
        body: {
          action: 'update',
          payload: { ...milestoneData, id: milestoneId },
          userId: user.id,
        },
      });

      if (error) throw error;

      onMilestoneUpdate();
      setInlineEditingMilestone(null);
      toast.success('Milestone updated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update milestone';
      setError(errorMessage);
      toast.error(errorMessage);
      onMilestoneUpdate(); // Revert optimistic updates
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMilestoneIcon = (type: MilestoneType) => {
    switch (type) {
      case 'amount': return faDollarSign;
      case 'habit': return faRepeat;
      case 'action': return faFlag;
      case 'date': return faCalendarAlt;
      default: return faBullseye;
    }
  };

  const getPriorityColor = (priority: MilestonePriority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/20';
    }
  };

  const completedCount = orderedMilestones.filter(m => m.status === 'completed').length;
  const progressPercentage = orderedMilestones.length > 0 ? (completedCount / orderedMilestones.length) * 100 : 0;

  return (
    <div className="bg-card rounded-3xl shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header - Compact */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-subtle-background rounded-2xl flex items-center justify-center">
              <FontAwesomeIcon icon={faListCheck} className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-base">
                Quick Actions ({completedCount}/{orderedMilestones.length})
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground font-medium">
                  {progressPercentage.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if(!isSubscriptionActive)
              {
                onSubscriptionRequired?.();
                return
              }
              setShowCreateForm(!showCreateForm)
            }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:scale-105 min-h-[40px] touch-manipulation"
          >
            <FontAwesomeIcon icon={showCreateForm ? faTimes : faPlus} className="w-4 h-4" />
            {showCreateForm ? 'Cancel' : 'Add'}
          </button>
        </div>
      </div>

      {/* Create Form - Compact */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t"
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Type
                  </label>
                  <select
                    value={formData.milestone_type}
                    onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value as MilestoneType })}
                    className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                  >
                    <option value="amount">Amount</option>
                    <option value="habit">Habit</option>
                    <option value="action">Action</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as MilestonePriority })}
                    className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                {formData.milestone_type === 'amount' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      value={formData.target_amount || ''}
                      onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) || undefined })}
                      className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none transition-all duration-200"
                  rows={3}
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:scale-105"
                >
                  {isSubmitting ? (
                    <FontAwesomeIcon icon={faClock} className="w-4 h-4 animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                  )}
                  {editingMilestone ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestones List - Compact */}
      <div className="p-6">
        {orderedMilestones.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faListCheck} className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-base font-medium">No milestones yet</p>
            <p className="text-muted-foreground text-sm mt-1">Add your first milestone to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orderedMilestones.map((milestone) => {
              const isExpanded = expandedMilestones.has(milestone.id);
              return (
                <div
                  key={milestone.id}
                  className={`border rounded-2xl p-4 transition-all duration-200 overflow-hidden hover:shadow-sm ${
                    milestone.status === 'completed'
                      ? 'bg-success/5 border-success/20'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  {/* Mobile Layout - Stack vertically */}
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={milestone.status === 'completed'}
                          onCheckedChange={() => toggleMilestoneComplete(milestone)}
                          className="data-[state=checked]:bg-success data-[state=checked]:border-success w-5 h-5"
                        />
                        
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-subtle-background rounded-xl flex items-center justify-center">
                            <FontAwesomeIcon 
                              icon={getMilestoneIcon(milestone.milestone_type)} 
                              className="w-4 h-4 text-primary" 
                            />
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(milestone.priority)}`}>
                            {milestone.priority}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startInlineEdit(milestone)}
                          className="p-2 text-muted-foreground hover:text-primary rounded-xl hover:bg-subtle-background transition-all duration-200 touch-manipulation"
                          title="Edit milestone"
                        >
                          <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleExpanded(milestone.id)}
                          className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-subtle-background transition-all duration-200 touch-manipulation"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          <FontAwesomeIcon 
                            icon={isExpanded ? faChevronUp : faChevronDown} 
                            className="w-4 h-4" 
                          />
                        </button>
                        <button
                          onClick={() => deleteMilestone(milestone.id)}
                          className="p-2 text-muted-foreground hover:text-destructive rounded-xl hover:bg-destructive/10 transition-all duration-200 touch-manipulation"
                          title="Delete milestone"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Title Row */}
                    <div>
                      <h4 className={`font-medium text-lg leading-tight break-words ${
                        milestone.status === 'completed' 
                          ? 'line-through text-muted-foreground' 
                          : 'text-foreground'
                      }`}>
                        {milestone.title}
                      </h4>
                    </div>
                    
                    {/* Details Row */}
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="bg-muted px-3 py-1.5 rounded-full flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendarAlt} className="w-3 h-3" />
                        Due {new Date(milestone.due_date).toLocaleDateString()}
                      </span>
                      {milestone.target_amount && (
                        <span className="bg-success/10 text-success px-3 py-1.5 rounded-full flex items-center gap-2">
                          <FontAwesomeIcon icon={faDollarSign} className="w-3 h-3" />
                          ${milestone.target_amount.toLocaleString()}
                        </span>
                      )}
                      {milestone.milestone_type === 'habit' && milestone.frequency && (
                        <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-2">
                          <FontAwesomeIcon icon={faRepeat} className="w-3 h-3" />
                          {milestone.frequency}
                        </span>
                      )}
                      {milestone.progress_percentage > 0 && milestone.status !== 'completed' && (
                        <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                          {milestone.progress_percentage.toFixed(0)}% done
                        </span>
                      )}
                      {milestone.is_ai_generated && (
                        <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-2">
                          <FontAwesomeIcon icon={faRobot} className="w-3 h-3" />
                          AI
                        </span>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {inlineEditingMilestone === milestone.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 overflow-hidden border-t pt-4"
                      >
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          saveInlineEdit(milestone.id);
                        }} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Title
                              </label>
                              <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Due Date
                              </label>
                              <input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Type
                              </label>
                              <select
                                value={formData.milestone_type}
                                onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value as MilestoneType })}
                                className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                              >
                                <option value="amount">Amount</option>
                                <option value="habit">Habit</option>
                                <option value="action">Action</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Priority
                              </label>
                              <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as MilestonePriority })}
                                className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                              </select>
                            </div>
                            {formData.milestone_type === 'amount' && (
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Amount ($)
                                </label>
                                <input
                                  type="number"
                                  value={formData.target_amount || ''}
                                  onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) || undefined })}
                                  className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            )}
                          </div>

                          {formData.milestone_type === 'habit' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Habit Description
                                </label>
                                <input
                                  type="text"
                                  value={formData.habit_description || ''}
                                  onChange={(e) => setFormData({ ...formData, habit_description: e.target.value })}
                                  className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                                  placeholder="e.g., Read for 30 minutes"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Frequency
                                </label>
                                <select
                                  value={formData.frequency || 'daily'}
                                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as MilestoneFrequency })}
                                  className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all duration-200"
                                >
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Description
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-4 py-3 bg-background border rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none transition-all duration-200"
                              rows={3}
                              required
                            />
                          </div>

                          {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm">
                              {error}
                            </div>
                          )}

                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={cancelInlineEdit}
                              className="px-6 py-3 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors duration-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:scale-105"
                            >
                              {isSubmitting ? (
                                <FontAwesomeIcon icon={faClock} className="w-4 h-4 animate-spin" />
                              ) : (
                                <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                              )}
                              Save Changes
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                    {isExpanded && inlineEditingMilestone !== milestone.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 overflow-hidden"
                      >
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {milestone.description}
                          </p>
                          
                          {/* Additional Details */}
                          <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground font-medium">Type:</span>
                                <span className="ml-2 text-foreground capitalize">
                                  {milestone.milestone_type.replace('_', ' ')}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground font-medium">Status:</span>
                                <span className={`ml-2 capitalize font-medium ${
                                  milestone.status === 'completed' ? 'text-success' :
                                  milestone.status === 'overdue' ? 'text-destructive' :
                                  milestone.status === 'in_progress' ? 'text-primary' :
                                  'text-muted-foreground'
                                }`}>
                                  {milestone.status.replace('_', ' ')}
                                </span>
                              </div>
                              
                              {milestone.start_date && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Started:</span>
                                  <span className="ml-2 text-foreground">
                                    {new Date(milestone.start_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              
                              {milestone.completed_date && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Completed:</span>
                                  <span className="ml-2 text-success font-medium">
                                    {new Date(milestone.completed_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              
                              {milestone.milestone_type === 'habit' && milestone.habit_description && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground font-medium">Habit:</span>
                                  <span className="ml-2 text-foreground">
                                    {milestone.habit_description}
                                  </span>
                                </div>
                              )}
                              
                              {milestone.milestone_type === 'habit' && milestone.habit_target_value && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Target:</span>
                                  <span className="ml-2 text-foreground">
                                    ${milestone.habit_target_value} per {milestone.frequency}
                                  </span>
                                </div>
                              )}
                              
                              {milestone.milestone_type === 'amount' && milestone.current_amount !== undefined && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Progress:</span>
                                  <span className="ml-2 text-foreground">
                                    ${milestone.current_amount.toLocaleString()}
                                    {milestone.target_amount && (
                                      <span className="text-muted-foreground ml-1">
                                        / ${milestone.target_amount.toLocaleString()}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Progress Bar for amount milestones */}
                            {milestone.milestone_type === 'amount' && milestone.target_amount && milestone.progress_percentage > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span className="text-foreground font-medium">
                                    {milestone.progress_percentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(milestone.progress_percentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}