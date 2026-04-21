import { supabase } from "@/lib/supabase";

export interface EarlyAccessClaim {
  email: string;
  firstName?: string;
  lastName?: string;
  referralSource?: string;
  experienceLevel?: string;
  financialGoals?: string[];
  interestedFeatures?: string[];
  interests?: string[]; // Legacy field for backward compatibility
  userId?: string; // User ID for authenticated users
}

export interface EarlyAccessResponse {
  success: boolean;
  message?: string;
  error?: string;
  remainingSpots?: number;
}

export async function getRemainingSpots(): Promise<number> {
  try {
    const { data, error } = await supabase.functions.invoke("early-access", {
      method: "GET",
    });

    if (error) {
      console.error("Error fetching remaining spots:", error);
      return 0;
    }

    return data?.remainingSpots || 0;
  } catch (error) {
    console.error("Error calling early-access function:", error);
    return 0;
  }
}

export async function claimEarlyAccessSpot(
  claim: EarlyAccessClaim,
): Promise<EarlyAccessResponse> {
  try {
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 7000); // 7 second timeout
    });

    const invokePromise = supabase.functions.invoke("early-access", {
      body: claim,
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error) {
      console.error("Error claiming spot:", error);
      return {
        success: false,
        error: "Failed to claim spot. Please try again.",
      };
    }

    return data as EarlyAccessResponse;
  } catch (error) {
    console.error("Error calling early-access function:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return {
      success: false,
      error: errorMessage.includes("timeout")
        ? "Request timed out. Please check your connection and try again."
        : "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * CRITICAL FIX: Query database directly instead of using Edge Function
 * This eliminates network hops, cold starts, and timeout issues
 *
 * Check if the currently authenticated user has already claimed early access
 * Returns false if user hasn't claimed or if there's any error
 */
export async function checkUserHasClaimed(): Promise<boolean> {
  try {
    // Get current authenticated user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return false;
    }

    // Query database directly for this user's claim
    const { data, error, count } = await supabase
      .from("early_access_claims")
      .select("id", { count: "exact", head: false })
      .eq("user_id", session.user.id)
      .limit(1);

    if (error) {
      console.error("❌ Error checking claim status:", error);
      return false;
    }

    // Return true if we found at least one claim
    const hasClaimed =
      (data && data.length > 0) || (count !== null && count > 0);
    return hasClaimed;
  } catch (error) {
    console.error("❌ Unexpected error checking claim status:", error);
    return false;
  }
}
