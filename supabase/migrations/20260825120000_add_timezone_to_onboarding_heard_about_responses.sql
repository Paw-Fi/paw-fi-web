alter table public.onboarding_heard_about_responses
  add column if not exists timezone text;

drop function if exists public.get_creator_onboarding_heard_about_sources(date, date);

create or replace function public.get_creator_onboarding_heard_about_sources(
  p_start_date date,
  p_end_date date
)
returns table(source text, timezone text, count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_creator boolean := false;
begin
  if p_start_date > p_end_date then
    raise exception 'Start date must be before or equal to end date';
  end if;

  select coalesce(users.is_creator, false)
  into v_is_creator
  from public.users
  where users.id = auth.uid();

  if not v_is_creator then
    raise exception 'Creator access required';
  end if;

  return query
  with source_options(source, source_label) as (
    values
      ('tiktok', 'tiktok'),
      ('instagram', 'instagram'),
      ('youtube', 'youtube'),
      ('chatgpt', 'chatgpt'),
      ('reddit', 'reddit'),
      ('google_search', 'google search'),
      ('app_store', 'app store'),
      ('friend_or_family', 'friend or family')
  ),
  normalized_responses as (
    select
      case
        when responses.source = 'other' then coalesce(
          (
            select options.source
            from source_options as options
            where lower(btrim(responses.other_text)) in (
              options.source,
              options.source_label
            )
          ),
          concat(
            responses.source_label,
            ': ',
            coalesce(nullif(btrim(responses.other_text), ''), '(empty)')
          )
        )
        else responses.source
      end as normalized_source,
      responses.timezone as device_timezone
    from public.onboarding_heard_about_responses as responses
    where responses.source is distinct from 'budgeting_app_import'
      and responses.created_at >= p_start_date::timestamptz
      and responses.created_at < (p_end_date + 1)::timestamptz
  )
  select normalized_source as source, device_timezone as timezone, count(*) as count
  from normalized_responses
  group by normalized_source, device_timezone
  order by count(*) desc, normalized_source, device_timezone nulls first;
end;
$$;

revoke all on function public.get_creator_onboarding_heard_about_sources(date, date) from public;
revoke all on function public.get_creator_onboarding_heard_about_sources(date, date) from anon;
grant execute on function public.get_creator_onboarding_heard_about_sources(date, date) to authenticated;
