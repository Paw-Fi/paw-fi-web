/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  resolveStripeSubscriptionUserCandidate,
} from "../shared/stripe-subscription-user.ts";

Deno.test(
  "stripe subscription user: falls back to valid subscription metadata user_id when customer mapping is missing",
  () => {
    const result = resolveStripeSubscriptionUserCandidate({
      mappedUserId: null,
      metadata: {
        user_id: "ad093caf-7efe-412d-b2ae-2504888e3a9e",
      },
    });

    assertEquals(result.userId, "ad093caf-7efe-412d-b2ae-2504888e3a9e");
    assertEquals(result.source, "subscription_metadata");
    assertEquals(result.hasConflict, false);
  },
);

Deno.test(
  "stripe subscription user: keeps existing customer mapping when metadata disagrees",
  () => {
    const result = resolveStripeSubscriptionUserCandidate({
      mappedUserId: "f72f051c-63e4-42dc-8e92-1e14213ad1a2",
      metadata: {
        user_id: "ad093caf-7efe-412d-b2ae-2504888e3a9e",
      },
    });

    assertEquals(result.userId, "f72f051c-63e4-42dc-8e92-1e14213ad1a2");
    assertEquals(result.source, "customer_mapping");
    assertEquals(result.metadataUserId, "ad093caf-7efe-412d-b2ae-2504888e3a9e");
    assertEquals(result.hasConflict, true);
  },
);

Deno.test(
  "stripe subscription user: rejects invalid metadata user_id when no mapping exists",
  () => {
    const result = resolveStripeSubscriptionUserCandidate({
      mappedUserId: null,
      metadata: {
        user_id: "not-a-user-id",
      },
    });

    assertEquals(result.userId, null);
    assertEquals(result.source, null);
    assertEquals(result.metadataUserId, null);
    assertEquals(result.hasConflict, false);
  },
);
