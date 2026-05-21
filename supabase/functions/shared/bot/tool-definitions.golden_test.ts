import {
  type BotToolDeclaration,
  buildAddTransactionsBatchTool,
  buildAddTransactionTool,
  buildConfirmBudgetTool,
  buildCreateCustomCategoryTool,
  buildCreateWalletTool,
  buildCreateWalletTransferTool,
  buildDeletePocketTool,
  buildDeleteTransactionTool,
  buildDraftBudgetTool,
  buildFinancialInsightTool,
  buildGenerateChartUrlTool,
  buildGetBudgetTool,
  buildListExpensesTool,
  buildListWalletsTool,
  buildManageRecurringTool,
  buildSetBudgetTool,
  buildSetCurrencyTool,
  buildSetLanguageTool,
  buildSetPocketTool,
  buildUpdateTransactionTool,
  buildUpdateWalletTool,
  cloneBotToolDeclarations,
} from "./tool-definitions.ts";

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `${
        message ?? "assertEquals failed"
      }\nactual: ${actualJson}\nexpected: ${expectedJson}`,
    );
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function toolNames(tools: BotToolDeclaration[]): string[] {
  return tools.map((tool) => String(tool.name));
}

function properties(tool: BotToolDeclaration): Record<string, any> {
  return (tool.parameters as any)?.properties ?? {};
}

function itemProperties(tool: BotToolDeclaration): Record<string, any> {
  return properties(tool).transactions?.items?.properties ?? {};
}

function twilioAppTools(): BotToolDeclaration[] {
  return [
    { name: "analyze_expense" },
    buildCreateCustomCategoryTool(),
    buildAddTransactionTool({ includeMerchant: true }),
    buildAddTransactionsBatchTool({ includeMerchant: true }),
    buildListWalletsTool(),
    buildCreateWalletTool(),
    buildUpdateWalletTool(),
    buildCreateWalletTransferTool(),
    buildUpdateTransactionTool({ includeMerchant: true }),
    buildDeleteTransactionTool(),
    buildListExpensesTool(),
    buildGenerateChartUrlTool(),
    buildFinancialInsightTool(),
  ];
}

function twilioWhatsAppTools(): BotToolDeclaration[] {
  return [
    { name: "analyze_expense" },
    buildCreateCustomCategoryTool(),
    buildAddTransactionTool(),
    buildAddTransactionsBatchTool(),
    buildListWalletsTool(),
    buildUpdateTransactionTool(),
    buildDeleteTransactionTool(),
    buildListExpensesTool(),
    buildGetBudgetTool(),
    buildDraftBudgetTool({ includePocketDetails: true }),
    buildConfirmBudgetTool({ includePocketDetails: true }),
    buildSetBudgetTool({ includePocketDetails: true }),
    buildSetPocketTool({ includeNewName: true, includeColorIcon: true }),
    buildDeletePocketTool(),
    buildSetCurrencyTool(),
    buildSetLanguageTool(),
    buildGenerateChartUrlTool(),
    buildFinancialInsightTool(),
    buildManageRecurringTool({ includeScheduleFields: true }),
  ];
}

function telegramTools(): BotToolDeclaration[] {
  return [
    { name: "analyze_expense" },
    buildCreateCustomCategoryTool(),
    buildAddTransactionTool({
      descriptionMode: "minimal",
      includeMerchant: true,
    }),
    buildAddTransactionsBatchTool({
      descriptionMode: "minimal",
      includeMerchant: true,
    }),
    buildListWalletsTool({ descriptionMode: "minimal" }),
    buildCreateWalletTool(),
    buildUpdateWalletTool(),
    buildCreateWalletTransferTool({ descriptionMode: "minimal" }),
    buildUpdateTransactionTool({
      descriptionMode: "minimal",
      includeMerchant: true,
    }),
    buildDeleteTransactionTool({ descriptionMode: "minimal" }),
    buildListExpensesTool({
      descriptionMode: "minimal",
      includeSpaceScope: true,
    }),
    buildGenerateChartUrlTool({ descriptionMode: "minimal" }),
    buildFinancialInsightTool({ descriptionMode: "minimal" }),
    buildGetBudgetTool({ descriptionMode: "minimal" }),
    buildDraftBudgetTool({ descriptionMode: "minimal" }),
    buildConfirmBudgetTool({ descriptionMode: "minimal" }),
    buildSetBudgetTool({ descriptionMode: "minimal" }),
    buildSetPocketTool({ descriptionMode: "minimal" }),
    buildDeletePocketTool({ descriptionMode: "minimal" }),
    buildSetCurrencyTool({ descriptionMode: "minimal" }),
    buildSetLanguageTool({ descriptionMode: "minimal" }),
    buildManageRecurringTool({
      descriptionMode: "minimal",
      includeDateField: true,
      includeRecurrenceRule: true,
    }),
  ];
}

Deno.test("golden bot tool order and counts are stable", () => {
  assertEquals(toolNames(twilioAppTools()), [
    "analyze_expense",
    "create_custom_category",
    "add_transaction",
    "add_transactions_batch",
    "list_wallets",
    "create_wallet",
    "update_wallet",
    "create_wallet_transfer",
    "update_transaction",
    "delete_transaction",
    "list_expenses",
    "generate_chart_url",
    "financial_insight",
  ]);

  assertEquals(toolNames(twilioWhatsAppTools()), [
    "analyze_expense",
    "create_custom_category",
    "add_transaction",
    "add_transactions_batch",
    "list_wallets",
    "update_transaction",
    "delete_transaction",
    "list_expenses",
    "get_budget",
    "draft_budget",
    "confirm_budget",
    "set_budget",
    "set_pocket",
    "delete_pocket",
    "set_currency",
    "set_language",
    "generate_chart_url",
    "financial_insight",
    "manage_recurring",
  ]);

  assertEquals(toolNames(telegramTools()), [
    "analyze_expense",
    "create_custom_category",
    "add_transaction",
    "add_transactions_batch",
    "list_wallets",
    "create_wallet",
    "update_wallet",
    "create_wallet_transfer",
    "update_transaction",
    "delete_transaction",
    "list_expenses",
    "generate_chart_url",
    "financial_insight",
    "get_budget",
    "draft_budget",
    "confirm_budget",
    "set_budget",
    "set_pocket",
    "delete_pocket",
    "set_currency",
    "set_language",
    "manage_recurring",
  ]);
});

Deno.test("golden platform-specific schema differences are explicit", () => {
  const twilioAppAdd = twilioAppTools()[2];
  const twilioWhatsAppAdd = twilioWhatsAppTools()[2];
  const telegramAdd = telegramTools()[2];
  assert("merchant" in properties(twilioAppAdd), "Twilio app add has merchant");
  assert(
    !("merchant" in properties(twilioWhatsAppAdd)),
    "WhatsApp add has no merchant",
  );
  assert("merchant" in properties(telegramAdd), "Telegram add has merchant");
  assert(
    !("description" in properties(telegramAdd).amount),
    "Telegram add_transaction keeps minimal amount schema",
  );
  assert(
    properties(twilioAppAdd).amount.description ===
      "Amount in major units (e.g. 10.50)",
    "Twilio app add_transaction keeps rich amount schema",
  );

  const telegramList = telegramTools()[10];
  const twilioWhatsAppList = twilioWhatsAppTools()[7];
  assert(
    "space_scope" in properties(telegramList),
    "Telegram list_expenses has space_scope",
  );
  assert(
    !("space_scope" in properties(twilioWhatsAppList)),
    "WhatsApp list_expenses has no space_scope",
  );

  const telegramRecurring = telegramTools()[21];
  const twilioRecurring = twilioWhatsAppTools()[18];
  assert(
    "date" in properties(telegramRecurring),
    "Telegram recurring exposes date",
  );
  assert(
    "recurrence_rule" in properties(telegramRecurring),
    "Telegram recurring exposes recurrence_rule",
  );
  assert(
    !("interval" in properties(telegramRecurring)),
    "Telegram recurring has no schedule interval field",
  );
  assert(
    "interval" in properties(twilioRecurring),
    "WhatsApp recurring has schedule interval field",
  );
});

Deno.test(
  "golden transaction batch item schemas preserve channel differences",
  () => {
    const twilioAppBatch = twilioAppTools()[3];
    const twilioWhatsAppBatch = twilioWhatsAppTools()[3];
    const telegramBatch = telegramTools()[3];
    assert(
      "merchant" in itemProperties(twilioAppBatch),
      "Twilio app batch item has merchant",
    );
    assert(
      !("merchant" in itemProperties(twilioWhatsAppBatch)),
      "WhatsApp batch item has no merchant",
    );
    assert(
      "merchant" in itemProperties(telegramBatch),
      "Telegram batch item has merchant",
    );
    assert(
      !("description" in itemProperties(telegramBatch).amount),
      "Telegram batch item keeps minimal amount schema",
    );
  },
);

Deno.test("tool declarations are cloned before SDK usage", () => {
  const source = twilioWhatsAppTools();
  const cloned = cloneBotToolDeclarations(source);
  assertEquals(toolNames(cloned), toolNames(source));
  assert(source !== cloned, "clone returns a new array");
  assert(source[1] !== cloned[1], "clone returns new declaration objects");
  (cloned[1] as any).parameters.properties.name.type = "BROKEN";
  assert(
    (source[1] as any).parameters.properties.name.type === "STRING",
    "mutating clone does not mutate source declaration",
  );
});
