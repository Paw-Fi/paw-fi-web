import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { sanitizeUuid } from "../shared/accounts.ts";

interface RequestBody {
  transferId: string;
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
    const transferId = sanitizeUuid(body.transferId ?? null);
    if (!transferId) {
      return jsonResponse(
        {
          success: false,
          error: "transferId is required",
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
      global: {
        headers: { "X-Client-Info": "moneko-delete-account-transfer" },
      },
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

    const { data: existingTransfer, error: transferError } = await supabase
      .from("account_transfers")
      .select("id, created_by_user_id, household_id")
      .eq("id", transferId)
      .maybeSingle();

    if (transferError) {
      console.error("[delete-account-transfer] load transfer", transferError);
      return jsonResponse(
        {
          success: false,
          error: "Failed to load transfer",
          code: "SERVER_ERROR",
        },
        500,
      );
    }

    if (!existingTransfer) {
      return jsonResponse(
        { success: false, error: "Transfer not found", code: "NOT_FOUND" },
        404,
      );
    }

    if (existingTransfer.created_by_user_id !== userId) {
      return jsonResponse(
        { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
        403,
      );
    }

    if (existingTransfer.household_id != null) {
      const { data: membership } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", existingTransfer.household_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership) {
        return jsonResponse(
          { success: false, error: "Forbidden", code: "UNAUTHORIZED" },
          403,
        );
      }
    }

    const { error } = await supabase
      .from("account_transfers")
      .delete()
      .eq("id", transferId);

    if (error) {
      console.error("[delete-account-transfer]", error);
      return jsonResponse(
        {
          success: false,
          error: "Failed to delete transfer",
          code: "SERVER_ERROR",
        },
        500,
      );
    }

    return jsonResponse({ success: true, data: { id: transferId } });
  } catch (error) {
    console.error("[delete-account-transfer]", error);
    return jsonResponse(
      {
        success: false,
        error: "Failed to delete transfer",
        code: "SERVER_ERROR",
      },
      500,
    );
  }
});
