import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
      description: milestone.description,
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header - Compact */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faListCheck} className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Quick Actions ({completedCount}/{orderedMilestones.length})
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
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
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <FontAwesomeIcon icon={showCreateForm ? faTimes : faPlus} className="w-3 h-3" />
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
            className="overflow-hidden border-b border-gray-200 dark:border-gray-700"
          >
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.milestone_type}
                    onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value as MilestoneType })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                  >
                    <option value="amount">Amount</option>
                    <option value="habit">Habit</option>
                    <option value="action">Action</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as MilestonePriority })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                {formData.milestone_type === 'amount' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      value={formData.target_amount || ''}
                      onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) || undefined })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm resize-none"
                  rows={2}
                  required
                />
              </div>

              {error && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-xs">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <FontAwesomeIcon icon={faClock} className="w-3 h-3 animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                  )}
                  {editingMilestone ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestones List - Compact */}
      <div className="p-4">
        {orderedMilestones.length === 0 ? (
          <div className="text-center py-8">
            <FontAwesomeIcon icon={faListCheck} className="w-8 h-8 text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No milestones yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">Add your first milestone to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderedMilestones.map((milestone) => {
              const isExpanded = expandedMilestones.has(milestone.id);
              return (
                <div
                  key={milestone.id}
                  className={`border rounded-lg p-3 transition-colors ${
                    milestone.status === 'completed'
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleMilestoneComplete(milestone)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        milestone.status === 'completed'
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                      }`}
                    >
                      {milestone.status === 'completed' && (
                        <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon 
                        icon={getMilestoneIcon(milestone.milestone_type)} 
                        className="w-3 h-3 text-purple-600 dark:text-purple-400" 
                      />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(milestone.priority)}`}>
                        {milestone.priority}
                      </span>
                    </div>

                    <div className="flex-1">
                      <h4 className={`font-medium text-sm ${
                        milestone.status === 'completed' 
                          ? 'line-through text-gray-500 dark:text-gray-400' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {milestone.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>Due {new Date(milestone.due_date).toLocaleDateString()}</span>
                        {milestone.target_amount && (
                          <span>${milestone.target_amount.toLocaleString()}</span>
                        )}
                        {milestone.milestone_type === 'habit' && milestone.frequency && (
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faRepeat} className="w-3 h-3" />
                            {milestone.frequency}
                          </span>
                        )}
                        {milestone.progress_percentage > 0 && milestone.status !== 'completed' && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {milestone.progress_percentage.toFixed(0)}% done
                          </span>
                        )}
                        {milestone.is_ai_generated && (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <FontAwesomeIcon icon={faRobot} className="w-3 h-3" />
                            AI
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startInlineEdit(milestone)}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Edit milestone"
                      >
                        <FontAwesomeIcon icon={faEdit} className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => toggleExpanded(milestone.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <FontAwesomeIcon 
                          icon={isExpanded ? faChevronUp : faChevronDown} 
                          className="w-3 h-3" 
                        />
                      </button>
                      <button
                        onClick={() => deleteMilestone(milestone.id)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete milestone"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {inlineEditingMilestone === milestone.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 overflow-hidden border-t border-gray-200 dark:border-gray-600 pt-3"
                      >
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          saveInlineEdit(milestone.id);
                        }} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Title
                              </label>
                              <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Due Date
                              </label>
                              <input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Type
                              </label>
                              <select
                                value={formData.milestone_type}
                                onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value as MilestoneType })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                              >
                                <option value="amount">Amount</option>
                                <option value="habit">Habit</option>
                                <option value="action">Action</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Priority
                              </label>
                              <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as MilestonePriority })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                              </select>
                            </div>
                            {formData.milestone_type === 'amount' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Amount ($)
                                </label>
                                <input
                                  type="number"
                                  value={formData.target_amount || ''}
                                  onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) || undefined })}
                                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            )}
                          </div>

                          {formData.milestone_type === 'habit' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Habit Description
                                </label>
                                <input
                                  type="text"
                                  value={formData.habit_description || ''}
                                  onChange={(e) => setFormData({ ...formData, habit_description: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                  placeholder="e.g., Read for 30 minutes"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Frequency
                                </label>
                                <select
                                  value={formData.frequency || 'daily'}
                                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as MilestoneFrequency })}
                                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
                                >
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Description
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm resize-none"
                              rows={2}
                              required
                            />
                          </div>

                          {error && (
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-xs">
                              {error}
                            </div>
                          )}

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelInlineEdit}
                              className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                            >
                              {isSubmitting ? (
                                <FontAwesomeIcon icon={faClock} className="w-3 h-3 animate-spin" />
                              ) : (
                                <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
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
                        className="mt-3 pl-8 overflow-hidden"
                      >
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {milestone.description}
                          </p>
                          
                          {/* Additional Details */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Type:</span>
                                <span className="ml-2 text-gray-900 dark:text-white capitalize">
                                  {milestone.milestone_type.replace('_', ' ')}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Status:</span>
                                <span className={`ml-2 capitalize font-medium ${
                                  milestone.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                                  milestone.status === 'overdue' ? 'text-red-600 dark:text-red-400' :
                                  milestone.status === 'in_progress' ? 'text-blue-600 dark:text-blue-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {milestone.status.replace('_', ' ')}
                                </span>
                              </div>
                              
                              {milestone.start_date && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400 font-medium">Started:</span>
                                  <span className="ml-2 text-gray-900 dark:text-white">
                                    {new Date(milestone.start_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              
                              {milestone.completed_date && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400 font-medium">Completed:</span>
                                  <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                                    {new Date(milestone.completed_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              
                              {milestone.milestone_type === 'habit' && milestone.habit_description && (
                                <div className="col-span-2">
                                  <span className="text-gray-500 dark:text-gray-400 font-medium">Habit:</span>
                                  <span className="ml-2 text-gray-900 dark:text-white">
                                    {milestone.habit_description}
                                  </span>
                                </div>
                              )}
                              
                              {milestone.milestone_type === 'habit' && milestone.habit_target_value && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400 font-medium">Target:</span>
                                  <span className="ml-2 text-gray-900 dark:text-white">
                                    ${milestone.habit_target_value} per {milestone.frequency}
                                  </span>
                                </div>
                              )}
                              
                              {milestone.milestone_type === 'amount' && milestone.current_amount !== undefined && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400 font-medium">Progress:</span>
                                  <span className="ml-2 text-gray-900 dark:text-white">
                                    ${milestone.current_amount.toLocaleString()}
                                    {milestone.target_amount && (
                                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                                        / ${milestone.target_amount.toLocaleString()}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Progress Bar for amount milestones */}
                            {milestone.milestone_type === 'amount' && milestone.target_amount && milestone.progress_percentage > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-gray-500 dark:text-gray-400">Progress</span>
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    {milestone.progress_percentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div 
                                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
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