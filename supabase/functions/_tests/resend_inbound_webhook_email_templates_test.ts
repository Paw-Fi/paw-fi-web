/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  createImportUnavailableEmailBuilder,
  importUnavailableReasons,
} from "../resend-inbound-webhook/email-templates/import-unavailable-email.ts";

const buildEmail = createImportUnavailableEmailBuilder({
  importInboxEmail: "files@inbound.moneko.io",
  supportEmail: "hello@moneko.io",
});

Deno.test(
  "email import unavailable emails give each setup scenario a clear action",
  () => {
    const cases = [
      [
        importUnavailableReasons.senderNotWhitelisted,
        "Allow this sender for Moneko email import",
        "add this sender",
      ],
      [
        importUnavailableReasons.importDisabled,
        "Enable Moneko email import to continue",
        "enable Email File Import",
      ],
      [
        importUnavailableReasons.subscriptionRequired,
        "Moneko Plus is required for email import",
        "moneko.io/pricing",
      ],
      [
        importUnavailableReasons.senderNotVerified,
        "Moneko could not verify this email sender",
        "did not pass our sender authentication checks",
      ],
      [
        importUnavailableReasons.noSupportedContent,
        "Moneko could not find importable content",
        "supported PDF, CSV, or Excel",
      ],
    ] as const;

    for (const [reason, subject, expectedText] of cases) {
      const email = buildEmail({ senderEmail: "user@example.com", reason });
      assertEquals(email.subject, subject);
      assertStringIncludes(email.html, expectedText);
      assertStringIncludes(email.text, expectedText);
    }
  },
);
