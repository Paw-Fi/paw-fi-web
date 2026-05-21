-- Close remaining operational RPC privilege gaps and add Plaid webhook replay keys.

alter table public.bank_webhook_events
  add column if not exists verification_replay_key text;

alter table public.bank_webhook_events
  add column if not exists processed_at timestamptz;

alter table public.bank_webhook_events
  add column if not exists processing_error text;

create unique index if not exists idx_bank_webhook_events_verification_replay_key
  on public.bank_webhook_events(provider, verification_replay_key)
  where verification_replay_key is not null;

revoke all on function public.claim_pending_sync_jobs(int, text) from public, anon, authenticated;
grant execute on function public.claim_pending_sync_jobs(int, text) to service_role;

revoke all on function public.check_webhook_idempotency(text) from public, anon, authenticated;
grant execute on function public.check_webhook_idempotency(text) to service_role;

revoke all on function public.claim_plaid_manual_refresh(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_plaid_manual_refresh(uuid, timestamptz, timestamptz) to service_role;
