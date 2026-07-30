/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { resolveUserDisplayName } from "./user-display-name.ts";

Deno.test("resolveUserDisplayName prefers a user-set full name", () => {
  assertEquals(
    resolveUserDisplayName("  Alice Example  ", "alice@example.com", "Someone"),
    "Alice Example",
  );
});

Deno.test("resolveUserDisplayName falls back to the email local part", () => {
  assertEquals(
    resolveUserDisplayName(" ", "alice@example.com", "Someone"),
    "alice",
  );
});

Deno.test("resolveUserDisplayName uses the contextual fallback", () => {
  assertEquals(resolveUserDisplayName(null, null, "Someone"), "Someone");
});
