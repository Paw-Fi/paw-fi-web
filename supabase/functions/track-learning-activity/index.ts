import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'

interface RequestBody {
  userId: string;
  contentId: string;
  action: 'started' | 'progress' | 'completed' | 'paused';
  progress?: {
    completion_percentage: number;
    time_spent: number;
    quiz_scores?: number[];
    notes?: string;
  };
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { userId, contentId, action, progress, timestamp }: RequestBody = await req.json()

    if (!userId || !contentId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: userId, contentId, and action' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    // Update or create learning activity record
    const activityData = {
      user_id: userId,
      content_id: contentId,
      completion_status: action === 'completed' ? 'completed' : action === 'started' ? 'in_progress' : 'in_progress',
      completion_percentage: progress?.completion_percentage || (action === 'completed' ? 100 : action === 'started' ? 0 : undefined),
      time_spent: progress?.time_spent || 0,
      quiz_scores: progress?.quiz_scores || [],
      notes: progress?.notes || '',
      last_accessed: timestamp,
      updated_at: new Date().toISOString()
    };

    // First try to update existing record
    const { data: existingActivity, error: fetchError } = await supabaseClient
      .from('user_learning_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .single();

    if (existingActivity) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from('user_learning_activities')
        .update({
          ...activityData,
          time_spent: (existingActivity.time_spent || 0) + (progress?.time_spent || 0),
          quiz_scores: progress?.quiz_scores || existingActivity.quiz_scores
        })
        .eq('user_id', userId)
        .eq('content_id', contentId);

      if (updateError) throw updateError;
    } else {
      // Create new record
      const { error: insertError } = await supabaseClient
        .from('user_learning_activities')
        .insert({
          ...activityData,
          started_at: action === 'started' ? timestamp : new Date().toISOString()
        });

      if (insertError) throw insertError;
    }

    // Update overall learning progress if completed
    if (action === 'completed') {
      const { data: learningProgress } = await supabaseClient
        .from('user_learning_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (learningProgress) {
        await supabaseClient
          .from('user_learning_progress')
          .update({
            completed_lessons: (learningProgress.completed_lessons || 0) + 1,
            total_time_spent: (learningProgress.total_time_spent || 0) + (progress?.time_spent || 0),
            last_learning_session: timestamp,
            overall_financial_literacy_level: Math.min(10, (learningProgress.overall_financial_literacy_level || 3) + 0.1)
          })
          .eq('user_id', userId);
      } else {
        // Create initial progress record
        await supabaseClient
          .from('user_learning_progress')
          .insert({
            user_id: userId,
            completed_lessons: 1,
            total_time_spent: progress?.time_spent || 0,
            current_streak: 1,
            overall_financial_literacy_level: 3.1,
            knowledge_areas: {
              portfolio_management: 3,
              risk_assessment: 3,
              market_analysis: 3,
              tax_optimization: 3,
              behavioral_finance: 3
            },
            last_learning_session: timestamp
          });
      }
    }

    console.log(`Tracked learning activity: ${action} for content ${contentId} by user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Learning activity ${action} tracked successfully`,
        activity_data: activityData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Track learning activity error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error occurred while tracking learning activity',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
