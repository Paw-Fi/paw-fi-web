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
      try {
        const { data: rows, error } = await supabase
          .rpc('get_creator_users_by_timezone');

        if (error) return;

        const result: UsersByTimezone[] = (rows || []).map((row) => ({
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
