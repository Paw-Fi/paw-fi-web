/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { authenticateUser } from "../shared/auth.ts";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  classifyNotificationOutcome,
  getFirebaseConfigurationHealth,
  getNotificationHealthStatus,
  type NotificationOutcome,
} from "../shared/creator-notification-health.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const firebaseServiceAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const recentWindowHours = 24;
const recentSampleLimit = 100;
const responseCacheTtlMs = 30_000;
const responseCache = new Map<
  string,
  { expiresAt: number; body: Record<string, unknown> }
>();

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = getCorsHeaders(origin);

  if (/^http:\/\/(www\.)?moneko\.io$/i.test(origin)) {
    return jsonResponse({ error: "HTTPS required" }, 403, {});
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Server not configured" }, 500, corsHeaders);
  }

  const auth = await authenticateUser(req, supabase);
  if (!auth.success || !auth.userId) {
    return jsonResponse(
      { error: auth.error ?? "Unauthorized" },
      auth.statusCode ?? 401,
      corsHeaders,
    );
  }

  const creatorCheck = await supabase
    .from("users")
    .select("is_creator")
    .eq("id", auth.userId)
    .maybeSingle();

  if (creatorCheck.error) {
    return jsonResponse(
      { error: "Unable to verify creator access" },
      500,
      corsHeaders,
    );
  }
  if (!creatorCheck.data?.is_creator) {
    return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
  }

  const cached = responseCache.get(auth.userId);
  if (cached && cached.expiresAt > Date.now()) {
    return jsonResponse(cached.body, 200, corsHeaders);
  }
  if (cached) responseCache.delete(auth.userId);

  const now = new Date();
  const recentSince = new Date(
    now.getTime() - recentWindowHours * 60 * 60 * 1000,
  ).toISOString();
  const fallbackReadyBefore = new Date(
    now.getTime() - 10 * 60 * 1000,
  ).toISOString();
  const staleClaimBefore = new Date(
    now.getTime() - 15 * 60 * 1000,
  ).toISOString();

  const [
    unsentResult,
    fallbackReadyResult,
    staleClaimsResult,
    oldestPendingResult,
    recentEventsResult,
    recentUnsentIssuesResult,
    recentPartialFailuresResult,
    recentFallbackPartialFailuresResult,
    totalDevicesResult,
    activeDevicesResult,
    iosDevicesResult,
    activeIosDevicesResult,
    androidDevicesResult,
    activeAndroidDevicesResult,
    webDevicesResult,
    activeWebDevicesResult,
  ] = await Promise.all([
    supabase
      .from("notification_events")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("is_sent", false),
    supabase
      .from("notification_events")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("is_sent", false)
      .is("processing_started_at", null)
      .not("fallback_eligible_at", "is", null)
      .lte("fallback_eligible_at", fallbackReadyBefore),
    supabase
      .from("notification_events")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("is_sent", false)
      .not("processing_started_at", "is", null)
      .lte("processing_started_at", staleClaimBefore),
    supabase
      .from("notification_events")
      .select("created_at")
      .eq("is_sent", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notification_events")
      .select(
        "event_type,is_sent,created_at,sent_at,retry_count,processing_started_at,delivery_error,error_message",
      )
      .gte("created_at", recentSince)
      .order("created_at", {
        ascending: false,
      })
      .limit(recentSampleLimit),
    supabase
      .from("notification_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", recentSince)
      .eq("is_sent", false)
      .or("delivery_error.not.is.null,error_message.not.is.null"),
    supabase
      .from("notification_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", recentSince)
      .eq("is_sent", true)
      .ilike("delivery_error", "Sent to %/% devices"),
    supabase
      .from("notification_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", recentSince)
      .eq("is_sent", true)
      .ilike("error_message", "Failed to send to % devices"),
    deviceCountQuery(),
    activeDeviceCountQuery(),
    deviceCountQuery("ios"),
    activeDeviceCountQuery("ios"),
    deviceCountQuery("android"),
    activeDeviceCountQuery("android"),
    deviceCountQuery("web"),
    activeDeviceCountQuery("web"),
  ]);

  const queryResults = [
    unsentResult,
    fallbackReadyResult,
    staleClaimsResult,
    oldestPendingResult,
    recentEventsResult,
    recentUnsentIssuesResult,
    recentPartialFailuresResult,
    recentFallbackPartialFailuresResult,
    totalDevicesResult,
    activeDevicesResult,
    iosDevicesResult,
    activeIosDevicesResult,
    androidDevicesResult,
    activeAndroidDevicesResult,
    webDevicesResult,
    activeWebDevicesResult,
  ];
  const databaseReady = queryResults.every((result) => !result.error);
  const firebase = getFirebaseConfigurationHealth(
    firebaseServiceAccount,
    firebaseProjectId,
  );

  const recentEvents = databaseReady ? (recentEventsResult.data ?? []) : [];
  const outcomes = createOutcomeCounts(recentEvents);
  const eventTypes = createEventTypeCounts(recentEvents);
  const fallbackReadyCount = fallbackReadyResult.count ?? 0;
  const staleClaimCount = staleClaimsResult.count ?? 0;
  const recentFailureCount = (recentUnsentIssuesResult.count ?? 0) +
    (recentPartialFailuresResult.count ?? 0) +
    (recentFallbackPartialFailuresResult.count ?? 0);
  const status = getNotificationHealthStatus({
    databaseReady,
    firebaseReady: firebase.status === "ready",
    fallbackReadyCount,
    staleClaimCount,
    recentFailureCount,
  });

  const responseBody: Record<string, unknown> = {
    success: true,
    generatedAt: now.toISOString(),
    status,
    scope: {
      recentWindowHours,
      recentSampleLimit,
      sampledEvents: recentEvents.length,
    },
    checks: {
      database: { status: databaseReady ? "ready" : "unavailable" },
      firebase,
    },
    queue: {
      unsent: databaseReady ? (unsentResult.count ?? 0) : null,
      fallbackReady: databaseReady ? fallbackReadyCount : null,
      staleClaims: databaseReady ? staleClaimCount : null,
      oldestPendingAgeMinutes: databaseReady
        ? ageInMinutes(oldestPendingResult.data?.created_at, now)
        : null,
    },
    outcomes: databaseReady ? outcomes : null,
    devices: databaseReady
      ? {
        total: totalDevicesResult.count ?? 0,
        active: activeDevicesResult.count ?? 0,
        inactive: Math.max(
          (totalDevicesResult.count ?? 0) - (activeDevicesResult.count ?? 0),
          0,
        ),
        byPlatform: {
          ios: deviceCounts(
            iosDevicesResult.count,
            activeIosDevicesResult.count,
          ),
          android: deviceCounts(
            androidDevicesResult.count,
            activeAndroidDevicesResult.count,
          ),
          web: deviceCounts(
            webDevicesResult.count,
            activeWebDevicesResult.count,
          ),
        },
      }
      : null,
    eventTypes: databaseReady ? eventTypes : [],
    limitations: [
      "Recorded sent means accepted by the provider workflow, not confirmed on-device delivery.",
      "Recent outcome and event-type data is a bounded sample from the last 24 hours.",
    ],
  };
  responseCache.set(auth.userId, {
    expiresAt: Date.now() + responseCacheTtlMs,
    body: responseBody,
  });
  return jsonResponse(responseBody, 200, corsHeaders);
});

function deviceCountQuery(platform?: "ios" | "android" | "web") {
  let query = supabase.from("devices").select("*", {
    count: "exact",
    head: true,
  });
  if (platform) query = query.eq("platform", platform);
  return query;
}

function activeDeviceCountQuery(platform?: "ios" | "android" | "web") {
  let query = supabase
    .from("devices")
    .select("*", {
      count: "exact",
      head: true,
    })
    .or("is_active.is.true,is_active.is.null");
  if (platform) query = query.eq("platform", platform);
  return query;
}

function createOutcomeCounts(events: Array<Record<string, unknown>>) {
  const counts: Record<NotificationOutcome, number> = {
    recorded_sent: 0,
    partial: 0,
    skipped: 0,
    processing: 0,
    retrying: 0,
    pending: 0,
  };
  for (const event of events) {
    counts[classifyNotificationOutcome(event)] += 1;
  }
  return counts;
}

function createEventTypeCounts(events: Array<Record<string, unknown>>) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const eventType = typeof event.event_type === "string"
      ? event.event_type
      : "unknown";
    counts.set(eventType, (counts.get(eventType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((left, right) => right.count - left.count);
}

function deviceCounts(total?: number | null, active?: number | null) {
  const totalCount = total ?? 0;
  const activeCount = active ?? 0;
  return {
    total: totalCount,
    active: activeCount,
    inactive: Math.max(totalCount - activeCount, 0),
  };
}

function ageInMinutes(value: string | null | undefined, now: Date) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 60000));
}

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
