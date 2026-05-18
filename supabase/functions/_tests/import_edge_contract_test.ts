/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test(
  "import contract: mobile save-expense payload fields are supported",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../save-expense/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "amount");
    assertStringIncludes(source, "category");
    assertStringIncludes(source, "currency");
    assertStringIncludes(source, "date");
    assertStringIncludes(source, "userId");
    assertStringIncludes(source, "clientCreatedAt");
    assertStringIncludes(source, "description");
    assertStringIncludes(source, "householdId");
    assertStringIncludes(source, "isPortfolio");
    assertStringIncludes(source, "recurrence_rule");
    assertStringIncludes(source, "anchor_date");
    assertStringIncludes(source, "interval");
    assertStringIncludes(
      source,
      "recurrence_rule: body.recurrence_rule || null",
    );
  },
);

Deno.test(
  "import contract: mobile save-income payload fields are supported",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../save-income/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "amount");
    assertStringIncludes(source, "category");
    assertStringIncludes(source, "currency");
    assertStringIncludes(source, "date");
    assertStringIncludes(source, "userId");
    assertStringIncludes(source, "clientCreatedAt");
    assertStringIncludes(source, "description");
    assertStringIncludes(source, "householdId");
    assertStringIncludes(source, "isPortfolio");
    assertStringIncludes(source, "recurrence_rule");
    assertStringIncludes(source, "anchor_date");
    assertStringIncludes(source, "interval");
  },
);

Deno.test(
  "import contract: analyze-expense attachment file types are handled",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../shared/analyze-core.ts", import.meta.url),
    );

    assertStringIncludes(source, "\\.(csv|txt|json|xml)");
    assertStringIncludes(source, "\\.(xlsx|xls)");
    assertStringIncludes(source, "\\.pdf");
    assertStringIncludes(source, "Unsupported or unreadable attachment format");
  },
);

Deno.test(
  "import contract: analyze-expense prompts put expense merchant and income source in merchant field",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../shared/analyze-core.ts", import.meta.url),
    );

    assertStringIncludes(
      source,
      "For expense items, analyze the merchant/store/payee and return it in merchant when identifiable.",
    );
    assertStringIncludes(
      source,
      "For income items, analyze the source/payer/origin and return it in merchant when identifiable.",
    );
    assertStringIncludes(
      source,
      "Only include merchant when the merchant/source is available with reasonable confidence; omit it otherwise.",
    );
    assertEquals(
      source.split(
        "Optional merchant field. For expenses, use the merchant/store/payee; for income, use the source/payer/origin. Omit when unavailable.",
      ).length - 1,
      2,
    );
  },
);

Deno.test(
  "import contract: save-transactions-batch exposes streaming progress",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../save-transactions-batch/index.ts", import.meta.url),
    );

    assertStringIncludes(source, 'url.searchParams.get("stream") === "true"');
    assertStringIncludes(source, '"Content-Type": "text/event-stream"');
    assertStringIncludes(source, 'formatSSEEvent("progress"');
    assertStringIncludes(source, "currentItem:");
    assertStringIncludes(source, "totalItems");
    assertStringIncludes(source, "progressOffset");
    assertStringIncludes(source, "progressTotal");
    assertStringIncludes(source, ": keep-alive\\n\\n");
  },
);

Deno.test(
  "import contract: forwarded inbound email body is not sent as attachment analysis text",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    const analyzeBodyStart = source.indexOf(
      "const analyzeBody: AnalyzeRequestBody",
    );
    const analyzeBodyEnd = source.indexOf(
      "const result = await runAnalyzeExpense",
      analyzeBodyStart,
    );
    const analyzeBodySource = source.slice(analyzeBodyStart, analyzeBodyEnd);

    assertStringIncludes(analyzeBodySource, "attachments:");
    assertEquals(analyzeBodySource.includes("emailContent?.text"), false);
    assertEquals(analyzeBodySource.includes("emailContent.text"), false);
  },
);

Deno.test(
  "import contract: inbound follow-up email caps long transaction lists",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    const transactionLinesStart = source.indexOf(
      "const transactionLines = transactions",
    );
    const transactionLinesEnd = source.indexOf(
      "const attachmentLines",
      transactionLinesStart,
    );
    const transactionLinesSource = source.slice(
      transactionLinesStart,
      transactionLinesEnd,
    );

    assertStringIncludes(transactionLinesSource, ".map((item) => {");
    assertStringIncludes(transactionLinesSource, ".slice(0, 30)");
    assertStringIncludes(transactionLinesSource, "transactions.length > 30");
    assertStringIncludes(transactionLinesSource, "<li>...</li>");
    assertEquals(transactionLinesSource.includes(".slice(0, 20)"), false);
  },
);

Deno.test(
  "import contract: inbound follow-up email explains attachment retention",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    const followupStart = source.indexOf("function buildFollowupEmail");
    const followupEnd = source.indexOf("async function getFcmAccessToken");
    const followupSource = source.slice(followupStart, followupEnd);

    assertStringIncludes(
      followupSource,
      "Moneko does not store forwarded attachments on our servers.",
    );
    assertStringIncludes(
      followupSource,
      "We download them temporarily only to extract transactions.",
    );
  },
);

Deno.test(
  "import contract: inbound webhook uses processing lease state for retries",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    assertStringIncludes(source, 'status: "processing"');
    assertStringIncludes(source, "lock_expires_at");
    assertStringIncludes(source, "processing_attempt_count");
  },
);

Deno.test(
  "import contract: inbound duplicate response exposes in-progress state",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "in_progress");
    assertStringIncludes(source, "reason: claim.reason");
  },
);

Deno.test(
  "import contract: inbound inbox recipient matching is environment configurable",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "EMAIL_IMPORT_INBOX_EMAIL");
    assertStringIncludes(source, "EMAIL_IMPORT_INBOX_EMAILS");
    assertStringIncludes(source, "shouldProcessInboundToConfiguredInboxes");
  },
);

Deno.test(
  "import contract: Plaid processor is enabled unless explicitly disabled",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../bank-sync-processor/index.ts", import.meta.url),
    );

    assertStringIncludes(
      source,
      'Deno.env.get("AUTO_BANK_SYNC_ENABLED")?.toLowerCase() !== "false"',
    );
  },
);

Deno.test(
  "import contract: Plaid maintenance cleans abandoned Link update sessions",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../plaid-maintenance/index.ts", import.meta.url),
    );

    assertStringIncludes(source, 'from("plaid_link_update_sessions")');
    assertStringIncludes(source, "completed_at");
    assertStringIncludes(source, "expires_at");
    assertStringIncludes(source, "processing_started_at");
  },
);

Deno.test(
  "import contract: Plaid webhook persists event then enqueues transaction sync",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../plaid-webhook/index.ts", import.meta.url),
    );
    const insertIndex = source.indexOf('from("bank_webhook_events")');
    const enqueueIndex = source.indexOf("enqueuePlaidSyncJob", insertIndex);

    assertEquals(insertIndex >= 0, true);
    assertEquals(enqueueIndex > insertIndex, true);
    assertStringIncludes(source, 'triggerSource: "plaid_transactions_webhook"');
    assertStringIncludes(source, "webhookEventId");
  },
);
