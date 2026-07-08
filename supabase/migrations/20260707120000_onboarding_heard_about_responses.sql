create table if not exists public.onboarding_heard_about_responses (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_label text not null,
  other_text text,
  platform text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint onboarding_heard_about_source_not_blank
    check (char_length(btrim(source)) between 1 and 64),
  constraint onboarding_heard_about_source_label_not_blank
    check (char_length(btrim(source_label)) between 1 and 120),
  constraint onboarding_heard_about_other_text_length
    check (other_text is null or char_length(btrim(other_text)) between 1 and 300),
  constraint onboarding_heard_about_other_text_required
    check (source <> 'other' or nullif(btrim(coalesce(other_text, '')), '') is not null)
);

alter table public.onboarding_heard_about_responses enable row level security;

revoke all on public.onboarding_heard_about_responses from anon, authenticated;
grant insert on public.onboarding_heard_about_responses to anon, authenticated;

drop policy if exists "Anyone can submit onboarding heard-about responses."
  on public.onboarding_heard_about_responses;

create policy "Anyone can submit onboarding heard-about responses."
  on public.onboarding_heard_about_responses
  for insert
  to anon, authenticated
  with check (true);
