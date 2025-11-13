// Supabase Edge Function: save-expense
// Saves confirmed expense to database
// Optionally creates household split if householdId provided

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateCurrency } from "../shared/currency-validator.ts";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

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
  userId?: string; // User ID (optional when request originates from GPT)
  amount: number; // Amount in major units
  category: string; // Category name
  currency: string; // ISO currency code
  date: string; // ISO date (YYYY-MM-DD) or ISO datetime (YYYY-MM-DDTHH:mm:ss)
  clientCreatedAt?: string; // Optional client-side timestamp with timezone (ISO)
  description?: string; // Optional description/note
  receiptImageUrl?: string; // Optional receipt image URL
  householdId?: string; // If provided, share with this household
  customSplits?: CustomSplits; // Custom split configuration (optional)
  isRecurring?: boolean; // Whether this is a recurring expense (v1.5)
  recurrence_rule?: { // Recurrence configuration (v1.5)
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';
    anchor_date: string;
    end_date?: string;
    interval?: number;
    reminder?: { // Optional reminder configuration (v1.6)
      enabled: boolean;
      value: number; // How many days/hours before
      unit: 'days' | 'hours';
    };
  };
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

    const headerSnapshot: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headerSnapshot[key] = value;
    });
    console.log('[save-expense] Incoming headers:', headerSnapshot);
    console.log('[save-expense] Incoming body:', body);

    const detection = detectGptRequest(req);

    let userId = sanitizeUuid(body.userId ?? null);

    if (body.userId && !userId) {
      console.warn('[save-expense] Ignoring invalid userId provided in payload', {
        provided: body.userId,
        conversationId: detection.conversationId,
      });
    }

    if (!userId && !detection.isGpt) {
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
    const resolvedUserMetadata: Record<string, unknown> = {};
    if (detection.conversationId) {
      resolvedUserMetadata.conversationId = detection.conversationId;
    }
    if (detection.ephemeralUserId) {
      resolvedUserMetadata.ephemeralUserId = detection.ephemeralUserId;
    }

    console.log('[save-expense] Saving expense:', {
      userId,
      amount: body.amount,
      category: body.category,
      currency,
      householdId: body.householdId,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-save-expense' } },
    });

    let contactId: string | null = null;

    if (userId) {
      const { data: contact, error: contactError } = await supabase
        .from('user_contacts')
        .select('id, preferred_currency')
        .eq('user_id', userId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contactError) {
        console.error('[save-expense] Failed to look up user contact:', contactError);
        return new Response(
          JSON.stringify({ error: 'Failed to resolve user contact' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (contact) {
        contactId = contact.id;
        if (!contact.preferred_currency && currency) {
          const { error: updateCurrencyError } = await supabase
            .from('user_contacts')
            .update({ preferred_currency: currency })
            .eq('id', contact.id);
          if (updateCurrencyError) {
            console.error('[save-expense] Failed to update contact currency:', updateCurrencyError);
          }
        }
      }
    }

    if (!contactId && detection.isGpt && detection.conversationId) {
      try {
        const guestIdentity = await ensureGuestIdentity({
          supabase,
          conversationId: detection.conversationId,
          currency,
        });
        userId = guestIdentity.userId;
        contactId = guestIdentity.contactId;
        console.log('[save-expense] Resolved GPT guest identity', {
          conversationId: detection.conversationId,
          userId,
          contactId,
        });
        resolvedUserMetadata.guest = {
          createdUser: guestIdentity.createdUser,
          createdContact: guestIdentity.createdContact,
        };
      } catch (identityError) {
        console.error('[save-expense] Failed to resolve GPT guest identity:', identityError);
        return new Response(
          JSON.stringify({ error: 'Failed to prepare GPT guest user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!contactId || !userId) {
      return new Response(
        JSON.stringify({ error: 'User contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert amount to cents
    const amountCents = Math.round(body.amount * 100);

    console.log('[save-expense] Full request body:', JSON.stringify(body, null, 2));
    console.log('[save-expense] isRecurring:', body.isRecurring);
    console.log('[save-expense] recurrence_rule:', body.recurrence_rule);

    // Insert expense into expenses table
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        contact_id: contactId,
        user_id: userId,
        amount_cents: amountCents,
        category: body.category,
        date: body.date,
        raw_text: body.description || '',
        currency: currency,
        receipt_image_url: body.receiptImageUrl || null,
        created_at: body.clientCreatedAt || new Date().toISOString(),
        is_recurring: body.isRecurring || false,
        recurrence_rule: body.recurrence_rule || null, // Don't stringify - Supabase handles JSONB automatically
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

    // GPT requests do not support household functionality
    if (detection.isGpt) {
      console.log('[save-expense] GPT request - household features disabled');
      return new Response(
        JSON.stringify({
          success: true,
          data: expense,
          shared: false,
          resolvedUserId: userId,
          meta: resolvedUserMetadata,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve actor display name for notification title
    let actorName = 'Someone';
    try {
      const { data: appUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
      if (appUser?.full_name && String(appUser.full_name).trim().length > 0) {
        actorName = appUser.full_name as string;
      }
    } catch (_) {}

    // If householdId provided, create household split
    if (body.householdId) {
      console.log('[save-expense] Creating household split for household:', body.householdId);

      // Verify user is member of household
      const { data: membership } = await supabase
        .from('household_members')
        .select('id, role')
        .eq('household_id', body.householdId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!membership) {
        console.error('[save-expense] User is not a member of household:', body.householdId);
        // Still return success for expense, just log warning
        return new Response(
          JSON.stringify({
            success: true,
            data: expense,
            warning: 'Expense saved but not shared (not a household member)',
            resolvedUserId: userId,
            meta: resolvedUserMetadata,
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
              resolvedUserId: userId,
              meta: resolvedUserMetadata,
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
          const totalShares = customSplits.memberSplits.reduce((sum, s) => sum + (s.shares || 0), 0);
          if (totalShares <= 0) {
            console.error('[save-expense] Invalid shares: total shares must be > 0');
            return new Response(
              JSON.stringify({
                error: 'At least one member must have a share greater than 0',
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
          payer_user_id: userId,
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
              resolvedUserId: userId,
              meta: resolvedUserMetadata,
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
        if (totalShares <= 0) {
          console.error('[save-expense] Cannot create split lines: total shares is 0');
          return new Response(
            JSON.stringify({
              success: true,
              data: expense,
              warning: 'Expense saved but split lines creation failed due to invalid shares',
              resolvedUserId: userId,
              meta: resolvedUserMetadata,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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
              resolvedUserId: userId,
              meta: resolvedUserMetadata,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      console.log('[save-expense] Split lines created for', members.length, 'members');

      // Update expense with split_group_id AND household_id
      await supabase
        .from('expenses')
        .update({
          split_group_id: splitGroup.id,
          household_id: body.householdId,
        })
        .eq('id', expense.id);

      // Create notifications for all household members EXCEPT the adder
      const { error: notifyError } = await supabase.rpc('notify_household_members_expense', {
        p_household_id: body.householdId,
        p_expense_id: expense.id,
        p_actor_user_id: userId,
        p_event_type: 'expense_added',
        p_expense_data: {
          actor_name: actorName,
          amount_cents: amountCents,
          currency: currency,
          category: body.category,
          note: body.description || '',
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
        resolvedUserId: userId,
        meta: resolvedUserMetadata,
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
