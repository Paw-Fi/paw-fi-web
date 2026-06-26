import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Navigate } from "@tanstack/react-router";
import { SkeletonDashboard } from "../profile/SkeletonDashboard";

interface ProtectedRouteSubscriptionProps {
  children: React.ReactNode;
}

export function ProtectedRouteSubscription({
  children,
}: ProtectedRouteSubscriptionProps) {
  const { user, isLoading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Failsafe: If loading takes more than 7 seconds, show error or proceed
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.error(
          "⚠️ ProtectedRoute: Auth loading timed out after 7 seconds",
        );
        setLoadingTimeout(true);
      }, 7000);

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading, user]);

  // If loading timed out, show error message instead of infinite loading
  if (loadingTimeout && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md space-y-4 text-center">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-foreground text-2xl font-bold">
            Connection Timeout
          </h2>
          <p className="text-muted-foreground">
            Unable to verify your authentication status. Please check your
            internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (!user) {
    return <Navigate to="/login" search={{ redirect: undefined }} />;
  }

  return <>{children}</>;
}
