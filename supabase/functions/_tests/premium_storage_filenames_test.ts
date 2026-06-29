/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildEmailImportAttachmentPath,
  sanitizeStorageFilename,
  sha256Hex,
} from "../shared/premium-storage.ts";

Deno.test(
  "premium storage: sanitizeStorageFilename removes unsafe path content",
  () => {
    assertEquals(
      sanitizeStorageFilename("../Tax Receipt #1.pdf"),
      "Tax_Receipt_1.pdf",
    );
    assertEquals(sanitizeStorageFilename(""), "attachment");
    assertEquals(
      sanitizeStorageFilename("résumé final.pdf"),
      "r_sum_final.pdf",
    );
  },
);

Deno.test(
  "premium storage: sha256Hex returns stable lowercase hex",
  async () => {
    const digest = await sha256Hex(new TextEncoder().encode("moneko"));

    assertEquals(
      digest,
      "b76deecb68bbb756e210371606180de15b15e67b8b09b8f4bc109762fd545ba9",
    );
  },
);

Deno.test(
  "premium storage: buildEmailImportAttachmentPath scopes by user and email",
  () => {
    const path = buildEmailImportAttachmentPath({
      userId: "user-1",
      emailId: "email/with spaces",
      attachmentIndex: 1,
      sha256: "abcdef1234567890",
      filename: "../Receipt.pdf",
    });

    assertMatch(
      path,
      /^user-1\/email_with_spaces\/2-abcdef123456-Receipt\.pdf$/,
    );
  },
);
