begin;

create extension if not exists pgtap;

select plan(7);

do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_user_id, 'authenticated', 'authenticated',
    'pocket-revision-' || v_user_id::text || '@example.com', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb, now(), now()
  );
  perform set_config('request.jwt.claim.sub', v_user_id::text, false);
end;
$$;

set local role authenticated;

select ok(
  has_function(
    'public', 'save_pockets_month_v1',
    array['uuid', 'text', 'uuid', 'date', 'text', 'bigint', 'text', 'jsonb']
  ),
  'the authenticated Pocket month compare-and-set RPC is installed'
);

select lives_ok(
  $$ select public.save_pockets_month_v1(
    auth.uid(), 'personal', null, date '2026-10-05', 'USD', 0,
    'pocket-cycle-start:1',
    '{"budgetId":null,"totalBudgetCents":10000,"pockets":[],"deletedPocketIds":[]}'::jsonb
  ) $$,
  'a non-first financial-cycle date is accepted and normalized to its calendar month'
);

select is(
  (select revision from public.pocket_month_revisions
   where scope_kind = 'personal' and scope_id = auth.uid()
     and currency = 'USD' and period_month = date '2026-10-01'),
  1::bigint,
  'the normalized calendar-month revision advances once'
);

select ok(
  exists (
    select 1 from public.budgets
    where user_id = auth.uid() and household_id is null
      and currency = 'USD' and period_month = date '2026-10-01'
      and total_budget_cents = 10000
  ),
  'the snapshot is written under the canonical first-of-month budget key'
);

select is(
  (public.save_pockets_month_v1(
    auth.uid(), 'personal', null, date '2026-10-05', 'USD', 0,
    'pocket-cycle-start:stale',
    '{"budgetId":null,"totalBudgetCents":20000,"pockets":[],"deletedPocketIds":[]}'::jsonb
  ) ->> 'code'),
  'REVISION_CONFLICT',
  'a stale snapshot is rejected without last-write-wins behavior'
);

select is(
  public.save_pockets_month_v1(
    auth.uid(), 'personal', null, date '2026-10-05', 'USD', 0,
    'pocket-cycle-start:1',
    '{"budgetId":null,"totalBudgetCents":10000,"pockets":[],"deletedPocketIds":[]}'::jsonb
  ) ->> 'revision',
  '1',
  'retrying the same mutation ID returns its original idempotent receipt'
);

select throws_ok(
  $$ select public.save_pockets_month_v1(
    auth.uid(), 'personal', null, date '2026-10-05', 'USD', 0,
    'pocket-cycle-start:1',
    '{"budgetId":null,"totalBudgetCents":11000,"pockets":[],"deletedPocketIds":[]}'::jsonb
  ) $$,
  '22023',
  null,
  'reusing a mutation ID with a different snapshot is rejected'
);

select * from finish();

rollback;
