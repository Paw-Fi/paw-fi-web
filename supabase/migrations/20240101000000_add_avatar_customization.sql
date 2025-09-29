-- Add avatar customization columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_elements JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_colors JSONB;

-- Create index for better performance on avatar queries
CREATE INDEX IF NOT EXISTS idx_users_avatar_elements ON public.users USING GIN (avatar_elements);
CREATE INDEX IF NOT EXISTS idx_users_avatar_colors ON public.users USING GIN (avatar_colors);

-- Add comment for documentation
COMMENT ON COLUMN public.users.avatar_elements IS 'JSON object storing selected avatar elements for each category (face, hair, etc.)';
COMMENT ON COLUMN public.users.avatar_colors IS 'JSON object storing custom colors for avatar parts (hair, face, eyes, mouth)';