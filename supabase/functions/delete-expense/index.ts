// Supabase Edge Function: delete-expense
// Deletes an expense for personal budgeting (GPT-supported)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";

interface DeleteExpenseRequest {
  expenseId: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
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
    const { expenseId } = body;
    if (!expenseId) return errorResponse('expenseId is required');

    const detection = detectGptRequest(req);
    const conversationId = detection.conversationId ?? null;

    let userId: string | null = null;

    // For non-GPT requests, userId should be in body (legacy client support)
    if (!detection.isGpt && 'userId' in body && (body as any).userId) {
      userId = sanitizeUuid((body as any).userId);
      if (!userId) {
        return errorResponse('Invalid userId format');
      }
    }

    let resolvedIdentityMeta: Record<string, unknown> | undefined;

    if (!userId && detection.isGpt) {
      if (!conversationId) {
        return errorResponse('conversationId is required for GPT requests');
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { 'X-Client-Info': 'moneko-delete-expense' } },
      });

      try {
        const guestIdentity = await ensureGuestIdentity({
          supabase,
          conversationId,
        });

        userId = guestIdentity.userId;
        resolvedIdentityMeta = {
          conversationId,
          guest: {
            contactId: guestIdentity.contactId,
            createdUser: guestIdentity.createdUser,
            createdContact: guestIdentity.createdContact,
          },
        };
        if (detection.ephemeralUserId) {
          resolvedIdentityMeta.ephemeralUserId = detection.ephemeralUserId;
        }

        console.log('[delete-expense] Resolved GPT guest identity', {
          conversationId,
          userId,
          contactId: guestIdentity.contactId,
        });
      } catch (guestError) {
        console.error('[delete-expense] Failed to resolve GPT guest identity:', guestError);
        return errorResponse('Failed to prepare GPT guest user', 500);
      }
    }

    if (!userId) {
      return errorResponse('userId is required for non-GPT requests');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-delete-expense' } },
    });

    // Fetch expense to verify ownership and obtain household info
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('id, user_id, household_id, amount_cents, currency, raw_text, category, date')
      .eq('id', expenseId)
      .single();

    if (error || !expense) {
      return errorResponse('Expense not found', 404);
    }

    // For GPT requests, only allow personal expenses (no household_id)
    if (detection.isGpt && expense.household_id) {
      console.warn('[delete-expense] GPT attempt to delete household expense:', expenseId);
      return errorResponse('GPT cannot delete household expenses', 403);
    }

    // For non-GPT requests, verify ownership via expenses.user_id
    if (!detection.isGpt) {
      const expenseUserId = (expense as any)?.user_id as string | undefined;
      if (!expenseUserId || expenseUserId !== userId) {
        return errorResponse('You do not have permission to delete this expense', 403);
      }
    } else {
      // For GPT, verify by user_id field directly
      if (expense.user_id !== userId) {
        return errorResponse('You do not have permission to delete this expense', 403);
      }
    }

    // Delete the expense
    const { error: delError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    
    if (delError) return errorResponse('Failed to delete expense', 500);

    console.log('[delete-expense] Successfully deleted expense', {
      expenseId,
      userId,
      category: expense.category,
      amount: expense.amount_cents / 100,
    });

    // For non-GPT requests, notify household members if this was a shared expense
    if (!detection.isGpt && expense.household_id) {
      console.log('[delete-expense] Notifying household members about deletion for household:', expense.household_id);
      
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

      const { error: notifyError } = await supabase.rpc('notify_household_members_expense', {
        p_household_id: expense.household_id,
        p_expense_id: expenseId,
        p_actor_user_id: userId,
        p_event_type: 'expense_deleted',
        p_expense_data: {
          actor_name: actorName,
          amount_cents: expense.amount_cents,
          currency: expense.currency,
          raw_text: expense.raw_text,
          category: expense.category,
          date: expense.date,
        },
      });

      if (notifyError) {
        console.error('[delete-expense] Error creating notifications:', notifyError);
        // Don't fail the request, just log the error
      } else {
        console.log('[delete-expense] Notifications created for household members');
      }
    }

    const responseData: any = {
      success: true,
      resolvedUserId: userId,
      meta: resolvedIdentityMeta,
    };

    // For non-GPT requests, include shared flag
    if (!detection.isGpt) {
      responseData.shared = !!expense.household_id;
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Unexpected error', 500);
  }
});
