import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface HouseholdSummaryRequest {
  household_id: string;
  currency?: string;
  start_date?: string;
  end_date?: string;
}

interface MemberContribution {
  user_id: string;
  total_spent_cents: number;
  transaction_count: number;
  split_count: number;
  balance_cents: number; // How much they owe (+) or are owed (-)
}

interface CategoryBreakdown {
  category: string;
  amount_cents: number;
  percentage: number;
  transaction_count: number;
}

interface BudgetStatus {
  budget_id: string;
  name: string;
  currency: string;
  period: string;
  amount_cents: number;
  spent_cents: number;
  remaining_cents: number;
  percentage_used: number;
  is_over_budget: boolean;
  is_at_warn_threshold: boolean;
  is_at_alert_threshold: boolean;
}

interface HouseholdSummaryResponse {
  household_id: string;
  currency: string;
  period: {
    start_date: string;
    end_date: string;
  };
  totals: {
    total_expenses_cents: number;
    total_income_cents: number;
    net_cents: number;
    transaction_count: number;
    split_count: number;
  };
  member_contributions: MemberContribution[];
  category_breakdown: CategoryBreakdown[];
  budgets: BudgetStatus[];
  balances: Record<string, number>; // user_id -> net balance
}

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Allow both GET and POST
    if (req.method !== 'POST' && req.method !== 'GET') {
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

    // Parse request parameters
    let params: HouseholdSummaryRequest;

    if (req.method === 'POST') {
      params = await req.json();
    } else {
      const url = new URL(req.url);
      params = {
        household_id: url.searchParams.get('household_id') || '',
        currency: url.searchParams.get('currency') || undefined,
        start_date: url.searchParams.get('start_date') || undefined,
        end_date: url.searchParams.get('end_date') || undefined
      };
    }

    const { household_id, currency = 'USD', start_date, end_date } = params;

    if (!household_id) {
      return new Response(
        JSON.stringify({ error: 'household_id is required' }),
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

    // Default date range: current month
    const startDate = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const endDate = end_date || new Date().toISOString();

    // Fetch household expenses
    // NOTE: No share_scope filter - all household members can see all expenses
    let expensesQuery = supabase
      .from('expenses')
      .select('*')
      .eq('household_id', household_id)
      .gte('date', startDate.split('T')[0]) // expenses table uses 'date' not 'created_at'
      .lte('date', endDate.split('T')[0]);

    if (currency) {
      expensesQuery = expensesQuery.eq('currency', currency);
    }

    const { data: expensesRaw, error: expensesError } = await expensesQuery;

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expenses' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const expenses = (expensesRaw || []).filter((e) => {
      const isRecurring = e.is_recurring === true;
      const type = (e.type || 'expense').toLowerCase();
      return !isRecurring && type !== 'income';
    });

    const totalExpensesCents = expenses
      .reduce((sum, e) => sum + Math.abs(e.amount_cents || 0), 0);

    // Income is not tracked here; if ever added, it should be in a different table
    const totalIncomeCents = 0;

    // Net = 0 - expenses (negative number)
    const netCents = -totalExpensesCents;

    // Fetch splits FIRST for accurate member contribution calculations
    // CRITICAL: Do NOT filter splits by date - we need ALL splits for ANY expense in the household
    // The expense date filtering is sufficient - splits just need to match expense IDs
    const { data: splitGroups, error: splitGroupsError } = await supabase
      .from('expense_split_groups')
      .select(`
        id,
        expense_id,
        payer_user_id,
        total_amount_cents,
        created_at,
        expense_split_lines (
          user_id,
          amount_cents,
          is_settled
        )
      `)
      .eq('household_id', household_id);

    if (splitGroupsError) {
      console.error('Error fetching split groups:', splitGroupsError);
    }

    // Create lookup maps for quick access
    const expenseIdToSplitGroup = new Map<string, typeof splitGroups[0]>();
    const splitGroupIdToSplitGroup = new Map<string, typeof splitGroups[0]>();
    for (const splitGroup of splitGroups || []) {
      if (splitGroup.id) {
        splitGroupIdToSplitGroup.set(splitGroup.id, splitGroup);
      }
      if (splitGroup.expense_id) {
        expenseIdToSplitGroup.set(splitGroup.expense_id, splitGroup);
      }
    }

    // Calculate member contributions with CORRECT split handling
    const memberContributionsMap = new Map<string, MemberContribution>();

    for (const expense of expenses) {
      const expenseId = expense.id;
      const payerId = expense.user_id;
      const expenseAmount = Math.abs(expense.amount_cents || 0);

      // Check if this expense has a split
      let splitGroup = undefined as undefined | typeof splitGroups[0];

      // 1) Prefer linking via expense.split_group_id (authoritative)
      if (expense.split_group_id) {
        splitGroup = splitGroupIdToSplitGroup.get(expense.split_group_id);
      }

      // 2) Fallback: link by expense_id on split group
      if (!splitGroup) {
        splitGroup = expenseIdToSplitGroup.get(expenseId);
      }

      // Fallback matching for legacy records missing expense_id linkage
      if (!splitGroup && (splitGroups?.length || 0) > 0) {
        splitGroup = (splitGroups || []).find((sg) => {
          if (sg.expense_id === expenseId) return true;
          const diff = Math.abs((sg.total_amount_cents || 0) - expenseAmount);
          return diff < 100; // within $1 difference in cents
        });
      }

      if (splitGroup && splitGroup.expense_split_lines && splitGroup.expense_split_lines.length > 0) {
        // EXPENSE HAS A SPLIT: Each user should be credited with their split portion only
        for (const splitLine of splitGroup.expense_split_lines) {
          const userId = splitLine.user_id;
          const userSplitAmount = Math.abs(splitLine.amount_cents || 0);

          if (!memberContributionsMap.has(userId)) {
            memberContributionsMap.set(userId, {
              user_id: userId,
              total_spent_cents: 0,
              transaction_count: 0,
              split_count: 0,
              balance_cents: 0
            });
          }

          const contribution = memberContributionsMap.get(userId)!;
          // Add only the user's split portion to their total_spent_cents
          contribution.total_spent_cents += userSplitAmount;

          // Only increment transaction_count for the payer
          if (userId === payerId) {
            contribution.transaction_count += 1;
          }
        }
      } else {
        // EXPENSE HAS NO SPLIT: The payer is credited with the full amount
        if (!memberContributionsMap.has(payerId)) {
          memberContributionsMap.set(payerId, {
            user_id: payerId,
            total_spent_cents: 0,
            transaction_count: 0,
            split_count: 0,
            balance_cents: 0
          });
        }

        const contribution = memberContributionsMap.get(payerId)!;
        contribution.total_spent_cents += expenseAmount;
        contribution.transaction_count += 1;
      }
    }

    const balances: Record<string, number> = {};

    for (const splitGroup of splitGroups || []) {
      const payerId = splitGroup.payer_user_id;
      const totalAmount = splitGroup.total_amount_cents;

      // Payer is owed the total
      balances[payerId] = (balances[payerId] || 0) + totalAmount;

      // Each participant owes their share
      for (const line of splitGroup.expense_split_lines || []) {
        if (!line.is_settled) {
          if (line.user_id === payerId) {
            // Payer owes themselves
            balances[payerId] -= line.amount_cents || 0;
          } else {
            // Participant owes
            balances[line.user_id] = (balances[line.user_id] || 0) - (line.amount_cents || 0);
          }
        }

        // Update split count
        const contribution = memberContributionsMap.get(line.user_id);
        if (contribution) {
          contribution.split_count += 1;
        }
      }
    }

    // Apply balances to contributions
    for (const [userId, balance] of Object.entries(balances)) {
      const contribution = memberContributionsMap.get(userId);
      if (contribution) {
        contribution.balance_cents = balance;
      }
    }

    // Calculate category breakdown
    const categoryMap = new Map<string, { amount_cents: number; count: number }>();

    for (const expense of expenses) {
      const category = expense.category || 'Uncategorized';
      const amount = Math.abs(expense.amount_cents || 0);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { amount_cents: 0, count: 0 });
      }

      const cat = categoryMap.get(category)!;
      cat.amount_cents += amount;
      cat.count += 1;
    }

    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount_cents: data.amount_cents,
        percentage: totalExpensesCents > 0 ? (data.amount_cents / totalExpensesCents) * 100 : 0,
        transaction_count: data.count
      }))
      .sort((a, b) => b.amount_cents - a.amount_cents);

    // Calculate user's actual spending (what they owe after splits)
    // This is what should be used for PERSONAL budgets
    let userActualSpending = 0;

    // Start with total expenses the user paid
    const userExpenses = expenses.filter(e => e.user_id === user.id);

    for (const expense of userExpenses) {
      // Check if this expense has a split
      let expenseSplit = undefined as undefined | typeof splitGroups[0];
      if (expense.split_group_id) {
        expenseSplit = splitGroupIdToSplitGroup.get(expense.split_group_id);
      }
      if (!expenseSplit) {
        expenseSplit = splitGroups?.find(sg =>
          sg.expense_id === expense.id ||
          (sg.created_at && Math.abs((sg.total_amount_cents || 0) - Math.abs(expense.amount_cents || 0)) < 100)
        );
      }

      if (expenseSplit) {
        // Find user's portion from split lines
        const userLine = expenseSplit.expense_split_lines?.find(line => line.user_id === user.id);
        if (userLine) {
          // Add only their split portion
          userActualSpending += userLine.amount_cents || 0;
        } else {
          // User is payer but not in split lines - this shouldn't happen but fallback to full amount
          userActualSpending += Math.abs(expense.amount_cents || 0);
        }
      } else {
        // No split, user pays full amount
        userActualSpending += Math.abs(expense.amount_cents || 0);
      }
    }

    // Fetch budgets and calculate status
    const { data: budgets } = await supabase
      .from('shared_budgets')
      .select('*')
      .eq('household_id', household_id)
      .eq('is_active', true);

    const budgetStatuses: BudgetStatus[] = [];

    for (const budget of budgets || []) {
      if (currency && budget.currency !== currency) continue;

      // Calculate spending based on budget type
      let spentCents = 0;

      if (budget.budget_type === 'household') {
        // Household budget: use total household spending (absolute)
        spentCents = totalExpensesCents;
      } else if (budget.budget_type === 'personal') {
        // Personal budget with split awareness
        if (budget.count_split_portion_only) {
          // Use user's actual spending (calculated above with split portions)
          spentCents = userActualSpending;
        } else {
          // Use all user's expenses (absolute), regardless of sign
          const userExpenseTotal = expenses
            .filter(e => e.user_id === user.id)
            .reduce((sum, e) => sum + Math.abs(e.amount_cents || 0), 0);
          spentCents = userExpenseTotal;
        }
      }

      const percentageUsed = budget.amount_cents > 0 ? (spentCents / budget.amount_cents) * 100 : 0;

      budgetStatuses.push({
        budget_id: budget.id,
        name: budget.name,
        currency: budget.currency,
        period: budget.period,
        amount_cents: budget.amount_cents,
        spent_cents: spentCents,
        remaining_cents: budget.amount_cents - spentCents,
        percentage_used: percentageUsed,
        is_over_budget: spentCents > budget.amount_cents,
        is_at_warn_threshold: percentageUsed >= (budget.warn_threshold * 100),
        is_at_alert_threshold: percentageUsed >= (budget.alert_threshold * 100)
      });
    }

    const response: HouseholdSummaryResponse = {
      household_id,
      currency,
      period: {
        start_date: startDate,
        end_date: endDate
      },
      totals: {
        total_expenses_cents: totalExpensesCents,
        total_income_cents: totalIncomeCents,
        net_cents: netCents,
        transaction_count: expenses.length,
        split_count: splitGroups?.length || 0
      },
      member_contributions: Array.from(memberContributionsMap.values()),
      category_breakdown: categoryBreakdown,
      budgets: budgetStatuses,
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
