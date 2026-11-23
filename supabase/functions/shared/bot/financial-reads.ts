import {
  buildBudgetGauge,
  parseFinancialPeriodRangeUtc,
  resolveFinancialMonthStartDay,
} from "../budgets-helpers.ts";
import { getBotSpaceInfo } from "./space-tools.ts";
import { listBotWallets } from "./wallet-tools.ts";
import { resolveAnyInternalFunctionKey } from "../auth.ts";
import { normalizeCalendarDateString } from "../date-normalization.ts";
import { formatDateInTimeZone } from "./date-utils.ts";
import {
  executeBotFinancialInsight,
  resolveFinancialInsightDateRange,
  resolveInsightWallet,
} from "./financial-insight-tool.ts";
import { loadFinanceSpaces, readChatFinance } from "./finance-rpc.ts";
import {
  type BotSpaceMeta,
  hasUnknownReadSpace,
  resolveBotSpaceScope,
} from "./household-utils.ts";

const views = [
  "spaces",
  "space_details",
  "summary",
  "transactions",
  "pockets",
  "wallets",
  "wallet_history",
  "recurring",
  "recurring_series",
  "recurring_history",
  "settlements",
  "goals",
  "bank_status",
  "import_status",
];
const string = { type: "STRING" };
export const financialReadTool = {
  name: "read_finances",
  description:
    "Look up current Moneko records on demand. Use space_details for members and roles of a named Space, summary for full posted totals, transactions for a searchable page, pockets for spend and rollover, wallets and wallet_history for balances, recurring for scheduled occurrences, recurring_series for templates and recurring_history for payments on a series returned by recurring_series, settlements for who owes whom, goals for progress, bank_status and import_status for sync history. Transactions and detail views default to Personal. Supply space_name to read one Space. Summary defaults to Personal plus all accessible Spaces. Copy next_cursor to continue the same search. Never sum a page or reveal identifiers.",
  parameters: {
    type: "OBJECT",
    properties: {
      view: { type: "STRING", enum: views },
      space_name: string,
      wallet_name: string,
      space_scope: {
        type: "STRING",
        enum: ["personal", "all_spaces", "shared_space", "private_space"],
      },
      currency: string,
      period: {
        type: "STRING",
        enum: [
          "today",
          "this_week",
          "this_month",
          "last_month",
          "this_year",
          "all_time",
          "current_financial_period",
          "last_financial_period",
        ],
      },
      start_date: string,
      end_date: string,
      date: string,
      search: string,
      category: string,
      type: { type: "STRING", enum: ["all", "expense", "income"] },
      limit: { type: "INTEGER" },
      series_id: string,
      include_chart: { type: "BOOLEAN" },
      cursor: {
        type: "OBJECT",
        properties: { date: string, created_at: string, id: string },
      },
    },
    required: ["view"],
  },
};

interface FinancialReadParams {
  supabase: any;
  userId: string;
  currency: string;
  timezone?: string | null;
  args: Record<string, any>;
}

export async function executeFinancialRead(
  params: FinancialReadParams,
): Promise<Record<string, any>> {
  const { supabase, userId, args } = params;
  try {
    if (!views.includes(args.view)) return { error: "Unknown financial read." };
    const spaceMap = await loadFinanceSpaces(supabase, userId);
    const spaces = [...new Set(spaceMap.values())];
    if (args.view === "spaces") {
      return {
        success: true,
        spaces: spaces.map((s) => ({
          name: s.name,
          type: s.isPortfolio ? "private" : "shared",
        })),
      };
    }
    if (hasUnknownReadSpace(args, spaceMap)) {
      return { error: "Unknown or ambiguous space." };
    }
    if (args.view === "space_details") {
      if (!resolveBotSpaceScope(args, spaceMap).householdId) {
        return { error: "Choose one named Space." };
      }
      const result = await getBotSpaceInfo({
        supabase,
        userId,
        args,
        spaceMap,
      });
      if (!("members" in result)) {
        return { error: "Unable to read Space details." };
      }
      return {
        success: true,
        name: result.space?.name,
        currency: result.space?.currency,
        type: result.space?.type,
        member_count: result.member_count,
        members: result.members,
      };
    }
    if (args.view === "summary") {
      return await executeBotFinancialInsight({
        ...params,
        spaceMap,
        logPrefix: "chat-finance",
      });
    }
    const { householdId, spaceMeta } = resolveBotSpaceScope(args, spaceMap);
    if (
      !householdId &&
      ["all", "all_spaces", "shared", "shared_space", "private_space"].includes(
        args.space_scope,
      )
    ) {
      if (args.cursor || args.series_id) {
        return { error: "Select the original Space to continue this lookup." };
      }
      const all = ["all", "all_spaces"].includes(args.space_scope);
      const scopes: Array<BotSpaceMeta | undefined> = spaces.filter((s) =>
        (all || s.isPortfolio === (args.space_scope === "private_space")) &&
        (args.view !== "settlements" || !s.isPortfolio)
      );
      if (all && args.view !== "settlements") scopes.unshift(undefined);
      const results = await Promise.all(
        scopes.map((space) => readScope(params, space)),
      );
      if (results.some((r) => r.error)) {
        throw new Error("Incomplete Space lookup");
      }
      return { success: true, spaces: results };
    }
    if (
      !householdId && args.space_scope &&
      !["personal", "personal_account"].includes(args.space_scope)
    ) return { error: "Unknown space scope." };
    return await readScope(params, spaceMeta);
  } catch {
    return { error: "Unable to read the requested financial records." };
  }
}

async function readScope(
  params: FinancialReadParams,
  spaceMeta?: BotSpaceMeta,
): Promise<Record<string, any>> {
  const { supabase, userId, args } = params;
  const householdId = spaceMeta?.id ?? null;
  if (args.view === "settlements" && !householdId) {
    return { error: "Choose a shared Space for settlements." };
  }
  const currency = String(args.currency || params.currency).trim()
    .toUpperCase();
  if (args.view === "recurring_series" || args.view === "recurring_history") {
    const limit = Math.min(100, Math.max(1, Number(args.limit) || 25));
    if (args.view === "recurring_series") {
      const { data, error } = await supabase.rpc(
        "list_recurring_series_summary_v2",
        {
          p_actor_user_id: userId,
          p_household_id: householdId,
          p_currencies: args.currency ? [currency] : null,
          p_after_next_occurrence_date: args.cursor?.date,
          p_after_id: args.cursor?.id,
          p_limit: limit,
        },
      );
      if (error || !Array.isArray(data?.items)) {
        throw new Error("Series unavailable");
      }
      return {
        success: true,
        space: spaceMeta?.name || "Personal",
        items: data.items.map((r: any) => ({
          series_id: r.id,
          description: r.raw_text,
          category: r.category,
          amount_cents: r.amount_cents,
          currency: r.currency,
          type: r.type,
          next_occurrence_date: r.next_occurrence_date,
          actionable_count: r.actionable_count,
        })),
        has_more: data.has_more,
        next_cursor: data.next_cursor
          ? {
            id: data.next_cursor.id,
            date: data.next_cursor.next_occurrence_date,
          }
          : null,
      };
    }
    if (!args.series_id) {
      return { error: "Look up the recurring series first." };
    }
    const visible = await readChatFinance(
      supabase,
      userId,
      "recurring_scope",
      householdId,
      { series_id: args.series_id },
    );
    if (!visible.available) {
      return { error: "Recurring series unavailable in this Space." };
    }
    const { data, error } = await supabase.rpc(
      "list_recurring_occurrences_v2",
      {
        p_actor_user_id: userId,
        p_recurring_id: args.series_id,
        p_before_scheduled_date: args.cursor?.date,
        p_limit: limit,
      },
    );
    if (error || !Array.isArray(data?.items)) {
      throw new Error("History unavailable");
    }
    return {
      success: true,
      space: spaceMeta?.name || "Personal",
      items: data.items.map((r: any) => ({
        scheduled_date: r.scheduled_occurrence_date,
        paid_date: r.paid_date,
        status: r.status,
        amount_cents: r.amount_cents,
        currency: r.currency,
      })),
      has_more: data.has_more,
      next_cursor: data.next_cursor ? { date: data.next_cursor } : null,
    };
  }
  if (args.view === "wallets") {
    const { result } = await listBotWallets({
      supabase,
      userId,
      householdId,
      includeArchived: false,
      internalFunctionKey: resolveAnyInternalFunctionKey(),
    });
    if (!result.success || !Array.isArray(result.data)) {
      return { error: "Unable to read wallet balances." };
    }
    return {
      success: true,
      space: spaceMeta?.name || "Personal",
      wallets: result.data.filter(
        (wallet) => !args.currency || wallet.currency === currency,
      ),
    };
  }
  const options: Record<string, unknown> = { currency };
  let read = args.view;
  const today = formatDateInTimeZone(params.timezone);
  const resolvePeriod = (date: string) =>
    resolveFinancialMonthStartDay(supabase, userId).then(
      (day) =>
        parseFinancialPeriodRangeUtc(date, day, {
          fullDateIsDateInPeriod: true,
        }),
    );
  if (args.wallet_name && ["transactions", "recurring"].includes(read)) {
    const wallet = await resolveInsightWallet({
      supabase,
      userId,
      householdId,
      walletName: args.wallet_name,
      logPrefix: "chat-finance",
    });
    if (wallet.error || !wallet.accountId) {
      return { error: wallet.error || "Wallet unavailable." };
    }
    options.account_id = wallet.accountId;
    options.currency = wallet.currency || currency;
  }
  if (
    read === "transactions" && args.cursor &&
    !(args.cursor.date && args.cursor.created_at && args.cursor.id)
  ) {
    return { error: "Use the complete cursor from the preceding page." };
  }
  if (["wallet_history", "pockets"].includes(read)) {
    let date = args.date || args.start_date || today;
    if (args.period) {
      const range = await resolveFinancialInsightDateRange({
        args,
        today,
        resolveFinancialPeriod: resolvePeriod,
      });
      if ("error" in range) return range;
      // Select the budget month requested, even when its cycle starts mid-month.
      date = range.period === "last_month" || range.period === "this_month"
        ? range.endDate
        : range.startDate;
    }
    date = normalizeCalendarDateString(date);
    if (!date) return { error: "Choose a valid month or date." };
    options.start_date = read === "wallet_history"
      ? String(date).slice(0, 7) + "-01"
      : (await resolvePeriod(date)).monthStartStr;
  } else if (read === "transactions" || read === "recurring") {
    if (
      args.start_date || args.end_date || args.period || read === "recurring"
    ) {
      const range = await resolveFinancialInsightDateRange({
        args,
        today,
        resolveFinancialPeriod: resolvePeriod,
      });
      if ("error" in range) return range;
      Object.assign(options, {
        start_date: range.startDate,
        end_date: range.endDate,
      });
    }
    Object.assign(options, { category: args.category, search: args.search });
    if (read === "recurring") read = "projections";
    else {Object.assign(options, {
        limit: args.limit,
        type: args.type,
        cursor: args.cursor,
      });}
  }
  const data = await readChatFinance(
    supabase,
    userId,
    read,
    householdId,
    options,
  );
  if (read === "pockets" && args.include_chart && data.totals) {
    data.chart = buildBudgetGauge(
      data.totals.budget_cents,
      data.totals.spent_cents,
      currency,
    );
  }
  // Strip feed identifiers before sending rows to the model.
  if (Array.isArray(data.items)) {
    data.items = data.items.map((
      { id, recurring_id, household_id, template_date, ...row }: any,
    ) => row);
  }
  return {
    success: true,
    view: args.view,
    space: spaceMeta?.name || "Personal",
    ...([
        "transactions",
        "pockets",
        "wallet_history",
        "projections",
        "settlements",
      ].includes(read)
      ? { currency: options.currency }
      : {}),
    start_date: options.start_date,
    end_date: options.end_date,
    ...data,
  };
}
