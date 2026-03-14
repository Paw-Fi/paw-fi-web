import { useEffect, useRef } from "react";

import { useRouterState } from "@tanstack/react-router";
import ReactGA from "react-ga4";

interface GoogleTagManagerProps {
  gtmId: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleTagManager({ gtmId }: GoogleTagManagerProps) {
  const initializedRef = useRef(false);
  const location = useRouterState({
    select: (state) => state.location,
  });

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    ReactGA.initialize(gtmId);
    initializedRef.current = true;
  }, [gtmId]);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    const page = `${location.pathname}${location.searchStr || ""}`;
    const title = document.title;

    ReactGA.send({
      hitType: "pageview",
      page,
      title,
    });

    window.gtag?.("config", gtmId, {
      page_path: page,
      page_title: title,
      page_location: window.location.href,
    });
  }, [gtmId, location.pathname, location.searchStr]);

  return null;
}
