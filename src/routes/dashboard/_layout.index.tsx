import { Navigate, createFileRoute } from "@tanstack/react-router"
export const Route = createFileRoute("/dashboard/_layout/")({
  component: DashboardHome,
});

function DashboardHome() {
  return <Navigate to="/dashboard/portfolio" />
}
  