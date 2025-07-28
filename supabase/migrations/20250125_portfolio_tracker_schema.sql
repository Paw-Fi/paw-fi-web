-- AI-Powered Goal-Based Portfolio Tracker: Complete Database Schema
-- Migration: 20250125_portfolio_tracker_schema.sql

-- Financial Goals Table
CREATE TABLE financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('retirement', 'home_purchase', 'education', 'wealth_building', 'emergency_fund', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(15,2) NOT NULL,
  target_date DATE NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  monthly_contribution DECIMAL(10,2) DEFAULT 0,
  risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  ai_assessment JSONB, -- Store AI analysis results
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Portfolio Recommendations
CREATE TABLE ai_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  allocation JSONB NOT NULL, -- {"stocks": 65, "bonds": 25, "alternatives": 10}
  recommended_holdings JSONB NOT NULL, -- Detailed investment recommendations with reasoning
  risk_score DECIMAL(3,2), -- 0.00 to 1.00
  expected_return DECIMAL(5,2), -- Expected annual return percentage
  confidence_score DECIMAL(3,2), -- AI confidence in recommendations
  scenario_analysis JSONB, -- Best/expected/worst case projections
  rebalancing_triggers JSONB, -- When to suggest rebalancing
  ai_reasoning TEXT, -- AI explanation of portfolio choices
  version INTEGER DEFAULT 1, -- Track portfolio versions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Coaching Sessions & Insights
CREATE TABLE ai_coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('weekly_checkin', 'goal_assessment', 'market_update', 'behavioral_insight', 'crisis_support', 'milestone_celebration')),
  ai_insights JSONB NOT NULL, -- AI-generated insights and recommendations
  user_responses JSONB, -- User feedback and actions taken
  engagement_score INTEGER CHECK (engagement_score BETWEEN 1 AND 10),
  recommended_actions JSONB, -- Specific actions suggested by AI
  completed_actions JSONB, -- Actions user completed
  coaching_personality TEXT DEFAULT 'friend' CHECK (coaching_personality IN ('cheerleader', 'professor', 'friend', 'coach')),
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  email_opened BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Investment Preferences & Behavior
CREATE TABLE user_investment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  age INTEGER,
  income_range TEXT CHECK (income_range IN ('under_30k', '30k_50k', '50k_75k', '75k_100k', '100k_150k', '150k_250k', 'over_250k')),
  investment_experience TEXT CHECK (investment_experience IN ('beginner', 'intermediate', 'advanced')),
  risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  investment_timeline INTEGER, -- Years
  esg_preferences BOOLEAN DEFAULT false,
  tax_situation JSONB, -- Tax bracket, account types, etc.
  behavioral_preferences JSONB, -- Communication style, frequency, etc.
  life_events JSONB, -- Major life events that affect planning
  onboarding_completed BOOLEAN DEFAULT false,
  coaching_enabled BOOLEAN DEFAULT true,
  preferred_coaching_personality TEXT DEFAULT 'friend',
  profile_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio Performance Tracking
CREATE TABLE portfolio_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  portfolio_value DECIMAL(15,2) NOT NULL,
  daily_return DECIMAL(8,4), -- Daily return percentage
  contributions DECIMAL(10,2) DEFAULT 0,
  withdrawals DECIMAL(10,2) DEFAULT 0,
  rebalancing_actions JSONB, -- Any rebalancing performed
  market_conditions JSONB, -- Market context for the day
  ai_commentary TEXT, -- AI analysis of performance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, date)
);

-- Goal Progress Milestones
CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('percentage', 'amount', 'time_based', 'contribution_streak')),
  target_value DECIMAL(15,2) NOT NULL,
  current_value DECIMAL(15,2) DEFAULT 0,
  achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMPTZ,
  celebration_sent BOOLEAN DEFAULT false,
  ai_message TEXT, -- Personalized celebration message
  badge_earned TEXT, -- Achievement badge ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Conversation History (Premium Feature)
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL, -- Group related messages
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  context JSONB, -- Additional context for AI responses
  tokens_used INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Goal Preferences and Settings
CREATE TABLE goal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  notification_frequency TEXT DEFAULT 'weekly' CHECK (notification_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'disabled')),
  auto_rebalancing BOOLEAN DEFAULT false,
  tax_optimization BOOLEAN DEFAULT true,
  performance_tracking BOOLEAN DEFAULT true,
  ai_insights_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id)
);

-- Market Data Cache (for AI analysis)
CREATE TABLE market_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL, -- 'stock_price', 'market_index', 'economic_indicator'
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  data JSONB NOT NULL,
  source TEXT, -- Data provider
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data_type, symbol, date)
);

-- Create indexes for performance
CREATE INDEX idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX idx_financial_goals_status ON financial_goals(status);
CREATE INDEX idx_ai_portfolios_goal_id ON ai_portfolios(goal_id);
CREATE INDEX idx_ai_portfolios_user_id ON ai_portfolios(user_id);
CREATE INDEX idx_ai_portfolios_active ON ai_portfolios(is_active) WHERE is_active = true;
CREATE INDEX idx_coaching_sessions_user_id ON ai_coaching_sessions(user_id);
CREATE INDEX idx_coaching_sessions_scheduled ON ai_coaching_sessions(scheduled_for);
CREATE INDEX idx_portfolio_performance_goal_date ON portfolio_performance(goal_id, date);
CREATE INDEX idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX idx_ai_conversations_user_goal ON ai_conversations(user_id, goal_id);
CREATE INDEX idx_market_data_symbol_date ON market_data_cache(symbol, date);

-- Enable Row Level Security on all tables
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_investment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Financial Goals Policies
CREATE POLICY "Users can manage their own goals" ON financial_goals 
  FOR ALL USING (auth.uid() = user_id);

-- AI Portfolios Policies  
CREATE POLICY "Users can view their portfolios" ON ai_portfolios 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create portfolios" ON ai_portfolios 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update portfolios" ON ai_portfolios 
  FOR UPDATE USING (auth.uid() = user_id);

-- AI Coaching Sessions Policies
CREATE POLICY "Users can access their coaching sessions" ON ai_coaching_sessions 
  FOR ALL USING (auth.uid() = user_id);

-- User Investment Profiles Policies
CREATE POLICY "Users can manage their investment profile" ON user_investment_profiles 
  FOR ALL USING (auth.uid() = user_id);

-- Portfolio Performance Policies
CREATE POLICY "Users can view their performance data" ON portfolio_performance 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert performance data" ON portfolio_performance 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Goal Milestones Policies
CREATE POLICY "Users can view their milestones" ON goal_milestones 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM financial_goals WHERE id = goal_milestones.goal_id AND user_id = auth.uid())
  );
CREATE POLICY "System can manage milestones" ON goal_milestones 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM financial_goals WHERE id = goal_milestones.goal_id AND user_id = auth.uid())
  );

-- AI Conversations Policies (Premium feature)
CREATE POLICY "Users can manage their conversations" ON ai_conversations 
  FOR ALL USING (auth.uid() = user_id);

-- Goal Preferences Policies
CREATE POLICY "Users can manage their goal preferences" ON goal_preferences 
  FOR ALL USING (auth.uid() = user_id);

-- Market Data Cache Policies (Public read for system use)
CREATE POLICY "Public read access to market data" ON market_data_cache 
  FOR SELECT USING (true);
CREATE POLICY "Service role can manage market data" ON market_data_cache 
  FOR ALL USING (auth.role() = 'service_role');

-- Database Functions

-- Function to get user coaching context
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

-- Function to calculate goal progress
CREATE OR REPLACE FUNCTION calculate_goal_progress(goal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  goal_record financial_goals%ROWTYPE;
  progress_data JSONB;
  days_remaining INTEGER;
  required_monthly_savings DECIMAL(10,2);
  current_pace DECIMAL(10,2);
BEGIN
  SELECT * INTO goal_record FROM financial_goals WHERE id = goal_id;
  
  IF goal_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Goal not found');
  END IF;
  
  -- Calculate days remaining
  days_remaining := goal_record.target_date - CURRENT_DATE;
  
  -- Calculate required monthly savings
  IF days_remaining > 0 THEN
    required_monthly_savings := (goal_record.target_amount - goal_record.current_amount) / (days_remaining / 30.0);
  ELSE
    required_monthly_savings := 0;
  END IF;
  
  -- Calculate current pace (based on recent contributions)
  SELECT COALESCE(AVG(contributions), 0) INTO current_pace
  FROM portfolio_performance
  WHERE goal_id = calculate_goal_progress.goal_id
  AND date >= CURRENT_DATE - INTERVAL '30 days'
  AND contributions > 0;
  
  progress_data := jsonb_build_object(
    'goal_id', goal_id,
    'progress_percentage', ROUND((goal_record.current_amount / goal_record.target_amount) * 100, 2),
    'amount_remaining', goal_record.target_amount - goal_record.current_amount,
    'days_remaining', days_remaining,
    'required_monthly_savings', required_monthly_savings,
    'current_monthly_pace', current_pace,
    'pace_difference', current_pace - required_monthly_savings,
    'on_track', current_pace >= required_monthly_savings,
    'estimated_completion', 
      CASE 
        WHEN current_pace > 0 THEN 
          CURRENT_DATE + ((goal_record.target_amount - goal_record.current_amount) / current_pace * 30)::INTEGER
        ELSE NULL
      END
  );
  
  RETURN progress_data;
END;
$$;

-- Function to update goal current amount
CREATE OR REPLACE FUNCTION update_goal_amount(goal_id UUID, new_amount DECIMAL(15,2))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE financial_goals 
  SET 
    current_amount = new_amount,
    updated_at = NOW()
  WHERE id = goal_id AND user_id = auth.uid();
  
  -- Check for milestone achievements
  INSERT INTO goal_milestones (goal_id, milestone_type, target_value, current_value, achieved, achieved_at)
  SELECT 
    goal_id,
    'percentage',
    milestone_percentage,
    new_amount,
    true,
    NOW()
  FROM (
    SELECT unnest(ARRAY[25, 50, 75, 90]) AS milestone_percentage
  ) milestones
  WHERE (new_amount / (SELECT target_amount FROM financial_goals WHERE id = goal_id)) * 100 >= milestone_percentage
  AND NOT EXISTS (
    SELECT 1 FROM goal_milestones gm 
    WHERE gm.goal_id = update_goal_amount.goal_id 
    AND gm.milestone_type = 'percentage' 
    AND gm.target_value = milestone_percentage
    AND gm.achieved = true
  );
  
  RETURN TRUE;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_goals_updated_at BEFORE UPDATE ON financial_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_investment_profiles_updated_at BEFORE UPDATE ON user_investment_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_preferences_updated_at BEFORE UPDATE ON goal_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE financial_goals IS 'User financial goals with AI assessment data';
COMMENT ON TABLE ai_portfolios IS 'AI-generated portfolio recommendations for each goal';
COMMENT ON TABLE ai_coaching_sessions IS 'AI coaching interactions and insights';
COMMENT ON TABLE user_investment_profiles IS 'User investment preferences and behavioral data';
COMMENT ON TABLE portfolio_performance IS 'Daily portfolio performance tracking';
COMMENT ON TABLE goal_milestones IS 'Achievement milestones for goals';
COMMENT ON TABLE ai_conversations IS 'Premium AI conversation history';
COMMENT ON TABLE goal_preferences IS 'User preferences for goal management';
COMMENT ON TABLE market_data_cache IS 'Cached market data for AI analysis';

COMMENT ON FUNCTION get_user_coaching_context IS 'Retrieves comprehensive user context for AI coaching';
COMMENT ON FUNCTION calculate_goal_progress IS 'Calculates detailed progress metrics for a goal';
COMMENT ON FUNCTION update_goal_amount IS 'Updates goal amount and checks for milestone achievements';