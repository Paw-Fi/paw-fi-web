/**
 * Authentication utilities for Edge Functions
 *
 * Provides secure user authentication by validating JWT tokens
 * NEVER trust userId from request body - always derive from JWT
 */

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Internal service authentication secret (for processor -> sync endpoint calls)
const INTERNAL_SERVICE_SECRET = Deno.env.get("INTERNAL_SERVICE_SECRET");
// Used by twilio-whatsapp-ai-bot and other internal callers.
const SECRET_API_KEY = Deno.env.get("SECRET_API_KEY");

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  statusCode?: number;
  isInternalService?: boolean;
}

/**
 * Authenticate user from JWT token in Authorization header
 *
 * @param req - The incoming request
 * @param supabase - Supabase client with service role key
 * @returns AuthResult with userId if successful
 */
export async function authenticateUser(
  req: Request,
  supabase: SupabaseClient,
): Promise<AuthResult> {
  // Get Authorization header
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Missing or invalid Authorization header",
      statusCode: 401,
    };
  }

  // Extract JWT token
  const token = authHeader.replace("Bearer ", "");

  try {
    // Verify JWT and get user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Authentication failed:", error?.message);
      return {
        success: false,
        error: "Invalid or expired authentication token",
        statusCode: 401,
      };
    }

    // Return authenticated user ID
    return {
      success: true,
      userId: user.id,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      success: false,
      error: "Authentication failed",
      statusCode: 401,
    };
  }
}

/**
 * Authenticate internal service calls (processor -> sync endpoints)
 *
 * Uses X-Internal-Service-Secret header for authentication.
 * Returns the user_id from the request body for the connection being processed.
 *
 * @param req - The incoming request
 * @param supabase - Supabase client with service role key
 * @returns AuthResult with isInternalService flag if successful
 */
export async function authenticateInternalService(
  req: Request,
): Promise<AuthResult> {
  if (!INTERNAL_SERVICE_SECRET) {
    console.error("INTERNAL_SERVICE_SECRET not configured");
    return {
      success: false,
      error: "Internal service authentication not configured",
      statusCode: 500,
    };
  }

  const internalSecret = req.headers.get("X-Internal-Service-Secret");

  if (!internalSecret) {
    return {
      success: false,
      error: "Missing internal service authentication",
      statusCode: 401,
    };
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(internalSecret, INTERNAL_SERVICE_SECRET)) {
    console.warn("Invalid internal service secret attempt");
    return {
      success: false,
      error: "Invalid internal service authentication",
      statusCode: 401,
    };
  }

  return {
    success: true,
    isInternalService: true,
  };
}

/**
 * Authenticate internal calls coming from other Edge Functions.
 *
 * Accepts either:
 * - X-Internal-Service-Secret (preferred, reused by other internal jobs)
 * - X-Moneko-Internal-Key (legacy/alternate, used by WhatsApp bot)
 */
export async function authenticateInternalSecret(
  req: Request,
): Promise<AuthResult> {
  const acceptedSecrets = [INTERNAL_SERVICE_SECRET, SECRET_API_KEY]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());

  if (acceptedSecrets.length === 0) {
    console.error(
      "No internal auth secret configured (INTERNAL_SERVICE_SECRET/SECRET_API_KEY)",
    );
    return {
      success: false,
      error: "Internal authentication not configured",
      statusCode: 500,
    };
  }

  const provided =
    req.headers.get("X-Internal-Service-Secret") ||
    req.headers.get("X-Moneko-Internal-Key");
  if (!provided) {
    return {
      success: false,
      error: "Missing internal authentication",
      statusCode: 401,
    };
  }

  const ok = acceptedSecrets.some((secret) =>
    constantTimeCompare(provided, secret),
  );
  if (!ok) {
    console.warn("Invalid internal secret attempt");
    return {
      success: false,
      error: "Invalid internal authentication",
      statusCode: 401,
    };
  }

  return {
    success: true,
    isInternalService: true,
  };
}

/**
 * Authenticate either internal secret or user JWT.
 *
 * Useful when verify_jwt is disabled for server-to-server calls but we still
 * want to allow normal user JWT callers.
 */
export async function authenticateUserOrInternalSecret(
  req: Request,
  supabase: SupabaseClient,
): Promise<AuthResult> {
  const internal = await authenticateInternalSecret(req);
  if (internal.success && internal.isInternalService) return internal;
  return authenticateUser(req, supabase);
}

/**
 * Authenticate either user JWT or internal service
 *
 * First tries internal service auth, then falls back to user JWT.
 * For internal service calls, connectionId must be provided to look up the user.
 *
 * @param req - The incoming request
 * @param supabase - Supabase client with service role key
 * @param connectionId - Optional connection ID for internal service auth
 * @returns AuthResult with userId if successful
 */
export async function authenticateUserOrInternal(
  req: Request,
  supabase: SupabaseClient,
  connectionId?: string,
): Promise<AuthResult> {
  // First, try internal service auth
  const internalAuth = await authenticateInternalService(req);
  if (internalAuth.success && internalAuth.isInternalService) {
    // For internal calls, we need to look up the user from the connection
    if (!connectionId) {
      return {
        success: false,
        error: "connectionId required for internal service calls",
        statusCode: 400,
      };
    }

    // Look up the user from the connection
    const { data: connection, error: connectionError } = await supabase
      .from("bank_connections")
      .select("user_id")
      .eq("id", connectionId)
      .maybeSingle();

    if (connectionError || !connection) {
      console.error(
        "Failed to look up connection for internal auth:",
        connectionError,
      );
      return {
        success: false,
        error: "Connection not found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      userId: connection.user_id,
      isInternalService: true,
    };
  }

  // Fall back to user JWT auth
  return authenticateUser(req, supabase);
}

/**
 * Verify that authenticated user matches the requested userId
 * Prevents privilege escalation attacks
 *
 * @param authenticatedUserId - User ID from JWT
 * @param requestedUserId - User ID from request body
 * @returns boolean indicating if user IDs match
 */
export function verifyUserMatch(
  authenticatedUserId: string,
  requestedUserId: string,
): boolean {
  if (authenticatedUserId !== requestedUserId) {
    console.warn("User ID mismatch detected", {
      authenticated: authenticatedUserId,
      requested: requestedUserId,
    });
    return false;
  }
  return true;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
