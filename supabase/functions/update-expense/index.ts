// Supabase Edge Function: update-expense
// Updates individual fields of an expense transaction with validation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
import { normalizeCategory, getAllCategories } from "../shared/category-colors.ts";

interface MemberSplitPayload {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

interface CustomSplitsPayload {
  splitType: "equal" | "amount" | "percentage" | "shares";
  memberSplits: MemberSplitPayload[];
}

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
    split_group_id?: string;
    payer_user_id?: string;
    payerUserId?: string;
  };
  householdId?: string;
  customSplits?: CustomSplitsPayload;
  payerUserId?: string;
  splitUpdate?: CustomSplitsPayload;
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

    // Normalize payer user ID from either field
    let normalizedPayerUserId: string | null = null;
    if ((updates as any).payer_user_id !== undefined || (updates as any).payerUserId !== undefined) {
      const payer = sanitizeUuid((updates as any).payer_user_id ?? (updates as any).payerUserId);
      if (!payer) {
        return errorResponse('Invalid payer user id', 'VALIDATION_ERROR');
      }
      normalizedPayerUserId = payer;
      // Remove from updates to avoid touching non-existent expense columns
      delete (updates as any).payer_user_id;
      delete (updates as any).payerUserId;
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
      .select('id, user_id, household_id, split_group_id, amount_cents, currency, raw_text, category, date, created_at')
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

    // For non-GPT requests, enforce different rules for personal vs household expenses:
    // - Personal expenses: only the creator can edit.
    // - Household expenses: any member of the household can edit.
    if (!detection.isGpt) {
      const expenseHouseholdIdForAuth: string | null = (expense as any)?.household_id ?? null;

      if (!expenseHouseholdIdForAuth) {
        // Personal expense: require that the caller is the creator via user_contacts join
        const { data: expenseWithContact } = await supabase
          .from('expenses')
          .select('id, user_contacts!inner(user_id)')
          .eq('id', expenseId)
          .single();

        const expenseUserId = (expenseWithContact as any)?.user_contacts?.user_id;
        if (!expenseUserId || expenseUserId !== userId) {
          console.warn(
            `[update-expense] Unauthorized personal edit: User ${userId} attempted to update expense ${expenseId} owned by ${expenseUserId}`,
          );
          return errorResponse(
            'You do not have permission to edit this expense',
            'UNAUTHORIZED',
            403,
          );
        }
      } else {
        // Household expense: require that the caller is a member of the household
        const { data: membership } = await supabase
          .from('household_members')
          .select('user_id')
          .eq('household_id', expenseHouseholdIdForAuth)
          .eq('user_id', userId)
          .maybeSingle();

        if (!membership) {
          console.warn(
            `[update-expense] Unauthorized household edit: User ${userId} attempted to update household expense ${expenseId} for household ${expenseHouseholdIdForAuth}`,
          );
          return errorResponse(
            'You do not have permission to edit this household expense',
            'UNAUTHORIZED',
            403,
          );
        }
      }
    } else {
      // For GPT, verify by user_id field directly (household edits are already blocked above)
      if (expense.user_id !== userId) {
        console.warn(
          `[update-expense] Unauthorized: User ${userId} attempted to update expense ${expenseId} owned by ${expense.user_id}`,
        );
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

    // Optionally create initial household split group when requested and none exists yet
    const expenseHouseholdId: string | null = (expense as any)?.household_id ?? null;
    const existingSplitGroupId: string | null = (expense as any)?.split_group_id ?? null;

    const bodyHouseholdIdRaw = (body as any).householdId as string | undefined;
    const bodyHouseholdId = bodyHouseholdIdRaw ? sanitizeUuid(bodyHouseholdIdRaw) : null;
    const customSplits = (body as any).customSplits as CustomSplitsPayload | undefined;
    const payerUserIdRaw = (body as any).payerUserId as string | undefined;
    const splitUpdate = (body as any).splitUpdate as CustomSplitsPayload | undefined;

    const shouldCreateSplitGroup =
      !!expenseHouseholdId &&
      !existingSplitGroupId &&
      !!bodyHouseholdId &&
      bodyHouseholdId === expenseHouseholdId &&
      !!customSplits &&
      !!customSplits.memberSplits &&
      customSplits.memberSplits.length > 0;

    let createdSplitGroupId: string | null = null;

    if (shouldCreateSplitGroup) {
      const splitType = customSplits!.splitType || "equal";

      const { data: members } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', expenseHouseholdId);

      if (members && members.length > 0) {
        const effectiveAmountCents =
          typeof updates.amount_cents === 'number'
            ? updates.amount_cents
            : ((expense as any)?.amount_cents as number | null) ?? 0;

        const customUserIds = customSplits!.memberSplits.map((s) => s.userId).sort();
        const allUserIds = members.map((m: any) => m.user_id as string).sort();

        if (JSON.stringify(customUserIds) === JSON.stringify(allUserIds)) {
          if (splitType === 'amount') {
            const totalSplit = customSplits!.memberSplits.reduce(
              (sum, s) => sum + (s.amount || 0),
              0,
            );
            const totalSplitCents = Math.round(totalSplit * 100);
            if (Math.abs(totalSplitCents - effectiveAmountCents) > 1) {
              return errorResponse(
                'Custom amount splits must equal total expense amount',
                'VALIDATION_ERROR',
              );
            }
          } else if (splitType === 'percentage') {
            const totalPercent = customSplits!.memberSplits.reduce(
              (sum, s) => sum + (s.percentage || 0),
              0,
            );
            if (Math.abs(totalPercent - 100) > 0.01) {
              return errorResponse(
                'Custom percentage splits must total 100%',
                'VALIDATION_ERROR',
              );
            }
          } else if (splitType === 'shares') {
            const totalShares = customSplits!.memberSplits.reduce(
              (sum, s) => sum + (s.shares || 0),
              0,
            );
            if (totalShares <= 0) {
              return errorResponse(
                'At least one member must have a share greater than 0',
                'VALIDATION_ERROR',
              );
            }
          }

          let payerUserId = payerUserIdRaw ? sanitizeUuid(payerUserIdRaw) : null;
          if (!payerUserId) {
            payerUserId = userId;
          }

          if (payerUserId) {
            const { data: validPayer } = await supabase
              .from('household_members')
              .select('user_id')
              .eq('household_id', expenseHouseholdId)
              .eq('user_id', payerUserId)
              .maybeSingle();
            if (!validPayer) {
              payerUserId = userId;
            }
          }

          const newCurrency = updates.currency || ((expense as any)?.currency as string | null) || null;

          const { data: splitGroup, error: splitGroupError } = await supabase
            .from('expense_split_groups')
            .insert({
              household_id: expenseHouseholdId,
              expense_id: expense.id,
              payer_user_id: payerUserId,
              split_type: splitType,
              currency: newCurrency,
              total_amount_cents: effectiveAmountCents,
              description: updates.raw_text || (expense as any)?.raw_text || null,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!splitGroupError && splitGroup) {
            createdSplitGroupId = (splitGroup as any).id as string;

            let splitLines: any[] = [];

            if (splitType === 'equal') {
              const amountPerMember = members.length > 0
                ? Math.floor(effectiveAmountCents / members.length)
                : 0;
              splitLines = members.map((member: any) => ({
                split_group_id: createdSplitGroupId,
                user_id: member.user_id,
                amount_cents: amountPerMember,
                is_settled: false,
                settled_at: null,
                created_at: new Date().toISOString(),
              }));
            } else if (splitType === 'amount') {
              splitLines = customSplits!.memberSplits.map((split) => ({
                split_group_id: createdSplitGroupId,
                user_id: split.userId,
                amount_cents: Math.round((split.amount || 0) * 100),
                is_settled: false,
                settled_at: null,
                created_at: new Date().toISOString(),
              }));
            } else if (splitType === 'percentage') {
              splitLines = customSplits!.memberSplits.map((split) => ({
                split_group_id: createdSplitGroupId,
                user_id: split.userId,
                amount_cents: Math.round(
                  effectiveAmountCents * (split.percentage || 0) / 100,
                ),
                percentage: split.percentage,
                is_settled: false,
                settled_at: null,
                created_at: new Date().toISOString(),
              }));
            } else if (splitType === 'shares') {
              const totalShares = customSplits!.memberSplits.reduce(
                (sum, s) => sum + (s.shares || 0),
                0,
              );
              if (totalShares > 0) {
                splitLines = customSplits!.memberSplits.map((split) => ({
                  split_group_id: createdSplitGroupId,
                  user_id: split.userId,
                  amount_cents: Math.round(
                    effectiveAmountCents * (split.shares || 0) / totalShares,
                  ),
                  shares: split.shares,
                  is_settled: false,
                  settled_at: null,
                  created_at: new Date().toISOString(),
                }));
              }
            }

            if (splitLines.length > 0) {
              const { error: splitLinesError } = await supabase
                .from('expense_split_lines')
                .insert(splitLines);

              if (!splitLinesError) {
                updates.split_group_id = createdSplitGroupId;
              }
            }
          }
        }
      }
    }

    // Optionally update an existing household split group when requested.
    // This is separate from initial split group creation and is only allowed
    // when the expense already has a split_group_id and no lines have been
    // settled yet (to preserve settlement history correctness).
    const wantsSplitUpdate =
      !!expenseHouseholdId &&
      !!existingSplitGroupId &&
      !!splitUpdate &&
      !!splitUpdate.memberSplits &&
      splitUpdate.memberSplits.length > 0;

    if (wantsSplitUpdate) {
      if (!splitUpdate) {
        return errorResponse('Invalid split update payload', 'VALIDATION_ERROR');
      }

      // Safety guard: split updates only make sense for household expenses
      if (!expenseHouseholdId) {
        return errorResponse('Cannot update splits for personal expenses', 'VALIDATION_ERROR');
      }

      // Load current split group with its lines to verify state and settled lines
      const { data: existingGroup, error: splitGroupFetchError } = await supabase
        .from('expense_split_groups')
        .select('id, household_id, total_amount_cents, currency, split_type, expense_split_lines(is_settled)')
        .eq('id', existingSplitGroupId)
        .maybeSingle();

      if (splitGroupFetchError) {
        console.error('[update-expense] Failed to load existing split group for update:', splitGroupFetchError);
        return errorResponse('Failed to load existing split group for update', 'SERVER_ERROR', 500);
      }

      if (!existingGroup) {
        console.error('[update-expense] Split group not found for update:', existingSplitGroupId);
        return errorResponse('Split group not found for update', 'NOT_FOUND', 404);
      }

      if ((existingGroup as any).household_id !== expenseHouseholdId) {
        console.warn('[update-expense] Split group household mismatch during update', {
          expenseHouseholdId,
          splitGroupHouseholdId: (existingGroup as any).household_id,
        });
        return errorResponse('Split group does not belong to this household', 'UNAUTHORIZED', 403);
      }

      const existingLines = ((existingGroup as any).expense_split_lines || []) as { is_settled?: boolean }[];
      const hasSettledLines = existingLines.some((line) => line && line.is_settled === true);

      if (hasSettledLines) {
        // Once any line has been settled, we must not change the split structure,
        // otherwise settlement history would no longer match actual payments.
        return errorResponse('Cannot change splits after any lines have been settled', 'VALIDATION_ERROR');
      }

      // Load current household members for validation and equal-split fallback
      const { data: members } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', expenseHouseholdId);

      if (!members || members.length === 0) {
        console.error('[update-expense] No active members found when updating splits');
        return errorResponse('Cannot update splits: no active household members', 'SERVER_ERROR', 500);
      }

      const effectiveAmountCents =
        typeof updates.amount_cents === 'number'
          ? updates.amount_cents
          : ((expense as any)?.amount_cents as number | null) ?? 0;

      const splitType = splitUpdate.splitType || ((existingGroup as any).split_type as CustomSplitsPayload['splitType']);

      // Validate user IDs match all household members (same rule as initial creation)
      const updateUserIds = splitUpdate.memberSplits.map((s) => s.userId).sort();
      const allUserIds = members.map((m: any) => m.user_id as string).sort();

      if (JSON.stringify(updateUserIds) !== JSON.stringify(allUserIds)) {
        console.error('[update-expense] Split update members do not match household members');
        return errorResponse('Custom splits must include all household members', 'VALIDATION_ERROR');
      }

      // Reuse the same validation logic as for creation
      if (splitType === 'amount') {
        const totalSplit = splitUpdate.memberSplits.reduce(
          (sum, s) => sum + (s.amount || 0),
          0,
        );
        const totalSplitCents = Math.round(totalSplit * 100);
        if (Math.abs(totalSplitCents - effectiveAmountCents) > 1) {
          return errorResponse(
            'Custom amount splits must equal total expense amount',
            'VALIDATION_ERROR',
          );
        }
      } else if (splitType === 'percentage') {
        const totalPercent = splitUpdate.memberSplits.reduce(
          (sum, s) => sum + (s.percentage || 0),
          0,
        );
        if (Math.abs(totalPercent - 100) > 0.01) {
          return errorResponse(
            'Custom percentage splits must total 100%',
            'VALIDATION_ERROR',
          );
        }
      } else if (splitType === 'shares') {
        const totalShares = splitUpdate.memberSplits.reduce(
          (sum, s) => sum + (s.shares || 0),
          0,
        );
        if (totalShares <= 0) {
          return errorResponse(
            'At least one member must have a share greater than 0',
            'VALIDATION_ERROR',
          );
        }
      }

      // Delete existing lines before inserting the new configuration
      const { error: deleteLinesError } = await supabase
        .from('expense_split_lines')
        .delete()
        .eq('split_group_id', existingSplitGroupId);

      if (deleteLinesError) {
        console.error('[update-expense] Failed to delete existing split lines for update:', deleteLinesError);
        return errorResponse('Failed to update splits', 'SERVER_ERROR', 500);
      }

      // Build replacement split lines based on the updated configuration
      let updatedSplitLines: any[] = [];

      if (splitType === 'equal') {
        const amountPerMember = members.length > 0
          ? Math.floor(effectiveAmountCents / members.length)
          : 0;
        updatedSplitLines = members.map((member: any) => ({
          split_group_id: existingSplitGroupId,
          user_id: member.user_id,
          amount_cents: amountPerMember,
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === 'amount') {
        updatedSplitLines = splitUpdate.memberSplits.map((split) => ({
          split_group_id: existingSplitGroupId,
          user_id: split.userId,
          amount_cents: Math.round((split.amount || 0) * 100),
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === 'percentage') {
        updatedSplitLines = splitUpdate.memberSplits.map((split) => ({
          split_group_id: existingSplitGroupId,
          user_id: split.userId,
          amount_cents: Math.round(
            effectiveAmountCents * (split.percentage || 0) / 100,
          ),
          percentage: split.percentage,
          is_settled: false,
          settled_at: null,
          created_at: new Date().toISOString(),
        }));
      } else if (splitType === 'shares') {
        const totalShares = splitUpdate.memberSplits.reduce(
          (sum, s) => sum + (s.shares || 0),
          0,
        );
        if (totalShares > 0) {
          updatedSplitLines = splitUpdate.memberSplits.map((split) => ({
            split_group_id: existingSplitGroupId,
            user_id: split.userId,
            amount_cents: Math.round(
              effectiveAmountCents * (split.shares || 0) / totalShares,
            ),
            shares: split.shares,
            is_settled: false,
            settled_at: null,
            created_at: new Date().toISOString(),
          }));
        }
      }

      if (updatedSplitLines.length > 0) {
        const { error: insertUpdatedLinesError } = await supabase
          .from('expense_split_lines')
          .insert(updatedSplitLines);

        if (insertUpdatedLinesError) {
          console.error('[update-expense] Failed to insert updated split lines:', insertUpdatedLinesError);
          return errorResponse('Failed to update splits', 'SERVER_ERROR', 500);
        }
      }

      // Keep split group metadata in sync with any amount/currency changes
      const splitGroupUpdates: Record<string, unknown> = {};
      if (typeof updates.amount_cents === 'number') {
        splitGroupUpdates.total_amount_cents = updates.amount_cents;
      }

      const newGroupCurrency =
        updates.currency || ((existingGroup as any).currency as string | null) || null;
      if (newGroupCurrency) {
        splitGroupUpdates.currency = newGroupCurrency;
      }

      if (Object.keys(splitGroupUpdates).length > 0) {
        const { error: splitGroupUpdateError } = await supabase
          .from('expense_split_groups')
          .update(splitGroupUpdates)
          .eq('id', existingSplitGroupId);

        if (splitGroupUpdateError) {
          console.error('[update-expense] Failed to update split group metadata:', splitGroupUpdateError);
          return errorResponse('Failed to update expense splits', 'SERVER_ERROR', 500);
        }
      }
    }

    // Update payer on existing split group if requested
    const targetSplitGroupId = createdSplitGroupId ?? existingSplitGroupId;
    if (normalizedPayerUserId && targetSplitGroupId) {
      const { error: payerUpdateError } = await supabase
        .from('expense_split_groups')
        .update({ payer_user_id: normalizedPayerUserId })
        .eq('id', targetSplitGroupId);
      if (payerUpdateError) {
        console.error('[update-expense] Failed to update payer_user_id on split group:', payerUpdateError);
        return errorResponse('Failed to update expense payer', 'SERVER_ERROR', 500);
      }
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
