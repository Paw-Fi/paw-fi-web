import { Modal } from "../ui/modal";
import { GoalPresentationFlow } from "./goal-presentation/goal-presentation-flow";
import type { GoalCreationResult } from "./types";

// Tracker Modal Component - Now uses GoalPresentationFlow
export function TrackerModal({ 
  isOpen, 
  onClose, 
  goal,
  progressData,
  milestones,
  insights}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal: any;
  progressData: any;
  milestones: any[];
  insights?: any[];
  activeTab: 'activity' | 'milestones';
  setActiveTab: (tab: 'activity' | 'milestones') => void;
  savingsGap: number;
  onUpdate: () => void;
  onOptimisticUpdate: (updates: any) => void;
  onProgressUpdate: any;
}) {
  if (!isOpen || !goal) return null;

  // Transform the current goal data to match GoalCreationResult format
  const goalData: GoalCreationResult = {
    goal: {
      id: goal.id,
      title: goal.title,
      description: goal.description || '',
      target_amount: goal.target_amount,
      target_date: goal.target_date,
      rationale: goal.ai_generated_strategy || ''
    },
    strategy: goal.ai_generated_strategy || '',
    milestones: milestones.map(milestone => ({
      ...milestone,
      // Ensure DBMilestone format compatibility
      id: milestone.id || '',
      goal_id: milestone.goal_id || goal.id,
      title: milestone.title,
      description: milestone.description || '',
      milestone_type: milestone.milestone_type,
      target_amount: milestone.target_amount,
      current_amount: milestone.current_amount || 0,
      habit_description: milestone.habit_description,
      frequency: milestone.frequency,
      habit_target_value: milestone.habit_target_value,
      start_date: milestone.start_date,
      due_date: milestone.due_date,
      completed_date: milestone.completed_date,
      status: milestone.status || 'pending',
      progress_percentage: milestone.progress_percentage || 0,
      is_ai_generated: milestone.is_ai_generated || false,
      display_order: milestone.display_order || 0,
      priority: milestone.priority,
      created_at: milestone.created_at,
      updated_at: milestone.updated_at
    })),
    insights: insights || [],
    projections: {
      monthlyRequired: progressData.requiredMonthly,
      projectedFinalAmount: progressData.targetAmount,
      confidenceLevel: progressData.progressPercentage >= 80 ? 0.9 : 0.7
    },
    advisorMessages:goal.ai_advisor_messages
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" width="xwide" fullHeight={true}>
      <div className="flex flex-col min-h-0 flex-1">
        <GoalPresentationFlow
          goalData={goalData}
          isLoggedIn={true} // Assuming user is logged in if they can view goal details
          onComplete={onClose}
          onRegister={() => {}} // Not needed since user is already logged in
        />
      </div>
    </Modal>
  );
}