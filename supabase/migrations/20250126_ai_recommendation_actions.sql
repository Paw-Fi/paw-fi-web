-- AI Recommendation Actions Tracking Table
-- Migration: 20250126_ai_recommendation_actions.sql

-- AI Recommendation Actions Table
CREATE TABLE ai_recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL, -- ID of the recommendation that was acted upon
  action_type TEXT NOT NULL CHECK (action_type IN ('clicked', 'dismissed', 'applied', 'viewed')),
  action_data JSONB DEFAULT '{}', -- Additional action metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_ai_recommendation_actions_user_id ON ai_recommendation_actions(user_id);
CREATE INDEX idx_ai_recommendation_actions_recommendation_id ON ai_recommendation_actions(recommendation_id);
CREATE INDEX idx_ai_recommendation_actions_action_type ON ai_recommendation_actions(action_type);
CREATE INDEX idx_ai_recommendation_actions_created_at ON ai_recommendation_actions(created_at);

-- Enable Row Level Security
ALTER TABLE ai_recommendation_actions ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
CREATE POLICY "Users can manage their own recommendation actions" ON ai_recommendation_actions 
  FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON ai_recommendation_actions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_recommendation_actions IS 'Track user interactions with AI portfolio recommendations';
COMMENT ON COLUMN ai_recommendation_actions.recommendation_id IS 'Generated recommendation ID (not a foreign key since recommendations are ephemeral)';
COMMENT ON COLUMN ai_recommendation_actions.action_type IS 'Type of action: clicked, dismissed, applied, viewed';
COMMENT ON COLUMN ai_recommendation_actions.action_data IS 'Additional metadata like timestamps, context, etc.';