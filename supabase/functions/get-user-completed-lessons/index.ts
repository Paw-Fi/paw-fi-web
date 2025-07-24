import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { corsHeaders } from '../shared/cors.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { userId } = await req.json();
        
        if (!userId) {
            return new Response(JSON.stringify({ 
                error: "User ID is required" 
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Get user completed lessons by checking the user_lesson_xp_claims table
        const { data: existingClaims, error } = await supabase
            .from('user_lesson_xp_claims')
            .select(`
                id,
                lesson_id,
                claimed_at
            `)
            .eq('user_id', userId)

        if (error) {
            console.error('Error fetching completed lessons:', error);
            return new Response(JSON.stringify({ 
                error: "Failed to fetch completed lessons" 
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ 
            success: true,
            completed_lessons: existingClaims,
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error('Error in get-user-completed-lessons:', error);
        return new Response(JSON.stringify({ 
            error: "Internal server error" 
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});