import { createFileRoute } from "@tanstack/react-router";
import { PremiumExportManager } from "@/features/premium-dashboard/components/export-manager/premium-export-manager";
import { PremiumAccessGate } from "@/features/premium-dashboard/components/premium-access-gate";
import { PremiumUpgradePreview } from "@/features/premium-dashboard/components/premium-upgrade-preview";

export const Route = createFileRoute("/dashboard/export/")({
  component: DashboardExportRoute,
});

function DashboardExportRoute() {
  return (
    <PremiumAccessGate fallback={<PremiumUpgradePreview />}>
      <PremiumExportManager />
    </PremiumAccessGate>
  );
}
