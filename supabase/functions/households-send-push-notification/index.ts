import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Firebase Cloud Messaging V1 API - Modern approach (2025)
// Requires Service Account JSON from Firebase Console
const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface NotificationPayload {
  notification_event_id: string;
  household_id: string;
  user_id: string;
  event_type: string;
  payload: Record<string, any>;
}

interface FCMv1Message {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: string;
      notification: {
        sound: string;
      };
    };
    apns?: {
      payload: {
        aps: {
          sound: string;
          badge?: number;
        };
      };
    };
  };
}

/**
 * Get OAuth 2.0 access token using Service Account credentials
 * Firebase Cloud Messaging API V1 requires OAuth tokens, not legacy server keys
 * Token is valid for 1 hour and should be cached
 */
async function getAccessToken(): Promise<string | null> {
  if (!firebaseServiceAccount) {
    console.warn('[fcm-v1] FIREBASE_SERVICE_ACCOUNT_JSON not configured');
    return null;
  }

  try {
    // Parse service account JSON
    const serviceAccount = JSON.parse(firebaseServiceAccount);

    // JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id
    };

    // JWT claims
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600, // 1 hour
      scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };

    // Create JWT using Web Crypto API (Deno native)
    const encoder = new TextEncoder();
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedClaims = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${encodedHeader}.${encodedClaims}`;

    // Import private key
    const privateKeyPem = serviceAccount.private_key;
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKeyPem.substring(
      pemHeader.length,
      privateKeyPem.length - pemFooter.length
    ).replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      encoder.encode(unsignedToken)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${unsignedToken}.${encodedSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[fcm-v1] Token exchange failed:', error);
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('[fcm-v1] Error getting access token:', error);
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
  accessToken: string
): Promise<boolean> {
  if (!firebaseProjectId) {
    console.error('[fcm-v1] FIREBASE_PROJECT_ID not configured');
    return false;
  }

  try {
    const message: FCMv1Message = {
      message: {
        token: deviceToken,
        notification: {
          title,
          body
        },
        data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        }
      }
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      }
    );

    if (response.ok) {
      console.log('[fcm-v1] Push notification sent successfully');
      return true;
    } else {
      const errorText = await response.text();
      console.error('[fcm-v1] FCM API error:', response.status, errorText);

      // Handle specific errors
      if (errorText.includes('UNREGISTERED') || errorText.includes('INVALID_ARGUMENT')) {
        console.warn('[fcm-v1] Invalid or expired device token - should be cleaned up');
      }

      return false;
    }
  } catch (error) {
    console.error('[fcm-v1] Error sending notification:', error);
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body: NotificationPayload = await req.json();
    const { notification_event_id, household_id, user_id, event_type, payload } = body;

    console.log('[send-push] Processing notification:', notification_event_id, 'for user:', user_id);

    // Validate required fields
    if (!notification_event_id || !user_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if FCM is configured
    if (!firebaseServiceAccount || !firebaseProjectId) {
      console.warn('[send-push] Firebase not configured (missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID)');

      // Mark as sent to avoid retry loop
      await supabase
        .from('notification_events')
        .update({
          is_sent: true,
          delivery_error: 'Firebase not configured'
        })
        .eq('id', notification_event_id);

      return new Response(
        JSON.stringify({ success: false, error: 'Firebase not configured' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get OAuth access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error('[send-push] Failed to obtain access token');

      await supabase
        .from('notification_events')
        .update({
          retry_count: 1,
          last_retry_at: new Date().toISOString(),
          delivery_error: 'Failed to obtain access token'
        })
        .eq('id', notification_event_id);

      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user's notification preferences
    const { data: prefs } = await supabase
      .from('sharing_prefs')
      .select('enable_nudges, nudge_quiet_hours_start, nudge_quiet_hours_end')
      .eq('user_id', user_id)
      .eq('household_id', household_id)
      .single();

    // Check if notifications are disabled for this user
    if (prefs && !prefs.enable_nudges) {
      console.log('[send-push] User has disabled notifications');
      await supabase
        .from('notification_events')
        .update({ is_sent: true })
        .eq('id', notification_event_id);

      return new Response(
        JSON.stringify({ success: true, skipped: 'User disabled notifications' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check quiet hours
    if (prefs && prefs.nudge_quiet_hours_start && prefs.nudge_quiet_hours_end) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const startParts = prefs.nudge_quiet_hours_start.split(':');
      const endParts = prefs.nudge_quiet_hours_end.split(':');

      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

      const inQuietHours =
        startMinutes < endMinutes
          ? currentTime >= startMinutes && currentTime < endMinutes
          : currentTime >= startMinutes || currentTime < endMinutes;

      if (inQuietHours) {
        console.log('[send-push] Currently in quiet hours, will retry later');
        await supabase
          .from('notification_events')
          .update({
            retry_count: 1,
            last_retry_at: new Date().toISOString()
          })
          .eq('id', notification_event_id);

        return new Response(
          JSON.stringify({ success: true, skipped: 'Quiet hours' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Get active devices for this user
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('push_token, platform')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (devicesError || !devices || devices.length === 0) {
      console.log('[send-push] No active devices found for user:', user_id);
      await supabase
        .from('notification_events')
        .update({
          is_sent: true,
          delivery_error: 'No active devices'
        })
        .eq('id', notification_event_id);

      return new Response(
        JSON.stringify({ success: false, error: 'No active devices' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build notification message based on event type
    const notificationMessage = buildNotificationMessage(event_type, payload);

    // Send push notification to all active devices using FCM V1 API
    let sentCount = 0;
    let failedCount = 0;

    for (const device of devices) {
      const success = await sendFCMv1Notification(
        device.push_token,
        notificationMessage.title,
        notificationMessage.body,
        {
          event_type,
          household_id: household_id || '',
          notification_id: notification_event_id,
          ...notificationMessage.data
        },
        accessToken
      );

      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    // Update notification event status
    await supabase
      .from('notification_events')
      .update({
        is_sent: sentCount > 0,
        sent_at: sentCount > 0 ? new Date().toISOString() : null,
        delivery_error: failedCount > 0 ? `Sent to ${sentCount}/${devices.length} devices` : null
      })
      .eq('id', notification_event_id);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count: sentCount,
        failed_count: failedCount,
        total_devices: devices.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[send-push] Unexpected error:', error);

    // Try to mark notification with error
    try {
      const body: NotificationPayload = await req.clone().json();
      await supabase
        .from('notification_events')
        .update({
          retry_count: 1,
          last_retry_at: new Date().toISOString(),
          delivery_error: error instanceof Error ? error.message : String(error)
        })
        .eq('id', body.notification_event_id);
    } catch (updateError) {
      console.error('[send-push] Failed to update notification event:', updateError);
    }

    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Build notification message based on event type
 */
function buildNotificationMessage(eventType: string, payload: Record<string, any>): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  switch (eventType) {
    case 'expense_added':
      return {
        title: '💸 New Expense Added',
        body: `${payload.expense_data?.currency || ''} ${payload.expense_data?.amount || '0.00'} • ${payload.expense_data?.category || 'Uncategorized'}`,
        data: {
          expense_id: payload.expense_id || '',
          household_id: payload.household_id || ''
        }
      };

    case 'expense_edited':
      return {
        title: '✏️ Expense Updated',
        body: `An expense was modified in your household`,
        data: {
          expense_id: payload.expense_id || '',
          household_id: payload.household_id || ''
        }
      };

    case 'budget_warn':
      return {
        title: '⚠️ Budget Warning',
        body: `You've reached 80% of your budget limit`,
        data: {
          budget_id: payload.budget_id || ''
        }
      };

    case 'budget_alert':
      return {
        title: '🚨 Budget Alert',
        body: `You've exceeded your budget limit!`,
        data: {
          budget_id: payload.budget_id || ''
        }
      };

    case 'invite_accepted':
      return {
        title: '✅ Invitation Accepted',
        body: `Someone accepted your household invitation`,
        data: {
          invite_id: payload.invite_id || ''
        }
      };

    case 'member_joined':
      return {
        title: '👥 New Member Joined',
        body: `${payload.member_email || 'Someone'} joined ${payload.household_name || 'your household'}`,
        data: {
          member_id: payload.member_id || '',
          household_id: payload.household_id || ''
        }
      };

    case 'split_created':
      return {
        title: '🧾 Expense Split',
        body: `You have a new expense to split`,
        data: {
          split_id: payload.split_id || ''
        }
      };

    default:
      return {
        title: '🔔 Household Notification',
        body: 'You have a new notification',
        data: {}
      };
  }
}
