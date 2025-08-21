-- Add avatar customization columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_elements JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_colors JSONB;

-- Create index for better performance on avatar queries
CREATE INDEX IF NOT EXISTS idx_users_avatar_elements ON users USING GIN (avatar_elements);
CREATE INDEX IF NOT EXISTS idx_users_avatar_colors ON users USING GIN (avatar_colors);

-- Add comment for documentation
COMMENT ON COLUMN users.avatar_elements IS 'JSON object storing selected avatar elements for each category (face, hair, etc.)';
COMMENT ON COLUMN users.avatar_colors IS 'JSON object storing custom colors for avatar parts (hair, face, eyes, mouth)';