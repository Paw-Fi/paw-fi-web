import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface AcceptInviteRequest {
  token: string;
}

interface AcceptInviteResponse {
  success: boolean;
  household_id?: string;
  member_id?: string;
  error?: string;
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

    // Get the authorization header
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

    // Get the user from the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body: AcceptInviteRequest = await req.json();
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invalid invitation token' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate invite status and expiry
    if (invite.status === 'accepted') {
      // Idempotent: if already accepted by this user, return success
      if (invite.invited_user_id === user.id) {
        const { data: existingMember } = await supabase
          .from('household_members')
          .select('id, household_id')
          .eq('household_id', invite.household_id)
          .eq('user_id', user.id)
          .single();

        if (existingMember) {
          return new Response(
            JSON.stringify({
              success: true,
              household_id: existingMember.household_id,
              member_id: existingMember.id
            } as AcceptInviteResponse),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      return new Response(
        JSON.stringify({ error: 'This invitation has already been accepted' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (invite.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'This invitation has been revoked' }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', invite.household_id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: 'You are already a member of this household' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Begin transaction-like operations
    // 1. Create household member
    const { data: newMember, error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: invite.household_id,
        user_id: user.id,
        role: 'member'
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error creating household member:', memberError);
      return new Response(
        JSON.stringify({ error: 'Failed to join household' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Update invite status
    const { error: updateError } = await supabase
      .from('invites')
      .update({
        status: 'accepted',
        invited_user_id: user.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error updating invite status:', updateError);
      // Rollback: remove the member
      await supabase
        .from('household_members')
        .delete()
        .eq('id', newMember.id);

      return new Response(
        JSON.stringify({ error: 'Failed to update invitation status' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. Send push notification to inviter (if they have devices)
    const { data: inviterDevices } = await supabase
      .from('devices')
      .select('push_token, platform')
      .eq('user_id', invite.inviter_id)
      .eq('is_active', true);

    if (inviterDevices && inviterDevices.length > 0) {
      // Get household name for notification
      const { data: household } = await supabase
        .from('households')
        .select('name')
        .eq('id', invite.household_id)
        .single();

      // Queue push notifications (will be sent by send-push-notification function)
      const notificationPayload = {
        title: 'Invitation Accepted! 🎉',
        body: `${user.email} has joined "${household?.name || 'your household'}"`,
        data: {
          type: 'invite_accepted',
          household_id: invite.household_id,
          member_id: newMember.id
        }
      };

      // Store notification for async processing
      await supabase
        .from('notification_events')
        .insert({
          household_id: invite.household_id,
          user_id: invite.inviter_id,
          event_type: 'invite_accepted',
          payload: {
            ...notificationPayload,
            device_tokens: inviterDevices.map(d => d.push_token)
          },
          is_sent: false
        });
    }

    const response: AcceptInviteResponse = {
      success: true,
      household_id: invite.household_id,
      member_id: newMember.id
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
