/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test(
  "email import review migration uses hashed tokens, bounded evidence, and no anonymous table grants",
  async () => {
    const migration = await Deno.readTextFile(
      new URL(
        "../../migrations/20260808120000_email_import_human_review.sql",
        import.meta.url,
      ),
    );
    assertStringIncludes(migration, "token_hash text not null unique");
    assertStringIncludes(migration, "evidence_text text not null");
    assertStringIncludes(migration, "claim_email_import_review");
    assertStringIncludes(migration, "release_email_import_review_delivery");
    assertStringIncludes(migration, "status = 'pending' for update");
    assertStringIncludes(migration, "awaiting_review");
    assertStringIncludes(migration, "grant execute on function");
    assertStringIncludes(migration, "evidence_text = ''");
  },
);

Deno.test(
  "expected AI review and rejection outcomes do not enter Edge Error Digest",
  async () => {
    const webhook = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );
    assertStringIncludes(webhook, "classifyEmailImportWithAi");
    assertEquals(
      webhook.includes('operation: "email_body_ai_output_rejected"'),
      false,
    );
    assertEquals(
      webhook.includes('operation: "email_body_extraction_failed"'),
      false,
    );
    assertEquals(
      webhook.includes('operation: "email_body_ai_empty_fallback_recovered"'),
      false,
    );
    assertStringIncludes(
      webhook,
      "shouldEscalateEmailImportAiFailure(unresolvedAiItems.length)",
    );
    assertStringIncludes(webhook, "REQUIRES_AI_SEMANTIC_GROUNDING");
    assertStringIncludes(webhook, "releaseInboundReviewAfterDeliveryFailure");
  },
);

Deno.test(
  "inbound email body decisions are AI-only and progress logs stay concise",
  async () => {
    const webhook = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    assertStringIncludes(webhook, "classifyEmailImportWithAi");
    assertStringIncludes(webhook, "allowDeterministicTextFallback: false");
    assertStringIncludes(webhook, "EMAIL_IMPORT_AI_DECISION_MALFORMED_RESULT");
    assertEquals(webhook.includes("extractLabeledTransactionFallback"), false);
    assertEquals(webhook.includes("decideEmailImportGrounding"), false);
    assertEquals(
      webhook.includes("[resend-inbound-webhook] email body analyze progress"),
      false,
    );
  },
);

Deno.test(
  "review-required imports send one email that includes saved transactions",
  async () => {
    const webhook = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    assertStringIncludes(webhook, "buildImportReviewRequiredEmail({");
    assertStringIncludes(webhook, "if (reviewCandidates.length === 0) {");
    assertStringIncludes(webhook, 'setStage("send_followup_email_start")');
  },
);

Deno.test(
  "review-required imports send one actionable device notification",
  async () => {
    const webhook = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );

    assertStringIncludes(webhook, "sendImportReviewRequiredNotification");
    assertStringIncludes(webhook, 'event_type: "email_import_review_required"');
    assertStringIncludes(webhook, 'deep_link: "moneko://home"');
    assertEquals(webhook.includes("#${token}"), false);
    assertStringIncludes(
      webhook,
      'if (reviewCandidates.length === 0) {\n        try {\n          ensureSoftDeadline(processingStartedAtMs, "send_followup_email")',
    );
    assertStringIncludes(
      webhook,
      'if (reviewCandidates.length === 0) {\n        try {\n          ensureSoftDeadline(processingStartedAtMs, "push_notification")',
    );
  },
);

Deno.test("web review polls processing submissions", async () => {
  const route = await Deno.readTextFile(
    new URL("../../../src/routes/import-review/$reviewId.tsx", import.meta.url),
  );
  assertStringIncludes(route, 'data.status === "processing"');
  assertStringIncludes(route, "window.setTimeout");
  assertStringIncludes(route, "activeReviewIdRef.current === reviewId");
  assertStringIncludes(route, "moneko://import-review/");
  assertStringIncludes(route, "navigator.userAgent");
  assertStringIncludes(route, "moneko:import-review:app-launch:");
  assertStringIncludes(route, "Open Moneko");
  assertStringIncludes(route, "review.source");
  assertStringIncludes(route, "item.transaction");
});

Deno.test(
  "public review endpoints are POST-only and never read token query parameters",
  async () => {
    const inspect = await Deno.readTextFile(
      new URL("../email-import-review-inspect/index.ts", import.meta.url),
    );
    const submit = await Deno.readTextFile(
      new URL("../email-import-review-submit/index.ts", import.meta.url),
    );
    assertStringIncludes(inspect, 'request.method !== "POST"');
    assertStringIncludes(submit, 'request.method !== "POST"');
    assert(
      submit.indexOf(
        "const validatedDecisions = validateStoredReviewDecisions",
      ) < submit.indexOf('supabase.rpc("claim_email_import_review"'),
    );
    assertStringIncludes(
      submit,
      '.eq("processing_attempt_count", claimedAttemptCount)',
    );
    assertStringIncludes(inspect, "buildEmailImportReviewSource");
    assertStringIncludes(inspect, "buildEmailImportReviewItem");
    assertStringIncludes(submit, "buildEmailImportReviewSource");
    assertStringIncludes(submit, "buildEmailImportReviewItem");
    assertStringIncludes(inspect, "sender_email, created_at, result");
    assertStringIncludes(submit, "sender_email, created_at, result");

    const inspectConfig = await Deno.readTextFile(
      new URL("../email-import-review-inspect/config.toml", import.meta.url),
    );
    const submitConfig = await Deno.readTextFile(
      new URL("../email-import-review-submit/config.toml", import.meta.url),
    );
    assertStringIncludes(inspectConfig, "verify_jwt = false");
    assertStringIncludes(submitConfig, "verify_jwt = false");
  },
);

Deno.test(
  "reviewed email imports preserve the original scope and resolve the account per currency",
  async () => {
    const webhook = await Deno.readTextFile(
      new URL("../resend-inbound-webhook/index.ts", import.meta.url),
    );
    const submit = await Deno.readTextFile(
      new URL("../email-import-review-submit/index.ts", import.meta.url),
    );

    assertStringIncludes(webhook, "importContext: {");
    assertStringIncludes(webhook, "accountId: owner.accountId");
    assertStringIncludes(submit, "createEmailImportAccountResolver");
    assertStringIncludes(submit, "householdId: importContext.householdId");
    assertStringIncludes(submit, "...(importContext.householdId");
    assertStringIncludes(submit, "if (importEventError)");
  },
);
