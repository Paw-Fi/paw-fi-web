import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type HouseholdSubscriptionLifecycleClient,
  reconcileHouseholdSubscriptionLifecycle,
} from "../shared/household-subscription-lifecycle.ts";

function clientReturning(
  result: { data: unknown; error: { message: string } | null },
) {
  const calls: Array<{
    functionName: string;
    params: Record<string, unknown>;
  }> = [];
  const client: HouseholdSubscriptionLifecycleClient = {
    rpc(functionName, params) {
      calls.push({ functionName, params });
      return Promise.resolve(result);
    },
  };
  return { client, calls };
}

Deno.test("active owner lifecycle refreshes existing household grants", async () => {
  const { client, calls } = clientReturning({ data: 2, error: null });

  const affectedCount = await reconcileHouseholdSubscriptionLifecycle({
    supabase: client,
    ownerUserId: "owner-a",
    plan: "plus",
    status: "active",
  });

  assertEquals(affectedCount, 2);
  assertEquals(calls, [{
    functionName: "cascade_subscription_upgrade",
    params: {
      p_owner_user_id: "owner-a",
      p_new_plan: "plus",
      p_new_status: "active",
    },
  }]);
});

Deno.test("terminal owner lifecycle removes borrowed household access", async () => {
  for (const status of ["canceled", "unpaid", "incomplete_expired"]) {
    const { client, calls } = clientReturning({ data: 1, error: null });

    await reconcileHouseholdSubscriptionLifecycle({
      supabase: client,
      ownerUserId: "owner-a",
      plan: "plus",
      status,
    });

    assertEquals(calls, [{
      functionName: "cascade_subscription_cancellation",
      params: { p_owner_user_id: "owner-a" },
    }]);
  }
});

Deno.test("household lifecycle reconciliation fails closed on RPC errors", async () => {
  const { client } = clientReturning({
    data: null,
    error: { message: "database unavailable" },
  });

  await assertRejects(
    () =>
      reconcileHouseholdSubscriptionLifecycle({
        supabase: client,
        ownerUserId: "owner-a",
        plan: "plus",
        status: "active",
      }),
    Error,
    "database unavailable",
  );
});
