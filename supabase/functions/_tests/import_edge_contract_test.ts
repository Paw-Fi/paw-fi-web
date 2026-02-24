import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

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
