create or replace function public.apply_correlated_plaid_classification_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_account_type text;
  v_amount numeric;
  v_classification record;
  v_has_correlated_transfer boolean;
  v_has_correlated_merchant_spend boolean;
begin
  if new.provider is distinct from 'plaid'
    or new.classification_source = 'user_override'
    or coalesce(new.provider_transaction_code, '') in (
      'atm', 'cash', 'cash advance', 'cashback', 'transfer', 'refund',
      'bank charge', 'late fee', 'membership fee', 'returned item fee',
      'adjustment', 'purchase'
    ) then
    return new;
  end if;

  select ba.type into v_account_type
  from public.bank_accounts ba
  where ba.id = new.bank_account_id;

  v_amount := case
    when jsonb_typeof(new.raw_provider_payload -> 'amount') = 'number'
      then (new.raw_provider_payload ->> 'amount')::numeric
    when lower(coalesce(new.type::text, 'expense')) = 'income'
      then -(abs(new.amount_cents)::numeric / 100.0)
    else abs(new.amount_cents)::numeric / 100.0
  end;

  select * into v_classification
  from public.classify_plaid_transaction_v1(
    v_amount,
    coalesce(new.provider_pending, false),
    new.provider_pfc_primary,
    new.provider_transaction_code,
    v_account_type
  );

  v_has_correlated_transfer :=
    (
      v_classification.analytics_class = 'transfer_in'
      and new.provider_pfc_primary = 'TRANSFER_IN'
      and position('TRANSFER_IN_' in coalesce(new.provider_pfc_detailed, '')) = 1
    ) or (
      v_classification.analytics_class = 'transfer_out'
      and new.provider_pfc_primary = 'TRANSFER_OUT'
      and position('TRANSFER_OUT_' in coalesce(new.provider_pfc_detailed, '')) = 1
    );

  v_has_correlated_merchant_spend :=
    upper(coalesce(new.provider_pfc_confidence, '')) in ('LOW', 'UNKNOWN')
    and v_classification.analytics_class in (
      'consumer_spend', 'refund_or_reversal'
    )
    and new.raw_provider_payload @? '$.counterparty_types[*] ? (@ == "merchant" || @ == "marketplace" || @ == "payment_terminal")';

  if not v_has_correlated_transfer and not v_has_correlated_merchant_spend then
    return new;
  end if;

  new.analytics_class := v_classification.analytics_class;
  new.analytics_direction := v_classification.analytics_direction;
  new.analytics_is_final := v_classification.analytics_is_final;
  new.analytics_spending_multiplier :=
    v_classification.analytics_spending_multiplier;
  new.analytics_counts_toward_income :=
    v_classification.analytics_counts_toward_income;
  new.classification_source :=
    'plaid_pfc_' || coalesce(new.provider_pfc_version, 'v2');
  new.classification_version := 2;
  new.classification_review_state := 'not_required';
  new.classification_review_reason := null;
  return new;
end;
$$;

drop trigger if exists zy_apply_correlated_plaid_classification_v1
  on public.expenses;
create trigger zy_apply_correlated_plaid_classification_v1
before insert or update of
  provider,
  bank_account_id,
  raw_provider_payload,
  amount_cents,
  type,
  provider_pfc_primary,
  provider_pfc_detailed,
  provider_pfc_confidence,
  provider_transaction_code,
  provider_pending,
  classification_source,
  classification_review_state
on public.expenses
for each row execute function public.apply_correlated_plaid_classification_v1();

update public.expenses
set provider_pfc_confidence = provider_pfc_confidence
where provider = 'plaid'
  and deleted_at is null
  and classification_source <> 'user_override'
  and (
    classification_review_reason = 'low_provider_confidence'
    or classification_source = 'plaid_structured_counterparty'
  );
