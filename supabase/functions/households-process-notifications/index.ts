import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";
import { buildLogExpenseReminderMessage } from "../shared/log-expense-reminder.ts";
import { getLocalTimeMinutes, isInQuietHours } from "../shared/timezone.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const iosBundleId = Deno.env.get("IOS_BUNDLE_ID") || "com.moneko.mobile";

// Firebase Cloud Messaging V1 API - Modern approach (2025)
// Requires Service Account JSON from Firebase Console
const firebaseServiceAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const firebaseProjectIdEnv = firebaseProjectId || "";

function redact(v?: string) {
  if (!v) return v;
  if (v.length <= 6) return "***";
  return v.slice(0, 4) + "***" + v.slice(-4);
}

function getServiceAccountMeta() {
  try {
    if (!firebaseServiceAccount) return null;
    const sa = JSON.parse(firebaseServiceAccount);
    return {
      project_id: sa.project_id as string | undefined,
      client_email: sa.client_email as string | undefined,
      private_key_id: sa.private_key_id as string | undefined,
    };
  } catch {
    return null;
  }
}

interface ProcessNotificationsResponse {
  success: boolean;
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
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

    let privateKeyPem: string = serviceAccount.private_key as string;
    if (!privateKeyPem) {
      console.error("[fcm-v1] Service account missing private_key");
      return null;
    }
    privateKeyPem = privateKeyPem.replace(/\\n/g, "\n").trim();
    const match = privateKeyPem.match(
      /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/,
    );
    if (!match || !match[1]) {
      console.error("[fcm-v1] Invalid private key format");
      return null;
    }
    const pemBody = match[1].replace(/\r|\n/g, "");
    const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

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
  imageUrl?: string,
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
          ...(imageUrl ? { image: imageUrl } : {}),
        },
        data,
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
        apns: {
          headers: {
            "apns-topic": iosBundleId,
            "apns-push-type": "alert",
            "apns-priority": "10",
          },
          payload: {
            aps: {
              sound: "default",
              ...(imageUrl ? { ["mutable-content"]: 1 } : {}),
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
      if (response.status === 401 && errorText.includes("APNS")) {
        console.error(
          "[fcm-v1] Hint: Verify APNs auth key (p8) + Key ID + Team ID, bundle id/topic",
          iosBundleId,
          "and iOS entitlements (aps-environment). Ensure the device token belongs to this Firebase project.",
        );
      }

      if (
        errorText.includes("UNREGISTERED") ||
        errorText.includes("INVALID_ARGUMENT")
      ) {
        console.warn("[fcm-v1] Invalid or expired device token - deactivating");
        try {
          await supabase
            .from("devices")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("push_token", deviceToken);
        } catch (e) {
          console.error("[fcm-v1] Failed to deactivate device token:", e);
        }
      }

      return false;
    }
  } catch (error) {
    console.error("[fcm-v1] Error sending notification:", error);
    return false;
  }
}

/**
 * Process unsent notification events and send push notifications
 *
 * This function:
 * 1. Fetches unsent notification_events (created in last 24h)
 * 2. Gets active devices for target users
 * 3. Respects user preferences (quiet hours, nudge opt-out)
 * 4. Sends push notifications via FCM
 * 5. Updates events as sent/failed
 *
 * Can be called:
 * - Manually via POST for testing
 * - Via pg_cron scheduler (every 5 minutes)
 * - Via webhook/trigger on notification_events insert
 */
serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Allow POST and GET (for cron/webhooks)
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // This can be called by service role, cron, or authenticated users (for testing)
    const authHeader = req.headers.get("Authorization");
    let isServiceRole = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      isServiceRole = token === supabaseServiceRoleKey;

      if (!isServiceRole) {
        // Verify user auth (allow for manual testing)
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Invalid or expired token" }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    // Fetch unsent notification events from last 24 hours
    // This prevents infinite retries on permanently failed notifications
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: unsentEvents, error: eventsError } = await supabase
      .from("notification_events")
      .select("*")
      .eq("is_sent", false)
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: true })
      .limit(100); // Process max 100 at a time to avoid timeouts

    if (eventsError) {
      console.error("Error fetching unsent events:", eventsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notification events" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!unsentEvents || unsentEvents.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          sent: 0,
          failed: 0,
          errors: [],
        } as ProcessNotificationsResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get OAuth access token for FCM V1 API (valid for 1 hour)
    const saMeta = getServiceAccountMeta();
    console.log("[process-notifications] Config diag", {
      firebaseProjectId: firebaseProjectIdEnv,
      serviceAccountProjectId: saMeta?.project_id,
      serviceAccountEmail: redact(saMeta?.client_email),
      serviceAccountKeyId: redact(saMeta?.private_key_id),
      apnsTopic: iosBundleId,
    });
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error(
        "[process-notifications] Failed to obtain FCM access token",
      );
      return new Response(
        JSON.stringify({
          success: false,
          processed: 0,
          sent: 0,
          failed: 0,
          errors: ["Failed to authenticate with Firebase"],
        } as ProcessNotificationsResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Process each event
    for (const event of unsentEvents) {
      try {
        // Determine notification content based on event type
        let title: string;
        let body: string;
        let targetUserId: string | null = event.user_id;
        let messageData: Record<string, string> = {};
        const payloadExpenseData =
          event.payload?.expense_data &&
          typeof event.payload.expense_data === "object" &&
          !Array.isArray(event.payload.expense_data)
            ? event.payload.expense_data
            : {};
        const isRecurringEvent =
          event.payload?.is_recurring === true ||
          payloadExpenseData.is_recurring === true;

        switch (event.event_type) {
          case "invite_sent":
            // Skip - invites are handled via email, not push
            continue;

          case "invite_accepted":
          case "member_joined":
            title = "🎉 New Member!";
            body = `Someone just joined your household "${event.payload.household_name || "household"}"`;
            // Target all household members except the joiner
            targetUserId = null; // Will broadcast to all members
            break;

          case "member_left":
          case "member_removed":
            title = "👋 Member Left";
            body = `A member has left "${event.payload.household_name || "household"}"`;
            targetUserId = null; // Broadcast to remaining members
            break;

          case "split_created":
            title = "💰 New Expense Split";
            body = `A new expense has been split in "${event.payload.household_name || "household"}"`;
            targetUserId = null; // Broadcast to all members
            break;

          case "split_settled":
            title = "✅ Split Settled";
            body = `An expense split has been marked as settled`;
            break;

          case "expense_added":
            {
              const batchCount = Number(event.payload?.batch_count ?? 0);
              const recurringCount = Number(
                event.payload?.recurring_count ?? 0,
              );
              const isRecurring = isRecurringEvent;
              if (batchCount > 1) {
                title = "💸 Expenses Added";
                const recurringSuffix =
                  recurringCount > 0
                    ? recurringCount === batchCount
                      ? " (all recurring)"
                      : ` (${recurringCount} recurring)`
                    : "";
                body = `${batchCount} expenses were added in your household${recurringSuffix}`;
              } else {
                title = isRecurring
                  ? "🔁 New Recurring Expense Added"
                  : "💸 New Expense Added";
                body = isRecurring
                  ? `A new recurring expense was added in your household`
                  : `A new expense was added in your household`;
              }
            }
            targetUserId = null; // Broadcast to all members except actor
            break;

          case "expense_edited":
            if (isRecurringEvent) {
              title = "🔁 Recurring Expense Updated";
              body = `A recurring expense was modified in your household`;
            } else {
              title = "✏️ Expense Updated";
              body = `An expense was modified in your household`;
            }
            targetUserId = null; // Broadcast to all members except actor
            break;

          case "expense_deleted":
            {
              const batchCount = Number(event.payload?.batch_count ?? 0);
              const recurringCount = Number(
                event.payload?.recurring_count ?? 0,
              );
              const isRecurring = isRecurringEvent;
              if (batchCount > 1) {
                title = "🗑️ Expenses Deleted";
                const recurringSuffix =
                  recurringCount > 0
                    ? recurringCount === batchCount
                      ? " (all recurring)"
                      : ` (${recurringCount} recurring)`
                    : "";
                body = `${batchCount} expenses were deleted in your household${recurringSuffix}`;
              } else {
                title = isRecurring
                  ? "🔁 Recurring Expense Deleted"
                  : "🗑️ Expense Deleted";
                body = isRecurring
                  ? `A recurring expense was deleted in your household`
                  : `An expense was deleted in your household`;
              }
            }
            targetUserId = null; // Broadcast to all members except actor
            break;

          case "income_added": {
            const batchCount = Number(event.payload?.batch_count ?? 0);
            const recurringCount = Number(event.payload?.recurring_count ?? 0);
            const isRecurring = isRecurringEvent;
            if (batchCount > 1) {
              title = "💰 Income Added";
              const recurringSuffix =
                recurringCount > 0
                  ? recurringCount === batchCount
                    ? " (all recurring)"
                    : ` (${recurringCount} recurring)`
                  : "";
              body = `${batchCount} income entries were added in your household${recurringSuffix}`;
            } else {
              title = isRecurring
                ? "🔁 Recurring Income Added"
                : "💰 Income Added";
              body = isRecurring
                ? `A new recurring income entry was added in your household`
                : `A new income entry was added in your household`;
            }
            targetUserId = null; // Broadcast to all members except actor
            break;
          }

          case "income_edited":
            if (isRecurringEvent) {
              title = "🔁 Recurring Income Updated";
              body = `A recurring income entry was modified in your household`;
            } else {
              title = "✏️ Income Updated";
              body = `An income entry was modified in your household`;
            }
            targetUserId = null; // Broadcast to all members except actor
            break;

          case "log_expense_reminder": {
            const reminderMessage = buildLogExpenseReminderMessage(
              event.payload ?? {},
            );
            title = reminderMessage.title;
            body = reminderMessage.body;
            messageData = reminderMessage.data;
            break;
          }

          case "budget_warn":
          case "budget_alert":
            // These are handled by households-send-nudge, skip
            continue;

          case "invite_revoked":
            // Skip - no push needed for revocations
            continue;

          default:
            console.warn(`Unknown event type: ${event.event_type}`);
            continue;
        }

        // Get target users
        let userIds: string[] = [];

        if (targetUserId) {
          // Single user notification
          userIds = [targetUserId];
        } else if (event.household_id) {
          // Household-wide notification
          const { data: members } = await supabase
            .from("household_members")
            .select("user_id")
            .eq("household_id", event.household_id);

          if (members) {
            userIds = members.map((m) => m.user_id);

            // Exclude the user who triggered the event (if in payload)
            if (event.payload.triggered_by_user_id) {
              userIds = userIds.filter(
                (id) => id !== event.payload.triggered_by_user_id,
              );
            }
          }
        }

        if (userIds.length === 0) {
          // Mark as sent (but skipped) to prevent reprocessing
          await supabase
            .from("notification_events")
            .update({
              is_sent: true,
              sent_at: new Date().toISOString(),
              error_message: "No target users found",
            })
            .eq("id", event.id);
          continue;
        }

        // Check quiet hours for each user and get their devices
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;

        // Get sharing preferences for all target users
        const { data: preferences } = await supabase
          .from("sharing_prefs")
          .select(
            "user_id, enable_nudges, nudge_quiet_hours_start, nudge_quiet_hours_end",
          )
          .in("user_id", userIds);

        const isImmediateTransactionEvent =
          event.event_type === "expense_added" ||
          event.event_type === "expense_edited" ||
          event.event_type === "expense_deleted" ||
          event.event_type === "income_added" ||
          event.event_type === "income_edited";
        const isLogExpenseReminder =
          event.event_type === "log_expense_reminder";

        // Filter users by quiet hours (skip for immediate transaction events)
        const eligibleUserIds = userIds.filter((userId) => {
          const prefs = preferences?.find((p) => p.user_id === userId);

          // Check if notifications are enabled
          if (
            !isImmediateTransactionEvent &&
            prefs &&
            prefs.enable_nudges === false
          ) {
            return false;
          }

          // Check quiet hours unless immediate transaction event
          if (!isImmediateTransactionEvent) {
            if (isLogExpenseReminder) {
              const quietStart = Number.isFinite(
                Number(event.payload?.quiet_start),
              )
                ? Number(event.payload.quiet_start)
                : 22;
              const quietEnd = Number.isFinite(Number(event.payload?.quiet_end))
                ? Number(event.payload.quiet_end)
                : 8;
              const timezone = event.payload?.timezone as string | undefined;
              const localMinutes = getLocalTimeMinutes(timezone, currentTime);
              if (isInQuietHours(localMinutes, quietStart, quietEnd)) {
                return false;
              }
            } else if (
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
                if (
                  currentTimeMinutes >= startMinutes ||
                  currentTimeMinutes <= endMinutes
                ) {
                  return false; // In quiet hours
                }
              } else {
                if (
                  currentTimeMinutes >= startMinutes &&
                  currentTimeMinutes <= endMinutes
                ) {
                  return false; // In quiet hours
                }
              }
            }
          }

          return true;
        });

        if (eligibleUserIds.length === 0) {
          // All users in quiet hours, retry later
          continue;
        }

        // Get active devices for eligible users
        const { data: devices } = await supabase
          .from("devices")
          .select("user_id, push_token, platform")
          .in("user_id", eligibleUserIds)
          .eq("is_active", true);

        if (!devices || devices.length === 0) {
          // Mark as sent (but no devices)
          await supabase
            .from("notification_events")
            .update({
              is_sent: true,
              sent_at: new Date().toISOString(),
              error_message: "No active devices found",
            })
            .eq("id", event.id);
          continue;
        }

        // Fetch household cover image for richer notifications
        let imageUrl: string | undefined = undefined;
        if (event.household_id) {
          try {
            const { data: hh } = await supabase
              .from("households")
              .select("cover_image_url")
              .eq("id", event.household_id)
              .maybeSingle();
            if (
              hh?.cover_image_url &&
              /^https?:\/\//i.test(hh.cover_image_url)
            ) {
              imageUrl = hh.cover_image_url as string;
            }
          } catch (_) {}
        }

        // Send push notifications using FCM V1 API
        let eventSentCount = 0;
        let eventFailedCount = 0;

        const payloadData =
          event.payload &&
          typeof event.payload === "object" &&
          !Array.isArray(event.payload)
            ? Object.fromEntries(
                Object.entries(event.payload).map(([k, v]) => [
                  k,
                  v != null && typeof v === "object"
                    ? JSON.stringify(v)
                    : String(v),
                ]),
              )
            : {};
        const mergedData = {
          ...payloadData,
          ...messageData,
        };

        const pushPromises = devices.map(async (device) => {
          const success = await sendFCMv1Notification(
            device.push_token,
            title,
            body,
            {
              event_type: event.event_type,
              household_id: event.household_id || "",
              event_id: event.id,
              ...mergedData,
            },
            accessToken,
            imageUrl,
          );

          return { device, success };
        });

        const results = await Promise.allSettled(pushPromises);

        for (const result of results) {
          if (result.status === "fulfilled" && result.value.success) {
            eventSentCount++;
          } else {
            eventFailedCount++;
          }
        }

        // Update event as sent
        await supabase
          .from("notification_events")
          .update({
            is_sent: eventSentCount > 0,
            sent_at: eventSentCount > 0 ? new Date().toISOString() : null,
            error_message:
              eventFailedCount > 0
                ? `Failed to send to ${eventFailedCount} devices`
                : null,
            payload: {
              ...event.payload,
              sent_count: eventSentCount,
              failed_count: eventFailedCount,
            },
          })
          .eq("id", event.id);

        if (eventSentCount > 0) {
          sentCount++;
        } else {
          failedCount++;
          errors.push(`Event ${event.id}: Failed to send to any device`);
        }
      } catch (error: any) {
        console.error(`Error processing event ${event.id}:`, error);
        failedCount++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push(`Event ${event.id}: ${errorMessage}`);

        // Update event with error
        await supabase
          .from("notification_events")
          .update({
            error_message: errorMessage,
          })
          .eq("id", event.id);
      }
    }

    const response: ProcessNotificationsResponse = {
      success: true,
      processed: unsentEvents.length,
      sent: sentCount,
      failed: failedCount,
      errors: errors.slice(0, 10), // Limit error list to prevent huge responses
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        processed: 0,
        sent: 0,
        failed: 0,
        errors: [errorMessage],
      } as ProcessNotificationsResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
