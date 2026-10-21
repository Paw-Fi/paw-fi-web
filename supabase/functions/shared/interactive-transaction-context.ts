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
  const [spaces, walletRows] = await Promise.all([
    loadAuthorizedSpaces(supabase, params.userId),
    loadAuthorizedWallets(supabase),
  ]);
  const spaceIds = new Set(
    spaces.filter((space) => space.id !== "personal").map((space) => space.id),
  );
  const wallets = walletRows
    .filter((wallet) =>
      wallet.household_id
        ? spaceIds.has(wallet.household_id)
        : wallet.user_id === params.userId
    )
    .map((wallet) => ({
      id: wallet.id,
      name: wallet.name,
      currency: wallet.currency,
      spaceId: wallet.household_id ?? "personal",
    }));
  return { ...defaults, spaces, wallets };
}

async function loadAuthorizedSpaces(
  supabase: SupabaseClient,
  userId: string,
): Promise<InteractiveSpace[]> {
  const {
    data: memberships,
    error: membershipError,
    count: membershipCount,
  } = await supabase
    .from("household_members")
    .select("household_id", { count: "exact" })
    .eq("user_id", userId)
    .order("household_id")
    .range(0, 100);
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
    const {
      data: households,
      error,
      count,
    } = await supabase
      .from("households")
      .select("id, name, is_portfolio, ai_use_default_split", {
        count: "exact",
      }).in("id", ids).range(0, 100);
    if (
      error || !households || households.length !== ids.length ||
      count !== households.length
    ) {
      throw new Error("Unable to load complete authorized Space context");
    }
    const loaded = new Array<InteractiveSpace>(households.length);
    let next = 0;
    // Bound RPC concurrency while retaining catalog order and exact-count guards.
    await Promise.all(
      Array.from({ length: Math.min(4, households.length) }, async () => {
        while (next < households.length) {
          const index = next++;
          const household = households[index];
          let members: InteractiveSpace["members"] = [];
          if (!household.is_portfolio) {
            const { data, error, count } = await supabase.rpc(
              "get_household_home_members_v1",
              { p_household_id: household.id },
              { count: "exact" },
            ).range(0, 100);
            if (
              error ||
              !Array.isArray(data) ||
              !data.length ||
              data.length > 100 ||
              count !== data.length ||
              !data.some((member) => member.user_id === userId)
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
          loaded[index] = {
            id: household.id,
            name: household.name,
            isPortfolio: household.is_portfolio === true,
            members,
            autoSplitEnabled: household.ai_use_default_split !== false,
          };
        }
      }),
    );
    spaces.push(...loaded);
  }
  return spaces;
}

async function loadAuthorizedWallets(
  supabase: SupabaseClient,
): Promise<Array<Record<string, any>>> {
  const wallets: Array<Record<string, any>> = [];
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
      wallets.push(wallet);
    }
    offset += data.length;
    if (offset === count) return wallets;
  }
  throw new Error("Wallet context exceeds the supported interactive limit");
}
