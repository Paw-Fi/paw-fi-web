import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const migration = (
  await Deno.readTextFile(
    new URL(
      "../../migrations/20260731150000_plaid_connection_management_recovery.sql",
      import.meta.url,
    ),
  )
).toLowerCase();

Deno.test(
  "Plaid recovery migration safely changes the list RPC return shape",
  () => {
    assertStringIncludes(
      migration,
      "drop function if exists public.list_mobile_bank_connections()",
    );
    assertStringIncludes(
      migration,
      "create function public.list_mobile_bank_connections()",
    );
  },
);

Deno.test("Plaid recovery RPC keeps NULL item statuses manageable", () => {
  assertStringIncludes(
    migration,
    "coalesce(vc.item_status, '') not in ('removed', 'pending_removal')",
  );
  assertStringIncludes(migration, "vc.provider = 'plaid'");
});

Deno.test("Plaid recovery migration exposes wallet-independent actions", () => {
  for (
    const field of [
      "linked_bank_account_count bigint",
      "linked_wallet_count bigint",
      "can_reconnect boolean",
      "can_disconnect boolean",
      "can_review_accounts boolean",
      "role_guidance text",
      "latest_error_code text",
      "review_completed_at timestamptz",
    ]
  ) {
    assertStringIncludes(migration, field);
  }
});

Deno.test(
  "Plaid recovery RPC requires current household membership and role",
  () => {
    assertStringIncludes(
      migration,
      "(bc.household_id is null and bc.user_id = auth.uid())",
    );
    assertStringIncludes(
      migration,
      "(bc.household_id is not null and hm.user_id is not null)",
    );
    assertStringIncludes(migration, "vc.caller_role in ('owner', 'admin')");
  },
);

Deno.test("Plaid recovery migration aligns database duplicate guards", () => {
  assertStringIncludes(
    migration,
    "create or replace function public.prevent_duplicate_plaid_persistent_account_v1()",
  );
  assertStringIncludes(
    migration,
    "coalesce(connection.item_status, '') not in ('removed', 'pending_removal')",
  );
  assertStringIncludes(
    migration,
    "create unique index idx_bank_connections_scope_duplicate_group_key",
  );
  assertStringIncludes(
    migration,
    "coalesce(item_status, '') not in ('removed', 'pending_removal')",
  );
  assertStringIncludes(
    migration,
    "create trigger enforce_plaid_connection_limit_v1",
  );
  assertStringIncludes(
    migration,
    "create or replace function public.queue_plaid_connection_removal_v2(",
  );
  assertStringIncludes(
    migration,
    "create or replace function public.reactivate_plaid_connection_v1(",
  );
});

Deno.test(
  "Plaid recovery migration authorizes update actors separately from owners",
  () => {
    assertStringIncludes(
      migration,
      "create or replace function public.complete_plaid_update_mode_v2(",
    );
    assertStringIncludes(migration, "p_actor_user_id uuid");
    assertStringIncludes(migration, "actor_user_id uuid");
    assertStringIncludes(migration, "v_connection_owner_user_id");
    assertStringIncludes(
      migration,
      "session.target_household_id is not distinct from p_household_id",
    );
  },
);
