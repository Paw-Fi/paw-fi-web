import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface CreatorUserDetail {
  userId: string;
  email: string | null;
  fullName: string | null;
  preferredTimezone: string;
  createdAt: string;
}

export interface UsersByTimezonesState {
  users: CreatorUserDetail[];
  isLoading: boolean;
}

export function useUsersByTimezones(
  timezones: string[],
  dailyOnly: boolean,
  isEnabled: boolean,
): UsersByTimezonesState {
  const [state, setState] = useState<UsersByTimezonesState>({
    users: [],
    isLoading: false,
  });

  useEffect(() => {
    if (!isEnabled || timezones.length === 0) {
      setState({ users: [], isLoading: false });
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const { data: rows, error } = await supabase.rpc(
          "get_creator_users_by_timezones",
          {
            p_timezones: timezones,
            p_daily_only: dailyOnly,
          },
        );

        if (!isMounted || error) {
          if (isMounted) {
            setState({ users: [], isLoading: false });
          }
          return;
        }

        const users: CreatorUserDetail[] = (rows || []).map((row) => ({
          userId: row.user_id,
          email: row.email,
          fullName: row.full_name,
          preferredTimezone: row.preferred_timezone,
          createdAt: row.created_at,
        }));

        setState({ users, isLoading: false });
      } catch {
        if (isMounted) {
          setState({ users: [], isLoading: false });
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [timezones, dailyOnly, isEnabled]);

  return state;
}
