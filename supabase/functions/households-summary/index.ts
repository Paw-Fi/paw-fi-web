import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import {
  householdIncomeEffectCents,
  householdSpendingEffectCents,
  parseHouseholdCents,
} from "../shared/household-summary-economics.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

interface SplitLineRow {
  user_id: string;
  amount_cents: number;
  is_settled: boolean;
}

interface SplitGroupRow {
  id: string;
  expense_id: string | null;
  payer_user_id: string;
  total_amount_cents: number;
  created_at: string;
  currency: string;
  expense_split_lines: SplitLineRow[];
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
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Allow both GET and POST
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the user from the JWT token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request parameters
    let params: HouseholdSummaryRequest;

    if (req.method === "POST") {
      params = await req.json();
    } else {
      const url = new URL(req.url);
      params = {
        household_id: url.searchParams.get("household_id") || "",
        currency: url.searchParams.get("currency") || undefined,
        start_date: url.searchParams.get("start_date") || undefined,
        end_date: url.searchParams.get("end_date") || undefined,
      };
    }

    const { household_id, currency = "USD", start_date, end_date } = params;
    const currencyCode = validateCurrency(currency || "USD");

    if (!household_id) {
      return new Response(
        JSON.stringify({ error: "household_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify user is a member of the household
    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "You are not a member of this household" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Default date range: current month
    const startDate =
      start_date ||
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1,
      ).toISOString();
    const endDate = end_date || new Date().toISOString();

    // Fetch household expenses
    // NOTE: No share_scope filter - all household members can see all expenses
    let expensesQuery = supabase
      .from("expenses")
      .select(
        `
        id,
        user_id,
        household_id,
        split_group_id,
        date,
        amount_cents,
        currency,
        category,
        privacy_scope,
        is_recurring,
        analytics_class,
        analytics_is_final,
        analytics_spending_multiplier,
        analytics_counts_toward_income
      `,
      )
      .eq("household_id", household_id)
      .is("deleted_at", null)
      .gte("date", startDate.split("T")[0]) // expenses table uses 'date' not 'created_at'
      .lte("date", endDate.split("T")[0]);

    if (currencyCode) {
      expensesQuery = expensesQuery.ilike("currency", currencyCode);
    }

    const { data: expensesRaw, error: expensesError } = await expensesQuery;

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch expenses" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const transactions = (expensesRaw || []).filter(
      (transaction) =>
        transaction.is_recurring !== true &&
        (transaction.user_id === user.id ||
          transaction.privacy_scope === "full" ||
          transaction.privacy_scope === "balances_only"),
    );
    const expenses = transactions.filter(
      (transaction) => householdSpendingEffectCents(transaction) !== 0,
    );
    const incomeTransactions = transactions.filter(
      (transaction) => householdIncomeEffectCents(transaction) !== 0,
    );

    const totalExpensesCents = expenses.reduce(
      (sum, transaction) => sum + householdSpendingEffectCents(transaction),
      0,
    );
    const totalIncomeCents = incomeTransactions.reduce(
      (sum, transaction) => sum + householdIncomeEffectCents(transaction),
      0,
    );

    const netCents = totalIncomeCents - totalExpensesCents;

    // Fetch splits FIRST for accurate member contribution calculations
    // CRITICAL: Do NOT filter splits by date - we need ALL splits for ANY expense in the household
    // The expense date filtering is sufficient - splits just need to match expense IDs
    const { data: splitGroups, error: splitGroupsError } = await supabase
      .from("expense_split_groups")
      .select(
        `
        id,
        expense_id,
        payer_user_id,
        total_amount_cents,
        created_at,
        currency,
        expense_split_lines (
          user_id,
          amount_cents,
          is_settled
        )
      `,
      )
      .eq("household_id", household_id)
      .ilike("currency", currencyCode);

    if (splitGroupsError) {
      console.error("Error fetching split groups:", splitGroupsError);
    }

    const balances: Record<string, number> = {};

    // Create lookup maps for quick access
    const splitGroupsSafe = (splitGroups || []) as SplitGroupRow[];
    const expenseIdToSplitGroup = new Map<string, SplitGroupRow>();
    const splitGroupIdToSplitGroup = new Map<string, SplitGroupRow>();
    for (const splitGroup of splitGroupsSafe) {
      if (splitGroup.id) {
        splitGroupIdToSplitGroup.set(splitGroup.id, splitGroup);
      }
      if (splitGroup.expense_id) {
        expenseIdToSplitGroup.set(splitGroup.expense_id, splitGroup);
      }
    }
    const eligibleExpenseById = new Map(
      expenses.map((expense) => [expense.id, expense]),
    );
    const eligibleExpenseBySplitGroupId = new Map(
      expenses
        .filter((expense) => expense.split_group_id)
        .map((expense) => [expense.split_group_id, expense]),
    );
    const economicSplitGroups = splitGroupsSafe.flatMap((splitGroup) => {
      const linkedExpense =
        (splitGroup.expense_id
          ? eligibleExpenseById.get(splitGroup.expense_id)
          : undefined) ?? eligibleExpenseBySplitGroupId.get(splitGroup.id);
      if (linkedExpense) return [{ splitGroup, expense: linkedExpense }];
      return [];
    });

    const economicSplitGroupIds = economicSplitGroups.map(
      ({ splitGroup }) => splitGroup.id,
    );
    const spendingDirectionBySplitGroupId = new Map(
      economicSplitGroups.map(({ splitGroup, expense }) => [
        splitGroup.id,
        Math.sign(householdSpendingEffectCents(expense)),
      ]),
    );
    let settlementAllocations: Array<Record<string, unknown>> = [];
    if (economicSplitGroupIds.length > 0) {
      const { data, error: settlementAllocationsError } = await supabase
        .from("household_settlement_event_allocations_v2")
        .select(
          "payer_user_id, participant_user_id, allocated_amount_cents, split_group_id",
        )
        .eq("household_id", household_id)
        .ilike("currency", currencyCode)
        .in("split_group_id", economicSplitGroupIds);
      if (settlementAllocationsError) {
        console.error(
          "Error fetching settlement allocations:",
          settlementAllocationsError,
        );
      } else {
        settlementAllocations = data || [];
      }
    }

    for (const ev of settlementAllocations) {
      const creditorId = ev.payer_user_id as string | null;
      const debtorId = ev.participant_user_id as string | null;
      if (!creditorId || !debtorId) continue;
      const allocationCents = Math.abs(
        parseHouseholdCents(ev.allocated_amount_cents),
      );
      if (allocationCents <= 0) continue;
      const amountCents =
        allocationCents *
        (spendingDirectionBySplitGroupId.get(String(ev.split_group_id || "")) ??
          1);

      balances[creditorId] = (balances[creditorId] || 0) - amountCents;
      balances[debtorId] = (balances[debtorId] || 0) + amountCents;
    }

    // Calculate member contributions with CORRECT split handling
    const memberContributionsMap = new Map<string, MemberContribution>();

    for (const expense of expenses) {
      const expenseId = expense.id;
      const payerId = expense.user_id;
      const expenseAmount = householdSpendingEffectCents(expense);
      const spendingDirection = Math.sign(expenseAmount);

      // Check if this expense has a split
      let splitGroup: SplitGroupRow | undefined;

      // 1) Prefer linking via expense.split_group_id (authoritative)
      if (expense.split_group_id) {
        splitGroup = splitGroupIdToSplitGroup.get(expense.split_group_id);
      }

      // 2) Fallback: link by expense_id on split group
      if (!splitGroup) {
        splitGroup = expenseIdToSplitGroup.get(expenseId);
      }

      if (
        splitGroup &&
        splitGroup.expense_split_lines &&
        splitGroup.expense_split_lines.length > 0
      ) {
        // EXPENSE HAS A SPLIT: Each user should be credited with their split portion only
        for (const splitLine of splitGroup.expense_split_lines) {
          const userId = splitLine.user_id;
          const userSplitAmount =
            Math.abs(parseHouseholdCents(splitLine.amount_cents)) *
            spendingDirection;

          if (!memberContributionsMap.has(userId)) {
            memberContributionsMap.set(userId, {
              user_id: userId,
              total_spent_cents: 0,
              transaction_count: 0,
              split_count: 0,
              balance_cents: 0,
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
            balance_cents: 0,
          });
        }

        const contribution = memberContributionsMap.get(payerId)!;
        contribution.total_spent_cents += expenseAmount;
        contribution.transaction_count += 1;
      }
    }

    const getOutstandingCents = (line: { amount_cents?: unknown }): number => {
      return Math.abs(parseHouseholdCents(line.amount_cents));
    };

    for (const { splitGroup, expense } of economicSplitGroups) {
      const payerId = splitGroup.payer_user_id;
      const lines = splitGroup.expense_split_lines || [];
      const spendingDirection = Math.sign(
        householdSpendingEffectCents(expense),
      );
      let totalRemainingCents = 0;

      for (const line of lines) {
        totalRemainingCents += getOutstandingCents(line) * spendingDirection;
      }

      balances[payerId] = (balances[payerId] || 0) + totalRemainingCents;

      // Each participant owes their share
      for (const line of lines) {
        const remainingCents = getOutstandingCents(line) * spendingDirection;

        if (remainingCents !== 0) {
          if (line.user_id === payerId) {
            balances[payerId] -= remainingCents;
          } else {
            balances[line.user_id] =
              (balances[line.user_id] || 0) - remainingCents;
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
    const categoryMap = new Map<
      string,
      { amount_cents: number; count: number }
    >();

    for (const expense of expenses) {
      if (
        expense.user_id !== user.id &&
        expense.privacy_scope === "balances_only"
      ) {
        continue;
      }
      const category = expense.category || "Uncategorized";
      const amount = householdSpendingEffectCents(expense);

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { amount_cents: 0, count: 0 });
      }

      const cat = categoryMap.get(category)!;
      cat.amount_cents += amount;
      cat.count += 1;
    }

    const categoryBreakdown: CategoryBreakdown[] = Array.from(
      categoryMap.entries(),
    )
      .map(([category, data]) => ({
        category,
        amount_cents: data.amount_cents,
        percentage:
          totalExpensesCents > 0
            ? (data.amount_cents / totalExpensesCents) * 100
            : 0,
        transaction_count: data.count,
      }))
      .sort((a, b) => b.amount_cents - a.amount_cents);

    // Calculate user's actual spending (what they owe after splits)
    // This is what should be used for PERSONAL budgets
    let userActualSpending = 0;

    // Start with total expenses the user paid
    const userExpenses = expenses.filter((e) => e.user_id === user.id);

    for (const expense of userExpenses) {
      const expenseEffect = householdSpendingEffectCents(expense);
      const spendingDirection = Math.sign(expenseEffect);
      // Check if this expense has a split
      let expenseSplit: SplitGroupRow | undefined;
      if (expense.split_group_id) {
        expenseSplit = splitGroupIdToSplitGroup.get(expense.split_group_id);
      }
      if (!expenseSplit) {
        expenseSplit = expenseIdToSplitGroup.get(expense.id);
      }

      if (expenseSplit) {
        // Find user's portion from split lines
        const userLine = expenseSplit.expense_split_lines?.find(
          (line: SplitLineRow) => line.user_id === user.id,
        );
        if (userLine) {
          // Add only their split portion
          userActualSpending +=
            Math.abs(parseHouseholdCents(userLine.amount_cents)) *
            spendingDirection;
        } else {
          // User is payer but not in split lines - this shouldn't happen but fallback to full amount
          userActualSpending += expenseEffect;
        }
      } else {
        // No split, user pays full amount
        userActualSpending += expenseEffect;
      }
    }

    // Fetch budgets and calculate status
    const { data: budgets } = await supabase
      .from("shared_budgets")
      .select("*")
      .eq("household_id", household_id)
      .eq("is_active", true);

    const budgetStatuses: BudgetStatus[] = [];

    for (const budget of budgets || []) {
      if (
        currencyCode &&
        (budget.currency || "").toUpperCase() !== currencyCode
      ) {
        continue;
      }

      // Calculate spending based on budget type
      let spentCents = 0;

      if (budget.budget_type === "household") {
        // Household budget: use total household spending (absolute)
        spentCents = totalExpensesCents;
      } else if (budget.budget_type === "personal") {
        // Personal budget with split awareness
        if (budget.count_split_portion_only) {
          // Use user's actual spending (calculated above with split portions)
          spentCents = userActualSpending;
        } else {
          // Use all of the user's signed classified spending.
          const userExpenseTotal = expenses
            .filter((e) => e.user_id === user.id)
            .reduce((sum, e) => sum + householdSpendingEffectCents(e), 0);
          spentCents = userExpenseTotal;
        }
      }

      const percentageUsed =
        budget.amount_cents > 0 ? (spentCents / budget.amount_cents) * 100 : 0;

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
        is_at_warn_threshold: percentageUsed >= budget.warn_threshold * 100,
        is_at_alert_threshold: percentageUsed >= budget.alert_threshold * 100,
      });
    }

    const response: HouseholdSummaryResponse = {
      household_id,
      currency: currencyCode,
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      totals: {
        total_expenses_cents: totalExpensesCents,
        total_income_cents: totalIncomeCents,
        net_cents: netCents,
        transaction_count: expenses.length + incomeTransactions.length,
        split_count: economicSplitGroups.length,
      },
      member_contributions: Array.from(memberContributionsMap.values()),
      category_breakdown: categoryBreakdown,
      budgets: budgetStatuses,
      balances,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
