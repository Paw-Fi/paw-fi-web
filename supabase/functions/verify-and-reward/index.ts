// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { corsHeaders } from '../shared/cors.ts';
import { RewardActions } from "../shared/update-reward-actions/reward-actions.ts";
import { logUserActivity, ActivityPayload } from "../shared/activity-logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
    const { action, lessonId, userId } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (action) {
        case RewardActions.ASK_FOR_NEW_LESSON:
            
            break;
        case RewardActions.COMPLETED_LESSON:
            try {
                // Check if user has already claimed XP for this lesson
                const { data: existingClaim } = await supabase
                    .from('user_lesson_xp_claims')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('lesson_id', lessonId)
                    .single();

                if (existingClaim) {
                    return new Response(JSON.stringify({ 
                        error: "XP already claimed for this lesson" 
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                // Get lesson XP amount
                const { data: lesson } = await supabase
                    .from('user_lessons')
                    .select('xp,title')
                    .eq('id', lessonId)
                    .single();

                if (!lesson) {
                    return new Response(JSON.stringify({ 
                        error: "Lesson not found" 
                    }), {
                        status: 404,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                // Record the XP claim
                await supabase
                    .from('user_lesson_xp_claims')
                    .insert({
                        user_id: userId,
                        lesson_id: lessonId,
                        xp_claimed: lesson.xp
                    });

                // Update user's total XP
                const { error: updateError } = await supabase.rpc('increment_user_xp', {
                    user_id: userId,
                    xp_amount: lesson.xp
                })
        

                if (updateError) {
                    return new Response(JSON.stringify({ 
                        error: "Failed to update user XP" 
                    }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                const activityPayload: ActivityPayload = {
                  type: 'lesson_completion',
                  action: RewardActions.COMPLETED_LESSON,
                  source: 'verify-and-reward',
                  metadata: {
                    lesson_id: lessonId,
                    lesson_title: lesson.title,
                    xp_rewarded: lesson.xp,
                  }
                };
                const activityError = await logUserActivity(supabase, userId, activityPayload);

                if (activityError) {
                    console.error("[verify-and-reward] Error logging activity:", activityError);
                    return new Response(JSON.stringify({ 
                        error: "Failed to log activity" 
                    }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }

                return new Response(JSON.stringify({ 
                    success: true, 
                    xp_awarded: lesson.xp 
                }), {
                    status: 200,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });

            } catch (error) {
                return new Response(JSON.stringify({ 
                    error: "Internal server error" 
                }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        case RewardActions.COMPLETED_QOTD:
            
            break;
        default:
            return new Response(JSON.stringify({ error: "Invalid action" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
    }


})