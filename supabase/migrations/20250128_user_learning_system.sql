-- User Learning and Engagement System Migration
-- Migration: 20250128_user_learning_system.sql
-- Purpose: Track user learning progress, engagement, and personalized education

-- User Learning Progress - Track what users know and how they learn
CREATE TABLE user_learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Learning preferences
  preferred_explanation_style TEXT DEFAULT 'simple' CHECK (preferred_explanation_style IN ('simple', 'detailed', 'technical')),
  learning_pace TEXT DEFAULT 'moderate' CHECK (learning_pace IN ('slow', 'moderate', 'fast')),
  preferred_communication_style TEXT DEFAULT 'friendly' CHECK (preferred_communication_style IN ('formal', 'friendly', 'casual', 'professional')),
  preferred_examples TEXT DEFAULT 'general' CHECK (preferred_examples IN ('general', 'personal', 'real_world', 'historical')),
  
  -- Learning progress tracking
  overall_financial_literacy_level INTEGER DEFAULT 1 CHECK (overall_financial_literacy_level BETWEEN 1 AND 10),
  investment_knowledge_level INTEGER DEFAULT 1 CHECK (investment_knowledge_level BETWEEN 1 AND 10),
  risk_understanding_level INTEGER DEFAULT 1 CHECK (risk_understanding_level BETWEEN 1 AND 10),
  market_knowledge_level INTEGER DEFAULT 1 CHECK (market_knowledge_level BETWEEN 1 AND 10),
  
  -- Engagement metrics
  average_engagement_score INTEGER DEFAULT 5 CHECK (average_engagement_score BETWEEN 1 AND 10),
  total_learning_sessions INTEGER DEFAULT 0,
  total_learning_time_minutes INTEGER DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  explanations_requested INTEGER DEFAULT 0,
  
  -- Topic-specific progress
  completed_topics JSONB DEFAULT '[]', -- List of topics user has mastered
  in_progress_topics JSONB DEFAULT '[]', -- Topics currently learning
  struggled_topics JSONB DEFAULT '[]', -- Topics user finds difficult
  favorite_topics JSONB DEFAULT '[]', -- Topics user enjoys learning about
  
  -- Knowledge gaps and strengths
  identified_knowledge_gaps JSONB DEFAULT '[]', -- Areas needing improvement
  learning_strengths JSONB DEFAULT '[]', -- User's learning advantages
  misconceptions_corrected JSONB DEFAULT '[]', -- Past mistakes that were corrected
  
  -- Behavioral insights
  learning_patterns JSONB DEFAULT '{}', -- When/how user learns best
  attention_span_minutes INTEGER DEFAULT 15, -- How long user typically engages
  preferred_learning_times JSONB DEFAULT '[]', -- Best times of day for learning
  distraction_factors JSONB DEFAULT '[]', -- What typically interrupts learning
  
  -- Progress tracking
  learning_streak_days INTEGER DEFAULT 0, -- Consecutive days of learning
  longest_learning_streak INTEGER DEFAULT 0,
  last_learning_session TIMESTAMPTZ,
  next_suggested_topic TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Topics and Content
CREATE TABLE learning_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('basics', 'investing', 'risk_management', 'market_analysis', 'portfolio_management', 'behavioral_finance', 'tax_optimization')),
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
  estimated_time_minutes INTEGER NOT NULL,
  
  -- Prerequisites and relationships
  prerequisites JSONB DEFAULT '[]', -- Topics that should be learned first
  related_topics JSONB DEFAULT '[]', -- Related learning topics
  unlocks_topics JSONB DEFAULT '[]', -- Topics this unlocks
  
  -- Content structure
  learning_objectives JSONB NOT NULL, -- What user will learn
  key_concepts JSONB NOT NULL, -- Important concepts covered
  content_structure JSONB NOT NULL, -- How content is organized
  
  -- Multiple explanation levels
  simple_explanation JSONB NOT NULL, -- Basic explanation for beginners
  detailed_explanation JSONB NOT NULL, -- Comprehensive explanation
  technical_explanation JSONB NOT NULL, -- Advanced technical details
  
  -- Interactive elements
  examples JSONB DEFAULT '[]', -- Real-world examples
  practice_exercises JSONB DEFAULT '[]', -- Hands-on exercises
  knowledge_checks JSONB DEFAULT '[]', -- Questions to test understanding
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  popularity_score INTEGER DEFAULT 0, -- How often users engage with this topic
  effectiveness_score DECIMAL(3,2) DEFAULT 0.00, -- How well users learn from this
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Topic Progress - Detailed tracking per topic
CREATE TABLE user_topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE,
  
  -- Progress tracking
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'mastered', 'needs_review')),
  understanding_level INTEGER DEFAULT 0 CHECK (understanding_level BETWEEN 0 AND 10),
  confidence_level INTEGER DEFAULT 0 CHECK (confidence_level BETWEEN 0 AND 10),
  
  -- Engagement data
  time_spent_minutes INTEGER DEFAULT 0,
  visits_count INTEGER DEFAULT 0,
  last_visited TIMESTAMPTZ,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  
  -- Learning effectiveness
  concepts_understood JSONB DEFAULT '[]', -- Which concepts user grasps
  concepts_struggling JSONB DEFAULT '[]', -- Which concepts are difficult
  questions_asked JSONB DEFAULT '[]', -- Questions user asked about this topic
  explanations_requested INTEGER DEFAULT 0,
  
  -- Assessment results
  knowledge_check_results JSONB DEFAULT '[]', -- Results of understanding tests
  practice_exercise_results JSONB DEFAULT '[]', -- Results of practice exercises
  areas_for_improvement JSONB DEFAULT '[]', -- Identified improvement areas
  
  -- Personalization
  preferred_explanation_level TEXT, -- Override for this specific topic
  custom_examples_requested JSONB DEFAULT '[]', -- Examples user specifically wanted
  bookmark_notes TEXT, -- User's personal notes on this topic
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, topic_id)
);

-- Learning Sessions - Track individual learning interactions
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES learning_topics(id) ON DELETE CASCADE,
  
  -- Session details
  session_type TEXT NOT NULL CHECK (session_type IN ('exploration', 'guided_learning', 'practice', 'review', 'q_and_a', 'crisis_learning')),
  trigger_event TEXT, -- What caused this learning session
  duration_minutes INTEGER NOT NULL,
  
  -- Learning effectiveness
  engagement_score INTEGER CHECK (engagement_score BETWEEN 1 AND 10),
  understanding_gained INTEGER CHECK (understanding_gained BETWEEN -5 AND 5), -- Can be negative if confusion increased
  questions_asked INTEGER DEFAULT 0,
  concepts_learned JSONB DEFAULT '[]',
  misconceptions_corrected JSONB DEFAULT '[]',
  
  -- Interaction data
  explanation_levels_used JSONB DEFAULT '[]', -- Which explanation levels were accessed
  examples_viewed JSONB DEFAULT '[]', -- Which examples were helpful
  exercises_completed JSONB DEFAULT '[]', -- Practice exercises done
  
  -- Outcomes
  knowledge_before INTEGER CHECK (knowledge_before BETWEEN 0 AND 10),
  knowledge_after INTEGER CHECK (knowledge_after BETWEEN 0 AND 10),
  confidence_before INTEGER CHECK (confidence_before BETWEEN 0 AND 10),
  confidence_after INTEGER CHECK (confidence_after BETWEEN 0 AND 10),
  
  -- Follow-up
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_topics JSONB DEFAULT '[]', -- Topics to explore next
  user_feedback TEXT, -- User's thoughts on the session
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_learning_progress_user_id ON user_learning_progress(user_id);
CREATE INDEX idx_learning_topics_category ON learning_topics(category);
CREATE INDEX idx_learning_topics_difficulty ON learning_topics(difficulty_level);
CREATE INDEX idx_user_topic_progress_user_id ON user_topic_progress(user_id);
CREATE INDEX idx_user_topic_progress_topic_id ON user_topic_progress(topic_id);
CREATE INDEX idx_user_topic_progress_status ON user_topic_progress(status);
CREATE INDEX idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX idx_learning_sessions_topic_id ON learning_sessions(topic_id);
CREATE INDEX idx_learning_sessions_created_at ON learning_sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
CREATE POLICY "Users can manage their own learning progress" ON user_learning_progress 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "All authenticated users can read learning topics" ON learning_topics 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their own topic progress" ON user_topic_progress 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning sessions" ON learning_sessions 
  FOR ALL USING (auth.uid() = user_id);

-- Helper function to get personalized learning recommendations
CREATE OR REPLACE FUNCTION get_personalized_learning_recommendations(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile user_learning_progress%ROWTYPE;
  recommendations JSONB;
BEGIN
  -- Get user learning profile
  SELECT * INTO user_profile 
  FROM user_learning_progress 
  WHERE user_id = p_user_id;
  
  -- If no profile exists, create basic recommendations
  IF user_profile IS NULL THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'topic_id', id,
        'title', title,
        'description', description,
        'difficulty_level', difficulty_level,
        'estimated_time_minutes', estimated_time_minutes,
        'recommendation_reason', 'Great starting point for beginners'
      )
    ) INTO recommendations
    FROM learning_topics
    WHERE category = 'basics' AND difficulty_level <= 3
    ORDER BY difficulty_level
    LIMIT 5;
  ELSE
    -- Generate personalized recommendations based on user profile
    SELECT jsonb_agg(
      jsonb_build_object(
        'topic_id', lt.id,
        'title', lt.title,
        'description', lt.description,
        'difficulty_level', lt.difficulty_level,
        'estimated_time_minutes', lt.estimated_time_minutes,
        'recommendation_reason', 
          CASE 
            WHEN utp.status IS NULL THEN 'New topic that matches your current level'
            WHEN utp.status = 'needs_review' THEN 'Previous topic that could use a refresh'
            WHEN lt.topic_slug = ANY(SELECT jsonb_array_elements_text(user_profile.struggled_topics)) THEN 'Revisit this challenging topic with new approach'
            ELSE 'Next logical step in your learning journey'
          END,
        'current_progress', COALESCE(utp.completion_percentage, 0)
      )
    ) INTO recommendations
    FROM learning_topics lt
    LEFT JOIN user_topic_progress utp ON lt.id = utp.topic_id AND utp.user_id = p_user_id
    WHERE lt.is_active = true
      AND lt.difficulty_level BETWEEN 
        GREATEST(1, user_profile.overall_financial_literacy_level - 1) AND 
        LEAST(10, user_profile.overall_financial_literacy_level + 2)
      AND (utp.status IS NULL OR utp.status IN ('not_started', 'in_progress', 'needs_review'))
    ORDER BY 
      CASE 
        WHEN utp.status = 'needs_review' THEN 1
        WHEN lt.topic_slug = ANY(SELECT jsonb_array_elements_text(user_profile.struggled_topics)) THEN 2
        WHEN utp.status = 'in_progress' THEN 3
        ELSE 4
      END,
      lt.popularity_score DESC,
      lt.effectiveness_score DESC
    LIMIT 8;
  END IF;
  
  RETURN COALESCE(recommendations, '[]'::jsonb);
END;
$$;

-- Helper function to update learning progress after session
CREATE OR REPLACE FUNCTION update_learning_progress_after_session(
  p_user_id UUID,
  p_topic_id UUID,
  p_understanding_gained INTEGER,
  p_engagement_score INTEGER,
  p_duration_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user topic progress
  INSERT INTO user_topic_progress (
    user_id, topic_id, understanding_level, confidence_level, 
    time_spent_minutes, visits_count, last_visited
  ) VALUES (
    p_user_id, p_topic_id, GREATEST(0, p_understanding_gained), 
    GREATEST(0, p_engagement_score), p_duration_minutes, 1, NOW()
  )
  ON CONFLICT (user_id, topic_id) DO UPDATE SET
    understanding_level = LEAST(10, GREATEST(0, user_topic_progress.understanding_level + p_understanding_gained)),
    confidence_level = LEAST(10, GREATEST(0, (user_topic_progress.confidence_level + p_engagement_score) / 2)),
    time_spent_minutes = user_topic_progress.time_spent_minutes + p_duration_minutes,
    visits_count = user_topic_progress.visits_count + 1,
    last_visited = NOW(),
    updated_at = NOW();
  
  -- Update overall user learning progress
  INSERT INTO user_learning_progress (
    user_id, total_learning_sessions, total_learning_time_minutes,
    average_engagement_score, last_learning_session
  ) VALUES (
    p_user_id, 1, p_duration_minutes, p_engagement_score, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_learning_sessions = user_learning_progress.total_learning_sessions + 1,
    total_learning_time_minutes = user_learning_progress.total_learning_time_minutes + p_duration_minutes,
    average_engagement_score = (user_learning_progress.average_engagement_score * user_learning_progress.total_learning_sessions + p_engagement_score) / (user_learning_progress.total_learning_sessions + 1),
    last_learning_session = NOW(),
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_learning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_learning_progress_updated_at 
  BEFORE UPDATE ON user_learning_progress
  FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER update_learning_topics_updated_at 
  BEFORE UPDATE ON learning_topics
  FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

CREATE TRIGGER update_user_topic_progress_updated_at 
  BEFORE UPDATE ON user_topic_progress
  FOR EACH ROW EXECUTE FUNCTION update_learning_updated_at();

-- Grant necessary permissions
GRANT ALL ON user_learning_progress TO authenticated;
GRANT ALL ON learning_topics TO authenticated;
GRANT ALL ON user_topic_progress TO authenticated;
GRANT ALL ON learning_sessions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE user_learning_progress IS 'Comprehensive tracking of user learning preferences, progress, and behavioral patterns';
COMMENT ON TABLE learning_topics IS 'Library of educational content with multiple explanation levels and interactive elements';
COMMENT ON TABLE user_topic_progress IS 'Detailed progress tracking for each user on each learning topic';
COMMENT ON TABLE learning_sessions IS 'Individual learning interaction tracking with effectiveness metrics';

COMMENT ON FUNCTION get_personalized_learning_recommendations IS 'Generate personalized learning recommendations based on user profile and progress';
COMMENT ON FUNCTION update_learning_progress_after_session IS 'Update user learning progress after completing a learning session';