import {actions}  from "../../supabase/functions/shared/update-reward-actions/reward-actions";
export const RewardActions = Object.freeze(actions)
export type Action = "ask_for_new_lesson" | "completed_lesson" | "completed_qotd"
