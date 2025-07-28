import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody: string = await req.text();
    let requestData;
    
    try {
      if (!rawBody || rawBody.trim() === "") {
        return new Response(
          JSON.stringify({ error: "Request body is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      requestData = JSON.parse(rawBody);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
          details: { rawBody },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { userId, profileId } = requestData;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Retrieving financial health profile for user:", userId);

    let query = supabaseClient
      .from("financial_health_profiles")
      .select("*")
      .eq("user_id", userId);

    if (profileId) {
      // Get specific profile by ID
      query = query.eq("id", profileId);
    } else {
      // Get the latest profile
      query = query.order("created_at", { ascending: false }).limit(1);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error retrieving profile:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to retrieve profile",
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          profile: null,
          debug: {
            message: "No profile found for this user",
            timestamp: new Date().toISOString(),
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Successfully retrieved profile:", data[0].id);

    return new Response(
      JSON.stringify({
        success: true,
        profile: data[0],
        debug: {
          message: "Profile retrieved successfully",
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );

  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Internal Server Error:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});