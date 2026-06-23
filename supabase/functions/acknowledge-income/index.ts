// Supabase Edge Function: acknowledge-income
// Allows household members to acknowledge/confirm income entries
// Supports one-tap acknowledgement for transparency and trust

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

interface RequestBody {
  userId: string; // User ID performing acknowledgement
  incomeId: string; // Income transaction ID to acknowledge
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();

    console.log('[acknowledge-income] Incoming request:', {
      userId: body.userId,
      incomeId: body.incomeId,
    });

    // Validate required fields
    const userId = sanitizeUuid(body.userId);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Valid userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const incomeId = sanitizeUuid(body.incomeId);
    if (!incomeId) {
      return new Response(
        JSON.stringify({ error: 'Valid incomeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-acknowledge-income' } },
    });

    // Use the database function for acknowledgement
    const { data, error } = await supabase.rpc('acknowledge_transaction', {
      p_transaction_id: incomeId,
      p_user_id: userId,
    });

    if (error) {
      console.error('[acknowledge-income] Error acknowledging income:', error);

      // Check if error is due to permission/membership
      if (error.message?.includes('not a member')) {
        return new Response(
          JSON.stringify({ error: 'You are not a member of the household' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (error.message?.includes('not found')) {
        return new Response(
          JSON.stringify({ error: 'Income transaction not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to acknowledge income', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[acknowledge-income] Income acknowledged successfully');

    // Fetch updated income record to return
    const { data: income } = await supabase
      .from('expenses')
      .select('id, acknowledged_by')
      .eq('id', incomeId)
      .is('deleted_at', null)
      .single();

    // Create notification for income owner
    const { data: incomeOwner } = await supabase
      .from('expenses')
      .select('user_id, household_id, category, amount_cents, currency')
      .eq('id', incomeId)
      .is('deleted_at', null)
      .single();

    if (incomeOwner && incomeOwner.household_id && incomeOwner.user_id !== userId) {
      // Get acknowledger name
      let acknowledgerName = 'Someone';
      const { data: appUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
      if (appUser?.full_name && String(appUser.full_name).trim().length > 0) {
        acknowledgerName = appUser.full_name as string;
      }

      // Create notification
      await supabase.rpc('notify_household_members_expense', {
        p_household_id: incomeOwner.household_id,
        p_expense_id: incomeId,
        p_actor_user_id: userId,
        p_event_type: 'income_acknowledged',
        p_expense_data: {
          acknowledger_name: acknowledgerName,
          category: incomeOwner.category,
          amount_cents: incomeOwner.amount_cents,
          currency: incomeOwner.currency,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          incomeId: incomeId,
          acknowledgedBy: income?.acknowledged_by || [],
          acknowledgedAt: new Date().toISOString(),
        },
        message: 'Income acknowledged successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[acknowledge-income] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to acknowledge income',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
