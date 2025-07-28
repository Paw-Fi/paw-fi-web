-- Proactive Support System Migration  
-- Migration: 20250128_proactive_support_system.sql
-- Purpose: Enable 24/7 AI monitoring and proactive user assistance

-- Proactive Interventions - Core support system
CREATE TABLE proactive_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  
  -- Intervention classification
  intervention_type TEXT NOT NULL CHECK (intervention_type IN ('educational', 'risk_alert', 'opportunity', 'behavioral_coaching', 'crisis_support', 'maintenance', 'celebration')),
  priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent', 'critical')),
  urgency_score INTEGER DEFAULT 5 CHECK (urgency_score BETWEEN 1 AND 10),
  
  -- Trigger analysis
  trigger_conditions JSONB NOT NULL, -- What conditions caused this intervention
  trigger_data JSONB NOT NULL, -- Specific data that triggered the alert
  trigger_timestamp TIMESTAMPTZ DEFAULT NOW(),
  detection_method TEXT CHECK (detection_method IN ('automated_monitoring', 'market_event', 'user_behavior', 'scheduled_check', 'goal_progress', 'external_data')),
  
  -- Intervention content
  intervention_content JSONB NOT NULL, -- The actual guidance/alert content
  recommended_actions JSONB DEFAULT '[]', -- Specific actions user should take
  educational_resources JSONB DEFAULT '[]', -- Related learning materials
  conversation_starters JSONB DEFAULT '[]', -- Questions to help user engage
  
  -- Delivery and communication
  delivery_method TEXT DEFAULT 'in_app' CHECK (delivery_method IN ('in_app', 'email', 'push', 'sms', 'phone_call')),
  communication_tone TEXT DEFAULT 'supportive' CHECK (communication_tone IN ('urgent', 'supportive', 'informative', 'celebratory', 'cautionary')),
  personalization_level TEXT DEFAULT 'personalized' CHECK (personalization_level IN ('generic', 'personalized', 'highly_personalized')),
  
  -- Timing and scheduling
  scheduled_delivery TIMESTAMPTZ, -- When to deliver this intervention
  delivery_window_start TIME, -- Earliest time to deliver
  delivery_window_end TIME, -- Latest time to deliver
  time_zone TEXT DEFAULT 'UTC',
  
  -- User interaction tracking
  delivered_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  user_response JSONB, -- How user reacted/responded
  action_taken BOOLEAN DEFAULT false,
  user_satisfaction_score INTEGER CHECK (user_satisfaction_score BETWEEN 1 AND 10),
  
  -- Effectiveness measurement
  effectiveness_score INTEGER CHECK (effectiveness_score BETWEEN 1 AND 10),
  outcome_achieved BOOLEAN DEFAULT false,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_scheduled TIMESTAMPTZ,
  
  -- System metadata
  ai_confidence_score DECIMAL(3,2) CHECK (ai_confidence_score BETWEEN 0.00 AND 1.00),
  intervention_version INTEGER DEFAULT 1, -- For A/B testing different approaches
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Monitoring Settings - What to monitor for each user
CREATE TABLE user_monitoring_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Monitoring preferences
  monitoring_enabled BOOLEAN DEFAULT true,
  monitoring_sensitivity TEXT DEFAULT 'medium' CHECK (monitoring_sensitivity IN ('low', 'medium', 'high', 'custom')),
  
  -- Alert preferences
  risk_alerts_enabled BOOLEAN DEFAULT true,
  opportunity_alerts_enabled BOOLEAN DEFAULT true,
  educational_prompts_enabled BOOLEAN DEFAULT true,
  market_update_alerts BOOLEAN DEFAULT true,
  goal_progress_alerts BOOLEAN DEFAULT true,
  behavioral_coaching_enabled BOOLEAN DEFAULT true,
  
  -- Delivery preferences
  preferred_delivery_methods JSONB DEFAULT '["in_app"]', -- Array of preferred methods
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  time_zone TEXT DEFAULT 'UTC',
  max_daily_alerts INTEGER DEFAULT 5,
  
  -- Thresholds for alerts
  portfolio_change_threshold DECIMAL(5,2) DEFAULT 5.00, -- % change to trigger alert
  risk_level_change_threshold DECIMAL(3,2) DEFAULT 0.15, -- Risk change to trigger alert
  goal_progress_alert_frequency TEXT DEFAULT 'weekly' CHECK (goal_progress_alert_frequency IN ('daily', 'weekly', 'monthly')),
  
  -- Crisis support settings
  crisis_support_enabled BOOLEAN DEFAULT true,
  emergency_contact_info JSONB, -- Emergency contact information
  crisis_intervention_threshold DECIMAL(5,2) DEFAULT 15.00, -- Portfolio loss % to trigger crisis support
  
  -- Behavioral monitoring
  engagement_monitoring BOOLEAN DEFAULT true,
  inactivity_alert_days INTEGER DEFAULT 14, -- Days of inactivity before alert
  unusual_behavior_detection BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Monitoring Rules - Define what conditions trigger interventions
CREATE TABLE monitoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT UNIQUE NOT NULL,
  rule_description TEXT NOT NULL,
  rule_category TEXT NOT NULL CHECK (rule_category IN ('portfolio_health', 'goal_progress', 'risk_management', 'market_events', 'user_behavior', 'crisis_detection')),
  
  -- Rule logic
  trigger_conditions JSONB NOT NULL, -- Conditions that must be met
  evaluation_query TEXT NOT NULL, -- SQL query to evaluate rule
  evaluation_frequency TEXT DEFAULT 'hourly' CHECK (evaluation_frequency IN ('continuous', 'every_15min', 'hourly', 'daily', 'weekly')),
  
  -- Rule parameters
  severity_score INTEGER DEFAULT 5 CHECK (severity_score BETWEEN 1 AND 10),
  default_intervention_type TEXT NOT NULL,
  default_priority_level TEXT DEFAULT 'medium',
  
  -- Rule effectiveness
  rule_effectiveness_score DECIMAL(3,2) DEFAULT 0.50,
  total_triggers INTEGER DEFAULT 0,
  successful_interventions INTEGER DEFAULT 0,
  false_positive_rate DECIMAL(3,2) DEFAULT 0.00,
  
  -- Rule management
  is_active BOOLEAN DEFAULT true,
  applies_to_user_segments JSONB DEFAULT '["all"]', -- Which user segments this rule applies to
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intervention Templates - Reusable intervention content
CREATE TABLE intervention_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT UNIQUE NOT NULL,
  intervention_type TEXT NOT NULL,
  priority_level TEXT NOT NULL,
  
  -- Template content
  title_template TEXT NOT NULL, -- Can include variables like {{user_name}}
  content_template JSONB NOT NULL, -- Template for intervention content
  recommended_actions_template JSONB DEFAULT '[]',
  
  -- Personalization
  personalization_variables JSONB DEFAULT '[]', -- Variables that can be substituted
  tone_variants JSONB DEFAULT '{}', -- Different tones for different user types
  complexity_levels JSONB DEFAULT '{}', -- Different complexity levels
  
  -- Template effectiveness
  usage_count INTEGER DEFAULT 0,
  effectiveness_score DECIMAL(3,2) DEFAULT 0.00,
  user_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
  
  -- Template management
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crisis Support Sessions - Special tracking for crisis interventions
CREATE TABLE crisis_support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  intervention_id UUID REFERENCES proactive_interventions(id) ON DELETE CASCADE,
  
  -- Crisis details
  crisis_type TEXT NOT NULL CHECK (crisis_type IN ('market_crash', 'portfolio_loss', 'emotional_distress', 'panic_selling', 'major_life_event', 'financial_emergency')),
  crisis_severity INTEGER CHECK (crisis_severity BETWEEN 1 AND 10),
  trigger_event JSONB NOT NULL, -- What caused the crisis
  
  -- User state assessment
  emotional_state TEXT CHECK (emotional_state IN ('calm', 'concerned', 'worried', 'panicked', 'distressed')),
  risk_of_poor_decisions INTEGER CHECK (risk_of_poor_decisions BETWEEN 1 AND 10),
  needs_human_intervention BOOLEAN DEFAULT false,
  
  -- Support provided
  ai_support_actions JSONB DEFAULT '[]', -- Actions taken by AI
  human_support_requested BOOLEAN DEFAULT false,
  human_support_provided BOOLEAN DEFAULT false,
  escalation_timestamp TIMESTAMPTZ,
  
  -- Session outcomes
  crisis_resolved BOOLEAN DEFAULT false,
  user_stabilized BOOLEAN DEFAULT false,
  poor_decisions_prevented BOOLEAN DEFAULT false,
  follow_up_scheduled BOOLEAN DEFAULT false,
  
  -- Session data
  duration_minutes INTEGER,
  interactions_count INTEGER DEFAULT 0,
  resources_provided JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_proactive_interventions_user_id ON proactive_interventions(user_id);
CREATE INDEX idx_proactive_interventions_goal_id ON proactive_interventions(goal_id);
CREATE INDEX idx_proactive_interventions_type_priority ON proactive_interventions(intervention_type, priority_level);
CREATE INDEX idx_proactive_interventions_scheduled ON proactive_interventions(scheduled_delivery) WHERE scheduled_delivery IS NOT NULL;
CREATE INDEX idx_proactive_interventions_delivered ON proactive_interventions(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX idx_user_monitoring_settings_user_id ON user_monitoring_settings(user_id);
CREATE INDEX idx_monitoring_rules_category_active ON monitoring_rules(rule_category, is_active);
CREATE INDEX idx_crisis_support_sessions_user_id ON crisis_support_sessions(user_id);
CREATE INDEX idx_crisis_support_sessions_crisis_type ON crisis_support_sessions(crisis_type);

-- Enable Row Level Security
ALTER TABLE proactive_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_support_sessions ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
CREATE POLICY "Users can view their own interventions" ON proactive_interventions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create interventions for users" ON proactive_interventions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their intervention responses" ON proactive_interventions 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their monitoring settings" ON user_monitoring_settings 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "System can read monitoring rules" ON monitoring_rules 
  FOR SELECT USING (is_active = true);

CREATE POLICY "System can read intervention templates" ON intervention_templates 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their crisis support sessions" ON crisis_support_sessions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage crisis support sessions" ON crisis_support_sessions 
  FOR ALL USING (auth.uid() = user_id);

-- Helper function to create proactive intervention
CREATE OR REPLACE FUNCTION create_proactive_intervention(
  p_user_id UUID,
  p_goal_id UUID,
  p_intervention_type TEXT,
  p_priority_level TEXT,
  p_trigger_conditions JSONB,
  p_intervention_content JSONB,
  p_recommended_actions JSONB DEFAULT '[]'::jsonb,
  p_scheduled_delivery TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  intervention_id UUID;
  user_settings user_monitoring_settings%ROWTYPE;
BEGIN
  -- Get user monitoring settings
  SELECT * INTO user_settings 
  FROM user_monitoring_settings 
  WHERE user_id = p_user_id;
  
  -- If no settings exist, create default ones
  IF user_settings IS NULL THEN
    INSERT INTO user_monitoring_settings (user_id) VALUES (p_user_id);
    SELECT * INTO user_settings FROM user_monitoring_settings WHERE user_id = p_user_id;
  END IF;
  
  -- Check if monitoring is enabled for this user
  IF NOT user_settings.monitoring_enabled THEN
    RETURN NULL; -- Don't create intervention if monitoring is disabled
  END IF;
  
  -- Create the intervention
  INSERT INTO proactive_interventions (
    user_id,
    goal_id,
    intervention_type,
    priority_level,
    trigger_conditions,
    intervention_content,
    recommended_actions,
    scheduled_delivery,
    delivery_method,
    time_zone
  ) VALUES (
    p_user_id,
    p_goal_id,
    p_intervention_type,
    p_priority_level,
    p_trigger_conditions,
    p_intervention_content,
    p_recommended_actions,
    COALESCE(p_scheduled_delivery, NOW()),
    (user_settings.preferred_delivery_methods->>0)::TEXT, -- Use first preferred method
    user_settings.time_zone
  ) RETURNING id INTO intervention_id;
  
  RETURN intervention_id;
END;
$$;

-- Helper function to evaluate monitoring rules
CREATE OR REPLACE FUNCTION evaluate_monitoring_rules()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rule_record monitoring_rules%ROWTYPE;
  evaluation_result RECORD;
  interventions_created INTEGER := 0;
BEGIN
  -- Loop through all active monitoring rules
  FOR rule_record IN 
    SELECT * FROM monitoring_rules 
    WHERE is_active = true 
  LOOP
    BEGIN
      -- Execute the evaluation query
      EXECUTE rule_record.evaluation_query;
      
      -- Update rule statistics
      UPDATE monitoring_rules 
      SET 
        total_triggers = total_triggers + 1,
        updated_at = NOW()
      WHERE id = rule_record.id;
      
      interventions_created := interventions_created + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other rules
      RAISE WARNING 'Error evaluating monitoring rule %: %', rule_record.rule_name, SQLERRM;
    END;
  END LOOP;
  
  RETURN interventions_created;
END;
$$;

-- Helper function to get pending interventions for user
CREATE OR REPLACE FUNCTION get_pending_interventions_for_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'intervention_type', intervention_type,
      'priority_level', priority_level,
      'urgency_score', urgency_score,
      'intervention_content', intervention_content,
      'recommended_actions', recommended_actions,
      'educational_resources', educational_resources,
      'trigger_conditions', trigger_conditions,
      'scheduled_delivery', scheduled_delivery,
      'created_at', created_at
    )
    ORDER BY 
      CASE priority_level
        WHEN 'critical' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 4
        WHEN 'low' THEN 5
      END,
      urgency_score DESC,
      created_at DESC
  ) INTO result
  FROM proactive_interventions
  WHERE user_id = p_user_id
    AND delivered_at IS NULL
    AND (scheduled_delivery IS NULL OR scheduled_delivery <= NOW());
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_proactive_support_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_proactive_interventions_updated_at 
  BEFORE UPDATE ON proactive_interventions
  FOR EACH ROW EXECUTE FUNCTION update_proactive_support_updated_at();

CREATE TRIGGER update_user_monitoring_settings_updated_at 
  BEFORE UPDATE ON user_monitoring_settings
  FOR EACH ROW EXECUTE FUNCTION update_proactive_support_updated_at();

CREATE TRIGGER update_monitoring_rules_updated_at 
  BEFORE UPDATE ON monitoring_rules
  FOR EACH ROW EXECUTE FUNCTION update_proactive_support_updated_at();

CREATE TRIGGER update_intervention_templates_updated_at 
  BEFORE UPDATE ON intervention_templates
  FOR EACH ROW EXECUTE FUNCTION update_proactive_support_updated_at();

-- Grant necessary permissions
GRANT ALL ON proactive_interventions TO authenticated;
GRANT ALL ON user_monitoring_settings TO authenticated;
GRANT ALL ON monitoring_rules TO authenticated;
GRANT ALL ON intervention_templates TO authenticated;
GRANT ALL ON crisis_support_sessions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE proactive_interventions IS 'AI-generated proactive interventions and support for users';
COMMENT ON TABLE user_monitoring_settings IS 'User preferences for proactive monitoring and alerts';
COMMENT ON TABLE monitoring_rules IS 'System rules that define when to create proactive interventions';
COMMENT ON TABLE intervention_templates IS 'Reusable templates for different types of interventions';
COMMENT ON TABLE crisis_support_sessions IS 'Special tracking for crisis intervention sessions';

COMMENT ON FUNCTION create_proactive_intervention IS 'Create a new proactive intervention respecting user preferences';
COMMENT ON FUNCTION evaluate_monitoring_rules IS 'Evaluate all active monitoring rules and create interventions as needed';
COMMENT ON FUNCTION get_pending_interventions_for_user IS 'Get all pending interventions for a user ordered by priority';