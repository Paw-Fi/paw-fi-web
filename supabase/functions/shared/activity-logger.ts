// Reusable activity logging helper for all backend functions
// This helper invokes the centralized user-activities function

/**
 * Log user activity using the centralized user-activities function
 * @param supabaseClient - Supabase client instance
 * @param userId - User ID
 * @param activityType - Type of activity (goal_assessment, portfolio_generation, etc.)
 * @param action - Action performed (completed, generated, etc.)
 * @param metadata - Additional metadata for the activity
 * @param source - Source function name (optional)
 */
export async function logUserActivity(
  supabaseClient: any,
  userId: string,
  activityType: string,
  action: string,
  metadata: any,
  source?: string
): Promise<void> {
  try {
    const activity = {
      type: activityType,
      action: action,
      metadata: metadata,
      timestamp: new Date().toISOString(),
      source: source || 'unknown'
    };

    console.log(`[${source}] Logging user activity:`, { userId, activityType, action });

    const { error } = await supabaseClient.functions.invoke('user-activities', {
      body: {
        user_id: userId,
        activity: activity
      }
    });

    if (error) {
      console.error(`[${source}] Error logging user activity:`, error);
      // Don't throw error - activity logging should not break core functionality
    } else {
      console.log(`[${source}] Activity logged successfully: ${activityType} - ${action}`);
    }
  } catch (error) {
    console.error(`[${source}] Failed to log user activity:`, error);
    // Don't throw error - activity logging should not break core functionality
  }
}

/**
 * Fetch user activities using the centralized user-activities function
 * @param supabaseClient - Supabase client instance
 * @param userId - User ID
 * @returns Promise with user activities data
 */
export async function fetchUserActivities(
  supabaseClient: any,
  userId: string
): Promise<any[]> {
  try {
    const { data, error } = await supabaseClient.functions.invoke('user-activities', {
      method: 'GET',
      body: { user_id: userId }
    });

    if (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }

    return data?.activities || [];
  } catch (error) {
    console.error('Failed to fetch user activities:', error);
    return [];
  }
}
