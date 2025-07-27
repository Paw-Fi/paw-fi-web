-- AI Interaction Tracking: Track user actions from AI recommendations and check-ins
-- Migration: 20250126_ai_interaction_tracking.sql

-- Track user responses to AI recommendations
CREATE TABLE ai_recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coaching_session_id UUID REFERENCES ai_coaching_sessions(id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('clicked', 'completed', 'dismissed')),
  action_data JSONB, -- Additional context about the action (destination, category, etc.)
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track quick check-in responses  
CREATE TABLE coaching_check_in_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coaching_session_id UUID REFERENCES ai_coaching_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('yes', 'no', 'tell_me_more')),
  follow_up_action TEXT, -- What happened after the response
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_ai_recommendation_actions_user_id ON ai_recommendation_actions(user_id);
CREATE INDEX idx_ai_recommendation_actions_session_id ON ai_recommendation_actions(coaching_session_id);
CREATE INDEX idx_ai_recommendation_actions_type ON ai_recommendation_actions(action_type);
CREATE INDEX idx_coaching_check_in_responses_user_id ON coaching_check_in_responses(user_id);
CREATE INDEX idx_coaching_check_in_responses_session_id ON coaching_check_in_responses(coaching_session_id);
CREATE INDEX idx_coaching_check_in_responses_type ON coaching_check_in_responses(response_type);

-- Enable Row Level Security
ALTER TABLE ai_recommendation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_check_in_responses ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
CREATE POLICY "Users can manage their own recommendation actions" ON ai_recommendation_actions 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own check-in responses" ON coaching_check_in_responses 
  FOR ALL USING (auth.uid() = user_id);

-- Function to get AI recommendation analytics
CREATE OR REPLACE FUNCTION get_ai_recommendation_analytics(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analytics JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_recommendations_received', (
      SELECT COUNT(*)
      FROM ai_coaching_sessions acs
      WHERE acs.user_id = target_user_id
      AND jsonb_array_length(acs.ai_insights->'recommendations') > 0
    ),
    'total_actions_taken', (
      SELECT COUNT(*)
      FROM ai_recommendation_actions ara
      WHERE ara.user_id = target_user_id
      AND ara.action_type = 'clicked'
    ),
    'completion_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE ara.action_type = 'completed'))::decimal / 
        NULLIF(COUNT(*) FILTER (WHERE ara.action_type = 'clicked'), 0) * 100, 2
      )
      FROM ai_recommendation_actions ara
      WHERE ara.user_id = target_user_id
    ),
    'top_categories', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'category', action_data->>'category',
          'count', category_count
        )
      )
      FROM (
        SELECT 
          action_data->>'category' as category,
          COUNT(*) as category_count
        FROM ai_recommendation_actions
        WHERE user_id = target_user_id
        AND action_type = 'clicked'
        AND action_data->>'category' IS NOT NULL
        GROUP BY action_data->>'category'
        ORDER BY category_count DESC
        LIMIT 5
      ) category_stats
    ),
    'engagement_trends', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'week', week_date,
          'actions', action_count,
          'check_ins', checkin_count
        )
      )
      FROM (
        SELECT 
          date_trunc('week', ara.created_at) as week_date,
          COUNT(ara.id) as action_count,
          COUNT(ccr.id) as checkin_count
        FROM ai_recommendation_actions ara
        FULL OUTER JOIN coaching_check_in_responses ccr 
          ON ccr.user_id = ara.user_id 
          AND date_trunc('week', ccr.created_at) = date_trunc('week', ara.created_at)
        WHERE (ara.user_id = target_user_id OR ccr.user_id = target_user_id)
        AND (ara.created_at >= CURRENT_DATE - INTERVAL '12 weeks' 
             OR ccr.created_at >= CURRENT_DATE - INTERVAL '12 weeks')
        GROUP BY week_date
        ORDER BY week_date DESC
        LIMIT 12
      ) weekly_stats
    )
  ) INTO analytics;
  
  RETURN analytics;
END;
$$;

-- Function to get coaching engagement score
CREATE OR REPLACE FUNCTION calculate_coaching_engagement_score(target_user_id UUID)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  engagement_score DECIMAL(3,2) := 0.0;
  action_count INTEGER;
  checkin_count INTEGER;
  session_count INTEGER;
  completion_rate DECIMAL(3,2);
BEGIN
  -- Get action counts from last 30 days
  SELECT COUNT(*) INTO action_count
  FROM ai_recommendation_actions
  WHERE user_id = target_user_id
  AND action_type = 'clicked'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Get check-in responses from last 30 days
  SELECT COUNT(*) INTO checkin_count
  FROM coaching_check_in_responses
  WHERE user_id = target_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Get coaching sessions from last 30 days
  SELECT COUNT(*) INTO session_count
  FROM ai_coaching_sessions
  WHERE user_id = target_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Calculate completion rate
  SELECT 
    COALESCE(
      (COUNT(*) FILTER (WHERE action_type = 'completed'))::decimal / 
      NULLIF(COUNT(*) FILTER (WHERE action_type = 'clicked'), 0),
      0
    ) INTO completion_rate
  FROM ai_recommendation_actions
  WHERE user_id = target_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Calculate engagement score (0.0 to 1.0)
  engagement_score := (
    (LEAST(action_count, 10) * 0.3) / 10 +  -- 30% weight for actions (cap at 10)
    (LEAST(checkin_count, 20) * 0.2) / 20 + -- 20% weight for check-ins (cap at 20)
    (LEAST(session_count, 8) * 0.2) / 8 +   -- 20% weight for sessions (cap at 8)
    (completion_rate * 0.3)                  -- 30% weight for completion rate
  );
  
  RETURN GREATEST(0.0, LEAST(1.0, engagement_score));
END;
$$;

-- Trigger to update engagement score in ai_coaching_sessions when actions are recorded
CREATE OR REPLACE FUNCTION update_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the latest coaching session with new engagement score
  UPDATE ai_coaching_sessions 
  SET engagement_score = (
    SELECT ROUND(calculate_coaching_engagement_score(NEW.user_id) * 10)::INTEGER
  )
  WHERE user_id = NEW.user_id
  AND id = (
    SELECT id 
    FROM ai_coaching_sessions 
    WHERE user_id = NEW.user_id 
    ORDER BY created_at DESC 
    LIMIT 1
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_engagement_on_action
  AFTER INSERT ON ai_recommendation_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_score();

CREATE TRIGGER update_engagement_on_checkin
  AFTER INSERT ON coaching_check_in_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_score();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ai_recommendation_actions TO authenticated;
GRANT ALL ON coaching_check_in_responses TO authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_recommendation_actions IS 'Tracks user interactions with AI recommendations';
COMMENT ON TABLE coaching_check_in_responses IS 'Tracks user responses to quick check-in questions';
COMMENT ON FUNCTION get_ai_recommendation_analytics IS 'Returns comprehensive analytics for AI recommendation engagement';
COMMENT ON FUNCTION calculate_coaching_engagement_score IS 'Calculates a 0-1 engagement score based on user interactions';

-- Create a view for easy access to recommendation analytics
CREATE VIEW ai_coaching_analytics AS
SELECT 
  u.id as user_id,
  u.email,
  calculate_coaching_engagement_score(u.id) as engagement_score,
  get_ai_recommendation_analytics(u.id) as analytics,
  (
    SELECT COUNT(*)
    FROM ai_coaching_sessions acs
    WHERE acs.user_id = u.id
    AND acs.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ) as sessions_last_30_days,
  (
    SELECT COUNT(*)
    FROM ai_recommendation_actions ara
    WHERE ara.user_id = u.id
    AND ara.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ) as actions_last_30_days
FROM auth.users u
WHERE EXISTS (
  SELECT 1 FROM ai_coaching_sessions acs 
  WHERE acs.user_id = u.id
);

COMMENT ON VIEW ai_coaching_analytics IS 'Aggregated view of AI coaching engagement metrics by user';