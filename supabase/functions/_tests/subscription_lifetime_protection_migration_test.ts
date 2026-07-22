import {
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const migrationPath = new URL(
  "../../migrations/20260720120000_protect_cross_provider_lifetime_entitlements.sql",
  import.meta.url,
);
const migration = await Deno.readTextFile(migrationPath);

Deno.test("Lifetime protection migration installs atomic downgrade guard", () => {
  assertStringIncludes(
    migration,
    "create trigger subscriptions_protect_active_lifetime",
  );
  assertStringIncludes(
    migration,
    "old.plan = 'lifetime'",
  );
  assertStringIncludes(
    migration,
    "moneko.allow_lifetime_revocation",
  );
  assertStringIncludes(
    migration,
    "new.lifetime_source is distinct from old.lifetime_source",
  );
  assertStringIncludes(
    migration,
    "subscriptions_active_lifetime_source_required",
  );
});

Deno.test("migration closes concurrent cross-provider terminal-event races", () => {
  assertStringIncludes(
    migration,
    "new.provider is distinct from old.provider",
  );
  assertStringIncludes(
    migration,
    "new.stripe_subscription_id is distinct from old.stripe_subscription_id",
  );
  assertStringIncludes(
    migration,
    "new.app_store_original_transaction_id is distinct from",
  );
});

Deno.test("Lifetime revocation requires exact provider source ownership", () => {
  assertStringIncludes(
    migration,
    "create or replace function public.revoke_lifetime_entitlement_v1",
  );
  assertStringIncludes(
    migration,
    "v_subscription.lifetime_source is distinct from p_source",
  );
  assertStringIncludes(
    migration,
    "v_subscription.lifetime_source_id is distinct from p_source_id",
  );
  assertStringIncludes(
    migration,
    "perform public.cascade_subscription_cancellation(p_user_id)",
  );
  assertStringIncludes(
    migration,
    "to service_role",
  );
});

Deno.test("Manual Lifetime grants are backfilled as non-provider revocable", () => {
  assertStringIncludes(migration, "then 'manual'");
  assertStringIncludes(migration, "like 'manual_lifetime_%'");
});
