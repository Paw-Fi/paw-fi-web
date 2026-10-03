import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { corsHeaders } from "../shared/cors.ts";
import { assertAccountInScope } from "../shared/accounts.ts";
import { normalizeEmailAddress } from "../shared/email-import.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { sendEmail } from "../shared/email-service.ts";
import {
  buildSenderVerificationEmail,
  createSenderVerificationToken,
  hashSenderVerificationToken,
} from "../shared/email-sender-verification.ts";
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
  senderVerificationVersion?: number;
}

function sanitizeUuid(value?: string | null): string | null {
  if (typeof value !== "string" || !value) return null;
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
    .select(
      "id, sender_email, normalized_sender_email, created_at, verified_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (whitelistError) {
    throw new Error(
      `Failed to load email whitelist: ${whitelistError.message}`,
    );
  }

  return {
    userId,
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
          verified: row.verified_at != null,
          verifiedAt: row.verified_at,
        }))
      : [],
  };
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse(
      "This request isn't supported. Please update Moneko and try again.",
      405,
      "METHOD_NOT_ALLOWED",
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse(
      "Email import is temporarily unavailable. Please try again later.",
      500,
      "SERVER_ERROR",
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  if (!bearerToken) {
    return errorResponse(
      "Your session has expired. Please sign in again to manage email import.",
      401,
      "UNAUTHORIZED",
    );
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

  const { data: authData, error: authError } =
    await authClient.auth.getUser(bearerToken);
  if (authError || !authData?.user?.id) {
    return errorResponse(
      "Your session has expired. Please sign in again to manage email import.",
      401,
      "UNAUTHORIZED",
    );
  }

  const userId = authData.user.id;
  const authEmail = normalizeEmailAddress(authData.user.email);
  if (!authEmail) {
    return errorResponse(
      "Your account doesn't have a valid email address. Please update your account email or contact support.",
      400,
      "DEFAULT_EMAIL_MISSING",
    );
  }

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return errorResponse(
      "We couldn't read this request. Please try again.",
      400,
      "INVALID_JSON",
    );
  }

  if (!payload?.action) {
    return errorResponse(
      "We couldn't recognize this request. Please update Moneko and try again.",
      400,
      "VALIDATION_ERROR",
    );
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
    return errorResponse(
      "We couldn't load your email import settings. Please try again.",
      500,
      "SERVER_ERROR",
    );
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
        "Please choose whether email import is enabled and try again.",
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
          "We couldn't check your Plus access. Please try again.",
          500,
          "SERVER_ERROR",
        );
      }
    }

    const householdId = sanitizeUuid(payload.householdId ?? null);
    if (
      payload.householdId != null &&
      payload.householdId !== "" &&
      !householdId
    ) {
      return errorResponse(
        "Please select a valid destination space.",
        400,
        "VALIDATION_ERROR",
      );
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
          "We couldn't check access to the selected space. Please try again.",
          500,
          "SERVER_ERROR",
        );
      }
      if (!membership?.id) {
        return errorResponse(
          "You no longer have access to this space. Please choose another destination.",
          403,
          "UNAUTHORIZED",
        );
      }
    }

    const accountId = sanitizeUuid(payload.accountId ?? null);
    if (payload.accountId != null && payload.accountId !== "" && !accountId) {
      return errorResponse(
        "Please select a valid destination wallet.",
        400,
        "VALIDATION_ERROR",
      );
    }
    if (accountId) {
      const isInScope = await assertAccountInScope(supabase, accountId, {
        userId,
        householdId,
      });
      if (!isInScope) {
        return errorResponse(
          "This wallet doesn't belong to the selected space. Please choose a wallet in that space.",
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
        return errorResponse(
          "We couldn't save your email import settings. Please try again.",
          500,
          "SERVER_ERROR",
        );
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
        return errorResponse(
          "We couldn't save your email import settings. Please try again.",
          500,
          "SERVER_ERROR",
        );
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
      return errorResponse(
        "Please enter a valid email address.",
        400,
        "INVALID_EMAIL",
      );
    }
    if (normalizedEmail === authEmail) {
      return errorResponse(
        "Your Moneko account email is already an allowed sender. No need to add it again.",
        409,
        "DEFAULT_EMAIL_ALREADY_INCLUDED",
      );
    }

    if (payload.senderVerificationVersion !== 1) {
      return errorResponse(
        "Please update Moneko to verify new email senders.",
        426,
        "CLIENT_UPDATE_REQUIRED",
      );
    }

    const subscription = await loadLatestSubscriptionForUser(supabase, userId);
    if (!hasPlusEntitlement(subscription)) {
      return jsonResponse(jsonSubscriptionRequired("Email File Import"), 403);
    }
    const token = createSenderVerificationToken();
    const { data: request, error: requestError } = await supabase.rpc(
      "request_email_import_sender_verification",
      {
        p_user_id: userId,
        p_email: normalizedEmail,
        p_token_hash: await hashSenderVerificationToken(token),
      },
    );
    if (requestError) throw requestError;
    if (request?.status === "rate_limited") {
      return errorResponse(
        "Please wait before resending. You can request one link per minute, up to ten per hour.",
        429,
        "EMAIL_VERIFICATION_RATE_LIMIT",
      );
    }
    if (
      request?.status === "pending" &&
      typeof request.verificationId === "string"
    ) {
      const email = buildSenderVerificationEmail({
        accountEmail: authEmail,
        verificationUrl: `${SUPABASE_URL}/functions/v1/email-import-sender-verify#${token}`,
      });
      const sent = await sendEmail({
        to: normalizedEmail,
        ...email,
        idempotencyKey: `email-sender-verification:${request.verificationId}`,
      });
      if (!sent.success) {
        return errorResponse(
          "Your sender is pending verification, but we couldn't send the email. Please wait one minute and resend it.",
          503,
          "VERIFICATION_EMAIL_FAILED",
        );
      }
    } else if (request?.status !== "already_verified") {
      throw new Error("INVALID_SENDER_VERIFICATION_RESPONSE");
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
      return errorResponse(
        "Please enter a valid email address.",
        400,
        "INVALID_EMAIL",
      );
    }
    if (normalizedEmail === authEmail) {
      return errorResponse(
        "Your Moneko account email is always an allowed sender and can't be removed here.",
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
      return errorResponse(
        "We couldn't remove this sender. Please try again.",
        500,
        "SERVER_ERROR",
      );
    }

    const settings = await resolveUserSettings({
      supabase,
      userId,
      defaultEmail: authEmail,
    });
    return jsonResponse({ success: true, data: settings });
  }

  return errorResponse(
    "This email import action isn't supported. Please update Moneko and try again.",
    400,
    "VALIDATION_ERROR",
  );
}

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (error) {
    try {
      await reportEdgeFunctionError({
        functionName: "email-import-settings",
        error,
        context: { operation: "unhandled_request" },
      });
    } catch (_) {
      // Reporting failure must not prevent a safe response to the user.
    }
    return errorResponse(
      "We couldn't complete this email import request. Please refresh your settings and try again.",
      500,
      "SERVER_ERROR",
    );
  }
});
