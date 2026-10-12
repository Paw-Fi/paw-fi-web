import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const household = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
const first = "33333333-3333-4333-8333-333333333333";
const second = "44444444-4444-4444-8444-444444444444";
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create type household_role as enum ('owner','admin','member');
    create type invite_status as enum ('pending','accepted','revoked','expired');
    create table households(id uuid primary key, owner_id uuid, is_portfolio boolean default false);
    create table household_members(id uuid primary key default gen_random_uuid(),
      household_id uuid references households(id), user_id uuid references auth.users(id),
      role household_role not null default 'member', unique(household_id,user_id));
    create table invites(id uuid primary key default gen_random_uuid(), token text unique not null,
      household_id uuid references households(id), inviter_id uuid references auth.users(id),
      invited_user_id uuid references auth.users(id), status invite_status not null default 'pending',
      expires_at timestamptz, accepted_at timestamptz, invited_email text,
      created_at timestamptz default now(),
      constraint accepted_requires_user check(status != 'accepted' or (invited_user_id is not null and accepted_at is not null)));
    insert into households(id) values ('${household}');
    insert into auth.users values ('${owner}'),('${first}'),('${second}');
    insert into invites(token, household_id, inviter_id) values ('legacy','${household}','${owner}');
  `);
  const originalMigration = await readFile(
    new URL(
      "../supabase/migrations/20251021_households_joint_accounts.sql",
      import.meta.url,
    ),
    "utf8",
  );
  for (const policy of [
    "Users can view their own membership",
    "Allow household member insertion",
    "Inviters can view their invites",
    "Owners and admins can create invites",
    "Authorized users can revoke invites",
  ]) {
    const statement = originalMigration.match(
      new RegExp(`CREATE POLICY "${policy}"[\\s\\S]*?;`),
    );
    assert.ok(statement, `production policy ${policy}`);
    await db.exec(statement[0]);
  }
  await db.exec(`
    alter table household_members enable row level security;
    alter table invites enable row level security;
    grant usage on schema public, auth to authenticated, service_role;
    grant select, insert, update, delete on household_members, invites, households to authenticated, service_role;
  `);
  const ownerTrigger = originalMigration.match(
    /CREATE OR REPLACE FUNCTION add_owner_as_member\(\)[\s\S]*?FOR EACH ROW EXECUTE FUNCTION add_owner_as_member\(\);/,
  );
  assert.ok(ownerTrigger);
  await db.exec(ownerTrigger[0]);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261012120000_reusable_household_invites.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
after(async () => {
  if (db) await db.close();
});
beforeEach(async () => {
  await db.exec(
    "reset role; delete from household_members; delete from invites where token <> 'legacy'; update households set is_portfolio=false;",
  );
});
const scalar = async (sql, params = []) =>
  (await db.query(sql, params)).rows[0].value;
const accept = (token, user = first) =>
  scalar("select households_accept_invite_v1($1,$2) as value", [token, user]);
const insert = async ({
  token = "link",
  reusable = true,
  role = "member",
  status = "pending",
  expires = null,
} = {}) => {
  await db.query(
    `insert into invites(token,household_id,inviter_id,is_reusable,invited_role,status,expires_at)
    values ($1,$2,$3,$4,$5,$6,$7)`,
    [token, household, owner, reusable, role, status, expires],
  );
};

test("PG migration backfills legacy defaults and restricts owner/email contracts", async () => {
  const row = (
    await db.query(
      "select is_reusable, invited_role from invites where token='legacy'",
    )
  ).rows[0];
  assert.deepEqual(row, { is_reusable: false, invited_role: "admin" });
  await assert.rejects(() => insert({ role: "owner" }), /check constraint/);
  await insert();
  await assert.rejects(
    () =>
      db.exec(
        "update invites set invited_email='recipient@example.com' where token='link'",
      ),
    /check constraint/,
  );
});

test("PG reusable invite admits many users with selected role and remains pending", async () => {
  await insert();
  for (const user of [first, second]) {
    const result = await accept("link", user);
    assert.equal(result.success, true);
    assert.equal(result.member_created, true);
    assert.equal(result.household_id, household);
    assert.equal(result.inviter_id, owner);
  }
  const rows = (await db.query("select role from household_members")).rows;
  assert.deepEqual(
    rows.map((row) => row.role),
    ["member", "member"],
  );
  const row = (
    await db.query(
      "select status,invited_user_id,accepted_at from invites where token='link'",
    )
  ).rows[0];
  assert.deepEqual(row, {
    status: "pending",
    invited_user_id: null,
    accepted_at: null,
  });
});

test("PG one reusable admin link admits one hundred distinct people", async () => {
  await insert({ role: "admin" });
  const users = Array.from(
    { length: 100 },
    (_, index) => `66666666-6666-4666-8666-${String(index).padStart(12, "0")}`,
  );
  for (const user of users) {
    await db.query("insert into auth.users(id) values($1)", [user]);
    assert.equal((await accept("link", user)).member_created, true);
  }
  assert.equal(
    await scalar(
      "select count(*)::int as value from household_members where role='admin'",
    ),
    100,
  );
  assert.equal(
    await scalar("select status as value from invites where token='link'"),
    "pending",
  );
});

test("PG retries and existing owners retain membership role without claiming new side effects", async () => {
  await insert({ role: "admin" });
  const joined = await accept("link");
  const retry = await accept("link");
  assert.equal(retry.member_id, joined.member_id);
  assert.equal(retry.member_created, false);
  await db.query(
    "insert into household_members(household_id,user_id,role) values($1,$2,'owner')",
    [household, owner],
  );
  assert.equal((await accept("link", owner)).member_created, false);
  assert.equal(
    await scalar(
      "select role as value from household_members where user_id=$1",
      [owner],
    ),
    "owner",
  );
});

test("PG single-use consumes exactly once and same actor retry succeeds even after expiry", async () => {
  await insert({ reusable: false, role: "admin" });
  const joined = await accept("link");
  assert.equal(joined.member_created, true);
  assert.equal(
    await scalar("select status as value from invites where token='link'"),
    "accepted",
  );
  assert.equal((await accept("link", second)).error_code, "ACCEPTED");
  await db.exec(
    "update invites set expires_at=now()-interval '1 second' where token='link'",
  );
  assert.equal((await accept("link")).member_id, joined.member_id);
  await db.exec("delete from household_members");
  assert.equal((await accept("link")).error_code, "ACCEPTED");
});

test("PG existing member success does not consume another single-use link or change role", async () => {
  await insert();
  await accept("link");
  await insert({ token: "personal", reusable: false, role: "admin" });
  const result = await accept("personal");
  assert.equal(result.success, true);
  assert.equal(result.member_created, false);
  assert.equal(
    await scalar("select status as value from invites where token='personal'"),
    "pending",
  );
  assert.equal(
    await scalar("select role as value from household_members"),
    "member",
  );
});

for (const reusable of [false, true]) {
  for (const [status, expires, code] of [
    ["revoked", null, "REVOKED"],
    ["expired", null, "EXPIRED"],
    ["pending", "2000-01-01T00:00:00Z", "EXPIRED"],
  ]) {
    test(`PG ${reusable ? "reusable" : "single-use"} rejects ${status}/${expires}`, async () => {
      await insert({ reusable, status, expires });
      assert.equal((await accept("link")).error_code, code);
      assert.equal(
        await scalar("select count(*)::int as value from household_members"),
        0,
      );
    });
  }
}

test("PG missing/private invitations do not create membership", async () => {
  assert.equal((await accept("missing")).error_code, "NOT_FOUND");
  await insert();
  await db.exec("update households set is_portfolio=true");
  assert.equal((await accept("link")).error_code, "PRIVATE_SPACE");
  assert.equal(
    await scalar("select count(*)::int as value from household_members"),
    0,
  );
});

test("PG membership failure rolls back single-use consumption", async () => {
  await insert({ reusable: false });
  await assert.rejects(
    () => accept("link", "55555555-5555-4555-8555-555555555555"),
    /foreign key/,
  );
  assert.equal(
    await scalar("select status as value from invites where token='link'"),
    "pending",
  );
});

test("PG invite consumption failure rolls back newly inserted membership", async () => {
  await insert({ reusable: false });
  await db.exec(`create function reject_invite_acceptance() returns trigger language plpgsql as $$
    begin raise exception 'test acceptance failure'; end $$;
    create trigger reject_invite_acceptance before update on invites
      for each row execute function reject_invite_acceptance();`);
  try {
    await assert.rejects(() => accept("link"), /test acceptance failure/);
    assert.equal(
      await scalar("select count(*)::int as value from household_members"),
      0,
    );
    assert.equal(
      await scalar("select status as value from invites where token='link'"),
      "pending",
    );
  } finally {
    await db.exec(
      "drop trigger reject_invite_acceptance on invites; drop function reject_invite_acceptance()",
    );
  }
});

test("PG expiry uses wall clock even when transaction began before expiry", async () => {
  await insert();
  await db.exec(
    "begin; update invites set expires_at=clock_timestamp()+interval '50 milliseconds' where token='link'; select pg_sleep(0.1)",
  );
  try {
    assert.equal((await accept("link")).error_code, "EXPIRED");
    assert.equal(
      await scalar("select count(*)::int as value from household_members"),
      0,
    );
  } finally {
    await db.exec("rollback");
  }
});

test("PG revoke and acceptance preserve both lifecycle operation orders", async () => {
  await insert({ reusable: false });
  await db.exec(
    "update invites set status='revoked' where token='link' and status in ('pending','expired')",
  );
  assert.equal((await accept("link")).error_code, "REVOKED");
  await insert({ token: "accepted", reusable: false });
  await accept("accepted");
  assert.equal(
    (
      await db.query(
        "update invites set status='revoked' where token='accepted' and status in ('pending','expired') returning id",
      )
    ).rows.length,
    0,
  );
  await insert({ token: "reusable" });
  await accept("reusable", second);
  await db.exec(
    "update invites set status='revoked' where token='reusable' and status in ('pending','expired')",
  );
  assert.equal((await accept("reusable")).error_code, "REVOKED");
});

test("PG function ACL is service-only and executes with pinned definer search path", async () => {
  for (const role of ["anon", "authenticated", "service_role"]) {
    assert.equal(
      await scalar(
        "select has_function_privilege($1,'public.households_accept_invite_v1(text,uuid)','execute') as value",
        [role],
      ),
      role === "service_role",
    );
    await db.exec(`set role ${role}`);
    if (role === "service_role")
      assert.equal((await accept("missing")).error_code, "NOT_FOUND");
    else await assert.rejects(() => accept("missing"), /permission denied/);
    await db.exec("reset role");
  }
  const functionRow = (
    await db.query(
      "select prosecdef,proconfig from pg_proc where proname='households_accept_invite_v1'",
    )
  ).rows[0];
  assert.equal(functionRow.prosecdef, true);
  assert.ok(
    functionRow.proconfig.some((value) => value.startsWith("search_path=")),
  );
});

test("PG authenticated users cannot join a known space directly with any role", async () => {
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${first}', false); set role authenticated`,
  );
  for (const role of ["member", "admin", "owner"]) {
    await assert.rejects(
      () =>
        db.query(
          "insert into household_members(household_id,user_id,role) values($1,$2,$3)",
          [household, first, role],
        ),
      /row-level security/,
    );
  }
});

test("PG direct invitation creation is denied even for current owners", async () => {
  await db.query(
    "insert into household_members(household_id,user_id,role) values($1,$2,'owner')",
    [household, owner],
  );
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${owner}', false); set role authenticated`,
  );
  await assert.rejects(
    () =>
      db.query(
        "insert into invites(token,household_id,inviter_id) values($1,$2,$3)",
        ["bypass-link", household, owner],
      ),
    /row-level security/,
  );
});

test("PG demoted and removed inviters cannot edit link authority or revoke directly", async () => {
  await insert();
  for (const membership of ["member", null]) {
    await db.exec("reset role; delete from household_members");
    if (membership)
      await db.query(
        "insert into household_members(household_id,user_id,role) values($1,$2,$3)",
        [household, owner, membership],
      );
    await db.exec(
      `select set_config('request.jwt.claim.sub', '${owner}', false); set role authenticated`,
    );
    assert.equal(
      (await db.query("select token from invites where token='link'")).rows
        .length,
      1,
    );
    for (const patch of [
      "invited_role='admin'",
      "is_reusable=false",
      "expires_at=now()+interval '1 day'",
      "status='revoked'",
    ]) {
      assert.equal(
        (
          await db.query(
            `update invites set ${patch} where token='link' returning id`,
          )
        ).rows.length,
        0,
      );
    }
  }
});

test("PG owner creation trigger and service-role writes survive policy hardening", async () => {
  const newHousehold = "55555555-5555-4555-8555-555555555555";
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${first}', false); set role authenticated`,
  );
  await db.query("insert into households(id,owner_id) values($1,$2)", [
    newHousehold,
    first,
  ]);
  assert.equal(
    await scalar(
      "select role as value from household_members where household_id=$1",
      [newHousehold],
    ),
    "owner",
  );
  await db.exec("reset role; delete from household_members;");
  await db.query("delete from households where id=$1", [newHousehold]);
  await db.exec("set role service_role");
  await insert();
  const accepted = await accept("link");
  assert.equal(accepted.success, true);
  assert.equal(
    (
      await db.query(
        "update invites set status='revoked' where token='link' returning id",
      )
    ).rows.length,
    1,
  );
});

test("PG queued duplicate/different-user calls return one single-use winner", async () => {
  // PGlite has one session: this exercises queued calls, not multi-session locks.
  await insert({ reusable: false });
  const results = await Promise.all([
    accept("link", first),
    accept("link", first),
    accept("link", second),
  ]);
  assert.equal(results.filter((result) => result.member_created).length, 1);
  assert.equal(results[1].success, true);
  assert.equal(results[2].error_code, "ACCEPTED");
  assert.equal(
    await scalar("select count(*)::int as value from household_members"),
    1,
  );
});
