-- The channel backend supplies the verified actor. PostgREST's authenticator
-- can switch to the authenticated role for the duration of the read.
begin;
create or replace function public.chat_bank_status_v1(p_space uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('connections',coalesce(jsonb_agg(jsonb_build_object(
    'provider',b.provider,'status',b.status,'last_successful_sync_at',b.last_successful_sync_at,
    'relink_state',b.relink_state) order by b.id),'[]'))
  from public.bank_connections b where b.removed_at is null and b.household_id is not distinct from p_space
    and ((p_space is null and b.user_id=auth.uid()) or exists (
      select 1 from public.household_members m where m.household_id=p_space and m.user_id=auth.uid()));
$$;
revoke all on function public.chat_bank_status_v1(uuid) from public,anon;
grant execute on function public.chat_bank_status_v1(uuid) to authenticated;
create or replace function public.read_chat_finance_v1(
  p_actor uuid, p_read text, p_space uuid default null, p_args jsonb default '{}'
) returns jsonb language plpgsql stable security invoker
set search_path = ''
as $$
declare
  v_caller_db_role text := current_setting('role');
  v_caller_claims text := current_setting('request.jwt.claims', true);
  v_caller_sub text := current_setting('request.jwt.claim.sub', true);
  v_caller_role text := current_setting('request.jwt.claim.role', true);
  v_scope text := 'personal';
  v_currency text := upper(nullif(p_args->>'currency',''));
  v_start date := (p_args->>'start_date')::date;
  v_end date := (p_args->>'end_date')::date;
  v_wallet uuid := (p_args->>'account_id')::uuid;
  v_limit int := greatest(1, least(coalesce((p_args->>'limit')::int,25),100));
  v_result jsonb;
  v_rows jsonb;
  v_page jsonb;
  v_visible jsonb := '[]';
  v_cursor jsonb := p_args->'cursor';
  v_last jsonb;
  v_spent bigint;
  v_original_budget bigint;
  v_available bigint;
  v_allocated bigint;
begin
  if p_actor is null then raise insufficient_privilege; end if;
  -- All financial queries below run with authenticated privileges and RLS.
  perform set_config('role', 'authenticated', true);
  -- Bind both PostgREST claim formats only for this verified invocation.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_actor::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',p_actor,'role','authenticated')::text, true);
  if p_space is not null then
    select case when h.is_portfolio then 'portfolio' else 'household' end into v_scope
      from public.households h join public.household_members m on m.household_id=h.id
      where m.user_id=p_actor and h.id=p_space;
    if not found then raise insufficient_privilege; end if;
  end if;
  case p_read
    when 'spaces' then
      select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'name',h.name,'is_portfolio',h.is_portfolio,'role',m.role)
        order by h.name,h.id),'[]') into v_rows from public.household_members m
        join public.households h on h.id=m.household_id where m.user_id=p_actor;
      v_result := jsonb_build_object('spaces',v_rows);
    when 'wallet_history' then
      v_result := public.get_wallets_history_v2(p_actor,p_space,v_currency,v_start);
      v_result := jsonb_build_object('net_worth_series',v_result->'net_worth_series','includes_scheduled',true);
    when 'transactions' then
      loop
        v_result := public.get_user_transactions_page_v6(
          p_actor,p_space,v_currency,null,p_args->>'category',v_wallet,false,null,
          coalesce(p_args->>'type','all'),p_args->>'search',v_start,v_end,v_limit+1,
          (v_cursor->>'date')::date,(v_cursor->>'created_at')::timestamptz,v_cursor->>'id');
        -- Enrichment layers may add identifiers or merchant metadata after the
        -- feed has redacted a row. Only include visible records and safe fields.
        select coalesce(jsonb_agg(jsonb_build_object(
          'id',i->>'id','household_id',p_space,'date',i->'date','created_at',i->'created_at',
          'amount_cents',i->'amount_cents','currency',i->'currency','type',i->'type',
          'raw_text',coalesce(i->>'raw_text',i->>'merchant'),'category',i->'category',
          'is_recurring',i->'is_recurring') order by n),'[]') into v_rows
        from jsonb_array_elements(v_result->'items') with ordinality r(i,n)
        where case when i->>'id' like 'transfer:%' then exists (
          select 1 from public.account_transfers t where t.id=split_part(i->>'id',':',2)::uuid
            and t.household_id is not distinct from p_space)
          else exists (
            select 1 from public.expenses e where e.id=(i->>'id')::uuid and e.deleted_at is null
              and e.household_id is not distinct from p_space
              and (p_space is null or e.user_id=p_actor or e.privacy_scope='full')) end;
        v_visible := v_visible || v_rows;
        exit when jsonb_array_length(v_visible)>v_limit or not (v_result->>'has_more')::boolean;
        v_page := v_result->'next_cursor';
        if v_page->>'id' is null or v_page=v_cursor then raise exception 'Invalid transaction cursor'; end if;
        v_cursor := v_page;
      end loop;
      select coalesce(jsonb_agg(i order by n),'[]') into v_rows
        from jsonb_array_elements(v_visible) with ordinality r(i,n) where n<=v_limit;
      v_last := v_rows->-1;
      v_result := jsonb_build_object('items',v_rows,'has_more',jsonb_array_length(v_visible)>v_limit,
        'next_cursor',case when jsonb_array_length(v_visible)>v_limit then jsonb_build_object(
          'date',v_last->'date','created_at',v_last->'created_at','id',v_last->'id') end);
    when 'summary' then
      if v_currency is null or v_start is null or v_end is null or v_end<v_start then
        raise exception 'Invalid summary period or currency'; end if;
      v_result := public.get_user_transactions_summary_v2(
        p_actor,p_space,v_currency,null,p_args->>'category',v_wallet,false,null,
        'all',p_args->>'search',v_start,v_end,null);
      v_result := jsonb_build_object('expense_total_cents',v_result->'expense_total_cents',
        'income_total_cents',v_result->'income_total_cents','categories',v_result->'category_summaries');
    when 'recurring_scope' then
      v_result := jsonb_build_object('available',exists(select 1 from public.expenses e
        where e.id=(p_args->>'series_id')::uuid and e.household_id is not distinct from p_space
          and e.is_recurring and e.deleted_at is null and (e.user_id=p_actor or (p_space is not null and e.privacy_scope='full'))));
    when 'projections' then
      if v_currency is null or v_start is null or v_end is null or v_end<v_start or v_end-v_start>730 then
        raise exception 'Choose a projection period of up to two years'; end if;
      with projected as materialized (
        select r.*,e.date as template_date from public.get_projected_scoped_recurring_expenses_v1(
          p_actor,v_scope,p_space,v_currency,v_start,v_end) r
        join public.expenses e on e.id=r.recurring_id
        where (p_space is null or e.user_id=p_actor or e.privacy_scope='full')
          and (v_wallet is null or r.account_id=v_wallet)
          and (p_args->>'category' is null or lower(r.category)=lower(p_args->>'category'))
          and (coalesce(p_args->>'search','')='' or concat_ws(' ',r.raw_text,r.category)
            ilike '%' || (p_args->>'search') || '%')
          and not exists (select 1 from public.recurring_occurrences o where
            o.recurring_id=r.recurring_id and o.scheduled_occurrence_date=r.date and o.status in ('skipped','confirmed'))
      ) select jsonb_build_object('count',count(*),
        'items',coalesce((select jsonb_agg(to_jsonb(l) order by l.date,l.id) from (
          select id,recurring_id,date,template_date,amount_cents,currency,category,type,raw_text,household_id
          from projected order by date,id limit 25) l),'[]')) into v_result from projected;
    when 'pockets' then
      v_result := public.get_pockets_month_v4(p_actor,v_scope,v_start,p_space,v_currency,false,false);
      select coalesce(jsonb_agg(jsonb_build_object('name',e->'name','currency',coalesce(e->>'currency',v_result->>'selected_currency'),
        'base_budget_amount_cents',e->'base_budget_amount_cents','rollover_from_previous_cents',e->'rollover_from_previous_cents',
        'opening_rollover_cents',e->'opening_rollover_cents','available_budget_cents',e->'available_budget_cents',
        'spent_cents',e->'spent_cents','remaining_cents',e->'remaining_cents')),'[]')
        into v_rows from jsonb_array_elements(v_result->'envelopes') e;
      v_start := (v_result->>'period_month')::date;
      v_original_budget := (v_result#>>'{budget,total_budget_cents}')::bigint;
      if v_original_budget is not null then
        v_end := public.next_financial_cycle_start(v_start,public.user_financial_month_start_day(p_actor))-1;
        v_spent := (public.get_user_transactions_summary_v2(p_actor,p_space,v_currency,null,null,null,false,null,
          'all',null,v_start,v_end,null)->>'expense_total_cents')::bigint;
        select sum((e->>'base_budget_amount_cents')::bigint),
          case when bool_or((e->>'rollover_enabled')::boolean) then nullif(sum((e->>'available_budget_cents')::bigint),0) end
          into v_allocated,v_available from jsonb_array_elements(v_result->'envelopes') e;
        v_available := coalesce(v_available,v_original_budget);
      end if;
      v_result := jsonb_build_object('period_month',v_start,'currency',v_result->'selected_currency',
        'total_budget_cents',v_original_budget,'pockets',v_rows,'totals',case when v_original_budget is not null then
          jsonb_build_object('budget_cents',v_available,'allocated_cents',coalesce(v_allocated,0),
            'spent_cents',v_spent,'remaining_cents',greatest(v_available-v_spent,0)) end);
    when 'settlements' then
      if p_space is null then raise exception 'A shared Space is required'; end if;
      select coalesce(jsonb_agg(jsonb_build_object('member',coalesce(u.full_name,'Space member'),
        'currency',b.currency,'net_cents',b.net_cents,'split_to_cents',b.split_to_cents,
        'split_from_cents',b.split_from_cents,'paid_to_cents',b.paid_to_cents,'paid_from_cents',b.paid_from_cents)),'[]')
        into v_rows from public.households_get_pairwise_settlement_balances_v2(p_space,v_currency) b
        left join public.users u on u.id=b.other_user_id;
      v_result := jsonb_build_object('balances',v_rows);
    when 'goals' then
      select coalesce(jsonb_agg(jsonb_build_object('title',g.title,'status',g.status,'currency',g.currency,
        'target_amount',g.target_amount,'current_amount',g.current_amount,'target_date',g.target_date)),'[]')
        into v_rows from public.financial_goals g where g.household_id is not distinct from p_space
          and (g.user_id=p_actor or (p_space is not null and g.privacy_scope='full'));
      v_result := jsonb_build_object('goals',v_rows);
    when 'bank_status' then
      v_result := public.chat_bank_status_v1(p_space);
    when 'import_status' then
      select coalesce(jsonb_agg(to_jsonb(j) order by j.created_at desc),'[]') into v_rows from (
        select file_name,status,total,processed,imported,skipped,created_at from public.file_import_jobs
        where user_id=p_actor and household_id is not distinct from p_space order by created_at desc limit 10) j;
      v_result := jsonb_build_object('recent_imports',v_rows);
    else raise exception 'Unknown financial read';
  end case;

  -- A transaction may call this RPC more than once. Restore the incoming
  -- claims and role before returning. Errors roll the local settings back with the call.
  perform set_config('request.jwt.claims', v_caller_claims, true);
  perform set_config('request.jwt.claim.sub', v_caller_sub, true);
  perform set_config('request.jwt.claim.role', v_caller_role, true);
  perform set_config('role', v_caller_db_role, true);
  return v_result;
end;
$$;
revoke all on function public.read_chat_finance_v1(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.read_chat_finance_v1(uuid,text,uuid,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
