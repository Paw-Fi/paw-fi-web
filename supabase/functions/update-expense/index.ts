// Supabase Edge Function: update-expense
// Updates individual fields of an expense transaction with validation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { BudgetNudgeEvaluator } from "../shared/budget-nudge-evaluator.ts";

interface UpdateExpenseRequest {
  userId: string;
  expenseId: string;
  updates: {
    amount_cents?: number;
    category?: string;
    raw_text?: string;
    date?: string;
    currency?: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'SERVER_ERROR';
}

interface SuccessResponse {
  success: true;
  data: any;
}

type ApiResponse = ErrorResponse | SuccessResponse;

function jsonResponse(body: ApiResponse, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function errorResponse(message: string, code: ErrorResponse['code'], status: number = 400): Response {
  return jsonResponse({ success: false, error: message, code }, status);
}

// Allowed categories (must match frontend categories)
const ALLOWED_CATEGORIES = [
  'food', 'transport', 'shopping', 'entertainment', 'bills', 
  'health', 'education', 'travel', 'groceries', 'other', null
];

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 'VALIDATION_ERROR', 405);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse('Server configuration error', 'SERVER_ERROR', 500);
  }

  try {
    // Parse request body
    const body: UpdateExpenseRequest = await req.json();
    const { userId, expenseId, updates } = body;

    // Validate required fields
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return errorResponse('userId is required and must be a non-empty string', 'VALIDATION_ERROR');
    }

    if (!expenseId || typeof expenseId !== 'string' || expenseId.trim().length === 0) {
      return errorResponse('expenseId is required and must be a non-empty string', 'VALIDATION_ERROR');
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return errorResponse('updates object is required and must contain at least one field', 'VALIDATION_ERROR');
    }

    // Validate individual fields if provided
    if (updates.amount_cents !== undefined) {
      if (typeof updates.amount_cents !== 'number' || !Number.isInteger(updates.amount_cents)) {
        return errorResponse('amount_cents must be an integer', 'VALIDATION_ERROR');
      }
      if (updates.amount_cents <= 0) {
        return errorResponse('amount_cents must be greater than 0', 'VALIDATION_ERROR');
      }
      if (updates.amount_cents > 100000000) { // Max $1,000,000
        return errorResponse('amount_cents must be less than 100,000,000', 'VALIDATION_ERROR');
      }
    }

    if (updates.category !== undefined) {
      const normalizedCategory = updates.category?.toLowerCase().trim() || null;
      if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
        return errorResponse(
          `Invalid category. Allowed: ${ALLOWED_CATEGORIES.filter(c => c !== null).join(', ')}`,
          'VALIDATION_ERROR'
        );
      }
      updates.category = normalizedCategory;
    }

    if (updates.raw_text !== undefined) {
      if (typeof updates.raw_text !== 'string') {
        return errorResponse('raw_text must be a string', 'VALIDATION_ERROR');
      }
      if (updates.raw_text.trim().length === 0) {
        return errorResponse('raw_text cannot be empty', 'VALIDATION_ERROR');
      }
      if (updates.raw_text.length > 1000) {
        return errorResponse('raw_text must be less than 1000 characters', 'VALIDATION_ERROR');
      }
      updates.raw_text = updates.raw_text.trim();
    }

    if (updates.date !== undefined) {
      if (typeof updates.date !== 'string') {
        return errorResponse('date must be a string in YYYY-MM-DD format', 'VALIDATION_ERROR');
      }
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updates.date)) {
        return errorResponse('date must be in YYYY-MM-DD format', 'VALIDATION_ERROR');
      }
      
      const parsedDate = new Date(updates.date);
      if (isNaN(parsedDate.getTime())) {
        return errorResponse('Invalid date', 'VALIDATION_ERROR');
      }
      
      // Prevent future dates
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (parsedDate > today) {
        return errorResponse('Date cannot be in the future', 'VALIDATION_ERROR');
      }
    }

    if (updates.currency !== undefined) {
      if (typeof updates.currency !== 'string') {
        return errorResponse('currency must be a string', 'VALIDATION_ERROR');
      }
      // Validate and normalize currency using existing validator
      updates.currency = validateCurrency(updates.currency);
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-update-expense' } },
    });

    // Fetch expense with contact information to verify ownership and capture old values
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('id, contact_id, household_id, amount_cents, currency, raw_text, category, date, created_at, user_contacts!inner(user_id)')
      .eq('id', expenseId)
      .single();

    if (fetchError) {
      console.error('[update-expense] Fetch error:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return errorResponse('Expense not found', 'NOT_FOUND', 404);
      }
      return errorResponse('Failed to fetch expense', 'SERVER_ERROR', 500);
    }

    if (!expense) {
      return errorResponse('Expense not found', 'NOT_FOUND', 404);
    }

    // Verify ownership
    const expenseUserId = (expense.user_contacts as any)?.user_id;
    if (!expenseUserId || expenseUserId !== userId) {
      console.warn(`[update-expense] Unauthorized: User ${userId} attempted to update expense ${expenseId} owned by ${expenseUserId}`);
      return errorResponse('You do not have permission to edit this expense', 'UNAUTHORIZED', 403);
    }

    // Capture old values for notification payload
    const oldAmountCents: number | null = (expense as any)?.amount_cents ?? null;
    const oldCurrency: string | null = (expense as any)?.currency ?? null;
    const oldNote: string | null = (expense as any)?.raw_text ?? null;
    const oldCategory: string | null = (expense as any)?.category ?? null;
    const oldDate: string | null = (expense as any)?.date ?? null;
    const oldCreatedAt: string | null = (expense as any)?.created_at ?? null;

    // Update expense
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .select()
      .single();

    if (updateError) {
      console.error('[update-expense] Update error:', updateError);
      return errorResponse('Failed to update expense', 'SERVER_ERROR', 500);
    }

    console.log(`[update-expense] Successfully updated expense ${expenseId} for user ${userId}`);

    // If expense is shared with a household, notify other members
    if (expense.household_id) {
      console.log(`[update-expense] Notifying household members about edit for household ${expense.household_id}`);
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

      // Compute new values
      const newAmountCents: number | null = (updates as any).amount_cents ?? (updatedExpense as any)?.amount_cents ?? null;
      const newCurrency: string | null = (updates as any).currency ?? (updatedExpense as any)?.currency ?? oldCurrency;
      const newNote: string | null = (updates as any).raw_text ?? (updatedExpense as any)?.raw_text ?? null;
      const newCategory: string | null = (updates as any).category ?? (updatedExpense as any)?.category ?? null;
      const newDate: string | null = (updates as any).date ?? (updatedExpense as any)?.date ?? null;
      const newCreatedAt: string | null = (updates as any).created_at ?? (updatedExpense as any)?.created_at ?? null;
      
      const { error: notifyError } = await supabase.rpc('notify_household_members_expense', {
        p_household_id: expense.household_id,
        p_expense_id: expenseId,
        p_actor_user_id: userId,
        p_event_type: 'expense_edited',
        p_expense_data: {
          actor_name: actorName,
          old_amount_cents: oldAmountCents,
          new_amount_cents: newAmountCents,
          currency: newCurrency ?? oldCurrency,
          old_note: oldNote,
          new_note: newNote,
          old_category: oldCategory,
          new_category: newCategory,
          old_currency: oldCurrency,
          new_currency: newCurrency,
          old_date: oldDate,
          new_date: newDate,
          old_created_at: oldCreatedAt,
          new_created_at: newCreatedAt,
          updated_fields: Object.keys(updates),
        },
      });

      if (notifyError) {
        console.error('[update-expense] Error creating notifications:', notifyError);
        // Don't fail the request, just log the error
      } else {
        console.log('[update-expense] Notifications created for household members');
      }

      // Evaluate budget thresholds if amount or date changed (async, non-blocking)
      if (updates.amount_cents !== undefined || updates.date !== undefined) {
        try {
          console.log('[update-expense] Evaluating budget thresholds after update...');
          const evaluator = new BudgetNudgeEvaluator(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const newAmountCents = updates.amount_cents ?? oldAmountCents ?? 0;
          const newDate = (updates.date ?? oldDate ?? new Date().toISOString().split('T')[0]).split('T')[0];
          const newCurrency = updates.currency ?? oldCurrency ?? 'USD';

          const nudgesSent = await evaluator.evaluateBudgets(
            expense.household_id,
            newCurrency,
            newDate,
            {
              type: 'update',
              old_cents: Math.abs(oldAmountCents ?? 0),
              new_cents: Math.abs(newAmountCents),
            }
          );
          console.log(`[update-expense] Budget evaluation complete: ${nudgesSent} nudges sent`);
        } catch (budgetError) {
          // Log but don't fail the request
          console.error('[update-expense] Budget evaluation error (non-blocking):', budgetError);
        }
      }
    }

    return jsonResponse({
      success: true,
      data: updatedExpense,
    }, 200);

  } catch (error) {
    console.error('[update-expense] Unexpected error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      'SERVER_ERROR',
      500
    );
  }
});
