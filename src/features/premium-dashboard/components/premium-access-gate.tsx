import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/hooks/use-subscription";
import { hasPremiumDashboardAccess } from "../lib/premium-access";

interface PremiumAccessGateProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export function PremiumAccessGate({ children, fallback }: PremiumAccessGateProps) {
  const { user } = useAuth();
  const { subscription, isLoading } = useSubscription(user?.id);

  if (isLoading) {
    // Optionally return a dashboard skeleton here
    return (
      <div className="flex flex-col gap-6 p-8 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const hasAccess = hasPremiumDashboardAccess(subscription);

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
