-- Atomic Financial Goal Creation Procedure
-- Ensures ACID compliance for complete goal generation workflow

-- Create the stored procedure for atomic goal creation
CREATE OR REPLACE FUNCTION create_complete_financial_goal(
  p_user_id UUID,
  p_profile_data JSONB,
  p_goal_data JSONB,
  p_milestones_data JSONB,
  p_insights_data JSONB,
  p_request_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_profile_id UUID;
  v_goal_id UUID;
  v_milestones_count INTEGER := 0;
  v_insights_count INTEGER := 0;
  v_milestone JSONB;
  v_insight JSONB;
  v_result JSONB;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Step 1: Handle financial health profile creation
  -- For authenticated users: upsert (update if exists, insert if not)
  -- For guest users: always insert new profile (user_id = NULL)
  
  IF p_user_id IS NOT NULL THEN
    -- Authenticated user: Check if profile exists, then update or insert
    SELECT id INTO v_profile_id 
    FROM public.financial_health_profiles 
    WHERE user_id = p_user_id;
    
    IF v_profile_id IS NOT NULL THEN
      -- Update existing profile
      UPDATE public.financial_health_profiles 
      SET 
        profile_description = p_profile_data->>'profile_description',
        quiz_answers = (p_profile_data->>'quiz_answers')::JSONB,
        profile_data = (p_profile_data->>'profile_data')::JSONB,
        updated_at = NOW()
      WHERE id = v_profile_id;
    ELSE
      -- Insert new profile for authenticated user
      INSERT INTO public.financial_health_profiles (
        user_id,
        profile_description,
        quiz_answers,
        profile_data
      )
      VALUES (
        p_user_id,
        p_profile_data->>'profile_description',
        (p_profile_data->>'quiz_answers')::JSONB,
        (p_profile_data->>'profile_data')::JSONB
      )
      RETURNING id INTO v_profile_id;
    END IF;
  ELSE
    -- Guest user: Always insert new profile (allows multiple guest profiles)
    INSERT INTO public.financial_health_profiles (
      user_id,
      profile_description,
      quiz_answers,
      profile_data
    )
    VALUES (
      NULL,
      p_profile_data->>'profile_description',
      (p_profile_data->>'quiz_answers')::JSONB,
      (p_profile_data->>'profile_data')::JSONB
    )
    RETURNING id INTO v_profile_id;
  END IF;

  -- Step 2: Insert financial goal
  INSERT INTO public.financial_goals (
    user_id,
    title,
    description,
    goal_type,
    target_amount,
    target_date,
    ai_questionnaire_data,
    ai_generated_strategy,
    ai_generated_milestones,
    ai_advisor_messages
  )
  VALUES (
    p_user_id,
    p_goal_data->>'title',
    p_goal_data->>'description',
    p_goal_data->>'goal_type',
    (p_goal_data->>'target_amount')::DECIMAL,
    (p_goal_data->>'target_date')::DATE,
    (p_goal_data->>'ai_questionnaire_data')::JSONB,
    p_goal_data->>'ai_generated_strategy',
    (p_goal_data->>'ai_generated_milestones')::JSONB,
    (p_goal_data->>'ai_advisor_messages')::JSONB
  )
  RETURNING id INTO v_goal_id;

  -- Step 3: Insert milestones
  FOR v_milestone IN SELECT * FROM jsonb_array_elements(p_milestones_data)
  LOOP
    INSERT INTO public.goal_milestones (
      goal_id,
      title,
      description,
      milestone_type,
      target_amount,
      due_date,
      habit_description,
      frequency,
      habit_target_value,
      is_ai_generated,
      display_order,
      priority
    )
    VALUES (
      v_goal_id,
      v_milestone->>'title',
      v_milestone->>'description',
      v_milestone->>'milestone_type',
      CASE 
        WHEN v_milestone->>'target_amount' IS NOT NULL 
        THEN (v_milestone->>'target_amount')::DECIMAL 
        ELSE NULL 
      END,
      (v_milestone->>'due_date')::DATE,
      v_milestone->>'habit_description',
      v_milestone->>'frequency',
      CASE 
        WHEN v_milestone->>'habit_target_value' IS NOT NULL 
        THEN (v_milestone->>'habit_target_value')::DECIMAL 
        ELSE NULL 
      END,
      COALESCE((v_milestone->>'is_ai_generated')::BOOLEAN, TRUE),
      COALESCE((v_milestone->>'display_order')::INTEGER, 0),
      COALESCE(v_milestone->>'priority', 'medium')
    );
    
    v_milestones_count := v_milestones_count + 1;
  END LOOP;

  -- Step 4: Insert insights
  FOR v_insight IN SELECT * FROM jsonb_array_elements(p_insights_data)
  LOOP
    INSERT INTO public.goal_insights (
      goal_id,
      insight_type,
      title,
      content,
      priority,
      is_ai_generated,
      ai_confidence_score
    )
    VALUES (
      v_goal_id,
      v_insight->>'insight_type',
      v_insight->>'title',
      v_insight->>'content',
      COALESCE(v_insight->>'priority', 'medium'),
      COALESCE((v_insight->>'is_ai_generated')::BOOLEAN, TRUE),
      COALESCE((v_insight->>'ai_confidence_score')::DECIMAL, 0.8)
    );
    
    v_insights_count := v_insights_count + 1;
  END LOOP;

  -- Step 5: Update goal progress based on initial amount (if any)
  UPDATE public.financial_goals 
  SET 
    progress_percentage = LEAST(
      (current_amount / NULLIF(target_amount, 0)) * 100, 
      100
    ),
    updated_at = NOW()
  WHERE id = v_goal_id;

  -- Step 6: Log operation (optional, for monitoring)
  IF p_request_id IS NOT NULL THEN
    -- Could insert into an audit log table here
    -- For now, we'll just include in the result
    NULL;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'success', TRUE,
    'profile_id', v_profile_id,
    'goal_id', v_goal_id,
    'milestones_count', v_milestones_count,
    'insights_count', v_insights_count,
    'request_id', p_request_id,
    'timestamp', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- PostgreSQL automatically rolls back the transaction on exception
    RAISE EXCEPTION 'Failed to create complete financial goal: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION create_complete_financial_goal(UUID, JSONB, JSONB, JSONB, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_complete_financial_goal(UUID, JSONB, JSONB, JSONB, JSONB, TEXT) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION create_complete_financial_goal(UUID, JSONB, JSONB, JSONB, JSONB, TEXT) IS 
'Atomically creates a complete financial goal with profile, milestones, and insights in a single transaction. Used by ai-goal-generator service.';