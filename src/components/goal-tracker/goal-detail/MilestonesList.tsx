import { motion, AnimatePresence, Reorder } from "framer-motion";
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
  faChartLine
} from "@fortawesome/free-solid-svg-icons";
import type { GoalMilestone, MilestoneType, MilestoneFrequency, MilestonePriority } from "@/components/goal-tracker/types";
import { useState, useEffect, useOptimistic } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

interface MilestonesListProps {
  milestones: GoalMilestone[];
  goalId: string;
  onMilestoneUpdate: (reorderedItems?: GoalMilestone[]) => void;
  onOptimisticUpdate?: (action: { type: string; milestoneId?: string; milestone?: GoalMilestone; updates?: Partial<GoalMilestone> }) => void;
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

export function MilestonesList({ milestones, goalId, onMilestoneUpdate, onOptimisticUpdate }: MilestonesListProps) {
  const { user } = useAuth();
  const [orderedMilestones, setOrderedMilestones] = useState<GoalMilestone[]>([]);

  // Optimistic state for milestone updates
  const [optimisticMilestones, setOptimisticMilestones] = useOptimistic(
    milestones,
    (state, action: { type: string; milestoneId?: string; milestone?: GoalMilestone; updates?: Partial<GoalMilestone> }) => {
      switch (action.type) {
        case 'complete':
          return state?.map(m => m.id === action.milestoneId ? { ...m, status: 'completed' } : m) || [];
        case 'update':
          return state?.map(m => m.id === action.milestoneId ? { ...m, ...action.updates } : m) || [];
        case 'add':
          return [...(state || []), action.milestone!];
        case 'delete':
          return state?.filter(m => m.id !== action.milestoneId) || [];
        case 'reorder':
          return action.milestone ? state : state || [];
        default:
          return state || [];
      }
    }
  );

  // Use optimistic data or fallback to real data
  const currentMilestones = optimisticMilestones || milestones;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<GoalMilestone | null>(null);
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: '',
    description: '',
    milestone_type: 'action',
    due_date: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sorted = [...currentMilestones].sort((a, b) => a.display_order - b.display_order);
    setOrderedMilestones(sorted);
  }, [currentMilestones]);

  const handleReorder = async (newOrder: GoalMilestone[]) => {
    setOrderedMilestones(newOrder);

    if (!user) {
      setError('You must be logged in to reorder milestones.');
      return;
    }

    const payload = newOrder.map((item, index) => ({ id: item.id, display_order: index }));

    try {
      const { error: invokeError } = await supabase.functions.invoke('goal-milestone-manager', {
        body: { action: 'reorder', payload, userId: user.id },
      });

      if (invokeError) throw invokeError;

      // Apply optimistic update for reordering
      const reorderAction = { type: 'reorder', milestone: null };
      setOptimisticMilestones(reorderAction);
      if (onOptimisticUpdate) {
        onOptimisticUpdate(reorderAction);
      }
      
      onMilestoneUpdate(newOrder);
    } catch (error: any) {
      console.error('Failed to reorder milestones:', error);
      setError(error.message || 'Failed to save new order.');
      // Revert optimistic update on error
      const sorted = [...currentMilestones].sort((a, b) => a.display_order - b.display_order);
      setOrderedMilestones(sorted);
    }
  };

  const getStatusConfig = (milestone: GoalMilestone) => {
    const now = new Date();
    const dueDate = new Date(milestone.due_date);
    const isOverdue = now > dueDate && milestone.status !== 'completed';

    if (milestone.status === 'completed') return { color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-200 dark:border-emerald-500/30', icon: faCheckCircle, label: 'Completed' };
    if (isOverdue) return { color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-500/30', icon: faExclamationTriangle, label: 'Overdue' };
    return { color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-500/30', icon: faListCheck, label: 'Pending' };
  };

  const getPriorityConfig = (priority: MilestonePriority) => {
    switch (priority) {
      case 'critical': return { icon: faExclamationTriangle, color: 'text-red-700' };
      case 'high': return { icon: faFlag, color: 'text-red-500' };
      case 'medium': return { icon: faFlag, color: 'text-orange-500' };
      case 'low': return { icon: faFlag, color: 'text-green-500' };
      default: return { icon: faFlag, color: 'text-gray-400' };
    }
  };

  const getMilestoneTypeIcon = (type: MilestoneType) => {
    switch (type) {
      case 'amount': return faDollarSign;
      case 'habit': return faRepeat;
      case 'date': return faCalendarAlt;
      case 'action': default: return faBullseye;
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', milestone_type: 'action', due_date: '', priority: 'medium' });
    setEditingMilestone(null);
    setShowCreateForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const action = editingMilestone ? 'update' : 'create';
    const payload = {
      ...(editingMilestone ? { id: editingMilestone.id } : { goal_id: goalId, user_id: user.id }),
      ...formData,
      target_amount: formData.target_amount || null,
    };

    try {
      // Apply optimistic update immediately
      if (action === 'create') {
        // Create a temporary milestone for optimistic update
        const tempMilestone: GoalMilestone = {
          id: `temp-${Date.now()}`, // Temporary ID
          goal_id: goalId,
          title: formData.title,
          description: formData.description,
          milestone_type: formData.milestone_type,
          target_amount: formData.target_amount || 0,
          current_amount: 0,
          due_date: formData.due_date,
          habit_description: formData.habit_description,
          frequency: formData.frequency,
          habit_target_value: formData.habit_target_value,
          priority: formData.priority,
          status: 'pending',
          is_ai_generated: false,
          display_order: currentMilestones.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const addAction = { type: 'add', milestone: tempMilestone };
        setOptimisticMilestones(addAction);
        if (onOptimisticUpdate) {
          onOptimisticUpdate(addAction);
        }
      } else if (action === 'update' && editingMilestone) {
        const updateAction = { type: 'update', milestoneId: editingMilestone.id, updates: formData };
        setOptimisticMilestones(updateAction);
        if (onOptimisticUpdate) {
          onOptimisticUpdate(updateAction);
        }
      }

      const { error: invokeError } = await supabase.functions.invoke('goal-milestone-manager', {
        body: { action, payload, userId: user.id },
      });

      if (invokeError) throw invokeError;
      
      onMilestoneUpdate();
      resetForm();
    } catch (error: any) {
      // Revert optimistic update on error
      onMilestoneUpdate();
      console.error('Failed to save milestone:', error);
      setError(error.message || 'Failed to save milestone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!user) {
      setError('You must be logged in to complete a milestone.');
      return;
    }
    
    // Apply optimistic update immediately
    const completeAction = { type: 'complete', milestoneId };
    setOptimisticMilestones(completeAction);
    if (onOptimisticUpdate) {
      onOptimisticUpdate(completeAction);
    }
    
    try {
      const { error: invokeError } = await supabase.functions.invoke('goal-progress-tracker', {
        body: { updateType: 'milestone_completed', milestoneId, goalId, userId: user.id },
      });
      if (invokeError) throw invokeError;
      onMilestoneUpdate();
    } catch (error: any) {
      // Revert optimistic update on error
      onMilestoneUpdate();
      console.error('Failed to complete milestone:', error);
      setError(error.message || 'Failed to complete milestone.');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    if (!user) {
      setError('You must be logged in to delete a milestone.');
      return;
    }
    
    // Apply optimistic update immediately
    const deleteAction = { type: 'delete', milestoneId };
    setOptimisticMilestones(deleteAction);
    if (onOptimisticUpdate) {
      onOptimisticUpdate(deleteAction);
    }
    
    try {
      const { error: invokeError } = await supabase.functions.invoke('goal-milestone-manager', {
        body: { action: 'delete', payload: { id: milestoneId }, userId: user.id },
      });
      if (invokeError) throw invokeError;
      onMilestoneUpdate();
    } catch (error: any) {
      // Revert optimistic update on error
      onMilestoneUpdate();
      console.error('Failed to delete milestone:', error);
      setError(error.message || 'Failed to delete milestone.');
    }
  };

  const completedMilestones = orderedMilestones.filter(m => m.status === 'completed');
  const pendingMilestones = orderedMilestones.filter(m => m.status !== 'completed');
  const completionRate = orderedMilestones.length > 0 ? (completedMilestones.length / orderedMilestones.length) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8"
    >
      <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <FontAwesomeIcon icon={faListCheck} />
            Milestones
          </h3>
          <motion.button
            onClick={() => { setEditingMilestone(null); resetForm(); setShowCreateForm(!showCreateForm); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>{showCreateForm ? 'Cancel' : 'Add Milestone'}</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"><p className="text-sm text-gray-500 dark:text-gray-400">Total</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{orderedMilestones.length}</p></div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"><p className="text-sm text-gray-500 dark:text-gray-400">Completed</p><p className="text-2xl font-bold text-emerald-500">{completedMilestones.length}</p></div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"><p className="text-sm text-gray-500 dark:text-gray-400">Pending</p><p className="text-2xl font-bold text-blue-500">{pendingMilestones.length}</p></div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"><p className="text-sm text-gray-500 dark:text-gray-400">Completion</p><p className="text-2xl font-bold text-purple-500">{completionRate.toFixed(0)}%</p></div>
        </div>

        <AnimatePresence>
          {(showCreateForm || editingMilestone) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="mb-6 overflow-hidden">
              <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">{editingMilestone ? 'Edit Milestone' : 'Create New Milestone'}</h4>
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p className="font-bold">Error</p><p>{error}</p></div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="e.g., Save for down payment" required /></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="Add more details about this milestone" rows={3} /></div>
                  <div className="md:col-span-2"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Milestone Type</label><select value={formData.milestone_type} onChange={(e) => setFormData(prev => ({ ...prev, milestone_type: e.target.value as any }))} className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"><option value="action">Action-based (To-do)</option><option value="amount">Amount-based (Saving)</option><option value="habit">Habit-based (Repetitive task)</option><option value="date">Date-based (Deadline)</option></select></div></div></div>
                  {formData.milestone_type === 'amount' && <div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Target Amount</label><input type="number" value={formData.target_amount || ''} onChange={(e) => setFormData(prev => ({ ...prev, target_amount: parseFloat(e.target.value) }))} className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="e.g., 1000" /></div>}
                  {formData.milestone_type === 'habit' && <><div className="md:col-span-1"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Habit Description</label><input type="text" value={formData.habit_description || ''} onChange={(e) => setFormData(prev => ({ ...prev, habit_description: e.target.value }))} className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="e.g., Cook dinner at home" /></div><div className="md:col-span-1"><label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Frequency</label><select value={formData.frequency || 'daily'} onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))} className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div></>}
                  <div className="md:col-span-2"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))} className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" required /></div><div><label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Priority</label><select value={formData.priority} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))} className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div></div></div>
                </div>
                <div className="flex justify-end gap-4 mt-6"><motion.button type="button" onClick={resetForm} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg">Cancel</motion.button><motion.button type="submit" disabled={isSubmitting} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : (editingMilestone ? 'Update Milestone' : 'Create Milestone')}</motion.button></div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4">
          {orderedMilestones.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400"><FontAwesomeIcon icon={faStar} className="text-4xl mb-4 text-gray-400" /><h4 className="text-xl font-semibold">No Milestones Yet</h4><p className="mt-2">Click 'Add Milestone' to create your first step towards this goal.</p></div>
          ) : (
            <Reorder.Group axis="y" values={orderedMilestones} onReorder={handleReorder}>
              {orderedMilestones.map((milestone, index) => {
                const statusConfig = getStatusConfig(milestone);
                const priorityConfig = getPriorityConfig(milestone.priority);
                const typeIcon = getMilestoneTypeIcon(milestone.milestone_type);
                return (
                  <Reorder.Item key={milestone.id} value={milestone} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="mb-4">
                    <motion.div className={`relative bg-white dark:bg-gray-800 p-5 rounded-xl border-l-4 ${statusConfig.borderColor} shadow-sm hover:shadow-lg transition-shadow duration-300`} whileHover={{ y: -2 }}>
                      <div className="flex items-start gap-4">
                        <div className="text-gray-400 dark:text-gray-500 cursor-grab pt-1"><FontAwesomeIcon icon={faGripVertical} /></div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-3 mb-1"><FontAwesomeIcon icon={typeIcon} className="w-5 h-5 text-purple-500" /><h4 className="text-lg font-bold text-gray-900 dark:text-white">{milestone.title}</h4></div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{milestone.description}</p>
                            </div>
                            <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}><FontAwesomeIcon icon={statusConfig.icon} /><span>{statusConfig.label}</span></div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mt-2 mb-4 border-t border-b border-gray-200 dark:border-gray-700 py-3">
                            <div className="flex items-center gap-2"><FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4" /><span>Due: {new Date(milestone.due_date).toLocaleDateString()}</span></div>
                            <div className="flex items-center gap-2"><FontAwesomeIcon icon={priorityConfig.icon} className={`w-4 h-4 ${priorityConfig.color}`} /><span className="capitalize">{milestone.priority} Priority</span></div>
                            {milestone.is_ai_generated && <div className="flex items-center gap-2 text-purple-500"><FontAwesomeIcon icon={faRobot} className="w-4 h-4" /><span>AI-Generated</span></div>}
                          </div>
                          {milestone.milestone_type === 'amount' && milestone.target_amount && milestone.target_amount > 0 && (
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-600 dark:text-gray-400">Progress</span><span className="text-sm font-bold text-gray-900 dark:text-white">${milestone.current_amount.toLocaleString()} / ${milestone.target_amount.toLocaleString()}</span></div>
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2"><motion.div className={`h-2 rounded-full ${milestone.status === 'completed' ? 'bg-emerald-500' : 'bg-purple-500'}`} initial={{ width: 0 }} animate={{ width: `${Math.min((milestone.current_amount / milestone.target_amount) * 100, 100)}%` }} transition={{ duration: 1, delay: index * 0.1 }} /></div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            {milestone.status !== 'completed' && <motion.button onClick={() => handleCompleteMilestone(milestone.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"><FontAwesomeIcon icon={faCheck} className="w-3 h-3" />Mark Complete</motion.button>}
                            <motion.button onClick={() => { setEditingMilestone(milestone); setFormData({ title: milestone.title, description: milestone.description || '', milestone_type: milestone.milestone_type, target_amount: milestone.target_amount, due_date: milestone.due_date, habit_description: milestone.habit_description, frequency: milestone.frequency, habit_target_value: milestone.habit_target_value, priority: milestone.priority }); setShowCreateForm(true); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"><FontAwesomeIcon icon={faEdit} className="w-3 h-3" />Edit</motion.button>
                            <motion.button onClick={() => handleDeleteMilestone(milestone.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors"><FontAwesomeIcon icon={faTrash} className="w-3 h-3" />Delete</motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}
        </div>
      </div>
    </motion.div>
  );
}