import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import process from "node:process";
import test from "node:test";
import ts from "typescript";
import {
  createNotificationTranslator,
  localizeNotificationCategory,
  notificationCatalogs,
} from "../supabase/functions/shared/notification-localization.ts";
import { buildLogExpenseReminderMessage } from "../supabase/functions/shared/log-expense-reminder.ts";
import { buildRecurringReminderNotification } from "../supabase/functions/shared/recurring-reminder-notification.ts";
import * as currency from "../supabase/functions/shared/currency-symbols.ts";
import * as delivery from "../supabase/functions/shared/notification-delivery.ts";
import * as specialMessages from "../supabase/functions/shared/notification-special-messages.ts";
import * as timezone from "../supabase/functions/shared/timezone.ts";
import messages from "../supabase/functions/shared/notification-translations.json" with {
  type: "json",
};

export function loadEndpoint(name, {
  client = {},
  source,
  fetch = () => {
    throw new Error("Unexpected provider request");
  },
} = {}) {
  const text = source ??
    readFileSync(
      new URL(`../supabase/functions/${name}/index.ts`, import.meta.url),
      "utf8",
    );
  const scope = {
    exports: {},
    Request,
    Response,
    URL,
    Date,
    JSON,
    console: { log() {}, warn() {}, error() {} },
    fetch,
    crypto,
    TextEncoder,
    btoa,
    atob,
    Deno: {
      env: {
        get: (key) =>
          ({
            SUPABASE_URL: "https://example.test",
            SUPABASE_SERVICE_ROLE_KEY: "service-key",
            FIREBASE_PROJECT_ID: "test-project",
            FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
          })[key],
      },
    },
    require: (path) => {
      if (path.includes("@supabase")) return { createClient: () => client };
      if (path.includes("/http/server.ts")) {
        return {
          serve: (handler) => {
            scope.handler = handler;
          },
        };
      }
      if (path.endsWith("notification-localization.ts")) {
        return { createNotificationTranslator, localizeNotificationCategory };
      }
      if (path.endsWith("log-expense-reminder.ts")) {
        return { buildLogExpenseReminderMessage };
      }
      if (path.endsWith("recurring-reminder-notification.ts")) {
        return { buildRecurringReminderNotification };
      }
      if (path.endsWith("currency-symbols.ts")) return currency;
      if (path.endsWith("notification-delivery.ts")) return delivery;
      if (path.endsWith("notification-special-messages.ts")) {
        return specialMessages;
      }
      if (path.endsWith("timezone.ts")) return timezone;
      if (path.endsWith("plus-entitlement.ts")) {
        return { PRICING_URL: "https://moneko.io/pricing" };
      }
      if (path.endsWith("cors.ts")) return { getCorsHeaders: () => ({}) };
      if (path.endsWith("edge-error-alert.ts")) {
        return { reportEdgeFunctionError: () => Promise.resolve() };
      }
      return {};
    },
  };
  const expose =
    `\nglobalThis.render = typeof buildNotificationMessage === "function" ? buildNotificationMessage : typeof buildQueuedNotificationMessage === "function" ? buildQueuedNotificationMessage : typeof buildBudgetNudgeMessage === "function" ? buildBudgetNudgeMessage : createReminderNotifications;\n${
      text.includes("function getAccessToken")
        ? 'getAccessToken = () => Promise.resolve("test-token");'
        : ""
    }`;
  runInNewContext(
    ts.transpileModule(text + expose, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    scope,
  );
  return scope;
}
const primary = loadEndpoint("households-send-push-notification");
const queued = loadEndpoint("households-process-notifications");
const nudge = loadEndpoint("households-send-nudge");
const events = [
  "expense_added",
  "expense_edited",
  "expense_deleted",
  "income_added",
  "income_edited",
  "income_acknowledged",
  "budget_warn",
  "budget_alert",
  "invite_accepted",
  "member_joined",
  "split_created",
  "member_reminded",
  "recurring_reminder",
  "log_expense_reminder",
  "pockets_month_review",
  "capture_plus_required",
  "settlement_completed",
  "split_settled",
  "invite_reminder_inviter",
  "invite_reminder_invitee",
  "unknown",
];
export const payload = {
  household_id: "00000000-0000-4000-8000-000000000001",
  household_name: "家族 {0} $&",
  actor_name: "أحمد",
  member_name: "Zoë",
  sender_name: "佐藤",
  invitee_name: "小明",
  inviter_name: "أحمد",
  invite_token: "keep+token/文",
  invite_id: "invite-id",
  expense_id: "expense-id",
  occurrence_date: "2099-01-02",
  local_date: "2099-01-01",
  variant: 3,
  financial_cycle_label: "Oct–Nov",
  currency: "EUR",
  amount_cents: 12345,
  budget_cents: 10000,
  spent_cents: 12500,
  percentage_used: 125,
  budget_name: "食費",
  amounts_before: { you_owe_cents: 12345 },
  settlement_note: "秘密 $& {0}",
  expense_data: {
    actor_name: "أحمد",
    currency: "EUR",
    amount_cents: 12345,
    category: "食費",
    source: "会社",
    note: "秘密 $& {0}",
  },
};
export const primaryCases = events.flatMap((eventType) =>
  [{}, payload, { ...payload, is_recurring: true }, {
    ...payload,
    batch_count: 3,
    recurring_count: 3,
  }, { ...payload, batch_count: 3, recurring_count: 1 }].map((
    value,
  ) => [eventType, value])
);
for (const eventType of ["expense_edited", "income_edited"]) {
  for (
    const field of [
      "amount_cents",
      "category",
      "currency",
      "date",
      "raw_text",
      "source",
    ]
  ) {
    for (const value of ["changed 文", ""]) {
      primaryCases.push([eventType, {
        ...payload,
        expense_data: {
          ...payload.expense_data,
          updated_fields: [field],
          new_note: value,
          source: value,
          new_category: value,
          new_currency: "JPY",
          new_date: "2026-10-16",
          old_amount_cents: 1200,
          new_amount_cents: 1500,
        },
      }]);
    }
  }
}
for (const tier of [1, 2, 3]) {
  primaryCases.push(["invite_reminder_invitee", {
    ...payload,
    reminder_tier: tier,
  }]);
}
for (const custom of ["秘密 $& {0}", "", "  "]) {
  primaryCases.push(["member_reminded", { ...payload, message: custom }]);
}
primaryCases.push(["expense_added", payload, {
  shareCents: 1234,
  currency: "EUR",
  isSplitForRecipient: true,
}], ["expense_added", {
  ...payload,
  expense_data: { ...payload.expense_data, note: "" },
}, { shareCents: 1234, currency: "EUR", isSplitForRecipient: true }]);
export const queueCases = [
  ...new Set([
    ...events.filter((x) =>
      !["unknown", "capture_plus_required", "settlement_completed"].includes(x)
    ),
    "member_left",
    "member_removed",
  ]),
].flatMap((event_type) =>
  [{}, payload, { ...payload, is_recurring: true }, {
    ...payload,
    batch_count: 3,
    recurring_count: 1,
  }].map((value) => ({ event_type, payload: value }))
);
export const logCases = [0, 15].flatMap((inactivity_days) =>
  Array.from(
    { length: 16 },
    (_, variant) => ({ ...payload, inactivity_days, variant }),
  )
);
export const recurringCases = ["expense", "income"].flatMap((type) =>
  ["overdue", "upcoming"].flatMap((phase) =>
    ["2099-01-01", "2099-01-02", "2099-01-05", "invalid"].map((
      occurrence_date,
    ) => ({ ...payload, type, phase, occurrence_date }))
  )
);
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const baseline = JSON.parse(
  readFileSync(
    new URL("./notification-english-baselines.json", import.meta.url),
    "utf8",
  ),
);
for (
  const [name, cases, render] of [
    ["primary", primaryCases, (value) => primary.render(...value)],
    ["queue", queueCases, (value) => queued.render(value)],
    ["log", logCases, (value) => buildLogExpenseReminderMessage(value)],
    ["recurring", recurringCases, (value) =>
      buildRecurringReminderNotification(
        value,
        new Date("2099-01-01T00:00:00Z"),
      )],
    [
      "nudge",
      ["warn", "alert"],
      (type) =>
        nudge.render(type, { name: payload.household_name }, 125, "EUR"),
    ],
  ]
) {
  test(`${name}: English copy and routing data match the original implementation`, (context) => {
    const originalDate = Date;
    const originalTimezone = process.env.TZ;
    process.env.TZ = "UTC";
    context.mock.timers.enable({
      apis: ["Date"],
      now: new Date("2026-10-16T12:00:00Z"),
    });
    // Endpoint renderers run in VM contexts; use the same clock as their imports.
    for (const scope of [primary, queued, nudge]) scope.Date = Date;
    try {
      assert.deepEqual(
        cases.map((value) => hash(render(value))),
        baseline[name],
      );
    } finally {
      for (const scope of [primary, queued, nudge]) scope.Date = originalDate;
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });
}

test("one notification catalog contains English plus all 14 supported languages", () => {
  const languages = [
    "en",
    "de",
    "es",
    "fr",
    "it",
    "ja",
    "ko",
    "nl",
    "ur",
    "ru",
    "th",
    "uk",
    "zh",
    "zh_TW",
    "vi",
  ].sort();
  const seen = new Set();
  for (const [key, entry] of Object.entries(messages)) {
    assert.deepEqual(Object.keys(entry).sort(), languages);
    assert.ok(entry.en.trim());
    const identity = key.startsWith("notificationCategory")
      ? `category:${entry.en}`
      : entry.en;
    assert.ok(!seen.has(identity));
    seen.add(identity);
    for (const [locale, text] of Object.entries(entry)) {
      if (locale !== "en" && text.trim()) {
        assert.deepEqual(
          text.match(/\{\d+\}/g)?.sort(),
          entry.en.match(/\{\d+\}/g)?.sort(),
        );
      }
    }
  }
});

test("blank, unsupported and damaged translations use exact English", () => {
  const saved = notificationCatalogs.fr;
  const savedTraditionalChinese = notificationCatalogs["zh-TW"];
  const savedUrdu = notificationCatalogs.ur;
  notificationCatalogs.fr = { "Review your {0} plan": "incorrect {1}" };
  notificationCatalogs["zh-TW"] = {};
  notificationCatalogs.ur = {};
  try {
    for (const language of [undefined, "pt-BR", "fr-CA", "zh_TW", "ur"]) {
      assert.deepEqual(
        JSON.parse(
          JSON.stringify(
            primary.render(
              "pockets_month_review",
              payload,
              undefined,
              language,
            ),
          ),
        ),
        JSON.parse(
          JSON.stringify(primary.render("pockets_month_review", payload)),
        ),
      );
    }
  } finally {
    notificationCatalogs.fr = saved;
    notificationCatalogs["zh-TW"] = savedTraditionalChinese;
    notificationCatalogs.ur = savedUrdu;
  }
});

test("translated copy keeps names, custom notes, money and routing data opaque", () => {
  const saved = notificationCatalogs.fr;
  notificationCatalogs.fr = {
    "Review your {0} plan": "Consultez votre plan {0}",
    "Review and update your pockets whenever you are ready.":
      "Modifiez vos enveloppes quand vous le souhaitez.",
    "Your invitee": "Votre invité",
    "Someone": "Quelqu’un",
    "Budget": "Budget traduit",
    "A member": "Un membre",
    "sent you a spending reminder for {0}":
      "vous rappelle vos dépenses pour {0}",
  };
  try {
    assert.equal(
      primary.render("pockets_month_review", payload, undefined, "fr_CA").title,
      "Consultez votre plan Oct–Nov",
    );
    const custom = primary.render(
      "member_reminded",
      { ...payload, message: "Review your {0} plan" },
      undefined,
      "fr",
    );
    assert.equal(custom.body, "Review your {0} plan");
    for (const type of events) {
      assert.deepEqual(
        JSON.parse(
          JSON.stringify(primary.render(type, payload, undefined, "fr").data),
        ),
        JSON.parse(JSON.stringify(primary.render(type, payload).data)),
      );
    }
    for (const type of ["budget_warn", "budget_alert", "member_reminded"]) {
      assert.deepEqual(
        JSON.parse(
          JSON.stringify(primary.render(type, {}, undefined, "fr").data),
        ),
        JSON.parse(JSON.stringify(primary.render(type, {}).data)),
      );
    }
    const { t } = createNotificationTranslator("fr");
    assert.equal(
      t`Review your ${"$& {0}"} plan`,
      "Consultez votre plan $& {0}",
    );
  } finally {
    notificationCatalogs.fr = saved;
  }
});

function deliveryHarness(
  kind,
  {
    contactError = false,
    eventType = "member_joined",
    platform = "android",
    eventPayload = payload,
  } = {},
) {
  const sent = [], reads = [], writes = [];
  const users = ["fr-user", "en-user", "zh-user"];
  const contacts = [
    {
      id: 3,
      user_id: users[0],
      preferred_language: "fr_CA",
      preferred_timezone: "UTC",
    },
    {
      id: 2,
      user_id: users[0],
      preferred_language: "en",
      preferred_timezone: "UTC",
    },
    {
      id: 1,
      user_id: users[2],
      preferred_language: "zh_TW",
      preferred_timezone: "UTC",
    },
  ];
  const event = {
    id: "event-id",
    user_id: kind === "primary" ? users[0] : null,
    household_id: payload.household_id,
    event_type: eventType,
    payload: eventPayload,
    is_sent: false,
  };
  const client = {
    rpc: () => Promise.resolve({ data: true, error: null }),
    from(table) {
      let action = "read", single = false, limit;
      const filters = [];
      const builder = {
        select() {
          return builder;
        },
        eq(k, v) {
          filters.push([k, [v]]);
          return builder;
        },
        in(k, v) {
          filters.push([k, v]);
          return builder;
        },
        is() {
          return builder;
        },
        or() {
          return builder;
        },
        not() {
          return builder;
        },
        gte() {
          return builder;
        },
        lte() {
          return builder;
        },
        contains() {
          return builder;
        },
        order() {
          return builder;
        },
        limit(value) {
          limit = value;
          return builder;
        },
        update(value) {
          action = "write";
          writes.push({ table, value });
          return builder;
        },
        insert(value) {
          action = "write";
          writes.push({ table, value });
          return builder;
        },
        maybeSingle() {
          single = true;
          return builder;
        },
        single() {
          single = true;
          return builder;
        },
        then(resolve, reject) {
          if (action === "write") {
            return Promise.resolve({ data: null, error: null }).then(
              resolve,
              reject,
            );
          }
          reads.push({ table, filters });
          let data = table === "notification_events"
            ? (kind === "nudge" ? [] : [event])
            : table === "household_members"
            ? users.map((user_id) => ({ user_id }))
            : table === "devices"
            ? users.map((user_id) => ({
              user_id,
              push_token: `${user_id}-token`,
              platform,
            }))
            : table === "user_contacts"
            ? contacts
            : table === "households"
            ? [{ name: payload.household_name }]
            : [];
          if (table === "devices" || table === "user_contacts") {
            for (const [key, values] of filters) {
              data = data.filter((row) => values.includes(row[key]));
            }
          }
          if (limit) data = data.slice(0, limit);
          return Promise.resolve({
            data: single ? data[0] ?? null : data,
            error: table === "user_contacts" && contactError
              ? { message: "offline" }
              : null,
          }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  const names = {
    primary: "households-send-push-notification",
    queue: "households-process-notifications",
    nudge: "households-send-nudge",
  };
  const scope = loadEndpoint(names[kind], {
    client,
    fetch: (_url, options) => {
      sent.push(JSON.parse(options.body).message);
      return Promise.resolve(Response.json({ name: "test-message" }));
    },
  });
  return {
    sent,
    reads,
    writes,
    invoke: () =>
      scope.handler(
        new Request("https://example.test/push", {
          method: "POST",
          headers: {
            Authorization: "Bearer service-key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            kind === "primary"
              ? { notification_event_id: "event-id" }
              : kind === "nudge"
              ? {
                household_id: payload.household_id,
                budget_id: "budget-id",
                currency: "EUR",
                nudge_type: "warn",
                spent_cents: 12500,
                budget_cents: 10000,
                percentage_used: 125,
              }
              : {},
          ),
        }),
      ),
  };
}

for (const eventType of ["capture_plus_required", "settlement_completed"]) {
  test(`fallback delivers ${eventType} with the primary sender's localized copy and route`, async () => {
    const eventPayload = {
      ...payload,
      actor_name: "Alex",
      currency: "EUR",
      amounts_before: {
        you_owe_cents: 4200,
        you_are_owed_cents: 1200,
        net_pay_cents: 3000,
      },
      settlement_note: "ありがとう {0} $&",
      capture_source: "ios_wallet_shortcut",
    };
    for (const language of ["en", ...Object.keys(notificationCatalogs)]) {
      const expected = primary.render(
        eventType,
        eventPayload,
        undefined,
        language,
      );
      const actual = queued.render({
        event_type: eventType,
        payload: eventPayload,
      }, language);
      assert.equal(actual.title, expected.title, language);
      assert.equal(actual.body, expected.body, language);
      assert.deepEqual(
        JSON.parse(JSON.stringify(actual.data)),
        JSON.parse(JSON.stringify(expected.data)),
        language,
      );
    }
    const harness = deliveryHarness("queue", { eventType, eventPayload });
    const result = await (await harness.invoke()).json();
    assert.equal(result.sent, 1, JSON.stringify(result));
    assert.equal(harness.sent.length, 3);
    for (
      const [user, language] of [["fr-user", "fr"], ["en-user", "en"], [
        "zh-user",
        "zh-TW",
      ]]
    ) {
      const expected = primary.render(
        eventType,
        eventPayload,
        undefined,
        language,
      );
      const actual = harness.sent.find((message) =>
        message.token === `${user}-token`
      );
      assert.equal(actual.notification.title, expected.title);
      assert.equal(actual.notification.body, expected.body);
      assert.equal(
        actual.data.deep_link,
        expected.data.deep_link || `moneko://household/${payload.household_id}`,
      );
    }
  });
}

test("fallback browser pushes use data-only localized content for the service worker", async () => {
  const harness = deliveryHarness("queue", { platform: "web" });
  assert.equal((await harness.invoke()).status, 200);
  assert.equal(harness.sent.length, 3);
  for (const message of harness.sent) {
    assert.equal(message.notification, undefined);
    assert.ok(message.data.title);
    assert.ok(message.data.body);
    assert.equal(message.webpush.fcm_options, undefined);
    assert.deepEqual(message.webpush.data, message.data);
  }
});

for (const kind of ["primary", "queue", "nudge"]) {
  test(`${kind}: actual delivery selects each recipient's current language`, async () => {
    const savedFr = notificationCatalogs.fr,
      savedZh = notificationCatalogs["zh-TW"];
    notificationCatalogs.fr = {
      "🎉 New Member!": "Nouveau membre !",
      "joined {0}": "a rejoint {0}",
      "Budget Boop! 🐾": "Petit rappel du budget 🐾",
    };
    notificationCatalogs["zh-TW"] = {
      "🎉 New Member!": "新成員！",
      "Budget Boop! 🐾": "預算提醒 🐾",
    };
    try {
      const harness = deliveryHarness(kind), response = await harness.invoke();
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.success, true, JSON.stringify(result));
      const fr = harness.sent.find((x) => x.token === "fr-user-token");
      assert.ok(fr);
      if (kind === "primary") {
        assert.equal(
          fr.notification.body,
          `a rejoint ${payload.household_name}`,
        );
        assert.equal(harness.sent.length, 1);
      } else {
        assert.equal(
          fr.notification.title,
          kind === "queue" ? "Nouveau membre !" : "Petit rappel du budget 🐾",
        );
        assert.equal(
          harness.sent.find((x) => x.token === "en-user-token").notification
            .title,
          kind === "queue" ? "🎉 New Member!" : "Budget Boop! 🐾",
        );
        assert.equal(
          harness.sent.find((x) => x.token === "zh-user-token").notification
            .title,
          kind === "queue" ? "新成員！" : "預算提醒 🐾",
        );
      }
      assert.ok(
        harness.reads.some((x) =>
          x.table === "user_contacts" &&
          x.filters.some(([key]) => key === "user_id")
        ),
      );
    } finally {
      notificationCatalogs.fr = savedFr;
      notificationCatalogs["zh-TW"] = savedZh;
    }
  });
  test(`${kind}: preference lookup failures send no guessed-language push`, async () => {
    const harness = deliveryHarness(kind, { contactError: true }),
      response = await harness.invoke();
    const result = await response.json();
    assert.equal(harness.sent.length, 0);
    if (kind === "queue") {
      assert.equal(result.failed, 1);
      assert.ok(
        harness.writes.some((x) => x.value.processing_started_at === null),
      );
    } else assert.equal(response.status, 500);
  });
}

test("both workers localize shared log and recurring reminders without changing variant or occurrence routing", () => {
  const saved = notificationCatalogs.fr;
  notificationCatalogs.fr = {
    "A quick money check-in": "Un petit point dépenses",
    "Log a recent purchase while it’s still fresh.": "Notez un achat récent.",
    "A quick recurring check-in": "Un petit point récurrences",
  };
  try {
    const log = { ...payload, variant: 0, inactivity_days: 0 };
    for (
      const render of [
        (type, value, language) =>
          primary.render(type, value, undefined, language),
        (type, value, language) =>
          queued.render({ event_type: type, payload: value }, language),
      ]
    ) {
      assert.equal(
        render("log_expense_reminder", log, "fr").title,
        "Un petit point dépenses",
      );
      assert.equal(
        render("log_expense_reminder", log, "fr").body,
        "Notez un achat récent.",
      );
      assert.deepEqual(
        JSON.parse(
          JSON.stringify(render("log_expense_reminder", log, "fr").data),
        ),
        JSON.parse(
          JSON.stringify(render("log_expense_reminder", log, "en").data),
        ),
      );
      assert.equal(
        render("recurring_reminder", { ...payload, phase: "overdue" }, "fr")
          .title,
        "Un petit point récurrences",
      );
    }
  } finally {
    notificationCatalogs.fr = saved;
  }
});

test("invitation reminders queue distinct recipients and original payloads for delivery-time localization", async () => {
  const rows = [];
  const scope = loadEndpoint("households-process-invite-reminders", {
    client: {
      from: (table) => {
        assert.equal(table, "notification_events");
        return {
          insert: (value) => {
            rows.push(...value);
            return Promise.resolve({ error: null });
          },
        };
      },
    },
  });
  const invite = {
    id: "invite-id",
    household_id: payload.household_id,
    household_name: payload.household_name,
    inviter_id: "fr-user",
    invited_user_id: "zh-user",
    inviter_name: "أحمد",
    invitee_name: "小明",
    token: "opaque+token/文",
    invited_email: "person@example.test",
    personal_message: "秘密 {0}",
    expires_at: "2099-01-01",
  };
  const result = await scope.render(invite, 3);
  assert.equal(result.inviterNotified, true);
  assert.equal(result.inviteeNotified, true);
  assert.deepEqual(rows.map((x) => x.user_id), ["fr-user", "zh-user"]);
  assert.equal(rows[1].payload.personal_message, invite.personal_message);
  assert.equal(rows[1].payload.invite_token, invite.token);
  assert.equal(rows[1].payload.reminder_tier, 3);
  assert.ok(
    rows.every((x) =>
      !("preferred_language" in x.payload) && !("title" in x.payload) &&
      !("body" in x.payload)
    ),
  );
});

test("every authored translation lookup in these notification builders exists in the single catalog", () => {
  const english = new Set(Object.values(messages).map((entry) => entry.en));
  for (
    const [file, name] of [
      [
        "households-send-push-notification/index.ts",
        "buildNotificationMessage",
      ],
      [
        "households-process-notifications/index.ts",
        "buildQueuedNotificationMessage",
      ],
      ["households-send-nudge/index.ts", "buildBudgetNudgeMessage"],
      [
        "shared/notification-special-messages.ts",
        "buildSpecialNotificationMessage",
      ],
      ["shared/log-expense-reminder.ts", "buildLogExpenseReminderMessage"],
      [
        "shared/recurring-reminder-notification.ts",
        "buildRecurringReminderNotification",
      ],
    ]
  ) {
    const source = readFileSync(
      new URL(`../supabase/functions/${file}`, import.meta.url),
      "utf8",
    );
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const builder = ast.statements.find((node) =>
      ts.isFunctionDeclaration(node) && node.name?.text === name
    );
    assert.ok(builder);
    const visit = (node) => {
      const value =
        ts.isCallExpression(node) && node.expression.getText(ast) === "t"
          ? node.arguments[0]
          : ts.isTaggedTemplateExpression(node) && node.tag.getText(ast) === "t"
          ? node.template
          : undefined;
      if (value) {
        const key = ts.isTemplateExpression(value)
          ? value.head.text +
            value.templateSpans.map((part, index) =>
              `{${index}}${part.literal.text}`
            ).join("")
          : value.text;
        assert.ok(
          english.has(key.trim().replace(/\s+/g, " ")),
          `${file}: ${key}`,
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(builder);
  }
});

test("queued recipients share one rendering clock for reminder variants and due-day copy", () => {
  const now = new Date(2030, 0, 2, 23, 59, 59);
  const event = {
    event_type: "log_expense_reminder",
    payload: { user_id: "same-user", inactivity_days: 3 },
  };
  const english = queued.render(event, "en", now),
    french = queued.render(event, "fr", now);
  assert.equal(english.data.day_key, "2030-01-02");
  assert.deepEqual(
    JSON.parse(JSON.stringify(french.data)),
    JSON.parse(JSON.stringify(english.data)),
  );
  const recurring = queued.render(
    {
      event_type: "recurring_reminder",
      payload: { ...payload, occurrence_date: "2099-01-02" },
    },
    "en",
    new Date("2099-01-01T00:00:00Z"),
  );
  assert.ok(recurring.body.includes("tomorrow"));
});

test("both apostrophe-sensitive reminder variants select the real translations in every language", () => {
  for (
    const [key, inactivity_days] of [
      ["logARecentPurchaseWhileItSStillFresh", 0],
      ["startWithYourLatestExpenseAndUpdateTheRestWheneverYouReReady", 15],
    ]
  ) {
    const reminder = { ...payload, variant: 0, inactivity_days };
    for (const language of Object.keys(messages[key])) {
      const result = buildLogExpenseReminderMessage(reminder, language);
      assert.equal(result.body, messages[key][language], `${key}.${language}`);
    }
  }
});

test("category edits, acknowledgements and recurring reminders display mobile labels while routing stays canonical", () => {
  for (const language of ["fr", "ja", "ur", "zh_TW"]) {
    const label = localizeNotificationCategory("groceries", language);
    assert.ok(label);
    const value = {
      ...payload,
      category: "groceries",
      expense_data: {
        ...payload.expense_data,
        category: "groceries",
        new_category: "groceries",
        updated_fields: ["category"],
      },
    };
    for (
      const type of ["expense_edited", "income_edited", "income_acknowledged"]
    ) {
      const english = primary.render(type, value, undefined, "en");
      const localized = primary.render(type, value, undefined, language);
      assert.ok(localized.body.includes(label), `${type}/${language}`);
      assert.deepEqual(localized.data, english.data);
    }
    const acknowledged = queued.render({
      event_type: "income_acknowledged",
      payload: value,
    }, language);
    assert.ok(acknowledged.body.includes(label));
    const recurring = buildRecurringReminderNotification(
      value,
      new Date("2099-01-01T00:00:00Z"),
      language,
    );
    assert.ok(recurring.body.includes(label));
    assert.equal(recurring.data.category, "groceries");
  }
});
