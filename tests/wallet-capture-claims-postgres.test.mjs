import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrations = new URL("../supabase/migrations/", import.meta.url);
const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const wallet = "33333333-3333-4333-8333-333333333333";
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create function uuid_generate_v4() returns uuid language sql as
      'select gen_random_uuid()';
    create table expenses (
      id uuid primary key default gen_random_uuid(), user_id uuid not null,
      household_id uuid, account_id uuid, category text default 'other',
      amount_cents integer default 1299, currency text default 'MYR',
      wallet_capture_idempotency_key text unique, deleted_at timestamptz,
      updated_at timestamptz default now()
    );
    create table accounts(id uuid primary key, is_system boolean, name text);
  `);
  for (const file of [
    "20260530120000_android_wallet_capture_logical_dedup.sql",
    "20260623124717_android_wallet_capture_currency_dedup_v2.sql",
    "20261022090000_wallet_capture_claim_lifecycle.sql",
    "20261022091000_cross_source_wallet_capture_claim.sql",
  ]) {
    if (file === "20261022090000_wallet_capture_claim_lifecycle.sql") {
      const sourceClasses = await readFile(
        new URL(
          "20260715120000_ai_android_notification_capture.sql",
          migrations,
        ),
        "utf8",
      );
      const sourceClassStart = sourceClasses.indexOf(
        "create or replace function public.android_wallet_capture_source_class(",
      );
      assert.ok(sourceClassStart >= 0);
      // Preserve the current email/SMS/bank/wallet source taxonomy too.
      await db.exec(sourceClasses.slice(sourceClassStart));
      // Apply the production follow-up for this RPC; unrelated wallet snapshot
      // functions in that migration are outside this isolated fixture.
      const followup = await readFile(
        new URL(
          "20260723131000_keep_unassigned_transactions_out_of_wallet_balances.sql",
          migrations,
        ),
        "utf8",
      );
      const start = followup.indexOf(
        "  select pg_get_functiondef(\n    'public.claim_android_wallet_capture_event_v2",
      );
      const end = followup.indexOf("  select pg_get_functiondef(", start + 1);
      assert.ok(start >= 0 && end > start);
      await db.exec(
        `do $$ declare v_definition text; v_updated text; begin ${followup.slice(start, end)} end; $$;`,
      );
    }
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  }
});
after(async () => db?.close());
beforeEach(async () =>
  db.exec("truncate wallet_capture_events, expenses cascade"),
);

async function claim(key, options = {}) {
  const args = [
    options.user ?? user,
    options.scope ?? "personal",
    null,
    false,
    options.wallet === undefined ? wallet : options.wallet,
    options.source ?? "android_notification_listener",
    options.package ?? "bank.example",
    "Bank",
    key,
    key,
    options.merchant === undefined ? "佐藤商店" : options.merchant,
    options.type ?? "expense",
    options.amount ?? 1299,
    options.currency ?? "MYR",
    options.date ?? "2026-10-21",
    options.time === undefined ? "2026-10-21T12:00:00Z" : options.time,
  ];
  if (options.v3)
    args.push(null, null, options.ambiguous ?? false, options.eligible ?? true);
  const { rows } = await db.query(
    `select ${options.v3 ? "claim_wallet_capture_event_v3" : "claim_android_wallet_capture_event_v2"}(
    $1::uuid,$2::text,$3::uuid,$4::boolean,$5::uuid,$6::text,$7::text,$8::text,
    $9::text,$10::text,$11::text,$12::text,$13::integer,$14::text,$15::date,
    $16::timestamptz${options.v3 ? ",$17::text,$18::text,$19::boolean,$20::boolean" : ""}) as result`,
    args,
  );
  return rows[0].result;
}
async function save(key, actor = user) {
  return (
    await db.query(
      `insert into expenses(user_id, wallet_capture_idempotency_key)
    values ($1, $2) returning id`,
      [actor, key],
    )
  ).rows[0].id;
}
async function event(id) {
  return (
    await db.query("select * from wallet_capture_events where id = $1", [id])
  ).rows[0];
}
async function release(id) {
  await db.query(
    "select release_android_wallet_capture_event($1, 'response_failed')",
    [id],
  );
}

const android = "android_notification_listener";
const ios = "ios_notification_shortcut";
const apple = "ios_wallet_shortcut";
const crossClaim = (key, options = {}) => claim(key, { ...options, v3: true });

for (const firstSource of [android, ios, apple]) {
  for (const secondSource of [android, ios, apple].filter(
    (s) => s !== firstSource,
  )) {
    test(`${firstSource} + ${secondSource}: pending claim retries then returns one expense`, async () => {
      const first = await crossClaim("first", { source: firstSource });
      assert.equal(first.status, "claimed");
      const pending = await crossClaim("second", { source: secondSource });
      assert.equal(pending.status, "processing");
      assert.equal(pending.claimId, first.claimId);
      const id = await save("first");
      const duplicate = await crossClaim("second", { source: secondSource });
      assert.equal(duplicate.status, "duplicate");
      assert.equal(duplicate.expenseId, id);
      assert.equal(duplicate.reason, "cross_source_wallet_capture");
      assert.equal(
        (await event(duplicate.claimId)).capture_source,
        secondSource,
      );
      const retry = await crossClaim("second", {
        source: secondSource,
        time: "2026-10-22T12:00:00Z",
      });
      assert.equal(retry.status, "duplicate");
      assert.equal(retry.expenseId, id);
      assert.equal(
        (await db.query("select count(*)::int n from expenses")).rows[0].n,
        1,
      );
    });
  }
}

test("three sources collapse to one expense; repeated purchases pair one per source", async () => {
  await crossClaim("a1", { source: apple });
  const firstId = await save("a1");
  assert.equal((await crossClaim("i1", { source: ios })).expenseId, firstId);
  assert.equal(
    (await crossClaim("d1", { source: android })).expenseId,
    firstId,
  );
  assert.equal((await crossClaim("a2", { source: apple })).status, "claimed");
  const secondId = await save("a2");
  assert.equal((await crossClaim("i2", { source: ios })).expenseId, secondId);
  assert.equal(
    (await crossClaim("d2", { source: android })).expenseId,
    secondId,
  );
  assert.notEqual(firstId, secondId);
});

test("Apple Pay plus Android bank, Android wallet and iOS notifications retain one expense", async () => {
  await crossClaim("apple", { source: apple });
  const id = await save("apple");
  assert.equal((await crossClaim("bank")).expenseId, id);
  assert.equal(
    (
      await crossClaim("wallet", {
        package: "com.google.android.apps.walletnfcrel",
      })
    ).expenseId,
    id,
  );
  assert.equal((await crossClaim("ios", { source: ios })).expenseId, id);
  assert.equal(
    (await crossClaim("bank-again", { package: " BANK.EXAMPLE " })).status,
    "claimed",
  );
});

for (const [name, different] of Object.entries({
  actor: { user: other },
  scope: { scope: "another-space" },
  wallet: { wallet: other },
  currency: { currency: "USD" },
  direction: { type: "income" },
  amount: { amount: 1300 },
  merchant: { merchant: "佐藤商店 駅前" },
  "missing merchant": { merchant: null },
  "missing timestamp": { time: null },
  "uncertain currency": { ambiguous: true },
  "provider-only or recurring": { eligible: false },
  "outside two minutes": { time: "2026-10-21T12:02:00.001Z" },
})) {
  test(`cross-source matching preserves separate captures with different ${name}`, async () => {
    await crossClaim("first", { source: apple });
    await save("first");
    assert.equal(
      (await crossClaim("second", { source: ios, ...different })).status,
      "claimed",
    );
  });
}

for (const source of [android, ios, apple]) {
  test(`same-source purchases remain separate for ${source}`, async () => {
    await crossClaim("first", { source });
    await save("first");
    assert.equal((await crossClaim("second", { source })).status, "claimed");
  });
}

test("cross-source two-minute boundary and midnight are inclusive", async () => {
  await crossClaim("first", { source: apple, time: "2026-10-21T23:59:00Z" });
  const id = await save("first");
  const result = await crossClaim("second", {
    source: ios,
    date: "2026-10-22",
    time: "2026-10-22T00:01:00Z",
  });
  assert.equal(result.expenseId, id);
});

test("failed claims can be retried by another source without dropping a purchase", async () => {
  const first = await crossClaim("first", { source: apple });
  await release(first.claimId);
  const second = await crossClaim("second", { source: ios });
  assert.equal(second.status, "claimed");
  const id = await save("second");
  assert.equal((await crossClaim("first", { source: apple })).expenseId, id);
});

test("legacy Android wallet/bank matching remains available without weakening cross-source matching", async () => {
  await crossClaim("bank");
  const id = await save("bank");
  const match = await crossClaim("google-wallet", {
    package: "com.google.android.apps.walletnfcrel",
  });
  assert.equal(match.status, "duplicate");
  assert.equal(match.expenseId, id);
  assert.equal(match.reason, "android_logical_duplicate_v2");
  assert.equal(
    (await crossClaim("ios-other-wallet", { source: ios, wallet: other }))
      .status,
    "claimed",
  );
});

test("legacy attribution is not guessed and cross-source matching does not rewrite currency", async () => {
  await claim("legacy");
  await save("legacy");
  assert.equal(
    (await crossClaim("new-ios", { source: ios })).status,
    "claimed",
  );
  await save("new-ios");
  assert.equal(
    (
      await crossClaim("new-android", {
        currency: "USD",
        ambiguous: true,
        package: "com.google.android.apps.walletnfcrel",
      })
    ).status,
    "claimed",
  );
  const row = (
    await db.query(
      "select currency from expenses where wallet_capture_idempotency_key = 'new-ios'",
    )
  ).rows[0];
  assert.equal(row.currency, "MYR");
});

test("legacy Android ambiguous-currency correction retains its existing behavior", async () => {
  await crossClaim("ambiguous-bank", { ambiguous: true });
  const id = await save("ambiguous-bank");
  const result = await crossClaim("explicit-wallet", {
    currency: "USD",
    package: "com.google.android.apps.walletnfcrel",
  });
  assert.equal(result.status, "duplicate");
  assert.equal(result.expenseId, id);
  assert.equal(result.currency, "USD");
  assert.equal(
    (await db.query("select account_id from expenses where id = $1", [id]))
      .rows[0].account_id,
    wallet,
  );
});

test("unassigned captures match only other unassigned captures", async () => {
  await crossClaim("first", { source: apple, wallet: null });
  const id = await save("first");
  assert.equal(
    (await crossClaim("assigned", { source: ios })).status,
    "claimed",
  );
  assert.equal(
    (await crossClaim("unassigned", { source: ios, wallet: null })).expenseId,
    id,
  );
});

test("cross-source claim is service-only and rejects invalid identities", async () => {
  const signature =
    "claim_wallet_capture_event_v3(uuid,text,uuid,boolean,uuid,text,text,text,text,text,text,text,integer,text,date,timestamptz,text,text,boolean,boolean)";
  for (const role of ["anon", "authenticated", "service_role"]) {
    const row = (
      await db.query("select has_function_privilege($1,$2,'EXECUTE') allowed", [
        role,
        signature,
      ])
    ).rows[0];
    assert.equal(row.allowed, role === "service_role");
  }
  await assert.rejects(
    crossClaim("bad", { source: "manual" }),
    /Invalid wallet capture source/,
  );
  await assert.rejects(
    crossClaim("bad", { amount: 0 }),
    /Invalid wallet capture identity/,
  );
});

test("expired worker cannot insert after another source takes over", async () => {
  const expired = await crossClaim("expired", { source: apple });
  await db.query(
    "update wallet_capture_events set created_at = now() - interval '11 minutes' where id = $1",
    [expired.claimId],
  );
  const takeover = await crossClaim("takeover", { source: ios });
  assert.equal(takeover.status, "claimed");
  await assert.rejects(save("expired"), /claim is no longer active/);
  const id = await save("takeover");
  assert.equal((await crossClaim("expired", { source: apple })).expenseId, id);
});

test("released workers cannot insert and duplicate aliases cannot create another expense", async () => {
  const first = await crossClaim("released", { source: apple });
  await release(first.claimId);
  await assert.rejects(save("released"), /claim is no longer active/);
  await crossClaim("owner", { source: ios });
  await save("owner");
  await crossClaim("alias", { source: apple });
  await assert.rejects(save("alias"), /claim is no longer active/);
});

test("expense insert commits capture ownership before application finalization", async () => {
  const first = await claim("first");
  assert.equal(first.status, "claimed");
  const id = await save("first");
  assert.equal((await event(first.claimId)).expense_id, id);
  assert.equal((await event(first.claimId)).status, "saved");
  await release(first.claimId);
  assert.equal((await event(first.claimId)).status, "saved");
  const retry = await claim("first");
  assert.equal(retry.status, "duplicate");
  assert.equal(retry.expenseId, id);
});

test("cross-app retry sees the saved expense even if application finalization never ran", async () => {
  await claim("bank");
  const id = await save("bank");
  const second = await claim("wallet", {
    package: "com.google.android.apps.walletnfcrel",
  });
  assert.equal(second.status, "duplicate");
  assert.equal(second.expenseId, id);
  assert.equal(
    (await db.query("select count(*)::int n from expenses")).rows[0].n,
    1,
  );
});

test("household-style transaction rollback also rolls back claim finalization", async () => {
  const first = await claim("rollback");
  await db.exec("begin");
  await save("rollback");
  assert.equal((await event(first.claimId)).status, "saved");
  await db.exec("rollback");
  assert.equal((await event(first.claimId)).status, "processing");
  await release(first.claimId);
  assert.equal((await event(first.claimId)).status, "failed");
  assert.equal((await claim("rollback")).status, "claimed");
});

test("late finalizer can attach its result but cannot attach another expense", async () => {
  const first = await claim("first");
  const id = await save("first");
  await db.query("select finalize_android_wallet_capture_event($1,$2,$3)", [
    first.claimId,
    id,
    { success: true },
  ]);
  assert.deepEqual((await event(first.claimId)).result, { success: true });
  const unrelated = await save("unrelated");
  await db.query("select finalize_android_wallet_capture_event($1,$2,$3)", [
    first.claimId,
    unrelated,
    { wrong: true },
  ]);
  assert.equal((await event(first.claimId)).expense_id, id);
  assert.deepEqual((await event(first.claimId)).result, { success: true });
});

test("release recovers pre-migration committed rows instead of reopening claims", async () => {
  const first = await claim("legacy");
  await db.exec(
    "alter table expenses disable trigger wallet_capture_saved_on_insert",
  );
  let id;
  try {
    id = await save("legacy");
  } finally {
    await db.exec(
      "alter table expenses enable trigger wallet_capture_saved_on_insert",
    );
  }
  await release(first.claimId);
  assert.equal((await event(first.claimId)).status, "saved");
  assert.equal((await event(first.claimId)).expense_id, id);
});

test("an expense from another actor cannot finalize or recover a claim", async () => {
  const first = await claim("actor-key");
  const id = await save("actor-key", other);
  assert.equal((await event(first.claimId)).status, "processing");
  await db.query("select finalize_android_wallet_capture_event($1,$2)", [
    first.claimId,
    id,
  ]);
  assert.equal((await event(first.claimId)).status, "processing");
  await release(first.claimId);
  assert.equal((await event(first.claimId)).status, "failed");
});

test("ordinary inserts and same-priced purchases retain their existing behavior", async () => {
  await save(null);
  await claim("first");
  await save("first");
  assert.equal((await claim("second")).status, "claimed");
  assert.equal(
    (await claim("another-user", { user: other })).status,
    "claimed",
  );
  assert.equal(
    (await claim("another-space", { scope: "other-space" })).status,
    "claimed",
  );
});

test("near-midnight matches share the same date-independent lock expression in both RPCs", async () => {
  // PGlite has one session: validates SQL and queued claim behavior, not
  // simultaneous PostgreSQL connections or production lock contention.
  const { rows } = await db.query(`select pg_get_functiondef(oid) as definition
    from pg_proc where proname in ('claim_android_wallet_capture_event', 'claim_android_wallet_capture_event_v2')`);
  const locks = rows.map(
    ({ definition }) =>
      definition.match(/v_lock_key := concat_ws\([\s\S]*?\);/i)[0],
  );
  assert.equal(locks.length, 2);
  assert.equal(locks[0], locks[1]);
  assert.equal(locks[0].includes("p_transaction_date"), false);
  await claim("before-midnight", { time: "2026-10-21T23:59:55Z" });
  const second = await claim("after-midnight", {
    date: "2026-10-22",
    time: "2026-10-22T00:00:05Z",
    package: "com.google.android.apps.walletnfcrel",
  });
  assert.equal(second.status, "processing");
});

test("released ineligible v3 claims cannot be used by a delayed worker", async () => {
  const first = await crossClaim("released-unknown", {
    source: ios,
    eligible: false,
  });
  await release(first.claimId);
  await assert.rejects(save("released-unknown"), /claim is no longer active/);
});

test("legacy Android match through v3 cannot reopen an expired worker's insert", async () => {
  const first = await crossClaim("old-bank");
  await db.query(
    "update wallet_capture_events set created_at = now() - interval '11 minutes' where id = $1",
    [first.claimId],
  );
  await crossClaim("new-wallet", {
    package: "com.google.android.apps.walletnfcrel",
  });
  const id = await save("new-wallet");
  const alias = await crossClaim("old-bank");
  assert.equal(alias.expenseId, id);
  await assert.rejects(save("old-bank"), /claim is no longer active/);
});

const channels = [
  { source: apple, package: "apple-wallet" },
  { source: ios, package: "bank.example" },
  { source: android, package: "bank.example" },
  { source: android, package: "com.google.android.apps.walletnfcrel" },
];
function permutations(items) {
  if (!items.length) return [[]];
  return items.flatMap((item, i) =>
    permutations(items.filter((_, j) => i !== j)).map((rest) => [
      item,
      ...rest,
    ]),
  );
}
for (const order of permutations(channels)) {
  test(`two identical purchases keep one expense each in channel order ${order.map((c) => c.source + ":" + c.package).join(" > ")}`, async () => {
    const ids = [];
    for (let purchase = 0; purchase < 2; purchase++) {
      for (const [i, channel] of order.entries()) {
        const key = `purchase-${purchase}-channel-${i}`;
        const result = await crossClaim(key, channel);
        if (i === 0) {
          assert.equal(result.status, "claimed");
          ids.push(await save(key));
        } else {
          assert.equal(result.status, "duplicate");
          assert.equal(result.expenseId, ids[purchase]);
        }
      }
    }
    assert.notEqual(ids[0], ids[1]);
    assert.equal(
      (await db.query("select count(*)::int n from expenses")).rows[0].n,
      2,
    );
  });
}
