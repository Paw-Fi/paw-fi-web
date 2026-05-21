import { buildInternalInvokeHeaders } from "../auth.ts";
import { updatePreferredCurrency } from "../currency-helpers.ts";
import { formatInvokeError } from "../formatting-helpers.ts";
import {
  type BotSpaceMeta,
  ensureHouseholdMember,
  isExplicitPersonalScope,
  resolveBotSpaceScope,
} from "./household-utils.ts";

type SupabasePreferenceClient = {
  from: (table: string) => any;
  functions: {
    invoke: (
      functionName: string,
      options?: any,
    ) => Promise<{
      data?: any;
      error?: any;
    }>;
  };
};

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export type BotPreferenceToolFailure = {
  formatted: string;
  error: unknown;
  targetFunction?: string;
  context: Record<string, unknown>;
};

export type BotPreferenceToolResult = {
  result: Record<string, unknown>;
  failure?: BotPreferenceToolFailure;
};

export async function setBotPreferredCurrency(params: {
  supabase: SupabasePreferenceClient;
  contactId: string;
  currency: string;
}): Promise<BotPreferenceToolResult> {
  const { data, error } = await updatePreferredCurrency(
    params.supabase as any,
    params.contactId,
    params.currency,
  );

  if (!error) {
    return {
      result: {
        success: true,
        currency: data?.preferred_currency || params.currency,
      },
    };
  }

  const formatted = formatInvokeError(error);
  return {
    result: { error },
    failure: {
      formatted,
      error,
      context: { currency: params.currency },
    },
  };
}

export async function setBotPreferredLanguage(params: {
  supabase: SupabasePreferenceClient;
  internalFunctionKey: string;
  userId: string;
  language: string;
}): Promise<BotPreferenceToolResult> {
  const { data, error } = await params.supabase.functions.invoke(
    "update-preferred-language",
    {
      body: {
        userId: params.userId,
        language: params.language,
      },
      headers: buildInternalInvokeHeaders(params.internalFunctionKey),
    },
  );
  const resolvedLanguage = data?.results?.preferredLanguage || params.language;
  const success = !error && (data?.ok === true || data?.success === true);

  if (success) {
    return {
      result: {
        success: true,
        language: resolvedLanguage,
        reply_language: resolvedLanguage,
        message: `Preferred language updated to ${resolvedLanguage}. Reply in this language for this confirmation and use it as the default language for future replies.`,
      },
    };
  }

  const formatted =
    formatInvokeError(error ?? data?.error) ||
    "Failed to update preferred language";
  return {
    result: { error: formatted },
    failure: {
      formatted,
      error: error ?? data?.error,
      targetFunction: "update-preferred-language",
      context: { language: params.language },
    },
  };
}

export async function loadBotPreferredSpaceId(params: {
  supabase: SupabasePreferenceClient;
  userId: string;
  contactId: string;
  spaceMap: Map<string, BotSpaceMeta>;
}): Promise<string | null> {
  const { data } = await params.supabase
    .from("user_contacts")
    .select("preferred_space_id")
    .eq("id", params.contactId)
    .eq("user_id", params.userId)
    .maybeSingle();
  const preferredSpaceId = readString((data as any)?.preferred_space_id);
  if (!preferredSpaceId) return null;

  if (params.spaceMap.has(preferredSpaceId)) return preferredSpaceId;

  const { data: space, error } = await params.supabase
    .from("households")
    .select("id, name, is_portfolio, owner_id")
    .eq("id", preferredSpaceId)
    .maybeSingle();
  if (error || !space) return null;

  const isOwner = (space as any).owner_id === params.userId;
  const isMember = isOwner ||
    (await ensureHouseholdMember(
      params.supabase,
      preferredSpaceId,
      params.userId,
    ));
  if (!isMember) return null;

  const name = readString((space as any).name);
  if (name) {
    const record = {
      id: preferredSpaceId,
      name,
      isPortfolio: (space as any).is_portfolio === true,
    };
    params.spaceMap.set(record.id, record);
    params.spaceMap.set(record.name.toLowerCase(), record);
  }

  return preferredSpaceId;
}

export async function setBotPreferredSpace(params: {
  supabase: SupabasePreferenceClient;
  userId: string;
  contactId: string;
  args: Record<string, unknown>;
  spaceMap: Map<string, BotSpaceMeta>;
}): Promise<BotPreferenceToolResult> {
  if (isExplicitPersonalScope(params.args)) {
    const { data, error } = await params.supabase
      .from("user_contacts")
      .update({ preferred_space_id: null, updated_at: new Date().toISOString() })
      .eq("id", params.contactId)
      .eq("user_id", params.userId)
      .select("id, preferred_space_id")
      .maybeSingle();
    if (!error && data) {
      return {
        result: {
          success: true,
          preferred_space_id: null,
          default_space: "personal",
        },
      };
    }
    const formatted = error
      ? formatInvokeError(error)
      : "Contact not found for this bot channel.";
    return {
      result: { error: formatted },
      failure: {
        formatted,
        error,
        context: { contact_id: params.contactId, preferred_space_id: null },
      },
    };
  }

  const { householdId, spaceMeta } = resolveBotSpaceScope(
    params.args,
    params.spaceMap,
  );
  if (!householdId) {
    return {
      result: {
        error:
          "Select a space first, or set space_scope to personal to clear the default.",
      },
    };
  }

  const { data: space, error: spaceError } = await params.supabase
    .from("households")
    .select("id, name, is_portfolio, owner_id")
    .eq("id", householdId)
    .maybeSingle();
  if (spaceError || !space) {
    return { result: { error: "Space not found." } };
  }

  const isOwner = (space as any).owner_id === params.userId;
  const isMember = isOwner ||
    (await ensureHouseholdMember(params.supabase, householdId, params.userId));
  if (!isMember) {
    return { result: { error: "You do not have access to that space." } };
  }

  const { data, error } = await params.supabase
    .from("user_contacts")
    .update({
      preferred_space_id: householdId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.contactId)
    .eq("user_id", params.userId)
    .select("id, preferred_space_id")
    .maybeSingle();

  if (!error && data) {
    return {
      result: {
        success: true,
        preferred_space_id: householdId,
        space: {
          id: householdId,
          name:
            readString((space as any).name) || spaceMeta?.name || "Space",
          type: (space as any).is_portfolio === true
            ? "private_space"
            : "shared_space",
        },
      },
    };
  }

  const formatted = error
    ? formatInvokeError(error)
    : "Contact not found for this bot channel.";
  return {
    result: { error: formatted },
    failure: {
      formatted,
      error,
      context: { contact_id: params.contactId, preferred_space_id: householdId },
    },
  };
}
