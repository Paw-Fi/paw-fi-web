import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  buildSenderVerificationEmail,
  createSenderVerificationToken,
  hashSenderVerificationToken,
  isValidSenderVerificationToken,
  resolveVerifiedSenderAccountIds,
} from "../supabase/functions/shared/email-sender-verification.ts";

test("sender tokens are high entropy and only their hashes are persisted", async () => {
  const first = createSenderVerificationToken();
  const second = createSenderVerificationToken();
  assert.equal(first.length, 43);
  assert.notEqual(first, second);
  assert.equal(isValidSenderVerificationToken(first), true);
  assert.equal(isValidSenderVerificationToken("bad"), false);
  const hash = await hashSenderVerificationToken(first);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, first);
  assert.equal(hash, await hashSenderVerificationToken(first));
});

test("verification email identifies the requesting account and uses a fragment secret", () => {
  const token = createSenderVerificationToken();
  const email = buildSenderVerificationEmail({
    accountEmail: "relay<test>@privaterelay.appleid.com",
    verificationUrl: `https://example.test/verify#${token}`,
  });
  assert.equal(email.html.includes("relay&lt;test&gt;"), true);
  assert.equal(email.html.includes(`verify#${token}`), true);
  assert.equal(email.text.includes("24 hours"), true);
  assert.equal(email.text.includes("every enabled account"), true);
  assert.equal(email.text.includes("If you didn't request"), true);
});

test("verified recipient resolution deduplicates accounts and fails closed on errors", async () => {
  const userA = "11111111-1111-4111-8111-111111111111";
  const userB = "22222222-2222-4222-8222-222222222222";
  const receivedAt = "2026-10-03T12:00:00Z";
  const ids = await resolveVerifiedSenderAccountIds(
    {
      rpc: async (name, body) => {
        assert.equal(name, "email_import_sender_accounts");
        assert.deepEqual(body, {
          p_email: "sender@example.com",
          p_received_at: receivedAt,
        });
        return { data: [userA, userB, userA], error: null };
      },
    },
    "sender@example.com",
    receivedAt,
  );
  assert.deepEqual(ids, [userA, userB]);
  await assert.rejects(() =>
    resolveVerifiedSenderAccountIds(
      {
        rpc: async () => ({
          data: [userA],
          error: { message: "query failed" },
        }),
      },
      "sender@example.com",
      receivedAt,
    ),
  );
  await assert.rejects(() =>
    resolveVerifiedSenderAccountIds(
      {
        rpc: async () => ({ data: ["invalid-user-id"], error: null }),
      },
      "sender@example.com",
      receivedAt,
    ),
  );
});

test("migration preserves legacy grants but only service-role verification can authorize new senders", () => {
  const sql = readFileSync(
    new URL(
      "../supabase/migrations/20261003200000_email_sender_verification.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(sql, /set verified_at = created_at/);
  assert.match(sql, /unique \(user_id, normalized_sender_email\)/);
  assert.match(sql, /revoke insert, update, delete/);
  assert.match(sql, /token_hash text not null unique/);
  assert.match(sql, /expires_at <= now\(\)/);
  assert.match(sql, /for update/);
  assert.match(sql, /verified_at <= p_received_at/);
  assert.match(sql, /provider_email_id, delivery_user_id/);
  assert.match(sql, /grant execute.*service_role/s);
});
