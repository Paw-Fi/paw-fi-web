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

Deno.test("notification capture saves cannot emit a second wallet push", () => {
  assertStringIncludes(
    walletCaptureSource,
    "const isNotificationCapture = isNotificationCaptureSource(captureSource);",
  );
  assertEquals(
    walletCaptureSource.match(
      /body\.suppressNotification !== true &&\s+!isNotificationCapture/g,
    )?.length ?? 0,
    2,
  );
  assertEquals(
    walletCaptureSource.match(
      /if \(!isNotificationCapture\) \{[\s\S]{0,2500}"notify_household_members_expense"/g,
    )?.length ?? 0,
    1,
  );
});
