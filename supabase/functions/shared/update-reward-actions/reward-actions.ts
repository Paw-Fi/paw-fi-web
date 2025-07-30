export type Action =
  | 'ask_for_new_lesson'
  | 'completed_lesson'
  | 'completed_qotd'
  | 'goal_created'
  | 'goal_progress_updated'
  | 'goal_completed'
  | 'milestone_completed'
  | 'goal_timeline_updated'
  | 'goal_timeline_extended'
  | 'goal_target_adjusted';

export const actions: Record<string, Action> = {
  ASK_FOR_NEW_LESSON: 'ask_for_new_lesson',
  COMPLETED_LESSON: 'completed_lesson',
  COMPLETED_QOTD: 'completed_qotd',
  GOAL_CREATED: 'goal_created',
  GOAL_PROGRESS_UPDATED: 'goal_progress_updated',
  GOAL_COMPLETED: 'goal_completed',
  MILESTONE_COMPLETED: 'milestone_completed',
  GOAL_TIMELINE_UPDATED: 'goal_timeline_updated',
  GOAL_TIMELINE_EXTENDED: 'goal_timeline_extended',
  GOAL_TARGET_ADJUSTED: 'goal_target_adjusted',
};
export const RewardActions = Object.freeze(actions)