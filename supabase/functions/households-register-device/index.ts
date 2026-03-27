import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface RegisterDeviceRequest {
  platform: "ios" | "android" | "web";
  push_token: string;
  device_model?: string;
  os_version?: string;
  app_version?: string;
  locale?: string;
  timezone?: string;
  is_active?: boolean; // optional: allow deactivation on logout
  delete_device?: boolean; // optional: explicitly delete device on logout
}

interface RegisterDeviceResponse {
  success: boolean;
  device_id?: string;
  error?: string;
}

serve(async (req: Request) => {
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

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the user from the JWT token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const body: RegisterDeviceRequest = await req.json();
    const {
      platform,
      push_token,
      device_model,
      os_version,
      app_version,
      locale = "en",
      timezone,
      is_active,
      delete_device,
    } = body;

    const normalizedPushToken = push_token?.trim();

    // Validate required fields
    if (!normalizedPushToken) {
      return new Response(JSON.stringify({ error: "push_token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // When activating/registering a device we need platform; when deactivating we don't
    if ((is_active === undefined || is_active === true) && !platform) {
      return new Response(
        JSON.stringify({
          error: "platform is required when registering/activating a device",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (platform && !["ios", "android", "web"].includes(platform)) {
      return new Response(
        JSON.stringify({ error: "platform must be ios, android, or web" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Handle device deletion (logout scenario)
    if (delete_device === true) {
      const { error: deleteError } = await supabase
        .from("devices")
        .delete()
        .eq("user_id", user.id)
        .eq("push_token", normalizedPushToken);

      if (deleteError) {
        console.error("Error deleting device:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to delete device" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Device deleted successfully",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Upsert device (idempotent operation)
    // Security/lifecycle guard: a push token should belong to exactly one user
    // at a time. If the same device changes account, reclaim token ownership
    // for the current user to prevent cross-account notification leakage.
    const { error: reclaimError } = await supabase
      .from("devices")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("push_token", normalizedPushToken)
      .neq("user_id", user.id);

    if (reclaimError) {
      console.error("Error reclaiming token ownership:", reclaimError);
      return new Response(
        JSON.stringify({ error: "Failed to reclaim device token" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If device with same user_id and push_token exists, update it
    // Otherwise, create new device
    const { data: existingDevice } = await supabase
      .from("devices")
      .select("id")
      .eq("user_id", user.id)
      .eq("push_token", normalizedPushToken)
      .maybeSingle();

    let deviceId: string;

    if (existingDevice) {
      // Update existing device
      const { data, error: updateError } = await supabase
        .from("devices")
        .update({
          platform: platform ?? undefined,
          device_model,
          os_version,
          app_version,
          locale,
          timezone,
          is_active: is_active === false ? false : true,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existingDevice.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating device:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update device" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      deviceId = data.id;
    } else {
      // Create new device
      const { data, error: insertError } = await supabase
        .from("devices")
        .insert({
          user_id: user.id,
          platform,
          push_token: normalizedPushToken,
          device_model,
          os_version,
          app_version,
          locale,
          timezone,
          is_active: is_active === false ? false : true,
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating device:", insertError);

        // Check if it's a unique constraint violation
        if (insertError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "Device already registered" }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({ error: "Failed to register device" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      deviceId = data.id;
    }

    const response: RegisterDeviceResponse = {
      success: true,
      device_id: deviceId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
