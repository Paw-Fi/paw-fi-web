import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type SplitType = 'equal' | 'percentage' | 'amount' | 'shares';

interface SplitLine {
  user_id: string;
  amount_cents?: number;
  percentage?: number;
  shares?: number;
}

interface ComputeSplitsRequest {
  expense_id: string;
  household_id: string;
  payer_user_id: string;
  split_type: SplitType;
  currency: string;
  total_amount_cents: number;
  description?: string;
  splits: SplitLine[];
}

interface ComputeSplitsResponse {
  success: boolean;
  split_group_id?: string;
  split_lines?: any[];
  balances?: Record<string, number>; // user_id -> amount they owe (+) or are owed (-)
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
    const body: ComputeSplitsRequest = await req.json();
    const {
      expense_id,
      household_id,
      payer_user_id,
      split_type,
      currency,
      total_amount_cents,
      description,
      splits
    } = body;

    // Validate required fields
    if (!expense_id || !household_id || !payer_user_id || !split_type || !currency || !total_amount_cents || !splits) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (total_amount_cents <= 0) {
      return new Response(
        JSON.stringify({ error: 'total_amount_cents must be positive' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      return new Response(
        JSON.stringify({ error: 'splits must be a non-empty array' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user is a member of the household
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('id')
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

    // Validate all split participants are household members (SECURITY)
    const allUserIds = splits.map(s => s.user_id).filter(Boolean);
    if (allUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid user IDs in splits' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Include payer in validation
    const userIdsToValidate = [...new Set([...allUserIds, payer_user_id])];

    const { data: members, error: membersError } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', household_id)
      .in('user_id', userIdsToValidate);

    if (membersError) {
      console.error('Error validating participants:', membersError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate participants' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const validMemberIds = new Set(members?.map(m => m.user_id) || []);
    const invalidUserIds = userIdsToValidate.filter(id => !validMemberIds.has(id));

    if (invalidUserIds.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Some participants are not household members',
          invalid_user_ids: invalidUserIds
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate split type and calculations
    let calculatedSplitLines: SplitLine[] = [];

    if (split_type === 'equal') {
      // Equal split: divide total amount equally among all participants
      const amountPerPerson = Math.floor(total_amount_cents / splits.length);
      const remainder = total_amount_cents - (amountPerPerson * splits.length);

      calculatedSplitLines = splits.map((split, index) => ({
        user_id: split.user_id,
        amount_cents: amountPerPerson + (index === 0 ? remainder : 0), // Give remainder to first person
        percentage: null,
        shares: null
      }));

    } else if (split_type === 'percentage') {
      // Percentage split: validate percentages sum to 100
      const totalPercentage = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);

      if (Math.abs(totalPercentage - 100) > 0.01) {
        return new Response(
          JSON.stringify({ error: `Percentages must sum to 100, got ${totalPercentage}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      let totalAllocated = 0;
      calculatedSplitLines = splits.map((split, index) => {
        const percentage = split.percentage || 0;
        let amountCents: number;

        if (index === splits.length - 1) {
          // Last person gets remainder to avoid rounding errors
          amountCents = total_amount_cents - totalAllocated;
        } else {
          amountCents = Math.floor(total_amount_cents * percentage / 100);
          totalAllocated += amountCents;
        }

        return {
          user_id: split.user_id,
          amount_cents: amountCents,
          percentage,
          shares: null
        };
      });

    } else if (split_type === 'amount') {
      // Fixed amount split: validate amounts sum to total
      const totalAmount = splits.reduce((sum, split) => sum + (split.amount_cents || 0), 0);

      if (totalAmount !== total_amount_cents) {
        return new Response(
          JSON.stringify({ error: `Split amounts must sum to ${total_amount_cents}, got ${totalAmount}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      calculatedSplitLines = splits.map(split => ({
        user_id: split.user_id,
        amount_cents: split.amount_cents || 0,
        percentage: null,
        shares: null
      }));

    } else if (split_type === 'shares') {
      // Shares split: divide based on share ratios
      const totalShares = splits.reduce((sum, split) => sum + (split.shares || 0), 0);

      if (totalShares === 0) {
        return new Response(
          JSON.stringify({ error: 'Total shares must be greater than 0' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      let totalAllocated = 0;
      calculatedSplitLines = splits.map((split, index) => {
        const shares = split.shares || 0;
        let amountCents: number;

        if (index === splits.length - 1) {
          // Last person gets remainder
          amountCents = total_amount_cents - totalAllocated;
        } else {
          amountCents = Math.floor(total_amount_cents * shares / totalShares);
          totalAllocated += amountCents;
        }

        return {
          user_id: split.user_id,
          amount_cents: amountCents,
          percentage: null,
          shares
        };
      });

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid split_type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if split group already exists for this transaction
    const { data: existingSplitGroup } = await supabase
      .from('expense_split_groups')
      .select('id')
      .eq('expense_id', expense_id)
      .single();

    if (existingSplitGroup) {
      return new Response(
        JSON.stringify({ error: 'A split already exists for this transaction' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create split group (atomic transaction)
    const { data: splitGroup, error: splitGroupError } = await supabase
      .from('expense_split_groups')
      .insert({
        household_id,
        expense_id: expense_id,
        payer_user_id,
        split_type,
        currency,
        total_amount_cents,
        description
      })
      .select()
      .single();

    if (splitGroupError) {
      console.error('Error creating split group:', splitGroupError);
      return new Response(
        JSON.stringify({ error: 'Failed to create split group' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create split lines
    const splitLinesData = calculatedSplitLines.map(line => ({
      split_group_id: splitGroup.id,
      user_id: line.user_id,
      amount_cents: line.amount_cents,
      percentage: line.percentage,
      shares: line.shares,
      is_settled: false
    }));

    const { data: splitLines, error: splitLinesError } = await supabase
      .from('expense_split_lines')
      .insert(splitLinesData)
      .select();

    if (splitLinesError) {
      console.error('Error creating split lines:', splitLinesError);

      // Rollback: delete the split group
      await supabase
        .from('expense_split_groups')
        .delete()
        .eq('id', splitGroup.id);

      return new Response(
        JSON.stringify({ error: 'Failed to create split lines' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update expense with split_group_id
    await supabase
      .from('expenses')
      .update({ split_group_id: splitGroup.id })
      .eq('id', expense_id);

    // Calculate balances (who owes whom)
    const balances: Record<string, number> = {};

    // Payer is owed the total amount
    balances[payer_user_id] = total_amount_cents;

    // Each participant owes their share
    for (const line of calculatedSplitLines) {
      if (line.user_id === payer_user_id) {
        // Payer owes themselves, so reduce what they're owed
        balances[payer_user_id] -= line.amount_cents!;
      } else {
        // Other participants owe money
        balances[line.user_id] = -(line.amount_cents!);
      }
    }

    // Create notification event
    await supabase
      .from('notification_events')
      .insert({
        household_id,
        user_id: user.id,
        event_type: 'split_created',
        payload: {
          split_group_id: splitGroup.id,
          expense_id,
          payer_user_id,
          split_type,
          total_amount_cents,
          participant_count: splits.length
        }
      });

    const response: ComputeSplitsResponse = {
      success: true,
      split_group_id: splitGroup.id,
      split_lines: splitLines,
      balances
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
