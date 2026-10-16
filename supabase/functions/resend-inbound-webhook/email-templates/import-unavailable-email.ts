import {
  type LocalizedEmailContent,
  withEmailLocalization,
} from "../../shared/automated-email-localization.ts";
import { createEmailTranslator } from "../../shared/automated-email-localization.ts";
import {
  baseTemplate,
  renderButton,
  renderFooter,
} from "../../shared/email-layout.ts";
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
  return (
    params: ImportUnavailableEmailParams,
    language = "en",
  ): LocalizedEmailContent => {
    const { t, h } = createEmailTranslator(language);
    const content = resolveContent(
      params.reason,
      config.importInboxEmail,
      language,
    );
    const actionLink = content.actionUrl
      ? h`<p><a href="${
        escapeHtml(content.actionUrl)
      }" style="color:#7458FF;">${
        escapeHtml(
          content.actionLabel || content.action,
        )
      }</a></p>`
      : "";
    const sender = escapeHtml(params.senderEmail);
    const senderSetupLink =
      params.reason === importUnavailableReasons.senderNotWhitelisted
        ? `moneko://add-email-sender?email=${
          encodeURIComponent(params.senderEmail)
        }`
        : null;
    const senderSetupButton = senderSetupLink
      ? renderButton(t("Add This Sender"), senderSetupLink)
      : "";

    return withEmailLocalization({
      subject: sanitizeSubject(content.subject),
      html: baseTemplate(
        h`<h1 class="title">${escapeHtml(content.heading)}</h1>
        <p class="subtitle">We couldn't process the email sent from ${sender}.</p>
        <p>${escapeHtml(content.message)}</p>
        <p>${escapeHtml(content.action)}</p>
        ${senderSetupButton}
        ${actionLink}
        <p>This address does not monitor replies. If you need help, contact <a href="mailto:${
          escapeHtml(
            config.supportEmail,
          )
        }" style="color:#7458FF;">${escapeHtml(config.supportEmail)}</a>.</p>`,
        renderFooter({
          customReason:
            t`You're receiving this email because someone sent files to ${config.importInboxEmail}. Replies are not monitored; contact ${config.supportEmail} if you need help.`,
        }, language),
        language,
      ),
      text:
        t`${content.heading}. We couldn't process the email sent from ${params.senderEmail}. ${content.message} ${content.action} ${
          content.actionUrl
            ? `${content.actionLabel || content.action}: ${content.actionUrl}`
            : ""
        } ${
          senderSetupLink ? t`Add This Sender: ${senderSetupLink}.` : ""
        } Replies are not monitored; contact ${config.supportEmail} if you need help.`,
    }, (locale) => createImportUnavailableEmailBuilder(config)(params, locale));
  };
}

function resolveContent(
  reason: ImportUnavailableReason,
  importInboxEmail: string,
  language = "en",
): ImportUnavailableEmailContent {
  const { t } = createEmailTranslator(language);

  switch (reason) {
    case importUnavailableReasons.senderNotWhitelisted:
      return {
        subject: t("Allow this sender for Moneko email import"),
        heading: t("Allow this sender to import emails"),
        message: t(
          "This sender email is not on your Email File Import allowlist.",
        ),
        action: t(
          "Tap Add This Sender to open Moneko and confirm adding this address to your signed-in Moneko account. Open the verification email we send to this address, then forward your attachment again. The earlier email will not be imported automatically. If the button does not open the app, go to Settings and add this sender to Email File Import.",
        ),
        actionUrl: HELP_URL,
        actionLabel: t("Learn how to allow a sender"),
      };
    case importUnavailableReasons.importDisabled:
      return {
        subject: t("Enable Moneko email import to continue"),
        heading: t("Email File Import is turned off"),
        message: t("Email File Import is currently disabled for this account."),
        action: t("Open Moneko, go to Settings, and enable Email File Import."),
        actionUrl: HELP_URL,
        actionLabel: t("Learn how to enable email import"),
      };
    case importUnavailableReasons.subscriptionRequired:
      return {
        subject: t("Moneko Plus is required for email import"),
        heading: t("Email File Import requires Moneko Plus"),
        message: t(
          "Your account needs an active Moneko Plus subscription to import files or receipt emails by email.",
        ),
        action: t("Subscribe to Moneko Plus to continue importing emails."),
        actionUrl: PRICING_URL,
        actionLabel: t("View Moneko Plus plans"),
      };
    case importUnavailableReasons.senderNotVerified:
      return {
        subject: t("Moneko could not verify this email sender"),
        heading: t("We could not verify this email sender"),
        message: t(
          "This email did not pass our sender authentication checks, so we did not process it.",
        ),
        action: t(
          "Forward the original receipt or file from a verified sender, then try again.",
        ),
      };
    case importUnavailableReasons.noSupportedContent:
      return {
        subject: t("Moneko could not find importable content"),
        heading: t("No importable content was found"),
        message: t(
          "We could not find readable receipt content or a supported PDF, CSV, or Excel attachment in this email.",
        ),
        action:
          t`Forward a receipt email or send a supported file to ${importInboxEmail}, then try again.`,
        actionUrl: HELP_URL,
        actionLabel: t("Learn what you can import"),
      };
  }
}
