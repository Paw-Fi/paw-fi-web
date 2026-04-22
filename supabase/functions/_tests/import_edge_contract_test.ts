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
