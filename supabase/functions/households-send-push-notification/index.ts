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
        click_action?: string;
        channel_id?: string;
      };
    };
    apns?: {
      headers?: Record<string, string>;
      payload: {
        aps: {
          sound: string;
          ['mutable-content']?: number;
          badge?: number;
          category?: string;
          alert?: {
            title: string;
            body: string;
          };
        };
        deep_link?: string;
        click_action?: string;
      };
      // Note: apns.fcm_options does NOT support `link`. Use WebPush only.
      // Keeping type for allowed fields per FCM v1 schema.
      fcm_options?: {
        analytics_label?: string;
        image?: string;
      };
    };
    webpush?: {
      headers?: Record<string, string>;
      data?: Record<string, string>;
      fcm_options?: {
        link?: string; // Only WebPush supports link
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
 * Build deep link URL based on notification type and data
 * Follows moneko:// custom scheme for in-app navigation
 */
function buildDeepLink(eventType: string, data: Record<string, string>): string | undefined {
  switch (eventType) {
    case 'expense_added':
    case 'expense_edited':
    case 'expense_deleted':
      // Navigate to expense detail sheet
      if (data.expense_id) {
        return `/expense/${data.expense_id}`;
      }
      // Fallback to household view if expense_id missing
      if (data.household_id) {
        return `/household/${data.household_id}`;
      }
      break;
    
    case 'budget_warn':
    case 'budget_alert':
      // Navigate to budget detail
      if (data.budget_id) {
        return `/budget/${data.budget_id}`;
      }
      break;
    
    case 'split_created':
      // Navigate to splits view
      if (data.split_id) {
        return `/split/${data.split_id}`;
      }
      if (data.household_id) {
        return `/household/${data.household_id}/splits`;
      }
      break;
    
    case 'member_joined':
    case 'invite_accepted':
      // Navigate to household view
      if (data.household_id) {
        return `/household/${data.household_id}`;
      }
      break;

    case 'member_reminded':
      // Navigate to household view
      if (data.household_id) {
        return `/household/${data.household_id}`;
      }
      break;

    case 'settlement_completed':
    case 'split_settled':
      // Navigate to household overview for settlement context
      if (data.household_id) {
        return `/household/${data.household_id}`;
      }
      break;

    default:
      // Default to home
      return '/home';
  }
  
  return '/home';
}

/**
 * Send push notification using Firebase Cloud Messaging API V1
 * Modern API endpoint: https://fcm.googleapis.com/v1/projects/{project_id}/messages:send
 * Includes deep linking for direct navigation to specific screens
 */
async function sendFCMv1Notification(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
  accessToken: string,
  imageUrl?: string,
  platform?: string
): Promise<boolean> {
  if (!firebaseProjectId) {
    console.error('[fcm-v1] FIREBASE_PROJECT_ID not configured');
    return false;
  }

  try {
    // Build deep link for navigation
    const deepLink = buildDeepLink(data.event_type, data);
    const isWeb = typeof platform === 'string' && /^(web|webpush|web_push|browser)$/i.test(platform);
    
    // Enhanced data payload with deep link and click action
    const enhancedData = {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      deep_link: deepLink || '/home',
    };

    const message: FCMv1Message = {
      message: {
        token: deviceToken,
        notification: {
          title,
          body,
          ...(imageUrl ? { image: imageUrl } : {})
        },
        data: enhancedData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            // Brand accent color (affects small icon/accents on many Android versions)
            color: '#7458FF',
            // Android: click_action triggers intent filter in AndroidManifest
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            // channel_id for notification channels (Android 8+)
            channel_id: 'household_updates',
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
              // iOS: category for notification actions
              category: 'EXPENSE_NOTIFICATION',
              ...(imageUrl ? { ['mutable-content']: 1 } : {}),
              // Alert dictionary for rich notifications
              alert: {
                title,
                body,
              }
            },
            // Custom data for deep linking (accessible in Flutter)
            deep_link: deepLink || '/home',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
          // iOS: Only allowed fields; no `link`. Use image if provided and set mutable-content above.
          fcm_options: imageUrl ? { image: imageUrl } : undefined,
        },
        // WebPush only: safe to set link
        ...(isWeb ? {
          webpush: {
            data: enhancedData,
            fcm_options: {
              link: deepLink || '/home'
            }
          }
        } : {})
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
      // Deactivate token ONLY for actual token issues (UNREGISTERED/NOT_FOUND), not for generic INVALID_ARGUMENT
      try {
        const parsed = JSON.parse(errorText);
        const status = parsed?.error?.status || '';
        const message = parsed?.error?.message || '';
        const details = parsed?.error?.details || [];
        const hasUnregistered =
          status === 'NOT_FOUND' ||
          details?.some((d: any) => d?.errorCode === 'UNREGISTERED') ||
          /UNREGISTERED/i.test(message) ||
          /No matching registration token/i.test(message) ||
          /Requested entity was not found/i.test(message);
        if (hasUnregistered) {
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
      } catch (_) {
        // If parsing fails, do not deactivate blindly
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

    // Get active devices for this user (treat NULL as active to avoid legacy rows being skipped)
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('push_token, platform, is_active')
      .eq('user_id', user_id)
      .or('is_active.is.true,is_active.is.null');

    if (devicesError || !devices || devices.length === 0) {
      // Debug: check if user has devices but all inactive
      const { data: existingDevices } = await supabase
        .from('devices')
        .select('id, is_active, platform')
        .eq('user_id', user_id);

      const inactiveCount = existingDevices?.length ? existingDevices.filter(d => d && d.is_active === false).length : 0;
      console.log('[send-push] No active devices found for user:', user_id, 'existing:', existingDevices?.length || 0, 'inactive:', inactiveCount);

      await supabase
        .from('notification_events')
        .update({
          is_sent: true,
          delivery_error: existingDevices?.length ? `No active devices (inactive: ${inactiveCount}/${existingDevices.length})` : 'No active devices'
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
        imageUrl,
        device.platform
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
 * Format: Title = Sender Name, Body = Descriptive action message
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
  const householdName = (payload.household_name || 'your household') as string;

  switch (eventType) {
    case 'expense_added': {
      const note = (payload.expense_data?.note || '').toString().trim();
      const code = (recipientSplit?.currency || payload.expense_data?.currency) as string | undefined;
      const symbol = getCurrencySymbol(code);
      const cents = Number(recipientSplit?.shareCents ?? payload.expense_data?.amount_cents ?? 0);
      const amount = `${symbol}${(cents / 100).toFixed(2)}`;
      const isSplit = recipientSplit?.isSplitForRecipient === true;

      const body = isSplit
        ? `split ${amount} expense with you${note ? `: ${note}` : ` in ${householdName}`}`
        : `added ${amount} expense${note ? `: ${note}` : ` to ${householdName}`}`;

      return {
        title: actor,
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

      let body = `modified an expense in ${householdName}`;

      // Show specific change for single field edits
      if (fields.length === 1) {
        if (fields.indexOf('amount_cents') !== -1) {
          const oldC = Number(payload.expense_data?.old_amount_cents ?? 0);
          const newC = Number(payload.expense_data?.new_amount_cents ?? 0);
          body = `changed expense amount from ${symbol}${(oldC / 100).toFixed(2)} to ${symbol}${(newC / 100).toFixed(2)}`;
        } else if (fields.indexOf('category') !== -1) {
          const newCat = String(payload.expense_data?.new_category ?? '');
          body = `changed expense category to ${newCat}`;
        } else if (fields.indexOf('currency') !== -1) {
          const newCur = String(payload.expense_data?.new_currency ?? '');
          body = `changed expense currency to ${newCur}`;
        } else if (fields.indexOf('date') !== -1) {
          const newDate = String(payload.expense_data?.new_date ?? '');
          body = `changed expense date to ${newDate}`;
        } else if (fields.indexOf('raw_text') !== -1) {
          const newN = String(payload.expense_data?.new_note ?? '').trim();
          body = newN ? `updated expense note: ${newN}` : `removed expense note`;
        }
      }

      return {
        title: actor,
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
      const amount = `${symbol}${(cents / 100).toFixed(2)}`;
      const body = `deleted ${amount} expense from ${householdName}`;

      return {
        title: actor,
        body,
        data: {
          expense_id: payload.expense_id || '',
          household_id: payload.household_id || ''
        }
      };
    }

    case 'budget_warn': {
      const budgetName = (payload.budget_name || 'Budget') as string;
      const code = payload.currency as string | undefined;
      const symbol = getCurrencySymbol(code);
      const budgetAmount = Number(payload.budget_cents ?? 0) / 100;
      const spentAmount = Number(payload.spent_cents ?? 0) / 100;
      const percentage = Number(payload.percentage_used ?? 0).toFixed(0);

      return {
        title: `${budgetName} Budget`,
        body: `⚠️ ${percentage}% used - ${symbol}${spentAmount.toFixed(2)} of ${symbol}${budgetAmount.toFixed(2)} spent in ${householdName}`,
        data: {
          budget_id: payload.budget_id || '',
          budget_name: budgetName,
          spent_cents: String(payload.spent_cents ?? 0),
          budget_cents: String(payload.budget_cents ?? 0),
          percentage_used: String(percentage),
        }
      };
    }

    case 'budget_alert': {
      const budgetName = (payload.budget_name || 'Budget') as string;
      const code = payload.currency as string | undefined;
      const symbol = getCurrencySymbol(code);
      const budgetAmount = Number(payload.budget_cents ?? 0) / 100;
      const spentAmount = Number(payload.spent_cents ?? 0) / 100;
      const percentage = Number(payload.percentage_used ?? 0).toFixed(0);
      const overAmount = (spentAmount - budgetAmount).toFixed(2);

      return {
        title: `${budgetName} Budget`,
        body: `🚨 Over budget! ${percentage}% used - ${symbol}${overAmount} over limit in ${householdName}`,
        data: {
          budget_id: payload.budget_id || '',
          budget_name: budgetName,
          spent_cents: String(payload.spent_cents ?? 0),
          budget_cents: String(payload.budget_cents ?? 0),
          percentage_used: String(percentage),
        }
      };
    }

    case 'invite_accepted': {
      const memberName = (payload.member_name || payload.member_email || 'Someone') as string;
      return {
        title: memberName,
        body: `accepted your invitation and joined ${householdName}`,
        data: {
          invite_id: payload.invite_id || '',
          household_id: payload.household_id || ''
        }
      };
    }

    case 'member_joined': {
      const memberName = (payload.member_name || payload.member_email || 'Someone') as string;
      return {
        title: memberName,
        body: `joined ${householdName}`,
        data: {
          member_id: payload.member_id || '',
          household_id: payload.household_id || ''
        }
      };
    }

    case 'split_created': {
      const code = payload.currency as string | undefined;
      const symbol = getCurrencySymbol(code);
      const cents = Number(payload.amount_cents ?? 0);
      const amount = `${symbol}${(cents / 100).toFixed(2)}`;

      return {
        title: actor,
        body: `created a ${amount} expense split for you in ${householdName}`,
        data: {
          split_id: payload.split_id || '',
          household_id: payload.household_id || ''
        }
      };
    }

    case 'member_reminded': {
      const senderName = (payload.sender_name || 'A member') as string;
      const customMessage = payload.message as string | undefined;

      const body = customMessage && customMessage.trim().length > 0
        ? customMessage
        : `sent you a spending reminder for ${householdName}`;

      return {
        title: senderName,
        body,
        data: {
          sender_id: payload.sender_id || '',
          household_id: payload.household_id || ''
        }
      };
    }

    case 'recurring_reminder': {
      const transactionType = (payload.type || 'expense') as string;
      const code = payload.currency as string | undefined;
      const symbol = getCurrencySymbol(code);
      const cents = Number(payload.amount_cents ?? 0);
      const amount = `${symbol}${(cents / 100).toFixed(2)}`;
      const category = (payload.category || '') as string;
      const occurrenceDate = new Date(payload.occurrence_date as string);
      const reminderValue = Number(payload.reminder_value ?? 1);
      const reminderUnit = (payload.reminder_unit || 'days') as string;
      
      // Calculate time until due
      const now = new Date();
      const daysUntil = Math.ceil((occurrenceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let timeframe = '';
      if (daysUntil === 0) {
        timeframe = 'today';
      } else if (daysUntil === 1) {
        timeframe = 'tomorrow';
      } else if (daysUntil > 1) {
        timeframe = `in ${daysUntil} days`;
      } else {
        timeframe = 'soon'; // Shouldn't happen but just in case
      }
      
      const transactionLabel = transactionType === 'income' ? 'payment' : 'expense';
      const emoji = transactionType === 'income' ? '💰' : '📅';
      
      return {
        title: `${emoji} Recurring ${transactionLabel.charAt(0).toUpperCase() + transactionLabel.slice(1)} Reminder`,
        body: `${category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Transaction'} of ${amount} is due ${timeframe}`,
        data: {
          expense_id: payload.expense_id || '',
          type: transactionType,
          category: category,
          amount: String(cents),
          currency: code || '',
          deep_link: `moneko://recurring/${payload.expense_id || ''}`,
        }
      };
    }

    case 'settlement_completed':
    case 'split_settled': {
      const actorName = (payload.actor_name || 'Someone') as string;
      const code = payload.currency as string | undefined;
      const symbol = getCurrencySymbol(code);
      const youOweCents = Number(payload.amounts_before?.you_owe_cents ?? payload.amount_cents ?? 0);
      const youAreOwedCents = Number(payload.amounts_before?.you_are_owed_cents ?? 0);
      const netPayCents = Number(payload.amounts_before?.net_pay_cents ?? Math.max(youOweCents - youAreOwedCents, 0));

      // First-person toward the recipient: actor settled with you
      const title = actorName;
      const body = netPayCents > 0
        ? `settled ${symbol}${(netPayCents / 100).toFixed(2)} with you in ${householdName}`
        : `settled up with you in ${householdName}`;

      return {
        title,
        body,
        data: {
          household_id: payload.household_id || '',
        }
      };
    }

    default:
      return {
        title: 'Moneko',
        body: `New activity in ${householdName}`,
        data: {}
      };
  }
}
