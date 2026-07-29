-- Additive lazy-read contracts for recurring navigation, cards, details, and
-- payment history. Existing lifecycle RPCs remain unchanged for older clients.

set lock_timeout = '10s';

create index if not exists expenses_recurring_personal_summary_idx
  on public.expenses (user_id, currency, date, id)
  where is_recurring is true
    and deleted_at is null
    and household_id is null
    and provider is null
    and bank_account_id is null;

create index if not exists expenses_recurring_household_summary_idx
  on public.expenses (household_id, currency, date, id)
  where is_recurring is true
    and deleted_at is null
    and household_id is not null
    and provider is null
    and bank_account_id is null;

create or replace function public.recurring_previous_occurrence_on_or_before_v1(
  p_rule jsonb,
  p_reference_date date
) returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_anchor date;
  v_end date;
  v_reference date;
  v_frequency text;
  v_interval integer;
  v_step_days integer;
  v_steps integer;
  v_months_difference integer;
  v_candidate_month date;
  v_candidate date;
  v_anchor_day integer;
begin
  if p_rule is null or p_reference_date is null then return null; end if;

  v_anchor := nullif(p_rule ->> 'anchor_date', '')::date;
  v_end := nullif(p_rule ->> 'end_date', '')::date;
  if v_anchor is null then return null; end if;

  v_reference := least(p_reference_date, coalesce(v_end, p_reference_date));
  if v_reference < v_anchor then return null; end if;

  v_frequency := lower(coalesce(nullif(p_rule ->> 'frequency', ''), 'monthly'));
  v_interval := greatest(coalesce(nullif(p_rule ->> 'interval', '')::integer, 1), 1);
  v_anchor_day := extract(day from v_anchor)::integer;

  case v_frequency
    when 'daily' then
      v_step_days := v_interval;
      v_candidate := v_anchor + (((v_reference - v_anchor) / v_step_days) * v_step_days);
    when 'weekly' then
      v_step_days := v_interval * 7;
      v_candidate := v_anchor + (((v_reference - v_anchor) / v_step_days) * v_step_days);
    when 'biweekly' then
      v_step_days := 14;
      v_candidate := v_anchor + (((v_reference - v_anchor) / v_step_days) * v_step_days);
    when 'monthly' then
      v_months_difference :=
        (extract(year from v_reference)::integer - extract(year from v_anchor)::integer) * 12
        + extract(month from v_reference)::integer
        - extract(month from v_anchor)::integer;
      v_steps := greatest(floor(v_months_difference::numeric / v_interval)::integer, 0);
      v_candidate_month := (
        date_trunc('month', v_anchor)::date
        + make_interval(months => v_steps * v_interval)
      )::date;
      v_candidate := public.make_clamped_calendar_date_v1(
        extract(year from v_candidate_month)::integer,
        extract(month from v_candidate_month)::integer,
        v_anchor_day
      );
      if v_candidate > v_reference and v_steps > 0 then
        v_steps := v_steps - 1;
        v_candidate_month := (
          date_trunc('month', v_anchor)::date
          + make_interval(months => v_steps * v_interval)
        )::date;
        v_candidate := public.make_clamped_calendar_date_v1(
          extract(year from v_candidate_month)::integer,
          extract(month from v_candidate_month)::integer,
          v_anchor_day
        );
      end if;
    when 'yearly' then
      v_steps := greatest(
        floor(
          (extract(year from v_reference)::integer - extract(year from v_anchor)::integer)::numeric
          / v_interval
        )::integer,
        0
      );
      v_candidate := public.make_clamped_calendar_date_v1(
        extract(year from v_anchor)::integer + (v_steps * v_interval),
        extract(month from v_anchor)::integer,
        v_anchor_day
      );
      if v_candidate > v_reference and v_steps > 0 then
        v_steps := v_steps - 1;
        v_candidate := public.make_clamped_calendar_date_v1(
          extract(year from v_anchor)::integer + (v_steps * v_interval),
          extract(month from v_anchor)::integer,
          v_anchor_day
        );
      end if;
    else
      v_candidate := v_anchor;
  end case;

  return case when v_candidate <= v_reference then v_candidate else null end;
exception when others then
  return null;
end;
$$;

create or replace function public.recurring_next_available_occurrence_v1(
  p_recurring_id uuid,
  p_rule jsonb,
  p_reference_date date
) returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_anchor date;
  v_end date;
  v_frequency text;
  v_interval integer;
  v_candidate date;
begin
  if p_recurring_id is null or p_rule is null or p_reference_date is null
    or coalesce(p_rule ->> 'projection_enabled', 'true') = 'false' then
    return null;
  end if;

  v_anchor := nullif(p_rule ->> 'anchor_date', '')::date;
  v_end := nullif(p_rule ->> 'end_date', '')::date;
  v_frequency := lower(coalesce(nullif(p_rule ->> 'frequency', ''), 'monthly'));
  v_interval := greatest(coalesce(nullif(p_rule ->> 'interval', '')::integer, 1), 1);
  v_candidate := public.calculate_next_occurrence_on_or_after(
    v_anchor,
    v_frequency,
    v_interval,
    v_end,
    p_reference_date
  );

  for v_attempt in 1..1000 loop
    if v_candidate is null then return null; end if;
    if not exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(p_rule -> 'excluded_dates', '[]'::jsonb)
      ) excluded(value)
      where excluded.value = v_candidate::text
    ) and not exists (
      select 1
      from public.recurring_occurrences occurrence
      where occurrence.recurring_id = p_recurring_id
        and occurrence.scheduled_occurrence_date = v_candidate
        and occurrence.status in ('confirmed', 'skipped')
    ) then
      return v_candidate;
    end if;

    v_candidate := public.calculate_next_occurrence_on_or_after(
      v_anchor,
      v_frequency,
      v_interval,
      v_end,
      v_candidate + 1
    );
  end loop;

  return null;
exception when others then
  return null;
end;
$$;

create or replace function public.recurring_latest_actionable_occurrence_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid,
  p_rule jsonb
) returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_wall_now timestamp;
  v_reference_date date;
  v_reminder_value integer := 0;
  v_reminder_unit text;
  v_candidate date;
begin
  if p_actor_user_id is null or p_recurring_id is null or p_rule is null
    or coalesce(p_rule ->> 'projection_enabled', 'true') = 'false' then
    return null;
  end if;

  v_wall_now := public.recurring_user_wall_now_v1(p_actor_user_id);
  v_reminder_unit := lower(coalesce(p_rule -> 'reminder' ->> 'unit', ''));
  if coalesce(p_rule -> 'reminder' ->> 'enabled', 'false') = 'true'
    and coalesce(p_rule -> 'reminder' ->> 'value', '') ~ '^[0-9]+$' then
    v_reminder_value := (p_rule -> 'reminder' ->> 'value')::integer;
  end if;

  v_reference_date := v_wall_now::date + case
    when v_reminder_unit = 'days' then v_reminder_value
    when v_reminder_unit = 'hours' then ceil(v_reminder_value::numeric / 24)::integer
    else 0
  end;
  v_candidate := public.recurring_previous_occurrence_on_or_before_v1(
    p_rule,
    v_reference_date
  );

  for v_attempt in 1..1000 loop
    if v_candidate is null then return null; end if;
    if public.recurring_occurrence_confirmation_opens_at_v1(
      p_rule,
      v_candidate
    ) <= v_wall_now
      and not exists (
        select 1
        from jsonb_array_elements_text(
          coalesce(p_rule -> 'excluded_dates', '[]'::jsonb)
        ) excluded(value)
        where excluded.value = v_candidate::text
      )
      and not exists (
        select 1
        from public.recurring_occurrences occurrence
        where occurrence.recurring_id = p_recurring_id
          and occurrence.scheduled_occurrence_date = v_candidate
          and occurrence.status in ('confirmed', 'skipped')
      ) then
      return v_candidate;
    end if;

    v_candidate := public.recurring_previous_occurrence_on_or_before_v1(
      p_rule,
      v_candidate - 1
    );
  end loop;

  return null;
exception when others then
  return null;
end;
$$;

create or replace function public.recurring_actionable_occurrence_count_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid,
  p_rule jsonb
) returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_wall_now timestamp;
  v_reference_date date;
  v_reminder_value integer := 0;
  v_reminder_unit text;
  v_anchor_date date;
  v_end_date date;
  v_frequency text;
  v_interval integer;
  v_excluded_dates date[];
  v_count integer;
begin
  if p_actor_user_id is null or p_recurring_id is null or p_rule is null
    or coalesce(p_rule ->> 'projection_enabled', 'true') = 'false' then
    return 0;
  end if;

  v_wall_now := public.recurring_user_wall_now_v1(p_actor_user_id);
  v_reminder_unit := lower(coalesce(p_rule -> 'reminder' ->> 'unit', ''));
  if coalesce(p_rule -> 'reminder' ->> 'enabled', 'false') = 'true'
    and coalesce(p_rule -> 'reminder' ->> 'value', '') ~ '^[0-9]+$' then
    v_reminder_value := (p_rule -> 'reminder' ->> 'value')::integer;
  end if;
  v_reference_date := v_wall_now::date + case
    when v_reminder_unit = 'days' then v_reminder_value
    when v_reminder_unit = 'hours' then ceil(v_reminder_value::numeric / 24)::integer
    else 0
  end;
  v_anchor_date := nullif(p_rule ->> 'anchor_date', '')::date;
  v_end_date := nullif(p_rule ->> 'end_date', '')::date;
  v_frequency := lower(coalesce(nullif(p_rule ->> 'frequency', ''), 'monthly'));
  v_interval := greatest(coalesce(nullif(p_rule ->> 'interval', '')::integer, 1), 1);
  select coalesce(array_agg(excluded.value::date), '{}'::date[])
    into v_excluded_dates
  from jsonb_array_elements_text(
    coalesce(p_rule -> 'excluded_dates', '[]'::jsonb)
  ) excluded(value);

  select count(*)::integer into v_count
  from public.project_recurring_occurrence_dates_v1(
    v_anchor_date,
    v_frequency,
    v_interval,
    v_anchor_date,
    v_reference_date,
    v_end_date,
    v_excluded_dates
  ) occurrence_date
  where public.recurring_occurrence_confirmation_opens_at_v1(
      p_rule,
      occurrence_date
    ) <= v_wall_now
    and not exists (
      select 1
      from public.recurring_occurrences occurrence
      where occurrence.recurring_id = p_recurring_id
        and occurrence.scheduled_occurrence_date = occurrence_date
        and occurrence.status in ('confirmed', 'skipped')
    );

  return coalesce(v_count, 0);
exception when others then
  return 0;
end;
$$;

create or replace function public.recurring_read_template_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid
) returns public.expenses
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_template public.expenses%rowtype;
begin
  if coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), '')
  ) <> 'service_role' then
    raise exception 'OCCURRENCE_UNAUTHORIZED';
  end if;
  if p_actor_user_id is null or p_recurring_id is null then
    raise exception 'OCCURRENCE_INVALID_INPUT';
  end if;

  select template.* into v_template
  from public.expenses template
  where template.id = p_recurring_id
    and template.is_recurring is true
    and template.recurrence_rule is not null
    and template.deleted_at is null
    and template.provider is null
    and template.bank_account_id is null;
  if not found then raise exception 'OCCURRENCE_NOT_FOUND'; end if;

  if v_template.user_id = p_actor_user_id then
    return v_template;
  end if;
  if v_template.household_id is not null
    and v_template.privacy_scope::text = 'full'
    and public.is_member_of_household(v_template.household_id, p_actor_user_id) then
    return v_template;
  end if;

  raise exception 'OCCURRENCE_UNAUTHORIZED';
end;
$$;

create or replace function public.has_actionable_recurring_occurrences_v1(
  p_actor_user_id uuid,
  p_household_id uuid default null,
  p_currencies text[] default null
) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(
    nullif(auth.jwt() ->> 'role', ''),
    nullif(current_setting('request.jwt.claim.role', true), '')
  ) <> 'service_role' then
    raise exception 'OCCURRENCE_UNAUTHORIZED';
  end if;
  if p_actor_user_id is null then raise exception 'OCCURRENCE_INVALID_INPUT'; end if;

  return exists (
    select 1
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
      and public.recurring_latest_actionable_occurrence_v1(
        p_actor_user_id,
        template.id,
        template.recurrence_rule
      ) is not null
  );
end;
$$;

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
          'actionable_count', schedule.actionable_count
        ) as payload
      from visible_templates template
      cross join lateral (
        select
          public.recurring_next_available_occurrence_v1(
            template.id,
            template.recurrence_rule,
            public.recurring_user_wall_now_v1(p_actor_user_id)::date
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

create or replace function public.get_recurring_series_detail_v1(
  p_actor_user_id uuid,
  p_recurring_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_template public.expenses%rowtype;
begin
  v_template := public.recurring_read_template_v1(
    p_actor_user_id,
    p_recurring_id
  );
  return to_jsonb(v_template) || jsonb_build_object(
    'next_occurrence_date', public.recurring_next_available_occurrence_v1(
      v_template.id,
      v_template.recurrence_rule,
      public.recurring_user_wall_now_v1(p_actor_user_id)::date
    ),
    'latest_actionable_occurrence_date',
      public.recurring_latest_actionable_occurrence_v1(
        p_actor_user_id,
        v_template.id,
        v_template.recurrence_rule
      ),
    'actionable_count', public.recurring_actionable_occurrence_count_v1(
      p_actor_user_id,
      v_template.id,
      v_template.recurrence_rule
    )
  );
end;
$$;

create or replace function public.list_recurring_occurrences_v2(
  p_actor_user_id uuid,
  p_recurring_id uuid,
  p_before_scheduled_date date default null,
  p_limit integer default 50
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_template public.expenses%rowtype;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  v_template := public.recurring_read_template_v1(
    p_actor_user_id,
    p_recurring_id
  );

  return (
    with page as (
      select occurrence.*
      from public.recurring_occurrences occurrence
      where occurrence.recurring_id = v_template.id
        and (
          p_before_scheduled_date is null
          or occurrence.scheduled_occurrence_date < p_before_scheduled_date
        )
      order by occurrence.scheduled_occurrence_date desc
      limit v_limit + 1
    ), visible_page as (
      select page.*
      from page
      order by page.scheduled_occurrence_date desc
      limit v_limit
    ), last_visible as (
      select visible.scheduled_occurrence_date
      from visible_page visible
      order by visible.scheduled_occurrence_date
      limit 1
    )
    select jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', visible.id,
            'recurring_id', visible.recurring_id,
            'scheduled_occurrence_date', visible.scheduled_occurrence_date,
            'status', visible.status,
            'confirmation_source', visible.confirmation_source,
            'actual_transaction_id', visible.actual_transaction_id,
            'paid_date', visible.paid_date,
            'amount_cents', visible.amount_cents,
            'currency', visible.currency,
            'confirmed_at', visible.confirmed_at,
            'confirmed_by_user_id', visible.confirmed_by_user_id,
            'created_at', visible.created_at,
            'updated_at', visible.updated_at
          ) order by visible.scheduled_occurrence_date desc
        )
        from visible_page visible
      ), '[]'::jsonb),
      'has_more', (select count(*) > v_limit from page),
      'next_cursor', case
        when (select count(*) > v_limit from page) then (
          select last_visible.scheduled_occurrence_date from last_visible
        )
        else null
      end
    )
  );
end;
$$;

create or replace function public.get_recurring_occurrence_detail_v1(
  p_actor_user_id uuid,
  p_occurrence_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_occurrence public.recurring_occurrences%rowtype;
  v_template public.expenses%rowtype;
  v_actual public.expenses%rowtype;
  v_split_group public.expense_split_groups%rowtype;
begin
  if p_occurrence_id is null then raise exception 'OCCURRENCE_INVALID_INPUT'; end if;

  select occurrence.* into v_occurrence
  from public.recurring_occurrences occurrence
  where occurrence.id = p_occurrence_id;
  if not found then raise exception 'OCCURRENCE_NOT_FOUND'; end if;

  v_template := public.recurring_read_template_v1(
    p_actor_user_id,
    v_occurrence.recurring_id
  );

  if v_occurrence.actual_transaction_id is not null then
    select actual.* into v_actual
    from public.expenses actual
    where actual.id = v_occurrence.actual_transaction_id
      and actual.deleted_at is null;
  end if;
  if v_occurrence.split_group_id is not null then
    select split_group.* into v_split_group
    from public.expense_split_groups split_group
    where split_group.id = v_occurrence.split_group_id;
  end if;

  return jsonb_build_object(
    'occurrence', to_jsonb(v_occurrence),
    'transaction', case
      when v_actual.id is null then null
      else to_jsonb(v_actual)
    end,
    'split_group', case
      when v_split_group.id is null then null
      else to_jsonb(v_split_group)
    end,
    'settlement_locked', public.recurring_occurrence_has_settlement_activity_v1(
      v_actual.id,
      v_occurrence.split_group_id
    )
  );
end;
$$;

revoke all on function public.recurring_previous_occurrence_on_or_before_v1(jsonb, date) from public, anon, authenticated;
revoke all on function public.recurring_next_available_occurrence_v1(uuid, jsonb, date) from public, anon, authenticated;
revoke all on function public.recurring_latest_actionable_occurrence_v1(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.recurring_actionable_occurrence_count_v1(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.recurring_read_template_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.has_actionable_recurring_occurrences_v1(uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function public.list_recurring_series_summary_v1(uuid, uuid, text[], date, uuid, integer) from public, anon, authenticated;
revoke all on function public.get_recurring_series_detail_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.list_recurring_occurrences_v2(uuid, uuid, date, integer) from public, anon, authenticated;
revoke all on function public.get_recurring_occurrence_detail_v1(uuid, uuid) from public, anon, authenticated;

grant execute on function public.has_actionable_recurring_occurrences_v1(uuid, uuid, text[]) to service_role;
grant execute on function public.list_recurring_series_summary_v1(uuid, uuid, text[], date, uuid, integer) to service_role;
grant execute on function public.get_recurring_series_detail_v1(uuid, uuid) to service_role;
grant execute on function public.list_recurring_occurrences_v2(uuid, uuid, date, integer) to service_role;
grant execute on function public.get_recurring_occurrence_detail_v1(uuid, uuid) to service_role;
