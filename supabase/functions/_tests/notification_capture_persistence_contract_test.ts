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
