// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { corsHeaders } from '../shared/cors.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
    // Handle CORS preflight OPTIONS request
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {     
        const { user_id } = await req.json();

        if (!user_id) {
            return new Response(JSON.stringify({ 
                error: "Missing required parameter: user_id" 
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: user, error } = await supabase
            .from('users')
            .select('total_xp')
            .eq('id', user_id)
            .single();

        if (error) {
            console.error("[get-user-xp] Error fetching user:", error);
            return new Response(JSON.stringify({ 
                error: "Failed to fetch user data" 
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!user) {
            return new Response(JSON.stringify({ 
                error: "User not found" 
            }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

    

        return new Response(JSON.stringify({ 
            success: true,
            total_xp: user.total_xp,
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("[get-user-xp] Error:", error);
        return new Response(JSON.stringify({ 
            error: "Internal server error" 
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});