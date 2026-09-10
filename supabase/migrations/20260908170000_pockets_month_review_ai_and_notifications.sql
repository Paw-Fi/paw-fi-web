-- A lightweight monthly reminder. It deliberately uses existing budgets and
-- envelopes only; it does not create, copy, or modify any pocket.
create unique index if not exists uniq_pockets_month_review_notification_cycle
  on public.notification_events (user_id, (payload ->> 'cycle_start'))
  where event_type = 'pockets_month_review';

create or replace function public.enqueue_pockets_month_review_notifications_v1()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_created integer := 0;
begin
  with latest_contacts as (
    select distinct on (contact.user_id)
      contact.user_id,
      case when exists (
        select 1 from pg_timezone_names timezone_name
        where timezone_name.name = nullif(trim(contact.preferred_timezone), '')
      ) then nullif(trim(contact.preferred_timezone), '') else 'UTC' end as timezone_name
    from public.user_contacts contact
    where contact.user_id is not null
    order by contact.user_id, contact.updated_at desc nulls last, contact.created_at desc, contact.id desc
  ), eligible_users as (
    select contact.user_id,
      public.financial_cycle_start_for_month((timezone(contact.timezone_name, now()))::date, public.user_financial_month_start_day(contact.user_id)) as cycle_start
    from latest_contacts contact
    where (timezone(contact.timezone_name, now()))::time >= time '09:00'
      and (timezone(contact.timezone_name, now()))::time < time '12:00'
      and public.financial_cycle_start_for_month((timezone(contact.timezone_name, now()))::date, public.user_financial_month_start_day(contact.user_id)) = (timezone(contact.timezone_name, now()))::date
      and not exists (
        select 1 from public.sharing_prefs preference
        where preference.user_id = contact.user_id and preference.household_id is null and preference.enable_nudges is false
      )
  ), candidates as (
    select eligible.user_id, eligible.cycle_start
    from eligible_users eligible
    where exists (
      select 1
      from public.budgets budget
      join public.budget_envelopes envelope on envelope.budget_id = budget.id
      where date_trunc('month', budget.period_month)::date = date_trunc('month', eligible.cycle_start - interval '1 month')::date
        and (
          (budget.household_id is null and budget.user_id = eligible.user_id)
          or exists (
            select 1 from public.household_members member
            where member.household_id = budget.household_id
              and member.user_id = eligible.user_id
              and member.role in ('owner', 'admin')
          )
        )
    )
  ), inserted as (
    insert into public.notification_events (user_id, event_type, payload)
    select candidate.user_id, 'pockets_month_review', jsonb_build_object(
      'cycle_start', candidate.cycle_start,
      'financial_cycle_label', to_char(candidate.cycle_start, 'Mon FMDD') || ' - ' || to_char(public.next_financial_cycle_start(candidate.cycle_start, public.user_financial_month_start_day(candidate.user_id)) - 1, 'Mon FMDD, YYYY'),
      'action', 'openPocketsPage'
    )
    from candidates candidate
    on conflict do nothing
    returning id
  )
  select count(*) into v_created from inserted;
  return jsonb_build_object('created', v_created);
end;
$$;

revoke all on function public.enqueue_pockets_month_review_notifications_v1() from public, anon, authenticated;
grant execute on function public.enqueue_pockets_month_review_notifications_v1() to service_role;

do $$ begin perform cron.unschedule('pockets-month-review-notifications'); exception when others then null; end; $$;

select cron.schedule(
  'pockets-month-review-notifications',
  '0 * * * *',
  $job$
    select net.http_post(
      url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url' limit 1), '/') || '/functions/v1/pockets-month-review-notifications',
      headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'notification_internal_secret_key' limit 1)),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
);
