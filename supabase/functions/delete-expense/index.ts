// Supabase Edge Function: delete-expense
// Deletes an expense and notifies household members (except actor)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { BudgetNudgeEvaluator } from "../shared/budget-nudge-evaluator.ts";

interface DeleteExpenseRequest {
  userId: string;
  expenseId: string;
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse('Server configuration error', 500);
  }

  try {
    const body: DeleteExpenseRequest = await req.json();
    const { userId, expenseId } = body;
    if (!userId || !expenseId) return errorResponse('userId and expenseId are required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-delete-expense' } },
    });

    // Fetch expense to verify ownership and obtain payload
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('id, user_contacts!inner(user_id), household_id, amount_cents, currency, raw_text, category')
      .eq('id', expenseId)
      .single();

    if (error || !expense) {
      return errorResponse('Expense not found', 404);
    }
    const ownerUserId = (expense.user_contacts as any)?.user_id;
    if (ownerUserId !== userId) {
      return errorResponse('You do not have permission to delete this expense', 403);
    }

    // Delete the expense
    const { error: delError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    if (delError) return errorResponse('Failed to delete expense', 500);

    // Evaluate budget thresholds after deletion (expense removed, spending decreased)
    // Note: Budget nudges only sent on UPWARD threshold crossings, so deletion won't trigger nudges
    // However, we still call the evaluator to keep the logic consistent and for potential future features
    if (expense.household_id) {
      try {
        console.log('[delete-expense] Evaluating budget thresholds after deletion...');
        const evaluator = new BudgetNudgeEvaluator(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        // Note: Since we're deleting, this will decrease spending and won't cross thresholds upward
        // But we keep the call for consistency and future downward notification support
        await evaluator.evaluateBudgets(
          expense.household_id,
          (expense as any)?.currency ?? 'USD',
          (expense as any)?.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
          {
            type: 'delete',
            old_cents: Math.abs((expense as any)?.amount_cents ?? 0), // Amount being removed
          }
        );
      } catch (budgetError) {
        console.error('[delete-expense] Budget evaluation error (non-blocking):', budgetError);
      }
    }

    // If household expense, notify members
    if (expense.household_id) {
      // Resolve actor display name
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

      await supabase.rpc('notify_household_members_expense', {
        p_household_id: expense.household_id,
        p_expense_id: expenseId,
        p_actor_user_id: userId,
        p_event_type: 'expense_deleted',
        p_expense_data: {
          actor_name: actorName,
          amount_cents: (expense as any)?.amount_cents ?? null,
          currency: (expense as any)?.currency ?? null,
          note: (expense as any)?.raw_text ?? null,
          category: (expense as any)?.category ?? null,
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Unexpected error', 500);
  }
});
