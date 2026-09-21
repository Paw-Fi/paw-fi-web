export type FirebaseConfigurationStatus =
  | "ready"
  | "missing_configuration"
  | "missing_service_account"
  | "missing_project"
  | "invalid_service_account"
  | "project_mismatch";

export interface FirebaseConfigurationHealth {
  status: FirebaseConfigurationStatus;
  serviceAccountConfigured: boolean;
  projectConfigured: boolean;
  projectMatches: boolean;
}

export type NotificationOutcome =
  | "recorded_sent"
  | "partial"
  | "skipped"
  | "processing"
  | "retrying"
  | "pending";

interface NotificationEventState {
  is_sent?: boolean | null;
  retry_count?: number | null;
  processing_started_at?: string | null;
  delivery_error?: string | null;
  error_message?: string | null;
}

interface NotificationHealthStatusInput {
  databaseReady: boolean;
  firebaseReady: boolean;
  fallbackReadyCount: number;
  staleClaimCount: number;
  recentFailureCount: number;
}

export function getFirebaseConfigurationHealth(
  serviceAccountJson?: string | null,
  projectId?: string | null,
): FirebaseConfigurationHealth {
  const serviceAccountConfigured = Boolean(serviceAccountJson?.trim());
  const projectConfigured = Boolean(projectId?.trim());

  if (!serviceAccountConfigured && !projectConfigured) {
    return configurationResult(
      "missing_configuration",
      serviceAccountConfigured,
      projectConfigured,
      false,
    );
  }
  if (!serviceAccountConfigured) {
    return configurationResult(
      "missing_service_account",
      false,
      projectConfigured,
      false,
    );
  }
  if (!projectConfigured) {
    return configurationResult("missing_project", true, false, false);
  }

  try {
    const parsed = JSON.parse(serviceAccountJson!) as Record<string, unknown>;
    const serviceAccountProject = readNonEmptyString(parsed.project_id);
    const hasRequiredFields = Boolean(
      serviceAccountProject &&
        readNonEmptyString(parsed.client_email) &&
        readNonEmptyString(parsed.private_key),
    );

    if (!hasRequiredFields) {
      return configurationResult("invalid_service_account", true, true, false);
    }

    const projectMatches = serviceAccountProject === projectId!.trim();
    return configurationResult(
      projectMatches ? "ready" : "project_mismatch",
      true,
      true,
      projectMatches,
    );
  } catch {
    return configurationResult("invalid_service_account", true, true, false);
  }
}

export function classifyNotificationOutcome(
  event: NotificationEventState,
): NotificationOutcome {
  const error = `${event.delivery_error ?? ""} ${event.error_message ?? ""}`;

  if (event.is_sent) {
    if (
      /no active devices|push not applicable|disabled notifications|expired before delivery|already resolved|no target users/i
        .test(
          error,
        )
    ) {
      return "skipped";
    }
    if (/sent to \d+\/\d+ devices|failed to send to \d+ devices/i.test(error)) {
      return "partial";
    }
    return "recorded_sent";
  }

  if (event.processing_started_at) return "processing";
  if ((event.retry_count ?? 0) > 0 || error.trim().length > 0) {
    return "retrying";
  }
  return "pending";
}

export function getNotificationHealthStatus({
  databaseReady,
  firebaseReady,
  fallbackReadyCount,
  staleClaimCount,
  recentFailureCount,
}: NotificationHealthStatusInput): "healthy" | "degraded" | "unhealthy" {
  if (!databaseReady || !firebaseReady) return "unhealthy";
  if (fallbackReadyCount > 0 || staleClaimCount > 0 || recentFailureCount > 0) {
    return "degraded";
  }
  return "healthy";
}

function configurationResult(
  status: FirebaseConfigurationStatus,
  serviceAccountConfigured: boolean,
  projectConfigured: boolean,
  projectMatches: boolean,
): FirebaseConfigurationHealth {
  return {
    status,
    serviceAccountConfigured,
    projectConfigured,
    projectMatches,
  };
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
