do $$
begin
  if to_regprocedure(
    'public.classify_plaid_transaction_v1(numeric,boolean,text,text,text)'
  ) is null or to_regprocedure(
    'public.set_expense_analytics_classification_v1()'
  ) is null then
    raise exception using
      errcode = '55000',
      message = 'Missing Plaid analytics backfill prerequisite',
      hint = 'Run 20260716230000_plaid_analytics_classification.sql before 20260716233000_plaid_analytics_constraints.sql';
  end if;
end;
$$;

alter table public.expenses
  alter column provider_pending set not null,
  alter column analytics_class set not null,
  alter column analytics_direction set not null,
  alter column analytics_is_final set not null,
  alter column analytics_spending_multiplier set not null,
  alter column analytics_counts_toward_income set not null,
  alter column classification_source set not null,
  alter column classification_version set not null;

alter table public.expenses
  drop constraint if exists expenses_analytics_class_check,
  add constraint expenses_analytics_class_check check (
    analytics_class in (
      'consumer_spend', 'income', 'transfer_in', 'transfer_out',
      'debt_payment', 'loan_disbursement', 'refund_or_reversal', 'bank_fee',
      'cash_movement', 'unknown'
    )
  ),
  drop constraint if exists expenses_analytics_direction_check,
  add constraint expenses_analytics_direction_check check (
    analytics_direction in ('in', 'out', 'none')
  ),
  drop constraint if exists expenses_analytics_spending_multiplier_check,
  add constraint expenses_analytics_spending_multiplier_check check (
    analytics_spending_multiplier in (-1, 0, 1)
  );

drop trigger if exists set_expense_analytics_classification_v1 on public.expenses;
create trigger set_expense_analytics_classification_v1
before insert or update of
  provider,
  bank_account_id,
  raw_provider_payload,
  amount_cents,
  type,
  classification_source,
  analytics_class,
  analytics_direction,
  analytics_is_final,
  analytics_spending_multiplier,
  analytics_counts_toward_income
on public.expenses
for each row execute function public.set_expense_analytics_classification_v1();

create index if not exists expenses_active_analytics_feed_idx
  on public.expenses (
    user_id,
    analytics_class,
    analytics_is_final,
    date desc
  )
  where deleted_at is null and coalesce(is_recurring, false) = false;
