import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackAttributionPageView } from "@/lib/download-attribution";

export function DownloadAttributionTracker() {
  const location = useRouterState({
    select: (state) => state.location,
  });

  useEffect(() => {
    trackAttributionPageView();
  }, [location.pathname, location.searchStr]);

  return null;
}
