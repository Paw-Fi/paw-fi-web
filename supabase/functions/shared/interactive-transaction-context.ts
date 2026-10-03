import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  type InteractiveContext,
  type InteractiveSpace,
  objectValue,
} from "./interactive-transaction-contract.ts";

export async function loadInteractiveTransactionContext(params: {
  supabase: SupabaseClient;
  userId: string;
  defaultSpaceId: string;
  defaultWalletId: string | null;
  currency: string;
  date: string;
  language: string;
  preferredTimezone?: string;
  expenseCategories: string[];
  incomeCategories: string[];
}): Promise<InteractiveContext> {
  const { supabase, ...defaults } = params;
  const { data: memberships, error: membershipError, count: membershipCount } =
    await supabase.from("household_members")
      .select("household_id", { count: "exact" }).eq("user_id", params.userId)
      .order("household_id").range(0, 100);
  if (
    membershipError || !Array.isArray(memberships) ||
    memberships.length > 100 || membershipCount !== memberships.length
  ) throw new Error("Unable to load complete authorized Space context");
  const ids = [
    ...new Set(
      memberships.map((membership) => membership.household_id as string),
    ),
  ];
  const spaces: InteractiveSpace[] = [{
    id: "personal",
    name: "Personal",
    isPortfolio: false,
    members: [],
  }];
  if (ids.length) {
    const { data: households, error, count } = await supabase.from("households")
      .select("id, name, is_portfolio, ai_use_default_split", {
        count: "exact",
      }).in("id", ids).range(0, 100);
    if (
      error || !households || households.length !== ids.length ||
      count !== households.length
    ) throw new Error("Unable to load complete authorized Space context");
    for (const household of households) {
      let members: InteractiveSpace["members"] = [];
      if (!household.is_portfolio) {
        const { data, error, count } = await supabase.rpc(
          "get_household_home_members_v1",
          { p_household_id: household.id },
          { count: "exact" },
        ).range(0, 100);
        if (
          error || !Array.isArray(data) || !data.length || data.length > 100 ||
          count !== data.length || !data.some((member) =>
            member.user_id === params.userId
          )
        ) {
          throw new Error("Unable to load authorized Space members");
        }
        members = data.map((member) => {
          const profile = objectValue(member.users);
          return {
            userId: String(member.user_id),
            name: String(profile.full_name || profile.email || ""),
          };
        });
      }
      spaces.push({
        id: household.id,
        name: household.name,
        isPortfolio: household.is_portfolio === true,
        members,
        autoSplitEnabled: household.ai_use_default_split !== false,
      });
    }
  }
  const wallets: InteractiveContext["wallets"] = [];
  const seenWallets = new Set<string>();
  let expectedCount: number | null = null;
  for (let offset = 0; offset < 1000;) {
    const { data, error, count } = await supabase.from("accounts")
      .select("id, name, currency, household_id, user_id", { count: "exact" })
      .eq("is_archived", false).order("id").range(offset, offset + 199);
    if (
      error || !Array.isArray(data) || count == null ||
      !Number.isSafeInteger(count) || count < 0 || count > 1000 ||
      (expectedCount != null && expectedCount !== count) ||
      offset + data.length > count || (!data.length && offset < count)
    ) throw new Error("Unable to load complete authorized wallets");
    expectedCount = count;
    for (const wallet of data) {
      if (
        typeof wallet.id !== "string" || !wallet.id ||
        seenWallets.has(wallet.id)
      ) throw new Error("Wallet catalog changed while loading");
      seenWallets.add(wallet.id);
      if (
        wallet.household_id
          ? !ids.includes(wallet.household_id)
          : wallet.user_id !== params.userId
      ) continue;
      wallets.push({
        id: wallet.id,
        name: wallet.name,
        currency: wallet.currency,
        spaceId: wallet.household_id ?? "personal",
      });
    }
    offset += data.length;
    if (offset === count) return { ...defaults, spaces, wallets };
  }
  throw new Error("Wallet context exceeds the supported interactive limit");
}
