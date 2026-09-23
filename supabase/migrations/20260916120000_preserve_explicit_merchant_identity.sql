-- A user-confirmed picker selection may intentionally replace the descriptor
-- and identity in one update. Preserve that explicit identity; only clear an
-- unchanged identity when its supporting descriptor changes.
create or replace function public.clear_stale_merchant_identity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_key text;
  v_new_key text;
  v_old_context_key text;
  v_new_context_key text;
  v_old_structured_key text;
  v_new_structured_key text;
begin
  v_old_key := coalesce(public.expense_merchant_resolution_descriptor_key(
    old.merchant, old.raw_text, old.bank_account_id
  ), public.merchant_resolution_descriptor_key(old.merchant_structured_name, null, false));
  v_new_key := coalesce(public.expense_merchant_resolution_descriptor_key(
    new.merchant, new.raw_text, new.bank_account_id
  ), public.merchant_resolution_descriptor_key(new.merchant_structured_name, null, false));
  v_old_context_key := public.expense_merchant_evidence_context_key(
    old.merchant, old.bank_account_id
  );
  v_new_context_key := public.expense_merchant_evidence_context_key(
    new.merchant, new.bank_account_id
  );
  v_old_structured_key := public.merchant_resolution_descriptor_key(
    old.merchant_structured_name, null, false
  );
  v_new_structured_key := public.merchant_resolution_descriptor_key(
    new.merchant_structured_name, null, false
  );
  if (v_new_key is distinct from v_old_key
      or v_new_context_key is distinct from v_old_context_key
      or v_new_structured_key is distinct from v_old_structured_key)
     and new.merchant_id is not distinct from old.merchant_id then
    new.merchant_id := null;
  end if;
  return new;
end;
$$;
