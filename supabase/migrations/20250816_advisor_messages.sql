-- Add ai_advisor_messages column to financial_goals table
-- This column will store the AI-generated advisor messages for the presentation flow

ALTER TABLE financial_goals 
ADD COLUMN IF NOT EXISTS ai_advisor_messages JSONB DEFAULT NULL;

-- Add comment to document the column structure
COMMENT ON COLUMN financial_goals.ai_advisor_messages IS 'AI-generated advisor messages for presentation flow pages (planMessage, insightsMessage, nextStepsMessage). Each message contains content and tone properties.';

-- Create index for faster queries on advisor messages (optional, for future optimization)
CREATE INDEX IF NOT EXISTS idx_financial_goals_advisor_messages 
ON financial_goals USING gin (ai_advisor_messages);