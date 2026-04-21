import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface TotalDAUData {
  currentValue: number;
  changePercent: number;
}

export function useTotalDAU(refreshKey = 0): TotalDAUData {
  const [data, setData] = useState<TotalDAUData>({
    currentValue: 0,
    changePercent: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: count, error } = await supabase
          .rpc('get_creator_total_dau');

        if (error) return;

        setData({
          currentValue: Number(count) || 0,
          changePercent: 0, // Would need yesterday's count for comparison
        });
      } catch {
        // Silent error handling
      }
    };

    fetchData();
  }, [refreshKey]);

  return data;
}
