import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface UsersByTimezone {
  timezone: string;
  userCount: number;
}

export function useUsersByTimezone(refreshKey = 0): UsersByTimezone[] {
  const [data, setData] = useState<UsersByTimezone[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: rows, error } = await supabase
        .from("users")
        .select("preferred_timezone")
        .not("preferred_timezone", "is", null);

      if (!error && rows) {
        // Aggregate by timezone
        const timezoneCounts = new Map<string, number>();
        
        for (const row of rows) {
          const timezone = row.preferred_timezone || "Unknown";
          timezoneCounts.set(timezone, (timezoneCounts.get(timezone) || 0) + 1);
        }

        // Convert to array and sort by count
        const result: UsersByTimezone[] = Array.from(timezoneCounts.entries())
          .map(([timezone, userCount]) => ({
            timezone,
            userCount,
          }))
          .sort((a, b) => b.userCount - a.userCount);

        setData(result);
      }
    };

    fetchData();
  }, [refreshKey]);

  return data;
}
