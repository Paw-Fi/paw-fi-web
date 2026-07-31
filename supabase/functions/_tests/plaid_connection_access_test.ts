import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { resolvePlaidConnectionAccess } from "../shared/plaid-connection-access.ts";

function supabaseWithHouseholdRole(
  role: string | null,
  error: Error | null = null,
) {
  return {
    from(table: string) {
      assertEquals(table, "household_members");
      return {
        select(columns: string) {
          assertEquals(columns, "role");
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({
            data: role == null ? null : { role },
            error,
          });
        },
      };
    },
  };
}

Deno.test(
  "Plaid connection access allows a personal owner to manage",
  async () => {
    const decision = await resolvePlaidConnectionAccess({
      supabase: supabaseWithHouseholdRole(null),
      connection: { user_id: "user-1", household_id: null },
      userId: "user-1",
    });

    assertEquals(decision, {
      exists: true,
      canView: true,
      canManage: true,
      roleGuidance: null,
    });
  },
);

Deno.test(
  "Plaid connection access hides unrelated personal connections",
  async () => {
    const decision = await resolvePlaidConnectionAccess({
      supabase: supabaseWithHouseholdRole(null),
      connection: { user_id: "user-2", household_id: null },
      userId: "user-1",
    });

    assertEquals(decision, {
      exists: true,
      canView: false,
      canManage: false,
      roleGuidance: null,
    });
  },
);

Deno.test(
  "Plaid connection access allows household owners and admins",
  async () => {
    for (const role of ["owner", "admin"]) {
      const decision = await resolvePlaidConnectionAccess({
        supabase: supabaseWithHouseholdRole(role),
        connection: { user_id: "user-2", household_id: "household-1" },
        userId: "user-1",
      });

      assertEquals(decision.canView, true);
      assertEquals(decision.canManage, true);
      assertEquals(decision.roleGuidance, null);
    }
  },
);

Deno.test(
  "Plaid connection access applies household roles to creators",
  async () => {
    const decision = await resolvePlaidConnectionAccess({
      supabase: supabaseWithHouseholdRole("member"),
      connection: { user_id: "user-1", household_id: "household-1" },
      userId: "user-1",
    });

    assertEquals(decision.canView, true);
    assertEquals(decision.canManage, false);
  },
);

Deno.test(
  "Plaid connection access hides former household creators",
  async () => {
    const decision = await resolvePlaidConnectionAccess({
      supabase: supabaseWithHouseholdRole(null),
      connection: { user_id: "user-1", household_id: "household-1" },
      userId: "user-1",
    });

    assertEquals(decision.canView, false);
    assertEquals(decision.canManage, false);
  },
);

Deno.test(
  "Plaid connection access lets household members view only",
  async () => {
    const decision = await resolvePlaidConnectionAccess({
      supabase: supabaseWithHouseholdRole("member"),
      connection: { user_id: "user-2", household_id: "household-1" },
      userId: "user-1",
    });

    assertEquals(decision.exists, true);
    assertEquals(decision.canView, true);
    assertEquals(decision.canManage, false);
    assertEquals(
      decision.roleGuidance,
      "A household owner or admin must manage this bank connection.",
    );
  },
);

Deno.test(
  "Plaid connection access treats a missing connection as not found",
  async () => {
    const decision = await resolvePlaidConnectionAccess({
      supabase: supabaseWithHouseholdRole(null),
      connection: null,
      userId: "user-1",
    });

    assertEquals(decision, {
      exists: false,
      canView: false,
      canManage: false,
      roleGuidance: null,
    });
  },
);

Deno.test(
  "Plaid connection access propagates membership lookup errors",
  async () => {
    await assertRejects(
      () =>
        resolvePlaidConnectionAccess({
          supabase: supabaseWithHouseholdRole(null, new Error("db down")),
          connection: { user_id: "user-2", household_id: "household-1" },
          userId: "user-1",
        }),
      Error,
      "db down",
    );
  },
);
