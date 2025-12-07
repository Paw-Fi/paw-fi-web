-- Migration: widen expenses.amount_cents to bigint to support large transaction amounts
-- This avoids integer overflow for large currencies like VND when storing amount_cents = amount * 100.

drop view if exists public.v_envelope_monthly_spend;

alter table if exists public.expenses
  alter column amount_cents type bigint;

alter table if exists public.daily_budgets
  alter column amount_cents type bigint;

alter table if exists public.envelope_allocations
  alter column amount_cents type bigint;

alter table if exists public.goal_contributions
  alter column amount_cents type bigint;

create or replace view public.v_envelope_monthly_spend as
select
  e.id as envelope_id,
  date_trunc('month', ex.date)::date as period_month,
  sum(ex.amount_cents)::bigint as spent_cents
from public.budget_envelopes e
join public.envelope_category_links l
  on l.envelope_id = e.id
join public.user_contacts uc
  on uc.user_id = e.user_id
join public.expenses ex
  on ex.contact_id = uc.id
 and lower(coalesce(ex.category, 'uncategorized')) = lower(l.category)
group by e.id, date_trunc('month', ex.date)::date;

comment on view public.v_envelope_monthly_spend is
  'Aggregated monthly spend per envelope using user_id, category links and expenses';

-- Ensure normalize_goal_amount uses BIGINT for p_amount_cents
create or replace function normalize_goal_amount(
  p_goal_id UUID,
  p_amount_cents BIGINT,
  p_currency TEXT,
  p_household_id UUID
)
returns table (
  normalized_amount_cents BIGINT,
  fx_rate NUMERIC,
  base_currency TEXT
) as $$
DECLARE
  v_base_currency TEXT;
  v_fx_rate NUMERIC;
  v_normalized_amount BIGINT;
BEGIN
  -- Get household base currency
  SELECT currency INTO v_base_currency
  FROM public.households
  WHERE id = p_household_id;

  -- If same currency, no conversion needed
  IF p_currency = v_base_currency THEN
    v_fx_rate := 1.0;
    v_normalized_amount := p_amount_cents;
  ELSE
    -- TODO: Fetch live exchange rate from external service
    -- For now, use 1.0 (same as income pattern)
    v_fx_rate := 1.0;
    v_normalized_amount := p_amount_cents;
  END IF;

  -- Return normalized values
  RETURN QUERY SELECT v_normalized_amount, v_fx_rate, v_base_currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
