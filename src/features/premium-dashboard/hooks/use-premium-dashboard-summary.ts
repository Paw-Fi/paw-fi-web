import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PremiumDashboardSummary } from "../types";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { hasPremiumDashboardAccess } from "../lib/premium-access";

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
      
      if (error) throw new Error(error.message || "Failed to fetch dashboard summary");
      if (!data?.success) throw new Error(data?.error || "Failed to fetch dashboard summary");
      
      return data.data as PremiumDashboardSummary;
    },
    enabled: Boolean(user?.id && hasPremiumAccess),
    staleTime: 60_000,
  });
}
