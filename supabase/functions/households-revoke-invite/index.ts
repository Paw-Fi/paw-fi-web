import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface RevokeInviteRequest {
  invite_id?: string;
  token?: string;
}

interface RevokeInviteResponse {
  success: boolean;
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
    const body: RevokeInviteRequest = await req.json();
    const { invite_id, token } = body;

    if (!invite_id && !token) {
      return new Response(
        JSON.stringify({ error: 'Either invite_id or token is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find the invite
    let query = supabase.from('invites').select('*');

    if (invite_id) {
      query = query.eq('id', invite_id);
    } else if (token) {
      query = query.eq('token', token);
    }

    const { data: invite, error: inviteError } = await query.single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user has permission to revoke (inviter, owner, or admin)
    const isInviter = invite.inviter_id === user.id;

    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', invite.household_id)
      .eq('user_id', user.id)
      .single();

    const isOwnerOrAdmin = membership && (membership.role === 'owner' || membership.role === 'admin');

    if (!isInviter && !isOwnerOrAdmin) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to revoke this invitation' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if invite can be revoked
    if (invite.status === 'revoked') {
      // Idempotent: already revoked
      return new Response(
        JSON.stringify({ success: true } as RevokeInviteResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (invite.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Cannot revoke an invitation that has already been accepted' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Revoke the invite
    const { error: updateError } = await supabase
      .from('invites')
      .update({
        status: 'revoked'
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error revoking invite:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to revoke invitation' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create notification event
    await supabase
      .from('notification_events')
      .insert({
        household_id: invite.household_id,
        user_id: user.id,
        event_type: 'invite_revoked',
        payload: {
          invite_id: invite.id,
          revoked_by: user.id
        }
      });

    return new Response(
      JSON.stringify({ success: true } as RevokeInviteResponse),
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
