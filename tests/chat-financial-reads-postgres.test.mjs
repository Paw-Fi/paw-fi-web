import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = (name) =>
  readFile(new URL("../supabase/migrations/" + name, import.meta.url), "utf8");
const actor = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
const family = "00000000-0000-4000-8000-000000000003";
const contact1 = "00000000-0000-4000-8000-000000000004",
  contact2 = "00000000-0000-4000-8000-000000000005";
test("chat reads use the account role, the complete app summary, and only visible transaction details", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create role authenticator; grant anon,authenticated,service_role to authenticator;
    create schema auth; create function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
        nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
    grant usage on schema auth to authenticated,service_role;
    create table households(id uuid primary key,name text,is_portfolio boolean);
    create table household_members(household_id uuid,user_id uuid,role text);
    create table user_contacts(id uuid,user_id uuid);
    create table expenses(id uuid primary key default gen_random_uuid(),user_id uuid,contact_id uuid,household_id uuid,
      privacy_scope text default 'full',date date default '2026-11-01',created_at timestamptz default now(),deleted_at timestamptz,
      amount_cents bigint default 100,currency text default 'EUR',category text default 'groceries',raw_text text,account_id uuid,
      type text default 'expense',analytics_class text,analytics_spending_multiplier int default 1,
      analytics_counts_toward_income boolean default false,is_recurring boolean default false);
    alter table expenses add column split_group_id uuid,add column updated_at timestamptz,
      add column recurrence_rule jsonb,add column provider text,add column bank_account_id uuid;
    create table recurring_occurrences(recurring_id uuid,scheduled_occurrence_date date,status text);
    grant select on recurring_occurrences to authenticated;
    create table account_transfers(id uuid primary key,household_id uuid);
    grant select on account_transfers to authenticated;
    create table financial_goals(user_id uuid,household_id uuid,privacy_scope text,title text,status text,currency text,
      target_amount numeric,current_amount numeric,target_date date);
    create table bank_connections(id uuid default gen_random_uuid(),user_id uuid,household_id uuid,removed_at timestamptz,
      provider text,status text,last_successful_sync_at timestamptz,relink_state text,access_token text);
    create table file_import_jobs(user_id uuid,household_id uuid,file_name text,status text,total int,processed int,
      imported int,skipped int,created_at timestamptz,plan_path text);
    grant select on households,household_members,user_contacts,expenses,financial_goals,file_import_jobs to authenticated;
    alter table expenses enable row level security;
    create policy contact_owned on expenses for select to authenticated using (deleted_at is null and
      exists(select 1 from user_contacts c where c.id=contact_id and c.user_id=auth.uid()));
    insert into households values ('${family}','Family',false);
    insert into household_members values ('${family}','${actor}','member');
    insert into user_contacts values ('${contact1}','${actor}'),('${contact2}','${actor}');
    insert into expenses(contact_id) select case when n%2=0 then '${contact1}'::uuid else '${contact2}'::uuid end from generate_series(1,1001) n;
    insert into expenses(user_id,amount_cents,currency) values ('${other}',15000,'EUR'),('${actor}',10000,'USD');
    insert into expenses(user_id,household_id,privacy_scope,raw_text,created_at) values
      ('${other}','${family}','private','private detail','2026-11-06'),('${other}','${family}','balances_only','balance detail','2026-11-05'),
      ('${other}','${family}','full','visible shared','2026-11-04'),('${actor}','${family}','private','own detail','2026-11-03');
    insert into bank_connections(user_id,provider,status,access_token) values
      ('${actor}','plaid','active','secret'),('${other}','other','active','foreign');
    insert into financial_goals(user_id,household_id,privacy_scope,title) values
      ('${other}','${family}','balances_only','hidden goal'),('${other}','${family}','full','Shared goal');
    insert into file_import_jobs(user_id,file_name,status,plan_path) values
      ('${actor}','my.csv','completed','private/path'),('${other}','foreign.csv','failed','foreign/path');
  `);
  const privacy = await migration(
    "20260716230000_plaid_analytics_classification.sql",
  );
  const policy = privacy.slice(
    privacy.indexOf(
      'create policy "Users can view expenses and income with privacy"',
    ),
  );
  await db.exec(policy.slice(0, policy.indexOf(");") + 2));
  const canonical = await migration(
    "20260815120000_fix_sync_job_enqueue_and_summary_analytics.sql",
  );
  const summary = canonical.slice(
    canonical.indexOf(
      "create or replace function public.get_user_transactions_summary_v2",
    ),
  );
  await db.exec(summary.slice(0, summary.indexOf("\n$$;") + 4));
  // Model the enriched feed at its boundary. It can paginate past hidden rows
  // and attach metadata even where the original row was redacted.
  await db.exec(`
    create function get_user_transactions_page_v6(uuid,uuid,text,text[],text,uuid,boolean,text[],text,text,date,date,int,date,timestamptz,text)
    returns jsonb language sql security definer as $$
    with candidates as (select e.* from public.expenses e where household_id=$2 and not is_recurring
      and ($14 is null or (date,created_at,id::text)<($14,$15,$16))
      order by date desc,created_at desc,id desc limit $13+1),
    page as (select * from candidates order by date desc,created_at desc,id desc limit $13)
    select jsonb_build_object('items',(select jsonb_agg(to_jsonb(p)||jsonb_build_object('merchant','enriched private metadata')
      order by date desc,created_at desc,id desc) from page p),
      'has_more',(select count(*)>$13 from candidates),
      'next_cursor',(select jsonb_build_object('date',date,'created_at',created_at,'id',id) from page order by date,created_at,id limit 1))
    $$;
  `);
  const scheduleHelpers = await migration(
    "20260408170000_add_recurring_aware_wallets_and_pockets_rpcs.sql",
  );
  await db.exec(
    scheduleHelpers.slice(
      0,
      scheduleHelpers.indexOf(
        "create or replace function public.get_projected_scoped_recurring_expenses_v1",
      ),
    ),
  );
  const scheduleSource = await migration(
    "20260718160000_plaid_lifecycle_atomicity_followup.sql",
  );
  const schedule = scheduleSource.slice(
    scheduleSource.indexOf(
      "create or replace function public.get_projected_scoped_recurring_expenses_v1",
    ),
  );
  await db.exec(schedule.slice(0, schedule.indexOf("\n$$;") + 4));
  await db.exec(`
    insert into expenses(user_id,household_id,raw_text,privacy_scope,date,is_recurring,recurrence_rule) values
      ('${actor}','${family}','Gym','full','2026-11-01',true,'{"frequency":"weekly"}'),
      ('${other}','${family}','Hidden bill','balances_only','2026-11-01',true,'{"frequency":"weekly"}');
    insert into recurring_occurrences select id,'2026-11-08','skipped' from expenses where raw_text='Gym';
    insert into recurring_occurrences select id,'2026-11-15','confirmed' from expenses where raw_text='Gym';
    create function user_financial_month_start_day(uuid) returns int language sql as $$select 1$$;
    create function next_financial_cycle_start(date,int) returns date language sql as $$select ($1+interval '1 month')::date$$;
    -- The app's Pocket RPC also returns transaction details. The chat contract drops them.
    create function get_pockets_month_v4(uuid,text,date,uuid,text,boolean,boolean) returns jsonb language sql as $$
      select jsonb_build_object('period_month',$3,'selected_currency',$5,'budget',jsonb_build_object('total_budget_cents',40000),
        'uncategorized_expenses',jsonb_build_array('private text'),'envelopes',jsonb_build_array(jsonb_build_object(
          'name','Food','base_budget_amount_cents',35000,'rollover_enabled',true,'available_budget_cents',41000,'spent_cents',200,
          'remaining_cents',40800,'external_metadata','do not return'))) $$;
    create function get_wallets_history_v2(uuid,uuid,text,date) returns jsonb language plpgsql as $$
    begin
      if current_user <> 'authenticated' or auth.uid() is distinct from $1
         or current_setting('request.jwt.claim.role',true) is distinct from 'authenticated'
         or current_setting('request.jwt.claims',true)::jsonb is distinct from jsonb_build_object('sub',$1,'role','authenticated') then
        raise exception 'Unexpected read identity';
      end if;
      return jsonb_build_object('net_worth_series',jsonb_build_array(jsonb_build_object('month_start',$4,'net_worth_cents',5000)));
    end $$;
    create table public.users(id uuid primary key,full_name text);
    grant select on public.users to authenticated;
    insert into public.users values ('${other}','Alex');
    create function households_get_pairwise_settlement_balances_v2(uuid,text) returns table(other_user_id uuid,currency text,
      net_cents bigint,split_to_cents bigint,split_from_cents bigint,paid_to_cents bigint,paid_from_cents bigint)
      language sql as $$select '${other}'::uuid,$2,100::bigint,100::bigint,0::bigint,0::bigint,0::bigint$$;
  `);
  // Hosted migrations run without PostgreSQL superuser privileges.
  await db.exec(`
    create role chat_migrator nosuperuser nobypassrls;
    grant usage,create on schema public to chat_migrator;
    grant usage on schema auth to chat_migrator;
    grant select on bank_connections,household_members to chat_migrator;
    set session authorization chat_migrator;
  `);
  const chatMigration = await migration(
    "20261123120000_chat_financial_reads.sql",
  );
  await db.exec(chatMigration);
  await db.exec(chatMigration);
  await db.exec(`
    reset session authorization;
    set session authorization authenticator;
    set role service_role;
    begin read only;
    set local request.jwt.claim.sub='${other}';
    set local request.jwt.claim.role='service_role';
    set local request.jwt.claims='{"role":"service_role","sub":"${other}","test":"caller"}';
  `);
  const callerIdentity = async () =>
    (await db.query(`
    select current_user as role, auth.uid() as actor,
      current_setting('request.jwt.claim.sub',true) as legacy_sub,
      current_setting('request.jwt.claim.role',true) as legacy_role,
      current_setting('request.jwt.claims',true) as claims
  `)).rows[0];
  const originalIdentity = await callerIdentity();
  const read = async (view, space = null, args = {}, user = actor) =>
    (await db.query(
      "select public.read_chat_finance_v1($1,$2,$3,$4) as result",
      [user, view, space, JSON.stringify(args)],
    )).rows[0].result;
  const period = {
    currency: "EUR",
    start_date: "2026-11-01",
    end_date: "2026-11-30",
  };
  assert.equal(
    (await read("summary", null, period)).expense_total_cents,
    100100,
  );
  assert.equal(
    (await read("summary", family, period)).expense_total_cents,
    200,
  );
  const scheduleResult = await read("projections", family, period);
  assert.deepEqual(scheduleResult.items.map((r) => [r.date, r.raw_text]), [
    ["2026-11-01", "Gym"],
    ["2026-11-22", "Gym"],
    ["2026-11-29", "Gym"],
  ]);
  assert.equal(scheduleResult.count, 3);
  assert.equal(
    (await read("recurring_scope", family, {
      series_id: scheduleResult.items[0].recurring_id,
    })).available,
    true,
  );
  assert.equal(
    (await read("recurring_scope", null, {
      series_id: scheduleResult.items[0].recurring_id,
    })).available,
    false,
  );
  const pockets = await read("pockets", family, period);
  assert.deepEqual(pockets.totals, {
    budget_cents: 41000,
    spent_cents: 200,
    remaining_cents: 40800,
    allocated_cents: 35000,
  });
  assert.equal(pockets.uncategorized_expenses, undefined);
  assert.equal(pockets.pockets[0].external_metadata, undefined);
  assert.equal(
    (await read("settlements", family, period)).balances[0].member,
    "Alex",
  );
  assert.equal(
    (await read("wallet_history", family, period)).net_worth_series[0]
      .net_worth_cents,
    5000,
  );
  const first = await read("transactions", family, { limit: 1 });
  assert.deepEqual(first.items.map((r) => r.raw_text), ["visible shared"]);
  assert.equal(first.has_more, true);
  const second = await read("transactions", family, {
    limit: 1,
    cursor: first.next_cursor,
  });
  assert.deepEqual(second.items.map((r) => r.raw_text), ["own detail"]);
  assert.equal(second.has_more, false);
  assert.deepEqual((await read("goals", family)).goals.map((g) => g.title), [
    "Shared goal",
  ]);
  assert.deepEqual((await read("bank_status")).connections, [{
    provider: "plaid",
    status: "active",
    last_successful_sync_at: null,
    relink_state: null,
  }]);
  assert.deepEqual(
    (await read("import_status")).recent_imports.map((i) =>
      Object.keys(i).sort()
    ),
    [
      [
        "file_name",
        "status",
        "total",
        "processed",
        "imported",
        "skipped",
        "created_at",
      ].sort(),
    ],
  );
  assert.equal(
    (await read("import_status")).recent_imports[0].file_name,
    "my.csv",
  );
  assert.deepEqual(await callerIdentity(), originalIdentity);
  assert.equal(
    (await read("bank_status", null, {}, other)).connections[0].provider,
    "other",
  );
  assert.deepEqual(await callerIdentity(), originalIdentity);
  await db.exec("savepoint denied_space");
  await assert.rejects(() => read("transactions", other), { code: "42501" });
  await db.exec("rollback to denied_space");
  assert.deepEqual(await callerIdentity(), originalIdentity);
  await db.exec("commit");
  assert.equal(
    (await read("summary", null, period)).expense_total_cents,
    100100,
  );
  await db.exec("set role authenticated");
  await assert.rejects(() => read("summary", null, period), { code: "42501" });
  await db.exec("set role anon");
  await assert.rejects(() => read("spaces"), { code: "42501" });
});
