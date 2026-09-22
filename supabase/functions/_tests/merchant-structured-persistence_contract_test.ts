/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const read = (path: string) =>
  Deno.readTextFile(new URL(path, import.meta.url));
const [
  manual,
  batch,
  wallet,
  bank,
  edit,
  email,
  whatsapp,
  telegram,
  notification,
  plaid,
  bankProjection,
] = await Promise.all([
  read("../save-expense/index.ts"),
  read("../save-transactions-batch/index.ts"),
  read("../save-wallet-transaction/index.ts"),
  read("../shared/bank-sync.ts"),
  read("../update-expense/index.ts"),
  read("../resend-inbound-webhook/index.ts"),
  read("../twilio-whatsapp-ai-bot/index.ts"),
  read("../telegram-ai-bot/index.ts"),
  read("../classify-notification-capture/index.ts"),
  read("../shared/plaid-client.ts"),
  read("../shared/bank-expense-projection.ts"),
]);

Deno.test(
  "semantic producer paths persist structured merchant evidence",
  () => {
    for (const source of [manual, batch, wallet, bank]) {
      assertStringIncludes(source, "merchant_structured_name");
    }
    assertStringIncludes(
      edit,
      "updates.merchant_structured_name = updates.merchant",
    );
    // These semantic sources route their saves through the tested writers.
    assertStringIncludes(email, "saveTransactionsBatchInternal");
    assertStringIncludes(batch, "merchantStructuredName?: string;");
    assertStringIncludes(
      batch,
      "tx.merchantStructuredName.trim().slice(0, 255)",
    );
    assertStringIncludes(whatsapp, "save-transactions-batch");
    assertStringIncludes(telegram, "save-transactions-batch");
    assertStringIncludes(notification, "save-wallet-transaction");
  },
);

Deno.test(
  "Plaid stores only its explicit merchant_name as structured evidence",
  () => {
    assertStringIncludes(plaid, "merchant_structured_name?: string | null");
    assertStringIncludes(
      plaid,
      "merchant_structured_name: txn.merchant_name?.trim() || null",
    );
    assertStringIncludes(
      bankProjection,
      "merchant_structured_name: record.merchant_structured_name ?? null",
    );
    assertStringIncludes(
      wallet,
      'const structuredMerchantForStorage = typeof tx.merchantName === "string"',
    );
    assertStringIncludes(bank, "record.merchant_structured_name ?? null");
    assertStringIncludes(
      bank,
      "merchant_structured_name: candidate.structuredMerchant",
    );
  },
);

Deno.test(
  "income and recurring occurrence writes align structured evidence",
  async () => {
    const income = await read("../save-income/index.ts");
    const migration = await read(
      "../../migrations/20260915130000_merchant_identity_resolution.sql",
    );
    assertStringIncludes(
      income,
      "merchant_structured_name: normalizedMerchant",
    );
    assertStringIncludes(
      migration,
      "new.merchant_structured_name := nullif(btrim(new.merchant), '')",
    );
    assertStringIncludes(
      migration,
      "align_recurring_occurrence_merchant_evidence",
    );
  },
);
