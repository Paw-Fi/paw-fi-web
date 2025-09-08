-- =========================================================================================
-- MONEKO ENHANCED pSEO DATABASE SCHEMA (GEO & SEO OPTIMIZED)
-- This enhancement adds comprehensive GEO optimization fields and advanced SEO features
-- for maximum search engine visibility and ranking potential
-- =========================================================================================

-- Step 1: Add new columns for enhanced SEO and GEO optimization
ALTER TABLE seo_pages_data 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States',
ADD COLUMN IF NOT EXISTS local_keywords TEXT[],
ADD COLUMN IF NOT EXISTS local_content TEXT,
ADD COLUMN IF NOT EXISTS geo_content JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS schema_markup JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS canonical_variations TEXT[],
ADD COLUMN IF NOT EXISTS hreflang_variations JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS competitor_keywords TEXT[],
ADD COLUMN IF NOT EXISTS long_tail_keywords TEXT[],
ADD COLUMN IF NOT EXISTS semantic_keywords TEXT[],
ADD COLUMN IF NOT EXISTS content_clusters TEXT[],
ADD COLUMN IF NOT EXISTS topic_authority_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_intent TEXT,
ADD COLUMN IF NOT EXISTS featured_snippet_content TEXT,
ADD COLUMN IF NOT EXISTS local_business_info JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS review_schema JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS faq_schema JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS howto_schema JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS breadcrumb_schema JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS social_proof JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS related_searches TEXT[],
ADD COLUMN IF NOT EXISTS content_freshness_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS mobile_optimization_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS page_speed_score INTEGER DEFAULT 95,
ADD COLUMN IF NOT EXISTS core_web_vitals JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS accessibility_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS voice_search_optimization TEXT[],
ADD COLUMN IF NOT EXISTS ai_search_optimization TEXT[],
ADD COLUMN IF NOT EXISTS search_trends JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS seasonal_keywords TEXT[],
ADD COLUMN IF NOT EXISTS competitor_analysis JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS content_gap_analysis JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS user_intent_mapping JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS conversion_optimization JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS link_building_targets TEXT[],
ADD COLUMN IF NOT EXISTS internal_linking_strategy JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS featured_image_alt TEXT,
ADD COLUMN IF NOT EXISTS image_seo_data JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS video_content JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS podcast_content JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS content_length INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS readability_score INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS engagement_metrics JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS personalization_data JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS ab_test_variants JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS localization_data JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS industry_specific_terms TEXT[],
ADD COLUMN IF NOT EXISTS compliance_keywords TEXT[],
ADD COLUMN IF NOT EXISTS trust_signals JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS expertise_indicators JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS author_bio TEXT,
ADD COLUMN IF NOT EXISTS content_expertise_score INTEGER DEFAULT 85,
ADD COLUMN IF NOT EXISTS backlink_targets TEXT[],
ADD COLUMN IF NOT EXISTS social_sharing_optimization JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS newsletter_signup_integration JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS lead_generation_elements JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS call_to_action_variants TEXT[],
ADD COLUMN IF NOT EXISTS conversion_tracking JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS analytics_goals TEXT[],
ADD COLUMN IF NOT EXISTS heat_map_insights JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS user_behavior_data JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS performance_benchmarks JSONB DEFAULT '{}'::JSONB;

-- Step 2: Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS seo_pages_data_location_idx ON seo_pages_data (location);
CREATE INDEX IF NOT EXISTS seo_pages_data_city_idx ON seo_pages_data (city);
CREATE INDEX IF NOT EXISTS seo_pages_data_state_idx ON seo_pages_data (state);
CREATE INDEX IF NOT EXISTS seo_pages_data_search_intent_idx ON seo_pages_data (search_intent);
CREATE INDEX IF NOT EXISTS seo_pages_data_topic_authority_idx ON seo_pages_data (topic_authority_score);
CREATE INDEX IF NOT EXISTS seo_pages_data_seo_score_idx ON seo_pages_data (seo_score);
CREATE INDEX IF NOT EXISTS seo_pages_data_content_freshness_idx ON seo_pages_data (content_freshness_date);

-- Step 3: Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS seo_pages_data_geo_content_gin_idx ON seo_pages_data USING GIN (geo_content);
CREATE INDEX IF NOT EXISTS seo_pages_data_schema_markup_gin_idx ON seo_pages_data USING GIN (schema_markup);
CREATE INDEX IF NOT EXISTS seo_pages_data_local_business_gin_idx ON seo_pages_data USING GIN (local_business_info);
CREATE INDEX IF NOT EXISTS seo_pages_data_search_trends_gin_idx ON seo_pages_data USING GIN (search_trends);
CREATE INDEX IF NOT EXISTS seo_pages_data_competitor_analysis_gin_idx ON seo_pages_data USING GIN (competitor_analysis);

-- Step 4: Create array indexes for better text search
CREATE INDEX IF NOT EXISTS seo_pages_data_local_keywords_gin_idx ON seo_pages_data USING GIN (local_keywords);
CREATE INDEX IF NOT EXISTS seo_pages_data_semantic_keywords_gin_idx ON seo_pages_data USING GIN (semantic_keywords);
CREATE INDEX IF NOT EXISTS seo_pages_data_long_tail_keywords_gin_idx ON seo_pages_data USING GIN (long_tail_keywords);
CREATE INDEX IF NOT EXISTS seo_pages_data_voice_search_gin_idx ON seo_pages_data USING GIN (voice_search_optimization);

-- Step 5: Add constraints for data integrity
ALTER TABLE seo_pages_data 
ADD CONSTRAINT seo_pages_data_topic_authority_range CHECK (topic_authority_score >= 0 AND topic_authority_score <= 100),
ADD CONSTRAINT seo_pages_data_seo_score_range CHECK (seo_score >= 0 AND seo_score <= 100),
ADD CONSTRAINT seo_pages_data_mobile_score_range CHECK (mobile_optimization_score >= 0 AND mobile_optimization_score <= 100),
ADD CONSTRAINT seo_pages_data_speed_score_range CHECK (page_speed_score >= 0 AND page_speed_score <= 100),
ADD CONSTRAINT seo_pages_data_accessibility_range CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
ADD CONSTRAINT seo_pages_data_readability_range CHECK (readability_score >= 0 AND readability_score <= 100),
ADD CONSTRAINT seo_pages_data_expertise_range CHECK (content_expertise_score >= 0 AND content_expertise_score <= 100);

-- Step 6: Create function for automatic SEO score calculation
CREATE OR REPLACE FUNCTION calculate_seo_score(page_row seo_pages_data)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
BEGIN
    -- Base content score (40 points max)
    IF page_row.title IS NOT NULL AND length(page_row.title) BETWEEN 30 AND 60 THEN
        score := score + 10;
    END IF;
    
    IF page_row.meta_description IS NOT NULL AND length(page_row.meta_description) BETWEEN 120 AND 160 THEN
        score := score + 10;
    END IF;
    
    IF page_row.keywords IS NOT NULL AND array_length(page_row.keywords, 1) BETWEEN 5 AND 15 THEN
        score := score + 10;
    END IF;
    
    IF page_row.content_length >= 1500 THEN
        score := score + 10;
    END IF;
    
    -- Technical SEO score (30 points max)
    IF page_row.mobile_optimization_score >= 90 THEN
        score := score + 10;
    END IF;
    
    IF page_row.page_speed_score >= 90 THEN
        score := score + 10;
    END IF;
    
    IF page_row.accessibility_score >= 90 THEN
        score := score + 10;
    END IF;
    
    -- Advanced SEO features (30 points max)
    IF page_row.schema_markup IS NOT NULL AND jsonb_array_length(page_row.schema_markup) > 0 THEN
        score := score + 10;
    END IF;
    
    IF page_row.semantic_keywords IS NOT NULL AND array_length(page_row.semantic_keywords, 1) >= 10 THEN
        score := score + 10;
    END IF;
    
    IF page_row.featured_snippet_content IS NOT NULL AND length(page_row.featured_snippet_content) > 0 THEN
        score := score + 10;
    END IF;
    
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to auto-calculate SEO score
CREATE OR REPLACE FUNCTION update_seo_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.seo_score = calculate_seo_score(NEW);
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_seo_score_trigger
    BEFORE INSERT OR UPDATE ON seo_pages_data
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_score();

-- Step 8: Create function for content freshness management
CREATE OR REPLACE FUNCTION update_content_freshness()
RETURNS TRIGGER AS $$
BEGIN
    -- Update content freshness date when significant content changes
    IF (OLD.intro_content IS DISTINCT FROM NEW.intro_content) OR
       (OLD.secondary_content IS DISTINCT FROM NEW.secondary_content) OR
       (OLD.benefits IS DISTINCT FROM NEW.benefits) OR
       (OLD.faqs IS DISTINCT FROM NEW.faqs) THEN
        NEW.content_freshness_date = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_freshness_trigger
    BEFORE UPDATE ON seo_pages_data
    FOR EACH ROW
    EXECUTE FUNCTION update_content_freshness();

-- Step 9: Create view for high-performing pages
CREATE OR REPLACE VIEW high_performing_seo_pages AS
SELECT 
    slug,
    title,
    target_group,
    financial_goal,
    location,
    seo_score,
    topic_authority_score,
    mobile_optimization_score,
    page_speed_score,
    accessibility_score,
    content_freshness_date,
    array_length(keywords, 1) as keyword_count,
    array_length(semantic_keywords, 1) as semantic_keyword_count,
    content_length
FROM seo_pages_data 
WHERE seo_score >= 80
ORDER BY seo_score DESC, topic_authority_score DESC;

-- Step 10: Create view for SEO optimization opportunities
CREATE OR REPLACE VIEW seo_optimization_opportunities AS
SELECT 
    slug,
    title,
    target_group,
    financial_goal,
    seo_score,
    CASE 
        WHEN length(title) < 30 OR length(title) > 60 THEN 'Optimize title length'
        WHEN length(meta_description) < 120 OR length(meta_description) > 160 THEN 'Optimize meta description'
        WHEN array_length(keywords, 1) < 5 THEN 'Add more keywords'
        WHEN content_length < 1500 THEN 'Increase content length'
        WHEN mobile_optimization_score < 90 THEN 'Improve mobile optimization'
        WHEN page_speed_score < 90 THEN 'Improve page speed'
        WHEN accessibility_score < 90 THEN 'Improve accessibility'
        ELSE 'Consider advanced SEO features'
    END as optimization_recommendation,
    content_freshness_date
FROM seo_pages_data 
WHERE seo_score < 85
ORDER BY seo_score ASC;

-- Step 11: Add comments for documentation
COMMENT ON COLUMN seo_pages_data.location IS 'Primary geographic location for local SEO';
COMMENT ON COLUMN seo_pages_data.city IS 'City-specific targeting for local SEO';
COMMENT ON COLUMN seo_pages_data.state IS 'State/province for regional SEO';
COMMENT ON COLUMN seo_pages_data.local_keywords IS 'Location-specific keywords for GEO targeting';
COMMENT ON COLUMN seo_pages_data.geo_content IS 'Location-specific content variations';
COMMENT ON COLUMN seo_pages_data.schema_markup IS 'Structured data for rich snippets';
COMMENT ON COLUMN seo_pages_data.semantic_keywords IS 'LSI and semantic keyword variations';
COMMENT ON COLUMN seo_pages_data.long_tail_keywords IS 'Long-tail keyword opportunities';
COMMENT ON COLUMN seo_pages_data.search_intent IS 'User search intent classification';
COMMENT ON COLUMN seo_pages_data.featured_snippet_content IS 'Content optimized for featured snippets';
COMMENT ON COLUMN seo_pages_data.voice_search_optimization IS 'Keywords optimized for voice search';
COMMENT ON COLUMN seo_pages_data.ai_search_optimization IS 'Content optimized for AI search engines';
COMMENT ON COLUMN seo_pages_data.topic_authority_score IS 'Content authority score for topic expertise';
COMMENT ON COLUMN seo_pages_data.seo_score IS 'Overall SEO optimization score (0-100)';

-- Step 12: Grant appropriate permissions
GRANT SELECT ON high_performing_seo_pages TO public;
GRANT SELECT ON seo_optimization_opportunities TO public;
GRANT SELECT ON high_performing_seo_pages TO authenticated;
GRANT SELECT ON seo_optimization_opportunities TO authenticated;
GRANT ALL ON high_performing_seo_pages TO service_role;
GRANT ALL ON seo_optimization_opportunities TO service_role;

-- Step 13: Create function for bulk SEO data updates
CREATE OR REPLACE FUNCTION bulk_update_seo_enhancements()
RETURNS void AS $$
BEGIN
    -- This function will be used to populate the new SEO fields with enhanced data
    -- Will be called after the enhanced data is prepared
    RAISE NOTICE 'SEO enhancement schema ready for data population';
END;
$$ LANGUAGE plpgsql;