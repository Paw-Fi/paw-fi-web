/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  buildBudgetNudgeData,
  isServiceRoleRequest,
} from "../shared/notification-delivery.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

// Firebase Cloud Messaging V1 API - Modern approach (2025)
// Requires Service Account JSON from Firebase Console
const firebaseServiceAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type NudgeType = "warn" | "alert";

interface SendNudgeRequest {
  household_id: string;
  budget_id: string;
  nudge_type: NudgeType;
  currency: string;
  spent_cents: number;
  budget_cents: number;
  percentage_used: number;
}

interface SendNudgeResponse {
  success: boolean;
  sent_count: number;
  failed_count: number;
  error?: string;
}

/**
 * Get OAuth 2.0 access token using Service Account credentials
 * Firebase Cloud Messaging API V1 requires OAuth tokens, not legacy server keys
 * Token is valid for 1 hour and should be cached
 */
async function getAccessToken(): Promise<string | null> {
  if (!firebaseServiceAccount) {
    console.warn("[fcm-v1] FIREBASE_SERVICE_ACCOUNT_JSON not configured");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(firebaseServiceAccount);

    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: serviceAccount.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    };

    const encoder = new TextEncoder();
    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const encodedClaims = btoa(JSON.stringify(claims))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const unsignedToken = `${encodedHeader}.${encodedClaims}`;

    const privateKeyPem = serviceAccount.private_key;
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKeyPem
      .substring(pemHeader.length, privateKeyPem.length - pemFooter.length)
      .replace(/\s/g, "");

    const binaryKey = Uint8Array.from(atob(pemContents), (c) =>
      c.charCodeAt(0),
    );

    const key = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      encoder.encode(unsignedToken),
    );

    const encodedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signature)),
    )
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const jwt = `${unsignedToken}.${encodedSignature}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("[fcm-v1] Token exchange failed:", error);
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("[fcm-v1] Error getting access token:", error);
    return null;
  }
}

/**
 * Send push notification using Firebase Cloud Messaging API V1
 * Modern API endpoint: https://fcm.googleapis.com/v1/projects/{project_id}/messages:send
 */
async function sendFCMv1Notification(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
  accessToken: string,
): Promise<boolean> {
  if (!firebaseProjectId) {
    console.error("[fcm-v1] FIREBASE_PROJECT_ID not configured");
    return false;
  }

  try {
    const message = {
      message: {
        token: deviceToken,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      },
    );

    if (response.ok) {
      console.log("[fcm-v1] Push notification sent successfully");
      return true;
    } else {
      const errorText = await response.text();
      console.error("[fcm-v1] FCM API error:", response.status, errorText);

      if (
        errorText.includes("UNREGISTERED") ||
        errorText.includes("INVALID_ARGUMENT")
      ) {
        console.warn(
          "[fcm-v1] Invalid or expired device token - should be cleaned up",
        );
      }

      return false;
    }
  } catch (error) {
    console.error("[fcm-v1] Error sending notification:", error);
    return false;
  }
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

    if (!isServiceRoleRequest(req, supabaseServiceRoleKey, supabaseSecretKeys)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId: string | null = null;

    // Parse request body
    const requestBody: SendNudgeRequest = await req.json();
    const {
      household_id,
      budget_id,
      nudge_type,
      currency,
      spent_cents,
      budget_cents,
      percentage_used,
    } = requestBody;

    if (
      !household_id ||
      !budget_id ||
      !currency ||
      (nudge_type !== "warn" && nudge_type !== "alert") ||
      !Number.isFinite(spent_cents) ||
      !Number.isFinite(budget_cents) ||
      !Number.isFinite(percentage_used)
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check rate limiting: don't send same nudge type for same budget within 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const eventType = nudge_type === "warn" ? "budget_warn" : "budget_alert";

    const { data: recentEvent } = await supabase
      .from("notification_events")
      .select("sent_at")
      .eq("household_id", household_id)
      .eq("event_type", eventType)
      .contains("payload", { budget_id })
      .gte("sent_at", oneDayAgo)
      .eq("is_sent", true)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentEvent) {
      console.log(
        `Rate limit: ${nudge_type} nudge for household ${household_id} was sent within last 24h`,
      );
      return new Response(
        JSON.stringify({
          success: false,
          sent_count: 0,
          failed_count: 0,
          error: `Rate limit: ${nudge_type} nudge was sent within last 24 hours`,
        } as SendNudgeResponse),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get household details
    const { data: household } = await supabase
      .from("households")
      .select("name")
      .eq("id", household_id)
      .single();

    if (!household) {
      return new Response(JSON.stringify({ error: "Household not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all household members with their sharing preferences
    const { data: members } = await supabase
      .from("household_members")
      .select(
        `
        user_id,
        sharing_prefs (
          enable_nudges,
          nudge_quiet_hours_start,
          nudge_quiet_hours_end
        )
      `,
      )
      .eq("household_id", household_id);

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, failed_count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Filter members who have nudges enabled and are not in quiet hours
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const eligibleMembers = members.filter((member) => {
      const prefs = Array.isArray(member.sharing_prefs)
        ? member.sharing_prefs[0]
        : member.sharing_prefs;

      // Check if nudges are enabled (default: true)
      if (prefs && prefs.enable_nudges === false) {
        return false;
      }

      // Check quiet hours
      if (
        prefs &&
        prefs.nudge_quiet_hours_start &&
        prefs.nudge_quiet_hours_end
      ) {
        const [startHour, startMinute] = prefs.nudge_quiet_hours_start
          .split(":")
          .map(Number);
        const [endHour, endMinute] = prefs.nudge_quiet_hours_end
          .split(":")
          .map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        // Handle quiet hours that span midnight
        if (startMinutes > endMinutes) {
          // Quiet hours like 22:00 - 08:00
          if (
            currentTimeMinutes >= startMinutes ||
            currentTimeMinutes <= endMinutes
          ) {
            return false; // In quiet hours
          }
        } else {
          // Quiet hours like 13:00 - 14:00
          if (
            currentTimeMinutes >= startMinutes &&
            currentTimeMinutes <= endMinutes
          ) {
            return false; // In quiet hours
          }
        }
      }

      return true;
    });

    // Get active devices for eligible members
    const memberUserIds = eligibleMembers.map((m) => m.user_id);

    const { data: devices } = await supabase
      .from("devices")
      .select("user_id, push_token, platform")
      .in("user_id", memberUserIds)
      .or("is_active.is.true,is_active.is.null");

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, failed_count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Determine nudge message based on type
    let title: string;
    let body: string;
    let emoji: string;

    if (nudge_type === "warn") {
      title = "Budget Boop! 🐾";
      emoji = "⚠️";
      body = `"${household.name}" has used ${percentage_used.toFixed(0)}% of your ${currency} budget. Gentle reminder to keep an eye on spending!`;
    } else {
      title = "Purr-suasive Nudge! 😸";
      emoji = "🚨";
      body = `"${household.name}" has reached ${percentage_used.toFixed(0)}% of your ${currency} budget. Time to pause and review!`;
    }

    // Get OAuth access token for FCM V1 API
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error("[send-nudge] Failed to obtain FCM access token");
      return new Response(
        JSON.stringify({
          success: false,
          sent_count: 0,
          failed_count: 0,
          error: "Failed to authenticate with Firebase",
        } as SendNudgeResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Send push notifications using FCM V1 API
    let sentCount = 0;
    let failedCount = 0;

    const pushPromises = devices.map(async (device) => {
      const success = await sendFCMv1Notification(
        device.push_token,
        title,
        body,
        buildBudgetNudgeData({
          nudgeType: nudge_type,
          householdId: household_id,
          budgetId: budget_id,
          currency,
          spentCents: spent_cents,
          budgetCents: budget_cents,
          percentageUsed: percentage_used,
        }),
        accessToken,
      );

      return { device, success };
    });

    const results = await Promise.allSettled(pushPromises);

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    // Create notification event
    await supabase.from("notification_events").insert({
      household_id,
      user_id: userId,
      event_type: nudge_type === "warn" ? "budget_warn" : "budget_alert",
      payload: {
        budget_id,
        currency,
        spent_cents,
        budget_cents,
        percentage_used,
        sent_count: sentCount,
        failed_count: failedCount,
      },
      is_sent: sentCount > 0,
      sent_at: sentCount > 0 ? new Date().toISOString() : null,
    });

    const response: SendNudgeResponse = {
      success: sentCount > 0,
      sent_count: sentCount,
      failed_count: failedCount,
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
