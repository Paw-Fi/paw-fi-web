-- Run against a disposable database after 20260915130000_merchant_identity_resolution.sql.
begin;

create extension if not exists pgtap;
select plan(16);

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_starbucks uuid := gen_random_uuid();
  v_tesco uuid := gen_random_uuid();
  v_wrong uuid := gen_random_uuid();
  v_expense uuid := gen_random_uuid();
  v_suppressed uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_user_id, 'authenticated', 'authenticated',
    'merchant-resolution-pgtap@example.com', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );
  insert into public.merchants (
    id, canonical_name, normalized_name, domain, logo_identifier, confidence, resolution_source
  ) values
    (v_starbucks, 'Starbucks', 'starbucks', 'starbucks.com', 'starbucks.com', 1, 'manual'),
    (v_tesco, 'Tesco', 'tesco', 'tesco.com', 'tesco.com', 1, 'manual'),
    (v_wrong, 'Wrong merchant', 'wrong merchant', 'wrong.example', 'wrong.example', 1, 'manual');
  insert into public.expenses (
    id, user_id, date, amount_cents, currency, category, merchant, raw_text, merchant_id
  ) values (
    v_expense, v_user_id, current_date, 100, 'EUR', 'other', 'Starbucks', 'Initial note', v_starbucks
  ), (
    v_suppressed, v_user_id, current_date, 100, 'EUR', 'other', 'Unknown Local Shop', 'A note', v_wrong
  );
  perform set_config('test.merchant_user_id', v_user_id::text, false);
  perform set_config('test.merchant_starbucks', v_starbucks::text, false);
  perform set_config('test.merchant_tesco', v_tesco::text, false);
  perform set_config('test.merchant_wrong', v_wrong::text, false);
  perform set_config('test.merchant_expense', v_expense::text, false);
  perform set_config('test.merchant_suppressed', v_suppressed::text, false);
end;
$$;

update public.expenses set raw_text = 'Changed unrelated note'
where id = current_setting('test.merchant_expense')::uuid;
select is(
  (select merchant_id from public.expenses where id = current_setting('test.merchant_expense')::uuid),
  current_setting('test.merchant_starbucks')::uuid,
  'raw-text-only changes preserve populated merchant identity'
);

update public.expenses set merchant = 'Tesco'
where id = current_setting('test.merchant_expense')::uuid;
select is(
  (select merchant_id from public.expenses where id = current_setting('test.merchant_expense')::uuid),
  null::uuid,
  'merchant evidence change clears prior identity'
);

update public.expenses set merchant_id = current_setting('test.merchant_wrong')::uuid
where id = current_setting('test.merchant_expense')::uuid;
update public.expenses set merchant_id = current_setting('test.merchant_starbucks')::uuid
where id = current_setting('test.merchant_expense')::uuid;
select is(
  (select merchant from public.expenses where id = current_setting('test.merchant_expense')::uuid),
  'Tesco',
  'identity correction never rewrites free-form merchant text'
);

insert into public.merchant_user_overrides (user_id, normalized_pattern, action, merchant_id)
values (current_setting('test.merchant_user_id')::uuid, 'unknown local shop', 'suppress', null);
update public.expenses set merchant_id = null
where id = current_setting('test.merchant_suppressed')::uuid;
select is(
  (select merchant from public.expenses where id = current_setting('test.merchant_suppressed')::uuid),
  'Unknown Local Shop',
  'suppression leaves the transaction merchant text untouched'
);
select is(
  (select merchant_id from public.expenses where id = current_setting('test.merchant_suppressed')::uuid),
  null::uuid,
  'suppression leaves identity null for category-icon fallback'
);
select ok(
  not exists (
    select 1 from public.merchant_resolution_jobs
    where transaction_id = current_setting('test.merchant_suppressed')::uuid
      and status in ('pending', 'processing')
  ),
  'suppression prevents background re-resolution'
);

insert into public.merchant_user_overrides (user_id, normalized_pattern, action, merchant_id)
values (
  current_setting('test.merchant_user_id')::uuid, 'unknown local shop', 'map',
  current_setting('test.merchant_starbucks')::uuid
) on conflict (user_id, normalized_pattern, evidence_context_key) do update
set action = excluded.action, merchant_id = excluded.merchant_id;
update public.expenses set merchant_id = current_setting('test.merchant_starbucks')::uuid
where id = current_setting('test.merchant_suppressed')::uuid;
select is(
  (select merchant_id from public.expenses where id = current_setting('test.merchant_suppressed')::uuid),
  current_setting('test.merchant_starbucks')::uuid,
  'an explicit future mapping replaces suppression'
);

insert into public.merchants (
  canonical_name, normalized_name, domain, logo_identifier, confidence, resolution_source
) values
  ('The Daily Grind Dublin', 'the daily grind', 'dailygrind-dublin.example', 'dailygrind-dublin.example', 1, 'manual'),
  ('The Daily Grind London', 'the daily grind', 'dailygrind-london.example', 'dailygrind-london.example', 1, 'manual');
select is(
  (select count(*) from public.merchants where normalized_name = 'the daily grind'),
  2::bigint,
  'same normalized local name is not a global identity constraint'
);

insert into public.expenses (user_id, date, amount_cents, currency, category, merchant)
values (current_setting('test.merchant_user_id')::uuid, current_date, 100, 'EUR', 'other', 'Joe''s Cafe');
select ok(
  exists (
    select 1 from public.expenses
    where user_id = current_setting('test.merchant_user_id')::uuid
      and merchant = 'Joe''s Cafe' and merchant_id is null
  ),
  'existing free-form merchant with null identity remains valid'
);

do $$
declare
  v_job public.merchant_resolution_jobs%rowtype;
  v_expense_id uuid := gen_random_uuid();
begin
  insert into public.expenses (
    id, user_id, date, amount_cents, currency, category, merchant
  ) values (
    v_expense_id, current_setting('test.merchant_user_id')::uuid,
    current_date, 100, 'EUR', 'other', 'Exact Evidence A'
  );
  select * into v_job from public.claim_merchant_resolution_jobs(25, 'pgtap')
  where transaction_id = v_expense_id;
  update public.expenses set merchant = 'Exact Evidence B' where id = v_expense_id;
  perform set_config('test.merchant_stale_job', v_job.id::text, false);
  perform set_config('test.merchant_stale_token', v_job.claim_token::text, false);
  perform set_config('test.merchant_stale_key', v_job.descriptor_key, false);
end;
$$;
select is(
  public.complete_merchant_resolution_job(
    current_setting('test.merchant_stale_job')::uuid,
    current_setting('test.merchant_stale_token')::uuid,
    current_setting('test.merchant_stale_key'),
    'resolved', current_setting('test.merchant_starbucks')::uuid, null
  ),
  0,
  'a stale worker cannot complete a superseded evidence fingerprint'
);
select is(
  (select status || ':' || descriptor_key
   from public.merchant_resolution_jobs
   where transaction_id = (
     select transaction_id from public.merchant_resolution_jobs
     where id = current_setting('test.merchant_stale_job')::uuid
   )),
  'pending:exact evidence b',
  'changed evidence remains eligible after stale completion is rejected'
);

do $$
declare
  v_tim_a uuid := gen_random_uuid();
  v_tim_b uuid := gen_random_uuid();
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
begin
  insert into public.merchants (
    id, canonical_name, normalized_name, domain, logo_identifier,
    confidence, resolution_source
  ) values
    (v_tim_a, 'Tim Hortons', 'tim hortons', 'timhortons.ca', 'timhortons.ca', 1, 'logo_dev_search'),
    (v_tim_b, 'Tim Hortons', 'tim hortons', 'timhortons.co.uk', 'timhortons.co.uk', 1, 'logo_dev_search');
  insert into public.expenses (
    id, user_id, date, amount_cents, currency, category, merchant,
    merchant_structured_name
  ) values
    (v_a, current_setting('test.merchant_user_id')::uuid, current_date, 100,
      'CAD', 'other', 'TIM HORTONS #123 TORONTO', 'Tim Hortons'),
    (v_b, current_setting('test.merchant_user_id')::uuid, current_date, 100,
      'GBP', 'other', 'TIM HORTONS #999', 'Tim Hortons'),
    (v_c, current_setting('test.merchant_user_id')::uuid, current_date, 100,
      'GBP', 'other', 'TIM HORTONS #888', 'Tim Hortons');
  perform public.apply_merchant_user_evidence(
    v_a, current_setting('test.merchant_user_id')::uuid, 'map', v_tim_a, true
  );
  update public.merchant_resolution_jobs set status = 'unresolved',
    next_attempt_at = now() + interval '30 days' where transaction_id = v_c;
  perform public.apply_merchant_user_evidence(
    v_b, current_setting('test.merchant_user_id')::uuid, 'map', v_tim_b, true
  );
  perform set_config('test.tim_b', v_b::text, false);
  perform set_config('test.tim_c', v_c::text, false);
  perform set_config('test.tim_b_merchant', v_tim_b::text, false);
end;
$$;
select ok(
  not exists (
    select 1 from public.merchant_user_overrides
    where user_id = current_setting('test.merchant_user_id')::uuid
      and normalized_pattern = 'tim hortons'
      and evidence_context_key = 'structured_merchant_name'
  ),
  'conflicting broad structured mappings are removed instead of overwritten'
);
select is(
  (select merchant_id from public.merchant_user_overrides
   where user_id = current_setting('test.merchant_user_id')::uuid
     and normalized_pattern = 'tim hortons #999'
     and evidence_context_key = 'merchant_text'),
  current_setting('test.tim_b_merchant')::uuid,
  'conflicting confirmation still stores the exact descriptor mapping'
);
select is(
  (select status from public.merchant_resolution_jobs
   where transaction_id = current_setting('test.tim_c')::uuid),
  'unresolved',
  'ambiguous Tim Hortons structured evidence is not broadly requeued'
);

select has_column('public', 'merchant_user_overrides', 'action', 'overrides model map versus suppress');
select hasnt_table_privilege(
  'authenticated', 'public.merchant_resolution_jobs', 'select',
  'authenticated users cannot read resolver jobs directly'
);

select * from finish();
rollback;
