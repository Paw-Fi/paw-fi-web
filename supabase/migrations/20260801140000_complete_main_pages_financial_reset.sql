alter table public.idempotency_keys
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.idempotency_keys
set user_id = split_part(key, '|', 3)::uuid
where user_id is null
  and key like 'wallet_capture|%'
  and split_part(key, '|', 3) ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

update public.idempotency_keys
set user_id = split_part(key, ':', 2)::uuid
where user_id is null
  and key like 'wallet_capture:%'
  and split_part(key, ':', 2) ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

create index if not exists idempotency_keys_user_id_idx
  on public.idempotency_keys(user_id)
  where user_id is not null;

alter table public.users
  add column if not exists financial_data_reset_at timestamptz;
