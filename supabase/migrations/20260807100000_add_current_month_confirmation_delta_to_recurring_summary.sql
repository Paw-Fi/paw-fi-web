create or replace function public.list_recurring_series_summary_v1(
  p_actor_user_id uuid,
  p_household_id uuid default null,
  p_currencies text[] default null,
  p_after_next_occurrence_date date default null,
  p_after_id uuid default null,
  p_limit integer default 50
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), '')
  ) <> 'service_role' then
    raise exception 'OCCURRENCE_UNAUTHORIZED';
  end if;
  if p_actor_user_id is null
    or ((p_after_next_occurrence_date is null) <> (p_after_id is null)) then
    raise exception 'OCCURRENCE_INVALID_INPUT';
  end if;

  return (
    with visible_templates as (
      select template.*
      from public.expenses template
      where template.is_recurring is true
        and template.recurrence_rule is not null
        and template.deleted_at is null
        and template.provider is null
        and template.bank_account_id is null
        and (
          p_currencies is null
          or cardinality(p_currencies) = 0
          or upper(template.currency) = any (
            select upper(currency) from unnest(p_currencies) currency
          )
        )
        and (
          (p_household_id is null
            and template.household_id is null
            and template.user_id = p_actor_user_id)
          or
          (p_household_id is not null
            and template.household_id = p_household_id
            and (
              template.user_id = p_actor_user_id
              or (
                template.privacy_scope::text = 'full'
                and public.is_member_of_household(p_household_id, p_actor_user_id)
              )
            ))
        )
    ), summaries as (
      select
        template.id,
        coalesce(schedule.next_occurrence_date, date '9999-12-31') as sort_date,
        jsonb_build_object(
          'id', template.id,
          'user_id', template.user_id,
          'date', template.date,
          'category', template.category,
          'raw_text', template.raw_text,
          'merchant', template.merchant,
          'source', template.source,
          'amount_cents', template.amount_cents,
          'currency', upper(template.currency),
          'owner_type', template.owner_type,
          'privacy_scope', template.privacy_scope,
          'household_id', template.household_id,
          'split_group_id', template.split_group_id,
          'account_id', template.account_id,
          'is_recurring', true,
          'recurrence_rule', template.recurrence_rule,
          'type', template.type,
          'created_at', template.created_at,
          'updated_at', template.updated_at,
          'analytics_class', template.analytics_class,
          'analytics_is_final', template.analytics_is_final,
          'analytics_spending_multiplier', template.analytics_spending_multiplier,
          'analytics_counts_toward_income', template.analytics_counts_toward_income,
          'next_occurrence_date', schedule.next_occurrence_date,
          'latest_actionable_occurrence_date', schedule.latest_actionable_occurrence_date,
          'actionable_count', schedule.actionable_count,
          'current_month_confirmed_amount_delta_cents',
            current_month_confirmation.amount_delta_cents
        ) as payload
      from visible_templates template
      cross join lateral (
        select
          public.recurring_user_wall_now_v1(p_actor_user_id)::date as current_date,
          date_trunc(
            'month',
            public.recurring_user_wall_now_v1(p_actor_user_id)
          )::date as month_start
      ) current_month
      cross join lateral (
        select
          public.recurring_next_available_occurrence_v1(
            template.id,
            template.recurrence_rule,
            current_month.current_date
          ) as next_occurrence_date,
          public.recurring_latest_actionable_occurrence_v1(
            p_actor_user_id,
            template.id,
            template.recurrence_rule
          ) as latest_actionable_occurrence_date,
          public.recurring_actionable_occurrence_count_v1(
            p_actor_user_id,
            template.id,
            template.recurrence_rule
          ) as actionable_count
      ) schedule
      cross join lateral (
        select coalesce(
          sum(occurrence.amount_cents - template.amount_cents),
          0
        )::bigint as amount_delta_cents
        from public.recurring_occurrences occurrence
        where occurrence.recurring_id = template.id
          and occurrence.status = 'confirmed'
          and occurrence.scheduled_occurrence_date >= current_month.month_start
          and occurrence.scheduled_occurrence_date <
            (current_month.month_start + interval '1 month')::date
      ) current_month_confirmation
    ), page as (
      select summary.*
      from summaries summary
      where p_after_next_occurrence_date is null
        or (summary.sort_date, summary.id) > (
          p_after_next_occurrence_date,
          p_after_id
        )
      order by summary.sort_date, summary.id
      limit v_limit + 1
    ), visible_page as (
      select page.*
      from page
      order by page.sort_date, page.id
      limit v_limit
    ), last_visible as (
      select visible.sort_date, visible.id
      from visible_page visible
      order by visible.sort_date desc, visible.id desc
      limit 1
    )
    select jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(visible.payload order by visible.sort_date, visible.id)
        from visible_page visible
      ), '[]'::jsonb),
      'has_more', (select count(*) > v_limit from page),
      'next_cursor', case
        when (select count(*) > v_limit from page) then (
          select jsonb_build_object(
            'next_occurrence_date', last_visible.sort_date,
            'id', last_visible.id
          )
          from last_visible
        )
        else null
      end
    )
  );
end;
$$;
