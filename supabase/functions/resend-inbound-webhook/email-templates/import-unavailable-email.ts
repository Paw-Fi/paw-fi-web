import { baseTemplate, renderFooter } from "../../shared/email-layout.ts";
import { escapeHtml, sanitizeSubject } from "../../shared/email-utils.ts";

const HELP_URL =
  "https://moneko.io/help/how-to-track-email-receipts-and-online-purchases";
const PRICING_URL = "https://moneko.io/pricing";

export const importUnavailableReasons = {
  senderNotWhitelisted: "sender_not_whitelisted",
  importDisabled: "import_disabled",
  subscriptionRequired: "subscription_required",
  senderNotVerified: "sender_not_verified",
  noSupportedContent: "no_supported_content",
} as const;

export type ImportUnavailableReason =
  (typeof importUnavailableReasons)[keyof typeof importUnavailableReasons];

interface ImportUnavailableEmailConfig {
  importInboxEmail: string;
  supportEmail: string;
}

interface ImportUnavailableEmailParams {
  senderEmail: string;
  reason: ImportUnavailableReason;
}

interface ImportUnavailableEmailContent {
  subject: string;
  heading: string;
  message: string;
  action: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function createImportUnavailableEmailBuilder(
  config: ImportUnavailableEmailConfig,
) {
  return (params: ImportUnavailableEmailParams) => {
    const content = resolveContent(params.reason, config.importInboxEmail);
    const actionLink = content.actionUrl
      ? `<p><a href="${escapeHtml(content.actionUrl)}" style="color:#7458FF;">${
        escapeHtml(
          content.actionLabel || content.action,
        )
      }</a></p>`
      : "";
    const sender = escapeHtml(params.senderEmail);

    return {
      subject: sanitizeSubject(content.subject),
      html: baseTemplate(
        `<h1 class="title">${escapeHtml(content.heading)}</h1>
        <p class="subtitle">We couldn't process the email sent from ${sender}.</p>
        <p>${escapeHtml(content.message)}</p>
        <p>${escapeHtml(content.action)}</p>
        ${actionLink}
        <p>This address does not monitor replies. If you need help, contact <a href="mailto:${
          escapeHtml(
            config.supportEmail,
          )
        }" style="color:#7458FF;">${escapeHtml(config.supportEmail)}</a>.</p>`,
        renderFooter({
          customReason:
            `You're receiving this email because someone sent files to ${config.importInboxEmail}. Replies are not monitored; contact ${config.supportEmail} if you need help.`,
        }),
      ),
      text:
        `${content.heading}. We couldn't process the email sent from ${params.senderEmail}. ${content.message} ${content.action} ${
          content.actionUrl
            ? `${content.actionLabel || content.action}: ${content.actionUrl}`
            : ""
        } Replies are not monitored; contact ${config.supportEmail} if you need help.`,
    };
  };
}

function resolveContent(
  reason: ImportUnavailableReason,
  importInboxEmail: string,
): ImportUnavailableEmailContent {
  switch (reason) {
    case importUnavailableReasons.senderNotWhitelisted:
      return {
        subject: "Allow this sender for Moneko email import",
        heading: "Allow this sender to import emails",
        message:
          "This sender email is not on your Email File Import allowlist.",
        action:
          "Open Moneko, go to Settings, and add this sender to Email File Import.",
        actionUrl: HELP_URL,
        actionLabel: "Learn how to allow a sender",
      };
    case importUnavailableReasons.importDisabled:
      return {
        subject: "Enable Moneko email import to continue",
        heading: "Email File Import is turned off",
        message: "Email File Import is currently disabled for this account.",
        action: "Open Moneko, go to Settings, and enable Email File Import.",
        actionUrl: HELP_URL,
        actionLabel: "Learn how to enable email import",
      };
    case importUnavailableReasons.subscriptionRequired:
      return {
        subject: "Moneko Plus is required for email import",
        heading: "Email File Import requires Moneko Plus",
        message:
          "Your account needs an active Moneko Plus subscription to import files or receipt emails by email.",
        action: "Subscribe to Moneko Plus to continue importing emails.",
        actionUrl: PRICING_URL,
        actionLabel: "View Moneko Plus plans",
      };
    case importUnavailableReasons.senderNotVerified:
      return {
        subject: "Moneko could not verify this email sender",
        heading: "We could not verify this email sender",
        message:
          "This email did not pass our sender authentication checks, so we did not process it.",
        action:
          "Forward the original receipt or file from a verified sender, then try again.",
      };
    case importUnavailableReasons.noSupportedContent:
      return {
        subject: "Moneko could not find importable content",
        heading: "No importable content was found",
        message:
          "We could not find readable receipt content or a supported PDF, CSV, or Excel attachment in this email.",
        action:
          `Forward a receipt email or send a supported file to ${importInboxEmail}, then try again.`,
        actionUrl: HELP_URL,
        actionLabel: "Learn what you can import",
      };
  }
}
