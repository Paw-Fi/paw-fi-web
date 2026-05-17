import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface DailySignupsByTimezone {
  timezone: string;
  userCount: number;
}

export function useDailySignupsByTimezone(refreshKey = 0): DailySignupsByTimezone[] {
  const [data, setData] = useState<DailySignupsByTimezone[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: rows, error } = await supabase
          .rpc('get_creator_daily_signups_by_timezone');

        if (error) return;

        const result: DailySignupsByTimezone[] = (rows || []).map((row) => ({
          timezone: row.timezone,
          userCount: Number(row.user_count),
        }));

        setData(result);
      } catch {
        // Silent error handling
      }
    };

    fetchData();
  }, [refreshKey]);

  return data;
}
