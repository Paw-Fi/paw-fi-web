import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";
import { createHouseholdInvite } from "../shared/household-invites.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") || "https://moneko.io";
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resendFrom = Deno.env.get("RESEND_FROM") || "Moneko <no-reply@moneko.io>";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface CreateInviteRequest {
  household_id: string;
  invited_email?: string;
  personal_message?: string;
  inviter_name?: string;
  household_name?: string;
  expires_in_days?: number;
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(
        { error: "No authorization header" },
        401,
        corsHeaders,
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return jsonResponse(
        { error: "Invalid or expired token" },
        401,
        corsHeaders,
      );
    }

    const body: CreateInviteRequest = await req.json();
    const { data: actorProfile, error: actorProfileError } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (actorProfileError) {
      console.error("Failed to load inviter profile:", actorProfileError);
    }

    const inviterName =
      actorProfile?.full_name?.trim() ||
      actorProfile?.email?.split("@")[0] ||
      user.email?.split("@")[0];
    const result = await createHouseholdInvite({
      supabase,
      appUrl,
      resendApiKey,
      resendFrom,
      householdId: body.household_id,
      actorUserId: user.id,
      invitedEmail: body.invited_email,
      personalMessage: body.personal_message,
      inviterName,
      householdName: body.household_name,
      expiresInDays:
        typeof body.expires_in_days === "number" ? body.expires_in_days : 7,
    });

    if (!result.success) {
      return jsonResponse({ error: result.error }, result.status, corsHeaders);
    }

    return jsonResponse(
      {
        invite_url: result.invite_url,
        token: result.token,
        expires_at: result.expires_at,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse(
      { error: "An unexpected error occurred" },
      500,
      corsHeaders,
    );
  }
});

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
