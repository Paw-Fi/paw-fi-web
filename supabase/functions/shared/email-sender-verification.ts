export function createSenderVerificationToken(): string {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function isValidSenderVerificationToken(
  value: unknown,
): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export async function hashSenderVerificationToken(
  token: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`email-import-sender:${token}`),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildSenderVerificationEmail(params: {
  accountEmail: string;
  verificationUrl: string;
}) {
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const text =
    `Confirm this email as a receipt sender for your Moneko account (${params.accountEmail}).\n\n` +
    `Open this link to verify automatically in Moneko:\n${params.verificationUrl}\n\n` +
    "This link expires in 24 hours. Forwarded receipts will be imported into every enabled account you authorize that has active Plus access.\n\n" +
    "If you didn't request this, ignore this email. No new sender authorization is active until you verify.";
  return {
    subject: "Verify your receipt sender for Moneko",
    text,
    html: `<html><body><h1>Verify your receipt sender</h1><p>Authorize this mailbox for your Moneko account <strong>${escape(params.accountEmail)}</strong>.</p><p><a href="${escape(params.verificationUrl)}">Verify in Moneko</a></p><p>This link expires in 24 hours. Forwarded receipts will be imported into every enabled account you authorize that has active Plus access.</p><p>If you didn't request this, ignore this email. No new authorization is active until you verify.</p></body></html>`,
  };
}

export async function resolveVerifiedSenderAccountIds(
  supabase: {
    rpc: (
      name: string,
      body: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: unknown }>;
  },
  email: string,
  receivedAt: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc("email_import_sender_accounts", {
    p_email: email,
    p_received_at: receivedAt,
  });
  if (
    error ||
    !Array.isArray(data) ||
    data.some(
      (id) =>
        typeof id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id,
        ),
    )
  ) {
    throw new Error("EMAIL_IMPORT_AUTHORIZATION_LOOKUP_FAILED");
  }
  return [...new Set(data)];
}
