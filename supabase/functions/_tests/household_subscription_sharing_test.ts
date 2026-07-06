/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  hasReachedHouseholdSubscriptionGrantLimit,
  HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT,
} from "../shared/household-subscription-sharing.ts";

Deno.test(
  "household subscription sharing allows up to five distinct granted users",
  () => {
    assertEquals(HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT, 5);
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(4), false);
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(5), true);
  },
);

Deno.test(
  "household subscription sharing allows already-bound users at the limit",
  () => {
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(5, true), false);
    assertEquals(hasReachedHouseholdSubscriptionGrantLimit(6, true), false);
  },
);
