-- Add model column to conversations table for AI role tracking
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'financial_educator' 
CHECK (model IN ('financial_educator', 'financial_advisor'));

-- Create index for efficient model-based filtering
CREATE INDEX IF NOT EXISTS idx_conversations_model ON public.conversations(model);
CREATE INDEX IF NOT EXISTS idx_conversations_user_model ON public.conversations(user_id, model);

-- Update existing conversations to have a default model if they don't have one
UPDATE public.conversations 
SET model = 'financial_educator' 
WHERE model IS NULL;
