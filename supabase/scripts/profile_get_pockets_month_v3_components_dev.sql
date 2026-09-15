-- DEV DATABASE ONLY. Read-only; the temporary function disappears on ROLLBACK.

begin;

select set_config('request.jwt.claim.sub', '4f42e85a-4637-41fb-8fc5-f81933c83861', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

create function pg_temp.profile_pockets_v3_components()
returns jsonb
language plpgsql
as $$
declare
  v_started_at timestamptz;
  v_result jsonb := '{}'::jsonb;
  v_user_id uuid := '4f42e85a-4637-41fb-8fc5-f81933c83861'::uuid;
  v_budget_month date := date '2026-08-01';
  v_period_start date := public.financial_cycle_start_for_month(
    v_budget_month,
    public.user_financial_month_start_day(v_user_id)
  );
  v_targets uuid[] := array[
    'b1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000002'::uuid,
    'b1000000-0000-4000-8000-000000000003'::uuid,
    'b1000000-0000-4000-8000-000000000004'::uuid
  ];
begin
  v_started_at := clock_timestamp();
  perform public.get_pockets_month_v3_baseline(
    v_user_id, 'personal', v_budget_month, null, 'USD', true, false
  );
  v_result := v_result || jsonb_build_object(
    'baseline_v3_ms', extract(epoch from clock_timestamp() - v_started_at) * 1000
  );

  v_started_at := clock_timestamp();
  perform public.get_pockets_month_v2_financial_impl(
    v_user_id, 'personal', v_period_start, null, 'USD', true, false
  );
  v_result := v_result || jsonb_build_object(
    'financial_impl_ms', extract(epoch from clock_timestamp() - v_started_at) * 1000
  );

  v_started_at := clock_timestamp();
  perform public.get_pockets_month_structure_v1(
    v_user_id, 'personal', v_budget_month, null, 'USD', false
  );
  v_result := v_result || jsonb_build_object(
    'anchor_structure_ms', extract(epoch from clock_timestamp() - v_started_at) * 1000
  );

  v_started_at := clock_timestamp();
  perform public.get_pockets_month_structure_v1(
    v_user_id, 'personal', (v_budget_month - interval '1 month')::date, null, 'USD', false
  );
  v_result := v_result || jsonb_build_object(
    'previous_structure_ms', extract(epoch from clock_timestamp() - v_started_at) * 1000
  );

  v_started_at := clock_timestamp();
  perform public.calculate_pocket_rollovers_batch_v1(
    v_user_id, 'personal', null, 'USD', v_budget_month, v_targets
  );
  v_result := v_result || jsonb_build_object(
    'batch_rollover_ms', extract(epoch from clock_timestamp() - v_started_at) * 1000
  );

  v_started_at := clock_timestamp();
  perform public.get_pockets_month_v3_baseline(
    v_user_id, 'personal', v_budget_month, null, 'USD', true, false
  );
  v_result := v_result || jsonb_build_object(
    'baseline_v3_warm_ms', extract(epoch from clock_timestamp() - v_started_at) * 1000
  );

  v_started_at := clock_timestamp();
  perform public.get_pockets_month_v3(
    v_user_id, 'personal', v_budget_month, null, 'USD', true, false
  );
  return v_result || jsonb_build_object(
    'optimized_v3_ms', extract(epoch from clock_timestamp() - v_started_at) * 1000
  );
end;
$$;

select pg_temp.profile_pockets_v3_components() as component_timings;

rollback;
