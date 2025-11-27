-- Homepage testimonials table for marketing social proof on public pages
CREATE TABLE IF NOT EXISTS public.homepage_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    quote TEXT NOT NULL,
    avatar_url TEXT,
    rating INTEGER,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to support ordered display
CREATE INDEX IF NOT EXISTS idx_homepage_testimonials_display_order
    ON public.homepage_testimonials(display_order);

-- Enable Row Level Security (RLS)
ALTER TABLE public.homepage_testimonials ENABLE ROW LEVEL SECURITY;

-- Public read access for marketing pages (only active testimonials)
CREATE POLICY "Allow public read access to homepage testimonials"
    ON public.homepage_testimonials
    FOR SELECT
    TO public
    USING (is_active = TRUE);

-- Authenticated users also get read access
CREATE POLICY "Allow authenticated read access to homepage testimonials"
    ON public.homepage_testimonials
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- Service role full access for management tools
CREATE POLICY "Allow service role full access to homepage testimonials"
    ON public.homepage_testimonials
    FOR ALL
    TO service_role
    USING (true);

-- Keep updated_at in sync on updates (uses existing update_updated_at_column helper)
CREATE TRIGGER update_homepage_testimonials_updated_at
    BEFORE UPDATE ON public.homepage_testimonials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
