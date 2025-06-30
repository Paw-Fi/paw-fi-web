-- Create dashboard_views table to store user views
CREATE TABLE IF NOT EXISTS dashboard_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure each user can only have one default view
  CONSTRAINT unique_default_view_per_user UNIQUE (user_id, is_default) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create dashboard_widgets table to store widgets for each view
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  view_id UUID NOT NULL REFERENCES dashboard_views(id) ON DELETE CASCADE,
  widget_id VARCHAR(255) NOT NULL, -- Original widget ID from the frontend
  widget_type VARCHAR(50) NOT NULL, -- Type of widget (metricCard, progressBarList, etc.)
  title VARCHAR(255) NOT NULL,
  icon VARCHAR(100) NOT NULL,
  column_span SMALLINT NOT NULL CHECK (column_span IN (1, 2)),
  row_span SMALLINT DEFAULT 1 CHECK (row_span IN (1, 2)),
  position_x INTEGER NOT NULL, -- X position in the grid
  position_y INTEGER NOT NULL, -- Y position in the grid
  widget_data JSONB NOT NULL, -- Store all widget-specific data as JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Row Level Security (RLS) policies
ALTER TABLE dashboard_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Policy for dashboard_views: users can only access their own views
CREATE POLICY dashboard_views_user_policy 
  ON dashboard_views 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Policy for dashboard_widgets: users can only access widgets from their views
CREATE POLICY dashboard_widgets_user_policy 
  ON dashboard_widgets 
  FOR ALL 
  USING (
    view_id IN (
      SELECT id FROM dashboard_views WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_dashboard_views_user_id ON dashboard_views(user_id);
CREATE INDEX idx_dashboard_widgets_view_id ON dashboard_widgets(view_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_dashboard_views_updated_at
BEFORE UPDATE ON dashboard_views
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at
BEFORE UPDATE ON dashboard_widgets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
