"use client";

import ReusableHomePage from "@/components/index/reusable-home-page";
import { getCanonicalUrl } from "@/utils/canonical";
import { Route } from "@/routes/passive-income/$slugId";

export function PassiveIncomeRouteComponent() {
  const { slugId } = Route.useParams();
  const variant = Route.useLoaderData() as any;
  const canonicalUrl = getCanonicalUrl(`/passive-income/${slugId}`);

  return <ReusableHomePage variant={variant} canonicalUrl={canonicalUrl} />;
}
