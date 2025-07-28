-- Fix ambiguous goal_id column reference in get_user_coaching_context function
-- Migration: 20250126_fix_ambiguous_goal_id.sql

CREATE OR REPLACE FUNCTION get_user_coaching_context(user_id UUID, goal_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  context JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user_profile', (
      SELECT jsonb_build_object(
        'age', age,
        'income_range', income_range,
        'investment_experience', investment_experience,
        'risk_tolerance', risk_tolerance,
        'behavioral_preferences', behavioral_preferences,
        'preferred_coaching_personality', preferred_coaching_personality
      )
      FROM user_investment_profiles 
      WHERE user_investment_profiles.user_id = get_user_coaching_context.user_id
    ),
    'goals', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'goal_type', goal_type,
          'title', title,
          'target_amount', target_amount,
          'current_amount', current_amount,
          'target_date', target_date,
          'progress_percentage', ROUND((current_amount / target_amount) * 100, 2)
        )
      )
      FROM financial_goals 
      WHERE financial_goals.user_id = get_user_coaching_context.user_id
      AND (get_user_coaching_context.goal_id IS NULL OR financial_goals.id = get_user_coaching_context.goal_id)
      AND status = 'active'
    ),
    'recent_performance', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date,
          'portfolio_value', portfolio_value,
          'daily_return', daily_return,
          'contributions', contributions
        )
      )
      FROM portfolio_performance
      WHERE portfolio_performance.user_id = get_user_coaching_context.user_id
      AND (get_user_coaching_context.goal_id IS NULL OR portfolio_performance.goal_id = get_user_coaching_context.goal_id)
      AND date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date DESC
      LIMIT 10
    ),
    'recent_sessions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'session_type', session_type,
          'ai_insights', ai_insights,
          'engagement_score', engagement_score,
          'completed_actions', completed_actions,
          'created_at', created_at
        )
      )
      FROM ai_coaching_sessions
      WHERE ai_coaching_sessions.user_id = get_user_coaching_context.user_id
      AND (get_user_coaching_context.goal_id IS NULL OR ai_coaching_sessions.goal_id = get_user_coaching_context.goal_id)
      ORDER BY created_at DESC
      LIMIT 5
    )
  ) INTO context;
  
  RETURN context;
END;
$$;

COMMENT ON FUNCTION get_user_coaching_context IS 'Retrieves comprehensive user context for AI coaching (fixed ambiguous goal_id references)';