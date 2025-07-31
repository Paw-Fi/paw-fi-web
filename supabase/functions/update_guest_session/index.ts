import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { sessionId, userId } = await req.json();

    if (!sessionId || !userId) {
      return new Response(
        JSON.stringify({ error: "Session ID and User ID are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update the chat session to associate it with the authenticated user
    const { error: updateSessionError } = await supabase
      .from('chat_sessions')
      .update({ user_id: userId })
      .eq('id', sessionId)
      .is('user_id', null); // Only update if it's currently a guest session

    if (updateSessionError) {
      console.error('Error updating guest session:', updateSessionError);
      return new Response(
        JSON.stringify({ error: "Failed to update session" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Also update any guest courses associated with this session
    const { error: updateCoursesError } = await supabase
      .from('user_courses')
      .update({ 
        user_id: userId,
        session_id: null // Clear session_id since we now have user_id
      })
      .eq('session_id', sessionId)
      .is('user_id', null); // Only update if it's currently a guest course

    if (updateCoursesError) {
      console.error('Error updating guest courses:', updateCoursesError);
      // Don't fail the entire request, just log the error
      // The session update was successful
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in update_guest_session:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
