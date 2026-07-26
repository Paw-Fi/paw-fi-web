-- This is the rollout prerequisite for migrating legacy recurring split debt.
-- Only explicitly marked future-template groups are excluded. Existing legacy
-- groups remain unmarked and therefore retain their current settlement effect.

do $$
declare
  v_function regprocedure;
  v_definition text;
  v_updated text;
  v_expected text := E'and expense.deleted_at is null';
  v_replacement text := E'and expense.deleted_at is null\n       and split_group.is_recurring_template is false';
begin
  foreach v_function in array array[
    'public.households_get_pairwise_settlement_balances_v2(uuid,text)'::regprocedure,
    'public.households_get_settlement_breakdown_share_projection_v3(uuid,uuid,text)'::regprocedure,
    'public.households_settle_amount_and_notify_v3_internal(uuid,uuid,text,bigint,text,text,text,text)'::regprocedure,
    'public.households_allocate_settlement_event_v2(uuid,text)'::regprocedure,
    'public.households_capture_full_settlement_cycle_v3()'::regprocedure,
    'public.households_build_settlement_snapshot_v3(uuid,uuid,uuid,text)'::regprocedure
  ] loop
    select pg_get_functiondef(v_function) into v_definition;
    v_updated := replace(v_definition, v_expected, v_replacement);

    if v_updated = v_definition then
      raise exception
        'Recurring split template settlement patch could not find expected expense join in %',
        v_function::text;
    end if;

    execute v_updated;
  end loop;
end;
$$;

comment on column public.expense_split_groups.is_recurring_template is
  'True only for future recurring split configuration. Settlement reads, completeness checks, allocations, and cycle baselines exclude these groups.';
