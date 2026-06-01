export interface EmailImportAttachmentPathParams {
  userId: string;
  emailId: string;
  attachmentIndex: number;
  sha256: string;
  filename: string;
}

const UNSAFE_FILENAME_CHARS = /[^A-Za-z0-9._-]+/g;

export function sanitizeStorageFilename(filename: string): string {
  const basename = filename
    .split(/[\\/]+/)
    .pop()
    ?.trim() ?? "";
  const sanitized = basename
    .replace(UNSAFE_FILENAME_CHARS, "_")
    .replace(/_+/g, "_")
    .replace(/^[_ .-]+|[_ .-]+$/g, "");

  return sanitized || "attachment";
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildEmailImportAttachmentPath(
  params: EmailImportAttachmentPathParams,
): string {
  const safeEmailId = sanitizeStoragePathSegment(params.emailId);
  const safeFilename = sanitizeStorageFilename(params.filename);
  const shaPrefix = params.sha256.slice(0, 12);

  return `${params.userId}/${safeEmailId}/${
    params.attachmentIndex + 1
  }-${shaPrefix}-${safeFilename}`;
}

function sanitizeStoragePathSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(UNSAFE_FILENAME_CHARS, "_")
    .replace(/_+/g, "_")
    .replace(/^[_ .-]+|[_ .-]+$/g, "");

  return sanitized || "item";
}
