/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertMatch,
  assertNotEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  createEmailImportReviewToken,
  hashEmailImportReviewToken,
  isValidReviewToken,
} from "../shared/email-import-review.ts";

Deno.test(
  "email import review tokens are 256-bit base64url secrets and only hashes are persistable",
  async () => {
    const token = createEmailImportReviewToken();
    const secondToken = createEmailImportReviewToken();
    const hash = await hashEmailImportReviewToken(token);

    assertEquals(isValidReviewToken(token), true);
    assertMatch(hash, /^[0-9a-f]{64}$/);
    assertNotEquals(token, secondToken);
    assertNotEquals(token, hash);
  },
);
