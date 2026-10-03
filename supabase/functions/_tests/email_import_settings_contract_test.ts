/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test(
  "email sender requests require account-bound mailbox verification",
  async () => {
    const source = await Deno.readTextFile(
      new URL("../email-import-settings/index.ts", import.meta.url),
    );
    assertStringIncludes(
      source,
      '"Your Moneko account email is already an allowed sender. No need to add it again.",\n        409,\n        "DEFAULT_EMAIL_ALREADY_INCLUDED"',
    );
    assertStringIncludes(source, '"request_email_import_sender_verification"');
    assertStringIncludes(
      source,
      '"Please enter a valid email address.",\n        400,\n        "INVALID_EMAIL"',
    );
    assertStringIncludes(source, "p_user_id: userId");
    assertStringIncludes(source, "hashSenderVerificationToken(token)");
  },
);
