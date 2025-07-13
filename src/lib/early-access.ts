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

export async function claimEarlyAccessSpot(claim: EarlyAccessClaim): Promise<EarlyAccessResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('early-access', {
      method: 'POST',
      body: claim
    });
    
    if (error) {
      console.error('Error claiming spot:', error);
      return {
        success: false,
        error: 'Failed to claim spot. Please try again.'
      };
    }
    
    return data as EarlyAccessResponse;
  } catch (error) {
    console.error('Error calling early-access function:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}