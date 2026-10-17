import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { formatMoney } from "../supabase/functions/shared/currency-symbols.ts";
import {
  buildFcmDeliveryContent,
  buildNotificationDeepLink,
} from "../supabase/functions/shared/notification-delivery.ts";
import {
  createNotificationTranslator,
  localizeNotificationCategory,
  notificationCatalogs,
} from "../supabase/functions/shared/notification-localization.ts";
import messages from "../supabase/functions/shared/notification-translations.json" with {
  type: "json",
};
import baselines from "./wallet-notification-english-baselines.json" with {
  type: "json",
};

const file = "../supabase/functions/save-wallet-transaction/index.ts";
const source = readFileSync(new URL(file, import.meta.url), "utf8");
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const names = new Set([
  "formatCurrencyAmount",
  "formatWalletNotificationCategory",
  "resolveWalletBudgetScope",
  "resolveWalletNotificationSpaceLabel",
  "buildWalletPocketNotificationMessage",
  "sendWalletPocketNotificationBestEffort",
  "sendFcmV1Notification",
  "fetchActiveDevices",
]);
const functions = ast.statements.filter((node) =>
  ts.isFunctionDeclaration(node) && names.has(node.name?.text)
);
const code =
  ts.transpileModule(functions.map((node) => node.getText(ast)).join("\n"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const userId = "owner-id",
  expenseId = "expense-id",
  householdId = "household-id";
const base = {
  userId,
  expenseId,
  householdId: null,
  isPortfolio: false,
  amountCents: 1250,
  currency: "EUR",
  category: "groceries",
  dateYmd: "2026-10-18",
};
const copy = {
  "Moneko captured {0}": "CAPTURE {0}",
  "💸 {0} -> {1}": "DESTINATION {1} / {0}",
  "🏷️ {0}": "CATEGORY {0}",
  "💰 No budget set for {0}": "NO BUDGET {0}",
  "💰 {0} budget this month": "BUDGET {0}",
  "🎯 Link this category to a pocket": "LINK CATEGORY",
  "👝 Pocket status updated": "POCKET UPDATED",
  "🎯 Set a limit on {0}": "SET LIMIT {0}",
  "⚠️ {0} over on {1}": "OVER {1} / {0}",
  "🪙 {0} left on {1}": "REMAINING {1} / {0}",
  "your personal space": "PERSONAL",
  "your private space": "PRIVATE",
  "your shared space": "SHARED",
  "Other": "OTHER CATEGORY",
};

function fixture(options = {}) {
  const sent = [], reads = [], insights = [], errors = [];
  const client = {
    from(table) {
      let column, filter, ordering, limit;
      const query = {
        select: () => query,
        eq: (key, value) => {
          column = key;
          filter = value;
          return query;
        },
        or: () => query,
        not: () => query,
        order: (key, value) => {
          ordering = [key, value];
          return query;
        },
        limit: (value) => {
          limit = value;
          return query;
        },
        maybeSingle: () => execute(),
        then: (resolve, reject) => execute().then(resolve, reject),
      };
      function execute() {
        reads.push({ table, column, filter, ordering, limit });
        const data = table === "devices"
          ? options.noDevices
            ? []
            : [{ push_token: "android-token", platform: "android" }, {
              push_token: "web-token",
              platform: "web",
            }]
          : table === "user_contacts"
          ? options.noContact ? null : { preferred_language: options.language }
          : table === "households"
          ? { name: options.spaceName ?? null }
          : null;
        return Promise.resolve({
          data,
          error: table === "user_contacts" && options.contactError
            ? { message: "offline" }
            : null,
        });
      }
      return query;
    },
  };
  const scope = {
    createNotificationTranslator,
    localizeNotificationCategory,
    buildFcmDeliveryContent,
    buildNotificationDeepLink,
    formatMoney,
    firebaseProjectId: "test-project",
    iosBundleId: "com.moneko.mobile",
    getFcmAccessToken: () => Promise.resolve("test-access-token"),
    buildWalletPocketInsight: (params) => {
      insights.push(params);
      return Promise.resolve(options.insight ?? baselines[0].params.insight);
    },
    fetch: (_url, init) => {
      sent.push(JSON.parse(init.body).message);
      return Promise.resolve(Response.json({ name: "sent" }));
    },
    console: { log() {}, warn() {}, error: (...args) => errors.push(args) },
  };
  runInNewContext(code, scope);
  return {
    ...scope,
    sent,
    reads,
    insights,
    errors,
    send: (params = {}) =>
      scope.sendWalletPocketNotificationBestEffort({
        ...base,
        ...params,
        supabase: client,
      }),
    space: (params = {}) =>
      scope.resolveWalletNotificationSpaceLabel({
        householdId: null,
        isPortfolio: false,
        ...params,
        supabase: client,
      }),
  };
}

for (const [index, { params, expected }] of baselines.entries()) {
  test(`wallet scenario ${index}: preserves exact original English copy and scenario`, () => {
    const app = fixture();
    for (const language of [undefined, "en", "pt-BR"]) {
      assert.deepEqual(
        JSON.parse(
          JSON.stringify(
            app.buildWalletPocketNotificationMessage({ ...params, language }),
          ),
        ),
        expected,
      );
    }
  });
}

test("all wallet-authored translation lookups are in the single notification catalog", () => {
  const english = new Set(Object.values(messages).map((entry) => entry.en));
  const lookups = [];
  for (const fn of functions) {
    const visit = (node) => {
      const value =
        ts.isCallExpression(node) && node.expression.getText(ast) === "t"
          ? node.arguments[0]
          : ts.isTaggedTemplateExpression(node) && node.tag.getText(ast) === "t"
          ? node.template
          : null;
      if (value) {
        const key = ts.isTemplateExpression(value)
          ? value.head.text +
            value.templateSpans.map((part, index) =>
              `{${index}}${part.literal.text}`
            ).join("")
          : value.text;
        lookups.push(key);
        assert.ok(english.has(key), key);
      }
      ts.forEachChild(node, visit);
    };
    visit(fn);
  }
  assert.equal(new Set(lookups).size, 14);
  for (
    const [key, entry] of Object.entries(messages).filter(([key]) =>
      key.startsWith("walletCapture")
    )
  ) {
    assert.equal(Object.keys(entry).length, 15, key);
    for (const value of Object.values(entry)) {
      assert.equal(typeof value, "string");
      if (value.trim()) {
        assert.deepEqual(
          (value.match(/\{\d+\}/g) ?? []).sort(),
          (entry.en.match(/\{\d+\}/g) ?? []).sort(),
          key,
        );
      }
    }
  }
});

test("every budget/pocket scenario and all 14 app locales translate without changing opaque values", () => {
  for (const language of Object.keys(notificationCatalogs)) {
    const saved = notificationCatalogs[language];
    notificationCatalogs[language] = copy;
    try {
      const app = fixture();
      for (const [index, { params, expected }] of baselines.entries()) {
        const translated = app.buildWalletPocketNotificationMessage({
          ...params,
          spaceLabel: "your private space",
          language,
        });
        assert.equal(
          translated.title,
          "CAPTURE €12.50",
          `${language}/${index}`,
        );
        assert.ok(
          translated.body.startsWith(
            `DESTINATION your private space / €12.50\nCATEGORY ${
              localizeNotificationCategory("groceries", language)
            }\n`,
          ),
        );
        assert.equal(translated.scenario, expected.scenario);
        assert.ok(!translated.body.includes("{1}"));
        if (params.insight.pocket) {
          assert.ok(translated.body.includes(params.insight.pocket.name));
        }
      }
      const blank = app.buildWalletPocketNotificationMessage({
        ...baselines[0].params,
        category: "",
        language,
      });
      assert.ok(blank.body.includes("CATEGORY OTHER CATEGORY"));
      const custom = app.buildWalletPocketNotificationMessage({
        ...baselines[0].params,
        category: "私の保険 {0} $&",
        language,
      });
      assert.ok(custom.body.includes("私の保険 {0} $&"));
    } finally {
      notificationCatalogs[language] = saved;
    }
  }
});

test("personal/private/shared fallback labels translate while real Space names remain opaque", async () => {
  const saved = notificationCatalogs.fr;
  notificationCatalogs.fr = copy;
  try {
    const app = fixture();
    assert.equal(await app.space({ language: "fr_CA" }), "PERSONAL");
    assert.equal(
      await app.space({ householdId, isPortfolio: true, language: "fr" }),
      "PRIVATE",
    );
    assert.equal(await app.space({ householdId, language: "fr" }), "SHARED");
    assert.equal(
      await fixture({ spaceName: "your private space" }).space({
        householdId,
        language: "fr",
      }),
      "your private space",
    );
  } finally {
    notificationCatalogs.fr = saved;
  }
});

test("actual delivery reads the saved actor preference and localizes native and browser payloads", async () => {
  const saved = notificationCatalogs.fr;
  notificationCatalogs.fr = copy;
  try {
    const app = fixture({
      language: "fr_CA",
      insight: baselines[5].params.insight,
    });
    await app.send({ householdId, isPortfolio: true });
    assert.equal(app.sent.length, 2);
    assert.equal(app.insights[0].userId, userId);
    assert.equal(app.insights[0].currency, "EUR");
    const contact = app.reads.find((read) => read.table === "user_contacts");
    assert.equal(contact.column, "user_id");
    assert.equal(contact.filter, userId);
    assert.deepEqual(JSON.parse(JSON.stringify(contact.ordering)), ["id", {
      ascending: false,
    }]);
    assert.equal(contact.limit, 1);
    const native = app.sent.find((push) => push.token === "android-token");
    const web = app.sent.find((push) => push.token === "web-token");
    assert.equal(native.notification.title, "CAPTURE €12.50");
    assert.ok(native.notification.body.includes("PRIVATE"));
    assert.ok(native.notification.body.includes("OVER 家族 {0} $& / €12.34"));
    assert.equal(native.apns.payload.aps.badge, 1);
    assert.equal(web.notification, undefined);
    assert.equal(web.data.title, native.notification.title);
    assert.equal(web.data.body, native.notification.body);
    assert.deepEqual(web.webpush.data, web.data);
    assert.equal(web.webpush.fcm_options, undefined);
    for (const push of app.sent) {
      assert.equal(push.data.expense_id, expenseId);
      assert.equal(push.data.household_id, householdId);
      assert.equal(push.data.deep_link, `moneko://expense/${expenseId}`);
      assert.equal(push.data.currency, "EUR");
      assert.equal(push.data.category, "groceries");
      assert.equal(push.data.amount_cents, "1250");
      assert.equal(push.data.scenario, "linked_over");
      assert.equal(push.data.scope, "portfolio");
      assert.equal(push.data.notification_type, "wallet_pocket_update");
    }
  } finally {
    notificationCatalogs.fr = saved;
  }
});

test("Traditional Chinese, Urdu and legacy aliases use the same locale normalization in real delivery", async () => {
  for (
    const [language, locale] of [["zh_Hant_HK", "zh-TW"], ["ur_PK", "ur"], [
      "kr",
      "ko",
    ], ["cn", "zh"]]
  ) {
    const saved = notificationCatalogs[locale];
    notificationCatalogs[locale] = {
      ...copy,
      "Moneko captured {0}": `${locale} {0}`,
    };
    try {
      const app = fixture({ language });
      await app.send();
      assert.equal(app.sent[0].notification.title, `${locale} €12.50`);
    } finally {
      notificationCatalogs[locale] = saved;
    }
  }
});

test("missing, blank, unsupported and invalid catalog values use the original English at delivery", async () => {
  const saved = notificationCatalogs.fr;
  notificationCatalogs.fr = {
    "Moneko captured {0}": "broken {1}",
    "💰 No budget set for {0}": "",
  };
  try {
    for (
      const options of [{ noContact: true }, {}, { language: "" }, {
        language: "pt-BR",
      }, { language: "fr" }]
    ) {
      const app = fixture(options);
      await app.send();
      assert.equal(app.sent[0].notification.title, baselines[0].expected.title);
      assert.equal(
        app.sent[0].notification.body,
        baselines[0].expected.body.replace(
          "🏷️ Groceries",
          `🏷️ ${
            localizeNotificationCategory("groceries", options.language) ??
              "Groceries"
          }`,
        ),
      );
    }
  } finally {
    notificationCatalogs.fr = saved;
  }
});

test("contact read failure stays non-blocking after save and sends no guessed-language push", async () => {
  const app = fixture({ contactError: true });
  await assert.doesNotReject(app.send());
  assert.equal(app.sent.length, 0);
  assert.equal(app.insights.length, 0);
  assert.ok(app.errors.length);
});

test("an actor without active devices does not trigger preference or budget queries", async () => {
  const app = fixture({ noDevices: true });
  await app.send();
  assert.equal(app.sent.length, 0);
  assert.deepEqual(app.reads.map((read) => read.table), ["devices"]);
});

test("household events leave an unknown actor empty for recipient-language fallback", async () => {
  let block;
  const visit = (node) => {
    if (
      ts.isIfStatement(node) &&
      node.expression.getText(ast) === "householdId && requiresHouseholdSplit"
    ) block = node.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(block);
  const calls = [];
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  const compiled = ts.transpileModule(block, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  await runInNewContext(`(async () => { ${compiled} })()`, {
    ...base,
    householdId,
    requiresHouseholdSplit: true,
    isNotificationCapture: false,
    transactionType: "expense",
    expense: { id: expenseId },
    resolvedCategory: "groceries",
    description: "User description",
    isRecurring: false,
    supabase: {
      from: () => query,
      rpc: (name, args) => {
        calls.push({ name, args });
        return Promise.resolve({ error: null });
      },
    },
    console: { error() {} },
  });
  assert.equal(calls[0].name, "notify_household_members_expense");
  assert.equal(calls[0].args.p_expense_data.actor_name, null);
  assert.equal(calls[0].args.p_expense_data.amount_cents, 1250);
  assert.equal(calls[0].args.p_actor_user_id, userId);
});
