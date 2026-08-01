import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const migration = (
  await Deno.readTextFile(
    new URL(
      "../../migrations/20260801130000_perform_user_financial_data_reset.sql",
      import.meta.url,
    ),
  )
).toLowerCase();

Deno.test("financial reset defines the private reset implementation", () => {
  assertStringIncludes(
    migration,
    "create or replace function public.perform_user_financial_data_reset()",
  );
  assertStringIncludes(migration, "current_user_id := auth.uid()");
  assertStringIncludes(migration, "bc.household_id is null");
  assertStringIncludes(
    migration,
    "join public.bank_connections account_connection",
  );
});

Deno.test(
  "financial reset queues Plaid removal before sanitizing connections",
  () => {
    const queueIndex = migration.indexOf(
      "insert into public.plaid_offboarding_jobs",
    );
    const sanitizeIndex = migration.indexOf(
      "update public.bank_connections bc",
    );

    assert(queueIndex >= 0, "reset must queue Plaid item removal");
    assert(
      sanitizeIndex > queueIndex,
      "Plaid tokens must be queued before sanitizing",
    );
    assertStringIncludes(migration, "'reset_financial_data'");
    assertStringIncludes(
      migration,
      "/functions/v1/plaid-user-offboarding-cleanup",
    );
    assertStringIncludes(
      migration,
      "left join public.bank_connection_tokens bct",
    );
    assertStringIncludes(migration, "bct.token_type = 'access'");
    assertStringIncludes(migration, "bct.token_encrypted");
  },
);

Deno.test("financial reset creates valid terminal Plaid connections", () => {
  assertStringIncludes(migration, "status = 'disabled'");
  assertStringIncludes(migration, "item_status = 'removed'");
  assertStringIncludes(migration, "removed_at = now()");
  assertStringIncludes(migration, "access_token_encrypted = null");
  assertStringIncludes(migration, "plaid_access_token_encrypted = null");
  assertStringIncludes(
    migration,
    "delete from public.bank_connection_tokens bct",
  );
});

Deno.test(
  "financial reset repairs an existing tokenless offboarding job",
  () => {
    assertStringIncludes(migration, "on conflict (connection_id, reason)");
    assertStringIncludes(
      migration,
      "access_token_encrypted = coalesce(\n      existing.access_token_encrypted,\n      excluded.access_token_encrypted",
    );
    assertStringIncludes(
      migration,
      "plaid_access_token_encrypted = coalesce(\n      existing.plaid_access_token_encrypted,\n      excluded.plaid_access_token_encrypted",
    );
  },
);

Deno.test("financial reset cleans orphaned Plaid bank data", () => {
  assertStringIncludes(
    migration,
    "if array_length(v_plaid_bank_account_ids, 1) is not null then",
  );
  assertStringIncludes(
    migration,
    "delete from public.bank_transaction_raw btr",
  );
  assertStringIncludes(migration, "delete from public.bank_accounts ba");
});
