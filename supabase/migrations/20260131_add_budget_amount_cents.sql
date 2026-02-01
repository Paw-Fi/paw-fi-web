-- Add amount-based envelope budgets and backfill from allocations/percentages
-- IMPORTANT: This migration maintains backward compatibility with legacy writers
-- that only update budget_percentage (e.g., WhatsApp bot, older mobile builds)

-- Step 1: Add the column
alter table public.budget_envelopes
  add column if not exists budget_amount_cents bigint;

comment on column public.budget_envelopes.budget_amount_cents is
  'Absolute envelope budget in cents (preferred over budget_percentage). 
   Legacy writers updating only budget_percentage will have this recomputed by trigger.';

-- Step 2: Month-correct backfill
-- For each envelope, use the allocation for the envelope's budget month if it exists,
-- otherwise compute from budget_percentage * budgets.total_budget_cents
update public.budget_envelopes be
set budget_amount_cents = coalesce(
  -- First try: allocation for the envelope's budget month (not just "latest")
  (
    select ea.amount_cents
    from public.envelope_allocations ea
    join public.budgets b on b.id = be.budget_id
    where ea.envelope_id = be.id
      and ea.period_month = b.period_month
    limit 1
  ),
  -- Fallback: derive from budget_percentage
  (
    select round(
      (coalesce(nullif(be.budget_percentage::text, ''), '0')::numeric / 100.0) 
      * b.total_budget_cents
    )
    from public.budgets b
    where b.id = be.budget_id
  )
)
where be.budget_amount_cents is null;

-- Step 3: Create trigger function that supports both new and legacy writers
-- 
-- Behavior:
-- - INSERT: if budget_amount_cents is provided, keep it; else compute from budget_percentage
-- - UPDATE: 
--   - If budget_amount_cents explicitly changed (new != old), keep the new value
--   - Else if budget_percentage changed OR budget_id changed, recompute budget_amount_cents
--   - This ensures legacy writers that only update budget_percentage still get correct amount
create or replace function public.set_budget_amount_cents()
returns trigger as $$
declare
  total_budget bigint;
  pct numeric;
  should_recompute boolean := false;
begin
  -- On INSERT: only compute if budget_amount_cents is null
  if TG_OP = 'INSERT' then
    if new.budget_amount_cents is not null then
      return new;
    end if;
    should_recompute := true;
  end if;

  -- On UPDATE: check what changed
  if TG_OP = 'UPDATE' then
    -- If budget_amount_cents was explicitly changed, keep the new value
    if new.budget_amount_cents is distinct from old.budget_amount_cents then
      return new;
    end if;
    
    -- If budget_percentage changed or budget_id changed, recompute
    -- This handles legacy writers that only update budget_percentage
    if (new.budget_percentage is distinct from old.budget_percentage) 
       or (new.budget_id is distinct from old.budget_id) then
      should_recompute := true;
    end if;
  end if;

  -- Recompute budget_amount_cents from budget_percentage if needed
  if should_recompute then
    select b.total_budget_cents
    into total_budget
    from public.budgets b
    where b.id = new.budget_id;

    pct := coalesce(nullif(new.budget_percentage::text, ''), '0')::numeric;
    new.budget_amount_cents := round((pct / 100.0) * coalesce(total_budget, 0));
  end if;

  return new;
end;
$$ language plpgsql;

-- Step 4: Create trigger (fires on insert or update of relevant columns)
drop trigger if exists set_budget_amount_cents on public.budget_envelopes;
create trigger set_budget_amount_cents
before insert or update of budget_amount_cents, budget_percentage, budget_id
on public.budget_envelopes
for each row
execute function public.set_budget_amount_cents();

-- Step 5: Verification queries (run manually after migration)
-- 
-- Count envelopes still missing amount (should be 0 after backfill):
--   SELECT count(*) FROM public.budget_envelopes WHERE budget_amount_cents IS NULL;
--
-- Verify trigger recomputes when budget_percentage changes:
--   UPDATE public.budget_envelopes 
--   SET budget_percentage = budget_percentage 
--   WHERE id = '<test_id>' 
--   RETURNING id, budget_percentage, budget_amount_cents;
