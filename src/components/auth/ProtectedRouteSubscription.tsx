import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { Navigate } from "@tanstack/react-router";
import { SkeletonDashboard } from "../profile/SkeletonDashboard";

interface ProtectedRouteSubscriptionProps {
  children: React.ReactNode;
}

export function ProtectedRouteSubscription({ children }: ProtectedRouteSubscriptionProps) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <SkeletonDashboard />;
  }
  
  if (!user) {
    return <Navigate to="/onboarding" search={{ q: "" }} />;
  }
  
  return <>{children}</>;
}
