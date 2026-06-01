import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { PremiumDashboardSummary } from "../types";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { hasPremiumDashboardAccess } from "../lib/premium-access";

async function getFunctionErrorMessage(
  error: any,
  fallback: string
): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context) {
    try {
      const body = await error.context.json();
      return body.error || body.message || fallback;
    } catch {
      // ignore parse errors, fall through to generic message
    }
  }
  return error?.message || fallback;
}

export function usePremiumDashboardSummary(filters?: Record<string, unknown>) {
  const { user } = useAuth();
  const { subscription } = useSubscription(user?.id);
  const hasPremiumAccess = hasPremiumDashboardAccess(subscription);

  return useQuery<PremiumDashboardSummary>({
    queryKey: ["premium-dashboard-summary", user?.id, filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("premium-dashboard-summary", {
        body: filters ?? {},
      });

      if (error) throw new Error(await getFunctionErrorMessage(error, "Failed to fetch dashboard summary"));
      if (!data?.success) throw new Error(data?.error || data?.message || "Failed to fetch dashboard summary");

      return data.data as PremiumDashboardSummary;
    },
    enabled: Boolean(user?.id && hasPremiumAccess),
    staleTime: 60_000,
  });
}
