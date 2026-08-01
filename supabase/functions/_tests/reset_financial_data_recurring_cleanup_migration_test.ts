import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const migration = (
  await Deno.readTextFile(
    new URL(
      "../../migrations/20260801130000_fix_reset_financial_data_recurring_cleanup.sql",
      import.meta.url,
    ),
  )
).toLowerCase();

Deno.test("financial reset targets owned expenses and personal wallets", () => {
  assertStringIncludes(migration, "v_deletable_expense_ids uuid[]");
  assertStringIncludes(migration, "expense.user_id = current_user_id");
  assertStringIncludes(migration, "account.household_id is null");
});

Deno.test(
  "financial reset deletes recurring dependencies before expenses",
  () => {
    const occurrenceDeleteIndex = migration.indexOf(
      "delete from public.recurring_occurrences occurrence",
    );
    const childExpenseDeleteIndex = migration.indexOf(
      "and expense.parent_recurring_id is not null",
    );
    const sharedOccurrenceResetIndex = migration.indexOf(
      "update public.recurring_occurrences occurrence",
    );
    const preservedActualDetachIndex = migration.indexOf(
      "update public.expenses preserved_actual",
    );
    const remainingExpenseDeleteIndex = migration.indexOf(
      "and expense.parent_recurring_id is null",
    );

    assert(occurrenceDeleteIndex >= 0, "reset must delete occurrence ledgers");
    assert(
      sharedOccurrenceResetIndex > occurrenceDeleteIndex,
      "shared occurrence ledgers must be detached instead of deleted",
    );
    assert(
      preservedActualDetachIndex > sharedOccurrenceResetIndex,
      "other users' actual transactions must be detached from removed templates",
    );
    assert(
      childExpenseDeleteIndex > preservedActualDetachIndex,
      "materialized recurring expenses must be deleted after occurrence ledgers",
    );
    assert(
      remainingExpenseDeleteIndex > childExpenseDeleteIndex,
      "recurring parents must be deleted after materialized children",
    );
    assertStringIncludes(
      migration,
      "occurrence.recurring_id = any(v_deletable_expense_ids)",
    );
    assertStringIncludes(migration, "actual_transaction_id = null");
    assertStringIncludes(
      migration,
      "where occurrence.actual_transaction_id = any(v_deletable_expense_ids)",
    );
    assertStringIncludes(
      migration,
      "preserved_actual.id <> all(v_deletable_expense_ids)",
    );
  },
);
