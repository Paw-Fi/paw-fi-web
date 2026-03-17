-- Seeds personal-only preview-style transactions for a single user.
-- Scope:
--   - household_id is always null
--   - no household/portfolio rows
--   - no budget rows
--   - includes recurring + non-recurring expenses and income
--
-- Designed so the current-month personal expense total is exactly $1096.48,
-- with an upward-sloping spread across the month for dashboard charts.
-- bafc60c5-f349-4b84-b4e8-a46bf482b3f8

begin;

do $$
declare
  v_user_id uuid := 'bafc60c5-f349-4b84-b4e8-a46bf482b3f8';
  v_contact_id uuid;
  v_now timestamptz := now();
  v_local_now timestamp := now() at time zone 'America/Los_Angeles';
  v_month_start date := date_trunc('month', v_local_now)::date;
begin
  if not exists (
    select 1
    from auth.users
    where id = v_user_id
  ) then
    raise exception 'auth.users row not found for %', v_user_id;
  end if;

  insert into public.users (id, email, created_at, updated_at)
  select
    au.id,
    coalesce(au.email, 'seed+' || au.id::text || '@moneko.local'),
    coalesce(au.created_at, now()),
    now()
  from auth.users au
  where au.id = v_user_id
  on conflict (id) do update
    set email = excluded.email,
        updated_at = excluded.updated_at;

  select uc.id
  into v_contact_id
  from public.user_contacts uc
  where uc.user_id = v_user_id
  order by uc.updated_at desc nulls last, uc.created_at desc nulls last
  limit 1;

  if v_contact_id is null then
    v_contact_id := gen_random_uuid();
  end if;

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
  )
  values (
    v_contact_id,
    null,
    v_user_id,
    true,
    'USD',
    'en',
    'America/Los_Angeles',
    v_now - interval '120 days',
    v_now
  )
  on conflict (id) do update
    set user_id = excluded.user_id,
        verified = excluded.verified,
        preferred_currency = excluded.preferred_currency,
        preferred_language = excluded.preferred_language,
        preferred_timezone = excluded.preferred_timezone,
        updated_at = excluded.updated_at;

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
    split_group_id,
    type,
    is_recurring,
    owner_type,
    privacy_scope,
    source,
    recurrence_rule,
    attachments,
    created_at,
    updated_at
  )
  select
    s.id,
    v_contact_id,
    v_user_id,
    null,
    s.tx_date,
    s.amount_cents,
    'USD',
    s.category,
    s.raw_text,
    s.breakdown,
    null,
    null,
    s.type::transaction_type,
    s.is_recurring,
    'me'::transaction_owner,
    'full'::privacy_scope,
    s.source,
    s.recurrence_rule,
    '[]'::jsonb,
    s.created_at,
    null
  from (
    values
      (
        '21000000-0000-4000-8000-000000000001'::uuid,
        v_month_start + 1,
        2450::bigint,
        'Groceries'::text,
        'Corner market produce run'::text,
        '["Fruit","Greens"]'::jsonb,
        'expense'::text,
        false,
        null::text,
        null::jsonb,
        v_now - interval '28 days'
      ),
      (
        '21000000-0000-4000-8000-000000000002'::uuid,
        v_month_start + 3,
        2999,
        'Shopping',
        'Noise-cancelling earbuds case replacement',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '26 days'
      ),
      (
        '21000000-0000-4000-8000-000000000003'::uuid,
        v_month_start + 4,
        3500,
        'Wellness',
        'Yoga studio membership',
        null,
        'expense',
        true,
        null,
        jsonb_build_object('frequency', 'monthly', 'anchor_date', to_char(v_month_start + 4, 'YYYY-MM-DD')),
        v_now - interval '90 days'
      ),
      (
        '21000000-0000-4000-8000-000000000004'::uuid,
        v_month_start + 6,
        4299,
        'Subscriptions',
        'Streaming bundle',
        null,
        'expense',
        true,
        null,
        jsonb_build_object('frequency', 'monthly', 'anchor_date', to_char(v_month_start + 6, 'YYYY-MM-DD')),
        v_now - interval '60 days'
      ),
      (
        '21000000-0000-4000-8000-000000000005'::uuid,
        v_month_start + 7,
        4500,
        'Transportation',
        'Metro pass top-up',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '22 days'
      ),
      (
        '21000000-0000-4000-8000-000000000006'::uuid,
        v_month_start + 9,
        5525,
        'Education',
        'Online design course subscription',
        null,
        'expense',
        true,
        null,
        jsonb_build_object('frequency', 'monthly', 'anchor_date', to_char(v_month_start + 9, 'YYYY-MM-DD')),
        v_now - interval '75 days'
      ),
      (
        '21000000-0000-4000-8000-000000000007'::uuid,
        v_month_start + 10,
        5800,
        'Transportation',
        'Monthly metro reload',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '20 days'
      ),
      (
        '21000000-0000-4000-8000-000000000008'::uuid,
        v_month_start + 12,
        6180,
        'Utilities',
        'Phone + cloud tools bundle',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '18 days'
      ),
      (
        '21000000-0000-4000-8000-000000000009'::uuid,
        v_month_start + 14,
        6440,
        'Dining',
        'Dinner with friends at Thai Garden',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '16 days'
      ),
      (
        '21000000-0000-4000-8000-000000000010'::uuid,
        v_month_start + 16,
        7215,
        'Groceries',
        'Weekend pantry restock',
        '["Pantry","Snacks"]'::jsonb,
        'expense',
        false,
        null,
        null,
        v_now - interval '14 days'
      ),
      (
        '21000000-0000-4000-8000-000000000011'::uuid,
        v_month_start + 18,
        7800,
        'Groceries',
        'Warehouse club stock-up',
        '["Bulk","Household"]'::jsonb,
        'expense',
        false,
        null,
        null,
        v_now - interval '12 days'
      ),
      (
        '21000000-0000-4000-8000-000000000012'::uuid,
        v_month_start + 20,
        8145,
        'Travel',
        'Weekend train + hotel deposit',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '10 days'
      ),
      (
        '21000000-0000-4000-8000-000000000013'::uuid,
        v_month_start + 22,
        8900,
        'Health',
        'Annual physical co-pay + labs',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '8 days'
      ),
      (
        '21000000-0000-4000-8000-000000000014'::uuid,
        v_month_start + 24,
        9360,
        'Entertainment',
        'Concert tickets and snacks',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '6 days'
      ),
      (
        '21000000-0000-4000-8000-000000000015'::uuid,
        v_month_start + 26,
        10935,
        'Shopping',
        'Spring wardrobe refresh',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '4 days'
      ),
      (
        '21000000-0000-4000-8000-000000000016'::uuid,
        v_month_start + 27,
        15600,
        'Childcare',
        'Babysitter weekend booking',
        null,
        'expense',
        false,
        null,
        null,
        v_now - interval '2 days'
      ),
      (
        '21000000-0000-4000-8000-000000000101'::uuid,
        v_month_start,
        320000,
        'Salary',
        'Base salary deposit',
        null,
        'income',
        true,
        'Studio Payroll',
        jsonb_build_object('frequency', 'monthly', 'anchor_date', to_char(v_month_start, 'YYYY-MM-DD')),
        v_now - interval '120 days'
      ),
      (
        '21000000-0000-4000-8000-000000000102'::uuid,
        v_month_start + 8,
        42500,
        'Income',
        'Freelance UI polish sprint',
        null,
        'income',
        false,
        'Freelance Client',
        null,
        v_now - interval '11 days'
      ),
      (
        '21000000-0000-4000-8000-000000000103'::uuid,
        v_month_start + 14,
        180000,
        'Salary',
        'Design retainer payout',
        null,
        'income',
        true,
        'Design Retainer',
        jsonb_build_object('frequency', 'monthly', 'anchor_date', to_char(v_month_start + 14, 'YYYY-MM-DD')),
        v_now - interval '90 days'
      ),
      (
        '21000000-0000-4000-8000-000000000104'::uuid,
        v_month_start + 19,
        28000,
        'Income',
        'Referral bonus payout',
        null,
        'income',
        false,
        'Referral Program',
        null,
        v_now - interval '5 days'
      )
  ) as s(
    id,
    tx_date,
    amount_cents,
    category,
    raw_text,
    breakdown,
    type,
    is_recurring,
    source,
    recurrence_rule,
    created_at
  )
  on conflict (id) do update
    set contact_id = excluded.contact_id,
        user_id = excluded.user_id,
        household_id = excluded.household_id,
        date = excluded.date,
        amount_cents = excluded.amount_cents,
        currency = excluded.currency,
        category = excluded.category,
        raw_text = excluded.raw_text,
        breakdown = excluded.breakdown,
        receipt_image_url = excluded.receipt_image_url,
        split_group_id = excluded.split_group_id,
        type = excluded.type,
        is_recurring = excluded.is_recurring,
        owner_type = excluded.owner_type,
        privacy_scope = excluded.privacy_scope,
        source = excluded.source,
        recurrence_rule = excluded.recurrence_rule,
        attachments = excluded.attachments,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
end $$;

commit;
