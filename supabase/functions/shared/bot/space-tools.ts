import {
  type BotSpaceMeta,
  ensureHouseholdMember,
  resolveBotSpaceScope,
} from "./household-utils.ts";
import { createHouseholdInvite } from "../household-invites.ts";
import { resolveUserDisplayName } from "../user-display-name.ts";

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

function readRelatedUser(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    return value[0] && typeof value[0] === "object" ? value[0] : {};
  }
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
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
    .select("user_id, role")
    .eq("household_id", householdId);
  if (membersError) return { error: membersError };

  const memberUserIds = [
    ...new Set(
      (members || [])
        .map((member: any) => readString(member?.user_id))
        .filter((userId: string | undefined): userId is string => !!userId),
    ),
  ];
  const { data: profiles, error: profilesError } = memberUserIds.length
    ? await params.supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .in("id", memberUserIds)
    : { data: [], error: null };
  if (profilesError) return { error: profilesError };

  const profilesById = new Map(
    (profiles || []).map((profile: any) => [
      readString(profile?.id),
      profile as Record<string, unknown>,
    ]),
  );
  const normalizedMembers = (members || []).map((member: any) => {
    const user = readRelatedUser(profilesById.get(readString(member?.user_id)));
    const name = readString(user.full_name);
    const email = readString(user.email);
    return {
      name: name || email || "Unknown member",
      email,
      role: readString(member?.role) || "member",
      avatar_url: readString(user.avatar_url),
    };
  });

  return {
    success: true,
    space: {
      name: readString((space as any).name) || "Space",
      currency: readString((space as any).currency),
      type: (space as any).is_portfolio === true ? "private" : "shared",
      cover_image_url: readString((space as any).cover_image_url),
      ai_use_default_split: (space as any).ai_use_default_split === true,
      ai_default_split_config: (space as any).ai_default_split_config || null,
    },
    member_count: normalizedMembers.length,
    members: normalizedMembers,
  };
}

export async function createBotSpaceInvite(params: {
  supabase: SupabaseLike;
  userId: string;
  args: Record<string, unknown>;
  spaceMap: Map<string, BotSpaceMeta>;
}) {
  const { householdId, spaceMeta } = resolveBotSpaceScope(
    params.args,
    params.spaceMap,
  );
  if (!householdId) return { error: "Select a shared space first." };

  const invitedEmail = readString(params.args.invited_email);
  if (!invitedEmail) return { error: "Email address is required." };

  const { data: space, error: spaceError } = await params.supabase
    .from("households")
    .select("id, name, is_portfolio, owner_id")
    .eq("id", householdId)
    .maybeSingle();
  if (spaceError || !space) return { error: spaceError || "Space not found." };
  if ((space as any).is_portfolio === true) {
    return { error: "Private spaces cannot have invite links." };
  }

  const isOwner = (space as any).owner_id === params.userId;
  const isMember =
    isOwner ||
    (await ensureHouseholdMember(params.supabase, householdId, params.userId));
  if (!isMember) return { error: "You do not have access to that space." };

  const rawExpiry = Number(params.args.expires_in_days);
  const expiresInDays = Number.isFinite(rawExpiry) ? rawExpiry : 7;
  const { data: inviterProfile } = await params.supabase
    .from("users")
    .select("full_name, email")
    .eq("id", params.userId)
    .maybeSingle();
  const result = await createHouseholdInvite({
    supabase: params.supabase,
    appUrl: Deno.env.get("APP_URL") || "https://moneko.io",
    resendApiKey: Deno.env.get("RESEND_API_KEY"),
    resendFrom: Deno.env.get("RESEND_FROM") || "Moneko <no-reply@moneko.io>",
    householdId,
    actorUserId: params.userId,
    invitedEmail,
    personalMessage: readString(params.args.personal_message),
    inviterName: resolveUserDisplayName(
      inviterProfile?.full_name,
      inviterProfile?.email,
      "Someone",
    ),
    householdName:
      readString(params.args.household_name) ||
      readString((space as any).name) ||
      spaceMeta?.name,
    expiresInDays,
    failOnEmailError: false,
  });

  if (result.success) {
    return {
      success: true,
      invite_url: result.invite_url,
      token: result.token,
      invited_email: invitedEmail,
      expires_at: result.expires_at,
      email_sent: result.email_sent,
      email_error: result.email_error,
      space: {
        id: householdId,
        name: readString((space as any).name) || spaceMeta?.name || "Space",
      },
    };
  }

  return { error: result.error };
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
