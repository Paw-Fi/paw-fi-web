import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { corsHeaders } from "../shared/cors.ts";
import { assertAccountInScope } from "../shared/accounts.ts";
import { normalizeEmailAddress } from "../shared/email-import.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  hasPlusEntitlement,
  jsonSubscriptionRequired,
  loadLatestSubscriptionForUser,
} from "../shared/plus-entitlement.ts";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RequestBody {
  action: "get" | "update_settings" | "add_whitelist" | "remove_whitelist";
  enabled?: boolean;
  householdId?: string | null;
  isPortfolio?: boolean;
  accountId?: string | null;
  email?: string | null;
}

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400, code?: string) {
  return jsonResponse({ success: false, error: message, code }, status);
}

async function resolveUserSettings(params: {
  supabase: any;
  userId: string;
  defaultEmail: string;
}): Promise<Record<string, unknown>> {
  const { supabase, userId, defaultEmail } = params;

  const { data: contact, error: contactError } = await supabase
    .from("user_contacts")
    .select(
      "id, email_import_enabled, email_import_household_id, email_import_is_portfolio, email_import_account_id",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contactError) {
    await reportEdgeFunctionError({
      functionName: "email-import-settings",
      error: contactError,
      context: { operation: "user_contacts.select_settings", userId },
    });
    throw new Error(
      `Failed to load email import settings: ${contactError.message}`,
    );
  }

  const householdId = sanitizeUuid(contact?.email_import_household_id ?? null);
  const isPortfolio = contact?.email_import_is_portfolio === true;
  const accountId = sanitizeUuid(contact?.email_import_account_id ?? null);

  let scopeName = "Personal";
  if (householdId) {
    const { data: household } = await supabase
      .from("households")
      .select("name")
      .eq("id", householdId)
      .maybeSingle();
    if (
      typeof household?.name === "string" &&
      household.name.trim().length > 0
    ) {
      scopeName = household.name.trim();
    } else {
      scopeName = isPortfolio ? "Portfolio" : "Shared space";
    }
  }

  let accountName: string | null = null;
  if (accountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("name")
      .eq("id", accountId)
      .maybeSingle();
    accountName =
      typeof account?.name === "string" && account.name.trim().length > 0
        ? account.name.trim()
        : null;
  }

  const { data: whitelistRows, error: whitelistError } = await supabase
    .from("email_import_sender_whitelist")
    .select("id, sender_email, normalized_sender_email, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (whitelistError) {
    throw new Error(
      `Failed to load email whitelist: ${whitelistError.message}`,
    );
  }

  return {
    enabled: contact?.email_import_enabled === true,
    scopeId: householdId ?? "personal",
    scopeName,
    isPortfolio,
    accountId,
    accountName,
    defaultEmail,
    whitelistEmails: Array.isArray(whitelistRows)
      ? whitelistRows.map((row: any) => ({
        id: row.id,
        email: row.sender_email,
        normalizedEmail: row.normalized_sender_email,
        createdAt: row.created_at,
      }))
      : [],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, "METHOD_NOT_ALLOWED");
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Server not configured", 500, "SERVER_ERROR");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  if (!bearerToken) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "moneko-email-import-settings" },
    },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(
    bearerToken,
  );
  if (authError || !authData?.user?.id) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }

  const userId = authData.user.id;
  const authEmail = normalizeEmailAddress(authData.user.email);
  if (!authEmail) {
    return errorResponse(
      "Your account email is missing",
      400,
      "DEFAULT_EMAIL_MISSING",
    );
  }

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, "INVALID_JSON");
  }

  if (!payload?.action) {
    return errorResponse("action is required", 400, "VALIDATION_ERROR");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "moneko-email-import-settings" },
    },
  });

  const { data: existingContact, error: contactSelectError } = await supabase
    .from("user_contacts")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contactSelectError) {
    await reportEdgeFunctionError({
      functionName: "email-import-settings",
      error: contactSelectError,
      context: { operation: "user_contacts.select_existing", userId },
    });
    return errorResponse("Failed to load contact", 500, "SERVER_ERROR");
  }

  if (payload.action === "get") {
    const settings = await resolveUserSettings({
      supabase,
      userId,
      defaultEmail: authEmail,
    });
    return jsonResponse({ success: true, data: settings });
  }

  if (payload.action === "update_settings") {
    if (typeof payload.enabled !== "boolean") {
      return errorResponse(
        "enabled must be a boolean",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (payload.enabled) {
      try {
        const subscription = await loadLatestSubscriptionForUser(
          supabase,
          userId,
        );
        if (!hasPlusEntitlement(subscription)) {
          return jsonResponse(
            jsonSubscriptionRequired("Email File Import"),
            403,
          );
        }
      } catch (error) {
        await reportEdgeFunctionError({
          functionName: "email-import-settings",
          error,
          context: { operation: "subscriptions.select_entitlement", userId },
        });
        return errorResponse(
          "Failed to verify subscription",
          500,
          "SERVER_ERROR",
        );
      }
    }

    const householdId = sanitizeUuid(payload.householdId ?? null);
    if (payload.householdId && !householdId) {
      return errorResponse("Invalid householdId", 400, "VALIDATION_ERROR");
    }

    const isPortfolio = payload.isPortfolio === true;
    if (householdId) {
      const { data: membership, error: membershipError } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .maybeSingle();
      if (membershipError) {
        return errorResponse(
          "Failed to verify household scope",
          500,
          "SERVER_ERROR",
        );
      }
      if (!membership?.id) {
        return errorResponse(
          "Unauthorized household scope",
          403,
          "UNAUTHORIZED",
        );
      }
    }

    const accountId = sanitizeUuid(payload.accountId ?? null);
    if (payload.accountId && !accountId) {
      return errorResponse("Invalid accountId", 400, "VALIDATION_ERROR");
    }
    if (accountId) {
      const isInScope = await assertAccountInScope(supabase, accountId, {
        userId,
        householdId,
      });
      if (!isInScope) {
        return errorResponse(
          "Selected wallet is not in the chosen space",
          400,
          "ACCOUNT_SCOPE_MISMATCH",
        );
      }
    }

    const updateValues = {
      email_import_enabled: payload.enabled,
      email_import_household_id: householdId,
      email_import_is_portfolio: isPortfolio,
      email_import_account_id: accountId,
    };

    if (existingContact?.id) {
      const { error: updateError } = await supabase
        .from("user_contacts")
        .update(updateValues)
        .eq("id", existingContact.id);
      if (updateError) {
        await reportEdgeFunctionError({
          functionName: "email-import-settings",
          error: updateError,
          context: {
            operation: "user_contacts.update_email_import_settings",
            userId,
            contactId: existingContact.id,
          },
        });
        return errorResponse("Failed to update settings", 500, "SERVER_ERROR");
      }
    } else {
      const { error: insertError } = await supabase
        .from("user_contacts")
        .upsert(
          {
            user_id: userId,
            ...updateValues,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (insertError) {
        await reportEdgeFunctionError({
          functionName: "email-import-settings",
          error: insertError,
          context: {
            operation: "user_contacts.upsert_email_import_settings",
            userId,
          },
        });
        return errorResponse("Failed to create settings", 500, "SERVER_ERROR");
      }
    }

    const settings = await resolveUserSettings({
      supabase,
      userId,
      defaultEmail: authEmail,
    });
    return jsonResponse({ success: true, data: settings });
  }

  if (payload.action === "add_whitelist") {
    const normalizedEmail = normalizeEmailAddress(payload.email);
    if (!normalizedEmail) {
      return errorResponse("Invalid email", 400, "INVALID_EMAIL");
    }
    if (normalizedEmail === authEmail) {
      return errorResponse(
        "Your account email is already included by default",
        409,
        "DEFAULT_EMAIL_ALREADY_INCLUDED",
      );
    }

    const { data: matchingUsers, error: usersError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail);
    if (usersError) {
      return errorResponse("Failed to validate email", 500, "SERVER_ERROR");
    }
    if (
      Array.isArray(matchingUsers) &&
      matchingUsers.some((row: any) => row.id !== userId)
    ) {
      return errorResponse(
        "This email is already claimed by another account",
        409,
        "EMAIL_ALREADY_CLAIMED",
      );
    }

    const { data: whitelistMatches, error: whitelistCheckError } =
      await supabase
        .from("email_import_sender_whitelist")
        .select("id, user_id")
        .eq("normalized_sender_email", normalizedEmail)
        .order("created_at", { ascending: false });

    if (whitelistCheckError) {
      return errorResponse("Failed to validate email", 500, "SERVER_ERROR");
    }

    const ownedByOtherUser = Array.isArray(whitelistMatches)
      ? whitelistMatches.some((row: any) => row.user_id !== userId)
      : false;
    if (ownedByOtherUser) {
      return errorResponse(
        "This email is already claimed by another account",
        409,
        "EMAIL_ALREADY_CLAIMED",
      );
    }

    const alreadyExistsForUser = Array.isArray(whitelistMatches)
      ? whitelistMatches.some((row: any) => row.user_id === userId)
      : false;
    if (!alreadyExistsForUser) {
      const { error: insertError } = await supabase
        .from("email_import_sender_whitelist")
        .upsert(
          {
            user_id: userId,
            sender_email: normalizedEmail,
            normalized_sender_email: normalizedEmail,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "normalized_sender_email" },
        );
      if (insertError) {
        return errorResponse("Failed to add email", 500, "SERVER_ERROR");
      }
    }

    const settings = await resolveUserSettings({
      supabase,
      userId,
      defaultEmail: authEmail,
    });
    return jsonResponse({ success: true, data: settings });
  }

  if (payload.action === "remove_whitelist") {
    const normalizedEmail = normalizeEmailAddress(payload.email);
    if (!normalizedEmail) {
      return errorResponse("Invalid email", 400, "INVALID_EMAIL");
    }
    if (normalizedEmail === authEmail) {
      return errorResponse(
        "Your account email cannot be removed",
        400,
        "DEFAULT_EMAIL_IMMUTABLE",
      );
    }

    const { error: deleteError } = await supabase
      .from("email_import_sender_whitelist")
      .delete()
      .eq("user_id", userId)
      .eq("normalized_sender_email", normalizedEmail);
    if (deleteError) {
      return errorResponse("Failed to remove email", 500, "SERVER_ERROR");
    }

    const settings = await resolveUserSettings({
      supabase,
      userId,
      defaultEmail: authEmail,
    });
    return jsonResponse({ success: true, data: settings });
  }

  return errorResponse("Unsupported action", 400, "VALIDATION_ERROR");
});
