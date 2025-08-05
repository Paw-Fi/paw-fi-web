export const roles={
    "FINANCIAL_ADVISOR": "financial_advisor",
    "FINANCIAL_EDUCATOR": "financial_educator",
    "GOAL_TRACKER": "goal_tracker"
}
export type AI_ROLE = 'financial_advisor' | 'financial_educator' | 'goal_tracker';
export type AI_ROLE_KEY = keyof typeof roles;

export const AI_ROLES: Record<AI_ROLE_KEY, AI_ROLE> = Object.freeze(roles as Record<AI_ROLE_KEY, AI_ROLE>);