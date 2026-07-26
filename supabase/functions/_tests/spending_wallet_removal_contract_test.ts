import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const migrationsUrl = new URL("../../migrations/", import.meta.url);

async function readMigration(name: string): Promise<string> {
  return await Deno.readTextFile(new URL(name, migrationsUrl));
}

Deno.test(
  "Spending removal disables creation and preserves system deletion protection",
  async () => {
    const migration = await readMigration(
      "20260723130000_remove_automatic_spending_wallets.sql",
    );

    assertStringIncludes(
      migration,
      "drop trigger if exists trigger_create_default_spending_account_for_new_user",
    );
    assertStringIncludes(
      migration,
      "drop trigger if exists trigger_create_default_spending_account_for_new_household",
    );
    assertEquals(migration.includes("insert into public.accounts"), false);
    assertStringIncludes(
      migration,
      "raise exception 'System account cannot be deleted'",
    );
    assertStringIncludes(migration, "new.is_default := false");
    assertStringIncludes(
      migration,
      "if new.account_id is null then\n    return new;",
    );
  },
);

Deno.test(
  "wallet balance migration removes every known null-account fallback",
  async () => {
    const migration = await readMigration(
      "20260723131000_keep_unassigned_transactions_out_of_wallet_balances.sql",
    );

    for (
      const replacement of [
        "fe.account_id as wallet_id",
        "pr.account_id as wallet_id",
        "e.account_id as wallet_id",
        "where pr.account_id is not null",
        "account_id = p_account_id",
      ]
    ) {
      assertStringIncludes(migration, replacement);
    }

    const legacySnapshots = await readMigration(
      "20260526120000_currency_scope_wallet_snapshot_legacy_wallets.sql",
    );
    assertStringIncludes(
      legacySnapshots,
      "coalesce(fe.account_id, (select wallet_id from legacy_wallet)) as wallet_id",
    );
    assertStringIncludes(
      legacySnapshots,
      "coalesce(pr.account_id, (select wallet_id from legacy_wallet)) as wallet_id",
    );

    const legacyV3 = await readMigration(
      "20260713063357_add_wallets_month_snapshot_v3_excluding_transfers_from_totals.sql",
    );
    assertStringIncludes(
      legacyV3,
      "coalesce(e.account_id, (select wallet_id from legacy_wallet)) as wallet_id",
    );

    const androidDedup = await readMigration(
      "20260623124717_android_wallet_capture_currency_dedup_v2.sql",
    );
    assertStringIncludes(androidDedup, "account_id = coalesce(");
  },
);
