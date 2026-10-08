/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  merchantAutoResolutionPatch,
  merchantAutoResolutionValidationError,
} from "../shared/merchant-auto-resolution-policy.ts";

Deno.test("merchant abstention accepts only an optional boolean", () => {
  for (const value of [undefined, false, true]) {
    assertEquals(merchantAutoResolutionValidationError(value), null);
  }
  for (const value of [null, "true", "false", 0, 1, {}, []]) {
    assertEquals(
      merchantAutoResolutionValidationError(value),
      "merchantAutoResolutionBlocked must be a boolean",
    );
    assertThrows(() => merchantAutoResolutionPatch(value));
  }
});

Deno.test(
  "absent and false abstention leave legacy persistence untouched",
  () => {
    assertEquals(merchantAutoResolutionPatch(undefined), {});
    assertEquals(merchantAutoResolutionPatch(false), {});
  },
);

Deno.test(
  "backfill excludes blocked rows before applying its batch limit",
  async () => {
    const sql = await Deno.readTextFile(
      new URL(
        "../../migrations/20261007130000_ai_merchant_auto_resolution_block.sql",
        import.meta.url,
      ),
    );
    assertStringIncludes(
      sql,
      "create or replace function public.enqueue_merchant_resolution_backfill_batch(",
    );
    assertStringIncludes(
      sql,
      "and (expense.user_overrides -> 'merchant_auto_resolution_blocked') is distinct from 'true'::jsonb",
    );
  },
);

Deno.test(
  "abstention clears canonical defaults and merges overrides without changing raw evidence",
  () => {
    const overrides = { category: true, nested: { amount: true } };
    for (const merchant of ["محمد", "山田", "José", "ร้านค้า"]) {
      const row: Record<string, unknown> = {
        merchant,
        merchant_id: "canonical",
        merchant_structured_name: merchant,
        ...merchantAutoResolutionPatch(true, overrides),
      };
      assertEquals(row, {
        merchant,
        merchant_id: null,
        merchant_structured_name: null,
        user_overrides: {
          ...overrides,
          merchant_auto_resolution_blocked: true,
        },
      });
    }
    assertEquals(overrides, { category: true, nested: { amount: true } });
  },
);

Deno.test(
  "every save writer validates and applies abstention after canonical defaults",
  async () => {
    for (
      const endpoint of [
        "save-expense",
        "save-income",
        "save-transactions-batch",
      ]
    ) {
      const source = await Deno.readTextFile(
        new URL(`../${endpoint}/index.ts`, import.meta.url),
      );
      assertStringIncludes(source, "merchantAutoResolutionBlocked?: boolean;");
      assertStringIncludes(source, "merchantAutoResolutionValidationError(");
      assertStringIncludes(source, "...merchantAutoResolutionPatch(");
      assertEquals(
        source.indexOf("...merchantAutoResolutionPatch(") >
          source.indexOf("merchant_id: sanitizeUuid("),
        true,
      );
    }
  },
);

Deno.test(
  "recurring alignment records inherited provenance and propagation protects explicit overrides",
  async () => {
    const sql = await Deno.readTextFile(
      new URL(
        "../../migrations/20261007130000_ai_merchant_auto_resolution_block.sql",
        import.meta.url,
      ),
    );
    for (
      const contract of [
        "create or replace function public.align_recurring_occurrence_merchant_evidence(",
        "create or replace function public.propagate_recurring_merchant_identity(",
        "merchant_auto_resolution_blocked_inherited_from",
        "user_id = new.user_id",
        "array['merchant', 'merchant_id', 'merchant_structured_name']",
      ]
    ) {
      assertStringIncludes(sql, contract);
    }
  },
);

Deno.test(
  "durable SQL guards writes, enqueue and stale completion without descriptor suppression",
  async () => {
    const sql = await Deno.readTextFile(
      new URL(
        "../../migrations/20261007130000_ai_merchant_auto_resolution_block.sql",
        import.meta.url,
      ),
    );
    for (
      const contract of [
        "merchant_auto_resolution_blocked",
        "new.merchant is distinct from old.merchant",
        "new.merchant_id is distinct from old.merchant_id",
        "new.merchant_id := null",
        "new.merchant_structured_name := null",
        "before insert or update on public.merchant_resolution_jobs",
        "delete from public.merchant_resolution_jobs where transaction_id = new.id",
        "complete_merchant_resolution_job(uuid,uuid,text,text,uuid,text)",
        "return 0;",
        "merchant_identity_zz_enforce_auto_resolution_block",
        "- 'merchant_auto_resolution_blocked'",
        "|| jsonb_build_object('merchant_auto_resolution_blocked', true)",
      ]
    ) {
      assertStringIncludes(sql, contract);
    }
    assertEquals(
      sql.includes("insert into public.merchant_user_overrides"),
      false,
    );
    assertEquals(sql.includes("add column"), false);
    const enforcement = sql.slice(
      sql.indexOf(
        "create or replace function public.enforce_merchant_auto_resolution_block(",
      ),
      sql.indexOf("-- Capture deliberate edits"),
    );
    assertEquals(enforcement.includes("new.merchant :="), false);
    const lock = sql.indexOf(
      "from public.expenses where id = v_transaction_id for update;",
    );
    const blocked = sql.indexOf("if v_auto_resolution_blocked then");
    const jobLock = sql.indexOf("and claim_token = p_claim_token");
    assertEquals(lock < blocked && blocked < jobLock, true);
  },
);
