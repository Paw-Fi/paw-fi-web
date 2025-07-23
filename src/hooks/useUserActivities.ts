import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Action } from "@/utils/reward-actions-clone";
interface UserActivity {
  id: string;
  user_id: string;
  activity: Activity;
  created_at: string;
}

interface Activity {
  action: Action;
  lesson_id: string;
  lesson_title: string;
  xp: number;
}

export function useUserActivities(userId: string | undefined) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          `user-activities?user_id=${userId}`,
          {
            method: "GET",
          },
        );
        if (error) throw error;
        setActivities(data?.activities || []);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch activities",
        );
        console.error("Error fetching activities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`user-activities-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_activities",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: UserActivity }) => {
          console.log("New activity:", payload.new);
          setActivities((prev) => [payload.new, ...prev]);
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { activities, loading, error };
}
