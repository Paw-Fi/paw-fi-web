import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const coreMigration = (
  await Deno.readTextFile(
    new URL(
      "../../migrations/20260801130000_fix_reset_financial_data_recurring_cleanup.sql",
      import.meta.url,
    ),
  )
).toLowerCase();
const followUpMigration = (
  await Deno.readTextFile(
    new URL(
      "../../migrations/20260801140000_complete_main_pages_financial_reset.sql",
      import.meta.url,
    ),
  )
).toLowerCase();
const migration = `${coreMigration}\n${followUpMigration}`;

Deno.test("financial reset covers every main-page persistence root", () => {
  for (
    const table of [
      "notification_events",
      "recurring_occurrences",
      "expenses",
      "user_category_preferences",
      "notification_capture_ai_attempts",
      "notification_capture_classifications",
      "wallet_capture_events",
      "daily_budgets",
      "budgets",
      "account_transfers",
      "idempotency_keys",
      "accounts",
    ]
  ) {
    assertStringIncludes(migration, `delete from public.${table}`);
  }

  assertStringIncludes(migration, "expense.user_id = current_user_id");
  assertStringIncludes(migration, "budget.user_id = current_user_id");
  assertStringIncludes(migration, "account.household_id is null");
  assertStringIncludes(migration, "add column if not exists user_id uuid");
  assertStringIncludes(
    migration,
    "add column if not exists financial_data_reset_at timestamptz",
  );
  assertStringIncludes(
    migration,
    "set financial_data_reset_at = clock_timestamp()",
  );
  assertStringIncludes(migration, "'code', 'reset_failed'");
});

Deno.test(
  "financial reset removes dependent bank and Plaid synchronization data",
  () => {
    for (
      const table of [
        "plaid_link_update_sessions",
        "bank_transaction_raw",
        "bank_webhook_events",
        "plaid_sync_events",
        "bank_sync_audit",
        "bank_sync_locks",
        "bank_sync_jobs",
        "bank_accounts",
        "bank_connection_tokens",
      ]
    ) {
      assertStringIncludes(migration, `delete from public.${table}`);
    }

    assertStringIncludes(migration, "bc.household_id is null");
    assertStringIncludes(migration, "status = 'disabled'");
    assertStringIncludes(migration, "item_status = 'removed'");
    assertStringIncludes(migration, "access_token_encrypted = null");
  },
);

Deno.test(
  "financial reset removes user-owned main-page storage objects",
  () => {
    assertStringIncludes(migration, "delete from storage.objects");
    assertStringIncludes(migration, "bucket_id = 'expense-receipts'");
    assertStringIncludes(
      migration,
      "name like 'receipts/' || current_user_id::text || '/%'",
    );
    assertStringIncludes(migration, "bucket_id = 'public'");
    assertStringIncludes(
      migration,
      "name like current_user_id::text || '/wallet-logos/%'",
    );
    assertStringIncludes(
      migration,
      "name like current_user_id::text || '/pocket-logos/%'",
    );
  },
);

Deno.test("financial reset clears payload-only transaction references", () => {
  assertStringIncludes(
    followUpMigration,
    "v_result := public.reset_user_financial_data_core_v3()",
  );
  assertStringIncludes(
    followUpMigration,
    "event.payload ->> 'expense_id' = any(v_deletable_expense_id_texts)",
  );
});

Deno.test(
  "financial reset remains idempotent and restores the deletion guard",
  () => {
    assertStringIncludes(migration, "current_user_id := auth.uid()");
    assertStringIncludes(migration, "v_existing_deleting_user_ids");
    assertStringIncludes(
      migration,
      "perform set_config(\n    'moneko.deleting_user_ids',\n    coalesce(v_existing_deleting_user_ids, ''),",
    );
    assertStringIncludes(migration, "exception\n  when others then");
  },
);
