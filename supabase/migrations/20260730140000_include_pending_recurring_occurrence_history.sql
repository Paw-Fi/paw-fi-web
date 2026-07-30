-- Include unmaterialized actionable cycles in recurring payment history.
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
  v_latest_actionable date;
  v_projection_end date;
  v_anchor_date date;
  v_end_date date;
  v_frequency text;
  v_interval integer;
  v_excluded_dates date[];
begin
  v_template := public.recurring_read_template_v1(
    p_actor_user_id,
    p_recurring_id
  );
  v_latest_actionable := public.recurring_latest_actionable_occurrence_v1(
    p_actor_user_id,
    v_template.id,
    v_template.recurrence_rule
  );
  v_projection_end := case
    when v_latest_actionable is null then null
    else least(
      v_latest_actionable,
      coalesce(p_before_scheduled_date - 1, v_latest_actionable)
    )
  end;

  if v_latest_actionable is not null then
    begin
      v_anchor_date := nullif(v_template.recurrence_rule ->> 'anchor_date', '')::date;
      v_end_date := nullif(v_template.recurrence_rule ->> 'end_date', '')::date;
      v_frequency := lower(coalesce(
        nullif(v_template.recurrence_rule ->> 'frequency', ''),
        'monthly'
      ));
      v_interval := case
        when coalesce(v_template.recurrence_rule ->> 'interval', '') ~ '^[0-9]+$'
          then greatest((v_template.recurrence_rule ->> 'interval')::integer, 1)
        else 1
      end;

      select coalesce(array_agg(excluded.value::date), '{}'::date[])
        into v_excluded_dates
      from jsonb_array_elements_text(
        coalesce(v_template.recurrence_rule -> 'excluded_dates', '[]'::jsonb)
      ) excluded(value);
    exception when others then
      v_anchor_date := null;
      v_projection_end := null;
      v_excluded_dates := '{}'::date[];
    end;
  else
    v_excluded_dates := '{}'::date[];
  end if;

  return (
    with timeline as (
      select
        occurrence.scheduled_occurrence_date,
        jsonb_build_object(
          'id', occurrence.id,
          'recurring_id', occurrence.recurring_id,
          'scheduled_occurrence_date', occurrence.scheduled_occurrence_date,
          'status', occurrence.status,
          'confirmation_source', occurrence.confirmation_source,
          'actual_transaction_id', occurrence.actual_transaction_id,
          'paid_date', occurrence.paid_date,
          'amount_cents', occurrence.amount_cents,
          'currency', occurrence.currency,
          'confirmed_at', occurrence.confirmed_at,
          'confirmed_by_user_id', occurrence.confirmed_by_user_id,
          'was_skipped_before_confirmation', occurrence.was_skipped_before_confirmation,
          'created_at', occurrence.created_at,
          'updated_at', occurrence.updated_at
        ) as payload
      from public.recurring_occurrences occurrence
      where occurrence.recurring_id = v_template.id

      union all

      select
        projected.occurrence_date as scheduled_occurrence_date,
        jsonb_build_object(
          'id', 'pending:' || v_template.id::text || ':' || projected.occurrence_date::text,
          'recurring_id', v_template.id,
          'scheduled_occurrence_date', projected.occurrence_date,
          'status', 'pending',
          'confirmation_source', null,
          'actual_transaction_id', null,
          'paid_date', null,
          'amount_cents', v_template.amount_cents,
          'currency', upper(v_template.currency),
          'confirmed_at', null,
          'confirmed_by_user_id', null,
          'was_skipped_before_confirmation', false,
          'created_at', null,
          'updated_at', null
        ) as payload
      from public.project_recurring_occurrence_dates_v1(
        v_anchor_date,
        v_frequency,
        v_interval,
        v_anchor_date,
        v_projection_end,
        v_end_date,
        v_excluded_dates
      ) projected(occurrence_date)
      where not exists (
        select 1
        from public.recurring_occurrences occurrence
        where occurrence.recurring_id = v_template.id
          and occurrence.scheduled_occurrence_date = projected.occurrence_date
      )
    ), page as (
      select item.*
      from timeline item
      where p_before_scheduled_date is null
        or item.scheduled_occurrence_date < p_before_scheduled_date
      order by item.scheduled_occurrence_date desc
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
          visible.payload order by visible.scheduled_occurrence_date desc
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

revoke all on function public.list_recurring_occurrences_v2(uuid, uuid, date, integer)
  from public, anon, authenticated;
grant execute on function public.list_recurring_occurrences_v2(uuid, uuid, date, integer)
  to service_role;
