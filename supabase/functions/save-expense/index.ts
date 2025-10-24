// Supabase Edge Function: save-expense
// Saves confirmed expense to database
// Optionally creates household split if householdId provided

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateCurrency } from "../shared/currency-validator.ts";

interface MemberSplit {
  userId: string;
  amount?: number; // For 'amount' type (in major units)
  percentage?: number; // For 'percentage' type (0-100)
  shares?: number; // For 'shares' type
}

interface CustomSplits {
  splitType: 'equal' | 'amount' | 'percentage' | 'shares';
  memberSplits: MemberSplit[];
}

interface RequestBody {
  userId: string; // User ID (required)
  amount: number; // Amount in major units
  category: string; // Category name
  currency: string; // ISO currency code
  date: string; // ISO date (YYYY-MM-DD) or ISO datetime (YYYY-MM-DDTHH:mm:ss)
  description?: string; // Optional description/note
  receiptImageUrl?: string; // Optional receipt image URL
  householdId?: string; // If provided, share with this household
  customSplits?: CustomSplits; // Custom split configuration (optional)
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

    // Validate required fields
    if (!body.userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valid amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.category) {
      return new Response(
        JSON.stringify({ error: 'Category is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.date) {
      return new Response(
        JSON.stringify({ error: 'Date is required' }),
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

    // Validate and normalize currency
    const currency = validateCurrency(body.currency || 'USD');

    console.log('[save-expense] Saving expense:', {
      userId: body.userId,
      amount: body.amount,
      category: body.category,
      currency,
      householdId: body.householdId,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-save-expense' } },
    });

    // Get user's contact_id
    const { data: contact } = await supabase
      .from('user_contacts')
      .select('id')
      .eq('user_id', body.userId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!contact) {
      return new Response(
        JSON.stringify({ error: 'User contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert amount to cents
    const amountCents = Math.round(body.amount * 100);

    // Insert expense into expenses table
    // NOTE: No share_scope column - all household expenses are visible to all members
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        contact_id: contact.id,
        user_id: body.userId,
        amount_cents: amountCents,
        category: body.category,
        date: body.date,
        raw_text: body.description || '',
        currency: currency,
        receipt_image_url: body.receiptImageUrl || null,
        household_id: body.householdId || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (expenseError) {
      console.error('[save-expense] Error saving expense:', expenseError);
      return new Response(
        JSON.stringify({ error: 'Failed to save expense', details: expenseError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[save-expense] Expense saved:', expense.id);

    // If householdId provided, create household split
    if (body.householdId) {
      console.log('[save-expense] Creating household split for household:', body.householdId);

      // Verify user is member of household
      const { data: membership } = await supabase
        .from('household_members')
        .select('id, role')
        .eq('household_id', body.householdId)
        .eq('user_id', body.userId)
        .maybeSingle();

      if (!membership) {
        console.error('[save-expense] User is not a member of household:', body.householdId);
        // Still return success for expense, just log warning
        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            warning: 'Expense saved but not shared (not a household member)',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all household members
      const { data: members } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', body.householdId);

      if (!members || members.length === 0) {
        console.error('[save-expense] No active members in household');
        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            warning: 'Expense saved but not shared (no active members)',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine split type and validate custom splits
      const splitType = body.customSplits?.splitType || 'equal';
      const customSplits = body.customSplits;

      // Validate custom splits if provided
      if (customSplits) {
        console.log('[save-expense] Processing custom splits:', splitType);

        // Validate all members are included
        const customUserIds = customSplits.memberSplits.map(s => s.userId).sort();
        const allUserIds = members.map(m => m.user_id).sort();
        
        if (JSON.stringify(customUserIds) !== JSON.stringify(allUserIds)) {
          console.error('[save-expense] Custom splits do not match household members');
          return new Response(
            JSON.stringify({
              error: 'Custom splits must include all household members',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate based on split type
        if (splitType === 'amount') {
          const totalSplit = customSplits.memberSplits.reduce((sum, s) => sum + (s.amount || 0), 0);
          const totalSplitCents = Math.round(totalSplit * 100);
          if (Math.abs(totalSplitCents - amountCents) > 1) { // Allow 1 cent rounding difference
            console.error('[save-expense] Amount splits do not equal total:', totalSplitCents, 'vs', amountCents);
            return new Response(
              JSON.stringify({
                error: `Amount splits (${totalSplit}) must equal total expense amount (${body.amount})`,
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else if (splitType === 'percentage') {
          const totalPercent = customSplits.memberSplits.reduce((sum, s) => sum + (s.percentage || 0), 0);
          if (Math.abs(totalPercent - 100) > 0.01) { // Allow 0.01% rounding difference
            console.error('[save-expense] Percentage splits do not equal 100%:', totalPercent);
            return new Response(
              JSON.stringify({
                error: `Percentage splits (${totalPercent}%) must equal 100%`,
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else if (splitType === 'shares') {
          const invalidShares = customSplits.memberSplits.some(s => !s.shares || s.shares <= 0);
          if (invalidShares) {
            console.error('[save-expense] Invalid shares detected');
            return new Response(
              JSON.stringify({
                error: 'All members must have at least 1 share',
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // Create expense split group
      const { data: splitGroup, error: splitGroupError } = await supabase
        .from('expense_split_groups')
        .insert({
          household_id: body.householdId,
          expense_id: expense.id,
          payer_user_id: body.userId,
          split_type: splitType,
          currency: currency,
          total_amount_cents: amountCents,
          description: body.description || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (splitGroupError) {
        console.error('[save-expense] Error creating split group:', splitGroupError);
        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            warning: 'Expense saved but split group creation failed',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[save-expense] Split group created:', splitGroup.id, 'with type:', splitType);

      // Create split lines based on split type
      let splitLines: any[];

      if (splitType === 'equal') {
        // Equal split: divide amount equally
        const amountPerMember = Math.floor(amountCents / members.length);
        splitLines = members.map((member) => ({
          split_group_id: splitGroup.id,
          user_id: member.user_id,
          amount_cents: amountPerMember,
          is_settled: true, // AUTO-ACCEPT
          settled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === 'amount' && customSplits) {
        // Custom amount split
        splitLines = customSplits.memberSplits.map((split) => ({
          split_group_id: splitGroup.id,
          user_id: split.userId,
          amount_cents: Math.round((split.amount || 0) * 100),
          is_settled: true, // AUTO-ACCEPT
          settled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === 'percentage' && customSplits) {
        // Percentage split: calculate amount from percentage
        splitLines = customSplits.memberSplits.map((split) => ({
          split_group_id: splitGroup.id,
          user_id: split.userId,
          amount_cents: Math.round(amountCents * (split.percentage || 0) / 100),
          percentage: split.percentage,
          is_settled: true, // AUTO-ACCEPT
          settled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === 'shares' && customSplits) {
        // Shares split: calculate amount from shares
        const totalShares = customSplits.memberSplits.reduce((sum, s) => sum + (s.shares || 0), 0);
        splitLines = customSplits.memberSplits.map((split) => ({
          split_group_id: splitGroup.id,
          user_id: split.userId,
          amount_cents: Math.round(amountCents * (split.shares || 0) / totalShares),
          shares: split.shares,
          is_settled: true, // AUTO-ACCEPT
          settled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }));
      } else {
        // Fallback to equal split
        const amountPerMember = Math.floor(amountCents / members.length);
        splitLines = members.map((member) => ({
          split_group_id: splitGroup.id,
          user_id: member.user_id,
          amount_cents: amountPerMember,
          is_settled: true, // AUTO-ACCEPT
          settled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }));
      }

      const { error: splitLinesError } = await supabase
        .from('expense_split_lines')
        .insert(splitLines);

      if (splitLinesError) {
        console.error('[save-expense] Error creating split lines:', splitLinesError);
        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            warning: 'Expense saved but split lines creation failed',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[save-expense] Split lines created for', members.length, 'members');

      // Update expense with split_group_id
      await supabase
        .from('expenses')
        .update({ split_group_id: splitGroup.id })
        .eq('id', expense.id);

      // Create notifications for all household members EXCEPT the adder
      const { error: notifyError } = await supabase.rpc('notify_household_members_expense', {
        p_household_id: body.householdId,
        p_expense_id: expense.id,
        p_actor_user_id: body.userId,
        p_event_type: 'expense_added',
        p_expense_data: {
          amount: body.amount,
          category: body.category,
          currency: currency,
          description: body.description,
        },
      });

      if (notifyError) {
        console.error('[save-expense] Error creating notifications:', notifyError);
        // Don't fail the request, just log the error
      } else {
        console.log('[save-expense] Notifications created for household members');
      }

      console.log('[save-expense] Household expense split created successfully');
    }

    // Return saved expense
    return new Response(
      JSON.stringify({
        success: true,
        data: expense,
        shared: !!body.householdId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[save-expense] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to save expense',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
