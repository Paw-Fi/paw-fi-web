/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  classifyOwnership,
  PURCHASE_OWNED_BY_ANOTHER_ACCOUNT_CODE,
  purchaseOwnershipConflictMessage,
} from "../shared/iap-ownership.ts";

Deno.test("iap ownership: classifyOwnership returns null when no owner exists", () => {
  assertEquals(
    classifyOwnership({
      existingOwnerUserId: null,
      currentUserId: "user-a",
    }),
    null,
  );
});

Deno.test("iap ownership: classifyOwnership keeps same owner", () => {
  assertEquals(
    classifyOwnership({
      existingOwnerUserId: "user-a",
      currentUserId: "user-a",
    }),
    "owned_by_current_user",
  );
});

Deno.test("iap ownership: classifyOwnership flags account-switch conflict", () => {
  assertEquals(
    classifyOwnership({
      existingOwnerUserId: "user-a",
      currentUserId: "user-b",
    }),
    "owned_by_another_user",
  );
});

Deno.test("iap ownership: conflict message guides user to original account", () => {
  assertEquals(
    PURCHASE_OWNED_BY_ANOTHER_ACCOUNT_CODE,
    "PURCHASE_OWNED_BY_ANOTHER_ACCOUNT",
  );
  assertStringIncludes(
    purchaseOwnershipConflictMessage(),
    "linked to another Moneko account",
  );
  assertStringIncludes(
    purchaseOwnershipConflictMessage(),
    "original account",
  );
});
