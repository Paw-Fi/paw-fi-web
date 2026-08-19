create or replace function public.detach_generated_recurring_templates_from_account(
  p_account_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.expenses e
  set
    account_id = null,
    provider_fields = jsonb_set(
      jsonb_set(
        coalesce(e.provider_fields, '{}'::jsonb),
        '{account_id}',
        'null'::jsonb,
        true
      ),
      '{template_fields}',
      case
        when jsonb_typeof(e.provider_fields -> 'template_fields') = 'object'
          then (e.provider_fields -> 'template_fields') || jsonb_build_object('account_id', null)
        else jsonb_build_object('account_id', null)
      end,
      true
    ),
    user_overrides = coalesce(e.user_overrides, '{}'::jsonb) - 'account_id',
    updated_at = now()
  where e.account_id = p_account_id
    and e.is_recurring is true
    and e.idempotency_key like 'bank-recurring:v1:%'
    and e.provider_fields ->> 'source' = 'plaid_recurring_template'
    and e.deleted_reason is distinct from 'user_deleted';

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.detach_generated_recurring_templates_on_account_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.detach_generated_recurring_templates_from_account(new.id);
  return new;
end;
$$;

drop trigger if exists accounts_detach_generated_recurring_templates_on_archive
  on public.accounts;

create trigger accounts_detach_generated_recurring_templates_on_archive
after update of is_archived on public.accounts
for each row
when (new.is_archived is true and old.is_archived is distinct from true)
execute function public.detach_generated_recurring_templates_on_account_archive();

do $$
declare
  v_account_id uuid;
begin
  for v_account_id in
    select distinct e.account_id
    from public.expenses e
    left join public.accounts a on a.id = e.account_id
    where e.account_id is not null
      and e.is_recurring is true
      and e.idempotency_key like 'bank-recurring:v1:%'
      and e.provider_fields ->> 'source' = 'plaid_recurring_template'
      and e.deleted_reason is distinct from 'user_deleted'
      and (a.id is null or a.is_archived)
  loop
    perform public.detach_generated_recurring_templates_from_account(v_account_id);
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1
    from public.expenses e
    left join public.accounts a on a.id = e.account_id
    where e.account_id is not null
      and e.is_recurring is true
      and e.idempotency_key like 'bank-recurring:v1:%'
      and e.provider_fields ->> 'source' = 'plaid_recurring_template'
      and e.deleted_reason is distinct from 'user_deleted'
      and (a.id is null or a.is_archived)
  ) then
    raise exception
      'Generated Plaid recurring template remains bound to an unavailable account';
  end if;
end;
$$;

revoke all on function public.detach_generated_recurring_templates_from_account(uuid)
  from public, anon, authenticated;
grant execute on function public.detach_generated_recurring_templates_from_account(uuid)
  to service_role;

revoke all on function public.detach_generated_recurring_templates_on_account_archive()
  from public, anon, authenticated;
