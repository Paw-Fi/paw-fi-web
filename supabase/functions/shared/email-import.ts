import { htmlToText } from "./email-html-to-text.ts";

export interface ReceivedImportAttachment {
  filename: string;
  contentType: string;
  downloadUrl: string;
  sizeBytes: number | null;
}

export interface EmailImportSenderCandidate {
  userId: string;
  normalizedSenderEmail: string;
  createdAt: string | null;
  source: "default" | "whitelist";
}

interface ReceivedAttachmentLike {
  filename?: string | null;
  content_type?: string | null;
  contentType?: string | null;
  download_url?: string | null;
  downloadUrl?: string | null;
  size?: number | null;
}

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INBOUND_EMAIL_TEXT_CHARS = 12000;

export interface ResolvedInboundEmailText {
  text: string;
  source: "plain" | "html" | "none";
}

export function resolveInboundEmailText(params: {
  text?: string | null;
  html?: string | null;
}): ResolvedInboundEmailText {
  const plainText = sanitizeInboundEmailText(params.text);
  if (hasMeaningfulInboundEmailText(plainText)) {
    return { text: plainText, source: "plain" };
  }

  const htmlText = typeof params.html === "string"
    ? sanitizeInboundEmailText(htmlToText(params.html))
    : "";
  if (hasMeaningfulInboundEmailText(htmlText)) {
    return { text: htmlText, source: "html" };
  }

  return { text: "", source: "none" };
}

function hasMeaningfulInboundEmailText(value: string): boolean {
  return /[\p{L}\p{N}\p{Sc}]/u.test(value);
}

/**
 * Produces bounded, plain receipt text from a provider's text email body.
 * Quoted reply chains and signatures routinely contain unrelated historical
 * transactions, so they must not be offered to the transaction extractor.
 */
export function sanitizeInboundEmailText(value?: string | null): string {
  if (typeof value !== "string") return "";

  const lines = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000\u200B-\u200D\uFEFF\uFFFC\uFFFD]/g, "")
    .split("\n");
  const kept: string[] = [];
  let skippingForwardEnvelopeHeaders = false;
  let enteredForwardedBody = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const isForwardDelimiter =
      /^\s*-{2,}\s*(forwarded|original) message\s*-{2,}\s*$/i.test(line) ||
      /^\s*begin forwarded message:\s*$/i.test(line);

    if (isForwardDelimiter) {
      // A direct forward starts with this delimiter. It is the content users
      // intentionally sent for import, not quoted reply history. A second
      // delimiter, or one after actual receipt fields, starts old history.
      const hasTransactionFields = kept.some((keptLine) =>
        /^\s*(amount|total|date(?:\s*&\s*time)?|from|to)\s*:/i.test(keptLine)
      );
      if (enteredForwardedBody || hasTransactionFields) break;
      kept.length = 0;
      skippingForwardEnvelopeHeaders = true;
      enteredForwardedBody = true;
      continue;
    }

    if (skippingForwardEnvelopeHeaders) {
      if (!line.trim()) {
        skippingForwardEnvelopeHeaders = false;
        continue;
      }
      if (/^\s*(from|sent|date|subject|to|cc|reply-to)\s*:/i.test(line)) {
        continue;
      }
      skippingForwardEnvelopeHeaders = false;
    }

    if (/^\s*>/.test(line)) break;
    if (/^\s*--\s*$/.test(line)) break;
    if (/^\s*on .+wrote:\s*$/i.test(line)) break;
    kept.push(line);
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_INBOUND_EMAIL_TEXT_CHARS)
    .trim();
}

export function normalizeEmailAddress(value?: string | null): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const bracketMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (bracketMatch?.[1] ?? trimmed).trim().toLowerCase();
  if (!SIMPLE_EMAIL_REGEX.test(candidate)) {
    return null;
  }
  return candidate;
}

export function filterSupportedImportAttachments(
  attachments: ReceivedAttachmentLike[],
): ReceivedImportAttachment[] {
  return attachments
    .map((attachment) => {
      const filename = typeof attachment.filename === "string"
        ? attachment.filename.trim()
        : "";
      const contentType = typeof attachment.content_type === "string"
        ? attachment.content_type.trim()
        : typeof attachment.contentType === "string"
        ? attachment.contentType.trim()
        : "";
      const downloadUrl = typeof attachment.download_url === "string"
        ? attachment.download_url.trim()
        : typeof attachment.downloadUrl === "string"
        ? attachment.downloadUrl.trim()
        : "";
      const sizeBytes =
        typeof attachment.size === "number" && attachment.size >= 0
          ? Math.trunc(attachment.size)
          : null;

      return { filename, contentType, downloadUrl, sizeBytes };
    })
    .filter((attachment) => {
      if (!attachment.filename || !attachment.downloadUrl) {
        return false;
      }

      const lowerName = attachment.filename.toLowerCase();
      return (
        /\.pdf$/i.test(lowerName) ||
        /\.csv$/i.test(lowerName) ||
        /\.xlsx$/i.test(lowerName) ||
        /\.xls$/i.test(lowerName) ||
        /application\/pdf/i.test(attachment.contentType) ||
        /text\/csv/i.test(attachment.contentType) ||
        /application\/vnd\.ms-excel/i.test(attachment.contentType) ||
        /spreadsheetml/i.test(attachment.contentType)
      );
    });
}

export function resolveNewestSenderOwner(
  candidates: EmailImportSenderCandidate[],
): EmailImportSenderCandidate | null {
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((left, right) => {
    const leftMs = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightMs = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightMs - leftMs;
  });

  return sorted[0] ?? null;
}

export function shouldProcessInboundRecipients(
  recipients: string[] | undefined,
  expectedInbox: string,
): boolean {
  const normalizedExpected = normalizeEmailAddress(expectedInbox);
  if (
    !normalizedExpected ||
    !Array.isArray(recipients) ||
    recipients.length === 0
  ) {
    return false;
  }

  return recipients.some(
    (recipient) => normalizeEmailAddress(recipient) === normalizedExpected,
  );
}
