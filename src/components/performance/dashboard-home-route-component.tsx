"use client";

import React from "react";
import { PremiumAccessGate } from "@/features/premium-dashboard/components/premium-access-gate";
import { PremiumDashboardHome } from "@/features/premium-dashboard/components/premium-dashboard-home";
import { PremiumUpgradePreview } from "@/features/premium-dashboard/components/premium-upgrade-preview";

export function DashboardHomeRouteComponent() {
  return (
    <PremiumAccessGate fallback={<PremiumUpgradePreview />}>
      <PremiumDashboardHome />
    </PremiumAccessGate>
  );
}

export default DashboardHomeRouteComponent;
