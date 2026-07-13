import type { SupabaseClient } from "../budgets-helpers.ts";
import {
  getBudgetStatusDirect,
  resolveFinancialPeriodStartForUser,
  resolvePocketPercentageForUpsert,
  upsertEnvelope,
  upsertEnvelopeAllocation,
  upsertEnvelopeCategoryLink,
} from "../budgets-helpers.ts";
import { formatInvokeError } from "../formatting-helpers.ts";
import {
  consolidateDuplicateEnvelopesForBudget,
  normalizeEnvelopeName,
} from "./budget-utils.ts";
import { normalizeDateInput } from "./date-utils.ts";
import {
  ensureHouseholdMember,
  resolveBotSpaceScope,
  type BotSpaceMeta,
} from "./household-utils.ts";

export type BotPocketToolResult = {
  result: Record<string, unknown>;
};

function normalizePocketCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const item of value) {
    const category = String(item || "")
      .trim()
      .toLowerCase();
    if (!category || seen.has(category)) continue;
    seen.add(category);
    categories.push(category);
  }
  return categories;
}

function normalizePocketText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function rebalancePocketPercentages(
  desiredPct: number,
  others: Array<{ id: string; percentage: number }>,
): Record<string, number> {
  const precision = 4;
  const roundedDesired = Number(desiredPct.toFixed(precision));
  const totalOther = others.reduce((sum, p) => sum + (p.percentage || 0), 0);
  const currentTotal = roundedDesired + totalOther;
  const updated: Record<string, number> = {};

  if (currentTotal > 100 + 0.0001) {
    const availableForOthers = Math.max(0, 100 - roundedDesired);
    if (totalOther <= 0) {
      for (const p of others) updated[p.id] = 0;
    } else {
      let assigned = 0;
      others.forEach((p, index) => {
        const isLast = index === others.length - 1;
        const next = isLast
          ? Number((availableForOthers - assigned).toFixed(precision))
          : Number(
              ((p.percentage / totalOther) * availableForOthers).toFixed(
                precision,
              ),
            );
        updated[p.id] = Math.max(0, next);
        assigned += updated[p.id];
      });
    }
  }

  return updated;
}

export async function setBotPocketFromToolCall(params: {
  supabase: SupabaseClient;
  userId: string;
  contactId: string;
  userCurrency: string;
  currentDate: string;
  args?: Record<string, unknown> | null;
  spaceMap: Map<string, BotSpaceMeta>;
  debugNotes: string[];
  debugEnabled?: boolean;
}): Promise<BotPocketToolResult> {
  const args = params.args ?? {};
  const name = normalizePocketText(args.name);
  if (!name) {
    return { result: { error: "Pocket name is required" } };
  }

  const dateStr = normalizeDateInput(args.date, params.currentDate);
  const periodMonth = await resolveFinancialPeriodStartForUser(
    params.supabase,
    params.userId,
    dateStr,
  );
  const { householdId, spaceMeta } = resolveBotSpaceScope(
    args,
    params.spaceMap,
  );
  if (
    householdId &&
    !(await ensureHouseholdMember(params.supabase, householdId, params.userId))
  ) {
    return { result: { error: "You do not have access to that space" } };
  }

  const budgetRes = await getBudgetStatusDirect(
    params.supabase,
    params.userId,
    householdId,
    periodMonth,
    params.userCurrency,
    spaceMeta?.isPortfolio ?? args.is_portfolio === true,
    params.contactId,
  );
  if ((budgetRes as any)?.error) {
    return {
      result: {
        error:
          formatInvokeError((budgetRes as any).error) ||
          "Failed to load budget",
      },
    };
  }

  const budget = (budgetRes as any)?.budget;
  const budgetId = budget?.id;
  if (!budgetId) {
    return { result: { error: "Please set a budget first for this month" } };
  }

  const envelopeNameMap = await consolidateDuplicateEnvelopesForBudget(
    params.supabase,
    budgetId,
    periodMonth,
    params.debugNotes,
    params.debugEnabled ?? true,
  );
  const canonical = envelopeNameMap.get(normalizeEnvelopeName(name));
  const newName = normalizePocketText(args.new_name);
  const nameToUse = newName || canonical?.name || name;
  const hasPercentageArg = Object.prototype.hasOwnProperty.call(
    args,
    "percentage",
  );
  const resolvedPercentage = resolvePocketPercentageForUpsert({
    hasPercentageArg,
    providedPercentage: args.percentage,
    existingPercentage: canonical?.budget_percentage,
  });
  if (resolvedPercentage.error || resolvedPercentage.percentage == null) {
    return {
      result: {
        error: resolvedPercentage.error || "Pocket percentage is required",
      },
    };
  }

  const percentage = Number(resolvedPercentage.percentage.toFixed(4));
  const totalBudgetCents = Number(budget?.total_budget_cents) || 0;
  const amountCents = Math.round((percentage / 100) * totalBudgetCents);
  const color = normalizePocketText(args.color);
  const icon = normalizePocketText(args.icon);

  const { data: envelopeRows, error: envelopeRowsError } = await params.supabase
    .from("budget_envelopes")
    .select("id, name, budget_percentage, budget_amount_cents")
    .eq("budget_id", budgetId);
  if (envelopeRowsError) {
    return {
      result: {
        error: formatInvokeError(envelopeRowsError) || "Failed to load pockets",
      },
    };
  }

  let pocketId = canonical?.id as string | undefined;
  let savedPocket: Record<string, unknown> | null = null;
  if (pocketId) {
    const { data, error } = await params.supabase
      .from("budget_envelopes")
      .update({
        name: nameToUse,
        budget_id: budgetId,
        budget_percentage: percentage,
        budget_amount_cents: amountCents,
        updated_at: new Date().toISOString(),
        ...(color ? { color } : {}),
        ...(icon ? { icon } : {}),
        household_id: householdId,
        currency: params.userCurrency,
      })
      .eq("id", pocketId)
      .select()
      .maybeSingle();
    if (error || !data?.id) {
      return {
        result: {
          error: formatInvokeError(error) || "Failed to save pocket",
        },
      };
    }
    savedPocket = data;
  } else {
    const { data, error } = await upsertEnvelope(
      params.supabase,
      budgetId,
      params.userId,
      householdId,
      nameToUse,
      percentage,
      params.userCurrency,
      totalBudgetCents,
      { color, icon },
    );
    if (error || !data?.id) {
      return {
        result: {
          error: formatInvokeError(error) || "Failed to save pocket",
        },
      };
    }
    pocketId = data.id as string;
    savedPocket = data;
  }

  if (!pocketId) {
    return { result: { error: "Failed to save pocket" } };
  }

  const hasCategoriesArg = Object.prototype.hasOwnProperty.call(
    args,
    "categories",
  );
  if (hasCategoriesArg) {
    await params.supabase
      .from("envelope_category_links")
      .delete()
      .eq("envelope_id", pocketId);
    const categories = normalizePocketCategories(args.categories);
    for (const category of categories) {
      await upsertEnvelopeCategoryLink(params.supabase, pocketId, category);
    }
  }

  await upsertEnvelopeAllocation(
    params.supabase,
    pocketId,
    periodMonth,
    amountCents,
  );

  const updatedPockets: Array<{
    id: string;
    name: string;
    percentage: number;
  }> = [
    { id: pocketId, name: String(savedPocket?.name || nameToUse), percentage },
  ];
  if (hasPercentageArg) {
    const others = (envelopeRows || [])
      .filter((p: any) => p.id !== pocketId)
      .map((p: any) => ({
        id: p.id as string,
        name: String(p.name || "Pocket"),
        percentage: Number(p.budget_percentage) || 0,
      }));
    const adjustedOthers =
      percentage >= 100
        ? Object.fromEntries(others.map((p) => [p.id, 0]))
        : rebalancePocketPercentages(percentage, others);
    for (const other of others) {
      if (!Object.prototype.hasOwnProperty.call(adjustedOthers, other.id)) {
        continue;
      }
      const adjustedPct = Number((adjustedOthers[other.id] || 0).toFixed(4));
      const adjustedAmountCents = Math.round(
        (adjustedPct / 100) * totalBudgetCents,
      );
      await params.supabase
        .from("budget_envelopes")
        .update({
          budget_percentage: adjustedPct,
          budget_amount_cents: adjustedAmountCents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", other.id);
      await upsertEnvelopeAllocation(
        params.supabase,
        other.id,
        periodMonth,
        adjustedAmountCents,
      );
      updatedPockets.push({
        id: other.id,
        name: other.name,
        percentage: adjustedPct,
      });
    }
  }

  return {
    result: {
      success: true,
      pocket: savedPocket || { id: pocketId, name: nameToUse, percentage },
      updated_pockets: updatedPockets,
    },
  };
}
