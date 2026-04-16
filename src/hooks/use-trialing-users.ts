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
      const { data: rows, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          user_id,
          plan,
          provider,
          trial_start,
          trial_end,
          users:user_id (email, full_name)
        `)
        .eq("status", "trialing")
        .order("trial_end", { ascending: true });

      if (!error && rows) {
        const formatted = rows.map((row) => ({
          id: row.id,
          userId: row.user_id,
          plan: row.plan,
          provider: row.provider,
          trialStart: row.trial_start,
          trialEnd: row.trial_end,
          email: row.users?.email,
          fullName: row.users?.full_name,
        }));
        setUsers(formatted);
      }
    };

    fetchData();
  }, [refreshKey]);

  return users;
}
