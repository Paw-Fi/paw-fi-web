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
    const invokePromise = supabase.functions.invoke('early-access', {
      method: 'GET'
    });
    
    // Add 10 second timeout to prevent hanging
    const result = await withTimeout(invokePromise, 10000);
    const { data, error } = result as { data?: { remainingSpots?: number }, error?: any };
    
    if (error) {
      console.error('Error fetching remaining spots:', error);
      return 0;
    }
    
    return data?.remainingSpots || 0;
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('Get remaining spots timed out');
    } else {
      console.error('Error calling early-access function:', error);
    }
    return 0;
  }
}

export async function claimEarlyAccessSpot(claim: EarlyAccessClaim): Promise<EarlyAccessResponse> {
  try {
    const invokePromise = supabase.functions.invoke('early-access', {
      method: 'POST',
      body: claim
    });
    
    // Add 15 second timeout for claim submission (slightly longer for POST)
    const result = await withTimeout(invokePromise, 15000);
    const { data, error } = result as { data?: EarlyAccessResponse, error?: any };
    
    if (error) {
      console.error('Error claiming spot:', error);
      return {
        success: false,
        error: 'Failed to claim spot. Please try again.'
      };
    }
    
    return data as EarlyAccessResponse;
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('Claim submission timed out');
      return {
        success: false,
        error: 'Request timed out. Please try again.'
      };
    }
    console.error('Error calling early-access function:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Add timeout wrapper to prevent infinite loading
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
}

export async function checkUserHasClaimed(): Promise<boolean> {
  try {
    const invokePromise = supabase.functions.invoke('check-user-claim', {
      method: 'GET'
    });
    
    // Add 10 second timeout to prevent hanging
    const result = await withTimeout(invokePromise, 10000);
    const { data, error } = result as { data?: { hasClaimed?: boolean }, error?: any };
    
    if (error) {
      console.error('Error checking claim status:', error);
      return false;
    }
    
    return data?.hasClaimed === true;
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('Check claim status timed out');
    } else {
      console.error('Error checking claim status:', error);
    }
    return false;
  }
}