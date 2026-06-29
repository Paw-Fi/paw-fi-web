/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  canGrantPaywallReturnTrial,
  hasRecentPaywallReturnExit,
} from "../shared/paywall-return-trial-eligibility.ts";

Deno.test(
  "paywall return trial eligibility: allows grant when no subscription row exists",
  () => {
    assertEquals(canGrantPaywallReturnTrial(null), true);
  },
);

Deno.test(
  "paywall return trial eligibility: blocks every existing subscription row",
  () => {
    const existingRows = [
      { status: null, plan: null, current_period_end: null },
      { status: "canceled", plan: "plus", current_period_end: null },
      { status: "inactive", plan: "plus", current_period_end: null },
      { status: "past_due", plan: "plus", current_period_end: null },
      { status: "unpaid", plan: "plus", current_period_end: null },
      {
        status: "active",
        plan: "plus",
        current_period_end: "2024-01-01T00:00:00.000Z",
      },
      {
        status: "trialing",
        plan: "plus",
        current_period_end: "2024-01-01T00:00:00.000Z",
      },
      { status: "active", plan: "lifetime", current_period_end: null },
    ];

    for (const row of existingRows) {
      assertEquals(canGrantPaywallReturnTrial(row), false);
    }
  },
);

Deno.test(
  "paywall return trial eligibility: requires a recent paywall exit marker",
  () => {
    const now = new Date("2026-06-01T12:00:00.000Z");

    assertEquals(
      hasRecentPaywallReturnExit("2026-06-01T11:55:00.000Z", now, 10),
      true,
    );
    assertEquals(hasRecentPaywallReturnExit(null, now, 10), false);
    assertEquals(hasRecentPaywallReturnExit("not-a-date", now, 10), false);
    assertEquals(
      hasRecentPaywallReturnExit("2026-06-01T12:01:00.000Z", now, 10),
      false,
    );
    assertEquals(
      hasRecentPaywallReturnExit("2026-06-01T11:49:00.000Z", now, 10),
      false,
    );
  },
);
