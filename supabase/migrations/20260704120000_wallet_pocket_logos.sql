alter table public.accounts
  add column if not exists logo_url text;

alter table public.budget_envelopes
  add column if not exists logo_url text;

comment on column public.accounts.logo_url is
  'Optional public Supabase Storage URL for a custom wallet logo thumbnail.';

comment on column public.budget_envelopes.logo_url is
  'Optional public Supabase Storage URL for a custom pocket logo thumbnail.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_logo_url_valid'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_logo_url_valid
      check (
        logo_url is null
        or logo_url ~ '^(https://[^/]+|http://(localhost|127[.]0[.]0[.]1)(:[0-9]+)?)/storage/v1/object/public/public/[0-9a-fA-F-]{36}/wallet-logos/[^?#]+([?][A-Za-z0-9_=&.-]+)?$'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'budget_envelopes_logo_url_valid'
      and conrelid = 'public.budget_envelopes'::regclass
  ) then
    alter table public.budget_envelopes
      add constraint budget_envelopes_logo_url_valid
      check (
        logo_url is null
        or logo_url ~ '^(https://[^/]+|http://(localhost|127[.]0[.]0[.]1)(:[0-9]+)?)/storage/v1/object/public/public/[0-9a-fA-F-]{36}/pocket-logos/[^?#]+([?][A-Za-z0-9_=&.-]+)?$'
      );
  end if;
end $$;
