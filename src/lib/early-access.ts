import { supabase } from '@/lib/supabase';

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
    const { data, error } = await supabase.functions.invoke('early-access', {
      method: 'GET'
    });
    
    if (error) {
      console.error('Error fetching remaining spots:', error);
      return 0;
    }
    
    return data?.remainingSpots || 0;
  } catch (error) {
    console.error('Error calling early-access function:', error);
    return 0;
  }
}

/**
 * CRITICAL FIX: Add timeout wrapper to prevent infinite loading during SPA navigation
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    })
  ]);
}

export async function claimEarlyAccessSpot(claim: EarlyAccessClaim): Promise<EarlyAccessResponse> {
  try {
    console.log('🚀 Starting early access claim with timeout protection...');
    
    // CRITICAL FIX: Wrap the Supabase function call with timeout
    // This prevents infinite loading during SPA navigation issues
    const { data, error } = await withTimeout(
      supabase.functions.invoke('early-access', {
        method: 'POST',
        body: claim
      }),
      6000, // 6 second timeout
      'Early access claim timed out after 6 seconds. Please refresh the page and try again.'
    );
    
    if (error) {
      console.error('❌ Error claiming spot:', error);
      return {
        success: false,
        error: 'Failed to claim spot. Please try again.'
      };
    }
    
    console.log('✅ Early access claim successful:', data);
    return data as EarlyAccessResponse;
  } catch (error: any) {
    console.error('❌ Error calling early-access function:', error);
    
    // Provide specific error message for timeout
    if (error.message?.includes('timed out')) {
      return {
        success: false,
        error: 'Request timed out. This might be due to navigation issues. Try refreshing the page and submitting again.'
      };
    }
    
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
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
    console.log('🔎 checkUserHasClaimed: Starting check...');
    
    // Get current authenticated user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.log('❌ No authenticated user, returning false');
      return false;
    }
    
    console.log('👤 Checking claims for user:', session.user.id);
    
    // Query database directly for this user's claim
    const { data, error, count } = await supabase
      .from('early_access_claims')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', session.user.id)
      .limit(1);
    
    console.log('📊 Query result:', { 
      data, 
      error, 
      count,
      dataLength: data?.length,
      hasData: !!(data && data.length > 0),
      hasCount: !!(count !== null && count > 0)
    });
    
    if (error) {
      console.error('❌ Error checking claim status:', error);
      return false;
    }
    
    // Return true if we found at least one claim
    const hasClaimed = (data && data.length > 0) || (count !== null && count > 0);
    console.log('✅ Final result - User has claimed:', hasClaimed);
    return hasClaimed;
  } catch (error) {
    console.error('❌ Unexpected error checking claim status:', error);
    return false;
  }
}