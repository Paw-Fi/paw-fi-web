alter table public.account_transfers
  add column if not exists client_record_id text null;

create unique index if not exists idx_account_transfers_creator_client_record
  on public.account_transfers (created_by_user_id, client_record_id)
  where client_record_id is not null;
