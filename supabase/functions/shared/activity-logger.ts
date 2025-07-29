// Reusable activity logging helper for all backend functions
// This helper provides consistent activity logging across all functions

/**
 * Shared activity type definition that matches the database structure
 * This represents the JSONB activity field in the user_activities table
 */
export interface ActivityData {
  type: string;
  action: string;
  source: string;
  metadata?: {
    goalId?: string;
    milestoneId?: string;
    amountChange?: number;
    newProgressPercentage?: number;
    goalTitle?: string;
    lesson_id?: string;
    lesson_title?: string;
    xp?: number;
    isOnTrack?: boolean;
    [key: string]: any; // Allow additional metadata
  };
  timestamp?: string;
}

/**
 * Raw activity record as stored in the database
 */
export interface ActivityRecord {
  id: string;
  user_id: string;
  created_at: string;
  activity: ActivityData;
};

/**
 * Shared database helper functions for activity operations
 */

/**
 * Fetch user activities from the database
 * @param supabaseClient - Supabase client instance
 * @param userId - User ID to fetch activities for
 */
export async function fetchUserActivitiesFromDB(
  supabaseClient: any,
  userId: string
): Promise<{ success: boolean; activities?: ActivityRecord[]; error?: any }> {
  try {
    const { data: activities, error } = await supabaseClient
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[fetchUserActivitiesFromDB] Error fetching activities:', error);
      return { success: false, error };
    }

    return { success: true, activities: activities || [] };
  } catch (error) {
    console.error('[fetchUserActivitiesFromDB] Failed to fetch activities:', error);
    return { success: false, error };
  }
}

/**
 * Insert a user activity into the database
 * @param supabaseClient - Supabase client instance
 * @param userId - User ID
 * @param activityData - Activity data to insert
 */
export async function insertUserActivityToDB(
  supabaseClient: any,
  userId: string,
  activityData: ActivityData
): Promise<{ success: boolean; activity_id?: string; error?: any }> {
  try {
    console.log('[insertUserActivityToDB] Inserting activity:', activityData);

    const { data, error } = await supabaseClient
      .from('user_activities')
      .insert({
        user_id: userId,
        activity: activityData
      })
      .select()
      .single();

    if (error) {
      console.error('[insertUserActivityToDB] Error inserting activity:', error);
      return { success: false, error };
    }

    return { success: true, activity_id: data?.id };
  } catch (error) {
    console.error('[insertUserActivityToDB] Failed to insert activity:', error);
    return { success: false, error };
  }
}

/**
 * Log user activity using the centralized user-activities function
 * @param supabaseClient - Supabase client instance
 * @param userId - User ID
 * @param activityData - Activity data to log
 */
export async function logUserActivity(
  supabaseClient: any,
  userId: string,
  activityData: ActivityData
): Promise<{ success: boolean; error?: any; activity_id?: string }> {
  try {
    // Ensure timestamp is set
    const activity: ActivityData = {
      ...activityData,
      timestamp: activityData.timestamp || new Date().toISOString(),
    };

    console.log(`[${activity.source}] Logging user activity:`, { userId, type: activity.type, action: activity.action });

    const { data, error } = await supabaseClient.functions.invoke('user-activities', {
      body: {
        user_id: userId,
        activity: activity,
      },
    });

    if (error) {
      console.error(`[${activity.source}] Error logging user activity:`, error);
      return { success: false, error };
    }

    console.log(`[${activity.source}] Activity logged successfully: ${activity.type} - ${activity.action}`);
    return { success: true, activity_id: data?.activity_id };
  } catch (error) {
    console.error(`[${activityData.source}] Failed to log user activity:`, error);
    return { success: false, error };
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
