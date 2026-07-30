-- Expose skip provenance so clients can preserve a prior skip when an
-- occurrence is later unconfirmed optimistically.
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
            'was_skipped_before_confirmation', visible.was_skipped_before_confirmation,
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

revoke all on function public.list_recurring_occurrences_v2(uuid, uuid, date, integer)
  from public, anon, authenticated;
grant execute on function public.list_recurring_occurrences_v2(uuid, uuid, date, integer)
  to service_role;
