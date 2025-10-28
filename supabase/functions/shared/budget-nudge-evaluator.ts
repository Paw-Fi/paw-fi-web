/**
 * Budget Nudge Evaluator
 *
 * Real-time budget threshold detection and notification system.
 * Evaluates budget thresholds on expense mutations and emits notification events.
 *
 * Spec: BUDGET_NUDGE_IMPLEMENTATION.md
 *
 * Producer Algorithm:
 * 1. Determine affected household_id, currency, and date
 * 2. Select candidate budgets (active, matching currency, current period)
 * 3. For each budget:
 *    - Compute period window (timezone-aware)
 *    - Compute old_spent (excluding mutation) and new_spent (including mutation)
 *    - Detect upward crossing (warn/alert)
 *    - Check idempotency (max one nudge per period per threshold)
 *    - Determine recipients (household: all members, personal: owner only)
 *    - Insert notification_events rows
 *    - Insert budget_nudge_log entry
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface BudgetCandidate {
  id: string;
  name: string;
  household_id: string;
  budget_type: 'household' | 'personal';
  user_id: string | null;
  currency: string;
  amount_cents: number;
  warn_threshold: number; // 0-1 decimal (e.g., 0.8 for 80%)
  alert_threshold: number; // 0-1 decimal (e.g., 1.0 for 100%)
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  count_split_portion_only: boolean;
}

interface PeriodSpending {
  spent_cents: number;
  period_start: string; // DATE
  period_end: string; // DATE
  budget_cents: number;
  currency: string;
  percentage_used: number; // 0-100+
}

interface ThresholdEvent {
  budget_id: string;
  event_type: 'budget_warn' | 'budget_alert';
  spent_cents: number;
  budget_cents: number;
  percentage_used: number;
  period_start: string;
  period_end: string;
}

interface ExpenseMutation {
  type: 'create' | 'update' | 'delete';
  old_cents?: number; // For update/delete: previous amount
  new_cents?: number; // For create/update: new amount
}

interface NotificationRecipient {
  user_id: string;
  household_id: string;
}

// ============================================================================
// BUDGET NUDGE EVALUATOR CLASS
// ============================================================================

export class BudgetNudgeEvaluator {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseServiceRoleKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { 'X-Client-Info': 'moneko-budget-nudge-evaluator' } },
    });
  }

  /**
   * Main entry point: Evaluate budgets after expense mutation
   *
   * @param householdId - Household ID of the expense
   * @param currency - Currency of the expense
   * @param expenseDate - Date of the expense (YYYY-MM-DD)
   * @param mutation - Mutation details (type, old_cents, new_cents) for true upward crossing
   */
  async evaluateBudgets(
    householdId: string,
    currency: string,
    expenseDate: string,
    mutation: ExpenseMutation
  ): Promise<number> {
    console.log('[budget-nudge] Evaluating budgets', {
      householdId,
      currency,
      expenseDate,
      mutation,
    });

    try {
      // 1. Get household timezone
      const timezone = await this.getHouseholdTimezone(householdId);

      // 2. Select candidate budgets
      const budgets = await this.getCandidateBudgets(householdId, currency, expenseDate, timezone);

      if (!budgets || budgets.length === 0) {
        console.log('[budget-nudge] No active budgets found for evaluation');
        return 0;
      }

      console.log(`[budget-nudge] Evaluating ${budgets.length} candidate budgets`);

      let nudgesSent = 0;

      // 3. Evaluate each budget with mutation delta
      for (const budget of budgets) {
        const sent = await this.evaluateBudget(budget, expenseDate, timezone, mutation);
        nudgesSent += sent;
      }

      console.log(`[budget-nudge] Evaluation complete: ${nudgesSent} nudges sent`);
      return nudgesSent;

    } catch (error) {
      console.error('[budget-nudge] Error evaluating budgets:', error);
      // Don't throw - budget nudges should not fail expense operations
      return 0;
    }
  }

  /**
   * Get household timezone for period calculations
   */
  private async getHouseholdTimezone(householdId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('households')
      .select('timezone')
      .eq('id', householdId)
      .single();

    if (error || !data) {
      console.warn('[budget-nudge] Failed to get household timezone, using UTC', error);
      return 'UTC';
    }

    return data.timezone || 'UTC';
  }

  /**
   * Get candidate budgets for evaluation
   * - Active budgets
   * - Matching currency
   * - Current period includes expense date
   */
  private async getCandidateBudgets(
    householdId: string,
    currency: string,
    expenseDate: string,
    timezone: string
  ): Promise<BudgetCandidate[]> {
    const { data, error } = await this.supabase
      .from('shared_budgets')
      .select('*')
      .eq('household_id', householdId)
      .eq('currency', currency)
      .eq('is_active', true);

    if (error) {
      console.error('[budget-nudge] Error fetching budgets:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter budgets where expense date is within current period
    const candidates: BudgetCandidate[] = [];

    for (const budget of data) {
      try {
        // Get period window for this budget
        const { data: periodData, error: periodError } = await this.supabase
          .rpc('calculate_period_window', {
            p_period: budget.period,
            p_reference_date: expenseDate,
            p_timezone: timezone,
          });

        if (periodError || !periodData || periodData.length === 0) {
          console.warn('[budget-nudge] Failed to calculate period for budget', budget.id, periodError);
          continue;
        }

        const period = periodData[0];
        const expenseDateObj = new Date(expenseDate);
        const periodStart = new Date(period.period_start);
        const periodEnd = new Date(period.period_end);

        // Check if expense date is within period
        if (expenseDateObj >= periodStart && expenseDateObj <= periodEnd) {
          candidates.push(budget as BudgetCandidate);
        }
      } catch (err) {
        console.warn('[budget-nudge] Error checking period for budget', budget.id, err);
      }
    }

    return candidates;
  }

  /**
   * Evaluate a single budget for threshold crossings with true upward crossing detection
   */
  private async evaluateBudget(
    budget: BudgetCandidate,
    expenseDate: string,
    timezone: string,
    mutation: ExpenseMutation
  ): Promise<number> {
    console.log('[budget-nudge] Evaluating budget', budget.id, budget.name);

    // 1. Calculate current spending (includes mutation)
    const currentSpending = await this.calculatePeriodSpending(budget.id, expenseDate, timezone);

    if (!currentSpending) {
      console.warn('[budget-nudge] Failed to calculate spending for budget', budget.id);
      return 0;
    }

    // 2. Calculate old spending (before mutation) by subtracting delta
    const delta = this.calculateDelta(mutation);
    const oldSpentCents = Math.max(0, currentSpending.spent_cents - delta);

    const oldPercentage = budget.amount_cents > 0
      ? (oldSpentCents / budget.amount_cents) * 100
      : 0;

    console.log('[budget-nudge] Spending analysis', {
      budget: budget.name,
      mutation: mutation.type,
      old_spent: oldSpentCents,
      new_spent: currentSpending.spent_cents,
      old_percentage: oldPercentage.toFixed(2),
      new_percentage: currentSpending.percentage_used.toFixed(2),
      delta,
    });

    // 3. Detect upward threshold crossings (old < threshold && new >= threshold)
    const events = this.detectUpwardCrossings(
      budget,
      oldPercentage,
      currentSpending.percentage_used,
      currentSpending
    );

    if (events.length === 0) {
      console.log('[budget-nudge] No upward threshold crossings detected');
      return 0;
    }

    // 4. Check idempotency and emit events
    let nudgesSent = 0;

    for (const event of events) {
      const alreadySent = await this.checkIdempotency(
        event.budget_id,
        event.event_type,
        event.period_start
      );

      if (alreadySent) {
        console.log('[budget-nudge] Event already sent this period', {
          budget: budget.name,
          eventType: event.event_type,
          period: event.period_start,
        });
        continue;
      }

      // Emit notification events
      const sent = await this.emitBudgetNudge(budget, event, timezone);
      nudgesSent += sent;
    }

    return nudgesSent;
  }

  /**
   * Calculate spending delta from mutation
   * - create: +new_cents
   * - update: +new_cents -old_cents (net change)
   * - delete: -old_cents
   */
  private calculateDelta(mutation: ExpenseMutation): number {
    switch (mutation.type) {
      case 'create':
        return mutation.new_cents || 0;
      case 'update':
        return (mutation.new_cents || 0) - (mutation.old_cents || 0);
      case 'delete':
        return -(mutation.old_cents || 0);
      default:
        return 0;
    }
  }

  /**
   * Calculate current period spending using database function
   */
  private async calculatePeriodSpending(
    budgetId: string,
    referenceDate: string,
    timezone: string
  ): Promise<PeriodSpending | null> {
    const { data, error } = await this.supabase
      .rpc('calculate_period_spending', {
        p_budget_id: budgetId,
        p_reference_date: referenceDate,
        p_timezone: timezone,
      });

    if (error) {
      console.error('[budget-nudge] Error calculating spending:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as PeriodSpending;
  }

  /**
   * Detect upward threshold crossings (TRUE UPWARD CROSSING LOGIC)
   *
   * Upward crossing condition: (old_percentage < threshold) AND (new_percentage >= threshold)
   * - If both warn and alert are crossed simultaneously, emit only alert (stronger)
   * - If already warned and now crossing alert, emit only alert (collapse warn→alert)
   *
   * @param budget - Budget to evaluate
   * @param oldPercentage - Spending percentage BEFORE mutation (0-100+)
   * @param newPercentage - Spending percentage AFTER mutation (0-100+)
   * @param spending - Current spending details
   */
  private detectUpwardCrossings(
    budget: BudgetCandidate,
    oldPercentage: number,
    newPercentage: number,
    spending: PeriodSpending
  ): ThresholdEvent[] {
    const events: ThresholdEvent[] = [];

    const oldPct = oldPercentage / 100; // Convert to decimal
    const newPct = newPercentage / 100;

    const warnThreshold = budget.warn_threshold;
    const alertThreshold = budget.alert_threshold;

    // Check if we crossed alert threshold upward (highest priority)
    const crossedAlert = oldPct < alertThreshold && newPct >= alertThreshold;

    // Check if we crossed warn threshold upward
    const crossedWarn = oldPct < warnThreshold && newPct >= warnThreshold && newPct < alertThreshold;

    if (crossedAlert) {
      // Crossed alert threshold - emit alert only (collapse warn→alert if both crossed)
      events.push({
        budget_id: budget.id,
        event_type: 'budget_alert',
        spent_cents: spending.spent_cents,
        budget_cents: spending.budget_cents,
        percentage_used: spending.percentage_used,
        period_start: spending.period_start,
        period_end: spending.period_end,
      });
      console.log('[budget-nudge] UPWARD CROSSING: Alert threshold', {
        budget: budget.name,
        old: `${(oldPct * 100).toFixed(2)}%`,
        new: `${(newPct * 100).toFixed(2)}%`,
        threshold: `${(alertThreshold * 100).toFixed(0)}%`,
      });
    } else if (crossedWarn) {
      // Crossed warn threshold only
      events.push({
        budget_id: budget.id,
        event_type: 'budget_warn',
        spent_cents: spending.spent_cents,
        budget_cents: spending.budget_cents,
        percentage_used: spending.percentage_used,
        period_start: spending.period_start,
        period_end: spending.period_end,
      });
      console.log('[budget-nudge] UPWARD CROSSING: Warn threshold', {
        budget: budget.name,
        old: `${(oldPct * 100).toFixed(2)}%`,
        new: `${(newPct * 100).toFixed(2)}%`,
        threshold: `${(warnThreshold * 100).toFixed(0)}%`,
      });
    } else {
      console.log('[budget-nudge] No upward crossing', {
        budget: budget.name,
        old: `${(oldPct * 100).toFixed(2)}%`,
        new: `${(newPct * 100).toFixed(2)}%`,
        warn_threshold: `${(warnThreshold * 100).toFixed(0)}%`,
        alert_threshold: `${(alertThreshold * 100).toFixed(0)}%`,
      });
    }

    return events;
  }

  /**
   * Check if this budget threshold event was already sent this period
   */
  private async checkIdempotency(
    budgetId: string,
    eventType: 'budget_warn' | 'budget_alert',
    periodStart: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('budget_nudge_log')
      .select('budget_id')
      .eq('budget_id', budgetId)
      .eq('event_type', eventType)
      .eq('period_start', periodStart)
      .maybeSingle();

    if (error) {
      console.error('[budget-nudge] Error checking idempotency:', error);
      // On error, assume already sent to be safe (prevents spam)
      return true;
    }

    return !!data;
  }

  /**
   * Emit budget nudge notifications
   *
   * - Household budgets: all members
   * - Personal budgets: owner only
   */
  private async emitBudgetNudge(
    budget: BudgetCandidate,
    event: ThresholdEvent,
    timezone: string
  ): Promise<number> {
    console.log('[budget-nudge] Emitting nudge', {
      budget: budget.name,
      eventType: event.event_type,
      percentage: event.percentage_used,
    });

    // 1. Determine recipients
    const recipients = await this.getRecipients(budget);

    if (!recipients || recipients.length === 0) {
      console.warn('[budget-nudge] No recipients found for budget', budget.id);
      return 0;
    }

    console.log(`[budget-nudge] Sending to ${recipients.length} recipients`);

    // 2. Create notification events (one per recipient)
    const notificationEvents = recipients.map(recipient => ({
      household_id: recipient.household_id,
      user_id: recipient.user_id,
      event_type: event.event_type,
      budget_id: event.budget_id,
      payload: {
        budget_id: event.budget_id,
        budget_name: budget.name,
        currency: budget.currency,
        budget_cents: event.budget_cents,
        spent_cents: event.spent_cents,
        percentage_used: event.percentage_used,
        period_start: event.period_start,
        period_end: event.period_end,
        budget_type: budget.budget_type,
      },
    }));

    const { error: insertError } = await this.supabase
      .from('notification_events')
      .insert(notificationEvents);

    if (insertError) {
      console.error('[budget-nudge] Error inserting notification events:', insertError);
      return 0;
    }

    // 3. Log to budget_nudge_log for idempotency
    const { error: logError } = await this.supabase
      .from('budget_nudge_log')
      .insert({
        budget_id: event.budget_id,
        household_id: budget.household_id,
        event_type: event.event_type,
        period_start: event.period_start,
        period_end: event.period_end,
        spent_cents: event.spent_cents,
        budget_cents: event.budget_cents,
        percentage_used: event.percentage_used,
      });

    if (logError) {
      console.error('[budget-nudge] Error logging to budget_nudge_log:', logError);
      // Don't fail - notifications already sent
    }

    console.log('[budget-nudge] Nudge emitted successfully', {
      budget: budget.name,
      eventType: event.event_type,
      recipients: recipients.length,
    });

    return recipients.length;
  }

  /**
   * Get notification recipients for budget
   */
  private async getRecipients(budget: BudgetCandidate): Promise<NotificationRecipient[]> {
    if (budget.budget_type === 'personal') {
      // Personal budget: owner only
      if (!budget.user_id) {
        console.error('[budget-nudge] Personal budget missing user_id', budget.id);
        return [];
      }

      return [{
        user_id: budget.user_id,
        household_id: budget.household_id,
      }];
    } else {
      // Household budget: all members
      const { data, error } = await this.supabase
        .from('household_members')
        .select('user_id, household_id')
        .eq('household_id', budget.household_id);

      if (error) {
        console.error('[budget-nudge] Error fetching household members:', error);
        return [];
      }

      return data as NotificationRecipient[];
    }
  }
}
