// Run: node --test tests/financial-reset-jobs.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL(
  "../supabase/migrations/20261120100000_financial_reset_jobs.sql",
  import.meta.url,
);
const migration = await readFile(migrationUrl, "utf8");
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const first = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const second = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const missing = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const scalar = async (db, sql, params = []) =>
  (await db.query(sql, params)).rows[0].value;

async function fixture(t, { installer = "postgres" } = {}) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create role reset_unprivileged nologin;
    create role reset_owner nologin nosuperuser nocreatedb nocreaterole nobypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${alice}'), ('${bob}');
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      )::uuid
    $$;
    grant usage on schema public, auth to public;
    grant execute on function auth.uid() to public;

    -- pg_cron cannot run inside PGlite. Keep scheduling observable, but never
    -- replace any of the production table, RPC, worker, or grant statements.
    create schema cron;
    create table cron.job (
      jobid bigint generated always as identity primary key,
      jobname text unique, schedule text, command text
    );
    create function cron.schedule(job_name text, schedule text, command text)
    returns bigint language sql as $$
      insert into cron.job(jobname, schedule, command)
      values (job_name, schedule, command)
      on conflict (jobname) do update
        set schedule = excluded.schedule, command = excluded.command
      returning jobid
    $$;
    create function cron.schedule(schedule text, command text)
    returns bigint language sql as $$
      insert into cron.job(schedule, command) values (schedule, command)
      returning jobid
    $$;
    create function cron.unschedule(job_id bigint)
    returns boolean language sql as $$
      with removed as (delete from cron.job where jobid = job_id returning 1)
      select exists(select 1 from removed)
    $$;

    create schema reset_fixture;
    create table reset_fixture.records (
      user_id uuid not null, ordinal integer not null,
      payload text not null, primary key (user_id, ordinal)
    );
    insert into reset_fixture.records
      select u.id, i, '食費 / مصروف / 💶 ' || i
      from auth.users u cross join generate_series(1, 6000) i;
    create table reset_fixture.control (mode text not null);
    insert into reset_fixture.control values ('success');
    create table reset_fixture.calls (
      ordinal bigint generated always as identity,
      actor uuid not null,
      observed_auth jsonb not null
    );
    create sequence reset_fixture.attempts;
    create table reset_fixture.expected_auth (value jsonb not null);
    create function reset_fixture.auth_context() returns jsonb
    language sql as $$
      select jsonb_build_object('actor', auth.uid(),
        'sub', coalesce(current_setting('request.jwt.claim.sub', true), ''),
        'claims', coalesce(current_setting('request.jwt.claims', true), ''),
        'role', coalesce(current_setting('request.jwt.claim.role', true), ''),
        'sentinel', coalesce(current_setting('request.jwt.claim.sentinel', true), ''))
    $$;
    create function reset_fixture.assert_auth_unchanged() returns void
    language plpgsql as $$ begin
      if exists (select 1 from reset_fixture.expected_auth
          where value is distinct from reset_fixture.auth_context()) then
        raise exception 'fixture: auth context changed INSIDE reset helper';
      end if;
    end $$;

    -- Representative originals for the migration's pg_get_functiondef rewrite:
    -- BOTH assign auth.uid() in the body, and the wrapper calls the public core.
    -- Model only financial deletes; nextval survives failed subtransactions.
    create function public.perform_user_financial_data_reset() returns jsonb
    language plpgsql security definer set search_path = '' as $$
    declare
      current_user_id uuid;
      v_mode text;
    begin
      current_user_id := auth.uid();
      if current_user_id is null then raise exception 'fixture: missing actor'; end if;
      perform nextval('reset_fixture.attempts');
      perform reset_fixture.assert_auth_unchanged();
      insert into reset_fixture.calls(actor, observed_auth)
        values (current_user_id, reset_fixture.auth_context());
      delete from reset_fixture.records
        where user_id = current_user_id and ordinal <= 3000;
      select mode into v_mode from reset_fixture.control;
      if v_mode = 'throw' then
        raise exception 'fixture: failure after partial deletion';
      end if;
      delete from reset_fixture.records where user_id = current_user_id;
      perform reset_fixture.assert_auth_unchanged();
      return jsonb_build_object('success', true);
    end
    $$;
    create function public.reset_user_financial_data() returns jsonb
    language plpgsql security definer set search_path = '' as $$
    declare
      current_user_id uuid;
    begin
      current_user_id := auth.uid();
      if current_user_id is null then raise exception 'fixture: missing actor'; end if;
      perform public.perform_user_financial_data_reset();
      if (select mode from reset_fixture.control) = 'return_failure' then
        return jsonb_build_object('success', false,
          'message', 'fixture: returned failure after deletion');
      end if;
      return jsonb_build_object('success', true);
    end
    $$;
    revoke all on function public.perform_user_financial_data_reset(),
      public.reset_user_financial_data() from public;
    grant execute on function public.reset_user_financial_data()
      to authenticated;
  `);
  if (installer === "reset_owner") {
    // Bootstrap privileges only. Installation itself must not inherit postgres
    // or the ability to change a superuser-only setting such as session auth.
    await db.exec(`
      alter schema public owner to reset_owner;
      alter function public.perform_user_financial_data_reset() owner to reset_owner;
      alter function public.reset_user_financial_data() owner to reset_owner;
      grant references on auth.users to reset_owner;
      grant usage on schema cron, reset_fixture to reset_owner;
      grant all on all tables in schema cron, reset_fixture to reset_owner;
      grant all on all sequences in schema cron, reset_fixture to reset_owner;
    `);
  }
  await db.transaction(async (tx) => {
    assert.ok(["postgres", "reset_owner"].includes(installer));
    await tx.exec(`set local role ${installer}`);
    assert.equal(await scalar(tx, "select current_user as value"), installer);
    if (installer === "reset_owner") {
      assert.equal(await scalar(tx,
        "select rolsuper as value from pg_roles where rolname = current_user"), false);
    }
    // Only omit the unavailable extension installation; cron's SQL API is above.
    await tx.exec(migration.replace(
      /\bcreate\s+extension\s+(?:if\s+not\s+exists\s+)?["']?pg_cron["']?(?:\s+with\s+schema\s+\w+)?\s*;/gi,
      "",
    ));
  });
  assert.equal(await scalar(db, "select current_user as value"), "postgres");
  return db;
}

// PGlite has one connection: role/JWT changes and each call are serialized in
// one transaction. Promise.all here would NOT prove multi-session lock safety.
async function asRole(db, role, actor, action) {
  assert.ok(["anon", "authenticated", "service_role", "reset_unprivileged"].includes(role));
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [actor ?? ""]);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(actor ? { sub: actor, role } : { role }),
    ]);
    return action(tx);
  });
}

const rpc = (db, name, id, expected) => scalar(db,
  `select public.${name}(p_request_id => $1::uuid,
    p_expected_user_id => $2::uuid) as value`, [id, expected]);
const request = (db, id = first, actor = alice) => asRole(db, "authenticated", actor,
  (tx) => rpc(tx, "request_financial_data_reset", id, actor));
const read = (db, id = first, actor = alice) => asRole(db, "authenticated", actor,
  (tx) => rpc(tx, "get_financial_data_reset", id, actor));
const worker = async (db) => {
  // This table is outside the rewritten functions: a SECURITY DEFINER SET or
  // set_config/restore trick cannot hide impersonation from the in-body probe.
  await db.exec(`delete from reset_fixture.expected_auth;
    insert into reset_fixture.expected_auth select reset_fixture.auth_context()`);
  return db.query("select public.process_financial_data_reset_job()");
};
const count = (db, actor) => scalar(db,
  "select count(*)::int as value from reset_fixture.records where user_id = $1", [actor]);
const attempts = (db) => scalar(db,
  "select case when is_called then last_value::int else 0 end as value from reset_fixture.attempts");
const jobs = (db) => scalar(db,
  "select count(*)::int as value from public.financial_reset_jobs");
const snapshot = (db) => scalar(db, `
  select md5(string_agg(row_to_json(r)::text, '' order by user_id, ordinal)) as value
  from reset_fixture.records r
`);

function status(result, id, expected) {
  assert.ok(result && typeof result === "object" && !Array.isArray(result));
  assert.equal(result.id, id);
  assert.equal(result.status, expected);
  if (result.message !== undefined && result.message !== null) {
    assert.equal(typeof result.message, "string");
  }
}

async function context(db) {
  return (await db.query(`select current_user as role, auth.uid() as actor,
    coalesce(current_setting('request.jwt.claim.sub', true), '') as sub,
    coalesce(current_setting('request.jwt.claims', true), '') as claims,
    coalesce(current_setting('request.jwt.claim.role', true), '') as claim_role
  `)).rows[0];
}

async function workerWithContextCheck(db, actor = bob) {
  await db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [actor ?? ""]);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(actor ? { sub: actor, role: "service_role", sentinel: "keep" }
        : { role: "service_role", sentinel: "keep" }),
    ]);
    await tx.exec("set local request.jwt.claim.role = 'service_role'");
    await tx.exec("set local request.jwt.claim.sentinel = 'untouched'");
    const before = await context(tx);
    await worker(tx);
    // Check BEFORE COMMIT: SET LOCAL alone must not hide leaked impersonation.
    assert.deepEqual(await context(tx), before);
  });
}

test("migration and installed reset functions never configure request JWT claims, including DEFINER proconfig", async (t) => {
  const setsJwt = /\bset_config\s*\(\s*['"]request\.jwt\.claim|\bset\s+(?:(?:local|session)\s+)?["']?request\.jwt\.claim/i;
  assert.doesNotMatch(migration, setsJwt);
  const db = await fixture(t);
  const { rows } = await db.query(`select p.oid::regprocedure::text as name,
      p.prosrc, coalesce(p.proconfig, array[]::text[]) as settings
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'perform_user_financial_data_reset', 'reset_user_financial_data',
      'perform_user_financial_data_reset_for_actor', 'reset_user_financial_data_for_actor',
      'request_financial_data_reset', 'get_financial_data_reset',
      'process_financial_data_reset_job')`);
  assert.equal(rows.length, 7, "both explicit-actor helpers must be installed");
  for (const row of rows) {
    assert.doesNotMatch(row.prosrc, setsJwt, row.name);
    for (const setting of row.settings) {
      assert.doesNotMatch(setting, /^request\.jwt\.claim/i, row.name);
    }
  }
});

test("worker without a JWT resets the queued actor without changing auth inside the helper", async (t) => {
  const db = await fixture(t);
  await request(db);
  assert.equal((await context(db)).actor, null);
  const expected = await scalar(db, "select reset_fixture.auth_context() as value");
  await worker(db);
  status(await read(db), first, "completed");
  assert.deepEqual((await db.query("select actor, observed_auth from reset_fixture.calls")).rows,
    [{ actor: alice, observed_auth: expected }]);
  assert.equal(await count(db, alice), 0);
  assert.equal(await count(db, bob), 6000);
});

test("explicit actor helpers are owner-only, not PUBLIC, client, or service-role APIs", async (t) => {
  const db = await fixture(t);
  for (const name of ["perform_user_financial_data_reset_for_actor", "reset_user_financial_data_for_actor"]) {
    const signature = `public.${name}(uuid)`;
    assert.ok(await scalar(db, "select to_regprocedure($1)::text as value", [signature]), signature);
    assert.equal(await scalar(db, `select count(*)::int as value
      from pg_proc p, lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where p.oid = $1::regprocedure and a.privilege_type = 'EXECUTE'
        and a.grantee <> p.proowner`, [signature]), 0, `${signature}: only its owner may execute`);
    for (const role of ["anon", "authenticated", "service_role", "reset_unprivileged"]) {
      assert.equal(await scalar(db,
        "select has_function_privilege($1, $2, 'EXECUTE') as value", [role, signature]), false);
      await assert.rejects(asRole(db, role, bob,
        (tx) => tx.query(`select public.${name}($1::uuid)`, [alice])),
      (error) => error.code === "42501", `${role} must not reset an explicit actor`);
    }
  }
  assert.equal(await attempts(db), 0);
  assert.equal(await count(db, alice), 6000);
  assert.equal(await count(db, bob), 6000);
});

  test('legacy public reset remains actor-scoped and the internal core remains private', async (t) => {
    const db = await fixture(t);
    await assert.rejects(asRole(db, "authenticated", alice,
      (tx) => tx.query('select public.perform_user_financial_data_reset()')), { code: '42501' });
    await assert.rejects(asRole(db, "authenticated", null,
      (tx) => tx.query('select public.reset_user_financial_data()')));
    assert.equal(await attempts(db), 0);
    await asRole(db, "authenticated", alice, (tx) => tx.query('select public.reset_user_financial_data()'));
    assert.equal(await count(db, alice), 0);
    assert.equal(await count(db, bob), 6000);
    assert.equal(await attempts(db), 1);
  });

test("non-superuser owner installs and replays reset function DDL and processes a retry without JWT impersonation", async (t) => {
  const db = await fixture(t, { installer: "reset_owner" });
  await request(db);
  await db.transaction(async (tx) => {
    await tx.exec("set local role reset_owner");
    await tx.exec(migration);
  });
  status(await read(db), first, 'pending');
  await db.transaction(async (tx) => {
    await tx.exec("set local role reset_owner");
    assert.equal((await context(tx)).actor, null);
    await worker(tx);
  });
  status(await read(db), first, "completed");
  await db.query("insert into reset_fixture.records values ($1, 7000, 'after owner reset')", [alice]);
  status(await request(db), first, "completed");
  await db.transaction(async (tx) => {
    await tx.exec("set local role reset_owner");
    await worker(tx);
  });
  assert.equal(await attempts(db), 1);
  assert.equal(await count(db, alice), 1);
  assert.equal(await count(db, bob), 6000);
});

test("enqueue is non-destructive, same-ID retries return one pending job, and reads expose status", async (t) => {
  const db = await fixture(t);
  assert.equal(await read(db), null);
  const before = await snapshot(db);
  status(await request(db), first, "pending");
  for (let i = 0; i < 12; i++) status(await request(db), first, "pending");
  status(await read(db), first, "pending");
  assert.equal(await jobs(db), 1);
  assert.equal(await attempts(db), 0);
  assert.equal(await snapshot(db), before);
});

test("worker completes as the job actor, deleting thousands of only that actor's records", async (t) => {
  const db = await fixture(t);
  await request(db);
  await workerWithContextCheck(db);
  status(await read(db), first, "completed");
  assert.equal(await count(db, alice), 0);
  assert.equal(await count(db, bob), 6000);
  assert.deepEqual((await db.query("select actor from reset_fixture.calls order by ordinal")).rows,
    [{ actor: alice }]);
  assert.equal(await attempts(db), 1);
});

test("late retry of a completed ID cannot erase financial records created after reset", async (t) => {
  const db = await fixture(t);
  await request(db);
  await worker(db);
  await db.query("insert into reset_fixture.records values ($1, 7000, 'new after reset')", [alice]);
  status(await request(db), first, "completed");
  await worker(db);
  status(await read(db), first, "completed");
  assert.equal(await count(db, alice), 1);
  assert.equal(await count(db, bob), 6000);
  assert.equal(await attempts(db), 1);
  assert.equal(await jobs(db), 1);
});

test("both device request IDs survive a lost coalesced response without a second deletion", async (t) => {
  const db = await fixture(t);
  await request(db);
  status(await request(db, second), first, 'pending');
  await worker(db);
  status(await read(db, second), second, 'completed');
  status(await request(db, second), second, 'completed');
  await worker(db);
  assert.equal(await jobs(db), 1);
  assert.equal(await attempts(db), 1);
});

test("one invocation dequeues only the oldest pending job; terminal jobs are not replayed", async (t) => {
  const db = await fixture(t);
  // Reverse lexical UUID order to distinguish FIFO from ordering by ID.
  await request(db, second, bob);
  await request(db, first, alice);
  await db.query(`update public.financial_reset_jobs set created_at =
    case when id = $1::uuid then now() - interval '2 days' else now() end`, [second]);
  await workerWithContextCheck(db, alice);
  status(await read(db, second, bob), second, "completed");
  status(await read(db), first, "pending");
  assert.equal(await count(db, alice), 6000);
  assert.equal(await count(db, bob), 0);
  assert.equal(await attempts(db), 1);
  await workerWithContextCheck(db, null);
  status(await read(db), first, "completed");
  await workerWithContextCheck(db);
  assert.equal(await attempts(db), 2);
});

test("empty queue is a no-op and preserves the caller's auth context", async (t) => {
  const db = await fixture(t);
  const before = await snapshot(db);
  await workerWithContextCheck(db);
  await workerWithContextCheck(db, null);
  assert.equal(await attempts(db), 0);
  assert.equal(await jobs(db), 0);
  assert.equal(await snapshot(db), before);
});

test("another authenticated actor cannot read or take over a request ID", async (t) => {
  const db = await fixture(t);
  await request(db);
  assert.equal(await read(db, first, bob), null);
  assert.equal(await read(db, missing, bob), null);
  // A global-ID conflict may reject or appear missing, but cannot reveal the job.
  let collision;
  try { collision = await request(db, first, bob); }
  catch (error) { assert.ok(error.code, "collision must be a PostgreSQL rejection"); }
  assert.equal(collision ?? null, null);
  assert.equal(await jobs(db), 1);
  status(await read(db), first, "pending");
  await worker(db);
  assert.equal(await read(db, first, bob), null);
  assert.equal(await count(db, bob), 6000);
});

for (const name of ["request_financial_data_reset", "get_financial_data_reset"]) {
  test(`${name} rejects an expected-user mismatch, null expected user, and absent auth`, async (t) => {
    const db = await fixture(t);
    await request(db);
    for (const [actor, expected] of [[alice, bob], [alice, null], [null, alice]]) {
      await assert.rejects(asRole(db, "authenticated", actor,
        (tx) => rpc(tx, name, first, expected)));
    }
    assert.equal(await jobs(db), 1);
    assert.equal(await attempts(db), 0);
    status(await read(db), first, "pending");
  });
}

test("null enqueue request ID is rejected without generating a different reset", async (t) => {
  const db = await fixture(t);
  await assert.rejects(request(db, null));
  assert.equal(await jobs(db), 0);
  assert.equal(await attempts(db), 0);
});

for (const role of ["anon", "authenticated", "service_role", "reset_unprivileged"]) {
  test(`${role} has no direct table privileges and cannot execute the postgres-only worker`, async (t) => {
    const db = await fixture(t);
    await request(db);
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
      assert.equal(await scalar(db,
        "select has_table_privilege($1, 'public.financial_reset_jobs', $2) as value",
        [role, privilege]), false, `${role}: ${privilege} must be revoked, not merely hidden by RLS`);
    }
    assert.equal(await scalar(db, `select has_function_privilege($1,
      'public.process_financial_data_reset_job()', 'EXECUTE') as value`, [role]), false);
    for (const sql of [
      "select * from public.financial_reset_jobs",
      "insert into public.financial_reset_jobs default values",
      "update public.financial_reset_jobs set status = 'completed'",
      "delete from public.financial_reset_jobs",
      "truncate public.financial_reset_jobs",
      "select public.process_financial_data_reset_job()",
    ]) {
      await assert.rejects(asRole(db, role, alice, (tx) => tx.exec(sql)),
        (error) => error.code === "42501", `${role}: ${sql}`);
    }
    status(await read(db), first, "pending");
    assert.equal(await count(db, alice), 6000);
    assert.equal(await attempts(db), 0);
  });
}

test("anonymous and PUBLIC-only roles cannot call either user RPC, even with a forged sub", async (t) => {
  const db = await fixture(t);
  for (const role of ["anon", "reset_unprivileged"]) {
    for (const name of ["request_financial_data_reset", "get_financial_data_reset"]) {
      await assert.rejects(asRole(db, role, alice, (tx) => rpc(tx, name, first, alice)),
        (error) => error.code === "42501");
    }
  }
  assert.equal(await jobs(db), 0);
});

for (const mode of ["throw", "return_failure"]) {
  test(`${mode}: partial reset rolls back, failure remains visible and late same-ID retry is harmless`, async (t) => {
    const db = await fixture(t);
    const before = await snapshot(db);
    await request(db);
    await db.query("update reset_fixture.control set mode = $1", [mode]);
    await workerWithContextCheck(db);
    status(await read(db), first, "failed");
    assert.match(await scalar(db,
      "select failure_detail as value from public.financial_reset_jobs where id = $1", [first]),
    mode === "throw" ? /fixture: failure after partial deletion/
      : /fixture: returned failure after deletion/,
    "exercise the intended rollback path, not an earlier auth-probe failure");
    assert.equal(await snapshot(db), before, "all deleted records must be restored exactly");
    assert.equal(await scalar(db, "select count(*)::int as value from reset_fixture.calls"), 0);
    assert.equal(await attempts(db), 1, "the failure must occur inside the reset dependency");
    assert.equal(await read(db, first, bob), null);
    await db.exec("update reset_fixture.control set mode = 'success'");
    status(await request(db), first, "failed");
    await workerWithContextCheck(db);
    assert.equal(await attempts(db), 1);
    assert.equal(await snapshot(db), before);
    // A genuinely new request is still processable after the failed job.
    status(await request(db, second), second, "pending");
    await workerWithContextCheck(db);
    status(await read(db, second), second, "completed");
    status(await read(db), first, "failed");
    assert.equal(await count(db, alice), 0);
    assert.equal(await count(db, bob), 6000);
  });
}

test("forced completion-update failure cannot commit a successful reset's partial worker effects", async (t) => {
  const db = await fixture(t);
  await request(db);
  const before = await snapshot(db);
  await db.exec(`
    create function reset_fixture.reject_completion() returns trigger
    language plpgsql as $$ begin
      if new.status = 'completed' then
        raise exception 'fixture: forced completion write failure' using errcode = 'P0001';
      end if;
      return new;
    end $$;
    create trigger fixture_reject_completion before update on public.financial_reset_jobs
      for each row execute function reset_fixture.reject_completion();
  `);
  // Either persist a failed job after rolling back the reset subtransaction,
  // or propagate the error and roll back the whole statement. Never lose data.
  await db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [bob]);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: bob, role: "service_role", sentinel: "keep" }),
    ]);
    const authBefore = await context(tx);
    await tx.exec("savepoint worker_failure");
    try { await worker(tx); }
    catch (error) {
      assert.equal(error.code, "P0001");
      assert.match(error.message, /fixture: forced completion write failure/);
      await tx.exec("rollback to savepoint worker_failure");
    }
    assert.deepEqual(await context(tx), authBefore);
  });
  assert.equal(await attempts(db), 1);
  assert.equal(await snapshot(db), before);
  assert.equal(await scalar(db, "select count(*)::int as value from reset_fixture.calls"), 0);
  const failedStatus = (await read(db)).status;
  assert.ok(["pending", "failed"].includes(failedStatus));
  if (failedStatus === "failed") {
    assert.match(await scalar(db,
      "select failure_detail as value from public.financial_reset_jobs where id = $1", [first]),
    /fixture: forced completion write failure/);
  }
  await db.exec("drop trigger fixture_reject_completion on public.financial_reset_jobs");
  await request(db, second, bob);
  // If the first job was rolled back to pending, consume it before Bob's job.
  await workerWithContextCheck(db);
  await workerWithContextCheck(db);
  status(await read(db, second, bob), second, "completed");
});

test("migration registers a cron command invoking the real worker", async (t) => {
  const db = await fixture(t);
  const { rows } = await db.query("select schedule, command from cron.job");
  const scheduled = rows.filter((row) => /\bprocess_financial_data_reset_job\s*\(\s*\)/i.test(row.command));
  assert.equal(scheduled.length, 1);
  assert.ok(scheduled[0].schedule.trim());
  await db.exec(scheduled[0].command);
  assert.equal(await attempts(db), 0);
});
