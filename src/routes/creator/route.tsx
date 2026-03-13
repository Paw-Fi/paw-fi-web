import { Outlet, createFileRoute } from "@tanstack/react-router";

import { CreatorAccessBoundary } from "@/components/creator/creator-access-boundary";

export const Route = createFileRoute("/creator" as never)({
  component: CreatorRouteGuard,
});

function CreatorRouteGuard() {
  return (
    <CreatorAccessBoundary>
      <Outlet />
    </CreatorAccessBoundary>
  );
}
