-- Map Plaid-resolved merchant data into the existing merchant schema. Plaid's
-- full response remains in provider payloads; no merchants columns are added.

create or replace function public.extract_plaid_merchant_enrichment(
  p_payload jsonb
) returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_counterparty jsonb;
  v_name text;
  v_website text;
  v_domain text;
  v_logo_url text;
  v_entity_id text;
begin
  if jsonb_typeof(p_payload) <> 'object' then return null; end if;
  select counterparty into v_counterparty
  from jsonb_array_elements(case
    when jsonb_typeof(p_payload -> 'counterparties') = 'array'
      then p_payload -> 'counterparties'
    else '[]'::jsonb
  end) counterparty
  where lower(nullif(btrim(counterparty ->> 'type'), '')) = 'merchant'
  limit 1;

  v_name := coalesce(
    nullif(btrim(p_payload ->> 'merchant_name'), ''),
    nullif(btrim(v_counterparty ->> 'name'), '')
  );
  v_entity_id := coalesce(
    nullif(btrim(p_payload ->> 'merchant_entity_id'), ''),
    nullif(btrim(v_counterparty ->> 'entity_id'), '')
  );
  v_website := coalesce(
    nullif(btrim(p_payload ->> 'website'), ''),
    nullif(btrim(v_counterparty ->> 'website'), '')
  );
  v_domain := nullif(lower(btrim(regexp_replace(
    regexp_replace(coalesce(v_website, ''), '^https?://', '', 'i'),
    '[/#?].*$', ''
  ))), '');
  v_domain := regexp_replace(v_domain, '^www[.]', '', 'i');
  if v_domain !~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:[.][a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$' then
    v_domain := null;
  end if;
  v_logo_url := coalesce(
    nullif(btrim(p_payload ->> 'logo_url'), ''),
    nullif(btrim(v_counterparty ->> 'logo_url'), '')
  );
  if v_logo_url !~ '^https://plaid-(merchant|counterparty)-logos[.]plaid[.]com/' then
    v_logo_url := null;
  end if;
  if v_name is null then return null; end if;
  return jsonb_build_object(
    'name', v_name,
    'domain', v_domain,
    'website', v_website,
    'logo_url', v_logo_url,
    'external_entity_id', v_entity_id
  );
end;
$$;

drop function if exists public.expense_merchant_logo_url(
  public.expenses,
  public.merchants
);

create or replace function public.expense_merchant_logo_url(
  p_logo_identifier text
) returns text
language sql
immutable
set search_path = public
as $$
  select case
    when nullif(btrim(p_logo_identifier), '')
      ~ '^https://plaid-(merchant|counterparty)-logos[.]plaid[.]com/'
      then nullif(btrim(p_logo_identifier), '')
    else null
  end;
$$;

create or replace function public.apply_plaid_merchant_enrichment_to_expense()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_bank_account_id uuid;
  v_provider_transaction_id text;
  v_provider_payload jsonb;
  v_enrichment jsonb;
  v_name text;
  v_domain text;
  v_logo_url text;
  v_descriptor_key text;
  v_structured_key text;
  v_context_key text;
  v_override_action text;
  v_override_merchant_id uuid;
  v_merchant_id uuid;
begin
  if new.provider = 'plaid' then
    v_bank_account_id := new.bank_account_id;
    v_provider_transaction_id := new.provider_transaction_id;
  elsif new.provider_fields ->> 'source' = 'plaid_recurring_template' then
    v_bank_account_id := nullif(new.provider_fields ->> 'bank_account_id', '')::uuid;
    v_provider_transaction_id := nullif(new.provider_fields ->> 'provider_transaction_id', '');
  else
    return new;
  end if;
  if v_bank_account_id is null or v_provider_transaction_id is null then return new; end if;

  select raw.payload into v_provider_payload
  from public.bank_transaction_raw raw
  join public.bank_accounts account on account.id = raw.bank_account_id
  where raw.bank_account_id = v_bank_account_id
    and raw.provider = 'plaid'
    and raw.provider_transaction_id = v_provider_transaction_id
    and account.user_id = new.user_id
    and account.provider = 'plaid';
  if v_provider_payload is null then return new; end if;

  v_enrichment := public.extract_plaid_merchant_enrichment(v_provider_payload);
  if v_enrichment is null then return new; end if;
  v_name := v_enrichment ->> 'name';
  v_domain := nullif(v_enrichment ->> 'domain', '');
  v_logo_url := nullif(v_enrichment ->> 'logo_url', '');
  new.raw_provider_payload := coalesce(new.raw_provider_payload, '{}'::jsonb)
    || jsonb_build_object('merchant_enrichment', v_enrichment);
  if not (coalesce(new.user_overrides, '{}'::jsonb) ? 'merchant')
     and not (coalesce(new.user_overrides, '{}'::jsonb) ? 'merchant_structured_name') then
    new.merchant_structured_name := v_name;
  end if;
  v_descriptor_key := public.expense_merchant_resolution_descriptor_key(
    new.merchant, new.raw_text, new.bank_account_id
  );
  v_structured_key := public.merchant_resolution_descriptor_key(v_name, null, false);
  v_context_key := public.expense_merchant_evidence_context_key(new.merchant, new.bank_account_id);
  select selected.action, selected.merchant_id
  into v_override_action, v_override_merchant_id
  from (
    select override.action, override.merchant_id, 1 as priority
    from public.merchant_user_overrides override
    where v_descriptor_key is not null
      and override.user_id = new.user_id
      and override.normalized_pattern = v_descriptor_key
      and override.evidence_context_key = v_context_key
    union all
    select override.action, override.merchant_id, 2 as priority
    from public.merchant_user_overrides override
    where v_structured_key is not null
      and override.user_id = new.user_id
      and override.normalized_pattern = v_structured_key
      and override.evidence_context_key = 'structured_merchant_name'
  ) selected order by selected.priority limit 1;
  if v_override_action = 'suppress' then
    new.merchant_id := null;
    return new;
  end if;
  if v_override_action = 'map' and v_override_merchant_id is not null then
    new.merchant_id := v_override_merchant_id;
    if v_logo_url is not null and v_domain is not null then
      update public.merchants
      set logo_identifier = v_logo_url, updated_at = now()
      where id = v_override_merchant_id and domain = v_domain
        and logo_identifier is distinct from v_logo_url;
    end if;
    return new;
  end if;

  if new.merchant_id is not null then
    if v_logo_url is not null and v_domain is not null then
      update public.merchants
      set logo_identifier = v_logo_url, updated_at = now()
      where id = new.merchant_id and domain = v_domain
        and logo_identifier is distinct from v_logo_url;
    end if;
    return new;
  end if;
  if v_domain is null then return new; end if;
  select id into v_merchant_id from public.merchants where domain = v_domain;
  if v_merchant_id is null then
    begin
      insert into public.merchants (
        canonical_name, normalized_name, domain, logo_provider,
        logo_identifier, confidence, verification_status, resolution_source
      ) values (
        v_name, public.merchant_resolution_descriptor_key(v_name, null, false),
        v_domain, 'logo_dev', coalesce(v_logo_url, v_domain), 0.990,
        'automatic', 'evidenced_domain'
      ) returning id into v_merchant_id;
    exception when unique_violation then
      select id into v_merchant_id from public.merchants where domain = v_domain;
    end;
  end if;
  if v_merchant_id is not null and v_logo_url is not null then
    update public.merchants
    set logo_identifier = v_logo_url, updated_at = now()
    where id = v_merchant_id and domain = v_domain
      and logo_identifier is distinct from v_logo_url;
  end if;
  new.merchant_id := v_merchant_id;
  return new;
end;
$$;

drop trigger if exists merchant_identity_z_apply_plaid_enrichment on public.expenses;
create trigger merchant_identity_z_apply_plaid_enrichment
before insert or update of raw_provider_payload, provider_fields on public.expenses
for each row execute function public.apply_plaid_merchant_enrichment_to_expense();

drop trigger if exists merchant_resolution_jobs_enqueue_trigger on public.expenses;
create trigger merchant_resolution_jobs_enqueue_trigger
after insert or update of merchant, raw_text, merchant_structured_name,
  merchant_id, bank_account_id, deleted_at, raw_provider_payload, provider_fields
on public.expenses
for each row execute function public.enqueue_merchant_resolution_for_expense();

create or replace function public.enrich_merchant_identity_items(p_items jsonb)
returns jsonb language sql stable set search_path = public as $$
  with items as (
    select value, ordinality,
      case when value ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (value ->> 'id')::uuid end as expense_id
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality
  )
  select coalesce(jsonb_agg(items.value || jsonb_build_object(
    'merchant_id', expense.merchant_id,
    'merchant_domain', merchant.domain,
    'merchant_structured_name', expense.merchant_structured_name,
    'merchant_logo_url', public.expense_merchant_logo_url(merchant.logo_identifier)
  ) order by items.ordinality), '[]'::jsonb)
  from items
  left join public.expenses expense on expense.id = items.expense_id
  left join public.merchants merchant on merchant.id = expense.merchant_id;
$$;

create or replace function public.get_recurring_series_detail_v2(
  p_actor_user_id uuid,
  p_recurring_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_payload jsonb;
begin
  v_payload := public.get_recurring_series_detail_v1(p_actor_user_id, p_recurring_id);
  return public.enrich_merchant_identity_items(jsonb_build_array(v_payload)) -> 0;
end;
$$;

create or replace function public.get_user_analytics_v2(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_payload jsonb;
begin
  v_payload := public.get_user_analytics(p_user_id)::jsonb;
  return jsonb_set(
    v_payload,
    '{expenses}',
    public.enrich_merchant_identity_items(v_payload -> 'expenses'),
    true
  )::json;
end;
$$;

revoke execute on function public.get_user_analytics_v2(uuid)
from public, anon;
grant execute on function public.get_user_analytics_v2(uuid)
to authenticated;

create or replace function public.get_home_mom_transactions_v5(
  p_user_id uuid,
  p_start_date date default null,
  p_end_date date default null,
  p_before_date date default null,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 1000
) returns table (
  id text,
  contact_id uuid,
  user_id uuid,
  household_id uuid,
  date date,
  amount_cents bigint,
  currency text,
  category text,
  created_at timestamptz,
  updated_at timestamptz,
  raw_text text,
  split_group_id uuid,
  bank_account_id uuid,
  type text,
  analytics_class text,
  analytics_is_final boolean,
  analytics_spending_multiplier smallint,
  analytics_counts_toward_income boolean,
  is_recurring boolean,
  merchant text,
  merchant_id uuid,
  merchant_domain text,
  merchant_logo_url text,
  merchant_structured_name text
)
language sql
security invoker
set search_path = ''
as $$
  select
    item.id,
    item.contact_id,
    item.user_id,
    item.household_id,
    item.date,
    item.amount_cents,
    item.currency,
    item.category,
    item.created_at,
    item.updated_at,
    item.raw_text,
    item.split_group_id,
    item.bank_account_id,
    item.type,
    item.analytics_class,
    item.analytics_is_final,
    item.analytics_spending_multiplier,
    item.analytics_counts_toward_income,
    item.is_recurring,
    item.merchant,
    item.merchant_id,
    item.merchant_domain,
    case
      when nullif(btrim(merchant.logo_identifier), '')
        ~ '^https://plaid-(merchant|counterparty)-logos[.]plaid[.]com/'
        then nullif(btrim(merchant.logo_identifier), '')
      else null
    end,
    item.merchant_structured_name
  from public.get_home_mom_transactions_v4(
    p_user_id,
    p_start_date,
    p_end_date,
    p_before_date,
    p_before_created_at,
    p_before_id,
    p_limit
  ) item
  join public.expenses expense on expense.id::text = item.id
  left join public.merchants merchant on merchant.id = expense.merchant_id;
$$;

revoke all on function public.get_home_mom_transactions_v5(
  uuid, date, date, date, timestamptz, uuid, integer
) from public, anon;
grant execute on function public.get_home_mom_transactions_v5(
  uuid, date, date, date, timestamptz, uuid, integer
) to authenticated;

create or replace function public.backfill_plaid_merchant_enrichment_batch(
  p_batch_size integer default 250
) returns integer language plpgsql security definer set search_path = public as $$
declare v_updated integer;
begin
  with candidates as (
    select expense.id
    from public.expenses expense
    join public.bank_transaction_raw raw
      on raw.bank_account_id = expense.bank_account_id
      and raw.provider = 'plaid'
      and raw.provider_transaction_id = expense.provider_transaction_id
    where expense.provider = 'plaid' and expense.deleted_at is null
      and expense.raw_provider_payload #>> '{merchant_enrichment,name}' is null
    order by expense.id limit least(greatest(coalesce(p_batch_size, 250), 1), 1000)
    for update of expense skip locked
  )
  update public.expenses expense
  set raw_provider_payload = coalesce(expense.raw_provider_payload, '{}'::jsonb)
  from candidates where expense.id = candidates.id;
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.backfill_plaid_merchant_enrichment_batch(integer)
from public, anon, authenticated;
grant execute on function public.backfill_plaid_merchant_enrichment_batch(integer) to service_role;
revoke all on function public.expense_merchant_logo_url(text)
from public, anon, authenticated;

notify pgrst, 'reload schema';
