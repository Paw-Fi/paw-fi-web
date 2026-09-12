-- DEV DATABASE ONLY. Run once, immediately before applying
-- 20260912120000_optimize_pockets_month_v3.sql.
-- Do not add this to the migration history and never run it in production.

do $$
begin
  if to_regprocedure('public.get_pockets_month_v3_baseline(uuid,text,date,uuid,text,boolean,boolean)') is not null then
    raise exception 'Dev baseline already exists; do not overwrite it';
  end if;

  alter function public.get_pockets_month_v3(
    uuid, text, date, uuid, text, boolean, boolean
  ) rename to get_pockets_month_v3_baseline;
end;
$$;
