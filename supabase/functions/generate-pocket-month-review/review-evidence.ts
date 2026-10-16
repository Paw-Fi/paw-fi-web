import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  type HouseholdEconomicTransaction,
  householdIncomeEffectCents,
  householdSpendingEffectCents,
} from "../shared/household-summary-economics.ts";
import { readWalletLedgerPages } from "../shared/wallet-ledger-pages.ts";

export interface PocketReviewEvidenceInput {
  scope: "personal" | "portfolio" | "household";
  householdId: string | null;
  currency: string;
  cycleStart: string;
}

export interface PocketReviewEvidence {
  currentActuals: Record<string, unknown>[];
  previousActuals: Record<string, unknown>[];
  currentRecordedIncomeCents: number;
  previousRecordedIncomeCents: number;
  previousCycleStart: string;
  nextCycleStart: string;
  space: { kind: string; name: string | null; member_count: number };
}

export interface PocketReviewContactContext {
  preferred_language: string | null;
  preferred_timezone: string | null;
  financial_month_start_day: number;
}

interface EvidenceRow extends HouseholdEconomicTransaction {
  id: string;
  user_id: string;
  privacy_scope: string | null;
  date: string;
  category: string | null;
}

export function pocketReviewCycleKeys(
  cycleStart: string,
  configuredStartDay: number,
): { previousCycleStart: string; nextCycleStart: string } {
  if (
    !Number.isInteger(configuredStartDay) ||
    configuredStartDay < 1 ||
    configuredStartDay > 31 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(cycleStart)
  ) {
    throw new Error("Invalid review cycle");
  }
  const [year, month] = cycleStart.split("-").map(Number);
  if (year < 1970 || year > 9998 || month < 1 || month > 12) {
    throw new Error("Invalid review cycle");
  }
  const anchor = (offset: number) => {
    const first = new Date(Date.UTC(year, month - 1 + offset, 1));
    const lastDay = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    first.setUTCDate(Math.min(configuredStartDay, lastDay));
    return first.toISOString().slice(0, 10);
  };
  if (anchor(0) !== cycleStart) throw new Error("Invalid review cycle anchor");
  return { previousCycleStart: anchor(-1), nextCycleStart: anchor(1) };
}

async function verifyActor(client: SupabaseClient, userId: string) {
  const { data, error } = await client.auth.getUser();
  if (error || !userId || data.user?.id !== userId) {
    throw new Error("Unauthorized review actor");
  }
}

// Callers must supply their JWT-scoped client; RLS remains the read authority.
export async function loadPocketReviewContactContext(
  client: SupabaseClient,
  userId: string,
): Promise<PocketReviewContactContext> {
  await verifyActor(client, userId);
  const { data, error } = await client
    .from("user_contacts")
    .select("preferred_language, preferred_timezone, financial_month_start_day")
    .eq("user_id", userId)
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const day = data?.financial_month_start_day ?? 1;
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("Invalid review cycle configuration");
  }
  return {
    preferred_language:
      typeof data?.preferred_language === "string"
        ? data.preferred_language
        : null,
    preferred_timezone:
      typeof data?.preferred_timezone === "string"
        ? data.preferred_timezone
        : null,
    financial_month_start_day: day,
  };
}

export async function loadPocketReviewEvidence(
  client: SupabaseClient,
  userId: string,
  input: PocketReviewEvidenceInput,
  configuredStartDay: number,
): Promise<PocketReviewEvidence> {
  const keys = pocketReviewCycleKeys(input.cycleStart, configuredStartDay);
  if (
    !["personal", "portfolio", "household"].includes(input.scope) ||
    !/^[A-Z]{3}$/.test(input.currency) ||
    (input.scope === "personal"
      ? input.householdId !== null
      : typeof input.householdId !== "string" || !input.householdId.trim())
  ) {
    throw new Error("Invalid review scope or currency");
  }
  const householdId = input.householdId?.toLowerCase() ?? null;
  await verifyActor(client, userId);
  let space: PocketReviewEvidence["space"] = {
    kind: "personal",
    name: null,
    member_count: 1,
  };
  if (input.scope !== "personal") {
    const { data: household, error } = await client
      .from("households")
      .select("id, name, is_portfolio, owner_id")
      .eq("id", householdId)
      .maybeSingle();
    if (error) throw error;
    if (
      !household ||
      typeof household.id !== "string" ||
      household.id.toLowerCase() !== householdId ||
      household.is_portfolio !== (input.scope === "portfolio") ||
      (input.scope === "portfolio" && household.owner_id !== userId)
    ) {
      throw new Error("Unauthorized review space");
    }
    if (input.scope === "household") {
      const membership = await client
        .from("household_members")
        .select("household_id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .maybeSingle();
      if (membership.error) throw membership.error;
      if (!membership.data) throw new Error("Unauthorized review membership");
    }
    const members = await client
      .from("household_members")
      .select("household_id", { count: "exact", head: true })
      .eq("household_id", householdId);
    if (members.error) throw members.error;
    if (
      members.count == null ||
      !Number.isSafeInteger(members.count) ||
      members.count < 0
    ) {
      throw new Error("Incomplete review member count");
    }
    space = {
      kind: input.scope,
      name: typeof household.name === "string" ? household.name : null,
      member_count: members.count,
    };
  }

  const loadCycle = async (start: string, end: string) => {
    const rows = await readWalletLedgerPages<EvidenceRow>((afterId) => {
      let query = client
        .from("expenses")
        .select(
          "id, user_id, privacy_scope, amount_cents, category, currency, date, analytics_is_final, analytics_spending_multiplier, analytics_counts_toward_income",
        )
        .eq("currency", input.currency)
        .or("is_recurring.eq.false,is_recurring.is.null")
        .is("deleted_at", null)
        .eq("analytics_is_final", true)
        .gte("date", start)
        .lt("date", end)
        .order("id", { ascending: true })
        .limit(1000);
      query =
        input.scope === "personal"
          ? query.is("household_id", null).eq("user_id", userId)
          : query.eq("household_id", householdId);
      if (input.scope === "portfolio") query = query.eq("user_id", userId);
      if (afterId !== null) query = query.gt("id", afterId);
      return query;
    });
    const actuals: Record<string, unknown>[] = [];
    let income = 0;
    for (const row of rows) {
      const isForeign = row.user_id !== userId;
      if (
        isForeign &&
        row.privacy_scope !== "full" &&
        row.privacy_scope !== "balances_only"
      ) {
        continue;
      }
      const spending = householdSpendingEffectCents(row);
      const recordedIncome = householdIncomeEffectCents(row);
      if (spending === 0 && recordedIncome === 0) continue;
      const amount = spending !== 0 ? spending : recordedIncome;
      if (!Number.isSafeInteger(amount)) {
        throw new Error("Invalid review amount");
      }
      const isIncome = spending === 0;
      if (isIncome) income += amount;
      if (!Number.isSafeInteger(income)) {
        throw new Error("Invalid review income total");
      }
      actuals.push({
        id: row.id,
        type: isIncome ? "income" : "expense",
        date: row.date,
        category:
          isForeign && row.privacy_scope === "balances_only"
            ? "uncategorized"
            : typeof row.category === "string"
              ? row.category
              : null,
        currency: input.currency,
        amount_cents: amount,
      });
    }
    return { actuals, income };
  };
  const [current, previous] = await Promise.all([
    loadCycle(input.cycleStart, keys.nextCycleStart),
    loadCycle(keys.previousCycleStart, input.cycleStart),
  ]);
  return {
    currentActuals: current.actuals,
    previousActuals: previous.actuals,
    currentRecordedIncomeCents: current.income,
    previousRecordedIncomeCents: previous.income,
    ...keys,
    space,
  };
}
