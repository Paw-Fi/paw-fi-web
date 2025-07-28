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

            // Fetch user activities
            const { data: activities, error } = await supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', user_id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("[user-activities] Error fetching activities:", error);
                return new Response(JSON.stringify({ 
                    error: "Failed to fetch activities" 
                }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ 
                success: true,
                activities: activities
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
            console.log("[user-activities] Inserting activity:", activity);

            // Insert activity record
            const { data, error } = await supabase
                .from('user_activities')
                .insert({
                    user_id: user_id,
                    activity: activity
                })
                .select()
                .single();

            if (error) {
                console.error("[user-activities] Error inserting activity:", error);
                return new Response(JSON.stringify({ 
                    error: "Failed to log activity" 
                }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ 
                success: true,
                activity_id: data.id
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