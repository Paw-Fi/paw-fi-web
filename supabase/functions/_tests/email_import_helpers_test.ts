/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  filterSupportedImportAttachments,
  normalizeEmailAddress,
  resolveNewestSenderOwner,
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
