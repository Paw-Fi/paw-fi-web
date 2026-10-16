import {
  type LocalizedEmailContent,
  withEmailLocalization,
} from "./automated-email-localization.ts";
import { createEmailTranslator } from "./automated-email-localization.ts";
import { baseTemplate, renderButton, renderFooter } from "./email-layout.ts";
import { escapeHtml } from "./email-utils.ts";

export function isValidSenderEmailAddress(email: string): boolean {
  if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF<>()\[\],;:"\\]/.test(
      email,
    )
  ) {
    return false;
  }
  const [local, domain] = email.toLowerCase().split("@");
  if (
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  ) {
    return false;
  }
  return domain
    .split(".")
    .every((label) =>
      /^[a-z0-9\u0080-\uFFFF](?:[a-z0-9\u0080-\uFFFF-]{0,61}[a-z0-9\u0080-\uFFFF])?$/.test(
        label,
      ),
    );
}

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
}, language = "en"): LocalizedEmailContent {
  const { t, h } = createEmailTranslator(language);

  const text =
    t`Confirm this email as a receipt sender for your Moneko account (${params.accountEmail}).\n\n` +
    t`Open this link to verify automatically in Moneko:\n${params.verificationUrl}\n\n` +
    t("Open this email on a device with Moneko installed. If your email app blocks the button, open the link in your browser and allow it to launch Moneko.\n\n") +
    t("This link expires in 24 hours. Forwarded receipts will be imported into every enabled account you authorize that has active Plus access.\n\n") +
    t("If you didn't request this, ignore this email. No new sender authorization is active until you verify.");
  return withEmailLocalization({
    subject: t("Verify your receipt sender for Moneko"),
    text,
    html: baseTemplate(
      h`<h1 class="title">Verify your receipt sender</h1>
      <p>Authorize this mailbox for your Moneko account <strong>${
        escapeHtml(params.accountEmail)
      }</strong>.</p>
      ${renderButton(t("Verify in Moneko"), params.verificationUrl)}
      <p>Open this email on a device with Moneko installed. If your email app blocks the button, open the link in your browser and allow it to launch Moneko.</p>
      <p>This link expires in 24 hours. Forwarded receipts will be imported into every enabled account you authorize that has active Plus access.</p>
      <p>If you didn't request this, ignore this email. No new authorization is active until you verify.</p>`,
      renderFooter({
        customReason: t(
          "You're receiving this email because a request was made to authorize this mailbox as a Moneko receipt sender.",
        ),
      }, language),
      language,
    ),
  }, (locale) => buildSenderVerificationEmail(params, locale));
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
