import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface ValidateInviteRequest {
  token: string;
}

interface ValidateInviteResponse {
  valid: boolean;
  household?: {
    id: string;
    name: string;
    cover_image_url?: string | null; // Changed from emoji
    is_portfolio?: boolean | null;
  };
  inviter?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string | null;
  };
  expires_at?: string;
  status?: string;
  invite?: {
    personal_message?: string | null;
  };
  error?: string;
  error_code?:
    | "EXPIRED"
    | "REVOKED"
    | "ACCEPTED"
    | "NOT_FOUND"
    | "ALREADY_MEMBER";
}

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Allow both GET and POST
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get token from body (POST) or query params (GET)
    let token: string | null = null;

    if (req.method === "POST") {
      const body: ValidateInviteRequest = await req.json();
      token = body.token;
    } else {
      const url = new URL(req.url);
      token = url.searchParams.get("token");
    }

    if (!token) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Token is required",
          error_code: "NOT_FOUND",
        } as ValidateInviteResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select(
        `
        id,
        household_id,
        inviter_id,
        invited_user_id,
        status,
        expires_at,
        personal_message,
          households:household_id (
          id,
          name,
          cover_image_url,
          is_portfolio
        )
      `,
      )
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Invalid invitation token",
          error_code: "NOT_FOUND",
        } as ValidateInviteResponse),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if invite is already accepted
    if (invite.status === "accepted") {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "This invitation has already been accepted",
          error_code: "ACCEPTED",
          status: invite.status,
        } as ValidateInviteResponse),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if invite is revoked
    if (invite.status === "revoked") {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "This invitation has been revoked",
          error_code: "REVOKED",
          status: invite.status,
        } as ValidateInviteResponse),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check if invite is expired (null = unlimited)
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from("invites")
        .update({ status: "expired" })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({
          valid: false,
          error: "This invitation has expired",
          error_code: "EXPIRED",
          status: "expired",
          expires_at: invite.expires_at,
        } as ValidateInviteResponse),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If user is authenticated, check if they're already a member
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const {
        data: { user },
      } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

      if (user) {
        const { data: existingMember } = await supabase
          .from("household_members")
          .select("id")
          .eq("household_id", invite.household_id)
          .eq("user_id", user.id)
          .single();

        if (existingMember) {
          return new Response(
            JSON.stringify({
              valid: false,
              error: "You are already a member of this household",
              error_code: "ALREADY_MEMBER",
            } as ValidateInviteResponse),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    // User-visible inviter details come exclusively from the profile record.
    const { data: inviterProfile } = await supabase
      .from("users")
      .select("email, full_name, avatar_url")
      .eq("id", invite.inviter_id)
      .maybeSingle();

    // Invitation is valid
    const response: ValidateInviteResponse = {
      valid: true,
      household: invite.households as any,
      inviter: inviterProfile
        ? {
            id: invite.inviter_id,
            email: inviterProfile.email || "",
            full_name: inviterProfile.full_name || undefined,
            avatar_url: inviterProfile.avatar_url || null,
          }
        : undefined,
      expires_at: invite.expires_at,
      status: invite.status,
      invite: {
        personal_message: invite.personal_message ?? null,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: "An unexpected error occurred",
      } as ValidateInviteResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
