import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const actor = "00000000-0000-4000-a000-000000000001";
const stranger = "00000000-0000-4000-a000-000000000002";
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema cron; create schema vault;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
    create table storage.objects(bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema auth,storage to authenticated;
    grant insert,select on storage.objects to authenticated;
    create table public.users(id uuid primary key,financial_data_reset_at timestamptz);
    create table public.expenses(id uuid primary key default gen_random_uuid(),user_id uuid,household_id uuid,import_request_key text unique,import_semantic_key text,amount_cents bigint,category text,deleted_at timestamptz);
    create index fixture_expenses_semantic on public.expenses(import_semantic_key);
    create table public.sharing_prefs(user_id uuid,household_id uuid,enable_nudges boolean);
    create table households(id uuid primary key,is_portfolio boolean);
    create table household_members(user_id uuid,household_id uuid);
    create type notification_event_type as enum ('expense_added');
    create table devices(id uuid primary key,user_id uuid,is_active boolean);
    create table notification_events(id uuid primary key default gen_random_uuid(),user_id uuid,event_type notification_event_type,payload jsonb);
    create table vault.decrypted_secrets(name text,decrypted_secret text);
    insert into vault.decrypted_secrets values ('file_import_worker_url','https://worker.example'),('file_import_worker_secret','fixture');
    create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
    insert into auth.users values ('${actor}'),('${stranger}');
    insert into public.users select id,null from auth.users;
  `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261120120000_file_import_jobs.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  // Upgrade a job which committed its first financial row under the old worker.
  await db.query("select set_config('test.actor',$1,false)", [stranger]);
  const oldJob = (await db.query(
    "select job_id from begin_file_import(repeat('f',64),'old.csv','csv',12,null,false,null,null,'USD','en',current_date,'UTC',0,true)",
  )).rows[0].job_id;
  const oldKey = "file-import-v1:" + oldJob + ":0";
  await db.query(
    "update file_import_jobs set status='processing',total=1,plan_path='plan',lease=gen_random_uuid(),lease_until=now()+interval '5 minutes' where id=$1",
    [oldJob],
  );
  await db.query(
    "insert into expenses(user_id,import_request_key) values ($1,$2)",
    [stranger, oldKey],
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261122120000_harden_file_import_jobs.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    (await db.query(
      "select row_index from file_import_row_receipts where job_id=$1",
      [oldJob],
    )).rows[0].row_index,
    0,
  );
  await db.query("delete from file_import_jobs where id=$1", [oldJob]);
  await db.query("delete from expenses where import_request_key=$1", [oldKey]);
  await db.query("delete from notification_events where user_id=$1", [
    stranger,
  ]);
});
after(async () => db?.close());

test("private upload, device disconnect, lease recovery, retries, notifications and cleanup", async () => {
  const asUser = async (id) =>
    db.exec(`reset role; set role authenticated; set test.actor='${id}'`);
  await asUser(actor);
  const begin =
    "select * from begin_file_import(repeat('a',64),'checking.csv','csv',128,null,false,null,null,'USD','en',current_date,'UTC',0,true)";
  const { job_id: id } = (await db.query(begin)).rows[0];
  assert.equal((await db.query(begin)).rows[0].job_id, id);
  assert.equal(
    (await db.query("select accept_file_import($1) as status", [id])).rows[0]
      .status,
    "uploading",
  );
  await asUser(stranger);
  assert.deepEqual(
    (await db.query("select id from file_import_jobs")).rows,
    [],
  );
  await assert.rejects(db.query("select * from claim_file_import()"));
  await assert.rejects(db.query("select lease from file_import_jobs"));
  await assert.rejects(
    db.query("insert into storage.objects values ('file-imports',$1,'{}')", [
      `${actor}/${id}/source`,
    ]),
  );
  await asUser(actor);
  await assert.rejects(
    db.query("insert into storage.objects values ('file-imports',$1,'{}')", [
      `${actor}/${id}/plan`,
    ]),
  );
  await db.query(
    "insert into storage.objects values ('file-imports',$1,jsonb_build_object('size',128))",
    [`${actor}/${id}/source`],
  );
  // The user connection ends without the accept RPC. Storage commit alone is recoverable.
  await db.exec("reset role; reset test.actor");
  const first = (await db.query("select * from claim_file_import()")).rows[0];
  assert.equal(first.id, id);
  assert.equal(first.status, "processing");
  assert.equal(
    (await db.query("select * from claim_file_import()")).rows.length,
    0,
  );
  await db.query(
    "update file_import_jobs set lease_until=now()-interval '1 second' where id=$1",
    [id],
  );
  const recovered =
    (await db.query("select * from claim_file_import()")).rows[0];
  assert.notEqual(recovered.lease, first.lease);
  // A late batch can reach the ledger after a replacement worker has claimed the job.
  const headers = (lease) =>
    db.query("select set_config('request.headers',$1,false)", [
      JSON.stringify({ "x-moneko-file-import-lease": lease }),
    ]);
  const write = () =>
    db.query(
      "insert into expenses(user_id,import_request_key) values ($1,$2)",
      [actor, "file-import-v1:" + id + ":0"],
    );
  await db.query(
    "update file_import_jobs set total=1,plan_path='plan' where id=$1",
    [id],
  );
  await headers(first.lease);
  await assert.rejects(write(), /Import job is no longer active/);
  await headers(recovered.lease);
  await write();
  await db.query(
    "update expenses set deleted_at=now(),import_semantic_key='fixture' where user_id=$1",
    [actor],
  );
  await db.query("delete from expenses where user_id=$1", [actor]);
  // The successful write belongs to the job even after a subsequent permanent user deletion.
  const keys =
    (await db.query("select * from file_import_existing_keys($1,$2,$3)", [id, [
      "file-import-v1:" + id + ":0",
    ], ["fixture"]])).rows;
  assert.deepEqual(keys.map((k) => [k.request_key, k.semantic_key]), [[
    "file-import-v1:" + id + ":0",
    null,
  ]]);
  await db.query(
    "update file_import_jobs set lease_until=now()-interval '1 second' where id=$1",
    [id],
  );
  await assert.rejects(write(), /Import job is no longer active/);
  await db.query("select set_config('request.headers','{}',false)");
  assert.equal(
    (await db.query(
      "update file_import_jobs set processed=100 where lease=$1 returning id",
      [first.lease],
    )).rows.length,
    0,
  );
  await db.query(
    "update file_import_jobs set status='failed',retryable=true,finished_at=now(),lease=null,lease_until=null where id=$1",
    [id],
  );
  await asUser(stranger);
  await assert.rejects(db.query("select retry_file_import($1)", [id]));
  await asUser(actor);
  await db.query("select retry_file_import($1)", [id]);
  await db.exec("reset role; reset test.actor");
  await db.query("select * from claim_file_import()");
  await db.query(
    "update file_import_jobs set status='completed',total=100,processed=100,imported=100,finished_at=now()-interval '2 hours',lease=null where id=$1",
    [id],
  );
  assert.deepEqual(
    (await db.query(
      "select status from file_import_email_events order by created_at",
    )).rows.map((x) => x.status),
    ["processing", "failed", "processing", "completed"],
  );
  assert.equal(
    (await db.query(
      "select count(*)::int n from notification_events where user_id=$1",
      [actor],
    )).rows[0].n,
    4,
  );
  assert.equal(
    (await db.query("select * from claim_file_import_emails()")).rows.length,
    1,
  );
  assert.equal(
    (await db.query("select * from claim_file_import_emails()")).rows.length,
    0,
  );
  const event = (await db.query(
    "select id from notification_events where user_id=$1 limit 1",
    [actor],
  )).rows[0].id;
  const device = "00000000-0000-4000-a000-000000000004";
  await db.query("insert into devices values($1,$2,true)", [device, actor]);
  const claimPush = async () =>
    (await db.query(
      "select claim_file_import_push($1,$2,gen_random_uuid()) state",
      [event, device],
    )).rows[0].state;
  assert.equal(await claimPush(), "send");
  assert.equal(await claimPush(), "busy");
  await db.query(
    "update file_import_push_deliveries set sent_at=now() where event_id=$1 and device_id=$2",
    [event, device],
  );
  assert.equal(await claimPush(), "sent");
  // An uncertain acknowledgement may be retried only inside Resend's idempotency window.
  await db.query(
    "update file_import_email_events set first_attempt_at=now()-interval '25 hours',next_attempt=now() where first_attempt_at is not null",
  );
  assert.deepEqual(
    (await db.query("select status from claim_file_import_emails()")).rows,
    [{ status: "failed" }],
  );
  assert.equal(
    (await db.query(
      "select count(*)::int n from file_import_email_events where delivery_uncertain_at is not null and delivered_at is null",
    )).rows[0].n,
    1,
  );
  assert.deepEqual(
    (await db.query("select * from file_import_cleanup_candidates()")).rows,
    [{ name: `${actor}/${id}/source` }],
  );
  await asUser(actor);
  assert.equal((await db.query(begin)).rows[0].job_status, "completed");
  await db.exec("reset role");
  await db.query(
    "update public.users set financial_data_reset_at=now() where id=$1",
    [actor],
  );
  assert.equal(
    (await db.query("select id from file_import_jobs where user_id=$1", [
      actor,
    ])).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into expenses(user_id,import_request_key) values ($1,$2)",
      [actor, `file-import-v1:${id}:0`],
    ),
  );
});

test("two active users share worker capacity and a completed upload survives cleanup before acceptance", async () => {
  const owners = [actor, stranger, "00000000-0000-4000-a000-000000000005"];
  await db.query("insert into auth.users values ($1) on conflict do nothing", [
    owners[2],
  ]);
  for (const owner of owners) {
    await db.exec("set role authenticated");
    await db.query("select set_config('test.actor',$1,false)", [owner]);
    const id = (await db.query(
      "select job_id from begin_file_import(repeat('c',64),'small.csv','csv',10,null,false,null,null,'USD','en',current_date,'UTC',0,true)",
    )).rows[0].job_id;
    await db.query(
      "insert into storage.objects values ('file-imports',$1,jsonb_build_object('size',10))",
      [owner + "/" + id + "/source"],
    );
    await db.exec("reset role");
  }
  await db.exec(
    "update file_import_jobs set created_at=now()-interval '25 hours' where status='uploading'",
  );
  await db.query("select * from file_import_cleanup_candidates()");
  assert.equal(
    (await db.query(
      "select count(*)::int n from file_import_jobs where status='uploading'",
    )).rows[0].n,
    3,
  );
  const claim = async () =>
    (await db.query("select * from claim_file_import()")).rows;
  const [first] = await claim(), [second] = await claim();
  assert.notEqual(first.user_id, second.user_id);
  assert.deepEqual(await claim(), []);
  await db.query(
    "update file_import_jobs set status='completed',lease=null,lease_until=null,finished_at=now() where id=$1",
    [first.id],
  );
  const [third] = await claim();
  assert.notEqual(third.user_id, second.user_id);
  await db.exec("set role authenticated");
  await db.query("select set_config('test.actor',$1,false)", [actor]);
  const bad = (await db.query(
    "select job_id from begin_file_import(repeat('d',64),'short.csv','csv',10,null,false,null,null,'USD','en',current_date,'UTC',0,true)",
  )).rows[0].job_id;
  await db.query(
    "insert into storage.objects values ('file-imports',$1,jsonb_build_object('size',9))",
    [actor + "/" + bad + "/source"],
  );
  await db.exec("reset role");
  await claim();
  assert.equal(
    (await db.query("select status from file_import_jobs where id=$1", [bad]))
      .rows[0].status,
    "failed",
  );
  await db.exec("delete from file_import_jobs; delete from storage.objects");
});

// Local HTTP adapters stand in for Storage and PostgREST. The compiled worker,
// Edge batch writer, financial write guard, and queue migration all execute.
test(
  "20,000 rows continue after uploader exit and a lost batch acknowledgement",
  { skip: !process.env.FILE_IMPORT_TEST_WORKER, timeout: 900000 },
  async () => {
    const { createServer } = await import("node:http");
    const { spawn } = await import("node:child_process");
    const { once } = await import("node:events");
    const { createHash } = await import("node:crypto");
    const { setTimeout: delay } = await import("node:timers/promises");
    const objects = new Map();
    let jobId, writerUrl, loseResponse = true, batchCalls = 0;
    await db.exec(
      "reset role; reset test.actor; truncate expenses",
    );
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, "http://local");
        const chunks = [];
        for await (const c of req) {
          chunks.push(c);
        }
        const raw = Buffer.concat(chunks);
        const body = () => JSON.parse(raw);
        const reply = (data) => {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(data));
        };
        if (url.pathname === "/upload") {
          const hash = createHash("sha256").update(raw).digest("hex");
          await db.exec(`set role authenticated; set test.actor='${actor}'`);
          const args = [hash, "history.csv", raw.length];
          jobId = (await db.query(
            "select * from begin_file_import($1,$2,'csv',$3,null,false,null,null,'USD','en',current_date,'UTC',0,true)",
            args,
          )).rows[0].job_id;
          const path = `${actor}/${jobId}/source`;
          objects.set(path, raw);
          await db.query(
            "insert into storage.objects values('file-imports',$1,jsonb_build_object('size',$2::int))",
            [path, raw.length],
          );
          const accepted =
            (await db.query("select accept_file_import($1) as status", [jobId]))
              .rows[0];
          await db.exec("reset role; reset test.actor");
          return reply(accepted);
        }
        if (url.pathname === "/rest/v1/rpc/claim_file_import") {
          return reply(
            (await db.query("select * from claim_file_import()")).rows,
          );
        }
        if (url.pathname.startsWith("/storage/v1/object/")) {
          const key = url.pathname.split("file-imports/")[1];
          if (req.method === "GET") {
            assert.ok(objects.has(key));
            return res.end(objects.get(key));
          }
          objects.set(key, raw);
          return reply({});
        }
        // PostgREST exposes request headers as transaction-local settings.
        const ledgerCall = (operation) =>
          db.transaction(async (tx) => {
            await tx.query("select set_config('request.headers',$1,true)", [
              JSON.stringify(req.headers),
            ]);
            return operation(tx);
          });
        if (url.pathname.endsWith("/rpc/file_import_existing_keys")) {
          const p = body();
          const result = await ledgerCall((tx) =>
            tx.query("select * from file_import_existing_keys($1,$2,$3)", [
              p.p_job,
              p.p_request_keys,
              p.p_semantic_keys,
            ])
          );
          return reply(result.rows);
        }
        if (url.pathname === "/rest/v1/expenses") {
          if (req.method === "GET") return reply([]);
          const row = body();
          await db.query(
            "insert into expenses(id,user_id,household_id,import_request_key,import_semantic_key,amount_cents,category) select $1,$2,$3,$4,$5,$6,$7 from set_config('request.headers',$8,true)",
            [
              row.id,
              row.user_id,
              row.household_id,
              row.import_request_key,
              row.import_semantic_key,
              row.amount_cents,
              row.category,
              JSON.stringify(req.headers),
            ],
          );
          return reply(row);
        }
        if (url.pathname === "/functions/v1/file-import-maintenance") {
          res.writeHead(204);
          return res.end();
        }
        if (url.pathname === "/functions/v1/save-transactions-batch") {
          const response = await fetch(writerUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "X-Moneko-Internal-Key": req.headers["x-moneko-internal-key"],
            },
            body: raw,
          });
          const result = await response.json();
          assert.equal(
            result.success,
            true,
            JSON.stringify(
              result.results?.filter((x) => !x.success && !x.duplicate).slice(
                0,
                2,
              ),
            ),
          );
          batchCalls++;
          if (loseResponse) {
            loseResponse = false;
            res.writeHead(503);
            return res.end();
          }
          return reply(result);
        }
        if (
          url.pathname === "/rest/v1/file_import_jobs" && req.method === "PATCH"
        ) {
          const changes = Object.entries(body());
          const lease = url.searchParams.get("lease").slice(3);
          assert.equal(url.searchParams.get("lease_until"), "gt.now");
          const assignments = changes.map(([k], i) => {
            assert.match(k, /^[a-z_]+$/);
            return k + "=$" + (i + 2);
          });
          const result = await db.query(
            "update file_import_jobs set " + assignments.join(",") +
              " where lease=$1 and lease_until>now() and status='processing' returning id",
            [
              lease,
              ...changes.map((x) => x[1]),
            ],
          );
          return reply(result.rows);
        }
        if (req.method === "GET" && url.pathname.startsWith("/rest/v1/")) {
          return reply([]);
        }
        throw new Error("Unexpected fixture path " + url.pathname);
      } catch (error) {
        console.error(error);
        res.writeHead(500);
        res.end();
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const url = "http://127.0.0.1:" + server.address().port;
    let worker, writer;
    try {
      // Run the actual Deno writer with access limited to this loopback adapter.
      writer = spawn("deno", [
        "run",
        "--cached-only",
        "--no-lock",
        "--config",
        "supabase/functions/deno.json",
        "--allow-env",
        "--allow-net=127.0.0.1",
        "-",
      ], {
        cwd: new URL("../", import.meta.url).pathname,
        env: {
          ...process.env,
          SUPABASE_URL: url,
          SUPABASE_SERVICE_ROLE_KEY: "fixture",
          INTERNAL_SERVICE_SECRET: "fixture",
        },
        stdio: ["pipe", "pipe", "inherit"],
      });
      writer.stdin.end(`
        import {saveTransactionsBatchInternal} from './supabase/functions/save-transactions-batch/index.ts';
        Deno.serve({hostname:'127.0.0.1',port:0,onListen:({port})=>console.log('PORT='+port)},async req=>{
          const result=await saveTransactionsBatchInternal(req,await req.json());
          return Response.json(result);
        });
      `);
      const { createInterface } = await import("node:readline");
      const lines = createInterface({ input: writer.stdout });
      writerUrl = await new Promise((resolve, reject) => {
        writer.once("error", reject);
        writer.once(
          "exit",
          (code) => reject(new Error("Writer exited: " + code)),
        );
        lines.on("line", (line) => {
          if (/^PORT=\d+$/.test(line)) {
            resolve("http://127.0.0.1:" + line.slice(5));
          }
        });
      });
      const client = spawn(process.execPath, [
        "-e",
        `
      const rows=Array.from({length:20000},(_,i)=> '2023-05-20,'+((i+1)/100).toFixed(2)+',Local market,groceries,USD,expense');
      fetch(process.argv[1]+'/upload',{method:'POST',body:['Date,Amount,Description,Category,Currency,Type',...rows].join('\\n')})
        .then(r=>r.json()).then(body=>{if(body.status!=='queued')process.exitCode=1});
    `,
        url,
      ], { stdio: "inherit" });
      assert.equal((await once(client, "exit"))[0], 0);
      // The uploader is gone before either worker process starts.
      const start = async () => {
        const portServer = createServer().listen(0, "127.0.0.1");
        await once(portServer, "listening");
        const port = portServer.address().port;
        await new Promise((r) => portServer.close(r));
        worker = spawn(process.env.FILE_IMPORT_TEST_WORKER, [], {
          cwd: new URL("../../moneko-mobile/", import.meta.url).pathname,
          env: {
            ...process.env,
            PORT: String(port),
            SUPABASE_URL: url,
            SUPABASE_SERVICE_ROLE_KEY: "fixture",
            INTERNAL_SERVICE_SECRET: "fixture",
            FILE_IMPORT_WORKER_SECRET: "test",
          },
          stdio: "inherit",
        });
        const endpoint = "http://127.0.0.1:" + port + "/tick";
        for (let i = 0; i < 100; i++) {
          try {
            if ((await fetch(endpoint)).status === 403) break;
          } catch {}
          await delay(20);
        }
        assert.equal(
          (await fetch(endpoint, {
            method: "POST",
            headers: { authorization: "Bearer test" },
          })).status,
          204,
        );
      };
      const stop = async () => {
        if (worker && worker.exitCode === null && worker.signalCode === null) {
          const exited = once(worker, "exit");
          worker.kill();
          await exited;
        }
      };
      await start();
      await stop();
      const snapshot = (await db.query(
        "select processed,plan_path,status,error_message from file_import_jobs where id=$1",
        [jobId],
      )).rows[0];
      assert.equal(snapshot.status, "processing", snapshot.error_message);
      assert.ok(snapshot.plan_path);
      assert.equal(snapshot.processed, 0);
      assert.equal(
        (await db.query("select count(*)::int n from expenses"))
          .rows[0].n,
        50,
      );
      await db.query(
        "update file_import_jobs set available_at=now() where id=$1",
        [jobId],
      );
      for (let slice = 0; slice < 20; slice++) {
        await start();
        await stop();
        const status = (await db.query(
          "select status,failures,error_message from file_import_jobs where id=$1",
          [jobId],
        )).rows[0];
        if (status.status === "completed") break;
        assert.equal(status.status, "processing", status.error_message);
        assert.equal(status.failures, 0);
      }
      assert.deepEqual(
        (await db.query(
          "select status,total,processed,imported,skipped from file_import_jobs where id=$1",
          [jobId],
        )).rows[0],
        {
          status: "completed",
          total: 20000,
          processed: 20000,
          imported: 20000,
          skipped: 0,
        },
      );
      assert.equal(batchCalls, 401);
      assert.deepEqual(
        (await db.query(
          "select count(*)::int n, round(sum(amount_cents)/100.0,2)::text total from expenses",
        )).rows[0],
        { n: 20000, total: "2000100.00" },
      );
      assert.equal(
        (await db.query(
          "select count(*)::int n from notification_events where payload->>'job_id'=$1",
          [jobId],
        )).rows[0].n,
        2,
      );
    } finally {
      writer?.kill();
      worker?.kill();
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
  },
);
