/// <reference lib="deno.ns" />

import {
  classifyNotificationOutcome,
  getFirebaseConfigurationHealth,
  getNotificationHealthStatus,
} from "../shared/creator-notification-health.ts";

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("Firebase readiness never exposes service-account metadata", () => {
  const result = getFirebaseConfigurationHealth(
    JSON.stringify({
      project_id: "moneko-prod",
      client_email: "firebase-admin@example.test",
      private_key_id: "secret-key-id",
      private_key: "secret-private-key",
    }),
    "moneko-prod",
  );

  assertEquals(result, {
    status: "ready",
    serviceAccountConfigured: true,
    projectConfigured: true,
    projectMatches: true,
  });
  assertEquals("client_email" in result, false);
  assertEquals("private_key" in result, false);
  assertEquals("project_id" in result, false);
});

Deno.test(
  "Firebase readiness detects malformed and mismatched configuration",
  () => {
    assertEquals(
      getFirebaseConfigurationHealth("not-json", "moneko-prod").status,
      "invalid_service_account",
    );
    assertEquals(
      getFirebaseConfigurationHealth(
        JSON.stringify({
          project_id: "other-project",
          client_email: "firebase-admin@example.test",
          private_key: "key",
        }),
        "moneko-prod",
      ).status,
      "project_mismatch",
    );
  },
);

Deno.test(
  "notification outcomes distinguish sent, skipped, partial, and pending",
  () => {
    assertEquals(
      classifyNotificationOutcome({ is_sent: true }),
      "recorded_sent",
    );
    assertEquals(
      classifyNotificationOutcome({
        is_sent: true,
        delivery_error: "No active devices",
      }),
      "skipped",
    );
    assertEquals(
      classifyNotificationOutcome({
        is_sent: true,
        delivery_error: "Sent to 1/2 devices",
      }),
      "partial",
    );
    assertEquals(
      classifyNotificationOutcome({
        is_sent: false,
        processing_started_at: "2026-09-21T10:00:00.000Z",
      }),
      "processing",
    );
    assertEquals(
      classifyNotificationOutcome({
        is_sent: false,
        retry_count: 1,
        delivery_error: "Firebase not configured",
      }),
      "retrying",
    );
    assertEquals(classifyNotificationOutcome({ is_sent: false }), "pending");
  },
);

Deno.test("overall health degrades for readiness and queue failures", () => {
  assertEquals(
    getNotificationHealthStatus({
      databaseReady: true,
      firebaseReady: true,
      fallbackReadyCount: 0,
      staleClaimCount: 0,
      recentFailureCount: 0,
    }),
    "healthy",
  );
  assertEquals(
    getNotificationHealthStatus({
      databaseReady: true,
      firebaseReady: true,
      fallbackReadyCount: 2,
      staleClaimCount: 0,
      recentFailureCount: 0,
    }),
    "degraded",
  );
  assertEquals(
    getNotificationHealthStatus({
      databaseReady: false,
      firebaseReady: true,
      fallbackReadyCount: 0,
      staleClaimCount: 0,
      recentFailureCount: 0,
    }),
    "unhealthy",
  );
});

Deno.test(
  "creator health endpoint is authorized, read-only, and sanitized",
  async () => {
    const endpoint = await Deno.readTextFile(
      new URL(
        "../creator-notification-delivery-health/index.ts",
        import.meta.url,
      ),
    );
    const route = await Deno.readTextFile(
      new URL(
        "../../../src/routes/creator/notification-health.tsx",
        import.meta.url,
      ),
    );

    assertEquals(endpoint.includes("authenticateUser(req, supabase)"), true);
    assertEquals(endpoint.includes('.select("is_creator")'), true);
    assertEquals(endpoint.includes("creatorCheck.data?.is_creator"), true);
    assertEquals(endpoint.includes('select("push_token'), false);
    assertEquals(endpoint.includes('select("payload'), false);
    assertEquals(endpoint.includes("messages:send"), false);
    assertEquals(endpoint.includes("sendFCMv1Notification"), false);
    assertEquals(endpoint.includes(".insert("), false);
    assertEquals(endpoint.includes(".update("), false);
    assertEquals(
      endpoint.includes('.from("notification_events").delete('),
      false,
    );
    assertEquals(
      route.includes('createFileRoute("/creator/notification-health")'),
      true,
    );
  },
);

Deno.test(
  "authenticated users cannot grant themselves creator access",
  async () => {
    const migration = await Deno.readTextFile(
      new URL(
        "../../migrations/20260921130000_protect_creator_privilege.sql",
        import.meta.url,
      ),
    );
    const normalizedMigration = migration.toLowerCase();

    assertEquals(normalizedMigration.includes("old.is_creator"), true);
    assertEquals(normalizedMigration.includes("new.is_creator"), true);
    assertEquals(normalizedMigration.includes("auth.uid() is null"), true);
    assertEquals(
      normalizedMigration.includes("auth.role() = 'service_role'"),
      true,
    );
    assertEquals(
      normalizedMigration.includes("before insert or update of is_creator"),
      true,
    );
  },
);
