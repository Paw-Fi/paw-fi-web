import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";
import { getCurrencySymbol } from "../shared/currency-symbols.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const iosBundleId = Deno.env.get('IOS_BUNDLE_ID') || 'com.moneko.mobile';

// Firebase Cloud Messaging V1 API - Modern approach (2025)
// Requires Service Account JSON from Firebase Console
const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const firebaseProjectIdEnv = firebaseProjectId || '';

function redact(v?: string) {
  if (!v) return v;
  if (v.length <= 6) return '***';
  return v.slice(0, 4) + '***' + v.slice(-4);
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
      image?: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: string;
      notification: {
        sound: string;
      };
    };
    apns?: {
      headers?: Record<string, string>;
      payload: {
        aps: {
          sound: string;
          ['mutable-content']?: number;
          badge?: number;
        };
      };
    };
  };
}

type RecipientSplitContext = {
  isSplitForRecipient: boolean;
  shareCents: number | null;
  totalCents: number | null;
  currency: string | null;
};

async function getRecipientSplitContext(expenseId: string, targetUserId: string): Promise<RecipientSplitContext> {
  try {
    // Get split group id and expense totals
    const { data: group } = await supabase
      .from('expense_split_groups')
      .select('id, currency, total_amount_cents, expense_id')
      .eq('expense_id', expenseId)
      .maybeSingle();

    if (!group) {
      return { isSplitForRecipient: false, shareCents: null, totalCents: null, currency: null };
    }

    const { data: line } = await supabase
      .from('expense_split_lines')
      .select('amount_cents')
      .eq('split_group_id', group.id)
      .eq('user_id', targetUserId)
      .maybeSingle();

    const share = line?.amount_cents ?? 0;
    return {
      isSplitForRecipient: share > 0,
      shareCents: share,
      totalCents: group.total_amount_cents ?? null,
      currency: group.currency ?? null,
    };
  } catch (_) {
    return { isSplitForRecipient: false, shareCents: null, totalCents: null, currency: null };
  }
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

    // Import private key (robustly handle escaped newlines and PEM parsing)
    let privateKeyPem: string = serviceAccount.private_key as string;
    if (!privateKeyPem) {
      console.error('[fcm-v1] Service account missing private_key');
      return null;
    }
    // Convert literal \n to real newlines if needed
    privateKeyPem = privateKeyPem.replace(/\\n/g, '\n').trim();

    const match = privateKeyPem.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
    if (!match || !match[1]) {
      console.error('[fcm-v1] Invalid private key format');
      return null;
    }
    const pemBody = match[1].replace(/\r|\n/g, '');
    const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

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
  accessToken: string,
  imageUrl?: string
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
          body,
          ...(imageUrl ? { image: imageUrl } : {})
        },
        data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default'
          }
        },
        apns: {
          headers: {
            'apns-topic': iosBundleId,
            'apns-push-type': 'alert',
            'apns-priority': '10'
          },
          payload: {
            aps: {
              sound: 'default',
              ...(imageUrl ? { ['mutable-content']: 1 } : {})
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
      if (response.status === 401 && errorText.includes('APNS')) {
        console.error('[fcm-v1] Hint: Verify APNs auth key (p8) + Key ID + Team ID, bundle id/topic', iosBundleId, 'and iOS entitlements (aps-environment). Ensure the device token belongs to this Firebase project.');
      }

      // Handle specific errors
      if (errorText.includes('UNREGISTERED') || errorText.includes('INVALID_ARGUMENT')) {
        console.warn('[fcm-v1] Invalid or expired device token - deactivating');
        try {
          await supabase
            .from('devices')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('push_token', deviceToken);
        } catch (e) {
          console.error('[fcm-v1] Failed to deactivate device token:', e);
        }
      }

      return false;
    }
  } catch (error) {
    console.error('[fcm-v1] Error sending notification:', error);
    return false;
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check endpoint for quick verification
  if (req.method === 'GET' && url.pathname.endsWith('/health')) {
    return new Response(
      JSON.stringify({ ok: true, service: 'households-send-push-notification', ts: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

    // Parse request body (support both custom payload and Database Webhooks envelope)
    const raw = await req.json();

    // Database Webhooks envelope detection
    const isDbWebhook = raw && typeof raw === 'object' && 'type' in raw && 'record' in raw;

    const body: NotificationPayload = isDbWebhook
      ? {
          notification_event_id: raw.record?.id,
          household_id: raw.record?.household_id,
          user_id: raw.record?.user_id,
          event_type: raw.record?.event_type,
          payload: raw.record?.payload ?? {},
        }
      : raw;

    const { notification_event_id, household_id, user_id, event_type, payload } = body;

    console.log('[send-push] Incoming request', {
      method: req.method,
      path: url.pathname,
      source: isDbWebhook ? 'database-webhook' : 'direct',
      id: notification_event_id,
      user: user_id,
      household: household_id,
      type: event_type,
    });

    // Diagnostic: environment alignment
    const saMeta = getServiceAccountMeta();
    console.log('[send-push] Config diag', {
      firebaseProjectId: firebaseProjectIdEnv,
      serviceAccountProjectId: saMeta?.project_id,
      serviceAccountEmail: redact(saMeta?.client_email),
      serviceAccountKeyId: redact(saMeta?.private_key_id),
      apnsTopic: iosBundleId,
    });

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

    // Idempotency: if this event is already marked sent, skip to avoid duplicates (e.g., pg_net + webhook)
    try {
      const { data: existingEvent } = await supabase
        .from('notification_events')
        .select('is_sent')
        .eq('id', notification_event_id)
        .single();

      if (existingEvent?.is_sent) {
        console.log('[send-push] Event already sent; skipping duplicate delivery', notification_event_id);
        return new Response(
          JSON.stringify({ success: true, skipped: 'already_sent' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (_) {
      // Continue; inability to read shouldn’t block delivery
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

    const isExpenseEvent = event_type === 'expense_added' || event_type === 'expense_edited';

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

    // Check quiet hours (skip for expense events to ensure immediate delivery)
    if (!isExpenseEvent && prefs && prefs.nudge_quiet_hours_start && prefs.nudge_quiet_hours_end) {
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

    console.log('[send-push] Sending to devices:', devices.length, {
      tokens: devices.map(d => (d.push_token ? `${d.push_token.slice(0,8)}...${d.push_token.slice(-6)}` : 'null')),
      platform: devices.map(d => d.platform)
    });

    // Fetch household image (cover)
    let imageUrl: string | undefined = undefined;
    if (household_id) {
      try {
        const { data: hh } = await supabase
          .from('households')
          .select('cover_image_url')
          .eq('id', household_id)
          .maybeSingle();
        if (hh?.cover_image_url && /^https?:\/\//i.test(hh.cover_image_url)) {
          imageUrl = hh.cover_image_url as string;
        }
      } catch (_) {}
    }

    // Build notification message based on event type (with per-recipient split context)
    let recipientSplit: RecipientSplitContext | undefined = undefined;
    if (event_type === 'expense_added' && (payload.expense_id || payload?.expense_data?.expense_id)) {
      const expId = (payload.expense_id || payload?.expense_data?.expense_id) as string;
      recipientSplit = await getRecipientSplitContext(expId, user_id);
    }
    const notificationMessage = buildNotificationMessage(event_type, payload, recipientSplit);

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
        accessToken,
        imageUrl
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

    console.log('[send-push] Result', { sent: sentCount, failed: failedCount, total: devices.length });

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
function buildNotificationMessage(
  eventType: string,
  payload: Record<string, any>,
  recipientSplit?: RecipientSplitContext
): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  const actor = (payload.expense_data?.actor_name || payload.actor_name || 'Someone') as string;
  switch (eventType) {
    case 'expense_added': {
      const note = (payload.expense_data?.note || '').toString().trim();
      const code = (recipientSplit?.currency || payload.expense_data?.currency) as string | undefined;
      const symbol = getCurrencySymbol(code);
      const cents = Number(recipientSplit?.shareCents ?? payload.expense_data?.amount_cents ?? 0);
      const amount = `${symbol}${(cents / 100).toFixed(2)}`;
      const isSplit = recipientSplit?.isSplitForRecipient === true;
      const title = isSplit ? `💸 ${actor} split an expense with you` : `💸 ${actor} added an expense`;
      const body = note.length > 0 ? note : amount;
      return {
        title,
        body,
        data: {
          expense_id: payload.expense_id || '',
          household_id: payload.household_id || ''
        }
      };
    }

    case 'expense_edited': {
      const fields: string[] = (payload.expense_data?.updated_fields || []) as string[];
      const code = (payload.expense_data?.currency || payload.currency || payload.expense_data?.new_currency) as string | undefined;
      const symbol = getCurrencySymbol(code);

      let body = 'Updated';
      if (fields.includes('amount_cents')) {
        const oldC = Number(payload.expense_data?.old_amount_cents ?? 0);
        const newC = Number(payload.expense_data?.new_amount_cents ?? 0);
        body = `${symbol}${(oldC / 100).toFixed(2)} -> ${symbol}${(newC / 100).toFixed(2)}`;
      } else if (fields.includes('category')) {
        const oldCat = String(payload.expense_data?.old_category ?? '');
        const newCat = String(payload.expense_data?.new_category ?? '');
        body = `${oldCat} -> ${newCat}`;
      } else if (fields.includes('currency')) {
        const oldCur = String(payload.expense_data?.old_currency ?? '');
        const newCur = String(payload.expense_data?.new_currency ?? '');
        body = `${oldCur} -> ${newCur}`;
      } else if (fields.includes('date')) {
        const oldDate = String(payload.expense_data?.old_date ?? '');
        const newDate = String(payload.expense_data?.new_date ?? '');
        body = `${oldDate} -> ${newDate}`;
      } else if (fields.includes('created_at')) {
        const toTime = (v?: string) => {
          try { return new Date(v || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return String(v || ''); }
        };
        body = `${toTime(payload.expense_data?.old_created_at)} -> ${toTime(payload.expense_data?.new_created_at)}`;
      } else if (fields.includes('raw_text')) {
        const oldN = String(payload.expense_data?.old_note ?? '').trim();
        const newN = String(payload.expense_data?.new_note ?? '').trim();
        body = `${oldN} -> ${newN}`;
      }

      return {
        title: `✏️ ${actor} edited an expense`,
        body,
        data: {
          expense_id: payload.expense_id || '',
          household_id: payload.household_id || ''
        }
      };
    }

    case 'expense_deleted': {
      const code = payload.expense_data?.currency as string | undefined;
      const symbol = getCurrencySymbol(code);
      const cents = Number(payload.expense_data?.amount_cents ?? 0);
      const body = `${symbol}${(cents / 100).toFixed(2)}`;
      return {
        title: `🗑️ ${actor} deleted an expense`,
        body,
        data: {
          expense_id: payload.expense_id || '',
          household_id: payload.household_id || ''
        }
      };
    }

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
        title: '🧮 Expense Split',
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
