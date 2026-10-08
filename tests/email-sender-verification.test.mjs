import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  buildSenderVerificationEmail,
  createSenderVerificationToken,
  hashSenderVerificationToken,
  isValidSenderVerificationToken,
  isValidSenderEmailAddress,
  resolveVerifiedSenderAccountIds,
} from "../supabase/functions/shared/email-sender-verification.ts";
import { sanitizeUrl } from "../supabase/functions/shared/email-security.ts";

test("sender email format rejects malformed addresses without rejecting non-English scripts", () => {
  for (const email of ["wickum@outlook.com", "wickum+receipts@outlook.com", "用户@例子.中国", "مستخدم@مثال.اختبار"]) {
    assert.equal(isValidSenderEmailAddress(email), true, email);
  }
  for (const email of ["wickum@outlook..com", "wickum@outlook.com.", ".wickum@outlook.com", "wickum..receipts@outlook.com", "wickum,@outlook.com", "wickum@-outlook.com", "wickum@outlook_.com", "wickum@outlook.com\u200b", "wickum\u0000@outlook.com"]) {
    assert.equal(isValidSenderEmailAddress(email), false, email);
  }
});
import {
  createImportUnavailableEmailBuilder,
  importUnavailableReasons,
} from "../supabase/functions/resend-inbound-webhook/email-templates/import-unavailable-email.ts";

test("unknown sender email offers account-confirmed setup, not automatic verification or import", () => {
  const build = createImportUnavailableEmailBuilder({
    importInboxEmail: "files@inbound.moneko.io",
    supportEmail: "hello@moneko.io",
  });
  const senderEmail = "wickum+receipts@outlook.com";
  const link = `moneko://add-email-sender?email=${encodeURIComponent(senderEmail)}`;
  const email = build({
    senderEmail,
    reason: importUnavailableReasons.senderNotWhitelisted,
  });
  assert.equal(sanitizeUrl(link), link);
  assert.equal(email.html.includes(`href="${link}"`), true);
  assert.match(email.html, /Add This Sender/);
  assert.match(email.html, /class="button primary"/);
  assert.match(email.text, /signed-in Moneko account/);
  assert.match(email.text, /forward your attachment again/);
  assert.match(email.text, /moneko:\/\/add-email-sender/);
  assert.doesNotMatch(email.html, /verify-email-sender#/);
  const disabled = build({
    senderEmail,
    reason: importUnavailableReasons.importDisabled,
  });
  assert.doesNotMatch(disabled.html, /add-email-sender/);
  for (const invalid of [
    `${link}&userId=other`,
    `${link}&email=other%40example.com`,
    `${link}#token`,
    "moneko://add-email-sender?email=bad",
    "moneko://add-email-sender/?email=user%40example.com",
    "moneko://user@add-email-sender?email=user%40example.com",
  ])
    assert.equal(sanitizeUrl(invalid), "#", invalid);
});

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

test("verification email uses the shared branded layout and direct app CTA", () => {
  const token = createSenderVerificationToken();
  const email = buildSenderVerificationEmail({
    accountEmail: "relay<test>@privaterelay.appleid.com",
    verificationUrl: `moneko://verify-email-sender#${token}`,
  });
  assert.equal(email.html.includes("relay&lt;test&gt;"), true);
  assert.equal(
    email.html.includes(`href="moneko://verify-email-sender#${token}"`),
    true,
  );
  assert.match(email.html, /class="container"/);
  assert.match(email.html, /class="button primary"/);
  assert.match(email.html, /class="footer"/);
  assert.match(email.html, /Contact Support/);
  assert.match(email.text, /installed/);
  assert.equal(email.text.includes("24 hours"), true);
  assert.equal(email.text.includes("every enabled account"), true);
  assert.equal(email.text.includes("If you didn't request"), true);
});

test("email URL sanitizer only permits exact sender verification app links", () => {
  const token = createSenderVerificationToken();
  const link = `moneko://verify-email-sender#${token}`;
  assert.equal(sanitizeUrl(link), link);
  assert.equal(sanitizeUrl("moneko://home"), "moneko://home");
  for (const invalid of [
    "moneko://verify-email-sender",
    `moneko://verify-email-sender#${token.slice(1)}`,
    `${link}a`,
    `${link}\n`,
    ` ${link}`,
    `moneko://verify-email-sender/#${token}`,
    `moneko://verify-email-sender?token=x#${token}`,
    `moneko://verify-email-sender.evil#${token}`,
    `moneko://user@verify-email-sender#${token}`,
    `moneko://verify-email-sender:123#${token}`,
    `moneko://verify-email-sender#${"+".repeat(43)}`,
    `moneko://verify-email-sender#${"/".repeat(43)}`,
    `moneko://verify-email-sender#${"=".repeat(43)}`,
    `moneko://verify-email-sender#%41${token.slice(1)}`,
    "javascript:alert(1)",
  ]) {
    assert.equal(sanitizeUrl(invalid), "#", invalid);
  }
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
