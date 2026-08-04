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

Deno.test("Android notification classification has no push-delivery capability", () => {
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
});

Deno.test("silent Android notification classification still invokes expense persistence", () => {
  assertStringIncludes(
    classificationSource,
    "const saved = await invokeWalletCapture({",
  );
  assertStringIncludes(
    classificationSource,
    'captureSource: "android_notification_listener"',
  );
  assertStringIncludes(
    classificationSource,
    "idempotencyKey: `${params.eventKey}|transaction`",
  );
  assertStringIncludes(
    classificationSource,
    "await finalizeClassificationEvent(",
  );
});

Deno.test("Android notification capture saves cannot emit a second wallet push", () => {
  assertEquals(
    walletCaptureSource.match(
      /body\.suppressNotification !== true &&\s+captureSource !== "android_notification_listener"/g,
    )?.length ?? 0,
    2,
  );
  assertEquals(
    walletCaptureSource.match(
      /if \(captureSource !== "android_notification_listener"\) \{[\s\S]{0,2500}"notify_household_members_expense"/g,
    )?.length ?? 0,
    1,
  );
});
