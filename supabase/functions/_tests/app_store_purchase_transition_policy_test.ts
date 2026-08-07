import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decideAppStorePurchaseTransition,
} from "../shared/app-store-purchase-transition-policy.ts";

const now = new Date("2026-08-07T12:00:00.000Z");

Deno.test("active App Store recurring access cannot become Lifetime early", () => {
  assertEquals(
    decideAppStorePurchaseTransition(
      {
        provider: "app_store",
        plan: "plus",
        status: "active",
        currentPeriodEnd: "2026-08-08T12:00:00.000Z",
      },
      "lifetime",
      now,
    ),
    {
      kind: "preserve",
      reason: "active_recurring_must_end_before_lifetime",
    },
  );
});

Deno.test("active Lifetime cannot be replaced by a recurring purchase", () => {
  assertEquals(
    decideAppStorePurchaseTransition(
      { provider: "app_store", plan: "lifetime", status: "active" },
      "plus",
      now,
    ),
    {
      kind: "preserve",
      reason: "active_lifetime_includes_recurring_access",
    },
  );
});

Deno.test("expired recurring access may purchase Lifetime", () => {
  assertEquals(
    decideAppStorePurchaseTransition(
      {
        provider: "app_store",
        plan: "plus",
        status: "active",
        currentPeriodEnd: "2026-08-07T11:59:59.000Z",
      },
      "lifetime",
      now,
    ),
    { kind: "apply" },
  );
});

Deno.test("App Store manages Plus plan changes without a Moneko block", () => {
  assertEquals(
    decideAppStorePurchaseTransition(
      {
        provider: "app_store",
        plan: "plus",
        status: "active",
        currentPeriodEnd: "2026-08-08T12:00:00.000Z",
      },
      "plus",
      now,
    ),
    { kind: "apply" },
  );
});
