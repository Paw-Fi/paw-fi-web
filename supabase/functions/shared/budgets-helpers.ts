import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCurrencySymbol } from "./currency-symbols.ts";

export type SupabaseClient = SupabaseJsClient;

export type ResolvePocketPercentageResult = {
  percentage: number | null;
  usedExistingPercentage: boolean;
  error: string | null;
};

export type PocketRolloverBreakdownCents = {
  baseBudgetCents: number;
  rolloverFromPreviousCents: number;
  openingRolloverCents: number;
  availableBudgetCents: number;
  spentCents: number;
  remainingCents: number;
  carryToNextPeriodCents: number;
};

export type PocketRolloverLedgerMonthInput = {
  periodMonth: string;
  baseBudgetCents: number;
  spentCents: number;
  rolloverEnabled: boolean;
  rolloverNegative: boolean;
  rolloverCapCents: number | null;
  openingRolloverCents: number;
};

export type PocketRolloverLedgerContribution = {
  sourceType:
    | "opening"
    | "month_surplus"
    | "month_deficit"
    | "cap_adjustment"
    | "negative_dropped"
    | "reset";
  sourcePeriodMonth: string | null;
  label: string;
  amountCents: number;
  remainingCentsAfterAdjustment: number;
  isCarried: boolean;
  reason: string | null;
};

export type PocketRolloverLedgerMonth = {
  periodMonth: string;
  baseBudgetCents: number;
  incomingRolloverCents: number;
  openingRolloverCents: number;
  availableBudgetCents: number;
  spentCents: number;
  remainingCents: number;
  carryToNextCents: number;
  rolloverEnabled: boolean;
  rolloverNegative: boolean;
  rolloverCapCents: number | null;
  capAppliedCents: number;
  negativeDroppedCents: number;
};

export type PocketRolloverLedgerResult = {
  totalIncomingRolloverCents: number;
  contributions: PocketRolloverLedgerContribution[];
  monthlyHistory: PocketRolloverLedgerMonth[];
  warnings: string[];
};

type MutableRolloverComponent = PocketRolloverLedgerContribution;

function isMissingRolloverSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const message = `${record.code ?? ""} ${record.message ?? ""} ${
    record.details ?? ""
  } ${record.hint ?? ""}`.toLowerCase();
  const mentionsRolloverColumn =
    message.includes("rollover_group_id") ||
    message.includes("rollover_enabled") ||
    message.includes("rollover_negative") ||
    message.includes("rollover_cap_cents") ||
    message.includes("opening_rollover_cents");
  const mentionsResolver = message.includes(
    "resolve_budget_envelope_rollover_lineage_v1",
  );
  return (
    (mentionsRolloverColumn &&
      (record.code === "42703" || record.code === "PGRST204")) ||
    (mentionsResolver &&
      (record.code === "42883" || record.code === "PGRST202"))
  );
}

function buildRolloverLineagePayload(
  lineage: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!lineage?.rollover_group_id) return {};
  return {
    rollover_group_id: lineage.rollover_group_id,
    rollover_enabled: lineage.rollover_enabled === true,
    rollover_negative: lineage.rollover_negative === true,
    rollover_cap_cents: lineage.rollover_cap_cents ?? null,
    opening_rollover_cents: 0,
  };
}

export function calculatePocketRolloverBreakdownCents({
  baseBudgetCents,
  incomingRolloverCents,
  openingRolloverCents,
  spentCents,
  rolloverEnabled,
  rolloverNegative,
  rolloverCapCents,
}: {
  baseBudgetCents: number;
  incomingRolloverCents: number;
  openingRolloverCents: number;
  spentCents: number;
  rolloverEnabled: boolean;
  rolloverNegative: boolean;
  rolloverCapCents: number | null;
}): PocketRolloverBreakdownCents {
  const sanitizedBase = Math.max(0, Math.round(baseBudgetCents || 0));
  const sanitizedSpent = Math.max(0, Math.round(spentCents || 0));
  const sanitizedOpening = rolloverEnabled
    ? Math.round(openingRolloverCents || 0)
    : 0;
  const positiveCap =
    rolloverCapCents == null
      ? null
      : Math.max(0, Math.round(rolloverCapCents || 0));
  const capPositive = (value: number) => {
    if (positiveCap == null || value <= 0) return value;
    return Math.min(value, positiveCap);
  };

  if (!rolloverEnabled) {
    const remaining = sanitizedBase - sanitizedSpent;
    return {
      baseBudgetCents: sanitizedBase,
      rolloverFromPreviousCents: 0,
      openingRolloverCents: 0,
      availableBudgetCents: sanitizedBase,
      spentCents: sanitizedSpent,
      remainingCents: remaining,
      carryToNextPeriodCents: 0,
    };
  }

  const incoming = Math.round(incomingRolloverCents || 0);
  const available = sanitizedBase + incoming + sanitizedOpening;
  const remaining = available - sanitizedSpent;
  const carry = remaining < 0 && !rolloverNegative ? 0 : capPositive(remaining);

  return {
    baseBudgetCents: sanitizedBase,
    rolloverFromPreviousCents: incoming,
    openingRolloverCents: sanitizedOpening,
    availableBudgetCents: available,
    spentCents: sanitizedSpent,
    remainingCents: remaining,
    carryToNextPeriodCents: carry,
  };
}

function sumRolloverComponents(
  components: Array<Pick<MutableRolloverComponent, "amountCents">>,
): number {
  return components.reduce((sum, component) => sum + component.amountCents, 0);
}

function normalizeLedgerCents(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed);
}

function normalizeLedgerPeriod(value: string): string {
  return value.slice(0, 10);
}

function buildLedgerLabel(
  sourceType: string,
  periodMonth: string | null,
): string {
  if (sourceType === "opening") return "Opening balance";
  if (!periodMonth) return sourceType;
  const date = new Date(`${periodMonth.slice(0, 7)}-01T00:00:00.000Z`);
  const month = date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  if (sourceType === "month_deficit") return `${month} overspend`;
  if (sourceType === "cap_adjustment") return `${month} cap adjustment`;
  if (sourceType === "negative_dropped") {
    return `${month} overspend not carried`;
  }
  if (sourceType === "reset") return `${month} rollover reset`;
  return `${month} leftover`;
}

function addLedgerContribution(
  components: MutableRolloverComponent[],
  sourceType: PocketRolloverLedgerContribution["sourceType"],
  sourcePeriodMonth: string | null,
  amountCents: number,
  isCarried: boolean,
  reason: string | null = null,
): PocketRolloverLedgerContribution {
  const contribution = {
    sourceType,
    sourcePeriodMonth,
    label: buildLedgerLabel(sourceType, sourcePeriodMonth),
    amountCents,
    remainingCentsAfterAdjustment:
      sumRolloverComponents(components) + amountCents,
    isCarried,
    reason,
  } satisfies PocketRolloverLedgerContribution;
  if (isCarried && amountCents !== 0) {
    components.push(contribution);
  }
  return contribution;
}

function depletePositiveComponentsFifo(
  components: MutableRolloverComponent[],
  amountCents: number,
): number {
  let remainingSpend = Math.max(0, amountCents);
  for (const component of components) {
    if (remainingSpend <= 0) break;
    if (component.amountCents <= 0) continue;
    const consumed = Math.min(component.amountCents, remainingSpend);
    component.amountCents -= consumed;
    remainingSpend -= consumed;
  }
  return remainingSpend;
}

function offsetNegativeComponentsFifo(
  components: MutableRolloverComponent[],
  amountCents: number,
): number {
  let remainingSurplus = Math.max(0, amountCents);
  for (const component of components) {
    if (remainingSurplus <= 0) break;
    if (component.amountCents >= 0) continue;
    const offset = Math.min(-component.amountCents, remainingSurplus);
    component.amountCents += offset;
    remainingSurplus -= offset;
  }
  return remainingSurplus;
}

function trimPositiveComponentsNewestFirst(
  components: MutableRolloverComponent[],
  targetCents: number,
): number {
  let excess = sumRolloverComponents(components) - targetCents;
  let trimmed = 0;
  for (let index = components.length - 1; index >= 0 && excess > 0; index--) {
    const component = components[index];
    if (component.amountCents <= 0) continue;
    const reduction = Math.min(component.amountCents, excess);
    component.amountCents -= reduction;
    excess -= reduction;
    trimmed += reduction;
  }
  return trimmed;
}

function compactCarriedComponents(
  components: MutableRolloverComponent[],
): MutableRolloverComponent[] {
  return components
    .filter((component) => component.amountCents !== 0)
    .map((component) => ({
      ...component,
      remainingCentsAfterAdjustment: 0,
    }));
}

export function calculatePocketRolloverContributionLedger({
  months,
  selectedPeriodMonth,
}: {
  months: PocketRolloverLedgerMonthInput[];
  selectedPeriodMonth: string;
}): PocketRolloverLedgerResult {
  const selected = normalizeLedgerPeriod(selectedPeriodMonth);
  const sortedMonths = [...months]
    .map((month) => ({
      ...month,
      periodMonth: normalizeLedgerPeriod(month.periodMonth),
    }))
    .filter((month) => month.periodMonth <= selected)
    .sort((left, right) => left.periodMonth.localeCompare(right.periodMonth));
  const warnings: string[] = [];
  let components: MutableRolloverComponent[] = [];
  let selectedStartComponents: MutableRolloverComponent[] | null = null;
  const adjustments: PocketRolloverLedgerContribution[] = [];
  const monthlyHistory: PocketRolloverLedgerMonth[] = [];
  let previousMonth: string | null = null;

  for (const month of sortedMonths) {
    const periodMonth = month.periodMonth;
    if (previousMonth != null) {
      const expected = new Date(
        `${previousMonth.slice(0, 7)}-01T00:00:00.000Z`,
      );
      expected.setUTCMonth(expected.getUTCMonth() + 1);
      const expectedMonth = expected.toISOString().slice(0, 10);
      if (expectedMonth !== periodMonth) {
        warnings.push(
          `Missing rollover month between ${previousMonth} and ${periodMonth}`,
        );
      }
    }
    previousMonth = periodMonth;

    const baseBudgetCents = Math.max(
      0,
      normalizeLedgerCents(month.baseBudgetCents),
    );
    const spentCents = Math.max(0, normalizeLedgerCents(month.spentCents));
    const openingRolloverCents = month.rolloverEnabled
      ? normalizeLedgerCents(month.openingRolloverCents)
      : 0;
    const capCents =
      month.rolloverCapCents == null
        ? null
        : Math.max(0, normalizeLedgerCents(month.rolloverCapCents));
    const incomingRolloverCents = month.rolloverEnabled
      ? sumRolloverComponents(components)
      : 0;

    if (!month.rolloverEnabled) {
      if (components.length > 0) {
        const reset = addLedgerContribution(
          [],
          "reset",
          periodMonth,
          -sumRolloverComponents(components),
          false,
          "Rollover was disabled for this month.",
        );
        adjustments.push(reset);
      }
      components = [];
      monthlyHistory.push({
        periodMonth,
        baseBudgetCents,
        incomingRolloverCents: 0,
        openingRolloverCents: 0,
        availableBudgetCents: baseBudgetCents,
        spentCents,
        remainingCents: baseBudgetCents - spentCents,
        carryToNextCents: 0,
        rolloverEnabled: false,
        rolloverNegative: month.rolloverNegative,
        rolloverCapCents: capCents,
        capAppliedCents: 0,
        negativeDroppedCents: 0,
      });
      continue;
    }

    if (openingRolloverCents !== 0) {
      addLedgerContribution(
        components,
        "opening",
        periodMonth,
        openingRolloverCents,
        true,
        "Manual opening rollover for this envelope month.",
      );
    }

    if (periodMonth === selected) {
      selectedStartComponents = compactCarriedComponents(components);
    }

    let remainingSpend = depletePositiveComponentsFifo(components, spentCents);
    const baseSpent = Math.min(baseBudgetCents, remainingSpend);
    remainingSpend -= baseSpent;
    let baseRemaining = baseBudgetCents - baseSpent;
    baseRemaining = offsetNegativeComponentsFifo(components, baseRemaining);

    if (remainingSpend > 0) {
      addLedgerContribution(
        components,
        "month_deficit",
        periodMonth,
        -remainingSpend,
        true,
        "Overspending exceeded available rollover and base budget.",
      );
    } else if (baseRemaining > 0) {
      addLedgerContribution(
        components,
        "month_surplus",
        periodMonth,
        baseRemaining,
        true,
        "Unused base budget carried forward.",
      );
    }

    let negativeDroppedCents = 0;
    if (!month.rolloverNegative && sumRolloverComponents(components) < 0) {
      negativeDroppedCents = -sumRolloverComponents(components);
      components = [];
      adjustments.push(
        addLedgerContribution(
          [],
          "negative_dropped",
          periodMonth,
          -negativeDroppedCents,
          false,
          "Overspending is not carried into the next month.",
        ),
      );
    }

    let capAppliedCents = 0;
    if (capCents != null && sumRolloverComponents(components) > capCents) {
      capAppliedCents = trimPositiveComponentsNewestFirst(components, capCents);
      adjustments.push(
        addLedgerContribution(
          [],
          "cap_adjustment",
          periodMonth,
          -capAppliedCents,
          false,
          "Rollover cap trimmed the newest positive carryover first.",
        ),
      );
    }

    const carryToNextCents = sumRolloverComponents(components);
    monthlyHistory.push({
      periodMonth,
      baseBudgetCents,
      incomingRolloverCents,
      openingRolloverCents,
      availableBudgetCents:
        baseBudgetCents + incomingRolloverCents + openingRolloverCents,
      spentCents,
      remainingCents:
        baseBudgetCents +
        incomingRolloverCents +
        openingRolloverCents -
        spentCents,
      carryToNextCents,
      rolloverEnabled: true,
      rolloverNegative: month.rolloverNegative,
      rolloverCapCents: capCents,
      capAppliedCents,
      negativeDroppedCents,
    });

    components = compactCarriedComponents(components);
  }

  const selectedHistoryIndex = monthlyHistory.findIndex(
    (month) => month.periodMonth === selected,
  );
  const selectedIncoming =
    selectedHistoryIndex >= 0
      ? monthlyHistory[selectedHistoryIndex].incomingRolloverCents
      : sumRolloverComponents(components);
  const visibleComponents = selectedStartComponents ?? components;

  return {
    totalIncomingRolloverCents: selectedIncoming,
    contributions: [...visibleComponents, ...adjustments]
      .filter(
        (component) =>
          component.isCarried ||
          component.sourceType === "cap_adjustment" ||
          component.sourceType === "negative_dropped" ||
          component.sourceType === "reset",
      )
      .map((component) => ({
        ...component,
        remainingCentsAfterAdjustment: component.isCarried
          ? sumRolloverComponents(visibleComponents)
          : component.remainingCentsAfterAdjustment,
      })),
    monthlyHistory,
    warnings,
  };
}

function normalizeFinancialMonthStartDay(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value.trim())
        ? Number.parseInt(value.trim(), 10)
        : NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31 ? parsed : 1;
}

function lastDayOfMonthUtc(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function cycleStartForYearMonthUtc(
  year: number,
  month: number,
  startDay: number,
): Date {
  const safeDay = Math.min(startDay, lastDayOfMonthUtc(year, month));
  return new Date(Date.UTC(year, month - 1, safeDay));
}

function financialCycleStartForDateUtc(
  year: number,
  month: number,
  day: number,
  startDay: number,
): Date {
  const anchor = new Date(Date.UTC(year, month - 1, day));
  const thisMonthStart = cycleStartForYearMonthUtc(year, month, startDay);
  if (anchor >= thisMonthStart) {
    return thisMonthStart;
  }
  const previousAnchor = new Date(Date.UTC(year, month - 2, 1));
  return cycleStartForYearMonthUtc(
    previousAnchor.getUTCFullYear(),
    previousAnchor.getUTCMonth() + 1,
    startDay,
  );
}

export function parseFinancialPeriodRangeUtc(
  periodMonth: string | undefined | null,
  financialMonthStartDay: unknown = 1,
  options: { fullDateIsDateInPeriod?: boolean } = {},
): {
  monthStartStr: string;
  nextMonthStr: string;
} {
  const now = new Date();
  const startDay = normalizeFinancialMonthStartDay(financialMonthStartDay);
  const trimmed = typeof periodMonth === "string" ? periodMonth.trim() : "";
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(trimmed);
  const year = Number(match?.[1] ?? now.getUTCFullYear());
  const month = Number(match?.[2] ?? now.getUTCMonth() + 1);
  const safeYear =
    Number.isInteger(year) && year >= 1970 && year <= 9999
      ? year
      : now.getUTCFullYear();
  const safeMonth =
    Number.isInteger(month) && month >= 1 && month <= 12
      ? month
      : now.getUTCMonth() + 1;
  const day =
    match?.[3] == null
      ? startDay
      : Math.min(
          Math.max(Number(match[3]) || startDay, 1),
          lastDayOfMonthUtc(safeYear, safeMonth),
        );

  const start =
    match?.[3] != null && options.fullDateIsDateInPeriod
      ? financialCycleStartForDateUtc(safeYear, safeMonth, day, startDay)
      : new Date(Date.UTC(safeYear, safeMonth - 1, day));
  const nextAnchor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  const next = cycleStartForYearMonthUtc(
    nextAnchor.getUTCFullYear(),
    nextAnchor.getUTCMonth() + 1,
    startDay,
  );

  return {
    monthStartStr: start.toISOString().slice(0, 10),
    nextMonthStr: next.toISOString().slice(0, 10),
  };
}

function budgetAnchorMonth(periodStart: string): string {
  return `${periodStart.slice(0, 7)}-01`;
}

export async function resolveFinancialMonthStartDay(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("user_contacts")
    .select("financial_month_start_day")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return normalizeFinancialMonthStartDay(
    (data as { financial_month_start_day?: unknown } | null)
      ?.financial_month_start_day,
  );
}

export async function resolveFinancialPeriodRangeForUser(
  supabase: SupabaseClient,
  userId: string,
  dateInPeriod: string,
): Promise<{ monthStartStr: string; nextMonthStr: string }> {
  const financialMonthStartDay = await resolveFinancialMonthStartDay(
    supabase,
    userId,
  );
  return parseFinancialPeriodRangeUtc(dateInPeriod, financialMonthStartDay, {
    fullDateIsDateInPeriod: true,
  });
}

export async function resolveFinancialPeriodStartForUser(
  supabase: SupabaseClient,
  userId: string,
  dateInPeriod: string,
): Promise<string> {
  return (
    await resolveFinancialPeriodRangeForUser(supabase, userId, dateInPeriod)
  ).monthStartStr;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function resolvePocketPercentageForUpsert({
  hasPercentageArg,
  providedPercentage,
  existingPercentage,
}: {
  hasPercentageArg: boolean;
  providedPercentage: unknown;
  existingPercentage: unknown;
}): ResolvePocketPercentageResult {
  if (hasPercentageArg) {
    const parsed = Number(providedPercentage);
    if (!Number.isFinite(parsed)) {
      return {
        percentage: null,
        usedExistingPercentage: false,
        error: "Pocket percentage must be a valid number",
      };
    }
    return {
      percentage: clampPercentage(parsed),
      usedExistingPercentage: false,
      error: null,
    };
  }

  if (
    typeof existingPercentage === "number" &&
    Number.isFinite(existingPercentage)
  ) {
    return {
      percentage: clampPercentage(existingPercentage),
      usedExistingPercentage: true,
      error: null,
    };
  }

  return {
    percentage: null,
    usedExistingPercentage: false,
    error: "percentage is required",
  };
}

export async function createOrUpdateBudget(
  supabase: SupabaseClient,
  userId: string,
  householdId: string | null,
  period_month: string,
  currency: string,
  total_budget_cents: number,
  _isPortfolio: boolean = false,
) {
  const financialMonthStartDay = await resolveFinancialMonthStartDay(
    supabase,
    userId,
  );
  const financialPeriodStart = parseFinancialPeriodRangeUtc(
    period_month,
    financialMonthStartDay,
    { fullDateIsDateInPeriod: true },
  ).monthStartStr;
  const normalizedPeriodMonth = budgetAnchorMonth(financialPeriodStart);
  const updatedAt = new Date().toISOString();
  const payload: any = {
    user_id: userId,
    household_id: householdId,
    period_month: normalizedPeriodMonth,
    currency,
    total_budget_cents,
    updated_at: updatedAt,
  };

  const buildExistingQuery = (periodMonth = normalizedPeriodMonth) => {
    let query = supabase
      .from("budgets")
      .select("id")
      .eq("currency", currency)
      .eq("period_month", periodMonth)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (householdId) {
      query = query.eq("household_id", householdId);
    } else {
      query = query.eq("user_id", userId).is("household_id", null);
    }

    return query;
  };

  let { data: existing, error: existingErr } =
    await buildExistingQuery().maybeSingle();
  if (existingErr) {
    return { data: null, error: existingErr } as const;
  }

  if (!existing?.id && financialPeriodStart !== normalizedPeriodMonth) {
    const legacyResult =
      await buildExistingQuery(financialPeriodStart).maybeSingle();
    existing = legacyResult.data;
    existingErr = legacyResult.error;
    if (existingErr) {
      return { data: null, error: existingErr } as const;
    }
  }

  if (existing?.id) {
    return supabase
      .from("budgets")
      .update({
        period_month: normalizedPeriodMonth,
        total_budget_cents,
        updated_at: updatedAt,
      })
      .eq("id", existing.id)
      .select()
      .maybeSingle();
  }

  const insertRes = await supabase
    .from("budgets")
    .insert(payload)
    .select()
    .maybeSingle();

  if (!insertRes.error || insertRes.error.code !== "23505") {
    return insertRes;
  }

  // Concurrent insert won the race. Re-read and update target row.
  const { data: winner, error: winnerErr } =
    await buildExistingQuery().maybeSingle();
  if (winnerErr || !winner?.id) {
    return { data: null, error: winnerErr ?? insertRes.error } as const;
  }

  return supabase
    .from("budgets")
    .update({ total_budget_cents, updated_at: updatedAt })
    .eq("id", winner.id)
    .select()
    .maybeSingle();
}

export async function upsertEnvelope(
  supabase: SupabaseClient,
  budgetId: string,
  userId: string,
  householdId: string | null,
  name: string,
  percentage: number,
  currency: string,
  totalBudgetCents?: number | null,
  options: { color?: unknown; icon?: unknown } = {},
) {
  // Compute budget_amount_cents if total is known
  // This ensures the canonical amount is set, not just derived by trigger
  const budgetAmountCents =
    totalBudgetCents != null && Number.isFinite(totalBudgetCents)
      ? Math.round((percentage / 100) * totalBudgetCents)
      : undefined;
  const color =
    typeof options.color === "string" && options.color.trim()
      ? options.color.trim()
      : undefined;
  const icon =
    typeof options.icon === "string" && options.icon.trim()
      ? options.icon.trim()
      : undefined;
  const normalizedName = name.trim().toLowerCase();
  const normalizedCurrency = currency.trim().toUpperCase() || "USD";
  let rolloverPayload: Record<string, unknown> = {};

  const { data: resolvedLineage, error: resolvedLineageError } = await supabase
    .rpc("resolve_budget_envelope_rollover_lineage_v1", {
      p_user_id: userId,
      p_household_id: householdId,
      p_currency: normalizedCurrency,
      p_envelope_name: name,
    })
    .maybeSingle();
  if (!resolvedLineageError) {
    rolloverPayload = buildRolloverLineagePayload(
      resolvedLineage as Record<string, unknown> | null,
    );
  } else if (!isMissingRolloverSchemaError(resolvedLineageError)) {
    return { data: null, error: resolvedLineageError } as const;
  } else if (isMissingRolloverSchemaError(resolvedLineageError)) {
    let lineageQuery = supabase
      .from("budget_envelopes")
      .select(
        "name,rollover_group_id,rollover_enabled,rollover_negative,rollover_cap_cents",
      )
      .eq("user_id", userId)
      .ilike("currency", normalizedCurrency)
      .order("updated_at", { ascending: false });
    lineageQuery =
      householdId == null
        ? lineageQuery.is("household_id", null)
        : lineageQuery.eq("household_id", householdId);
    const { data: lineageCandidates, error: lineageError } = await lineageQuery;
    if (!lineageError) {
      const lineage = (lineageCandidates ?? []).find(
        (row) =>
          typeof row.name === "string" &&
          row.name.trim().toLowerCase() === normalizedName,
      );
      rolloverPayload = buildRolloverLineagePayload(lineage);
    } else if (!isMissingRolloverSchemaError(lineageError)) {
      return { data: null, error: lineageError } as const;
    }
  }

  const payload: any = {
    budget_id: budgetId,
    user_id: userId,
    household_id: householdId,
    name,
    budget_percentage: percentage,
    currency,
    updated_at: new Date().toISOString(),
    ...(color ? { color } : {}),
    ...(icon ? { icon } : {}),
    ...rolloverPayload,
    // Only include budget_amount_cents if we have a valid value
    ...(budgetAmountCents !== undefined
      ? { budget_amount_cents: budgetAmountCents }
      : {}),
  };
  return supabase
    .from("budget_envelopes")
    .upsert(payload, { onConflict: "budget_id,name" })
    .select()
    .maybeSingle();
}

export async function upsertEnvelopeAllocation(
  supabase: SupabaseClient,
  envelopeId: string,
  period_month: string,
  amount_cents: number,
) {
  const normalizedPeriodMonth = budgetAnchorMonth(
    parseFinancialPeriodRangeUtc(period_month).monthStartStr,
  );
  return supabase.from("envelope_allocations").upsert(
    {
      envelope_id: envelopeId,
      period_month: normalizedPeriodMonth,
      amount_cents,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "envelope_id,period_month" },
  );
}

export async function upsertEnvelopeCategoryLink(
  supabase: SupabaseClient,
  envelopeId: string,
  category: string,
) {
  if (typeof category !== "string") {
    return { data: null, error: null } as const;
  }
  const normalized = category.trim().toLowerCase();
  if (!normalized) {
    return { data: null, error: null } as const;
  }
  return supabase.from("envelope_category_links").upsert(
    {
      envelope_id: envelopeId,
      category: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "envelope_id,category" },
  );
}

export async function getBudgetStatusDirect(
  supabase: SupabaseClient,
  userId: string,
  householdId: string | null,
  period_month: string,
  currency: string,
  isPortfolio: boolean = false,
  contactId?: string,
) {
  const financialMonthStartDay = await resolveFinancialMonthStartDay(
    supabase,
    userId,
  );
  const { monthStartStr, nextMonthStr } = parseFinancialPeriodRangeUtc(
    period_month,
    financialMonthStartDay,
    { fullDateIsDateInPeriod: true },
  );
  const budgetPeriodMonth = budgetAnchorMonth(monthStartStr);

  const loadBudget = async (storageMonth: string) => {
    let query = supabase
      .from("budgets")
      .select("id, total_budget_cents, currency, period_month")
      .eq("currency", currency)
      .eq("period_month", storageMonth)
      .order("updated_at", { ascending: false })
      .limit(1);
    query = householdId
      ? query.eq("household_id", householdId)
      : query.eq("user_id", userId).is("household_id", null);
    return query;
  };

  let { data: budgetRows, error: budgetErr } =
    await loadBudget(budgetPeriodMonth);
  if (
    !budgetErr &&
    (!budgetRows || budgetRows.length === 0) &&
    monthStartStr !== budgetPeriodMonth
  ) {
    const legacyResult = await loadBudget(monthStartStr);
    budgetRows = legacyResult.data;
    budgetErr = legacyResult.error;
  }
  if (budgetErr) return { error: budgetErr };
  const budget = (budgetRows || [])[0];
  if (!budget) return { budget: null };

  const { data: envelopes, error: envErr } = await supabase
    .from("budget_envelopes")
    .select(
      "id, name, budget_percentage, budget_amount_cents, currency, rollover_group_id, rollover_enabled, rollover_negative, rollover_cap_cents, opening_rollover_cents",
    )
    .eq("budget_id", budget.id);
  if (envErr) return { error: envErr };

  const envIds = (envelopes || []).map((e: any) => e.id);

  const { data: allocs, error: allocErr } = envIds.length
    ? await supabase
        .from("envelope_allocations")
        .select("envelope_id, amount_cents, period_month")
        .in("envelope_id", envIds)
        .eq("period_month", budget.period_month)
    : { data: [], error: null };
  if (allocErr) return { error: allocErr };

  // Fetch category links for envelopes to calculate spend per pocket
  const { data: links, error: linksErr } = envIds.length
    ? await supabase
        .from("envelope_category_links")
        .select("envelope_id, category")
        .in("envelope_id", envIds)
    : { data: [], error: null };
  if (linksErr) return { error: linksErr };
  const categoryToEnvelope: Record<string, string[]> = {};
  (links || []).forEach((l: any) => {
    const cat = String(l.category || "").toLowerCase();
    if (!cat) return;
    const envId = String(l.envelope_id || "");
    if (!envId) return;
    const list = categoryToEnvelope[cat] || [];
    list.push(envId);
    categoryToEnvelope[cat] = list;
  });

  // Fetch expenses for the month to compute spending
  let expensesQuery = supabase
    .from("expenses")
    .select(
      "amount_cents, category, currency, date, household_id, user_id, contact_id, type",
    )
    .eq("type", "expense")
    .eq("currency", currency)
    .is("deleted_at", null)
    .gte("date", monthStartStr)
    .lt("date", nextMonthStr);

  if (householdId) {
    expensesQuery = expensesQuery.eq("household_id", householdId);
    // Portfolio spaces behave like personal (user-scoped), regular household spaces aggregate by household.
    if (isPortfolio === true) {
      expensesQuery = expensesQuery.eq("user_id", userId);
    }
  } else {
    expensesQuery = expensesQuery
      .eq("contact_id", contactId ?? userId)
      .is("household_id", null);
  }

  const { data: expenses, error: expErr } = await expensesQuery;
  if (expErr) return { error: expErr };

  const spentMap: Record<string, number> = {};
  let totalSpent = 0;
  (expenses || []).forEach((e: any) => {
    const amt = Number(e.amount_cents) || 0;
    totalSpent += amt;
    const cat = String(e.category || "").toLowerCase();
    const envList = categoryToEnvelope[cat];
    if (envList && envList.length) {
      envList.forEach((envId) => {
        spentMap[envId] = (spentMap[envId] || 0) + amt;
      });
    }
  });

  const allocMap: Record<string, number> = {};
  for (const a of allocs || []) {
    const envId = String((a as any).envelope_id || "");
    if (!envId) continue;
    allocMap[envId] = Number((a as any).amount_cents) || 0;
  }

  const rolloverScope = householdId
    ? isPortfolio
      ? "portfolio"
      : "household"
    : "personal";
  const envelopeStatus: any[] = [];
  for (const e of envelopes || []) {
    // Read precedence: allocation(period_month) -> budget_amount_cents -> derived from percentage
    const alloc =
      allocMap[e.id] != null
        ? allocMap[e.id]
        : e.budget_amount_cents != null
          ? Number(e.budget_amount_cents)
          : Math.round(
              ((e.budget_percentage || 0) / 100) *
                (budget.total_budget_cents || 0),
            );
    const spent = spentMap[e.id] != null ? spentMap[e.id] : 0;
    let incomingRolloverCents = 0;

    if (e.rollover_enabled === true) {
      let { data: rolloverData, error: rolloverErr } = await supabase.rpc(
        "calculate_pocket_rollover_carry_v2",
        {
          p_user_id: userId,
          p_scope: rolloverScope,
          p_household_id: householdId,
          p_currency: currency,
          p_envelope_name: e.name ?? "",
          p_rollover_group_id: e.rollover_group_id ?? null,
          p_budget_month: budgetPeriodMonth,
        },
      );

      if (rolloverErr?.code === "42883") {
        const fallback = await supabase.rpc(
          "calculate_pocket_rollover_carry_v1",
          {
            p_user_id: userId,
            p_scope: rolloverScope,
            p_household_id: householdId,
            p_currency: currency,
            p_envelope_name: e.name ?? "",
            p_rollover_group_id: e.rollover_group_id ?? null,
            p_period_month: monthStartStr,
          },
        );
        rolloverData = fallback.data;
        rolloverErr = fallback.error;
      }

      if (!rolloverErr) {
        incomingRolloverCents = Number(rolloverData) || 0;
      } else {
        console.error("[budgets] Failed to calculate pocket rollover", {
          envelopeId: e.id,
          rolloverGroupId: e.rollover_group_id ?? null,
          periodMonth: monthStartStr,
          error: rolloverErr,
        });
        return { error: rolloverErr };
      }
    }

    const rollover = calculatePocketRolloverBreakdownCents({
      baseBudgetCents: alloc,
      incomingRolloverCents,
      openingRolloverCents: Number(e.opening_rollover_cents) || 0,
      spentCents: spent,
      rolloverEnabled: e.rollover_enabled === true,
      rolloverNegative: e.rollover_negative === true,
      rolloverCapCents:
        e.rollover_cap_cents == null ? null : Number(e.rollover_cap_cents),
    });
    envelopeStatus.push({
      id: e.id,
      name: e.name,
      rollover_group_id: e.rollover_group_id ?? null,
      allocated_cents: alloc,
      base_budget_cents: alloc,
      rollover_from_previous_cents: rollover.rolloverFromPreviousCents,
      opening_rollover_cents: rollover.openingRolloverCents,
      available_budget_cents: rollover.availableBudgetCents,
      spent_cents: spent,
      remaining_cents: rollover.remainingCents,
      rollover_enabled: e.rollover_enabled === true,
      rollover_negative: e.rollover_negative === true,
      rollover_cap_cents:
        e.rollover_cap_cents == null ? null : Number(e.rollover_cap_cents),
    });
  }

  const totalAllocated = envelopeStatus.reduce(
    (s: number, e: any) => s + (e.allocated_cents || 0),
    0,
  );
  const totalSpentAll = totalSpent;
  const totalAvailableBudget = envelopeStatus.reduce(
    (s: number, e: any) => s + (e.available_budget_cents || 0),
    0,
  );
  const hasRolloverEnabled = envelopeStatus.some(
    (e: any) => e.rollover_enabled === true,
  );
  const displayBudgetCents = hasRolloverEnabled
    ? totalAvailableBudget || budget.total_budget_cents || 0
    : budget.total_budget_cents || 0;

  return {
    budget,
    envelopes: envelopeStatus,
    totals: {
      budget_cents: displayBudgetCents,
      allocated_cents: totalAllocated,
      spent_cents: totalSpentAll,
      remaining_cents: Math.max(displayBudgetCents - totalSpentAll, 0),
    },
    chart: buildBudgetGauge(
      budget.total_budget_cents || 0,
      totalSpentAll,
      currency,
    ),
  };
}

function buildBudgetGauge(
  total_cents: number,
  spent_cents: number,
  currency: string,
) {
  if (!total_cents) return null;
  const totalMajor = Math.max(total_cents / 100, 0);
  const spentMajor = Math.max(spent_cents / 100, 0);
  const remainingMajor = Math.max(totalMajor - spentMajor, 0);
  const sym = getCurrencySymbol(currency) || currency.toUpperCase();

  // Define three segments: safe (0-50%), watch (50-80%), warning (80-100%)
  const seg1 = totalMajor * 0.5;
  const seg2 = totalMajor * 0.3;
  const seg3 = Math.max(totalMajor - seg1 - seg2, 0);

  const chartConfig = {
    type: "gauge",
    data: {
      datasets: [
        {
          value: spentMajor,
          data: [seg1, seg2, seg3],
          backgroundColor: ["#4BC0C0", "#F7C948", "#F7729B"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      valueLabel: {
        fontSize: 18,
        backgroundColor: "transparent",
        color: "#000",
        formatter: (value: number) => `${sym}${value.toFixed(2)}`,
        bottomMarginPercentage: 10,
      },
      title: {
        display: true,
        text: `Remaining: ${sym}${remainingMajor.toFixed(2)}`,
        fontSize: 14,
      },
    },
  };

  const qs = encodeURIComponent(JSON.stringify(chartConfig));
  // Force gauge plugin (Chart.js 2 gauge)
  return `https://quickchart.io/chart?c=${qs}&chartjs=2.9.4&devicePixelRatio=2`;
}
