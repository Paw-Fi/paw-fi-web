-- =========================================================================================
-- FIX FOR SEO SCORE CALCULATION FUNCTION
-- This fixes the "cannot get array length of a non-array" error
-- =========================================================================================

-- Drop and recreate the SEO score calculation function with proper null/array checks
DROP FUNCTION IF EXISTS calculate_seo_score(seo_pages_data);

CREATE OR REPLACE FUNCTION calculate_seo_score(page_row seo_pages_data)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    keywords_count INTEGER := 0;
    semantic_count INTEGER := 0;
    schema_elements INTEGER := 0;
BEGIN
    -- Base content score (40 points max)
    IF page_row.title IS NOT NULL AND length(page_row.title) BETWEEN 30 AND 60 THEN
        score := score + 10;
    END IF;
    
    IF page_row.meta_description IS NOT NULL AND length(page_row.meta_description) BETWEEN 120 AND 160 THEN
        score := score + 10;
    END IF;
    
    -- Safe array length check for keywords
    BEGIN
        IF page_row.keywords IS NOT NULL THEN
            keywords_count := array_length(page_row.keywords, 1);
            IF keywords_count IS NOT NULL AND keywords_count BETWEEN 5 AND 15 THEN
                score := score + 10;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Skip scoring if keywords is not a proper array
        NULL;
    END;
    
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
    -- Safe JSONB check for schema_markup
    BEGIN
        IF page_row.schema_markup IS NOT NULL THEN
            -- Check if it's a valid JSONB object or array
            IF jsonb_typeof(page_row.schema_markup) = 'array' THEN
                schema_elements := jsonb_array_length(page_row.schema_markup);
                IF schema_elements > 0 THEN
                    score := score + 10;
                END IF;
            ELSIF jsonb_typeof(page_row.schema_markup) = 'object' THEN
                -- If it's an object with keys, count it as having schema
                IF (SELECT count(*) FROM jsonb_object_keys(page_row.schema_markup)) > 0 THEN
                    score := score + 10;
                END IF;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Skip scoring if schema_markup is not valid JSONB
        NULL;
    END;
    
    -- Safe array length check for semantic keywords
    BEGIN
        IF page_row.semantic_keywords IS NOT NULL THEN
            semantic_count := array_length(page_row.semantic_keywords, 1);
            IF semantic_count IS NOT NULL AND semantic_count >= 10 THEN
                score := score + 10;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Skip scoring if semantic_keywords is not a proper array
        NULL;
    END;
    
    IF page_row.featured_snippet_content IS NOT NULL AND length(page_row.featured_snippet_content) > 0 THEN
        score := score + 10;
    END IF;
    
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the fixed function
DROP TRIGGER IF EXISTS calculate_seo_score_trigger ON seo_pages_data;

CREATE TRIGGER calculate_seo_score_trigger
    BEFORE INSERT OR UPDATE ON seo_pages_data
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_score();

-- Test the function by updating a single record to ensure it works
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    -- Check if there are any records to test with
    SELECT COUNT(*) INTO test_count FROM seo_pages_data LIMIT 1;
    
    IF test_count > 0 THEN
        -- Test the function on the first record
        UPDATE seo_pages_data 
        SET updated_at = NOW() 
        WHERE id = (SELECT id FROM seo_pages_data LIMIT 1);
        
        RAISE NOTICE 'SEO score function test completed successfully';
    ELSE
        RAISE NOTICE 'No records found to test SEO function';
    END IF;
END $$;