/**
 * Budget Nudges Backstop Cron Job
 *
 * Periodically scans active budgets and emits missed threshold notifications.
 * Catches events missed by real-time producers due to:
 * - Imports or batch operations
 * - Quiet hours deferrals
 * - Transient delivery failures
 * - Real-time producer downtime
 *
 * Scheduled to run every 15 minutes via pg_cron.
 *
 * Spec: BUDGET_NUDGE_IMPLEMENTATION.md (lines 598-608)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface BudgetWithSpending {
  id: string;
  name: string;
  household_id: string;
  budget_type: 'household' | 'personal';
  user_id: string | null;
  currency: string;
  amount_cents: number;
  warn_threshold: number;
  alert_threshold: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  spent_cents: number;
  percentage_used: number;
  period_start: string;
  period_end: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    return new Response(
      JSON.stringify({ ok: true, service: 'budget-nudges-backstop', ts: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[budget-nudges-backstop] Starting budget threshold scan...');
    const startTime = Date.now();

    // 1. Get all active budgets with recent expense activity (last 24 hours)
    // This limits the scan scope for performance
    const { data: recentHouseholds, error: householdsError } = await supabase
      .from('expenses')
      .select('household_id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('household_id', 'is', null);

    if (householdsError) {
      console.error('[budget-nudges-backstop] Error fetching recent households:', householdsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch households' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const householdIds = [...new Set(recentHouseholds?.map(e => e.household_id).filter(Boolean) || [])];

    console.log(`[budget-nudges-backstop] Scanning ${householdIds.length} households with recent activity`);

    if (householdIds.length === 0) {
      console.log('[budget-nudges-backstop] No recent activity, skipping scan');
      return new Response(
        JSON.stringify({ success: true, budgets_scanned: 0, nudges_sent: 0, skipped: 'no_recent_activity' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get active budgets for these households
    const { data: budgets, error: budgetsError } = await supabase
      .from('shared_budgets')
      .select('*')
      .in('household_id', householdIds)
      .eq('is_active', true);

    if (budgetsError) {
      console.error('[budget-nudges-backstop] Error fetching budgets:', budgetsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch budgets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!budgets || budgets.length === 0) {
      console.log('[budget-nudges-backstop] No active budgets found');
      return new Response(
        JSON.stringify({ success: true, budgets_scanned: 0, nudges_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[budget-nudges-backstop] Evaluating ${budgets.length} active budgets`);

    let budgetsScanned = 0;
    let nudgesSent = 0;
    let errors = 0;

    // 3. For each budget, compute current spending and check for missed threshold events
    for (const budget of budgets) {
      try {
        budgetsScanned++;

        // Get household timezone
        const { data: household } = await supabase
          .from('households')
          .select('timezone')
          .eq('id', budget.household_id)
          .single();

        const timezone = household?.timezone || 'UTC';

        // Calculate current period spending
        const { data: spendingData, error: spendingError } = await supabase
          .rpc('calculate_period_spending', {
            p_budget_id: budget.id,
            p_reference_date: new Date().toISOString().split('T')[0],
            p_timezone: timezone,
          });

        if (spendingError || !spendingData || spendingData.length === 0) {
          console.warn('[budget-nudges-backstop] Failed to calculate spending for budget', budget.id, spendingError);
          errors++;
          continue;
        }

        const spending = spendingData[0];
        const percentageDecimal = spending.percentage_used / 100;

        // Check if at alert threshold
        if (percentageDecimal >= budget.alert_threshold) {
          const alreadySent = await checkIfSent(budget.id, 'budget_alert', spending.period_start);
          if (!alreadySent) {
            await emitNudge(budget, 'budget_alert', spending, timezone);
            nudgesSent++;
            console.log('[budget-nudges-backstop] Emitted missed alert nudge', {
              budget: budget.name,
              percentage: spending.percentage_used,
            });
          }
        }
        // Check if at warn threshold (only if alert not triggered)
        else if (percentageDecimal >= budget.warn_threshold) {
          const alreadySent = await checkIfSent(budget.id, 'budget_warn', spending.period_start);
          if (!alreadySent) {
            await emitNudge(budget, 'budget_warn', spending, timezone);
            nudgesSent++;
            console.log('[budget-nudges-backstop] Emitted missed warn nudge', {
              budget: budget.name,
              percentage: spending.percentage_used,
            });
          }
        }
      } catch (budgetError) {
        console.error('[budget-nudges-backstop] Error evaluating budget', budget.id, budgetError);
        errors++;
      }
    }

    const duration = Date.now() - startTime;

    // 4. Log execution to cron_job_logs
    await supabase.from('cron_job_logs').insert({
      job_name: 'budget-nudges-backstop',
      executed_at: new Date().toISOString(),
      rows_affected: nudgesSent,
      error_message: errors > 0 ? `${errors} budget(s) failed evaluation` : null,
    });

    console.log('[budget-nudges-backstop] Scan complete', {
      budgets_scanned: budgetsScanned,
      nudges_sent: nudgesSent,
      errors,
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        budgets_scanned: budgetsScanned,
        nudges_sent: nudgesSent,
        errors,
        duration_ms: duration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[budget-nudges-backstop] Unexpected error:', error);

    // Log error to cron_job_logs
    await supabase.from('cron_job_logs').insert({
      job_name: 'budget-nudges-backstop',
      executed_at: new Date().toISOString(),
      rows_affected: 0,
      error_message: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({ error: 'Backstop scan failed', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Check if budget threshold event was already sent this period
 */
async function checkIfSent(
  budgetId: string,
  eventType: 'budget_warn' | 'budget_alert',
  periodStart: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('budget_nudge_log')
    .select('budget_id')
    .eq('budget_id', budgetId)
    .eq('event_type', eventType)
    .eq('period_start', periodStart)
    .maybeSingle();

  if (error) {
    console.error('[budget-nudges-backstop] Error checking idempotency:', error);
    // On error, assume sent to be safe
    return true;
  }

  return !!data;
}

/**
 * Emit budget nudge notification
 */
async function emitNudge(
  budget: any,
  eventType: 'budget_warn' | 'budget_alert',
  spending: any,
  timezone: string
): Promise<void> {
  // Get recipients
  const recipients = budget.budget_type === 'personal'
    ? [{ user_id: budget.user_id, household_id: budget.household_id }]
    : await getHouseholdMembers(budget.household_id);

  if (!recipients || recipients.length === 0) {
    console.warn('[budget-nudges-backstop] No recipients for budget', budget.id);
    return;
  }

  // Create notification events
  const notificationEvents = recipients.map((recipient: any) => ({
    household_id: recipient.household_id,
    user_id: recipient.user_id,
    event_type: eventType,
    budget_id: budget.id,
    payload: {
      budget_id: budget.id,
      budget_name: budget.name,
      currency: budget.currency,
      budget_cents: spending.budget_cents,
      spent_cents: spending.spent_cents,
      percentage_used: spending.percentage_used,
      period_start: spending.period_start,
      period_end: spending.period_end,
      budget_type: budget.budget_type,
      source: 'backstop', // Mark as coming from backstop
    },
  }));

  const { error: insertError } = await supabase
    .from('notification_events')
    .insert(notificationEvents);

  if (insertError) {
    console.error('[budget-nudges-backstop] Error inserting notifications:', insertError);
    return;
  }

  // Log to budget_nudge_log
  await supabase.from('budget_nudge_log').insert({
    budget_id: budget.id,
    household_id: budget.household_id,
    event_type: eventType,
    period_start: spending.period_start,
    period_end: spending.period_end,
    spent_cents: spending.spent_cents,
    budget_cents: spending.budget_cents,
    percentage_used: spending.percentage_used,
  });
}

/**
 * Get household members for notification recipients
 */
async function getHouseholdMembers(householdId: string): Promise<Array<{ user_id: string; household_id: string }>> {
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id, household_id')
    .eq('household_id', householdId);

  if (error) {
    console.error('[budget-nudges-backstop] Error fetching members:', error);
    return [];
  }

  return data || [];
}
