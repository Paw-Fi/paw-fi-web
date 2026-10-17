import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { buildTicketClosedEmail } from "../supabase/functions/shared/ticket-closed-email.ts";
import { emailCatalogs } from "../supabase/functions/shared/email-translations/catalogs.ts";
import { resolveEmailLanguage } from "../supabase/functions/shared/email-language.ts";
import messages from "../supabase/functions/shared/email-translations.json" with {
  type: "json",
};
import baselines from "./ticket-closed-email-english-baselines.json" with {
  type: "json",
};

const read = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
const ticketId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const owner = { full_name: "小明<&> Family", email: "owner@example.test" };
const message = "<script>秘密</script> & {0} $&\nWe have got this sorted";
const request = { template: "ticket_closed", ticketId };

for (const [index, { ticket, hashes }] of baselines.entries()) {
  test(`English ticket email ${index}: preserves original subject, HTML and text exactly`, () => {
    const email = buildTicketClosedEmail({
      fullName: ticket.users?.full_name,
      message: ticket.message,
    });
    for (const field of ["subject", "html", "text"]) {
      assert.equal(
        createHash("sha256").update(email[field]).digest("hex"),
        hashes[field],
      );
    }
  });
}

test("ticket copy lives in the existing catalog with English and 14 valid editable translation fields", () => {
  const entries = Object.entries(messages).filter(([key]) =>
    key.startsWith("ticketClosed")
  );
  assert.equal(entries.length, 11);
  for (const [, entry] of entries) {
    assert.equal(Object.keys(entry).length, 15);
    assert.ok(entry.en.trim());
    for (const [language, value] of Object.entries(entry)) {
      assert.equal(typeof value, "string", language);
      if (value.trim()) {
        assert.deepEqual(
          value.match(/\{\d+\}/g) ?? [],
          entry.en.match(/\{\d+\}/g) ?? [],
        );
      }
    }
  }
});

test("ticket email falls back to exact English for an empty or unsupported locale", () => {
  const saved = emailCatalogs.fr;
  emailCatalogs.fr = {};
  try {
    const english = buildTicketClosedEmail({
      fullName: owner.full_name,
      message,
    });
    for (const language of ["fr", "pt-BR", "", null]) {
      for (const field of ["subject", "html", "text"]) {
        assert.equal(english.localize(language)[field], english[field]);
      }
    }
  } finally {
    emailCatalogs.fr = saved;
  }
});

test("ticket translation escapes authored HTML and keeps names, original messages and links opaque", () => {
  const saved = emailCatalogs.fr;
  emailCatalogs.fr = {
    "Update on your request – Moneko": "Votre demande <&>",
    "Hi {0},": "Bonjour {0},",
    "We have got this sorted": "C’est réglé <script>",
    "Your original message": "Votre message",
    "Your original message:": "Votre message :",
  };
  try {
    const email = buildTicketClosedEmail({
      fullName: owner.full_name,
      message,
    });
    const french = email.localize("fr_CA");
    assert.equal(french.subject, "Votre demande <&>");
    assert.ok(french.html.includes("C’est réglé &lt;script&gt;"));
    assert.ok(french.html.includes("Bonjour 小明&lt;&amp;&gt;,"));
    assert.ok(french.text.includes(message));
    assert.ok(
      french.html.includes("&lt;script&gt;秘密&lt;/script&gt; &amp; {0} $&"),
    );
    assert.ok(french.html.includes("\nWe have got this sorted</p>"));
    assert.ok(!french.html.includes("<script>"));
    assert.ok(
      french.text.includes(
        "Everything should now be sorted. Please update the app to check it out.",
      ),
    );
    const links = (html) =>
      [...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((match) => match[1]);
    assert.deepEqual(links(french.html), links(email.html));
  } finally {
    emailCatalogs.fr = saved;
  }
});

function server(options = {}) {
  const reads = [], sent = [], preferences = [];
  const client = {
    from(table) {
      let id;
      const query = {
        select: () => query,
        eq: (_key, value) => {
          id = value;
          return query;
        },
        maybeSingle: () => {
          reads.push({ table, id });
          const data = table === "support_tickets"
            ? options.missingTicket ? null : {
              user_id: ownerId,
              status: options.status ?? "closed",
              message,
            }
            : id === "creator-id"
            ? { is_creator: options.creator !== false }
            : { ...owner, ...options.owner };
          return Promise.resolve({
            data,
            error: options.queryError === table
              ? { message: "private failure" }
              : null,
          });
        },
      };
      return query;
    },
  };
  const scope = {
    exports: {},
    Request,
    Response,
    console: { log() {}, warn() {}, error() {} },
    setTimeout: (callback) => {
      callback();
      return 0;
    },
    Deno: {
      env: {
        get: (key) =>
          ({
            SUPABASE_URL: "https://example.test",
            SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
            RESEND_API_KEY: "test-resend-key",
          })[key],
      },
    },
    fetch: (_url, init) => {
      sent.push(JSON.parse(init.body));
      return Promise.resolve(
        Response.json(
          options.providerError
            ? { message: "provider rejected" }
            : { id: "mail-id" },
          { status: options.providerError ? 403 : 200 },
        ),
      );
    },
    require: (path) => {
      if (path.endsWith("email-language.ts")) {
        return {
          loadRecipientEmailLanguage: (email, userId) => {
            preferences.push({ email, userId });
            return options.preferenceError
              ? Promise.reject(new Error("preference unavailable"))
              : Promise.resolve(options.language ?? "fr_CA");
          },
        };
      }
      if (path.endsWith("edge-error-alert.ts")) {
        return { reportEdgeFunctionError: () => Promise.resolve() };
      }
      throw new Error(`Unexpected sender import: ${path}`);
    },
  };
  runInNewContext(
    compile(read("supabase/functions/shared/email-service.ts")),
    scope,
  );
  const sender = scope.exports;
  let handler;
  scope.require = (path) => {
    if (path.includes("/http/server.ts")) {
      return {
        serve: (value) => {
          handler = value;
        },
      };
    }
    if (path.includes("@supabase")) return { createClient: () => client };
    if (path.endsWith("cors.ts")) return { getCorsHeaders: () => ({}) };
    if (path.endsWith("auth.ts")) {
      return {
        authenticateUser: () =>
          Promise.resolve(
            options.unauthorized
              ? { success: false, statusCode: 401 }
              : { success: true, userId: "creator-id" },
          ),
      };
    }
    if (path.endsWith("email-service.ts")) return sender;
    if (path.endsWith("ticket-closed-email.ts")) {
      return { buildTicketClosedEmail };
    }
    throw new Error(`Unexpected endpoint import: ${path}`);
  };
  runInNewContext(
    compile(read("supabase/functions/send-email-raw/index.ts")),
    scope,
  );
  return {
    reads,
    sent,
    preferences,
    invoke: (body = request) =>
      handler(
        new Request("https://example.test/send-email-raw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      ),
  };
}

test("server delivers both MIME parts using the ticket owner's preference, ignores browser-supplied copy and recipients", async () => {
  const saved = emailCatalogs.fr;
  emailCatalogs.fr = {
    "Update on your request – Moneko": "Votre demande",
    "Hi {0},": "Bonjour {0},",
  };
  try {
    const app = server();
    const response = await app.invoke({
      ...request,
      to: "other@example.test",
      recipientUserId: "creator-id",
      from: "fake@example.test",
      subject: "Fake",
      html: "Fake",
      text: "Fake",
      bcc: "other@example.test",
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).success, true);
    assert.deepEqual(app.preferences, [{
      email: owner.email,
      userId: ownerId,
    }]);
    assert.equal(app.sent.length, 1);
    const sent = app.sent[0];
    assert.equal(sent.to, owner.email);
    assert.equal(sent.subject, "Votre demande");
    assert.ok(sent.html.includes("Bonjour 小明&lt;&amp;&gt;,"));
    assert.ok(sent.text.includes("Bonjour 小明<&>,"));
    assert.equal(sent.from, "Moneko Team <hello@moneko.io>");
    assert.equal(sent.reply_to, "hello@moneko.io");
    assert.equal(sent.bcc, undefined);
    assert.equal(sent.localize, undefined);
    assert.equal(sent.recipientUserId, undefined);
    assert.ok(
      app.reads.some((read) => read.table === "users" && read.id === ownerId),
    );
  } finally {
    emailCatalogs.fr = saved;
  }
});

test("all app locales select localized greeting, with Urdu direction and Traditional Chinese normalization", async () => {
  for (const locale of Object.keys(emailCatalogs)) {
    const saved = emailCatalogs[locale];
    emailCatalogs[locale] = { "Hi {0},": `${locale}: {0}` };
    try {
      const language = locale === "zh-TW" ? "zh_Hant_HK" : locale;
      const app = server({ language });
      assert.equal((await app.invoke()).status, 200);
      assert.ok(app.sent[0].text.startsWith(`${locale}: 小明<&>`));
      assert.ok(
        app.sent[0].html.includes(
          `<html lang="${resolveEmailLanguage(language)}"${
            locale === "ur" ? ' dir="rtl"' : ""
          }>`,
        ),
      );
    } finally {
      emailCatalogs[locale] = saved;
    }
  }
});

for (
  const [name, options, status] of [
    ["unauthenticated", { unauthorized: true }, 401],
    ["non-creator", { creator: false }, 403],
    ["missing ticket", { missingTicket: true }, 404],
    ["open ticket", { status: "open" }, 409],
    ["resolved ticket", { status: "resolved" }, 409],
    ["ticket lookup failure", { queryError: "support_tickets" }, 500],
    ["actor lookup failure", { queryError: "users" }, 500],
    ["missing recipient address", { owner: { email: "" } }, 400],
    ["preference failure", { preferenceError: true }, 500],
  ]
) {
  test(`${name}: sends no email`, async () => {
    const app = server(options);
    assert.equal((await app.invoke()).status, status);
    assert.equal(app.sent.length, 0);
  });
}

test("invalid template payloads are rejected before reading tickets or sending", async () => {
  for (
    const body of [null, [], { template: "unknown" }, {
      template: "ticket_closed",
    }, { ...request, ticketId: "invalid" }]
  ) {
    const app = server();
    assert.equal((await app.invoke(body)).status, 400);
    assert.equal(app.sent.length, 0);
    assert.ok(!app.reads.some((read) => read.table === "support_tickets"));
  }
});

test("provider delivery failures remain errors", async () => {
  const app = server({ providerError: true });
  const response = await app.invoke();
  assert.equal(response.status, 500);
  assert.equal((await response.json()).success, false);
});

test("existing creator-authored raw emails retain their exact content and metadata without preference lookup", async () => {
  const app = server();
  const raw = {
    to: "custom@example.test",
    subject: "Custom",
    html: "<p>Custom</p>",
    text: "Custom",
    from: "Founder <hello@moneko.io>",
    replyTo: "hello@moneko.io",
    cc: "cc@example.test",
  };
  assert.equal((await app.invoke(raw)).status, 200);
  assert.equal(app.sent[0].html, raw.html);
  assert.equal(app.sent[0].text, raw.text);
  assert.equal(app.sent[0].subject, raw.subject);
  assert.deepEqual(app.preferences, []);
});

for (
  const file of [
    "src/routes/creator/tickets.tsx",
    "src/components/performance/creator-tickets-route-component.tsx",
  ]
) {
  test(`${file}: closes before requesting the server template; other statuses and errors preserve existing behavior`, async () => {
    const source = read(file);
    const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const functions = ast.statements.filter((node) =>
      ts.isFunctionDeclaration(node) &&
      ["updateTicketStatus", "isResolvedStatus"].includes(node.name?.text)
    ).map((node) => node.getText(ast)).join("\n");
    const calls = [];
    let updateError = null, invokeError = null;
    const scope = {
      console: { error() {} },
      supabase: {
        from: (table) => ({
          update: (patch) => ({
            eq: (key, id) => {
              calls.push({ table, patch, key, id });
              return Promise.resolve({ error: updateError });
            },
          }),
        }),
        functions: {
          invoke: (name, options) => {
            calls.push({
              name,
              body: JSON.parse(JSON.stringify(options.body)),
            });
            return Promise.resolve({
              data: { success: true },
              error: invokeError,
            });
          },
        },
      },
    };
    runInNewContext(
      compile(functions + "\nglobalThis.update = updateTicketStatus;"),
      scope,
    );
    const ticket = { id: ticketId, users: owner, message };
    await scope.update({ ticket, status: "closed" });
    assert.equal(calls[0].patch.status, "closed");
    assert.equal(calls[0].patch.is_resolved, true);
    assert.deepEqual(calls[1], { name: "send-email-raw", body: request });
    for (
      const status of ["open", "in_progress", "waiting_on_user", "resolved"]
    ) {
      calls.length = 0;
      await scope.update({ ticket, status });
      assert.equal(calls.length, 1);
    }
    calls.length = 0;
    await scope.update({
      ticket: { ...ticket, users: null },
      status: "closed",
    });
    assert.equal(calls.length, 1);
    updateError = { message: "update failed" };
    calls.length = 0;
    await assert.rejects(
      scope.update({ ticket, status: "closed" }),
      /Failed to update ticket status/,
    );
    assert.equal(calls.length, 1);
    updateError = null;
    invokeError = { message: "delivery failed" };
    await assert.rejects(
      scope.update({ ticket, status: "closed" }),
      /Failed to send email update/,
    );
  });
}
