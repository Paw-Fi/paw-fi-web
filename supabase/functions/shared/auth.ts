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

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  statusCode?: number;
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
