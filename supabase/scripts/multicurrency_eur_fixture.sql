-- Dev/test fixture for EUR-base personal multi-currency validation.
-- Run against a local or disposable Supabase database, not production.

begin;

do $$
declare
  v_user_id uuid := 'a1af5807-9321-4e2a-ac9f-441c510eb826';
  v_contact_id uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000101';
  v_existing_contact_id uuid;
  v_wallet_eur uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000301';
  v_wallet_usd uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000302';
  v_budget_eur uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000401';
  v_budget_usd uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000402';
  v_pocket_groceries_eur uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000501';
  v_pocket_rent_eur uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000502';
  v_pocket_transport_eur uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000503';
  v_pocket_groceries_usd uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000504';
  v_pocket_subscription_usd uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000505';
  v_tx_salary_eur uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000601';
  v_tx_freelance_usd uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000602';
  v_tx_groceries_eur uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000603';
  v_tx_transport_eur uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000604';
  v_tx_groceries_usd uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000605';
  v_tx_rent_eur uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000606';
  v_tx_subscription_usd uuid := '6f5f59cc-2c92-4e91-b679-9b5e20000607';
  v_month_start date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
  v_now timestamptz := now();
  v_user_email text;
  v_usd_to_eur numeric := 0.854338;
begin
  select au.email
  into v_user_email
  from auth.users au
  where au.id = v_user_id;

  if v_user_email is null then
    raise exception 'auth.users row not found for %', v_user_id;
  end if;

  select uc.id
  into v_existing_contact_id
  from public.user_contacts uc
  where uc.user_id = v_user_id
  limit 1;

  if v_existing_contact_id is not null then
    v_contact_id := v_existing_contact_id;
  end if;

  delete from public.expenses
  where id in (
    v_tx_salary_eur,
    v_tx_freelance_usd,
    v_tx_groceries_eur,
    v_tx_transport_eur,
    v_tx_groceries_usd,
    v_tx_rent_eur,
    v_tx_subscription_usd
  );

  delete from public.envelope_category_links
  where envelope_id in (
    v_pocket_groceries_eur,
    v_pocket_rent_eur,
    v_pocket_transport_eur,
    v_pocket_groceries_usd,
    v_pocket_subscription_usd
  );

  delete from public.envelope_allocations
  where envelope_id in (
    v_pocket_groceries_eur,
    v_pocket_rent_eur,
    v_pocket_transport_eur,
    v_pocket_groceries_usd,
    v_pocket_subscription_usd
  );

  delete from public.budget_envelopes
  where id in (
    v_pocket_groceries_eur,
    v_pocket_rent_eur,
    v_pocket_transport_eur,
    v_pocket_groceries_usd,
    v_pocket_subscription_usd
  );

  delete from public.budgets
  where period_month = v_month_start
    and upper(currency) in ('EUR', 'USD')
    and household_id is null
    and (
      user_id = v_user_id
      or id in (v_budget_eur, v_budget_usd)
    );

  delete from public.accounts
  where id in (v_wallet_eur, v_wallet_usd);

  insert into public.users (id, email, full_name, created_at, updated_at)
  values (
    v_user_id,
    v_user_email,
    'Personal multicurrency fixture (eur)',
    v_now - interval '30 days',
    v_now
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = excluded.updated_at;

  insert into public.user_contacts (
    id,
    phone_e164,
    user_id,
    verified,
    preferred_currency,
    preferred_language,
    preferred_timezone,
    created_at,
    updated_at
  ) values (
    v_contact_id,
    '+15552000101',
    v_user_id,
    true,
    'EUR',
    'en',
    'Europe/Paris',
    v_now - interval '30 days',
    v_now
  )
  on conflict (user_id) do update
    set phone_e164 = excluded.phone_e164,
        verified = excluded.verified,
        preferred_currency = excluded.preferred_currency,
        preferred_language = excluded.preferred_language,
        preferred_timezone = excluded.preferred_timezone,
        updated_at = excluded.updated_at;

  insert into public.accounts (
    id,
    user_id,
    household_id,
    name,
    icon,
    color,
    currency,
    opening_balance_cents,
    goal_amount_cents,
    is_default,
    is_system,
    is_archived,
    created_at,
    updated_at
  ) values
    (v_wallet_eur, v_user_id, null, 'wallet1e (eur)', 'wallet', '#16A34A', 'EUR', 100000, null, false, false, false, v_now - interval '15 days', v_now),
    (v_wallet_usd, v_user_id, null, 'wallet1u (usd)', 'credit_card', '#F97316', 'USD', 200000, null, false, false, false, v_now - interval '15 days', v_now);

  insert into public.budgets (id, user_id, household_id, period_month, currency, total_budget_cents, created_at, updated_at)
  values
    (v_budget_eur, v_user_id, null, v_month_start, 'EUR', 120000, v_now - interval '10 days', v_now),
    (v_budget_usd, v_user_id, null, v_month_start, 'USD', 200000, v_now - interval '10 days', v_now)
  on conflict (id) do update
    set total_budget_cents = excluded.total_budget_cents,
        updated_at = excluded.updated_at;

  insert into public.budget_envelopes (
    id,
    budget_id,
    user_id,
    household_id,
    name,
    budget_percentage,
    budget_amount_cents,
    currency,
    icon,
    color,
    created_at,
    updated_at
  ) values
    (v_pocket_groceries_eur, v_budget_eur, v_user_id, null, 'pocket1e (eur)', 0, 20000, 'EUR', 'shopping_cart', '#22C55E', v_now - interval '10 days', v_now),
    (v_pocket_rent_eur, v_budget_eur, v_user_id, null, 'pocket2e (eur)', 0, 90000, 'EUR', 'home', '#3B82F6', v_now - interval '10 days', v_now),
    (v_pocket_transport_eur, v_budget_eur, v_user_id, null, 'pocket3e (eur)', 0, 10000, 'EUR', 'directions_car', '#14B8A6', v_now - interval '10 days', v_now),
    (v_pocket_groceries_usd, v_budget_usd, v_user_id, null, 'pocket1e (usd)', 0, 50000, 'USD', 'shopping_cart', '#F97316', v_now - interval '10 days', v_now),
    (v_pocket_subscription_usd, v_budget_usd, v_user_id, null, 'pocket2e (usd)', 0, 5000, 'USD', 'subscriptions', '#EF4444', v_now - interval '10 days', v_now);

  insert into public.envelope_allocations (envelope_id, period_month, amount_cents, carryover_policy, created_at, updated_at)
  values
    (v_pocket_groceries_eur, v_month_start, 20000, 'carryover', v_now, v_now),
    (v_pocket_rent_eur, v_month_start, 90000, 'carryover', v_now, v_now),
    (v_pocket_transport_eur, v_month_start, 10000, 'carryover', v_now, v_now),
    (v_pocket_groceries_usd, v_month_start, 50000, 'carryover', v_now, v_now),
    (v_pocket_subscription_usd, v_month_start, 5000, 'carryover', v_now, v_now)
  on conflict (envelope_id, period_month) do update
    set amount_cents = excluded.amount_cents,
        updated_at = excluded.updated_at;

  insert into public.envelope_category_links (envelope_id, category, created_at, updated_at)
  values
    (v_pocket_groceries_eur, 'groceries (eur)', v_now, v_now),
    (v_pocket_rent_eur, 'rent (eur)', v_now, v_now),
    (v_pocket_transport_eur, 'transport (eur)', v_now, v_now),
    (v_pocket_groceries_usd, 'groceries (usd)', v_now, v_now),
    (v_pocket_subscription_usd, 'subscription (usd)', v_now, v_now)
  on conflict (envelope_id, category) do update
    set updated_at = excluded.updated_at;

  insert into public.expenses (
    id,
    contact_id,
    user_id,
    household_id,
    date,
    amount_cents,
    currency,
    category,
    raw_text,
    breakdown,
    receipt_image_url,
    account_id,
    type,
    is_recurring,
    owner_type,
    privacy_scope,
    source,
    recurrence_rule,
    attachments,
    fx_rate,
    base_currency,
    created_at,
    updated_at
  ) values
    (v_tx_salary_eur, v_contact_id, v_user_id, null, v_month_start, 300000, 'EUR', 'salary (eur)', 'salary (eur)', null, null, v_wallet_eur, 'income'::transaction_type, false, 'me'::transaction_owner, 'full'::privacy_scope, 'salary (eur)', null, '[]'::jsonb, 1.0, null, v_now - interval '8 days', v_now),
    (v_tx_freelance_usd, v_contact_id, v_user_id, null, v_month_start, 50000, 'USD', 'freelance (usd)', 'freelance (usd)', null, null, v_wallet_usd, 'income'::transaction_type, false, 'me'::transaction_owner, 'full'::privacy_scope, 'freelance (usd)', null, '[]'::jsonb, v_usd_to_eur, null, v_now - interval '7 days', v_now),
    (v_tx_groceries_eur, v_contact_id, v_user_id, null, v_month_start, 12000, 'EUR', 'groceries (eur)', 'groceries (eur)', null, null, v_wallet_eur, 'expense'::transaction_type, false, 'me'::transaction_owner, 'full'::privacy_scope, null, null, '[]'::jsonb, 1.0, null, v_now - interval '6 days', v_now),
    (v_tx_transport_eur, v_contact_id, v_user_id, null, v_month_start, 3000, 'EUR', 'transport (eur)', 'transport (eur)', null, null, v_wallet_eur, 'expense'::transaction_type, false, 'me'::transaction_owner, 'full'::privacy_scope, null, null, '[]'::jsonb, 1.0, null, v_now - interval '5 days', v_now),
    (v_tx_groceries_usd, v_contact_id, v_user_id, null, v_month_start, 10000, 'USD', 'groceries (usd)', 'groceries (usd)', null, null, v_wallet_usd, 'expense'::transaction_type, false, 'me'::transaction_owner, 'full'::privacy_scope, null, null, '[]'::jsonb, v_usd_to_eur, null, v_now - interval '4 days', v_now),
    (v_tx_rent_eur, v_contact_id, v_user_id, null, v_month_start, 80000, 'EUR', 'rent (eur)', 'rent (eur)', null, null, v_wallet_eur, 'expense'::transaction_type, true, 'me'::transaction_owner, 'full'::privacy_scope, null, jsonb_build_object('frequency', 'monthly', 'anchor_date', to_char(v_month_start, 'YYYY-MM-DD')), '[]'::jsonb, 1.0, null, v_now - interval '20 days', v_now),
    (v_tx_subscription_usd, v_contact_id, v_user_id, null, v_month_start, 2500, 'USD', 'subscription (usd)', 'subscription (usd)', null, null, v_wallet_usd, 'expense'::transaction_type, true, 'me'::transaction_owner, 'full'::privacy_scope, null, jsonb_build_object('frequency', 'monthly', 'anchor_date', to_char(v_month_start, 'YYYY-MM-DD')), '[]'::jsonb, v_usd_to_eur, null, v_now - interval '19 days', v_now);

  raise notice 'Seeded EUR-base personal multi-currency fixture for user %, month_start: %', v_user_id, v_month_start;
end $$;

commit;
