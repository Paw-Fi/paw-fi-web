-- Repair bank-synced expenses that were inserted before their linked wallet
-- existed. The bank_account_id is the durable provider-account binding; once a
-- wallet links to that bank account, the visible expense account must match it.
create or replace function public.rebind_bank_account_expenses_to_wallet(
  p_user_id uuid,
  p_provider text,
  p_bank_account_id uuid,
  p_wallet_id uuid,
  p_household_id uuid default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  update public.expenses e
  set
    account_id = p_wallet_id,
    household_id = p_household_id,
    updated_at = now()
  where e.user_id = p_user_id
    and e.provider = p_provider
    and e.bank_account_id = p_bank_account_id
    and e.deleted_at is null
    and not coalesce(e.user_overrides ? 'account_id', false)
    and (
      e.account_id is distinct from p_wallet_id
      or e.household_id is distinct from p_household_id
    );

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

update public.expenses e
set
  account_id = a.id,
  household_id = a.household_id,
  updated_at = now()
from public.accounts a
join public.bank_accounts ba
  on ba.id = a.linked_bank_account_id
join public.bank_connections bc
  on bc.id = ba.bank_connection_id
where a.linked_bank_account_id is not null
  and a.is_archived = false
  and bc.household_id is not distinct from a.household_id
  and e.user_id = a.user_id
  and e.provider = bc.provider
  and e.bank_account_id = a.linked_bank_account_id
  and e.deleted_at is null
  and not coalesce(e.user_overrides ? 'account_id', false)
  and (
    e.account_id is distinct from a.id
    or e.household_id is distinct from a.household_id
  );
