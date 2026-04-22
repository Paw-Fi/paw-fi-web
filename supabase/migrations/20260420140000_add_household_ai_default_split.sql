ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS ai_use_default_split BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_default_split_config JSONB;

COMMENT ON COLUMN public.households.ai_use_default_split IS
  'Whether AI-logged shared expenses should apply the household default split when no explicit split is provided.';

COMMENT ON COLUMN public.households.ai_default_split_config IS
  'Serialized default split template for AI-logged shared expenses.';
