import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface TrialingUser {
  id: string;
  userId: string;
  plan: string;
  trialStart: string | null;
  trialEnd: string | null;
  email?: string;
  fullName?: string;
  provider?: string;
}

export function useTrialingUsers(refreshKey = 0): TrialingUser[] {
  const [users, setUsers] = useState<TrialingUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: rows, error } = await supabase
          .rpc('get_creator_trialing_users');

        if (error) return;

        const formatted = (rows || []).map((row) => ({
          id: row.subscription_id,
          userId: row.user_id,
          plan: row.plan,
          provider: row.provider,
          trialStart: row.trial_start,
          trialEnd: row.trial_end,
          email: row.email,
          fullName: row.full_name,
        }));

        setUsers(formatted);
      } catch {
        // Silent error handling
      }
    };

    fetchData();
  }, [refreshKey]);

  return users;
}
