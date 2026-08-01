import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const migration = (
  await Deno.readTextFile(
    new URL(
      "../../migrations/20260801180000_finalize_financial_data_reset.sql",
      import.meta.url,
    ),
  )
).toLowerCase();
const edgeFunction = await Deno.readTextFile(
  new URL("../reset-financial-storage-cleanup/index.ts", import.meta.url),
);

Deno.test(
  "reset queues Storage API cleanup instead of deleting storage tables",
  () => {
    assertStringIncludes(migration, "financial_storage_cleanup_jobs");
    assertStringIncludes(migration, "reset-financial-storage-cleanup");
    assertStringIncludes(migration, "storage_cleanup_queued");
    if (migration.includes("delete from storage.objects")) {
      throw new Error("reset must not delete from Storage tables directly");
    }
  },
);

Deno.test("storage cleanup removes only user-owned reset prefixes", () => {
  assertStringIncludes(edgeFunction, 'bucket: "expense-receipts"');
  assertStringIncludes(edgeFunction, "`receipts/${userId}`");
  assertStringIncludes(edgeFunction, 'bucket: "public"');
  assertStringIncludes(edgeFunction, "`${userId}/wallet-logos`");
  assertStringIncludes(edgeFunction, "`${userId}/pocket-logos`");
  assertStringIncludes(edgeFunction, ".remove(paths);");
  assertStringIncludes(edgeFunction, "while (true)");
});

Deno.test("storage cleanup requires internal authentication", () => {
  assertStringIncludes(edgeFunction, "authenticateInternalSecret(req)");
  assertStringIncludes(migration, "claim_financial_storage_cleanup_job");
});

Deno.test("final reset removes the obsolete core function name", () => {
  assertStringIncludes(
    migration,
    "rename to perform_user_financial_data_reset",
  );
  assertStringIncludes(migration, "public.perform_user_financial_data_reset()");
});
