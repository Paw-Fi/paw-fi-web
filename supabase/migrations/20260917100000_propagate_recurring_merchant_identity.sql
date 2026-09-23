-- Recurring templates own merchant identity. Materialized occurrences inherit
-- it so merchant edits never need to be performed occurrence-by-occurrence.

create or replace function public.align_recurring_occurrence_merchant_evidence()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_template public.expenses%rowtype;
begin
  if new.parent_recurring_id is not null
     and coalesce(new.is_recurring, false) is false then
    select * into v_template
    from public.expenses
    where id = new.parent_recurring_id
      and is_recurring is true
      and deleted_at is null;

    if found then
      new.merchant_id := v_template.merchant_id;
      new.merchant_structured_name := v_template.merchant_structured_name;
      new.merchant := v_template.merchant;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.propagate_recurring_merchant_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_recurring is true and (
    new.merchant is distinct from old.merchant or
    new.merchant_id is distinct from old.merchant_id or
    new.merchant_structured_name is distinct from old.merchant_structured_name
  ) then
    update public.expenses
    set merchant = new.merchant,
        merchant_id = new.merchant_id,
        merchant_structured_name = new.merchant_structured_name,
        updated_at = now()
    where parent_recurring_id = new.id
      and coalesce(is_recurring, false) is false
      and deleted_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists merchant_identity_propagate_recurring on public.expenses;
create trigger merchant_identity_propagate_recurring
after update of merchant_id, merchant_structured_name on public.expenses
for each row execute function public.propagate_recurring_merchant_identity();

revoke all on function public.propagate_recurring_merchant_identity() from public, anon, authenticated;

update public.expenses as occurrence
set merchant = template.merchant,
    merchant_id = template.merchant_id,
    merchant_structured_name = template.merchant_structured_name,
    updated_at = now()
from public.expenses as template
where occurrence.parent_recurring_id = template.id
  and coalesce(occurrence.is_recurring, false) is false
  and occurrence.deleted_at is null
  and template.is_recurring is true
  and template.deleted_at is null;
