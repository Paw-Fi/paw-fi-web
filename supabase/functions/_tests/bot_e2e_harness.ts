/// <reference lib="deno.ns" />

// Shared harness for running the real bot webhook handlers end to end.
// Only the network edge is faked: Telegram, Twilio, Supabase REST/auth/
// functions, Google auth and the Vertex model endpoints. Everything between
// the incoming webhook and the outgoing message is production code.

export type Json = Record<string, unknown>;

export interface ModelTurn {
  text?: string;
  calls?: Array<{ name: string; args: Json }>;
  status?: number;
}

// One scripted answer of the reply verifier. The last entry repeats.
export interface VerifierTurn {
  action?: boolean;
  record?: boolean;
  consistent?: boolean;
  status?: number;
}

export interface Scenario {
  model: ModelTurn[];
  verifier: VerifierTurn[];
  saveExpense?: { status: number; body: Json };
  expenses?: Json[];
  spaces?: Array<{ household_id: string; name: string; is_portfolio: boolean }>;
  spaceLookupFails?: boolean;
  financeFails?: boolean;
  denySession?: boolean;
  spacePageSize?: number;
}

export interface Outcome {
  telegramMessages: string[];
  telegramPhotos: string[];
  whatsappMessages: string[];
  saveCalls: Json[];
  financeCalls: Json[];
  spaceQueries: string[];
  assistantRows: Json[];
  modelPrompts: string[];
  advertisedTools: string[][];
  verifierPrompts: string[];
  unusedModelTurns: number;
}

export type WebhookHandler = (req: Request) => Response | Promise<Response>;

export const USER_ID = "674a78c1-0000-4000-8000-000000000001";
export const CONTACT_ID = "aaaaaaaa-0000-4000-8000-000000000002";
export const SESSION_ID = "bbbbbbbb-0000-4000-8000-000000000003";
export const SAVED_ID = "cccccccc-0000-4000-8000-000000000004";
export const WEBHOOK_SECRET = "test-webhook-secret";

export const SAVED_ROW = {
  id: SAVED_ID,
  user_id: USER_ID,
  amount_cents: 145,
  currency: "EUR",
  date: "2026-11-17",
  merchant: "Baluard",
  raw_text: "Baluard",
  category: "groceries",
  is_recurring: false,
};

export const SAVE_ARGS = {
  type: "expense",
  amount: 1.45,
  currency: "EUR",
  category: "groceries",
  date: "2026-11-17",
  merchant: "Baluard",
  description: "Baluard",
};

export const OLDER_EXPENSE_ROW = {
  id: "dddddddd-0000-4000-8000-000000000005",
  type: "expense",
  date: "2026-06-16",
  category: "groceries",
  raw_text: "Baluard",
  amount_cents: 145,
  currency: "EUR",
  household_id: null,
};

const json = (data: unknown, status = 200) =>
  new Response(data === undefined ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

let serviceAccount: Promise<string> | null = null;

// A throwaway key generated in memory so the real Google token signing runs.
function testServiceAccount(): Promise<string> {
  serviceAccount ??= (async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const pkcs8 = new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", pair.privateKey),
    );
    const base64 = btoa(String.fromCharCode(...pkcs8));
    return JSON.stringify({
      client_email: "test@moneko-test.iam.gserviceaccount.com",
      project_id: "moneko-test",
      private_key:
        `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----\n`,
    });
  })();
  return serviceAccount;
}

// Imports a function entry point and captures the handler it registers.
export async function loadWebhookHandler(
  modulePath: string,
): Promise<WebhookHandler> {
  const originalServe = Deno.serve;
  const captured: { handler: WebhookHandler | null } = { handler: null };
  Deno.serve = ((callback: WebhookHandler) => {
    captured.handler = callback;
  }) as unknown as typeof Deno.serve;
  try {
    await import(modulePath);
  } finally {
    Deno.serve = originalServe;
  }
  if (!captured.handler) throw new Error(`${modulePath} did not register`);
  return captured.handler;
}

const CONTEXT_ROW = {
  contact_id: CONTACT_ID,
  user_id: USER_ID,
  verified: true,
  preferred_currency: "EUR",
  preferred_language: "es",
  preferred_timezone: "Europe/Madrid",
  subscription_plan: "plus",
  subscription_status: "active",
  subscription_current_period_end: new Date(Date.now() + 86_400_000 * 30)
    .toISOString(),
  households: [],
  spaces: [],
  chat_session_id: SESSION_ID,
};

export async function withBotBackend(
  scenario: Scenario,
  run: () => Promise<void>,
): Promise<Outcome> {
  const outcome: Outcome = {
    telegramMessages: [],
    telegramPhotos: [],
    whatsappMessages: [],
    saveCalls: [],
    financeCalls: [],
    spaceQueries: [],
    assistantRows: [],
    modelPrompts: [],
    advertisedTools: [],
    verifierPrompts: [],
    unusedModelTurns: 0,
  };
  const modelQueue = [...scenario.model];
  const verifierQueue = [...scenario.verifier];

  const env: Record<string, string> = {
    TELEGRAM_BOT_TOKEN: "test-telegram-token",
    TELEGRAM_WEBHOOK_SECRET: WEBHOOK_SECRET,
    TWILIO_ACCOUNT_SID: "ACtest",
    TWILIO_AUTH_TOKEN: "test-twilio-token",
    TWILIO_SKIP_SIGNATURE: "true",
    SUPABASE_URL: "https://supabase.test.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "test-only-service-key",
    SUPABASE_ANON_KEY: "test-only-anon-key",
    SECRET_SUPABASE_SERVICE_ROLE_API_KEY: "test-only-internal-key",
    GEMINI_API_KEY: "test-only-gemini-key",
    GOOGLE_CLOUD_SERVICE_ACCOUNT: await testServiceAccount(),
    GOOGLE_CLOUD_PROJECT: "moneko-test",
    GOOGLE_CLOUD_LOCATION: "global",
  };
  const unset = ["BOT_REPLY_GROUNDING_MODE", "WHATSAPP_DEBUG"];
  const names = [...Object.keys(env), ...unset];
  const priorEnv = names.map((name) => Deno.env.get(name));
  for (const [name, value] of Object.entries(env)) Deno.env.set(name, value);
  for (const name of unset) Deno.env.delete(name);

  const restRows: Record<string, () => Json[]> = {
    subscriptions: () => [{
      plan: "plus",
      status: "active",
      current_period_end: CONTEXT_ROW.subscription_current_period_end,
    }],
    user_contacts: () => [{
      id: CONTACT_ID,
      preferred_currency: "EUR",
      preferred_language: "es",
      preferred_timezone: "Europe/Madrid",
      preferred_space_id: null,
    }],
    chat_sessions: () =>
      scenario.denySession
        ? []
        : [{ id: SESSION_ID, user_id: USER_ID, system_prompt: null }],
    expenses: () => scenario.expenses ?? [],
  };

  const fakeFetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request ? request.url : String(input));
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers ?? request?.headers);
    const rawBody = init?.body != null
      ? String(init.body)
      : request
      ? await request.text()
      : "";
    const body: Json = (() => {
      try {
        return rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return {};
      }
    })();

    if (url.hostname === "api.telegram.org") {
      if (url.pathname.endsWith("/sendMessage")) {
        outcome.telegramMessages.push(String(body.text ?? ""));
      }
      if (url.pathname.endsWith("/sendPhoto")) {
        outcome.telegramPhotos.push(String(body.caption ?? ""));
      }
      return json({ ok: true, result: {} });
    }
    if (url.hostname === "api.twilio.com") {
      if (method === "GET") {
        return json({ date_created: "Wed, 25 Nov 2026 00:00:00 +0000" });
      }
      outcome.whatsappMessages.push(
        new URLSearchParams(rawBody).get("Body") ?? "",
      );
      return json({ sid: "SMtest" }, 201);
    }
    if (url.hostname === "messaging.twilio.com") return json({});
    if (url.hostname === "oauth2.googleapis.com") {
      return json({ access_token: "test-access-token", expires_in: 3600 });
    }
    if (url.hostname === "aiplatform.googleapis.com") {
      const system = String(
        (body.systemInstruction as { parts?: Array<{ text?: string }> })
          ?.parts?.[0]?.text ?? "",
      );
      const contents = (body.contents ?? []) as Array<
        { parts?: Array<{ text?: string }> }
      >;
      const lastText = String(
        contents[contents.length - 1]?.parts?.[0]?.text ?? "",
      );
      if (system.includes("independent fact-checker")) {
        outcome.verifierPrompts.push(lastText);
        const turn = verifierQueue.length > 1
          ? verifierQueue.shift()!
          : verifierQueue[0];
        if (!turn || turn.status) {
          return json(
            { error: { message: "unavailable" } },
            turn?.status ?? 503,
          );
        }
        return json({
          candidates: [{
            content: {
              role: "model",
              parts: [{
                text: JSON.stringify({
                  asserts_completed_action: turn.action === true,
                  asserts_stored_record_state: turn.record === true,
                  consistent_with_evidence: turn.consistent !== false,
                  exposes_internal_details: false,
                }),
              }],
            },
          }],
        });
      }
      if (system.includes("You are Moneko")) {
        outcome.modelPrompts.push(lastText);
        const tools = Array.isArray(body.tools) ? body.tools : [];
        outcome.advertisedTools.push(
          tools.flatMap((t) =>
            (t.functionDeclarations || []).map((d: Json) => String(d.name))
          ),
        );
        const turn = modelQueue.shift();
        if (!turn) return json({ error: { message: "script exhausted" } }, 500);
        if (turn.status) {
          return json({ error: { message: "unavailable" } }, turn.status);
        }
        return json({
          candidates: [{
            content: {
              role: "model",
              parts: turn.calls?.length
                ? turn.calls.map((call) => ({ functionCall: call }))
                : [{ text: turn.text ?? "" }],
            },
          }],
        });
      }
      // Optional helpers (merchant enrichment) are not under test.
      return json({ error: { message: "not available in this test" } }, 503);
    }
    if (url.hostname === "supabase.test.invalid") {
      if (url.pathname === "/functions/v1/save-expense") {
        outcome.saveCalls.push(body);
        const reply = scenario.saveExpense ??
          { status: 200, body: { success: true, data: SAVED_ROW } };
        return json(reply.body, reply.status);
      }
      if (url.pathname === "/auth/v1/user") {
        return json({
          id: USER_ID,
          aud: "authenticated",
          role: "authenticated",
          email: "user@example.com",
        });
      }
      if (url.pathname === "/rest/v1/rpc/read_chat_finance_v1") {
        outcome.financeCalls.push(body);
        if (body.p_actor !== USER_ID || scenario.financeFails) {
          return json({ message: "unavailable" }, 403);
        }
        if (body.p_read === "spaces") {
          return json({
            spaces: (scenario.spaces ?? []).map((s) => ({
              ...s,
              id: s.household_id,
            })),
          });
        }
        if (body.p_read === "summary") {
          return json({
            expense_total_cents: 100100,
            income_total_cents: 0,
            categories: [{ category: "food", amount_cents: 100100 }],
          });
        }
        if (body.p_read === "projections") {
          return json({
            count: 1,
            items: [{
              id: "upcoming",
              recurring_id: "rent",
              date: "2026-11-30",
              type: "expense",
              category: "housing",
              amount_cents: 50000,
              currency: "EUR",
            }],
          });
        }
        if (body.p_read === "pockets") {
          return json({
            total_budget_cents: 15000,
            pockets: [{ name: "Food", remaining_cents: 3700 }],
          });
        }
        if (body.p_read === "transactions") {
          return json({
            items: (scenario.expenses ?? [])
              .filter((row) => row.household_id === body.p_space).map(
                (row) => ({ created_at: "2026-06-16T00:00:00Z", ...row }),
              ),
            has_more: false,
            next_cursor: null,
          });
        }
        return json({ message: "unexpected financial read" }, 400);
      }
      if (url.pathname.startsWith("/rest/v1/rpc/")) {
        return json({
          ...CONTEXT_ROW,
          households: scenario.spaces ?? [],
          spaces: scenario.spaces ?? [],
        });
      }
      if (url.pathname.startsWith("/rest/v1/")) {
        const table = url.pathname.slice("/rest/v1/".length);
        if (method === "GET") {
          if (
            table === "household_members" &&
            url.searchParams.get("select")?.includes("households!inner")
          ) {
            outcome.spaceQueries.push(url.search);
            if (scenario.spaceLookupFails) {
              return json({ code: "XX000", message: "lookup failed" }, 500);
            }
            const after = url.searchParams.get("household_id")?.slice(3);
            const remaining = (scenario.spaces ?? []).filter((row) =>
              !after || row.household_id > after
            );
            const page = remaining.slice(
              0,
              scenario.spacePageSize ?? remaining.length,
            );
            const rows = page.map(({ household_id, name, is_portfolio }) => ({
              household_id,
              space: { name, is_portfolio },
            }));
            const response = json(rows);
            response.headers.set("Content-Range", `*/${remaining.length}`);
            return response;
          }
          if (table === "expenses") {
            throw new Error("Financial lookup bypassed the scoped reader");
          }
          const rows = restRows[table]?.() ?? [];
          const wantsObject = (headers.get("Accept") ?? "").includes(
            "vnd.pgrst.object",
          );
          if (!wantsObject) return json(rows);
          return rows.length
            ? json(rows[0])
            : json({ code: "PGRST116", message: "0 rows" }, 406);
        }
        if (
          method === "POST" && table === "chat_messages" && Array.isArray(body)
        ) {
          outcome.assistantRows.push(
            ...body.filter((row) => row.role === "assistant"),
          );
        }
        if (
          method === "POST" && table === "chat_messages" &&
          body.role === "assistant"
        ) {
          outcome.assistantRows.push(body);
        }
        return json(
          method === "POST" ? [] : undefined,
          method === "POST" ? 201 : 204,
        );
      }
      return json({});
    }
    return json({ error: "unexpected host in test" }, 404);
  };

  const originalFetch = globalThis.fetch;
  const runtime = globalThis as unknown as { EdgeRuntime?: unknown };
  const priorRuntime = runtime.EdgeRuntime;
  const background: Promise<unknown>[] = [];
  runtime.EdgeRuntime = {
    waitUntil: (task: Promise<unknown>) => {
      background.push(task);
    },
  };
  globalThis.fetch = fakeFetch as typeof fetch;
  try {
    await run();
    for (let index = 0; index < background.length; index++) {
      await background[index];
    }
  } finally {
    globalThis.fetch = originalFetch;
    runtime.EdgeRuntime = priorRuntime;
    names.forEach((name, index) => {
      const prior = priorEnv[index];
      if (prior === undefined) Deno.env.delete(name);
      else Deno.env.set(name, prior);
    });
  }
  outcome.unusedModelTurns = modelQueue.length;
  return outcome;
}

export function groundingOf(row: Json | undefined): Json {
  return ((row?.metadata as Json | undefined)?.grounding ?? {}) as Json;
}

export function operationsOf(row: Json | undefined): string[] {
  return ((groundingOf(row).operations ?? []) as Json[]).map((item) =>
    `${item.tool}:${item.outcome}`
  );
}

// Handlers start timers and background work that outlive the request.
export const e2e = (name: string, fn: () => Promise<void>) =>
  Deno.test({ name, fn, sanitizeOps: false, sanitizeResources: false });

export const postedTotalReply =
  "El gasto registrado es de 1.001 €. El pago previsto de 500 € se muestra aparte.";
export function totalReadScenario(
  web = false,
): Scenario & { userText: string } {
  const args = {
    start_date: "2026-11-01",
    end_date: "2026-11-30",
    space_scope: "personal",
    currency: "EUR",
  };
  return {
    userText: "¿Cuánto gasté en noviembre en mi cuenta personal?",
    model: [
      {
        calls: [{
          name: web ? "read_finances" : "financial_insight",
          args: web ? { ...args, view: "summary" } : args,
        }],
      },
      { text: postedTotalReply },
    ],
    verifier: [{ record: true }],
  };
}
