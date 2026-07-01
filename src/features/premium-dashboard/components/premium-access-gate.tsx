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
    return (
      <div className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-neutral-950 dark:bg-[#050505] dark:text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-36 rounded-full bg-neutral-200 dark:bg-white/10" />
            <div className="h-12 w-full max-w-2xl rounded-lg bg-neutral-200 dark:bg-white/10" />
            <div className="h-5 w-full max-w-lg rounded-lg bg-neutral-200/80 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-36 rounded-lg border border-neutral-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
              />
            ))}
          </div>
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
