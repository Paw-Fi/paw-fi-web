import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Navigate } from "@tanstack/react-router";
import { SkeletonDashboard } from "../profile/SkeletonDashboard";

interface ProtectedRouteSubscriptionProps {
  children: React.ReactNode;
}

export function ProtectedRouteSubscription({ children }: ProtectedRouteSubscriptionProps) {
  const { user, isLoading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Failsafe: If loading takes more than 7 seconds, show error or proceed
  useEffect(() => {
    if (isLoading) {
      console.log('🛡️ ProtectedRoute: Auth is loading...');
      const timeout = setTimeout(() => {
        console.error('⚠️ ProtectedRoute: Auth loading timed out after 7 seconds');
        setLoadingTimeout(true);
      }, 7000);
      
      return () => clearTimeout(timeout);
    } else {
      console.log('🛡️ ProtectedRoute: Auth loaded', { hasUser: !!user });
      setLoadingTimeout(false);
    }
  }, [isLoading, user]);
  
  // If loading timed out, show error message instead of infinite loading
  if (loadingTimeout && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground">Connection Timeout</h2>
          <p className="text-muted-foreground">
            Unable to verify your authentication status. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
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
    console.log('🛡️ ProtectedRoute: No user found, redirecting to onboarding');
    return <Navigate to="/onboarding" search={{ q: "" }} />;
  }
  
  console.log('🛡️ ProtectedRoute: User authenticated, rendering protected content');
  return <>{children}</>;
}
