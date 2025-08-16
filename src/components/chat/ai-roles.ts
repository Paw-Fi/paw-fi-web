import {roles} from "../../../supabase/functions/shared/ai-roles/ai-roles";
export type AI_ROLE = 'financial_advisor' | 'financial_educator' | 'goal_tracker';
export type AI_ROLE_KEY = keyof typeof roles;

export const AI_ROLES: Record<AI_ROLE_KEY, AI_ROLE> = Object.freeze(roles as Record<AI_ROLE_KEY, AI_ROLE>);