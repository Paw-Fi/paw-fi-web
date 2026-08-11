/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  filterSupportedImportAttachments,
  normalizeEmailAddress,
  resolveInboundEmailText,
  resolveNewestSenderOwner,
  sanitizeInboundEmailText,
  shouldProcessInboundRecipients,
} from "../shared/email-import.ts";

Deno.test(
  "email import: normalizeEmailAddress extracts lowercase email",
  () => {
    assertEquals(
      normalizeEmailAddress("Finance Team <Reports+Q1@Example.COM>"),
      "reports+q1@example.com",
    );
    assertEquals(
      normalizeEmailAddress("  USER@Example.com  "),
      "user@example.com",
    );
  },
);

Deno.test("email import: normalizeEmailAddress rejects invalid values", () => {
  assertEquals(normalizeEmailAddress("not-an-email"), null);
  assertEquals(normalizeEmailAddress(""), null);
  assertEquals(normalizeEmailAddress(undefined), null);
});

Deno.test(
  "email import: sanitizes a plain-text receipt without quoted history or signature",
  () => {
    assertEquals(
      sanitizeInboundEmailText(
        "Payment received\r\nMerchant: Coffee Shop\r\nTotal: USD 4.50\r\n\r\nOn Monday, Ada wrote:\r\n> Prior receipt: USD 99.00\r\n-- \r\nAda",
      ),
      "Payment received\nMerchant: Coffee Shop\nTotal: USD 4.50",
    );
    assertEquals(sanitizeInboundEmailText("\n  \n"), "");
  },
);

Deno.test(
  "email import: falls back to visible HTML when plain text is only an object placeholder",
  () => {
    const resolved = resolveInboundEmailText({
      text: "\uFFFC",
      html:
        '<html><body><p>Date &amp; Time: 26 Jul 16:35 (SGT)</p><p>Amount: SGD2.20</p><p>To: SUNRIC SHOPPING PTE. LTD.</p><img src="https://tracker.invalid/pixel"></body></html>',
    });

    assertEquals(resolved.source, "html");
    assertEquals(resolved.text.includes("Amount: SGD2.20"), true);
    assertEquals(resolved.text.includes("tracker.invalid"), false);
  },
);

Deno.test("email import: prefers meaningful plain text over HTML", () => {
  const resolved = resolveInboundEmailText({
    text: "Amount: EUR 10.00\nTo: Plain Merchant",
    html: "<p>Amount: USD 99.00</p><p>To: HTML Merchant</p>",
  });

  assertEquals(resolved.source, "plain");
  assertEquals(resolved.text.includes("Plain Merchant"), true);
  assertEquals(resolved.text.includes("HTML Merchant"), false);
});

Deno.test(
  "email import: extracts the body of a directly forwarded plain-text email",
  () => {
    const text = sanitizeInboundEmailText(
      "FYI\n\n---------- Forwarded message ---------\nFrom: DBS Alerts <alerts@example.com>\nDate: Sat, 26 Jul 2025 at 16:35\nSubject: PayNow alert\nTo: Customer <customer@example.com>\n\nDear Customer,\nDate & Time: 26 Jul 16:35 (SGT)\nAmount: SGD2.20\nFrom: My Account A/C ending 1204\nTo: SUNRIC SHOPPING PTE. LTD. (UEN ending WSUN)",
    );

    assertEquals(text.includes("Forwarded message"), false);
    assertEquals(text.includes("Subject: PayNow alert"), false);
    assertEquals(text.includes("Amount: SGD2.20"), true);
    assertEquals(text.includes("From: My Account"), true);
    assertEquals(text.includes("To: SUNRIC SHOPPING"), true);
  },
);

Deno.test(
  "email import: sends the complete nested forwarded receipt to analysis",
  () => {
    const resolved = resolveInboundEmailText({
      text:
        "Begin forwarded message:\nFrom: Yifan Lim <ubereat7020@gmail.com>\nSubject: Fwd: Your Uber Eats receipt\nDate: Tuesday, August 11, 2026 at 09:16:03 GMT+1\nTo: sandbox-files@inbound.moneko.io\n\n---------- Forwarded message ---------\nFrom: Uber Eats <noreply@uber.com>\nDate: Tue, Aug 11, 2026 at 7:42 PM\nSubject: Your Uber Eats receipt\nTo: <your email>\n\nThanks for your order, Charles\n\nUBER EATS\nOrder completed\nTuesday, August 11, 2026 at 7:39 PM\n\nRestaurant\nSushi Garden\n\nTotal $58.40\nPayment\nVisa •••• 4242\nOrder total: USD 58.40\nCard charged: CAD 58.40",
    });

    assertEquals(resolved.source, "plain");
    assertEquals(resolved.text.includes("Begin forwarded message"), true);
    assertEquals(resolved.text.includes("From: Uber Eats"), true);
    assertEquals(resolved.text.includes("Restaurant\nSushi Garden"), true);
    assertEquals(resolved.text.includes("Card charged: CAD 58.40"), true);
  },
);

Deno.test(
  "email import: still stops at forwarded history after receipt content",
  () => {
    const text = sanitizeInboundEmailText(
      "Amount: EUR 12.50\nTo: Current Merchant\n\n---------- Forwarded message ---------\nAmount: USD 99.00\nTo: Old Merchant",
    );

    assertEquals(text.includes("Current Merchant"), true);
    assertEquals(text.includes("Old Merchant"), false);
  },
);

Deno.test("email import: keeps transaction From and To fields", () => {
  const text = sanitizeInboundEmailText(
    "Dear Customer,\n\nDate & Time:    26 Jul 16:35 (SGT)\nAmount:    SGD2.20\nFrom:    My Account A/C ending 1204\nTo:    SUNRIC SHOPPING PTE. LTD. (UEN ending WSUN)\n\nThank you",
  );
  assertEquals(text.includes("From:    My Account"), true);
  assertEquals(text.includes("To:    SUNRIC SHOPPING"), true);
});

Deno.test(
  "email import: filterSupportedImportAttachments keeps importable files only",
  () => {
    const attachments = filterSupportedImportAttachments([
      {
        filename: "statement.pdf",
        content_type: "application/pdf",
        download_url: "https://example.com/statement.pdf",
      },
      {
        filename: "transactions.csv",
        content_type: "text/csv",
        download_url: "https://example.com/transactions.csv",
      },
      {
        filename: "budget.xlsx",
        content_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        download_url: "https://example.com/budget.xlsx",
      },
      {
        filename: "photo.png",
        content_type: "image/png",
        download_url: "https://example.com/photo.png",
      },
    ]);

    assertEquals(
      attachments.map((item: { filename: string }) => item.filename),
      ["statement.pdf", "transactions.csv", "budget.xlsx"],
    );
  },
);

Deno.test(
  "email import: filterSupportedImportAttachments tolerates SDK field variants",
  () => {
    const attachments = filterSupportedImportAttachments([
      {
        filename: "ledger.xls",
        contentType: "application/vnd.ms-excel",
        downloadUrl: "https://example.com/ledger.xls",
      },
    ]);

    assertEquals(attachments.length, 1);
    assertEquals(attachments[0].downloadUrl, "https://example.com/ledger.xls");
  },
);

Deno.test(
  "email import: resolveNewestSenderOwner prefers newest duplicate",
  () => {
    const older = {
      userId: "user-older",
      normalizedSenderEmail: "shared@example.com",
      createdAt: "2026-04-20T09:00:00.000Z",
      source: "default" as const,
    };
    const newer = {
      userId: "user-newer",
      normalizedSenderEmail: "shared@example.com",
      createdAt: "2026-04-20T10:00:00.000Z",
      source: "whitelist" as const,
    };

    const resolved = resolveNewestSenderOwner([older, newer]);

    assertEquals(resolved?.userId, "user-newer");
    assertEquals(resolved?.source, "whitelist");
    assertNotEquals(resolved?.userId, older.userId);
  },
);

Deno.test(
  "email import: resolveNewestSenderOwner returns null for empty candidate list",
  () => {
    assertEquals(resolveNewestSenderOwner([]), null);
  },
);

Deno.test(
  "email import: shouldProcessInboundRecipients only accepts configured inbox",
  () => {
    assertEquals(
      shouldProcessInboundRecipients(
        ["files@inbound.moneko.io"],
        "files@inbound.moneko.io",
      ),
      true,
    );
    assertEquals(
      shouldProcessInboundRecipients(
        ["Files <files@inbound.moneko.io>", "other@example.com"],
        "files@inbound.moneko.io",
      ),
      true,
    );
    assertEquals(
      shouldProcessInboundRecipients(
        ["wrong@inbound.moneko.io"],
        "files@inbound.moneko.io",
      ),
      false,
    );
  },
);
