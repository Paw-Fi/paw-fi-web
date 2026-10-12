-- Read-only rollout prerequisite. No historical split/event/request is rewritten.
-- Scalar JSON snapshots are not truncated by PostgREST's set-returning row cap.
create index if not exists idx_household_settlement_request_event_identity
  on public.household_settlement_requests_v2(settlement_event_id, actor_user_id)
  where terminal_status = 'applied';
create or replace function public.households_get_split_groups_snapshot_v1(
  p_household_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_actor is null or not public.is_member_of_household(p_household_id, v_actor) then
    raise exception 'Unauthorized household split access' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('household:' || p_household_id::text, 0));
  if exists (
    select 1 from public.expense_split_groups g
    join public.expenses e on e.id = g.expense_id and e.deleted_at is null
    where g.household_id = p_household_id and g.is_recurring_template is false
      and not exists (select 1 from public.household_settlement_finalized_split_groups f
        where f.split_group_id = g.id)
  ) then
    raise exception 'settlement_data_incomplete_split_group';
  end if;
  select jsonb_build_object(
    'household_id', p_household_id, 'actor_user_id', v_actor,
    'split_count', count(*),
    'splits', coalesce(jsonb_agg(rows.payload order by rows.created_at desc, rows.id), '[]'::jsonb)
  ) into v_result
  from (
    select g.id, g.created_at, to_jsonb(g) || jsonb_build_object(
      'expense_deleted', exists (select 1 from public.expenses e
        where e.id = g.expense_id and e.deleted_at is not null),
      'expense_split_lines', coalesce((
        select jsonb_agg(to_jsonb(l) order by l.user_id, l.id)
        from public.expense_split_lines l where l.split_group_id = g.id
      ), '[]'::jsonb)
    ) as payload
    from public.expense_split_groups g where g.household_id = p_household_id
  ) rows;
  return v_result;
end;
$$;

create or replace function public.households_get_settlement_events_snapshot_v1(
  p_household_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_actor is null or not public.is_member_of_household(p_household_id, v_actor) then
    raise exception 'Unauthorized household settlement access' using errcode = '42501';
  end if;
  -- Event and receipt commit together in the existing settlement write RPC.
  -- Do not expose private request payloads, snapshots, or unrelated members' events.
  select jsonb_build_object(
    'household_id', p_household_id, 'actor_user_id', v_actor,
    'event_count', count(*),
    'events', coalesce(jsonb_agg(rows.payload order by rows.created_at desc, rows.id), '[]'::jsonb)
  ) into v_result
  from (
    select e.id, e.created_at, jsonb_build_object(
      'id', e.id, 'household_id', e.household_id, 'created_at', e.created_at,
      'payer_user_id', e.payer_user_id, 'participant_user_id', e.participant_user_id,
      'actor_user_id', e.actor_user_id, 'amount_cents', e.amount_cents,
      'currency', e.currency, 'is_express_netting', e.is_express_netting,
      'settlement_note', e.settlement_note,
      'client_mutation_id', (
        select r.client_mutation_id from public.household_settlement_requests_v2 r
        where r.settlement_event_id = e.id and r.actor_user_id = e.actor_user_id
          and r.household_id = e.household_id and r.terminal_status = 'applied'
        order by r.client_mutation_id limit 1
      )
    ) as payload
    from public.household_settlement_events e
    where e.household_id = p_household_id
      and (e.payer_user_id = v_actor or e.participant_user_id = v_actor)
  ) rows;
  return v_result;
end;
$$;

revoke all on function public.households_get_split_groups_snapshot_v1(uuid) from public, anon;
revoke all on function public.households_get_settlement_events_snapshot_v1(uuid) from public, anon;
grant execute on function public.households_get_split_groups_snapshot_v1(uuid) to authenticated;
grant execute on function public.households_get_settlement_events_snapshot_v1(uuid) to authenticated;
