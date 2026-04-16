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
      try {
        const { data: rows, error } = await supabase
          .rpc('get_creator_dau_by_timezone');

        if (error) return;

        const result: DAUByTimezone[] = (rows || []).map((row) => ({
          timezone: row.timezone,
          activeUsers: Number(row.active_users),
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
