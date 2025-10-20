// Supabase Edge Function: update-expense
// Updates individual fields of an expense transaction with validation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";

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

    // Fetch expense with contact information to verify ownership
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('id, contact_id, user_contacts!inner(user_id)')
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
