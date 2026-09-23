import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export const creatorNotificationHealthQueryKey = [
  "creator-notification-delivery-health",
] as const;

const firebaseConfigurationStatuses = [
  "ready",
  "missing_configuration",
  "missing_service_account",
  "missing_project",
  "invalid_service_account",
  "project_mismatch",
] as const;

export function useCreatorNotificationHealth() {
  return useQuery({
    queryKey: creatorNotificationHealthQueryKey,
    queryFn: fetchCreatorNotificationHealth,
    staleTime: 30_000,
    retry: false,
  });
}

async function fetchCreatorNotificationHealth(): Promise<NotificationHealth> {
  const { data, error } = await supabase.functions.invoke(
    "creator-notification-delivery-health",
    { body: {} },
  );

  if (error || !isNotificationHealth(data)) {
    throw new Error("Notification delivery health is unavailable");
  }
  return data;
}

function isNotificationHealth(value: unknown): value is NotificationHealth {
  const candidate = asRecord(value);
  if (!candidate) return false;
  const scope = asRecord(candidate.scope);
  const checks = asRecord(candidate.checks);
  const database = asRecord(checks?.database);
  const firebase = asRecord(checks?.firebase);
  const queue = asRecord(candidate.queue);

  return (
    candidate.success === true &&
    typeof candidate.generatedAt === "string" &&
    ["healthy", "degraded", "unhealthy"].includes(String(candidate.status)) &&
    isNumber(scope?.recentWindowHours) &&
    isNumber(scope?.recentSampleLimit) &&
    isNumber(scope?.sampledEvents) &&
    ["ready", "unavailable"].includes(String(database?.status)) &&
    firebaseConfigurationStatuses.includes(
      firebase?.status as FirebaseConfigurationStatus,
    ) &&
    typeof firebase.serviceAccountConfigured === "boolean" &&
    typeof firebase.projectConfigured === "boolean" &&
    typeof firebase.projectMatches === "boolean" &&
    isNullableNumber(queue?.unsent) &&
    isNullableNumber(queue?.fallbackReady) &&
    isNullableNumber(queue?.staleClaims) &&
    isNullableNumber(queue?.oldestPendingAgeMinutes) &&
    isOutcomeCounts(candidate.outcomes) &&
    isDevices(candidate.devices) &&
    Array.isArray(candidate.eventTypes) &&
    candidate.eventTypes.every(isEventTypeCount) &&
    Array.isArray(candidate.limitations) &&
    candidate.limitations.every((item) => typeof item === "string")
  );
}

function isOutcomeCounts(value: unknown) {
  if (value === null) return true;
  const outcome = asRecord(value);
  return (
    outcome !== null &&
    [
      "recorded_sent",
      "partial",
      "skipped",
      "processing",
      "retrying",
      "pending",
    ].every((key) => isNumber(outcome[key]))
  );
}

function isDevices(value: unknown) {
  if (value === null) return true;
  const devices = asRecord(value);
  const byPlatform = asRecord(devices?.byPlatform);
  return (
    devices !== null &&
    isNumber(devices.total) &&
    isNumber(devices.active) &&
    isNumber(devices.inactive) &&
    ["ios", "android", "web"].every((platform) => {
      const counts = asRecord(byPlatform?.[platform]);
      return (
        counts !== null &&
        isNumber(counts.total) &&
        isNumber(counts.active) &&
        isNumber(counts.inactive)
      );
    })
  );
}

function isEventTypeCount(value: unknown) {
  const row = asRecord(value);
  return (
    row !== null && typeof row.eventType === "string" && isNumber(row.count)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown) {
  return value === null || isNumber(value);
}

export interface NotificationHealth {
  success: true;
  generatedAt: string;
  status: "healthy" | "degraded" | "unhealthy";
  scope: {
    recentWindowHours: number;
    recentSampleLimit: number;
    sampledEvents: number;
  };
  checks: {
    database: { status: "ready" | "unavailable" };
    firebase: {
      status: FirebaseConfigurationStatus;
      serviceAccountConfigured: boolean;
      projectConfigured: boolean;
      projectMatches: boolean;
    };
  };
  queue: {
    unsent: number | null;
    fallbackReady: number | null;
    staleClaims: number | null;
    oldestPendingAgeMinutes: number | null;
  };
  outcomes: NotificationOutcomeCounts | null;
  devices: {
    total: number;
    active: number;
    inactive: number;
    byPlatform: Record<"ios" | "android" | "web", DeviceCounts>;
  } | null;
  eventTypes: Array<{ eventType: string; count: number }>;
  limitations: string[];
}

type FirebaseConfigurationStatus =
  (typeof firebaseConfigurationStatuses)[number];

export interface NotificationOutcomeCounts {
  recorded_sent: number;
  partial: number;
  skipped: number;
  processing: number;
  retrying: number;
  pending: number;
}

interface DeviceCounts {
  total: number;
  active: number;
  inactive: number;
}
