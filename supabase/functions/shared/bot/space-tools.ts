import {
  type BotSpaceMeta,
  ensureHouseholdMember,
  resolveBotSpaceScope,
} from "./household-utils.ts";

type SupabaseLike = {
  from: (table: string) => any;
  rpc?: (name: string, args?: Record<string, unknown>) => any;
};

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeSpaceType(args: Record<string, unknown>): boolean {
  if (typeof args.is_portfolio === "boolean") return args.is_portfolio;
  const rawType = String(args.space_type || args.type || "").toLowerCase();
  return ["private", "private_space", "portfolio"].includes(rawType);
}

function normalizeSplitConfig(value: unknown): unknown | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return undefined;
}

export async function createBotSpace(params: {
  supabase: SupabaseLike;
  userId: string;
  args: Record<string, unknown>;
  defaultCurrency: string;
}) {
  const name = readString(params.args.name);
  if (!name) return { error: "Space name is required." };

  const isPortfolio = normalizeSpaceType(params.args);
  const currency = readString(params.args.currency) || params.defaultCurrency;
  const payload: Record<string, unknown> = {
    name,
    currency,
    owner_id: params.userId,
    is_portfolio: isPortfolio,
  };

  const coverImageUrl = readString(params.args.cover_image_url);
  if (coverImageUrl) payload.cover_image_url = coverImageUrl;
  const autoSplit = readBoolean(params.args.ai_use_default_split);
  if (autoSplit !== undefined) payload.ai_use_default_split = autoSplit;
  const splitConfig = normalizeSplitConfig(params.args.ai_default_split_config);
  if (splitConfig !== undefined) payload.ai_default_split_config = splitConfig;

  const { data, error } = await params.supabase
    .from("households")
    .insert(payload)
    .select(
      "id, name, currency, is_portfolio, ai_use_default_split, ai_default_split_config",
    )
    .single();

  if (error) return { error };
  return { success: true, data };
}

export async function getBotSpaceInfo(params: {
  supabase: SupabaseLike;
  userId: string;
  args: Record<string, unknown>;
  spaceMap: Map<string, BotSpaceMeta>;
}) {
  const { householdId } = resolveBotSpaceScope(params.args, params.spaceMap);
  if (!householdId) return { error: "Select a space first." };

  const { data: space, error: spaceError } = await params.supabase
    .from("households")
    .select(
      "id, name, currency, cover_image_url, is_portfolio, ai_use_default_split, ai_default_split_config, owner_id",
    )
    .eq("id", householdId)
    .maybeSingle();
  if (spaceError || !space) return { error: spaceError || "Space not found." };

  const isOwner = (space as any).owner_id === params.userId;
  const isMember =
    isOwner ||
    (await ensureHouseholdMember(params.supabase, householdId, params.userId));
  if (!isMember) return { error: "You do not have access to that space." };

  const { data: members, error: membersError } = await params.supabase
    .from("household_members")
    .select("user_id, role, users(full_name, email, avatar_url)")
    .eq("household_id", householdId);
  if (membersError) return { error: membersError };

  return { success: true, space, members: members || [] };
}

export async function updateBotSpaceSettings(params: {
  supabase: SupabaseLike;
  userId: string;
  args: Record<string, unknown>;
  spaceMap: Map<string, BotSpaceMeta>;
}) {
  const { householdId } = resolveBotSpaceScope(params.args, params.spaceMap);
  if (!householdId) return { error: "Select a space first." };

  const { data: space, error: spaceError } = await params.supabase
    .from("households")
    .select("owner_id")
    .eq("id", householdId)
    .maybeSingle();
  if (spaceError || !space) return { error: spaceError || "Space not found." };
  const isOwner = (space as any).owner_id === params.userId;

  const { data: membership, error: membershipError } = await params.supabase
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", params.userId)
    .maybeSingle();
  if (!isOwner && (membershipError || !membership)) {
    return { error: "You do not have access to that space." };
  }

  const role = String((membership as any).role || "").toLowerCase();
  if (!isOwner && !["owner", "admin"].includes(role)) {
    return { error: "Only space owners or admins can update settings." };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const name = readString(params.args.name);
  if (name) updates.name = name;
  if (params.args.cover_image_url !== undefined) {
    updates.cover_image_url = readString(params.args.cover_image_url) || null;
  }
  if (
    params.args.is_portfolio !== undefined ||
    params.args.space_type !== undefined
  ) {
    updates.is_portfolio = normalizeSpaceType(params.args);
  }
  const autoSplit = readBoolean(params.args.ai_use_default_split);
  if (autoSplit !== undefined) updates.ai_use_default_split = autoSplit;
  if (params.args.ai_default_split_config !== undefined) {
    updates.ai_default_split_config =
      normalizeSplitConfig(params.args.ai_default_split_config) || null;
  }

  if (Object.keys(updates).length === 1) {
    return { error: "At least one space setting is required." };
  }

  const { data, error } = await params.supabase
    .from("households")
    .update(updates)
    .eq("id", householdId)
    .select(
      "id, name, currency, cover_image_url, is_portfolio, ai_use_default_split, ai_default_split_config",
    )
    .single();

  if (error) return { error };
  return { success: true, data };
}
