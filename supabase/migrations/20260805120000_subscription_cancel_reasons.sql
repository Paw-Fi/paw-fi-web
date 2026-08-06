create table if not exists public.subscription_cancel_reasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  reason_id text not null,
  reason_label text not null,
  detail_text text,
  provider text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint cancel_reason_id_not_blank
    check (char_length(btrim(reason_id)) between 1 and 64),
  constraint cancel_reason_label_not_blank
    check (char_length(btrim(reason_label)) between 1 and 160),
  constraint cancel_reason_detail_text_length
    check (detail_text is null or char_length(btrim(detail_text)) between 1 and 500),
  constraint cancel_reason_detail_text_required
    check (reason_id not in ('app_issue','missing_specific_feature','other')
            or nullif(btrim(coalesce(detail_text, '')), '') is not null)
);

alter table public.subscription_cancel_reasons enable row level security;

revoke all on public.subscription_cancel_reasons from anon;
grant insert, select on public.subscription_cancel_reasons to authenticated;

drop policy if exists "Users can insert their own cancel reasons"
  on public.subscription_cancel_reasons;

create policy "Users can insert their own cancel reasons"
  on public.subscription_cancel_reasons
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own cancel reasons"
  on public.subscription_cancel_reasons;

create policy "Users can read their own cancel reasons"
  on public.subscription_cancel_reasons
  for select to authenticated
  using (auth.uid() = user_id);

create index if not exists subscription_cancel_reasons_user_id_idx
  on public.subscription_cancel_reasons (user_id);
create index if not exists subscription_cancel_reasons_created_at_idx
  on public.subscription_cancel_reasons (created_at);
