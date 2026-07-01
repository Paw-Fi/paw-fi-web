"use client";

import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/solutions/$categorySlug")({
  component: SolutionCategoryLayoutRoute,
});

function SolutionCategoryLayoutRoute() {
  return <Outlet />;
}
