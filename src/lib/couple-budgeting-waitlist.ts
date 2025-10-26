import { supabase } from '@/lib/supabase';

export interface CoupleBudgetingClaim {
  email: string;
  firstName?: string;
  lastName?: string;
  referralSource?: string;
  budgetingMethod?: string;
  mobileAppPriorities?: string[];
  interestedMobileFeatures?: string[];
  devicePreference?: string;
  userId?: string;
}

export interface CoupleBudgetingResponse {
  success: boolean;
  message?: string;
  error?: string;
  waitlistCount?: number;
}

export interface CoupleBudgetingCheckResponse {
  success: boolean;
  hasClaimed: boolean;
  waitlistCount?: number;
  error?: string;
}

/**
 * Check if the current user has joined the couple budgeting waitlist
 */
export async function checkUserCoupleBudgetingClaim(): Promise<boolean> {
  try {
    console.log('🔎 checkUserCoupleBudgetingClaim: Starting check...');

    // Get current authenticated user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      console.log('❌ No authenticated user, returning false');
      return false;
    }

    console.log('👤 Checking couple budgeting claims for user:', session.user.id);

    // Query database directly for this user's couple budgeting claim
    const { data, error } = await supabase
      .from('couple_budgeting_waitlist')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', session.user.id)
      .limit(1);

    console.log('📊 Query result:', {
      data,
      error,
      dataLength: data?.length,
      hasData: !!(data && data.length > 0)
    });

    if (error) {
      console.error('❌ Error checking couple budgeting claim status:', error);
      return false;
    }

    // Return true if we found at least one claim
    const hasClaimed = !!(data && data.length > 0);
    console.log('✅ Final result - User has couple budgeting claim:', hasClaimed);
    return hasClaimed;
  } catch (error) {
    console.error('❌ Unexpected error checking couple budgeting claim status:', error);
    return false;
  }
}

/**
 * Get the current waitlist count for couple budgeting
 */
export async function getCoupleBudgetingWaitlistCount(): Promise<number> {
  try {
    const { data, error } = await supabase.functions.invoke('couple-budgeting-waitlist', {
      method: 'GET'
    });

    if (error) {
      console.error('Error fetching couple budgeting waitlist count:', error);
      return 0;
    }

    return data?.waitlistCount || 0;
  } catch (error) {
    console.error('Error calling couple-budgeting-waitlist function:', error);
    return 0;
  }
}

/**
 * Join the couple budgeting waitlist
 */
export async function joinCoupleBudgetingWaitlist(claim: CoupleBudgetingClaim): Promise<CoupleBudgetingResponse> {
  try {
    console.log('🚀 Joining couple budgeting waitlist for:', claim.email);

    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 7000); // 7 second timeout
    });

    const invokePromise = supabase.functions.invoke('couple-budgeting-waitlist', {
      body: claim
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    console.log('📡 Function response:', { data, error });

    if (error) {
      console.error('Error joining waitlist:', error);
      return {
        success: false,
        error: 'Failed to join waitlist. Please try again.'
      };
    }

    return data as CoupleBudgetingResponse;
  } catch (error) {
    console.error('Error calling couple-budgeting-waitlist function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: errorMessage.includes('timeout')
        ? 'Request timed out. Please check your connection and try again.'
        : 'An unexpected error occurred. Please try again.'
    };
  }
}
