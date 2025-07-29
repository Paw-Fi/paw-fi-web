import {actions}  from "../../supabase/functions/shared/update-reward-actions/reward-actions";
export const RewardActions = Object.freeze(actions)
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
