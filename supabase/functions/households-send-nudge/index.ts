import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const fcmServerKey = Deno.env.get('FCM_SERVER_KEY'); // Firebase Cloud Messaging server key

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type NudgeType = 'warn' | 'alert';

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

// Send FCM push notification
async function sendFCMPush(token: string, title: string, body: string, data: any): Promise<boolean> {
  if (!fcmServerKey) {
    console.error('FCM_SERVER_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          sound: 'default',
          badge: 1
        },
        data,
        priority: 'high'
      })
    });

    const result = await response.json();

    if (!response.ok || result.failure > 0) {
      console.error('FCM push failed:', result);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending FCM push:', error);
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

    // SECURITY: Allow service role (automated jobs) OR authenticated household members
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === supabaseServiceRoleKey;

    let userId: string | null = null;

    if (!isServiceRole) {
      // Verify user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      userId = user.id;
    }

    // Parse request body
    const body: SendNudgeRequest = await req.json();
    const {
      household_id,
      budget_id,
      nudge_type,
      currency,
      spent_cents,
      budget_cents,
      percentage_used
    } = body;

    if (!household_id || !budget_id || !nudge_type || !currency) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If not service role, verify user is a member of the household
    if (!isServiceRole && userId) {
      const { data: membership, error: membershipError } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', household_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (membershipError || !membership) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: You are not a member of this household' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Check rate limiting: don't send same nudge type for same budget within 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const eventType = nudge_type === 'warn' ? 'budget_warn' : 'budget_alert';

    const { data: recentEvent } = await supabase
      .from('notification_events')
      .select('sent_at')
      .eq('household_id', household_id)
      .eq('event_type', eventType)
      .gte('sent_at', oneDayAgo)
      .eq('is_sent', true)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentEvent) {
      console.log(`Rate limit: ${nudge_type} nudge for household ${household_id} was sent within last 24h`);
      return new Response(
        JSON.stringify({
          success: false,
          sent_count: 0,
          failed_count: 0,
          error: `Rate limit: ${nudge_type} nudge was sent within last 24 hours`
        } as SendNudgeResponse),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get household details
    const { data: household } = await supabase
      .from('households')
      .select('name')
      .eq('id', household_id)
      .single();

    if (!household) {
      return new Response(
        JSON.stringify({ error: 'Household not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get all household members with their sharing preferences
    const { data: members } = await supabase
      .from('household_members')
      .select(`
        user_id,
        sharing_prefs (
          enable_nudges,
          nudge_quiet_hours_start,
          nudge_quiet_hours_end
        )
      `)
      .eq('household_id', household_id);

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, failed_count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Filter members who have nudges enabled and are not in quiet hours
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const eligibleMembers = members.filter(member => {
      const prefs = Array.isArray(member.sharing_prefs) ? member.sharing_prefs[0] : member.sharing_prefs;

      // Check if nudges are enabled (default: true)
      if (prefs && prefs.enable_nudges === false) {
        return false;
      }

      // Check quiet hours
      if (prefs && prefs.nudge_quiet_hours_start && prefs.nudge_quiet_hours_end) {
        const [startHour, startMinute] = prefs.nudge_quiet_hours_start.split(':').map(Number);
        const [endHour, endMinute] = prefs.nudge_quiet_hours_end.split(':').map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        // Handle quiet hours that span midnight
        if (startMinutes > endMinutes) {
          // Quiet hours like 22:00 - 08:00
          if (currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes) {
            return false; // In quiet hours
          }
        } else {
          // Quiet hours like 13:00 - 14:00
          if (currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes) {
            return false; // In quiet hours
          }
        }
      }

      return true;
    });

    // Get active devices for eligible members
    const memberUserIds = eligibleMembers.map(m => m.user_id);

    const { data: devices } = await supabase
      .from('devices')
      .select('user_id, push_token, platform')
      .in('user_id', memberUserIds)
      .eq('is_active', true);

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent_count: 0, failed_count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine nudge message based on type
    let title: string;
    let body: string;
    let emoji: string;

    if (nudge_type === 'warn') {
      title = 'Budget Boop! 🐾';
      emoji = '⚠️';
      body = `"${household.name}" has used ${percentage_used.toFixed(0)}% of your ${currency} budget. Gentle reminder to keep an eye on spending!`;
    } else {
      title = 'Purr-suasive Nudge! 😸';
      emoji = '🚨';
      body = `"${household.name}" has reached ${percentage_used.toFixed(0)}% of your ${currency} budget. Time to pause and review!`;
    }

    // Send push notifications
    let sentCount = 0;
    let failedCount = 0;

    const pushPromises = devices.map(async (device) => {
      const success = await sendFCMPush(
        device.push_token,
        title,
        body,
        {
          type: 'budget_nudge',
          nudge_type,
          household_id,
          budget_id,
          currency,
          spent_cents: spent_cents.toString(),
          budget_cents: budget_cents.toString(),
          percentage_used: percentage_used.toString()
        }
      );

      return { device, success };
    });

    const results = await Promise.allSettled(pushPromises);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    // Create notification event
    await supabase
      .from('notification_events')
      .insert({
        household_id,
        user_id: userId,
        event_type: nudge_type === 'warn' ? 'budget_warn' : 'budget_alert',
        payload: {
          budget_id,
          currency,
          spent_cents,
          budget_cents,
          percentage_used,
          sent_count: sentCount,
          failed_count: failedCount
        },
        is_sent: sentCount > 0,
        sent_at: sentCount > 0 ? new Date().toISOString() : null
      });

    const response: SendNudgeResponse = {
      success: true,
      sent_count: sentCount,
      failed_count: failedCount
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
