import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as templates from "../supabase/functions/shared/email-templates.ts";
import { createEmailTranslator } from "../supabase/functions/shared/automated-email-localization.ts";
import { emailCatalogs } from "../supabase/functions/shared/email-translations/catalogs.ts";
import {
  loadRecipientEmailLanguage,
  resolveEmailLanguage,
} from "../supabase/functions/shared/email-language.ts";
import messages from "../supabase/functions/shared/email-translations.json" with {
  type: "json",
};

const fields = (email) => ({
  html: email.html,
  text: email.text,
  subject: email.subject,
});

const baselines = JSON.parse(
  readFileSync(
    new URL("./automated-email-english-baselines.json", import.meta.url),
    "utf8",
  ),
);
const hashEmail = (email) =>
  Object.fromEntries(
    Object.entries(fields(email)).map((
      [key, value],
    ) => [key, createHash("sha256").update(value).digest("hex")]),
  );
const data = {
  name: "小明 <&>",
  email: "person@example.test",
  planName: "Moneko Plus",
  endDate: "2026-12-01",
  trialEndDate: "2026-11-01",
  chargeDate: "2026-12-01",
  completionDate: "2026-10-01",
  expiryDate: "2026-11-10",
  paymentDate: "2026-10-01",
  amount: 123.45,
  currency: "EUR",
  daysUntil: 3,
  daysSinceInvite: 1,
  expiryHours: 24,
  discountPercent: 50,
  reminderTier: 1,
  daysUntilExpiry: 2,
  changeType: "upgrade",
  inviterName: "أحمد",
  inviteeName: "佐藤",
  householdName: "家族 <&>",
  personalMessage: "Open Moneko <script>秘密</script>",
  referrerName: "Zoë",
  refereeName: "山田",
  courseName: "Course <&>",
  invoiceNumber: "INV-123",
  paymentMethodType: "Visa",
  paymentMethodDetails: "4242",
  failureReason: "Provider supplied <&> reason",
  title: "Title <&>",
  message: "Personal message <&>",
  supportingMessage: "Supporting <&>",
  preheader: "Preview <&>",
  subject: "Subject <&>",
  actionText: "Action",
  appUrl: "moneko://home",
  dashboardUrl: "https://moneko.io/dashboard",
  inviteUrl: "https://moneko.io/invites/token",
  actionUrl: "https://moneko.io/action",
  certificateUrl: "https://moneko.io/certificate",
  nextCourseUrl: "https://moneko.io/course",
  invoiceUrl: "https://invoice.stripe.com/i/test?token=a%2Bb#secret",
  invoicePdfUrl: "https://invoice.stripe.com/i/test.pdf",
  authenticationUrl: "https://invoice.stripe.com/auth?secret=keep%2Bexact",
  updatePaymentUrl: "https://moneko.io/update",
  resubscribeUrl: "https://moneko.io/pricing",
};
const variants = {
  subscriptionCreatedTemplate: [{}, { isLifetime: true }, {
    endDate: undefined,
  }],
  subscriptionUpdatedTemplate: [
    "upgrade",
    "downgrade",
    "renewal",
    "interval_changed",
  ].map((changeType) => ({ changeType })),
  subscriptionCanceledTemplate: [{ immediateCancel: true }, {
    immediateCancel: false,
  }, { immediateCancel: false, endDate: null }],
  refundFailedTemplate: [{}, { accessRestored: true }, {
    failureReason: undefined,
  }],
  paymentFailedTemplate: [{}, { isDowngraded: true }, {
    failureReason: undefined,
    updatePaymentUrl: undefined,
  }],
  referralAcceptedTemplate: [{}, { refereeName: "" }],
  householdInviteTemplate: [
    {},
    { inviterName: "", householdName: "", personalMessage: "" },
    { householdName: "" },
    { inviterName: "" },
  ],
  courseCompletionTemplate: [{}, {
    certificateUrl: undefined,
    nextCourseUrl: undefined,
  }],
  invoiceFinalizedTemplate: [{ dueDate: "2026-12-01" }, {
    invoicePdfUrl: undefined,
  }],
  invoiceUpcomingTemplate: [{}, { daysUntil: 9 }, {
    updatePaymentUrl: undefined,
  }],
  paymentActionRequiredTemplate: [{}, { expiryHours: undefined }],
  invoicePaymentSucceededTemplate: [{}, { isRenewal: true }, {
    invoicePdfUrl: undefined,
  }],
  notificationTemplate: [{}, {
    preheader: undefined,
    supportingMessage: undefined,
    actionUrl: undefined,
    subject: undefined,
  }],
  inviteReminderInviterTemplate: [1, 2, 3].map((reminderTier) => ({
    reminderTier,
  })),
  inviteReminderInviteeTemplate: [1, 2, 3].map((reminderTier) => ({
    reminderTier,
  })),
};

for (const [name, build] of Object.entries(templates)) {
  for (const [index, overrides] of (variants[name] ?? [{}]).entries()) {
    test(`${name} branch ${index}: preserves the current English MIME parts and subject`, () => {
      const args = { ...data, ...overrides };
      const current = build(args);
      const expected = baselines[`${name}:${index}`];
      assert.deepEqual(hashEmail(current), expected);
      assert.deepEqual(hashEmail(current.localize("unsupported")), expected);
    });
  }
}

test("the single translation file has English source and all 15 language fields", () => {
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
  ];
  assert.ok(Object.keys(messages).length >= 367);
  const english = new Set();
  for (const [key, entry] of Object.entries(messages)) {
    assert.deepEqual(Object.keys(entry).sort(), [...languages].sort(), key);
    assert.ok(entry.en.trim(), key);
    assert.ok(!english.has(entry.en), `Duplicate English source: ${key}`);
    english.add(entry.en);
    for (const language of languages) {
      assert.equal(typeof entry[language], "string");
      if (entry[language].trim()) {
        assert.deepEqual(
          (entry[language].match(/\{\d+\}/g) ?? []).sort(),
          (entry.en.match(/\{\d+\}/g) ?? []).sort(),
          `${key}.${language}: preserve placeholders`,
        );
      }
    }
  }
});

test("supported language normalization preserves Chinese scripts and English fallback", () => {
  for (
    const [input, expected] of [
      ["fr_CA", "fr"],
      ["es-MX", "es"],
      ["KR_kr", "ko"],
      ["cn", "zh"],
      ["zh_TW", "zh-TW"],
      ["zh-HK", "zh-TW"],
      ["zh-Hant-CN", "zh-TW"],
      ["zh-Hans-TW", "zh"],
      ["pt-BR", "en"],
      [null, "en"],
      ["not_a_locale", "en"],
    ]
  ) assert.equal(resolveEmailLanguage(input), expected);
});

test("blank catalogs retain the complete English version including dates and HTML language", () => {
  const saved = emailCatalogs.de;
  emailCatalogs.de = {};
  try {
    const email = templates.invoiceUpcomingTemplate(data);
    assert.deepEqual(fields(email.localize("de-DE")), fields(email));
  } finally {
    emailCatalogs.de = saved;
  }
});

test("filled entries translate copy, preserve inline markup and leave user values opaque", () => {
  const saved = emailCatalogs.fr;
  emailCatalogs.fr = {
    "Open Moneko": "Ouvrir Moneko",
    "Hello {2}, your payment is {1}.":
      "Bonjour {2}, votre paiement est de {1}.",
  };
  try {
    const { t, h } = createEmailTranslator("fr");
    assert.equal(t("Open Moneko"), "Ouvrir Moneko");
    assert.equal(h`<p>${"Open Moneko"}</p>`, "<p>Open Moneko</p>");
    assert.equal(
      h`<p>Hello <strong>${"Open Moneko &lt;x&gt;"}</strong>, your payment is ${"€123.45"}.</p>`,
      "<p>Bonjour <strong>Open Moneko &lt;x&gt;</strong>, votre paiement est de €123.45.</p>",
    );
    assert.equal(t`\nOpen ${"$&{0}"}\n`, "\nOpen $&{0}\n");
  } finally {
    emailCatalogs.fr = saved;
  }
});

test("a filled template entry changes subject and both MIME parts without altering links or personal messages", () => {
  const saved = emailCatalogs.fr;
  emailCatalogs.fr = {
    "Open Moneko": "Ouvrir Moneko",
    "Welcome to Moneko!": "Bienvenue sur Moneko !",
    "Welcome to Moneko! 🎉": "Bienvenue sur Moneko ! 🎉",
  };
  try {
    const email = templates.welcomeTemplate(data).localize("fr-CA");
    assert.equal(email.subject, "Bienvenue sur Moneko !");
    assert.match(email.html, /lang="fr"/);
    assert.match(email.html, /Ouvrir Moneko/);
    assert.match(email.text, /Ouvrir Moneko/);
    assert.ok(email.html.includes('href="moneko://home"'));
    const invite = templates.householdInviteTemplate(data).localize("fr");
    assert.ok(
      invite.html.includes("Open Moneko &lt;script&gt;秘密&lt;/script&gt;"),
    );
    assert.ok(invite.html.includes(data.inviteUrl));
  } finally {
    emailCatalogs.fr = saved;
  }
});

test("Urdu templates declare right-to-left direction", () => {
  const saved = emailCatalogs.ur;
  emailCatalogs.ur = { "Open Moneko": "Moneko کھولیں" };
  try {
    assert.match(
      templates.welcomeTemplate(data).localize("ur").html,
      /lang="ur" dir="rtl"/,
    );
  } finally {
    emailCatalogs.ur = saved;
  }
});

test("stored-language REST reads isolate the recipient and an explicit import account", async () => {
  const originalFetch = globalThis.fetch;
  const originalDeno = globalThis.Deno;
  const urls = [];
  globalThis.Deno = {
    env: {
      get: (key) =>
        key === "SUPABASE_URL"
          ? "https://backend.example.test"
          : "service-test",
    },
  };
  globalThis.fetch = (url) => {
    urls.push(new URL(url));
    return Promise.resolve(Response.json(
      new URL(url).pathname.endsWith("/users")
        ? [{ id: "actor" }]
        : [{ preferred_language: "zh_TW" }],
    ));
  };
  try {
    assert.equal(
      await loadRecipientEmailLanguage("PERSON@example.test"),
      "zh-TW",
    );
    assert.equal(urls[0].searchParams.get("email"), "eq.person@example.test");
    assert.equal(urls[1].searchParams.get("user_id"), "eq.actor");
    assert.equal(urls[1].searchParams.get("order"), "id.desc");
    urls.length = 0;
    assert.equal(
      await loadRecipientEmailLanguage(
        "shared-sender@example.test",
        "second-account",
      ),
      "zh-TW",
    );
    assert.equal(urls.length, 1);
    assert.equal(urls[0].searchParams.get("user_id"), "eq.second-account");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Deno = originalDeno;
  }
});

test("lookup failures and ambiguous mailboxes fail instead of guessing another account's language", async () => {
  const originalFetch = globalThis.fetch;
  const originalDeno = globalThis.Deno;
  globalThis.Deno = {
    env: {
      get: (key) =>
        key === "SUPABASE_URL"
          ? "https://backend.example.test"
          : "service-test",
    },
  };
  try {
    globalThis.fetch = () =>
      Promise.resolve(new Response("unavailable", { status: 503 }));
    await assert.rejects(
      loadRecipientEmailLanguage("person@example.test"),
      /lookup failed/,
    );
    globalThis.fetch = () =>
      Promise.resolve(Response.json([{ id: "a" }, { id: "b" }]));
    await assert.rejects(
      loadRecipientEmailLanguage("person@example.test"),
      /Ambiguous/,
    );
    globalThis.fetch = () => Promise.resolve(Response.json([]));
    assert.equal(
      await loadRecipientEmailLanguage("external@example.test"),
      "en",
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Deno = originalDeno;
  }
});

function emailServiceHarness() {
  const source = readFileSync(
    new URL("../supabase/functions/shared/email-service.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exports = {};
  const errors = [];
  runInNewContext(compiled.outputText, {
    exports,
    fetch: (...args) => globalThis.fetch(...args),
    Deno: { env: { get: (key) => globalThis.Deno.env.get(key) } },
    console: { log() {}, warn() {}, error() {} },
    setTimeout: (callback) => {
      callback();
      return 0;
    },
    require: (specifier) => {
      if (specifier === "./email-language.ts") {
        return { loadRecipientEmailLanguage };
      }
      if (specifier === "./edge-error-alert.ts") {
        return {
          reportEdgeFunctionError: (error) => {
            errors.push(error);
            return Promise.resolve();
          },
        };
      }
      throw new Error(`Unexpected email-service import: ${specifier}`);
    },
  });
  return { ...exports, errors };
}

test("delivery localizes both MIME parts from the stored preference and preserves delivery metadata through retry", async () => {
  const originalFetch = globalThis.fetch;
  const originalDeno = globalThis.Deno;
  const saved = emailCatalogs.fr;
  const payloads = [];
  const preferenceReads = [];
  emailCatalogs.fr = {
    "Welcome to Moneko!": "Bienvenue sur Moneko !",
    "Open Moneko": "Ouvrir Moneko",
  };
  globalThis.Deno = {
    env: {
      get: (key) =>
        key === "SUPABASE_URL"
          ? "https://backend.example.test"
          : key === "EMAIL_TEST_MODE"
          ? undefined
          : "test-key",
    },
  };
  globalThis.fetch = (url, options) => {
    if (String(url).startsWith("https://api.resend.com/")) {
      payloads.push({
        body: JSON.parse(options.body),
        headers: options.headers,
      });
      return Promise.resolve(
        payloads.length === 1
          ? Response.json({ message: "retry" }, { status: 503 })
          : Response.json({ id: "mail-1" }),
      );
    }
    preferenceReads.push(String(url));
    return Promise.resolve(Response.json([{ preferred_language: "fr-CA" }]));
  };
  try {
    const service = emailServiceHarness();
    const template = templates.welcomeTemplate(data);
    const result = await service.sendEmail({
      to: "recipient@example.test",
      ...template,
      recipientUserId: "actor",
      from: "Moneko <hello@moneko.io>",
      replyTo: "reply@example.test",
      idempotencyKey: "event-123",
      attachments: [{ filename: "invoice.pdf", content: "bytes" }],
    });
    assert.equal(result.success, true);
    assert.equal(preferenceReads.length, 1);
    assert.equal(
      new URL(preferenceReads[0]).searchParams.get("user_id"),
      "eq.actor",
    );
    assert.equal(payloads.length, 2);
    assert.deepEqual(payloads[0], payloads[1]);
    assert.equal(payloads[0].body.subject, "Bienvenue sur Moneko !");
    assert.match(payloads[0].body.html, /Ouvrir Moneko/);
    assert.match(payloads[0].body.text, /Ouvrir Moneko/);
    assert.equal(payloads[0].body.to, "recipient@example.test");
    assert.equal(payloads[0].body.reply_to, "reply@example.test");
    assert.equal(payloads[0].headers["Idempotency-Key"], "event-123");
    assert.equal(payloads[0].body.attachments[0].content, "bytes");
    assert.equal("localize" in payloads[0].body, false);
    assert.equal("recipientUserId" in payloads[0].body, false);
    assert.equal(service.errors.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Deno = originalDeno;
    emailCatalogs.fr = saved;
  }
});

test("a preference outage does not send the email in a guessed language", async () => {
  const originalFetch = globalThis.fetch;
  const originalDeno = globalThis.Deno;
  const requests = [];
  globalThis.Deno = {
    env: {
      get: (key) =>
        key === "SUPABASE_URL" ? "https://backend.example.test" : "test-key",
    },
  };
  globalThis.fetch = (url) => {
    requests.push(String(url));
    return Promise.resolve(new Response("unavailable", { status: 503 }));
  };
  try {
    const service = emailServiceHarness();
    const result = await service.sendEmail({
      to: "recipient@example.test",
      ...templates.welcomeTemplate(data),
      recipientUserId: "actor",
    });
    assert.equal(result.success, false);
    assert.equal(requests.length, 1);
    assert.equal(requests.some((url) => url.includes("api.resend.com")), false);
    assert.equal(service.errors.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Deno = originalDeno;
  }
});

test("raw custom emails keep their supplied copy and require no preference lookup", async () => {
  const originalFetch = globalThis.fetch;
  const originalDeno = globalThis.Deno;
  const requests = [];
  globalThis.Deno = { env: { get: () => undefined } };
  globalThis.fetch = (url, options) => {
    requests.push({ url: String(url), body: JSON.parse(options.body) });
    return Promise.resolve(Response.json({ id: "raw" }));
  };
  try {
    const result = await emailServiceHarness().sendEmail({
      to: "external@example.test",
      subject: "Custom subject",
      html: "<p>Personal message</p>",
      text: "Personal message",
    });
    assert.equal(result.success, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://api.resend.com/emails");
    assert.equal(requests[0].body.subject, "Custom subject");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Deno = originalDeno;
  }
});

test("all translated invitation reminder headings and subjects use their catalog entries", () => {
  for (
    const language of Object.keys(messages.reminderYourInvitationToExpiresSoon)
  ) {
    if (language === "en") continue;
    const fill = (entry) =>
      entry[language].replace(/\{0\}/g, () => data.householdName);
    const inviter = templates.inviteReminderInviterTemplate({
      ...data,
      reminderTier: 3,
    }).localize(language);
    const invitee = templates.inviteReminderInviteeTemplate({
      ...data,
      reminderTier: 2,
    }).localize(language);
    assert.equal(
      inviter.subject,
      fill(messages.reminderYourInvitationToExpiresSoon),
      language,
    );
    assert.equal(
      invitee.subject,
      fill(messages.reminderYourInvitationToIsStillAvailable),
      language,
    );
    assert.ok(
      invitee.text.includes(
        fill(messages.reminderYourInvitationToIsStillAvailableTitle),
      ),
      language,
    );
  }
});

test("translated email copyright renders as a symbol without double-escaped entities", () => {
  for (
    const language of Object.keys(messages.copy2026MonekoAllRightsReserved)
  ) {
    if (language === "en") continue;
    const email = templates.welcomeTemplate(data).localize(language);
    assert.ok(email.html.includes("© 2026 Moneko"), language);
    assert.ok(!email.html.includes("&amp;copy;"), language);
  }
});
