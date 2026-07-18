do $$
begin
  if to_regprocedure(
    'public.set_transaction_analytics_override_v1(uuid,uuid,text)'
  ) is null then
    raise exception using
      errcode = '55000',
      message = 'Missing transaction analytics override prerequisite',
      hint = 'Run 20260716230000_plaid_analytics_classification.sql before 20260718130000_plaid_classification_override_access.sql';
  end if;
end;
$$;

alter function public.set_transaction_analytics_override_v1(
  uuid, uuid, text
) security definer;
alter function public.set_transaction_analytics_override_v1(
  uuid, uuid, text
) set search_path = '';

revoke all on function public.set_transaction_analytics_override_v1(
  uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.set_transaction_analytics_override_v1(
  uuid, uuid, text
) to authenticated;

notify pgrst, 'reload schema';
