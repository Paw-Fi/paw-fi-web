import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface RemindMemberRequest {
  household_id: string;
  target_user_id: string;
  message?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: RemindMemberRequest = await req.json();
    const { household_id, target_user_id, message } = body;

    // Validate required fields
    if (!household_id || !target_user_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: household_id, target_user_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (message != null && message.trim().length > 240) {
      return new Response(
        JSON.stringify({
          error: "Reminder message must be 240 characters or fewer",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Prevent self-reminders
    if (user.id === target_user_id) {
      return new Response(
        JSON.stringify({ error: "Cannot send reminder to yourself" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify both users are members of the household
    const { data: senderMember } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: targetMember } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", household_id)
      .eq("user_id", target_user_id)
      .maybeSingle();

    if (!senderMember || !targetMember) {
      return new Response(
        JSON.stringify({
          error: "Both users must be members of the household",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get sender and household information
    const { data: senderUser } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const { data: household } = await supabase
      .from("households")
      .select("name")
      .eq("id", household_id)
      .single();

    const senderName =
      senderUser?.full_name || senderUser?.email?.split("@")[0] || "A member";
    const householdName = household?.name || "your household";

    const { data: reminderResult, error: notificationError } =
      await supabase.rpc("create_member_reminder_event", {
        p_household_id: household_id,
        p_sender_id: user.id,
        p_target_user_id: target_user_id,
        p_payload: {
          sender_id: user.id,
          sender_name: senderName,
          household_name: householdName,
          message: message?.trim() || null,
        },
      });

    if (notificationError) {
      console.error(
        "[remind-member] Error creating notification:",
        notificationError,
      );
      return new Response(
        JSON.stringify({ error: "Failed to create notification" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (reminderResult?.created !== true) {
      const cooldownEndsAt = reminderResult?.cooldown_ends_at;
      const hoursLeft = cooldownEndsAt
        ? Math.max(
            1,
            Math.ceil(
              (new Date(cooldownEndsAt).getTime() - Date.now()) /
                (1000 * 60 * 60),
            ),
          )
        : 24;
      return new Response(
        JSON.stringify({
          error: `Please wait ${hoursLeft} hour(s) before sending another reminder`,
          cooldown_ends_at: cooldownEndsAt,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const notificationId = reminderResult.event_id as string;

    console.log("[remind-member] Notification created:", {
      id: notificationId,
      from: user.id,
      to: target_user_id,
      household: household_id,
    });

    // The database webhook will trigger the push notification function automatically
    // No need to manually invoke it here

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notificationId,
        message: "Reminder sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[remind-member] Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
