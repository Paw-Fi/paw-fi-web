-- AI Decision Reasoning System Migration
-- Migration: 20250128_ai_decision_reasoning_system.sql
-- Purpose: Add comprehensive transparency and reasoning tracking for all AI decisions

-- AI Decision Reasoning Table - Core transparency system
CREATE TABLE ai_decision_reasoning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('rebalance', 'allocation_change', 'risk_adjustment', 'goal_optimization', 'market_response', 'behavioral_intervention')),
  
  -- Core reasoning data
  primary_reasoning JSONB NOT NULL, -- Main factors driving the decision
  market_context JSONB NOT NULL, -- Market conditions at time of decision
  risk_assessment JSONB NOT NULL, -- Risk analysis and implications
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score BETWEEN 0.00 AND 1.00),
  
  -- Transparency features
  data_sources JSONB NOT NULL, -- All data sources used in decision
  alternative_options JSONB, -- Other options AI considered
  decision_tree JSONB, -- Step-by-step decision process
  
  -- Outcome tracking
  expected_outcomes JSONB NOT NULL, -- AI's projected results
  actual_outcomes JSONB, -- Real results (filled later)
  outcome_accuracy_score DECIMAL(3,2), -- How accurate were predictions
  
  -- User interaction
  user_feedback JSONB, -- User satisfaction and understanding
  explanation_requested TEXT CHECK (explanation_requested IN ('simple', 'detailed', 'technical')),
  user_understanding_confirmed BOOLEAN DEFAULT false,
  user_approved BOOLEAN DEFAULT false,
  
  -- Educational opportunity
  learning_opportunities JSONB, -- Educational content suggested
  concepts_explained JSONB, -- Financial concepts covered in explanation
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision Explanation Cache - For consistent explanations
CREATE TABLE decision_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reasoning_id UUID REFERENCES ai_decision_reasoning(id) ON DELETE CASCADE,
  explanation_type TEXT NOT NULL CHECK (explanation_type IN ('simple', 'detailed', 'technical')),
  explanation_content JSONB NOT NULL, -- The actual explanation
  visual_aids JSONB, -- Charts, diagrams, animations to include
  key_concepts JSONB, -- Important concepts to highlight
  user_questions_anticipated JSONB, -- Common questions users might ask
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision Impact Tracking - Monitor real-world effects
CREATE TABLE decision_impact_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reasoning_id UUID REFERENCES ai_decision_reasoning(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Performance impact
  portfolio_value_before DECIMAL(15,2),
  portfolio_value_after DECIMAL(15,2),
  return_impact DECIMAL(8,4), -- Actual return impact
  risk_impact DECIMAL(8,4), -- Change in portfolio risk
  
  -- User behavior impact
  user_confidence_change INTEGER CHECK (user_confidence_change BETWEEN -10 AND 10),
  engagement_change INTEGER CHECK (engagement_change BETWEEN -10 AND 10),
  learning_progress_change INTEGER CHECK (learning_progress_change BETWEEN -10 AND 10),
  
  -- Timeline tracking
  implementation_date DATE,
  measurement_period INTEGER DEFAULT 30, -- Days to measure impact
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_ai_decision_reasoning_user_id ON ai_decision_reasoning(user_id);
CREATE INDEX idx_ai_decision_reasoning_goal_id ON ai_decision_reasoning(goal_id);
CREATE INDEX idx_ai_decision_reasoning_decision_type ON ai_decision_reasoning(decision_type);
CREATE INDEX idx_ai_decision_reasoning_confidence ON ai_decision_reasoning(confidence_score DESC);
CREATE INDEX idx_ai_decision_reasoning_created_at ON ai_decision_reasoning(created_at DESC);
CREATE INDEX idx_decision_explanations_reasoning_id ON decision_explanations(reasoning_id);
CREATE INDEX idx_decision_impact_reasoning_id ON decision_impact_tracking(reasoning_id);

-- Enable Row Level Security
ALTER TABLE ai_decision_reasoning ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_impact_tracking ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
CREATE POLICY "Users can view their own decision reasoning" ON ai_decision_reasoning 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create decision reasoning" ON ai_decision_reasoning 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their feedback on decisions" ON ai_decision_reasoning 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view explanations for their decisions" ON decision_explanations 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ai_decision_reasoning WHERE id = decision_explanations.reasoning_id AND user_id = auth.uid())
  );

CREATE POLICY "System can create decision explanations" ON decision_explanations 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM ai_decision_reasoning WHERE id = decision_explanations.reasoning_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can view their decision impact data" ON decision_impact_tracking 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage decision impact tracking" ON decision_impact_tracking 
  FOR ALL USING (auth.uid() = user_id);

-- Helper function to create decision reasoning entry
CREATE OR REPLACE FUNCTION create_decision_reasoning(
  p_user_id UUID,
  p_goal_id UUID,
  p_decision_type TEXT,
  p_primary_reasoning JSONB,
  p_market_context JSONB,
  p_risk_assessment JSONB,
  p_confidence_score DECIMAL,
  p_data_sources JSONB,
  p_expected_outcomes JSONB,
  p_alternative_options JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reasoning_id UUID;
BEGIN
  INSERT INTO ai_decision_reasoning (
    user_id,
    goal_id,
    decision_type,
    primary_reasoning,
    market_context,
    risk_assessment,
    confidence_score,
    data_sources,
    expected_outcomes,
    alternative_options
  ) VALUES (
    p_user_id,
    p_goal_id,
    p_decision_type,
    p_primary_reasoning,
    p_market_context,
    p_risk_assessment,
    p_confidence_score,
    p_data_sources,
    p_expected_outcomes,
    p_alternative_options
  ) RETURNING id INTO reasoning_id;
  
  RETURN reasoning_id;
END;
$$;

-- Helper function to get decision reasoning with explanations
CREATE OR REPLACE FUNCTION get_decision_reasoning_with_explanations(
  p_user_id UUID,
  p_goal_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', dr.id,
      'decision_type', dr.decision_type,
      'primary_reasoning', dr.primary_reasoning,
      'market_context', dr.market_context,
      'risk_assessment', dr.risk_assessment,
      'confidence_score', dr.confidence_score,
      'data_sources', dr.data_sources,
      'alternative_options', dr.alternative_options,
      'expected_outcomes', dr.expected_outcomes,
      'actual_outcomes', dr.actual_outcomes,
      'user_feedback', dr.user_feedback,
      'explanations', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'type', de.explanation_type,
            'content', de.explanation_content,
            'visual_aids', de.visual_aids,
            'key_concepts', de.key_concepts
          )
        )
        FROM decision_explanations de
        WHERE de.reasoning_id = dr.id
      ),
      'created_at', dr.created_at
    )
  ) INTO result
  FROM ai_decision_reasoning dr
  WHERE dr.user_id = p_user_id
    AND (p_goal_id IS NULL OR dr.goal_id = p_goal_id)
  ORDER BY dr.created_at DESC
  LIMIT p_limit;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_decision_reasoning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_decision_reasoning_updated_at 
  BEFORE UPDATE ON ai_decision_reasoning
  FOR EACH ROW EXECUTE FUNCTION update_decision_reasoning_updated_at();

-- Grant necessary permissions
GRANT ALL ON ai_decision_reasoning TO authenticated;
GRANT ALL ON decision_explanations TO authenticated;
GRANT ALL ON decision_impact_tracking TO authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_decision_reasoning IS 'Comprehensive tracking of all AI investment decisions with full transparency and reasoning';
COMMENT ON TABLE decision_explanations IS 'Multi-level explanations for AI decisions (simple, detailed, technical)';
COMMENT ON TABLE decision_impact_tracking IS 'Real-world impact measurement of AI decisions';

COMMENT ON COLUMN ai_decision_reasoning.primary_reasoning IS 'Main factors and logic behind the AI decision';
COMMENT ON COLUMN ai_decision_reasoning.market_context IS 'Market conditions and external factors considered';
COMMENT ON COLUMN ai_decision_reasoning.risk_assessment IS 'Risk analysis and implications of the decision';
COMMENT ON COLUMN ai_decision_reasoning.confidence_score IS 'AI confidence level in the decision (0.00-1.00)';
COMMENT ON COLUMN ai_decision_reasoning.data_sources IS 'All data sources used in the decision-making process';
COMMENT ON COLUMN ai_decision_reasoning.alternative_options IS 'Other options the AI considered but did not choose';

COMMENT ON FUNCTION create_decision_reasoning IS 'Helper function to create new decision reasoning entries with validation';
COMMENT ON FUNCTION get_decision_reasoning_with_explanations IS 'Retrieve decision reasoning with all associated explanations';