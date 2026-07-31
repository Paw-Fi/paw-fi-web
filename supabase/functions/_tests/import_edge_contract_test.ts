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
  "import contract: text analysis retries fallback models for empty AI output",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../shared/analyze-core.ts", import.meta.url),
    );

    assertStringIncludes(source, '"gemini-3.1-flash-lite"');
    assertStringIncludes(source, "returned no transaction tool call");
    assertStringIncludes(source, "returned empty or invalid items");
    assertStringIncludes(source, "trying fallback model");
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
  "import contract: inbound visible email body is sanitized and analyzed separately from attachments",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "resolveInboundEmailText({");
    assertStringIncludes(source, "html: emailContent?.html");
    assertStringIncludes(source, 'filename: "Email body"');
    assertStringIncludes(source, "text: emailBodyText");
    assertStringIncludes(source, "allowDeterministicTextFallback: false");
    assertStringIncludes(source, "preferred_timezone");
    assertStringIncludes(source, "localDateTimeToUtcIso({");
    assertStringIncludes(source, "clientCreatedAt");
    assertStringIncludes(
      source,
      "supportedAttachments.length === 0 && !emailBodyText",
    );
    assertStringIncludes(source, "deduplicateImportedTransactions");
    assertStringIncludes(source, "buildImportSemanticKey");
  },
);

Deno.test(
  "import contract: inbound follow-up email caps long transaction lists",
  async () => {
    const source = await Deno.readTextFile(
      new URL(
        "../resend-inbound-webhook/email-templates/import-followup-email.ts",
        import.meta.url,
      ),
    );
    assertStringIncludes(source, ".map(renderTransactionLine)");
    assertStringIncludes(source, ".slice(0, 30)");
    assertStringIncludes(source, "transactions.length <= 30");
    assertStringIncludes(source, "<li>...</li>");
    assertEquals(source.includes(".slice(0, 20)"), false);
  },
);

Deno.test(
  "import contract: inbound follow-up email explains attachment retention",
  async () => {
    const source = await Deno.readTextFile(
      new URL(
        "../resend-inbound-webhook/email-templates/import-followup-email.ts",
        import.meta.url,
      ),
    );

    assertStringIncludes(
      source,
      "Moneko does not store forwarded attachments or email content on our servers.",
    );
    assertStringIncludes(
      source,
      "We process them temporarily only to extract transactions.",
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

Deno.test(
  "import contract: Plaid account revocation webhook disables the affected account",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../plaid-webhook/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "USER_ACCOUNT_REVOKED");
    assertStringIncludes(source, "applyPlaidAccountRevokedWebhook");
    assertStringIncludes(source, "plaid_revoked_account_ids");
    assertStringIncludes(source, "bank_transaction_raw");
    assertStringIncludes(
      source,
      "relink_state: PLAID_NEW_ACCOUNTS_RELINK_STATE",
    );
  },
);

Deno.test(
  "import contract: mobile Plaid reads mark paid financial activity",
  async () => {
    const source = await Deno.readTextFile(
      new URL(
        "../../migrations/20260519103000_plaid_financial_activity_tracking.sql",
        import.meta.url,
      ),
    );

    assertStringIncludes(
      source,
      "create or replace function public.mark_mobile_plaid_financial_feature_used()",
    );
    assertStringIncludes(source, "last_financial_feature_used_at = now()");
    assertStringIncludes(source, "billing_keep_reason = 'active_paid_use'");
    assertStringIncludes(
      source,
      "perform public.mark_mobile_plaid_financial_feature_used();",
    );
    assertStringIncludes(source, "s.status = 'active'");
    assertStringIncludes(source, "s.current_period_end > now()");
  },
);

Deno.test(
  "import contract: Plaid sync ignores removed and removal-pending bank connections",
  async () => {
    const syncSource = await Deno.readTextFile(
      new URL("../plaid-sync-transactions/index.ts", import.meta.url),
    );
    const processorSource = await Deno.readTextFile(
      new URL("../bank-sync-processor/index.ts", import.meta.url),
    );

    assertStringIncludes(syncSource, '.is("removed_at", null)');
    assertStringIncludes(
      syncSource,
      "item_status.is.null,item_status.not.in.(removed,pending_removal)",
    );
    assertStringIncludes(processorSource, "connection.removed_at != null");
    assertStringIncludes(processorSource, 'connection.status === "disabled"');
    assertStringIncludes(
      processorSource,
      'connection.item_status === "pending_removal"',
    );
    assertStringIncludes(
      processorSource,
      "Skipping inactive bank connection for job",
    );
  },
);

Deno.test(
  "import contract: Plaid offboarding retries complete local cleanup after remote removal",
  async () => {
    const removeSource = await Deno.readTextFile(
      new URL("../shared/plaid-remove.ts", import.meta.url),
    );
    const cleanupSource = await Deno.readTextFile(
      new URL("../plaid-user-offboarding-cleanup/index.ts", import.meta.url),
    );

    assertStringIncludes(removeSource, "cleanupRemovedPlaidConnection");
    assertStringIncludes(removeSource, "markPlaidConnectionRemovalPending");
    assertStringIncludes(removeSource, 'item_status: "pending_removal"');
    assertStringIncludes(
      cleanupSource,
      "import { cleanupRemovedPlaidConnection }",
    );
    assertStringIncludes(cleanupSource, "cleanupRemovedPlaidConnection({");
    assertStringIncludes(cleanupSource, 'status: "completed"');
  },
);

Deno.test(
  "import contract: Plaid processor does not retry user-action handoff errors",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../bank-sync-processor/index.ts", import.meta.url),
    );

    assertStringIncludes(source, "isPlaidSyncTerminalHandoffError");
    assertStringIncludes(source, 'errorCode === "ITEM_LOGIN_REQUIRED"');
    assertStringIncludes(source, 'errorCode === "INVALID_CURSOR"');
  },
);
