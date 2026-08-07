/// <reference lib="deno.ns" />
import {
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isSystemGrantedTrial } from "../shared/system-granted-trial.ts";

const automaticTrial = {
  provider: "stripe",
  plan: "plus",
  status: "trialing",
  stripe_subscription_id: null,
  stripe_customer_id: null,
  store_product_id: null,
  bound_to_user_id: null,
  bound_to_household_id: null,
};

Deno.test("system-granted trial accepts the exact identifier-free Plus trial", () => {
  assertEquals(isSystemGrantedTrial(automaticTrial), true);
});

Deno.test("system-granted trial preserves a genuine Stripe subscription", () => {
  assertFalse(
    isSystemGrantedTrial(
      {
        ...automaticTrial,
        stripe_subscription_id: "sub_paid",
        stripe_customer_id: "cus_paid",
      },
    ),
  );
});

Deno.test("system-granted trial preserves household-bound access", () => {
  assertFalse(
    isSystemGrantedTrial(
      {
        ...automaticTrial,
        bound_to_user_id: "00000000-0000-0000-0000-000000000001",
      },
    ),
  );
});

Deno.test("system-granted trial rejects other providers plans and statuses", () => {
  assertFalse(
    isSystemGrantedTrial({ ...automaticTrial, provider: "app_store" }),
  );
  assertFalse(isSystemGrantedTrial({ ...automaticTrial, plan: "lifetime" }));
  assertFalse(isSystemGrantedTrial({ ...automaticTrial, status: "active" }));
});
