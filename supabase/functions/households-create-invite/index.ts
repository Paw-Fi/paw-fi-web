import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";
import { householdInviteTemplate } from "../shared/email-templates.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const appUrl = Deno.env.get('APP_URL') || 'https://moneko.io';
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const resendFrom = Deno.env.get('RESEND_FROM') || 'Moneko <no-reply@moneko.io>';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface CreateInviteRequest {
  household_id: string;
  invited_email?: string;
  personal_message?: string;
  inviter_name?: string;
  household_name?: string;
  expires_in_days?: number;
}

interface CreateInviteResponse {
  invite_url: string;
  token: string;
  expires_at: string | null;
}

async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  personalMessage?: string;
  inviterName?: string;
  householdName?: string;
}) {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const { to, inviteUrl, personalMessage, inviterName, householdName } = params;
  const { html, text, subject } = householdInviteTemplate({
    inviteUrl,
    personalMessage,
    inviterName,
    householdName,
  });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${errorBody}`);
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
    const body: CreateInviteRequest = await req.json();
    const {
      household_id,
      invited_email,
      personal_message,
      inviter_name,
      household_name,
    } = body;
    let { expires_in_days } = body as { expires_in_days?: number };
    if (typeof expires_in_days !== 'number') expires_in_days = 7;

    if (!household_id) {
      return new Response(
        JSON.stringify({ error: 'household_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user is owner or admin of the household
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', household_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'You are not a member of this household' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only owners and admins can create invites' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate TTL (max 30 days), allow 0 = unlimited
    const maxTTLDays = 30;
    if (expires_in_days !== 0) {
      if (expires_in_days! > maxTTLDays) {
        return new Response(
          JSON.stringify({ error: `Invite expiry cannot exceed ${maxTTLDays} days` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (expires_in_days! < 1) {
        return new Response(
          JSON.stringify({ error: 'Invite expiry must be at least 1 day or 0 for unlimited' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate unique token
    const token = crypto.randomUUID() + '-' + Date.now().toString(36);

    // Calculate expiry date (null for unlimited)
    const expiresAt = expires_in_days === 0 ? null : new Date(Date.now() + expires_in_days! * 24 * 60 * 60 * 1000);

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        token,
        household_id,
        inviter_id: user.id,
        invited_email,
        personal_message,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        status: 'pending'
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invite' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const inviteUrl = `${appUrl}/invites/${token}`;

    if (invited_email) {
      const resolvedInviterName = inviter_name?.trim()
        || user.user_metadata?.full_name
        || user.user_metadata?.name
        || user.email?.split('@')[0]
        || 'Someone';
      let resolvedHouseholdName = household_name?.trim();
      if (!resolvedHouseholdName) {
        const { data: householdData } = await supabase
          .from('households')
          .select('name')
          .eq('id', household_id)
          .single();
        resolvedHouseholdName = householdData?.name ?? undefined;
      }
      try {
        await sendInviteEmail({
          to: invited_email,
          inviteUrl,
          personalMessage: personal_message,
          inviterName: resolvedInviterName,
          householdName: resolvedHouseholdName,
        });
      } catch (error) {
        console.error('Error sending invite email:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to send invitation email' }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    const response: CreateInviteResponse = {
      invite_url: inviteUrl,
      token,
      expires_at: invite.expires_at
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
