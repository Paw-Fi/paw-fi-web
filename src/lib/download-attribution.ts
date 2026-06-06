import { supabase } from "@/lib/supabase";

interface AttributionPayload {
  sessionId: string;
  visitorId: string;
  eventType: "page_view" | "download_click";
  platform?: "ios" | "android";
  source: string;
  url: string;
  path: string;
  referrer: string;
  referrerDomain: string;
  queryParams: Record<string, string | string[]>;
  userAgent: string;
  language: string;
  timezone: string;
  viewport: string;
}

interface IdleCallbackDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}

interface TrackAttributionPageViewOptions {
  immediate?: boolean;
}

type WindowWithIdleCallback = Omit<Window, "requestIdleCallback"> & {
  requestIdleCallback?: (
    callback: (deadline: IdleCallbackDeadline) => void,
    options?: { timeout?: number },
  ) => number;
};

const VISITOR_ID_KEY = "moneko-attribution-visitor-id";
const SESSION_ID_KEY = "moneko-attribution-session-id";
const TRACKED_PAGE_VIEWS_KEY = "moneko-attribution-page-views";
const MAX_TRACKED_PAGE_VIEWS = 80;
const memoryIds: Record<string, string> = {};
const pageViewTrackingPromises: Record<string, Promise<void>> = {};

const blockedPathPrefixes = [
  "/dashboard",
  "/creator",
  "/auth",
  "/login",
  "/register",
  "/reset-password",
  "/forgot-password",
  "/checkout",
  "/payment-status",
  "/oauth",
  "/verify-telegram",
  "/verify-whatsapp",
  "/unsubscribe",
  "/invites",
];

const sourceParamKeys = [
  "source",
  "utm_source",
  "ref",
  "referrer",
  "affiliate",
  "aff_id",
  "campaign",
  "utm_campaign",
  "creator",
  "partner",
  "partner_slug",
  "influencer",
];

const ignoredFallbackParamKeys = new Set([
  "gclid",
  "fbclid",
  "ttclid",
  "msclkid",
  "li_fat_id",
  "twclid",
]);

export const shouldTrackAttributionPath = (pathname: string) => {
  return !blockedPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};

export const trackAttributionPageView = (
  options: TrackAttributionPageViewOptions = {},
) => {
  if (typeof window === "undefined") return Promise.resolve();
  if (!shouldTrackAttributionPath(window.location.pathname)) {
    return Promise.resolve();
  }

  const pageViewKey = `${window.location.pathname}${window.location.search}`;
  if (hasTrackedPageView(pageViewKey)) {
    return pageViewTrackingPromises[pageViewKey] ?? Promise.resolve();
  }
  rememberTrackedPageView(pageViewKey);

  const runTracking = () => {
    const promise = trackAttributionEvent("page_view").finally(() => {
      delete pageViewTrackingPromises[pageViewKey];
    });
    pageViewTrackingPromises[pageViewKey] = promise;
    return promise;
  };

  if (options.immediate || shouldTrackPageViewImmediately()) {
    return runTracking();
  }

  scheduleAttributionTracking(() => {
    void runTracking();
  });

  return Promise.resolve();
};

export const trackDownloadClick = (platform: "ios" | "android") => {
  if (typeof window === "undefined") return;

  scheduleAttributionTracking(() => {
    void trackAttributionEvent("download_click", platform);
  });
};

const trackAttributionEvent = async (
  eventType: "page_view" | "download_click",
  platform?: "ios" | "android",
) => {
  try {
    const payload = buildAttributionPayload(eventType, platform);

    await supabase.rpc("track_download_attribution_session", {
      p_session_id: payload.sessionId,
      p_visitor_id: payload.visitorId,
      p_event_type: payload.eventType,
      p_platform: payload.platform ?? null,
      p_source: payload.source,
      p_url: payload.url,
      p_path: payload.path,
      p_referrer: payload.referrer || null,
      p_referrer_domain: payload.referrerDomain || null,
      p_query_params: payload.queryParams,
      p_user_agent: payload.userAgent,
      p_language: payload.language,
      p_timezone: payload.timezone,
      p_viewport: payload.viewport,
    });
  } catch {
    // Attribution must never affect navigation, rendering, or download clicks.
  }
};

const buildAttributionPayload = (
  eventType: "page_view" | "download_click",
  platform?: "ios" | "android",
): AttributionPayload => {
  const queryParams = parseQueryParams(window.location.search);
  const referrerDomain = getReferrerDomain(document.referrer);

  return {
    sessionId: getOrCreateSessionId(),
    visitorId: getOrCreateVisitorId(),
    eventType,
    platform,
    source: deriveSource(queryParams, referrerDomain),
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer,
    referrerDomain,
    queryParams,
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };
};

const parseQueryParams = (
  search: string,
): Record<string, string | string[]> => {
  const params = new URLSearchParams(search);
  const parsed: Record<string, string | string[]> = {};

  params.forEach((value, key) => {
    const existingValue = parsed[key];
    if (Array.isArray(existingValue)) {
      parsed[key] = [...existingValue, value];
      return;
    }
    if (typeof existingValue === "string") {
      parsed[key] = [existingValue, value];
      return;
    }
    parsed[key] = value;
  });

  return parsed;
};

const deriveSource = (
  queryParams: Record<string, string | string[]>,
  referrerDomain: string,
) => {
  for (const key of sourceParamKeys) {
    const value = getFirstQueryParamValue(queryParams[key]);
    if (value) return value;
  }

  const fallbackEntry = Object.entries(queryParams).find(([key, value]) => {
    return (
      !ignoredFallbackParamKeys.has(key.toLowerCase()) &&
      Boolean(getFirstQueryParamValue(value))
    );
  });
  if (fallbackEntry) {
    return `${fallbackEntry[0]}:${getFirstQueryParamValue(fallbackEntry[1])}`;
  }

  return referrerDomain || "direct";
};

const getFirstQueryParamValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value.find(Boolean) ?? "";
  return value ?? "";
};

const shouldTrackPageViewImmediately = () => {
  return (
    new URLSearchParams(window.location.search).get("source") ===
    "compare-with-chatgpt"
  );
};

const getReferrerDomain = (referrer: string) => {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const getOrCreateVisitorId = () =>
  getOrCreateStoredId(localStorage, VISITOR_ID_KEY);

const getOrCreateSessionId = () =>
  getOrCreateStoredId(sessionStorage, SESSION_ID_KEY);

const getOrCreateStoredId = (storage: Storage, key: string) => {
  try {
    const existingValue = storage.getItem(key);
    if (existingValue) return existingValue;

    const value = createId();
    storage.setItem(key, value);
    return value;
  } catch {
    memoryIds[key] = memoryIds[key] ?? createId();
    return memoryIds[key];
  }
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const hasTrackedPageView = (pageViewKey: string) => {
  return getTrackedPageViews().includes(pageViewKey);
};

const rememberTrackedPageView = (pageViewKey: string) => {
  try {
    const trackedPageViews = getTrackedPageViews();
    const nextTrackedPageViews = [...trackedPageViews, pageViewKey].slice(
      -MAX_TRACKED_PAGE_VIEWS,
    );
    sessionStorage.setItem(
      TRACKED_PAGE_VIEWS_KEY,
      JSON.stringify(nextTrackedPageViews),
    );
  } catch {
    // If storage is unavailable, attribution can still run without dedupe.
  }
};

const getTrackedPageViews = () => {
  try {
    const value = sessionStorage.getItem(TRACKED_PAGE_VIEWS_KEY);
    if (!value) return [];
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue)
      ? parsedValue.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const scheduleAttributionTracking = (callback: () => void) => {
  const browserWindow = window as WindowWithIdleCallback;
  if (typeof browserWindow.requestIdleCallback === "function") {
    browserWindow.requestIdleCallback(callback, { timeout: 2000 });
    return;
  }

  window.setTimeout(callback, 250);
};
