/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const saveSource = await Deno.readTextFile(
  new URL("../save-wallet-transaction/index.ts", import.meta.url),
);
const classificationSource = await Deno.readTextFile(
  new URL("../classify-notification-capture/index.ts", import.meta.url),
);
const provenanceMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260728120000_notification_capture_field_provenance.sql",
    import.meta.url,
  ),
);
const terminalFailureMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260802100000_cache_terminal_notification_classification_failures.sql",
    import.meta.url,
  ),
);

Deno.test(
  "notification capture persists only the genuine merchant field",
  () => {
    assertStringIncludes(
      saveSource,
      "const merchantForStorage = resolveWalletTransactionMerchant(tx);",
    );
    assertStringIncludes(saveSource, "merchant: merchantForStorage,");
    assertStringIncludes(
      saveSource,
      "merchant: responseExpense.merchant ?? merchantForStorage",
    );
  },
);

Deno.test(
  "terminal notification classification failures are idempotently cached",
  () => {
    assertStringIncludes(
      terminalFailureMigration,
      "claim_notification_capture_classification_v2",
    );
    assertStringIncludes(
      terminalFailureMigration,
      "v_existing.result ->> 'pipelineVersion' = p_pipeline_version",
    );
    assertStringIncludes(
      terminalFailureMigration,
      "v_existing.context_hash = p_context_hash",
    );
    assertStringIncludes(
      terminalFailureMigration,
      "pipeline_version = p_pipeline_version",
    );
    assertStringIncludes(
      terminalFailureMigration,
      "context_hash = p_context_hash",
    );
    assertStringIncludes(
      terminalFailureMigration,
      "CLASSIFICATION_RETRY_EXHAUSTED",
    );
    assertStringIncludes(terminalFailureMigration, "processing_token");
    assertStringIncludes(
      terminalFailureMigration,
      "v_existing.status = 'ignored'",
    );
    assertStringIncludes(
      terminalFailureMigration,
      "v_existing.status = 'saved'",
    );
    assertStringIncludes(
      terminalFailureMigration,
      "return jsonb_build_object(\n        'status', 'cached',",
    );
  },
);

Deno.test("classification claims pass pipeline and context dynamically", () => {
  assertStringIncludes(
    classificationSource,
    '"claim_notification_capture_classification_v2"',
  );
  assertStringIncludes(
    classificationSource,
    "p_pipeline_version: ANDROID_NOTIFICATION_CLASSIFIER_PIPELINE_VERSION",
  );
  assertStringIncludes(
    classificationSource,
    "p_context_hash: params.contextHash",
  );
  assertStringIncludes(classificationSource, "processingToken");
  assertStringIncludes(
    classificationSource,
    '.eq("processing_token", params.processingToken)',
  );
  assertStringIncludes(classificationSource, '.eq("status", "processing")');
});

Deno.test("downstream save failures persist bounded retry policy", () => {
  assertStringIncludes(
    classificationSource,
    "buildAndroidNotificationDependencyFailure(",
  );
  assertStringIncludes(classificationSource, "result: saveFailureResult");
});

Deno.test(
  "notification classification persists bounded field provenance",
  () => {
    assertStringIncludes(
      classificationSource,
      "verification_model: params.classification?.verificationModel ?? null",
    );
    assertStringIncludes(
      classificationSource,
      "buildAndroidNotificationFieldProvenance(params.classification)",
    );
    assertStringIncludes(provenanceMigration, "verification_model text");
    assertStringIncludes(provenanceMigration, "field_provenance jsonb");
  },
);

Deno.test(
  "failed notification classification persists privacy-safe model diagnostics",
  () => {
    assertStringIncludes(
      classificationSource,
      "buildAndroidNotificationFailureResult",
    );
    assertStringIncludes(classificationSource, "result: failureResult");
    assertStringIncludes(classificationSource, "normalizationDiagnostics:");
    assertStringIncludes(
      classificationSource,
      "classification.normalizationDiagnostics",
    );
    assertStringIncludes(
      classificationSource,
      'error: "Notification classification failed"',
    );
  },
);

Deno.test(
  "failed notification classification reports a privacy-safe edge alert",
  () => {
    assertStringIncludes(classificationSource, "reportEdgeFunctionError");
    assertStringIncludes(
      classificationSource,
      'functionName: "classify-notification-capture"',
    );
    assertStringIncludes(
      classificationSource,
      "error: new Error(failureResult.diagnosticCode)",
    );
    assertStringIncludes(
      classificationSource,
      "diagnostics: failureResult.diagnostics",
    );
    assertStringIncludes(
      classificationSource,
      "WALLET_CAPTURE_SAVE_HTTP_${saved.response.status}",
    );
    assertStringIncludes(classificationSource, 'stage: "wallet_capture_save"');
    assertStringIncludes(
      classificationSource,
      "httpStatusForAndroidNotificationFailure",
    );
    assertStringIncludes(
      classificationSource,
      "claim.result.success === false && claim.result.retryable === false",
    );
    assertStringIncludes(
      classificationSource,
      'code: "CLASSIFICATION_TERMINAL"',
    );
  },
);
