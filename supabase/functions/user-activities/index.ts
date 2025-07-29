// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { corsHeaders } from '../shared/cors.ts';
import { fetchUserActivitiesFromDB, insertUserActivityToDB, type ActivityData } from '../shared/activity-logger.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
    // Handle CORS preflight OPTIONS request
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        if (req.method === "GET") {
            // Get user ID from query parameters
            const url = new URL(req.url);
            const user_id = url.searchParams.get('user_id');

            if (!user_id) {
                return new Response(JSON.stringify({ 
                    error: "Missing required parameter: user_id" 
                }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Fetch user activities using shared helper
            const result = await fetchUserActivitiesFromDB(supabase, user_id);

            if (!result.success) {
                console.error("[user-activities] Error fetching activities:", result.error);
                return new Response(JSON.stringify({ 
                    error: "Failed to fetch activities" 
                }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ 
                success: true,
                activities: result.activities
            }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });

        } else if (req.method === "POST") {
            const { user_id, activity } = await req.json();
            
            // Validate required parameters
            if (!user_id || !activity) {
                return new Response(JSON.stringify({ 
                    error: "Missing required parameters: user_id and activity are required" 
                }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            // Insert activity record using shared helper
            const insertResult = await insertUserActivityToDB(supabase, user_id, activity as ActivityData);

            if (!insertResult.success) {
                console.error("[user-activities] Error inserting activity:", insertResult.error);
                return new Response(JSON.stringify({ 
                    error: "Failed to log activity" 
                }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ 
                success: true,
                activity_id: insertResult.activity_id
            }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });

        } else {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

    } catch (error) {
        console.error("[user-activities] Error:", error);
        return new Response(JSON.stringify({ 
            error: "Internal server error" 
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
})