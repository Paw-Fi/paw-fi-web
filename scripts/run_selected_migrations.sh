#!/usr/bin/env bash
set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-}"
if [ -z "$DB_URL" ]; then
  echo "ERROR: SUPABASE_DB_URL is not set"
  echo "Export it first, e.g.: export SUPABASE_DB_URL=\"postgresql://...\""
  exit 1
fi

MIGRATIONS=(
  "supabase/migrations/20260409120000_add_target_household_id_to_tink_auth_states.sql"
  "supabase/migrations/202604101130_plaid_function_consolidation.sql"
  "supabase/migrations/20260410_plaid_production_hardening.sql"
  "supabase/migrations/20260415_bank_sync_cron_auth_alignment.sql"
  "supabase/migrations/20260422120000_plaid_followup_cleanup_and_guards.sql"
  "supabase/migrations/20260517120000_bank_table_safe_mobile_access.sql"
  "supabase/migrations/20260517121000_bank_sync_retry_backoff.sql"
  "supabase/migrations/20260517122000_plaid_offboarding_jobs.sql"
  "supabase/migrations/20260517123000_plaid_link_update_sessions.sql"
  "supabase/migrations/20260517124000_plaid_webhook_replay_and_rpc_privileges.sql"
  "supabase/migrations/20260518102000_plaid_update_mode_account_visibility.sql"
  "supabase/migrations/20260518120000_currency_rate_snapshots.sql"
  "supabase/migrations/20260518123000_transactions_feed_multi_currency_filters.sql"
  "supabase/migrations/20260519103000_plaid_financial_activity_tracking.sql"
  "supabase/migrations/20260519124500_bank_sync_scope_isolation.sql"
  "supabase/migrations/20260520110000_reset_user_financial_data.sql"
  "supabase/migrations/20260520124500_allow_null_legacy_plaid_access_token.sql"
  "supabase/migrations/20260520131000_rebind_bank_expenses_to_linked_wallets.sql"
  "supabase/migrations/20260520133000_fix_bank_recurring_occurrences.sql"
  "supabase/migrations/20260521120000_add_user_preferred_space.sql"
  "supabase/migrations/20260522120000_accounts_currency_required.sql"
  "supabase/migrations/20260525120000_ensure_spending_wallets_per_currency.sql"
  "supabase/migrations/20260526120000_currency_scope_wallet_snapshot_legacy_wallets.sql"
  "supabase/migrations/20260526131500_fix_reset_user_financial_data_preserve_system_wallets.sql"
)

for file in "${MIGRATIONS[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: migration file not found: $file"
    exit 1
  fi

  version="$(basename "$file" .sql)"

  if psql "$DB_URL" -Atqc "select 1 from supabase_migrations.schema_migrations where version = '$version'" | grep -q 1; then
    echo "SKIP (already applied): $version"
    continue
  fi

  echo "APPLY: $version"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -c "insert into supabase_migrations.schema_migrations(version) values ('$version')"
done

echo "Done."
