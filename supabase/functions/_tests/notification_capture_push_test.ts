/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const classificationSource = await Deno.readTextFile(
  new URL("../classify-notification-capture/index.ts", import.meta.url),
);
const walletCaptureSource = await Deno.readTextFile(
  new URL("../save-wallet-transaction/index.ts", import.meta.url),
);

Deno.test(
  "Android notification classification has no push-delivery capability",
  () => {
    assertFalse(classificationSource.includes("sendDecisionPush"));
    assertFalse(
      classificationSource.includes("sendNotificationCapturePushBestEffort"),
    );
    assertFalse(classificationSource.includes("notification-capture-push"));
    assertFalse(classificationSource.includes("FIREBASE_PROJECT_ID"));
    assertFalse(classificationSource.includes("FIREBASE_SERVICE_ACCOUNT_JSON"));
    assertFalse(classificationSource.includes("messages:send"));
    assertFalse(classificationSource.includes("Notification not added"));
    assertFalse(
      classificationSource.includes("Recurring transaction already tracked"),
    );
    assertFalse(
      classificationSource.includes("notification_capture_recurring_created"),
    );
    assertFalse(
      classificationSource.includes("notification_capture_recurring_replaced"),
    );
  },
);

Deno.test(
  "silent notification classification preserves its platform source",
  () => {
    assertStringIncludes(
      classificationSource,
      "const saved = await invokeWalletCapture({",
    );
    assertStringIncludes(
      classificationSource,
      "captureSource: resolveNotificationCaptureSource(",
    );
    assertStringIncludes(classificationSource, "params.body.captureSource,");
    assertStringIncludes(
      classificationSource,
      "idempotencyKey: `${params.eventKey}|transaction`",
    );
    assertStringIncludes(
      classificationSource,
      "await finalizeClassificationEvent(",
    );
  },
);

Deno.test("notification capture saves emit one post-save wallet push", () => {
  assertStringIncludes(
    walletCaptureSource,
    "const isNotificationCapture = isNotificationCaptureSource(captureSource);",
  );
  assertFalse(classificationSource.includes("suppressNotification:"));
  assertEquals(
    walletCaptureSource.match(
      /if \(transactionType === "expense" && body\.suppressNotification !== true\) \{\s+await sendWalletPocketNotificationBestEffort/g,
    )?.length ?? 0,
    2,
  );
  assertFalse(
    walletCaptureSource.includes(
      "body.suppressNotification !== true && !isNotificationCapture",
    ),
  );
  assertStringIncludes(
    walletCaptureSource,
    '.or("is_active.is.true,is_active.is.null")',
  );
  assertEquals(
    walletCaptureSource.match(
      /if \(!isNotificationCapture\) \{[\s\S]{0,2500}"notify_household_members_expense"/g,
    )?.length ?? 0,
    1,
  );
});

Deno.test(
  "duplicate wallet captures return before post-save notification",
  () => {
    const duplicateReturn = walletCaptureSource.indexOf(
      "return successResponse(claimResult.cachedResponse);",
    );
    const firstNotification = walletCaptureSource.indexOf(
      "await sendWalletPocketNotificationBestEffort({",
    );

    assertEquals(duplicateReturn >= 0, true);
    assertEquals(firstNotification > duplicateReturn, true);
  },
);
