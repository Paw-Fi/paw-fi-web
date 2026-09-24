/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260915130000_merchant_identity_resolution.sql",
    import.meta.url,
  ),
);

const analyticsReadMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260916130005_include_merchant_identity_in_user_analytics.sql",
    import.meta.url,
  ),
);

const remainingExpenseReadsMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260916130006_complete_merchant_identity_expense_reads.sql",
    import.meta.url,
  ),
);

const plaidMerchantMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260918120000_plaid_merchant_identity_enrichment.sql",
    import.meta.url,
  ),
);

const atomicExpensePatchMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260924130000_allow_merchant_identity_in_atomic_expense_patch.sql",
    import.meta.url,
  ),
);

const listIncome = await Deno.readTextFile(
  new URL("../list-income/index.ts", import.meta.url),
);

const listExpenses = await Deno.readTextFile(
  new URL("../list-expenses/index.ts", import.meta.url),
);

const creatorUserLookup = await Deno.readTextFile(
  new URL("../creator-user-lookup/index.ts", import.meta.url),
);

const premiumDashboardSummary = await Deno.readTextFile(
  new URL("../premium-dashboard-summary/index.ts", import.meta.url),
);

Deno.test(
  "merchant identity migration preserves raw merchant text and adds nullable IDs",
  () => {
    assertStringIncludes(
      migration,
      "add column if not exists merchant_id uuid",
    );
    assertStringIncludes(
      migration,
      "foreign key (merchant_id) references public.merchants(id)",
    );
    assertStringIncludes(
      migration,
      "merchant text remains raw transaction evidence",
    );
  },
);

Deno.test(
  "atomic household expense patches preserve nullable merchant identity",
  () => {
    assertStringIncludes(atomicExpensePatchMigration, "'merchant_id'");
    assertStringIncludes(
      atomicExpensePatchMigration,
      "'merchant_structured_name'",
    );
    assertStringIncludes(
      atomicExpensePatchMigration,
      "(v_patch ->> 'merchant_id')::uuid",
    );
    assertStringIncludes(
      atomicExpensePatchMigration,
      "jsonb_typeof(v_patch -> 'merchant_id') = 'null' then null",
    );
    assertStringIncludes(
      atomicExpensePatchMigration,
      "merchant_structured_name = case",
    );
    assertStringIncludes(
      atomicExpensePatchMigration,
      "revoke all on function public.households_apply_expense_patch_v3",
    );
  },
);

Deno.test(
  "merchant hardening supports safe catalog, cache leases, and resumable bootstrap",
  () => {
    assertStringIncludes(migration, "'evidenced_domain'");
    assertStringIncludes(migration, "lease_token uuid");
    assertStringIncludes(migration, "claim_merchant_search_refresh");
    assertStringIncludes(migration, "merchant_logo_bootstrap_runs");
    assertStringIncludes(migration, "merchant_logo_bootstrap_groups");
    assertStringIncludes(migration, "start_merchant_logo_bootstrap");
    assertStringIncludes(migration, "v_structured_learning_persisted");
  },
);

Deno.test(
  "merchant jobs are deduplicated and safe for concurrent workers",
  () => {
    assertStringIncludes(migration, "merchant_resolution_jobs_active_key_idx");
    assertStringIncludes(migration, "for update skip locked");
    assertStringIncludes(migration, "claim_merchant_resolution_jobs");
    assertStringIncludes(migration, "merchant_resolution_jobs_enqueue_trigger");
  },
);

Deno.test(
  "identity is optional and evidence changes are descriptor based",
  () => {
    assertStringIncludes(
      migration,
      "expense_merchant_resolution_descriptor_key",
    );
    assertStringIncludes(migration, "v_new_key is distinct from v_old_key");
    assertStringIncludes(
      migration,
      "raw_text is never merchant evidence merely because an account is linked",
    );
    assertStringIncludes(migration, "merchant_id := null");
    assertStringIncludes(migration, "on delete set null;");
    assertStringIncludes(migration, "no language, country, processor, number");
    assertStringIncludes(migration, "normalize(value, NFC)");
    assertStringIncludes(migration, "normalize(lower(btrim");
  },
);

Deno.test(
  "suppression and aliases cannot create cross-user global matches",
  () => {
    assertStringIncludes(migration, "action in ('map', 'suppress')");
    assertStringIncludes(
      migration,
      "action = 'suppress' and merchant_id is null",
    );
    assertStringIncludes(
      migration,
      "merchant_aliases_trusted_pattern_unique_idx",
    );
    assertStringIncludes(migration, "where is_trusted");
    assertStringIncludes(migration, "complete_merchant_resolution_job");
    assertStringIncludes(migration, "where id = p_job_id");
    assertStringIncludes(migration, "claim_token uuid");
    assertStringIncludes(migration, "p_expected_descriptor_key");
    assertStringIncludes(
      migration,
      "before update of merchant, raw_text, merchant_structured_name, bank_account_id",
    );
    assertStringIncludes(
      migration,
      "evidence_context_key is distinct from v_context_key",
    );
    assertStringIncludes(migration, "claim_token = null");
    assertStringIncludes(
      migration,
      "Resolved merchant jobs require merchant_id",
    );
    assertStringIncludes(migration, "merchant_structured_name text");
    assertStringIncludes(migration, "structured_merchant_key text");
    assertStringIncludes(migration, "user_confirmed_structured_merchant");
    assertStringIncludes(migration, "for update;");
    assertStringIncludes(migration, "v_expense.merchant_structured_name");
  },
);

Deno.test(
  "lifecycle retries and learning propagation are evidence-scoped",
  () => {
    assertStringIncludes(migration, "job.status = 'unresolved'");
    assertStringIncludes(migration, "job.status = 'failed'");
    assertStringIncludes(migration, "attempt_count = 0");
    assertStringIncludes(
      migration,
      "merchant_resolution_jobs_structured_active_key_idx",
    );
    assertStringIncludes(
      migration,
      "job.structured_merchant_key = v_canonical_structured_key",
    );
    assertStringIncludes(migration, "expense.user_id = p_actor_user_id");
    assertStringIncludes(
      migration,
      "select canonical_name into v_canonical_name",
    );
    assertStringIncludes(
      migration,
      "merchant_search_usage_daily enable row level security",
    );
  },
);

Deno.test(
  "interactive discovery cache is separate from identity evidence",
  () => {
    assertStringIncludes(
      migration,
      "create table if not exists public.merchant_search_cache",
    );
    assertStringIncludes(migration, "normalized_query text not null");
    assertStringIncludes(migration, "candidates jsonb not null");
    assertStringIncludes(
      migration,
      "merchant_search_cache enable row level security",
    );
    assertStringIncludes(
      migration,
      "revoke all on table public.merchant_search_cache",
    );
  },
);

Deno.test(
  "removed evidence and soft deletion invalidate stale worker claims",
  () => {
    assertStringIncludes(
      migration,
      "delete from public.merchant_resolution_jobs where transaction_id = new.id",
    );
    assertStringIncludes(
      migration,
      "bank_account_id, deleted_at on public.expenses",
    );
    assertStringIncludes(migration, "v_expense_deleted_at is not null");
    assertStringIncludes(
      migration,
      "v_current_descriptor_key is distinct from v_job_descriptor_key",
    );
    assertStringIncludes(
      migration,
      "delete from public.merchant_resolution_jobs where id = p_job_id and claim_token = p_claim_token",
    );
  },
);

Deno.test(
  "a direct assignment finalizes rather than deletes its lifecycle job",
  () => {
    assertStringIncludes(
      migration,
      "Keep a resolved job as the durable lifecycle record",
    );
    assertStringIncludes(
      migration,
      "set status = 'resolved', claim_token = null",
    );
  },
);

Deno.test("names remain searchable but domains are the global identity", () => {
  assertStringIncludes(migration, "normalized_name text not null,");
  assertStringIncludes(migration, "merchants_normalized_name_idx");
  assertStringIncludes(migration, "merchants_domain_lower_unique_idx");
  assertStringIncludes(migration, "domain !~ '^www\\.'");
  assertStringIncludes(migration, "domain ~ '^[a-z0-9]");
});

Deno.test(
  "merchant identity data is not directly exposed through broad table grants",
  () => {
    assertStringIncludes(migration, "enable row level security");
    assertStringIncludes(
      migration,
      "revoke all on table public.merchant_resolution_jobs",
    );
    assertStringIncludes(
      migration,
      "grant select on table public.merchants to authenticated",
    );
    assertStringIncludes(
      migration,
      "revoke all on table public.merchant_user_overrides",
    );
    assertStringIncludes(
      migration,
      "revoke all on function public.enqueue_merchant_resolution_for_expense()",
    );
    assertStringIncludes(
      migration,
      "revoke all on function public.clear_stale_merchant_identity()",
    );
  },
);

Deno.test(
  "backfill is bounded and feed contracts include merchant identity",
  () => {
    assertStringIncludes(
      migration,
      "enqueue_merchant_resolution_backfill_batch",
    );
    assertStringIncludes(
      migration,
      "least(greatest(coalesce(p_batch_size, 250), 1), 1000)",
    );
    assertStringIncludes(migration, "get_user_transactions_page_v6");
    assertStringIncludes(migration, "get_mobile_delta_v6");
    assertStringIncludes(migration, "'merchant_domain', merchant.domain");
    assertStringIncludes(migration, "enrich_merchant_identity_items");
    assertStringIncludes(migration, "with eligible as");
    assertStringIncludes(
      migration,
      "and coalesce(public.expense_merchant_resolution_descriptor_key(",
    );
  },
);

Deno.test(
  "analytics reads cannot erase canonical merchant identity from the mobile cache",
  () => {
    assertStringIncludes(
      analyticsReadMigration,
      "e.merchant, e.merchant_id, merchant.domain as merchant_domain",
    );
    assertStringIncludes(analyticsReadMigration, "e.merchant_structured_name");
    assertStringIncludes(
      analyticsReadMigration,
      "left join public.merchants merchant on merchant.id = e.merchant_id",
    );
  },
);

Deno.test(
  "month-over-month transaction reads preserve raw merchant identity and direct logos",
  () => {
    assertStringIncludes(
      plaidMerchantMigration,
      "get_home_mom_transactions_v5",
    );
    assertStringIncludes(plaidMerchantMigration, "item.merchant,");
    assertStringIncludes(plaidMerchantMigration, "item.merchant_id,");
    assertStringIncludes(
      plaidMerchantMigration,
      "item.merchant_structured_name",
    );
    assertStringIncludes(plaidMerchantMigration, "item.merchant_domain,");
    assertStringIncludes(plaidMerchantMigration, "merchant.logo_identifier");
  },
);

Deno.test("legacy expense list endpoints preserve merchant identity", () => {
  for (const source of [listIncome, listExpenses, creatorUserLookup]) {
    assertStringIncludes(source, "merchant_id");
    assertStringIncludes(source, "merchant_structured_name");
    assertStringIncludes(source, "merchants(domain, logo_identifier)");
  }
  assertStringIncludes(listIncome, "merchantDomain:");
  assertStringIncludes(listIncome, "merchantLogoUrl:");
  assertStringIncludes(listExpenses, "merchant_domain:");
  assertStringIncludes(listExpenses, "merchant_logo_url:");
});

Deno.test(
  "premium dashboard transaction rows preserve merchant identity",
  () => {
    assertStringIncludes(premiumDashboardSummary, "merchant_id");
    assertStringIncludes(premiumDashboardSummary, "merchant_structured_name");
    assertStringIncludes(
      premiumDashboardSummary,
      "merchants(domain, logo_identifier)",
    );
    assertStringIncludes(premiumDashboardSummary, "merchant: row.merchant");
    assertStringIncludes(
      premiumDashboardSummary,
      "merchantId: row.merchant_id",
    );
    assertStringIncludes(
      premiumDashboardSummary,
      "merchantDomain: row.merchants?.domain ?? null",
    );
    assertStringIncludes(
      premiumDashboardSummary,
      "merchantLogoUrl: row.merchants?.logo_identifier ?? null",
    );
    assertStringIncludes(
      premiumDashboardSummary,
      "merchantStructuredName: row.merchant_structured_name",
    );
  },
);

Deno.test("Plaid enrichment reuses the existing merchant logo contract", () => {
  assertStringIncludes(
    plaidMerchantMigration,
    "extract_plaid_merchant_enrichment",
  );
  assertStringIncludes(plaidMerchantMigration, "logo_identifier = v_logo_url");
  assertStringIncludes(plaidMerchantMigration, "'merchant_logo_url'");
  assertStringIncludes(
    plaidMerchantMigration,
    "expense_merchant_logo_url(merchant.logo_identifier)",
  );
  assertStringIncludes(plaidMerchantMigration, "get_user_analytics_v2");
  assertStringIncludes(plaidMerchantMigration, "get_home_mom_transactions_v5");
  assertStringIncludes(
    plaidMerchantMigration,
    "backfill_plaid_merchant_enrichment_batch",
  );
});
