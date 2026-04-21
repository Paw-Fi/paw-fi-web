import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { getAccountOrNull, sanitizeUuid } from "../shared/accounts.ts";

interface RequestBody {
  accountId: string;
  userId?: string;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed", code: "VALIDATION_ERROR" },
      405,
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      {
        success: false,
        error: "Server configuration error",
        code: "SERVER_ERROR",
      },
      500,
    );
  }

  try {
    const body = (await req.json()) as RequestBody;
    const accountId = sanitizeUuid(body.accountId ?? null);
    if (!accountId) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid accountId",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-restore-account" } },
    });

    const auth = await authenticateUserOrInternalSecret(req, supabase);
    if (!auth.success) {
      return jsonResponse(
        {
          success: false,
          error: auth.error ?? "Unauthorized",
          code: "UNAUTHORIZED",
        },
        auth.statusCode ?? 401,
      );
    }

    const userId = auth.isInternalService
      ? sanitizeUuid(body.userId ?? null)
      : auth.userId;
    if (!userId) {
      return jsonResponse(
        {
          success: false,
          error: "Valid userId is required",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }

    const account = await getAccountOrNull(supabase, accountId);
    if (!account) {
      return jsonResponse(
        { success: false, error: "Account not found", code: "NOT_FOUND" },
        404,
      );
    }
    if (account.is_system) {
      return jsonResponse(
        {
          success: false,
          error: "System account cannot be restored",
          code: "VALIDATION_ERROR",
        },
        400,
      );
    }
    if (!account.is_archived) {
      return jsonResponse({
        success: true,
        data: { id: accountId, restored: true, alreadyActive: true },
      });
    }

    const householdId = account.household_id as string | null;
    if (!householdId && account.user_id !== userId) {
      return jsonResponse(
        { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
        403,
      );
    }
    if (householdId) {
      const { data: membership } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership) {
        return jsonResponse(
          { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
          403,
        );
      }
    }

    const { error: restoreError } = await supabase
      .from("accounts")
      .update({
        is_archived: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    if (restoreError) {
      return jsonResponse(
        {
          success: false,
          error: "Failed to restore account",
          code: "SERVER_ERROR",
        },
        500,
      );
    }

    return jsonResponse({
      success: true,
      data: { id: accountId, restored: true },
    });
  } catch (error) {
    console.error("[restore-account]", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to restore account",
        code: "SERVER_ERROR",
      },
      500,
    );
  }
});
