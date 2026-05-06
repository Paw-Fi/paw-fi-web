alter table public.subscriptions
  add column if not exists app_store_in_app_ownership_type text;

alter table public.subscriptions
  drop constraint if exists subscriptions_app_store_in_app_ownership_type_check;

alter table public.subscriptions
  add constraint subscriptions_app_store_in_app_ownership_type_check
  check (
    app_store_in_app_ownership_type is null
    or app_store_in_app_ownership_type in ('FAMILY_SHARED', 'PURCHASED')
  );
