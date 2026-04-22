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
      const filename =
        typeof attachment.filename === "string"
          ? attachment.filename.trim()
          : "";
      const contentType =
        typeof attachment.content_type === "string"
          ? attachment.content_type.trim()
          : typeof attachment.contentType === "string"
            ? attachment.contentType.trim()
            : "";
      const downloadUrl =
        typeof attachment.download_url === "string"
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
