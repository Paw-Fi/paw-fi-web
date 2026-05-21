/// <reference lib="deno.ns" />

import { buildBotSystemInstruction } from "./system-instruction.ts";
import { WALLET_LIST_PROMPT_RULE } from "./wallet-intent.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertIncludes(value: string, expected: string) {
  assert(
    value.includes(expected),
    `Expected value to include ${JSON.stringify(expected)}`,
  );
}

function assertNotIncludes(value: string, unexpected: string) {
  assert(
    !value.includes(unexpected),
    `Expected value not to include ${JSON.stringify(unexpected)}`,
  );
}

Deno.test("golden shared bot prompt keeps common rules in one builder", () => {
  const instruction = buildBotSystemInstruction({
    channel: "Telegram",
    toneRule:
      "Enthusiastic, encouraging, concise, and proactive (suitable for Telegram). Use light emojis, and close with a quick follow-up offer to help further.",
    spaceFollowUpRule:
      "When calling tools (especially list_expenses), include space_id or space_name when known, or set space_scope to personal account / private space / shared space so the correct account is queried.",
    bulkImportRule:
      "When the user uploads a receipt, bank statement, or file with multiple transactions, use 'add_transactions_batch' to save them all at once.",
    financialSnapshotRule:
      'For asks like "current financial situation/health/status": provide one concise snapshot for the current month/pay-period: verdict, income vs spending, net, top categories, budget status, upcoming recurring, and 1–2 actions. Always include the text summary; the chart is optional/secondary.',
    messageFormattingRules:
      "MESSAGE FORMATTING (Telegram-specific):\n- Your response is sent as plain text.",
  });

  assertIncludes(instruction, "You are Moneko");
  assertIncludes(instruction, WALLET_LIST_PROMPT_RULE);
  assertIncludes(instruction, "{{DATE}}");
  assertIncludes(instruction, "{{WALLETS}}");
  assertNotIncludes(instruction, "household_id + is_portfolio");
  assertNotIncludes(instruction, "portfolio");
});

Deno.test("golden shared bot prompt supports channel-specific sections", () => {
  const instruction = buildBotSystemInstruction({
    channel: "WhatsApp",
    toneRule:
      "Enthusiastic, encouraging, concise, and proactive (suitable for WhatsApp). Use light emojis, and close with a quick follow-up offer to help further.",
    spaceFollowUpRule:
      "Always refer to these exact names (personal account, private space, shared space) when responding.",
    bulkImportRule:
      "When the user uploads a receipt, bank statement, or file with multiple transactions, use 'add_transactions_batch' to save them all at once (more efficient than multiple add_transaction calls). Present a summary of all items for confirmation before saving.",
    financialSnapshotRule:
      'For asks like "current financial situation/health/status": provide one concise snapshot for the current month/pay-period: verdict, income vs spending (or say income not tracked), net, top 3–5 categories with % of spend, budget status (remaining/over/under + days left), upcoming recurring (next ~7 days), and 1–2 actions. If you send a chart, prefer a radar or donut of spending by category (not gauges). Always include the text summary; the chart is optional/secondary.',
    messageFormattingRules:
      "MESSAGE FORMATTING (WhatsApp-specific):\n- WhatsApp renders these formatting symbols natively.",
    commonUserIntents: true,
  });

  assertIncludes(instruction, "on WhatsApp");
  assertIncludes(instruction, "COMMON USER INTENTS");
  assertIncludes(instruction, "MESSAGE FORMATTING (WhatsApp-specific)");
});
