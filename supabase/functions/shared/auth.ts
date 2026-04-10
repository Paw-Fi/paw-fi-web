/// <reference lib="deno.ns" />

/**
 * Authentication utilities for Edge Functions
 *
 * Provides secure user authentication by validating JWT tokens
 * NEVER trust userId from request body - always derive from JWT
 */

type SupabaseAuthClient = {
  from: (table: string) => any;
  auth: {
    getUser: (jwt: string) => Promise<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
  };
};

function readEnvSecret(name: string): string {
  return (Deno.env.get(name) || "").trim();
}

function normalizeJwtSecret(value: string): string {
  let normalized = (value || "").trim();
  if (!normalized) return "";

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  // Accept values accidentally saved as "Bearer <token>".
  while (/^bearer\s+/i.test(normalized)) {
    normalized = normalized.replace(/^bearer\s+/i, "").trim();
  }

  return normalized;
}

function isJwtLike(value: string): boolean {
  const token = (value || "").trim();
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  return parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part));
}

function resolveGatewayInvokeJwt(): string {
  const candidates = [
    normalizeJwtSecret(readEnvSecret("SECRET_SUPABASE_SERVICE_ROLE_API_KEY")),
    normalizeJwtSecret(readEnvSecret("SUPABASE_SERVICE_ROLE_KEY")),
    normalizeJwtSecret(readEnvSecret("SUPABASE_ANON_KEY")),
  ];

  for (const candidate of candidates) {
    if (isJwtLike(candidate)) return candidate;
  }

  return "";
}

function getSecretApiKey(): string {
  return readEnvSecret("SECRET_SUPABASE_SERVICE_ROLE_API_KEY");
}

function getInternalServiceSecret(): string {
  return readEnvSecret("INTERNAL_SERVICE_SECRET");
}

export function resolveInternalFunctionKey(): string {
  return getSecretApiKey();
}

export function resolveInternalFunctionKeyWithSource(): {
  key: string;
  source: "SECRET_SUPABASE_SERVICE_ROLE_API_KEY" | "none";
} {
  const secretApiKey = getSecretApiKey();
  if (secretApiKey) {
    return {
      key: secretApiKey,
      source: "SECRET_SUPABASE_SERVICE_ROLE_API_KEY",
    };
  }

  return { key: "", source: "none" };
}

export function buildInternalInvokeHeaders(
  internalKey: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Moneko-Internal-Key": internalKey,
    "X-Internal-Service-Secret": internalKey,
  };
  const functionsJwt = resolveGatewayInvokeJwt();
  if (functionsJwt) {
    headers.Authorization = `Bearer ${functionsJwt}`;
    headers.apikey = functionsJwt;
  }
  return headers;
}

function getAcceptedInternalSecrets(): string[] {
  return Array.from(
    new Set(
      [getSecretApiKey(), getInternalServiceSecret()].filter((value) =>
        value.length > 0
      ),
    ),
  );
}

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
  supabase: SupabaseAuthClient,
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
 * Uses X-Moneko-Internal-Key header for authentication.
 * Returns the user_id from the request body for the connection being processed.
 *
 * @param req - The incoming request
 * @param supabase - Supabase client with service role key
 * @returns AuthResult with isInternalService flag if successful
 */
export async function authenticateInternalService(
  req: Request,
): Promise<AuthResult> {
  const acceptedSecrets = getAcceptedInternalSecrets();
  if (acceptedSecrets.length === 0) {
    console.error(
      "No internal auth secret configured (SECRET_SUPABASE_SERVICE_ROLE_API_KEY or INTERNAL_SERVICE_SECRET)",
    );
    return {
      success: false,
      error: "Internal service authentication not configured",
      statusCode: 500,
    };
  }

  const internalSecret = req.headers.get("X-Moneko-Internal-Key")?.trim() ||
    req.headers.get("X-Internal-Service-Secret")?.trim() ||
    "";

  if (!internalSecret) {
    return {
      success: false,
      error: "Missing internal service authentication",
      statusCode: 401,
    };
  }

  // Constant-time comparison to prevent timing attacks
  const isValid = acceptedSecrets.some((secret) =>
    constantTimeCompare(internalSecret, secret)
  );
  if (!isValid) {
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
 * Accepts X-Moneko-Internal-Key for internal calls.
 */
export async function authenticateInternalSecret(
  req: Request,
): Promise<AuthResult> {
  const acceptedSecrets = getAcceptedInternalSecrets();

  if (acceptedSecrets.length === 0) {
    console.error(
      "No internal auth secret configured (SECRET_SUPABASE_SERVICE_ROLE_API_KEY)",
    );
    return {
      success: false,
      error: "Internal authentication not configured",
      statusCode: 500,
    };
  }

  const provided = req.headers.get("X-Moneko-Internal-Key");
  const normalizedProvided = provided?.trim() || "";
  if (!normalizedProvided) {
    return {
      success: false,
      error: "Missing internal authentication",
      statusCode: 401,
    };
  }

  const ok = acceptedSecrets.some((secret) =>
    constantTimeCompare(normalizedProvided, secret),
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
  supabase: SupabaseAuthClient,
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
  supabase: SupabaseAuthClient,
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
