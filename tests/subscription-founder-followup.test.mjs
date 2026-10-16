import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { buildFounderFollowupEmail } from "../supabase/functions/subscription-founder-followup/email-copy.ts";

const source = readFileSync(
  new URL(
    "../supabase/functions/subscription-founder-followup/index.ts",
    import.meta.url,
  ),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  reportDiagnostics: true,
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
assert.equal(compiled.diagnostics?.length ?? 0, 0);

function harness(options = {}) {
  let handler;
  const queries = [];
  const queued = [];
  const errors = [];
  const client = {
    from(table) {
      const query = { table };
      queries.push(query);
      const builder = {
        select(fields) {
          query.fields = fields;
          return builder;
        },
        eq(field, value) {
          query[field] = value;
          return builder;
        },
        order(field, settings) {
          query.order = { field, ...settings };
          return builder;
        },
        limit(value) {
          query.limit = value;
          return builder;
        },
        maybeSingle() {
          if (table === "users") {
            return {
              data: options.noUser ? null : {
                email: "recipient@example.test",
                full_name: options.name === undefined
                  ? "Alex Test"
                  : options.name,
              },
              error: options.userError ?? null,
            };
          }
          assert.equal(table, "user_contacts");
          return {
            data: options.noContact
              ? null
              : { preferred_language: options.language },
            error: options.languageError ?? null,
          };
        },
        insert(row) {
          assert.equal(table, "subscription_followup_email_queue");
          queued.push(row);
          return { error: options.queueError ?? null };
        },
      };
      return builder;
    },
  };
  runInNewContext(compiled.outputText, {
    exports: {},
    Request,
    Response,
    Intl,
    console: { error() {}, warn() {} },
    Deno: {
      env: {
        get: (key) =>
          key === "SUBSCRIPTION_FOLLOWUP_DELAY_MINUTES"
            ? undefined
            : "test-config",
      },
    },
    require(specifier) {
      if (specifier.startsWith("https://deno.land/")) {
        return {
          serve: (callback) => {
            handler = callback;
          },
        };
      }
      if (specifier.startsWith("https://esm.sh/@supabase/")) {
        return { createClient: () => client };
      }
      if (specifier === "../shared/cors.ts") {
        return { getCorsHeaders: () => ({}) };
      }
      if (specifier === "../shared/edge-error-alert.ts") {
        return {
          reportEdgeFunctionError: (error) => {
            errors.push(error);
          },
        };
      }
      if (specifier === "./email-copy.ts") return { buildFounderFollowupEmail };
      throw new Error(`Unexpected import ${specifier}`);
    },
  });
  return {
    queries,
    queued,
    errors,
    request(event = "welcome", overrides = {}) {
      const record = {
        id: "subscription-1",
        user_id: "actor-1",
        plan: "plus",
        status: event === "welcome" ? "trialing" : "canceled",
        billing_interval: "monthly",
        updated_at: "2026-10-16T10:00:00Z",
        ...overrides,
      };
      return handler(
        new Request("https://example.test/followup", {
          method: "POST",
          body: JSON.stringify({
            type: event === "welcome" ? "INSERT" : "UPDATE",
            table: "subscriptions",
            schema: "public",
            record,
            old_record: event === "welcome"
              ? null
              : { ...record, status: "active" },
          }),
        }),
      );
    },
  };
}

const subjects = {
  en: [
    "Quick question about Moneko",
    "Quick question about your Moneko subscription",
  ],
  de: ["Eine kurze Frage zu Moneko", "Eine kurze Frage zu deinem Moneko-Abo"],
  es: [
    "Una pregunta rápida sobre Moneko",
    "Una pregunta rápida sobre tu suscripción a Moneko",
  ],
  fr: [
    "Une petite question sur Moneko",
    "Une petite question sur ton abonnement Moneko",
  ],
  it: [
    "Una domanda veloce su Moneko",
    "Una domanda veloce sul tuo abbonamento Moneko",
  ],
  ja: [
    "Monekoについて、ひとつ質問です",
    "Monekoのご解約について、ひとつ質問です",
  ],
  ko: [
    "Moneko에 대해 하나만 여쭤볼게요",
    "Moneko 구독에 대해 하나만 여쭤볼게요",
  ],
  nl: [
    "Een korte vraag over Moneko",
    "Een korte vraag over je Moneko-abonnement",
  ],
  ru: ["Небольшой вопрос о Moneko", "Небольшой вопрос о вашей подписке Moneko"],
  th: [
    "ขอถามสั้น ๆ เกี่ยวกับ Moneko ครับ",
    "ขอถามสั้น ๆ เกี่ยวกับการสมัครสมาชิก Moneko ของคุณครับ",
  ],
  uk: [
    "Невелике запитання про Moneko",
    "Невелике запитання про вашу підписку Moneko",
  ],
  ur: [
    "Moneko کے بارے میں ایک چھوٹا سا سوال",
    "آپ کی Moneko سبسکرپشن کے بارے میں ایک چھوٹا سا سوال",
  ],
  vi: ["Hỏi bạn một chút về Moneko", "Hỏi bạn một chút về gói đăng ký Moneko"],
  zh: ["想问你一个关于 Moneko 的小问题", "想问问你取消 Moneko 订阅的原因"],
  "zh-TW": ["想問你一個關於 Moneko 的小問題", "想問問你取消 Moneko 訂閱的原因"],
};

for (const [language, expectedSubjects] of Object.entries(subjects)) {
  for (const [index, event] of ["welcome", "cancellation"].entries()) {
    test(`${language}: ${event} queues a complete localized email for the subscription actor`, async () => {
      const fixture = harness({ language });
      const before = Date.now();
      const response = await fixture.request(event);
      const after = Date.now();
      assert.equal(response.status, 200);
      assert.equal((await response.json()).status, "queued");
      assert.equal(fixture.queued.length, 1);
      const row = fixture.queued[0];
      assert.equal(row.subject, expectedSubjects[index]);
      assert.equal(
        row.body_text,
        buildFounderFollowupEmail(event, "Alex", language).bodyText,
      );
      assert.match(row.body_text, /Alex/);
      assert.match(row.body_text, /Yifan/);
      assert.doesNotMatch(row.body_text, /undefined|\{name\}/);
      assert.equal(
        row.body_text.split("\n\n").length,
        event === "welcome" ? 5 : 6,
      );
      if (language !== "en") {
        assert.doesNotMatch(
          row.body_text,
          /Yifan here|Out of curiosity|What made you decide|Co-founder, Moneko/,
        );
      }
      if (event === "cancellation") assert.match(row.body_text, /50\s*%/);
      assert.equal(row.user_id, "actor-1");
      assert.equal(row.recipient_email, "recipient@example.test");
      assert.equal(
        row.event_type,
        event === "welcome"
          ? "subscription_welcome"
          : "subscription_cancellation_followup",
      );
      assert.equal(row.plan_label, "monthly plan");
      assert.ok(Date.parse(row.send_after) >= before + 4 * 60 * 60 * 1000);
      assert.ok(Date.parse(row.send_after) <= after + 4 * 60 * 60 * 1000);
      const preferenceQuery = fixture.queries.find((query) =>
        query.table === "user_contacts"
      );
      assert.equal(preferenceQuery.fields, "preferred_language");
      assert.equal(preferenceQuery.user_id, "actor-1");
      assert.equal(preferenceQuery.order.field, "id");
      assert.equal(preferenceQuery.order.ascending, false);
      assert.equal(preferenceQuery.limit, 1);
    });
  }
}

for (
  const [language, expected] of [
    ["fr-CA", "fr"],
    ["es_MX", "es"],
    [" EN_gb ", "en"],
    ["DE-de", "de"],
    ["kr", "ko"],
    ["KR_kr", "ko"],
    ["cn", "zh"],
    ["zh_CN", "zh"],
    ["zh_TW", "zh-TW"],
    ["ZH_tw", "zh-TW"],
    ["zh-Hant", "zh-TW"],
    ["zh-HK", "zh-TW"],
    ["zh-MO", "zh-TW"],
    ["zh-Hant-CN", "zh-TW"],
    ["zh-Hans-TW", "zh"],
    ["zh-SG", "zh"],
    [null, "en"],
    [undefined, "en"],
    ["", "en"],
    ["   ", "en"],
    ["pt-BR", "en"],
    ["ar", "en"],
    ["not_a_locale", "en"],
    [42, "en"],
    [{}, "en"],
  ]
) {
  test(`email locale ${JSON.stringify(language)} resolves to ${expected}`, () => {
    for (const event of ["welcome", "cancellation"]) {
      assert.deepEqual(
        buildFounderFollowupEmail(event, "小明", language),
        buildFounderFollowupEmail(event, "小明", expected),
      );
    }
  });
}

test("English fallback preserves the approved welcome and cancellation verbatim", () => {
  assert.deepEqual(buildFounderFollowupEmail("welcome", "Alex", "missing"), {
    subject: "Quick question about Moneko",
    bodyText: [
      "Hi Alex,",
      "",
      "Yifan here, one of the co-founders of Moneko. I saw you joined recently and thought I’d say hi.",
      "",
      "Out of curiosity, what were you using to manage your money before Moneko?",
      "",
      "Also, if you need more time to try things out, let me know. Happy to extend your free trial.",
      "",
      "Yifan",
      "Co-founder, Moneko",
    ].join("\n"),
  });
  assert.deepEqual(buildFounderFollowupEmail("cancellation", "", null), {
    subject: "Quick question about your Moneko subscription",
    bodyText: [
      "Hi,",
      "",
      "Yifan here, co-founder of Moneko. I saw you recently cancelled your subscription and wanted to ask you directly.",
      "",
      "What made you decide to stop using Moneko?",
      "",
      "Feel free to be completely honest — if something was frustrating, missing, too expensive, or just not useful enough, I’d like to know.",
      "",
      "If you’re open to giving Moneko another try, I’d be happy to offer you 50% off. Just reply to this email and I’ll sort it out for you.",
      "",
      "Yifan",
      "Co-founder, Moneko",
    ].join("\n"),
  });
});

test("every language has a greeting without a name and preserves names literally", () => {
  for (const language of Object.keys(subjects)) {
    for (const event of ["welcome", "cancellation"]) {
      const anonymous = buildFounderFollowupEmail(event, "  ", language);
      assert.ok(anonymous.bodyText.split("\n")[0].trim());
      assert.doesNotMatch(anonymous.bodyText, /undefined|\{name\}/);
      const named = buildFounderFollowupEmail(event, " $&小明 ", language);
      assert.ok(named.bodyText.split("\n")[0].includes("$&小明"));
    }
  }
});

for (const event of ["welcome", "cancellation"]) {
  test(`${event}: missing contact or unsupported preference queues the English fallback`, async () => {
    for (
      const options of [{ noContact: true }, { language: null }, {
        language: "pt-BR",
      }]
    ) {
      const fixture = harness({ ...options, name: null });
      assert.equal((await fixture.request(event)).status, 200);
      const expected = buildFounderFollowupEmail(event, "", "en");
      assert.equal(fixture.queued[0].subject, expected.subject);
      assert.equal(fixture.queued[0].body_text, expected.bodyText);
    }
  });

  test(`${event}: preference read errors fail without queuing the wrong language`, async () => {
    const fixture = harness({
      language: "ja",
      languageError: { message: "database unavailable" },
    });
    const response = await fixture.request(event);
    assert.equal(response.status, 500);
    assert.match(
      (await response.json()).error,
      /Failed to load user language: database unavailable/,
    );
    assert.equal(fixture.queued.length, 0);
    assert.equal(fixture.errors.length, 1);
  });

  test(`${event}: an absent user skips language lookup and delivery`, async () => {
    const fixture = harness({ noUser: true });
    assert.equal(
      (await (await fixture.request(event)).json()).status,
      "ignored",
    );
    assert.equal(fixture.queries.length, 1);
    assert.equal(fixture.queued.length, 0);
  });
}

test("locale does not change deduplication or subscription eligibility", async () => {
  const english = harness({ language: "en" });
  const japanese = harness({ language: "ja", queueError: { code: "23505" } });
  await english.request();
  const response = await japanese.request();
  assert.equal((await response.json()).status, "deduped");
  assert.equal(japanese.queued[0].dedupe_key, english.queued[0].dedupe_key);

  const free = harness({ language: "ja" });
  assert.equal(
    (await (await free.request("welcome", { plan: "free" })).json()).status,
    "ignored",
  );
  assert.equal(free.queries.length, 0);
  assert.equal(free.queued.length, 0);
});
