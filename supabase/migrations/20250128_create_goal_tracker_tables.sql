-- ====================
-- GOAL TRACKER SYSTEM - Database Migration
-- Created: 2025-01-28
-- Purpose: AI-driven financial goal tracking with milestones and insights
-- ====================

-- ====================
-- FINANCIAL GOALS TABLE  
-- ====================
CREATE TABLE IF NOT EXISTS public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Basic Goal Information
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_type VARCHAR(50) NOT NULL, -- 'retirement', 'home_buying', 'wealth', 'investment', 'custom'
  category VARCHAR(100), -- Additional categorization for custom goals
  
  -- Financial Details
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Timeline
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  estimated_completion_date DATE, -- AI-calculated based on progress
  
  -- AI-Generated Content
  ai_questionnaire_data JSONB, -- Raw questionnaire responses
  ai_generated_strategy TEXT, -- AI-generated strategy and recommendations
  ai_generated_milestones JSONB, -- Initial AI-generated milestone suggestions
  ai_insights JSONB, -- Ongoing AI insights and recommendations
  
  -- Status and Progress
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
  progress_percentage DECIMAL(5,2) DEFAULT 0, -- Calculated field: (current_amount / target_amount) * 100
  is_on_track BOOLEAN DEFAULT true, -- AI-calculated based on progress vs timeline
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_amounts CHECK (target_amount > 0 AND current_amount >= 0),
  CONSTRAINT valid_dates CHECK (target_date > start_date)
);

-- ====================
-- GOAL MILESTONES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.financial_goals(id) ON DELETE CASCADE NOT NULL,
  
  -- Milestone Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  milestone_type VARCHAR(50) NOT NULL, -- 'amount', 'habit', 'action', 'date'
  
  -- Financial Targets (for amount-based milestones)
  target_amount DECIMAL(15,2),
  current_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Habit/Action Details (for behavioral milestones)
  habit_description TEXT, -- e.g., "Save $20 on coffee daily"
  frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'one-time'
  habit_target_value DECIMAL(10,2), -- e.g., 20 for "$20 daily"
  
  -- Timeline
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  completed_date DATE,
  
  -- Status and Progress
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  is_ai_generated BOOLEAN DEFAULT false, -- Track if milestone was initially AI-generated
  
  -- Ordering and Display
  display_order INTEGER DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_milestone_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_milestone_amounts CHECK (
    (milestone_type = 'amount' AND target_amount > 0) OR 
    (milestone_type != 'amount')
  )
);

-- ====================
-- GOAL PROGRESS UPDATES TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.goal_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.financial_goals(id) ON DELETE CASCADE NOT NULL,
  milestone_id UUID REFERENCES public.goal_milestones(id) ON DELETE CASCADE,
  
  -- Update Details
  update_type VARCHAR(50) NOT NULL, -- 'amount_added', 'milestone_completed', 'manual_adjustment', 'ai_insight'
  amount_change DECIMAL(15,2), -- Positive for additions, negative for adjustments
  previous_amount DECIMAL(15,2),
  new_amount DECIMAL(15,2),
  
  -- User Input
  user_note TEXT,
  update_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'automatic', 'ai_suggestion'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- ====================
-- GOAL INSIGHTS TABLE
-- ====================
CREATE TABLE IF NOT EXISTS public.goal_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.financial_goals(id) ON DELETE CASCADE NOT NULL,
  
  -- Insight Details
  insight_type VARCHAR(50) NOT NULL, -- 'progress_warning', 'strategy_suggestion', 'milestone_recommendation', 'celebration'
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- AI Generated
  is_ai_generated BOOLEAN DEFAULT true,
  ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  
  -- User Interaction
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  user_feedback JSONB, -- User's reaction to the insight
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Some insights may be time-sensitive
);

-- ====================
-- PERFORMANCE INDEXES
-- ====================

-- Financial Goals Indexes
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON public.financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON public.financial_goals(status);
CREATE INDEX IF NOT EXISTS idx_financial_goals_goal_type ON public.financial_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_financial_goals_target_date ON public.financial_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_financial_goals_updated_at ON public.financial_goals(updated_at);

-- Goal Milestones Indexes
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_status ON public.goal_milestones(status);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_due_date ON public.goal_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_display_order ON public.goal_milestones(goal_id, display_order);

-- Progress Updates Indexes
CREATE INDEX IF NOT EXISTS idx_goal_progress_updates_goal_id ON public.goal_progress_updates(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_updates_created_at ON public.goal_progress_updates(created_at);
CREATE INDEX IF NOT EXISTS idx_goal_progress_updates_milestone_id ON public.goal_progress_updates(milestone_id);

-- Goal Insights Indexes
CREATE INDEX IF NOT EXISTS idx_goal_insights_goal_id ON public.goal_insights(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_insights_unread ON public.goal_insights(goal_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_goal_insights_priority ON public.goal_insights(priority);

-- ====================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================

-- Enable RLS on all tables
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_insights ENABLE ROW LEVEL SECURITY;

-- Financial Goals RLS Policies
CREATE POLICY "Users can view their own goals" ON public.financial_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" ON public.financial_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.financial_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.financial_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Goal Milestones RLS Policies
CREATE POLICY "Users can view milestones for their goals" ON public.goal_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.financial_goals 
      WHERE id = goal_milestones.goal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create milestones for their goals" ON public.goal_milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.financial_goals 
      WHERE id = goal_milestones.goal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update milestones for their goals" ON public.goal_milestones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.financial_goals 
      WHERE id = goal_milestones.goal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete milestones for their goals" ON public.goal_milestones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.financial_goals 
      WHERE id = goal_milestones.goal_id AND user_id = auth.uid()
    )
  );

-- Goal Progress Updates RLS Policies
CREATE POLICY "Users can view progress updates for their goals" ON public.goal_progress_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.financial_goals 
      WHERE id = goal_progress_updates.goal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create progress updates for their goals" ON public.goal_progress_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.financial_goals 
      WHERE id = goal_progress_updates.goal_id AND user_id = auth.uid()
    )
  );

-- Goal Insights RLS Policies
CREATE POLICY "Users can view insights for their goals" ON public.goal_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.financial_goals 
      WHERE id = goal_insights.goal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update insights for their goals" ON public.goal_insights
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.financial_goals 
      WHERE id = goal_insights.goal_id AND user_id = auth.uid()
    )
  );

-- Allow users to read guest goals (NULL user_id) for migration
CREATE POLICY "Users can read guest goals for migration" ON financial_goals
FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- Allow users to claim guest goals (update NULL user_id to their own user_id)
CREATE POLICY "Users can claim guest goals for migration" ON financial_goals
FOR UPDATE USING (user_id IS NULL) 
WITH CHECK (auth.uid() = user_id);

-- ====================
-- DATABASE FUNCTIONS
-- ====================

-- Function to update goal progress and calculate metrics
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the goal's current amount and progress percentage
  UPDATE public.financial_goals 
  SET 
    current_amount = (
      SELECT COALESCE(SUM(CASE 
        WHEN update_type = 'amount_added' THEN amount_change 
        WHEN update_type = 'manual_adjustment' THEN new_amount - COALESCE(previous_amount, 0)
        WHEN update_type = 'goal_progress_updated' THEN amount_change 
        ELSE 0 
      END), 0)
      FROM public.goal_progress_updates 
      WHERE goal_id = NEW.goal_id
    ),
    updated_at = NOW()
  WHERE id = NEW.goal_id;
  
  -- Update progress_percentage after current_amount is updated
  UPDATE public.financial_goals 
  SET 
    progress_percentage = LEAST(
      (current_amount / NULLIF(target_amount, 0)) * 100, 
      100
    )
  WHERE id = NEW.goal_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update goal progress when progress updates are inserted
CREATE TRIGGER trigger_update_goal_progress
  AFTER INSERT ON public.goal_progress_updates
  FOR EACH ROW EXECUTE FUNCTION update_goal_progress();

-- Function to calculate if a goal is on track
CREATE OR REPLACE FUNCTION calculate_goal_on_track_status(goal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  goal_record RECORD;
  days_total INTEGER;
  days_passed INTEGER;
  expected_progress DECIMAL(5,2);
BEGIN
  SELECT * INTO goal_record 
  FROM public.financial_goals 
  WHERE id = goal_id;
  
  IF goal_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate total days and days passed
  days_total := (goal_record.target_date - goal_record.start_date);
  days_passed := (CURRENT_DATE - goal_record.start_date);
  
  -- Avoid division by zero
  IF days_total <= 0 THEN
    RETURN true;
  END IF;
  
  -- Calculate expected progress
  expected_progress := (days_passed::DECIMAL / days_total::DECIMAL) * 100;
  
  -- Allow 20% tolerance (goal is on track if current progress >= 80% of expected)
  RETURN goal_record.progress_percentage >= (expected_progress * 0.8);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update milestone status based on progress
CREATE OR REPLACE FUNCTION update_milestone_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark milestone as overdue if past due date and not completed
  IF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('completed', 'cancelled') THEN
    NEW.status := 'overdue';
  END IF;
  
  -- Mark milestone as completed if progress is 100%
  IF NEW.progress_percentage >= 100 AND NEW.status != 'completed' THEN
    NEW.status := 'completed';
    NEW.completed_date := CURRENT_DATE;
  END IF;
  
  -- Update the goal's on-track status
  UPDATE public.financial_goals 
  SET 
    is_on_track = calculate_goal_on_track_status(NEW.goal_id),
    updated_at = NOW()
  WHERE id = NEW.goal_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update milestone status
CREATE TRIGGER trigger_update_milestone_status
  BEFORE UPDATE ON public.goal_milestones
  FOR EACH ROW EXECUTE FUNCTION update_milestone_status();