import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "./cors.ts";
import { authenticateUserOrInternalSecret } from "./auth.ts";

export interface PaymentPlanContext {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  requestBody: Record<string, unknown>;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(
  error: string,
  status = 400,
  code = "VALIDATION_ERROR",
): Response {
  return jsonResponse({ success: false, error, code }, status);
}

export async function withPaymentPlanContext(
  req: Request,
): Promise<{ context?: PaymentPlanContext; response?: Response }> {
  if (req.method === "OPTIONS") {
    return { response: new Response("ok", { headers: corsHeaders }) };
  }

  if (req.method !== "POST") {
    return {
      response: errorResponse("Method not allowed. Use POST.", 405),
    };
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { response: errorResponse("Server configuration error", 500) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "X-Client-Info": "moneko-payment-plans" } },
  });

  const authResult = await authenticateUserOrInternalSecret(req, supabase);
  if (!authResult.success) {
    return {
      response: errorResponse(
        authResult.error ?? "Unauthorized",
        authResult.statusCode ?? 401,
        "UNAUTHORIZED",
      ),
    };
  }

  let requestBody: Record<string, unknown>;
  try {
    requestBody = (await req.json()) as Record<string, unknown>;
  } catch {
    return { response: errorResponse("Invalid JSON payload", 400) };
  }

  let userId = "";

  if (authResult.isInternalService) {
    const candidate = requestBody.userId;
    if (typeof candidate !== "string" || candidate.trim().length === 0) {
      return {
        response: errorResponse(
          "userId is required for internal calls",
          400,
        ),
      };
    }
    userId = candidate.trim();
  } else {
    userId = authResult.userId ?? "";
  }

  if (!userId) {
    return {
      response: errorResponse("Unable to resolve caller identity", 401),
    };
  }

  return {
    context: {
      supabase,
      userId,
      requestBody,
    },
  };
}

export function mapRpcError(error: unknown, fallback: string): Response {
  const message = typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: string }).message === "string"
    ? (error as { message: string }).message
    : fallback;

  return errorResponse(message, 400);
}
