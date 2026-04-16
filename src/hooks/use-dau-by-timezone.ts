import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface DAUByTimezone {
  timezone: string;
  activeUsers: number;
}

export function useDAUByTimezone(refreshKey = 0): DAUByTimezone[] {
  const [data, setData] = useState<DAUByTimezone[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Get today's date boundaries in UTC
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      // Fetch today's expenses with contact timezone info
      const { data: rows, error } = await supabase
        .from("expenses")
        .select(`
          id,
          created_at,
          contacts:contact_id (preferred_timezone)
        `)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      if (!error && rows) {
        // Aggregate by timezone
        const timezoneCounts = new Map<string, Set<string>>();
        
        for (const row of rows) {
          const timezone = row.contacts?.preferred_timezone || "Unknown";
          if (!timezoneCounts.has(timezone)) {
            timezoneCounts.set(timezone, new Set());
          }
          timezoneCounts.get(timezone)!.add(row.id);
        }

        // Convert to array format
        const result: DAUByTimezone[] = Array.from(timezoneCounts.entries())
          .map(([timezone, userIds]) => ({
            timezone,
            activeUsers: userIds.size,
          }))
          .sort((a, b) => b.activeUsers - a.activeUsers);

        setData(result);
      }
    };

    fetchData();
  }, [refreshKey]);

  return data;
}
