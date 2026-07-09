alter table public.user_contacts
  add column if not exists financial_month_start_day integer;

update public.user_contacts
set financial_month_start_day = 1
where financial_month_start_day is null;

alter table public.user_contacts
  alter column financial_month_start_day set default 1,
  alter column financial_month_start_day set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_contacts_financial_month_start_day_range'
      and conrelid = 'public.user_contacts'::regclass
  ) then
    alter table public.user_contacts
      add constraint user_contacts_financial_month_start_day_range
      check (financial_month_start_day between 1 and 31);
  end if;
end $$;
