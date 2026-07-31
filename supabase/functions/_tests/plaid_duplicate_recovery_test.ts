import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { resolveManageablePlaidDuplicateConnectionIds } from "../shared/plaid-duplicate-recovery.ts";

function supabaseForRecovery(params: {
  connections: Array<{
    id: string;
    user_id: string;
    household_id: string | null;
  }>;
  role?: string | null;
}) {
  return {
    from(table: string) {
      if (table === "bank_connections") {
        return {
          select() {
            return this;
          },
          in() {
            return this;
          },
          eq() {
            return this;
          },
          is() {
            return this;
          },
          or() {
            return Promise.resolve({ data: params.connections, error: null });
          },
        };
      }
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({
            data: params.role ? { role: params.role } : null,
            error: null,
          });
        },
      };
    },
  };
}

Deno.test(
  "Plaid duplicate recovery exposes only owned personal connections",
  async () => {
    const result = await resolveManageablePlaidDuplicateConnectionIds({
      supabase: supabaseForRecovery({
        connections: [
          { id: "personal-1", user_id: "user-1", household_id: null },
          { id: "personal-2", user_id: "user-2", household_id: null },
        ],
      }),
      connectionIds: ["personal-1", "personal-2"],
      userId: "user-1",
      targetHouseholdId: null,
    });

    assertEquals(result, {
      canManageScope: true,
      connectionIds: ["personal-1"],
    });
  },
);

Deno.test(
  "Plaid duplicate recovery rechecks household admin scope",
  async () => {
    const result = await resolveManageablePlaidDuplicateConnectionIds({
      supabase: supabaseForRecovery({
        connections: [
          { id: "household-1", user_id: "user-2", household_id: "space-1" },
          { id: "other-space", user_id: "user-3", household_id: "space-2" },
        ],
        role: "admin",
      }),
      connectionIds: ["household-1", "other-space"],
      userId: "user-1",
      targetHouseholdId: "space-1",
    });

    assertEquals(result, {
      canManageScope: true,
      connectionIds: ["household-1"],
    });
  },
);

Deno.test(
  "Plaid duplicate recovery hides IDs after role downgrade",
  async () => {
    const result = await resolveManageablePlaidDuplicateConnectionIds({
      supabase: supabaseForRecovery({
        connections: [
          { id: "household-1", user_id: "user-2", household_id: "space-1" },
        ],
        role: "member",
      }),
      connectionIds: ["household-1"],
      userId: "user-1",
      targetHouseholdId: "space-1",
    });

    assertEquals(result, { canManageScope: false, connectionIds: [] });
  },
);
