import { supabase } from "@/lib/supabase";
import { logUserActivity as logUserActivityClone, fetchUserActivitiesFromDB as fetchUserActivitiesFromDBClone } from "../../supabase/functions/shared/activity-logger";

export const logUserActivity = (userId: string, activityData: any) => logUserActivityClone(supabase, userId, activityData)
export const fetchUserActivitiesFromDB = (userId: string) => fetchUserActivitiesFromDBClone(supabase, userId)