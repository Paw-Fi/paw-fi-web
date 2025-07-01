import { createFileRoute } from "@tanstack/react-router";
import { MembershipDashboard } from "@/components/membership/MembershipDashboard";

export const Route = createFileRoute("/dashboard/membership/")({
  component: MembershipPage,
});

function MembershipPage() {
  return <MembershipDashboard />;
}
