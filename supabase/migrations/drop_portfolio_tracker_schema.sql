-- Drop Portfolio Tracker Schema: Complete Cleanup
-- This script removes all tables, functions, triggers, indexes, and policies
-- created by the 20250125_portfolio_tracker_schema.sql migration

-- Drop triggers first (they depend on functions)
DROP TRIGGER IF EXISTS update_financial_goals_updated_at ON financial_goals;
DROP TRIGGER IF EXISTS update_user_investment_profiles_updated_at ON user_investment_profiles;
DROP TRIGGER IF EXISTS update_goal_preferences_updated_at ON goal_preferences;

-- Drop portfolio tracker-specific functions only
-- NOTE: NOT dropping update_updated_at_column() as it's used by other tables
DROP FUNCTION IF EXISTS get_user_coaching_context(UUID, UUID);
DROP FUNCTION IF EXISTS calculate_goal_progress(UUID);
DROP FUNCTION IF EXISTS update_goal_amount(UUID, DECIMAL);

-- Drop Row Level Security policies (drop before tables)
-- Financial Goals Policies
DROP POLICY IF EXISTS "Users can manage their own goals" ON financial_goals;

-- AI Portfolios Policies
DROP POLICY IF EXISTS "Users can view their portfolios" ON ai_portfolios;
DROP POLICY IF EXISTS "System can create portfolios" ON ai_portfolios;
DROP POLICY IF EXISTS "System can update portfolios" ON ai_portfolios;

-- AI Coaching Sessions Policies
DROP POLICY IF EXISTS "Users can access their coaching sessions" ON ai_coaching_sessions;

-- User Investment Profiles Policies
DROP POLICY IF EXISTS "Users can manage their investment profile" ON user_investment_profiles;

-- Portfolio Performance Policies
DROP POLICY IF EXISTS "Users can view their performance data" ON portfolio_performance;
DROP POLICY IF EXISTS "System can insert performance data" ON portfolio_performance;

-- Goal Milestones Policies
DROP POLICY IF EXISTS "Users can view their milestones" ON goal_milestones;
DROP POLICY IF EXISTS "System can manage milestones" ON goal_milestones;

-- AI Conversations Policies
DROP POLICY IF EXISTS "Users can manage their conversations" ON ai_conversations;

-- Goal Preferences Policies
DROP POLICY IF EXISTS "Users can manage their goal preferences" ON goal_preferences;

-- Market Data Cache Policies
DROP POLICY IF EXISTS "Public read access to market data" ON market_data_cache;
DROP POLICY IF EXISTS "Service role can manage market data" ON market_data_cache;

-- Drop indexes (explicit drops for clarity, though they'll be dropped with tables)
DROP INDEX IF EXISTS idx_financial_goals_user_id;
DROP INDEX IF EXISTS idx_financial_goals_status;
DROP INDEX IF EXISTS idx_ai_portfolios_goal_id;
DROP INDEX IF EXISTS idx_ai_portfolios_user_id;
DROP INDEX IF EXISTS idx_ai_portfolios_active;
DROP INDEX IF EXISTS idx_coaching_sessions_user_id;
DROP INDEX IF EXISTS idx_coaching_sessions_scheduled;
DROP INDEX IF EXISTS idx_portfolio_performance_goal_date;
DROP INDEX IF EXISTS idx_goal_milestones_goal_id;
DROP INDEX IF EXISTS idx_ai_conversations_user_goal;
DROP INDEX IF EXISTS idx_market_data_symbol_date;

-- Drop tables in dependency order (child tables first, then parent tables)
-- Tables with foreign key dependencies should be dropped first

-- Drop tables that reference financial_goals
DROP TABLE IF EXISTS ai_portfolios CASCADE;
DROP TABLE IF EXISTS ai_coaching_sessions CASCADE;
DROP TABLE IF EXISTS portfolio_performance CASCADE;
DROP TABLE IF EXISTS goal_milestones CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS goal_preferences CASCADE;

-- Drop independent tables
DROP TABLE IF EXISTS user_investment_profiles CASCADE;
DROP TABLE IF EXISTS market_data_cache CASCADE;

-- Drop the main financial_goals table last
DROP TABLE IF EXISTS financial_goals CASCADE;

-- Note: Comments are automatically removed when tables/functions are dropped
-- No need to explicitly drop comments

-- Revoke permissions (optional, as they're removed with table drops)
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
-- REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
-- REVOKE USAGE ON SCHEMA public FROM authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Portfolio tracker schema has been completely removed.';
    RAISE NOTICE 'All tables, functions, triggers, indexes, and policies have been dropped.';
END $$;
