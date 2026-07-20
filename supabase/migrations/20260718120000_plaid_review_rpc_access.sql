do $$
begin
  if to_regprocedure(
    'public.get_plaid_transfer_suggestions_v1(uuid,uuid,uuid[],uuid)'
  ) is null or to_regprocedure(
    'public.get_plaid_sync_review_transactions_v1(uuid,uuid,uuid[],uuid,integer,integer)'
  ) is null or to_regprocedure(
    'public.get_plaid_sync_review_transactions_v2(uuid,uuid,uuid[],uuid,boolean,date,timestamptz,uuid,integer)'
  ) is null then
    raise exception using
      errcode = '55000',
      message = 'Missing Plaid review RPC prerequisite',
      hint = 'Run 20260717120000_plaid_atomic_sync_and_review.sql before 20260718120000_plaid_review_rpc_access.sql';
  end if;
end;
$$;

alter function public.get_plaid_transfer_suggestions_v1(
  uuid, uuid, uuid[], uuid
) security definer;
alter function public.get_plaid_transfer_suggestions_v1(
  uuid, uuid, uuid[], uuid
) set search_path = '';

alter function public.get_plaid_sync_review_transactions_v1(
  uuid, uuid, uuid[], uuid, integer, integer
) security definer;
alter function public.get_plaid_sync_review_transactions_v1(
  uuid, uuid, uuid[], uuid, integer, integer
) set search_path = '';

alter function public.get_plaid_sync_review_transactions_v2(
  uuid, uuid, uuid[], uuid, boolean, date, timestamptz, uuid, integer
) security definer;
alter function public.get_plaid_sync_review_transactions_v2(
  uuid, uuid, uuid[], uuid, boolean, date, timestamptz, uuid, integer
) set search_path = '';

revoke all on function public.get_plaid_transfer_suggestions_v1(
  uuid, uuid, uuid[], uuid
) from public, anon, authenticated;
grant execute on function public.get_plaid_transfer_suggestions_v1(
  uuid, uuid, uuid[], uuid
) to authenticated;

revoke all on function public.get_plaid_sync_review_transactions_v1(
  uuid, uuid, uuid[], uuid, integer, integer
) from public, anon, authenticated;
grant execute on function public.get_plaid_sync_review_transactions_v1(
  uuid, uuid, uuid[], uuid, integer, integer
) to authenticated;

revoke all on function public.get_plaid_sync_review_transactions_v2(
  uuid, uuid, uuid[], uuid, boolean, date, timestamptz, uuid, integer
) from public, anon, authenticated;
grant execute on function public.get_plaid_sync_review_transactions_v2(
  uuid, uuid, uuid[], uuid, boolean, date, timestamptz, uuid, integer
) to authenticated;

notify pgrst, 'reload schema';
