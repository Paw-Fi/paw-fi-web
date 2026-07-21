create index if not exists expenses_plaid_transfer_reconciliation_idx
  on public.expenses (
    user_id,
    bank_account_id,
    household_id,
    (upper(coalesce(currency, ''))),
    (abs(amount_cents)),
    date,
    type,
    id
  )
  where provider = 'plaid'
    and deleted_at is null
    and analytics_is_final;

comment on index public.expenses_plaid_transfer_reconciliation_idx is
  'Supports the normalized currency and absolute amount predicates used by Plaid transfer reconciliation.';
