// Supabase Edge Function: update-expense
// Updates individual fields of an expense transaction with validation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
import { normalizeCategory, getAllCategories } from "../shared/category-colors.ts";

interface UpdateExpenseRequest {
  expenseId: string;
  updates: {
    amount_cents?: number;
    category?: string;
    raw_text?: string;
    date?: string;
    currency?: string;
    is_recurring?: boolean;
    recurrence_rule?: {
      frequency: string;
      anchor_date: string;
      end_date?: string;
      interval?: number;
      reminder?: {
        enabled: boolean;
        value: number;
        unit: string;
      };
    };
    source?: string;
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
  resolvedUserId?: string;
  meta?: Record<string, unknown>;
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
// Using getAllCategories() for consistency with other functions
const ALLOWED_CATEGORIES = getAllCategories();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

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
    const { expenseId, updates } = body;

    const detection = detectGptRequest(req);
    const conversationId = detection.conversationId ?? null;

    let userId: string | null = null;

    // For non-GPT requests, userId should be in body (legacy client support)
    if (!detection.isGpt && 'userId' in body && (body as any).userId) {
      userId = sanitizeUuid((body as any).userId);
      if (!userId) {
        return errorResponse('Invalid userId format', 'VALIDATION_ERROR');
      }
    }

    let resolvedIdentityMeta: Record<string, unknown> | undefined;

    if (!userId && detection.isGpt) {
      if (!conversationId) {
        return errorResponse('conversationId is required for GPT requests', 'VALIDATION_ERROR');
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { 'X-Client-Info': 'moneko-update-expense' } },
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

        console.log('[update-expense] Resolved GPT guest identity', {
          conversationId,
          userId,
          contactId: guestIdentity.contactId,
        });
      } catch (guestError) {
        console.error('[update-expense] Failed to resolve GPT guest identity:', guestError);
        return errorResponse('Failed to prepare GPT guest user', 'SERVER_ERROR', 500);
      }
    }

    if (!userId) {
      return errorResponse('userId is required for non-GPT requests', 'VALIDATION_ERROR');
    }

    // Validate required fields
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
      const normalizedCategory = normalizeCategory(updates.category || 'other');
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

    if (updates.is_recurring !== undefined) {
      if (typeof updates.is_recurring !== 'boolean') {
        return errorResponse('is_recurring must be a boolean', 'VALIDATION_ERROR');
      }
    }

    if (updates.recurrence_rule !== undefined) {
      if (updates.recurrence_rule !== null && typeof updates.recurrence_rule !== 'object') {
        return errorResponse('recurrence_rule must be an object or null', 'VALIDATION_ERROR');
      }
      
      // Validate recurrence_rule structure if provided
      if (updates.recurrence_rule !== null) {
        if (!updates.recurrence_rule.frequency || typeof updates.recurrence_rule.frequency !== 'string') {
          return errorResponse('recurrence_rule.frequency is required and must be a string', 'VALIDATION_ERROR');
        }
        
        if (!updates.recurrence_rule.anchor_date || typeof updates.recurrence_rule.anchor_date !== 'string') {
          return errorResponse('recurrence_rule.anchor_date is required and must be a string', 'VALIDATION_ERROR');
        }
        
        // Validate anchor_date is in ISO format (can include time)
        try {
          new Date(updates.recurrence_rule.anchor_date);
        } catch {
          return errorResponse('recurrence_rule.anchor_date must be a valid ISO date', 'VALIDATION_ERROR');
        }
        
        // Validate end_date if provided
        if (updates.recurrence_rule.end_date !== undefined && updates.recurrence_rule.end_date !== null) {
          if (typeof updates.recurrence_rule.end_date !== 'string') {
            return errorResponse('recurrence_rule.end_date must be a string', 'VALIDATION_ERROR');
          }
          try {
            new Date(updates.recurrence_rule.end_date);
          } catch {
            return errorResponse('recurrence_rule.end_date must be a valid ISO date', 'VALIDATION_ERROR');
          }
        }
        
        // Validate interval if provided
        if (updates.recurrence_rule.interval !== undefined && updates.recurrence_rule.interval !== null) {
          if (typeof updates.recurrence_rule.interval !== 'number' || !Number.isInteger(updates.recurrence_rule.interval)) {
            return errorResponse('recurrence_rule.interval must be an integer', 'VALIDATION_ERROR');
          }
          if (updates.recurrence_rule.interval <= 0) {
            return errorResponse('recurrence_rule.interval must be greater than 0', 'VALIDATION_ERROR');
          }
        }
      }
    }

    if (updates.source !== undefined) {
      if (updates.source !== null && typeof updates.source !== 'string') {
        return errorResponse('source must be a string or null', 'VALIDATION_ERROR');
      }
      if (updates.source !== null && updates.source.length > 500) {
        return errorResponse('source must be less than 500 characters', 'VALIDATION_ERROR');
      }
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-update-expense' } },
    });

    // Fetch expense to verify ownership and obtain household info
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('id, user_id, household_id, amount_cents, currency, raw_text, category, date, created_at')
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

    // For GPT requests, only allow personal expenses (no household_id)
    if (detection.isGpt && expense.household_id) {
      console.warn(`[update-expense] GPT attempt to update household expense: ${expenseId}`);
      return errorResponse('GPT cannot update household expenses', 'UNAUTHORIZED', 403);
    }

    // For non-GPT requests, verify ownership through user_contacts join
    if (!detection.isGpt) {
      const { data: expenseWithContact } = await supabase
        .from('expenses')
        .select('id, user_contacts!inner(user_id)')
        .eq('id', expenseId)
        .single();
      
      const expenseUserId = (expenseWithContact as any)?.user_contacts?.user_id;
      if (!expenseUserId || expenseUserId !== userId) {
        console.warn(`[update-expense] Unauthorized: User ${userId} attempted to update expense ${expenseId} owned by ${expenseUserId}`);
        return errorResponse('You do not have permission to edit this expense', 'UNAUTHORIZED', 403);
      }
    } else {
      // For GPT, verify by user_id field directly
      if (expense.user_id !== userId) {
        console.warn(`[update-expense] Unauthorized: User ${userId} attempted to update expense ${expenseId} owned by ${expense.user_id}`);
        return errorResponse('You do not have permission to edit this expense', 'UNAUTHORIZED', 403);
      }
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

    // For non-GPT requests, notify household members if this was a shared expense
    if (!detection.isGpt && expense.household_id) {
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
    }
    
    const responseData: any = {
      success: true,
      data: updatedExpense,
      resolvedUserId: userId,
      meta: resolvedIdentityMeta,
    };

    // For non-GPT requests, include shared flag
    if (!detection.isGpt) {
      responseData.shared = !!expense.household_id;
    }
    
    return jsonResponse(responseData, 200);

  } catch (error) {
    console.error('[update-expense] Unexpected error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      'SERVER_ERROR',
      500
    );
  }
});
