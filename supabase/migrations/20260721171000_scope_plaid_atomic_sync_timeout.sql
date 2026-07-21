alter function public.apply_plaid_sync_batch_v2(
  uuid, uuid, integer, text, jsonb, jsonb, text[], uuid[], uuid[], jsonb,
  uuid[], jsonb, jsonb, boolean, boolean, uuid, uuid
)
set statement_timeout to '60s';

comment on function public.apply_plaid_sync_batch_v2(
  uuid, uuid, integer, text, jsonb, jsonb, text[], uuid[], uuid[], jsonb,
  uuid[], jsonb, jsonb, boolean, boolean, uuid, uuid
) is
  'Atomically applies a fenced Plaid sync batch with a bounded timeout for large transaction histories.';
