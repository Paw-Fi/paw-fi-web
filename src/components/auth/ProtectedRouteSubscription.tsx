import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { Navigate } from "@tanstack/react-router";
import { SkeletonDashboard } from "../profile/SkeletonDashboard";

interface ProtectedRouteSubscriptionProps {
  children: React.ReactNode;
}

export function ProtectedRouteSubscription({ children }: ProtectedRouteSubscriptionProps) {
  const { user,isLoading } = useAuth();
  return<>
  {
    isLoading?
    <SkeletonDashboard/>
    :
    
    !user?
    <Navigate to="/onboarding" search={{ q: "" }} />
    :children
  }
  </>

}
