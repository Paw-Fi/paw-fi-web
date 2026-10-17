import {
  createEmailTranslator,
  localizedEmailTemplate,
} from "./automated-email-localization.ts";
import { escapeHtml, sanitizeSubject } from "./email-utils.ts";

interface TicketClosedEmailData {
  fullName?: string | null;
  message: string;
}

export const buildTicketClosedEmail = localizedEmailTemplate<
  TicketClosedEmailData
>((ticket, language) => {
  const { t, locale } = createEmailTranslator(language);
  const firstName = ticket.fullName?.trim().split(/\s+/)[0] || t("there");
  const escapedMessage = escapeHtml(ticket.message);
  const subject = sanitizeSubject(t("Update on your request – Moneko"));

  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="${locale}"${locale === "ur" ? ' dir="rtl"' : ""}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:40px 20px; background:#f7f7fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing:antialiased; color:#111827; line-height:1.6;">

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px; margin:0 auto;">

    <tr>
      <td style="text-align:center; padding:24px 0;">
        <img src="https://moneko.io/logo192.png" alt="${
      escapeHtml(t("Moneko Logo"))
    }" width="72" height="72" style="display:block; margin:0 auto 18px;"/>
        <h1 style="margin:0; font-weight:300; font-size:26px; line-height:1.15; color:#111827;">${
      escapeHtml(t("We have got this sorted"))
    }</h1>
      </td>
    </tr>

    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff; border-radius:28px; box-shadow:0 8px 24px rgba(17,24,39,0.06); padding:32px;">
          <tr>
            <td>

              <p style="margin:0 0 18px; font-size:16px;">${
      escapeHtml(t`Hi ${firstName},`)
    }</p>

              <p style="margin:0 0 20px; font-size:15px; color:#374151; line-height:1.6;">
                ${
      escapeHtml(
        t("We’ve looked into it and made the necessary updates on our side."),
      )
    }
              </p>

              <p style="margin:0 0 20px; font-size:15px; color:#374151; line-height:1.6;">
                ${
      escapeHtml(
        t("Everything should now be sorted. Please update the app to check it out."),
      )
    }
              </p>

              <div style="margin:24px 0; padding:16px; border:1px solid #e5e7eb; border-radius:20px; background:#f9fafb;">
                <p style="margin:0 0 8px; font-size:12px; letter-spacing:1px; font-weight:700; text-transform:uppercase; color:#6b7280;">${
      escapeHtml(t("Your original message"))
    }</p>
                <p style="margin:0; font-size:15px; color:#374151; white-space:pre-wrap;">${escapedMessage}</p>
              </div>

              <p style="margin:0 0 10px; font-size:15px; color:#374151;">
                ${
      escapeHtml(
        t("If you still notice anything unusual or have any other thoughts to share, feel free to reply to this email — we’re always happy to hear from you."),
      )
    }
              </p>

              <p style="margin:20px 0 0; font-size:15px;">
                <strong>${escapeHtml(t("Moneko Team"))}</strong><br/>
                <span style="color:#6b7280; font-size:14px;">hello@moneko.io</span>
              </p>

            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="text-align:center; padding:18px 8px;">
        <hr style="border:none; border-top:1px solid rgba(17,24,39,0.06); margin:0 0 16px;" />
        <p style="margin:0 0 20px; font-size:13px;">
          <a href="https://www.instagram.com/moneko_ai" style="color:#7458FF; text-decoration:none;">Instagram</a> &nbsp;•&nbsp;
          <a href="https://x.com/moneko_ai" style="color:#7458FF; text-decoration:none;">X</a> &nbsp;•&nbsp;
          <a href="https://www.facebook.com/monekoai/" style="color:#7458FF; text-decoration:none;">Facebook</a>
        </p>
        <p style="margin:0; font-size:12px; color:#6b7280;">
          ${escapeHtml(t("© 2026 Moneko AI. All rights reserved."))}
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`,
    text: [
      t`Hi ${firstName},`,
      "",
      t("We’ve looked into it and made the necessary updates on our side."),
      "",
      t("Everything should now be sorted. Please update the app to check it out."),
      "",
      t("Your original message:"),
      ticket.message,
      "",
      t("If you still notice anything unusual or have any other thoughts to share, feel free to reply to this email — we’re always happy to hear from you."),
      "",
      t("Moneko Team"),
    ].join("\n"),
  };
});
