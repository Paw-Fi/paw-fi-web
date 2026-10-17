import { localizedPluralize } from "./automated-email-localization.ts";
import {
  createEmailTranslator,
  localizedEmailTemplate,
} from "./automated-email-localization.ts";
// Email templates for Moneko
import {
  baseTemplate,
  mobileDownloadCtasHtml,
  renderButton,
  renderFooter,
} from "./email-layout.ts";
import { htmlToText } from "./email-html-to-text.ts";
import {
  escapeHtml,
  formatCurrency,
  formatDate,
  sanitizeSubject,
} from "./email-utils.ts";
import { LINKS, sanitizeUrl } from "./email-security.ts";

function renderGreeting(name?: string, language = "en"): string {
  const { t } = createEmailTranslator(language);

  const trimmedName = name?.trim();
  return trimmedName ? t`Hi ${escapeHtml(trimmedName)},` : t("Hi,");
}

// Subscription created email template
export const subscriptionCreatedTemplate = localizedEmailTemplate((data: {
  name: string;
  planName: string;
  endDate?: string; // Optional for Lifetime (no renewal)
  dashboardUrl: string;
  isLifetime?: boolean;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const subscriptionMessage = data.isLifetime
    ? t(
      "Your Moneko Plus Lifetime access is now active, with no recurring subscription charges.",
    )
    : data.endDate
    ? t`Your subscription is now active and is scheduled to renew on ${
      formatDate(
        data.endDate,
        language,
      )
    }.`
    : t("Your Moneko Plus subscription is now active.");
  const accessTitle = data.isLifetime
    ? t("Welcome to Moneko Plus Lifetime")
    : t("Welcome to Moneko Plus");

  const content = h`
    <h1 class="title">${accessTitle}</h1>
    <p class="subtitle">Thank you for joining Moneko. ${
    escapeHtml(
      subscriptionMessage,
    )
  }</p>
    <p>You can now use WhatsApp Capture, Email Receipt Capture, advanced budgeting tools, and Bank Sync where supported. A great way to get started is to log your next expense in Moneko.</p>
    ${renderButton(t("Open Moneko"), sanitizeUrl(LINKS.appHome))}
    ${mobileDownloadCtasHtml(language)}
    <p>If you have any questions, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because you subscribed to Moneko.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(accessTitle),
  };
});

// Subscription updated email template
export const subscriptionUpdatedTemplate = localizedEmailTemplate((data: {
  name: string;
  planName: string;
  endDate: string;
  dashboardUrl: string;
  changeType: "upgrade" | "downgrade" | "renewal" | "interval_changed";
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const title = data.changeType === "upgrade"
    ? t("Welcome to Moneko Plus")
    : data.changeType === "downgrade"
    ? t("Your Moneko Plan Has Changed")
    : data.changeType === "interval_changed"
    ? t("Your Billing Schedule Has Changed")
    : t("Your Moneko Subscription Has Renewed");

  const subtitle = data.changeType === "upgrade"
    ? t("Your upgrade is complete.")
    : data.changeType === "downgrade"
    ? t("Your Moneko Plus access has ended.")
    : data.changeType === "interval_changed"
    ? t("Your billing schedule has changed.")
    : t("Your subscription has renewed.");

  const valueMessage = data.changeType === "upgrade"
    ? t(
      "You now have access to WhatsApp Capture, Email Receipt Capture, advanced budgeting tools, and Bank Sync where supported.",
    )
    : data.changeType === "downgrade"
    ? t(
      "Your Moneko Plus access has ended, but you can continue tracking and managing your finances with Moneko Free.",
    )
    : data.changeType === "interval_changed"
    ? t`Your updated billing schedule is now in effect. Your Moneko access continues through ${
      formatDate(
        data.endDate,
        language,
      )
    }.`
    : t`Your Moneko Plus access continues through ${
      formatDate(data.endDate, language)
    }.`;

  const content = h`
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    <p>${escapeHtml(valueMessage)}</p>
    ${renderButton(t("Manage Subscription"), sanitizeUrl(LINKS.membership))}
    ${mobileDownloadCtasHtml(language)}
    <p>If you have any questions, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because your subscription was updated.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(title),
  };
});

// Subscription cancelled email template
export const subscriptionCanceledTemplate = localizedEmailTemplate((data: {
  name: string;
  planName: string;
  endDate: string | null;
  dashboardUrl: string;
  immediateCancel: boolean;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const title = data.immediateCancel
    ? t("Your Moneko Plus Access Has Ended")
    : t("Your Moneko Plus Cancellation Is Confirmed");
  let subtitle;

  if (data.immediateCancel) {
    subtitle = t(
      "Your Moneko Plus access is no longer active, but you can continue using Moneko Free.",
    );
  } else {
    subtitle = data.endDate
      ? t`You’ll continue to have access to all Moneko Plus features until ${
        formatDate(
          data.endDate,
          language,
        )
      }.`
      : t(
        "You’ll continue to have access to Moneko Plus until the end of your current billing period.",
      );
  }

  const content = h`
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    ${
    renderButton(
      data.immediateCancel ? t("View Plans") : t("Open Moneko"),
      sanitizeUrl(data.immediateCancel ? LINKS.pricing : LINKS.appHome),
    )
  }
    ${mobileDownloadCtasHtml(language)}
    <p>If you’re open to sharing, just reply and let us know what Moneko was missing or what we could have done better. Even a short response would be really helpful.</p>
    <p>Thank you for giving Moneko a try.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because your subscription was cancelled.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(title),
  };
});

export const subscriptionPausedTemplate = localizedEmailTemplate(
  (data: { name: string }, language) => {
    const { t, h } = createEmailTranslator(language);

    const content = h`
    <h1 class="title">Your Moneko Plus Access Is Paused</h1>
    <p>${renderGreeting(data.name, language)}</p>
    <p class="subtitle">Your trial ended without a payment method, so your Moneko Plus access is now paused.</p>
    <p>Add a payment method from your membership settings to resume your subscription.</p>
    ${renderButton(t("Manage Subscription"), sanitizeUrl(LINKS.membership))}
    <p>If you need help, reply to this email and our support team will assist you.</p>
    <p>The Moneko Team</p>
  `;

    return {
      html: baseTemplate(
        content,
        renderFooter({
          customReason: t(
            "You're receiving this email because your Moneko Plus subscription was paused.",
          ),
        }, language),
        language,
      ),
      text: htmlToText(content),
      subject: sanitizeSubject(t("Your Moneko Plus Access Is Paused")),
    };
  },
);

export const subscriptionResumedTemplate = localizedEmailTemplate(
  (data: { name: string }, language) => {
    const { t, h } = createEmailTranslator(language);

    const content = h`
    <h1 class="title">Your Moneko Plus Access Has Resumed</h1>
    <p>${renderGreeting(data.name, language)}</p>
    <p class="subtitle">Your subscription is active again and your Moneko Plus access has been restored.</p>
    ${renderButton(t("Open Moneko"), sanitizeUrl(LINKS.appHome))}
    ${mobileDownloadCtasHtml(language)}
    <p>If you have any questions, reply to this email and our support team will help you.</p>
    <p>The Moneko Team</p>
  `;

    return {
      html: baseTemplate(
        content,
        renderFooter({
          customReason: t(
            "You're receiving this email because your Moneko Plus subscription resumed.",
          ),
        }, language),
        language,
      ),
      text: htmlToText(content),
      subject: sanitizeSubject(t("Your Moneko Plus Access Has Resumed")),
    };
  },
);

export const refundProcessedTemplate = localizedEmailTemplate((data: {
  name: string;
  amount: number;
  currency: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const content = h`
    <h1 class="title">Your Refund Has Been Processed</h1>
    <p>${renderGreeting(data.name, language)}</p>
    <p class="subtitle">We have processed your refund of ${
    formatCurrency(
      data.amount,
      data.currency,
      language,
    )
  }.</p>
    <p>The funds will be returned to your original payment method. Most refunds appear within 5-10 business days, depending on your bank or card provider.</p>
    <p>If the refund has not appeared after 10 business days, reply to this email and our support team will help you.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because a Moneko payment was refunded.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t("Your Moneko Refund Has Been Processed")),
  };
});

export const refundFailedTemplate = localizedEmailTemplate((data: {
  name: string;
  amount: number;
  currency: string;
  failureReason?: string | null;
  accessRestored?: boolean;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const content = h`
    <h1 class="title">We Couldn’t Complete Your Refund</h1>
    <p>${renderGreeting(data.name, language)}</p>
    <p class="subtitle">Your refund of ${
    formatCurrency(
      data.amount,
      data.currency,
      language,
    )
  } could not be completed.</p>
    ${
    data.failureReason
      ? h`<p><strong>Reason:</strong> ${escapeHtml(data.failureReason)}</p>`
      : ""
  }
    ${
    data.accessRestored
      ? h(
        "<p>Your Moneko Plus Lifetime access has been restored because the refund did not complete.</p>",
      )
      : ""
  }
    <p>Please reply to this email so our support team can arrange another way to return the funds.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because a Moneko refund could not be completed.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t("Action Needed for Your Moneko Refund")),
  };
});

// Payment failed template
export const paymentFailedTemplate = localizedEmailTemplate((data: {
  name: string;
  planName: string;
  dashboardUrl: string;
  updatePaymentUrl?: string;
  failureReason?: string;
  isDowngraded?: boolean;
  resubscribeUrl?: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const isDowngraded = Boolean(data.isDowngraded);
  const paymentActionUrl = isDowngraded
    ? (data.resubscribeUrl ?? data.updatePaymentUrl ?? LINKS.membership)
    : (data.updatePaymentUrl ?? LINKS.membership);
  const paymentActionText = isDowngraded
    ? t("Reactivate Moneko Plus")
    : t("Update Payment Details");

  const content = h`
    <h1 class="title">We Couldn’t Process Your Moneko Payment</h1>
    <p class="subtitle">We couldn’t process your latest payment for ${
    escapeHtml(
      data.planName,
    )
  }.</p>
    ${
    data.failureReason
      ? h`<p>Reason: ${escapeHtml(data.failureReason)}</p>`
      : ""
  }
    ${
    isDowngraded
      ? h`<p>Your Moneko Plus access has ended, but you can continue using Moneko Free. Update your payment details to reactivate Moneko Plus.</p>`
      : h`<p>Please update your payment details to keep your Moneko Plus access active.</p>`
  }
    ${renderButton(paymentActionText, sanitizeUrl(paymentActionUrl))}
    <p>If you believe this is an error, please contact our support team for assistance.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because your subscription payment failed.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t("We Couldn’t Process Your Moneko Payment")),
  };
});

// Trial ending email template
export const trialEndingTemplate = localizedEmailTemplate((data: {
  name: string;
  planName: string;
  trialEndDate: string;
  dashboardUrl: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const content = h`
    <h1 class="title">Your Moneko Plus Trial Ends Soon</h1>
    <p class="subtitle">Your ${escapeHtml(data.planName)} trial will end on ${
    formatDate(
      data.trialEndDate,
      language,
    )
  }.</p>
    <p>Choose a plan before your trial ends to continue using Moneko Plus without interruption.</p>
    ${renderButton(t("Choose a Plan"), sanitizeUrl(LINKS.membership))}
    <p>If you have any questions, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because your free trial is ending soon.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t("Your Moneko Plus Trial Ends Soon")),
  };
});

// Referral accepted email template (to referrer)
export const referralAcceptedTemplate = localizedEmailTemplate((data: {
  referrerName: string;
  refereeName: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const content = h`
    <h1 class="title">Your Friend Joined Moneko Through Your Referral</h1>
    <p class="subtitle">${renderGreeting(data.referrerName, language)} ${
    data.refereeName
      ? t`${
        escapeHtml(
          data.refereeName,
        )
      } completed their purchase through your referral link.`
      : t("Your friend completed their purchase through your referral link.")
  }</p>
    <p>Thanks for recommending Moneko. Your referral helped them receive 50% off Moneko Plus Lifetime.</p>
    ${mobileDownloadCtasHtml(language)}
    <p>Keep sharing your link to help more people discover Moneko and claim the discounted lifetime offer.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because your friend completed a purchase through your Moneko referral link.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      t("Your Friend Joined Moneko Through Your Referral"),
    ),
  };
});

// Referral successful email template (to referee)
export const referralSuccessfulTemplate = localizedEmailTemplate((data: {
  name: string;
  referrerName: string;
  dashboardUrl: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const content = h`
    <h1 class="title">Welcome to Moneko Plus Lifetime</h1>
    <p class="subtitle">${
    renderGreeting(
      data.name,
      language,
    )
  } Your referral purchase is complete.</p>
    <p>Your Moneko Plus Lifetime access is now active, with no recurring subscription charges. Thanks to ${
    escapeHtml(
      data.referrerName,
    )
  } for inviting you.</p>
    ${renderButton(t("Open Moneko"), sanitizeUrl(LINKS.appHome))}
    ${mobileDownloadCtasHtml(language)}
    <p>If you have any questions getting started, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because you completed a Moneko Plus Lifetime purchase through a referral invitation.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t("Welcome to Moneko Plus Lifetime")),
  };
});

// Welcome email template for newly verified users
export const welcomeTemplate = localizedEmailTemplate((data: {
  name: string;
  email: string;
  appUrl: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const greeting = renderGreeting(data.name, language);
  const content = h`
    <h1 class="title">Welcome to Moneko! 🎉</h1>
    <p class="subtitle">${greeting} Your account is all set up and ready to go!</p>
    <p>Thank you for verifying your email address. Moneko brings your spending, budgets, and financial insights into one place.</p>
    <p>A great way to get started is to log your first expense and explore how Moneko organizes your spending automatically.</p>
    <p>You can track expenses manually, through WhatsApp, or by forwarding receipt emails after setting up Email Receipt Capture.</p>
    ${renderButton(t("Open Moneko"), sanitizeUrl(data.appUrl))}
    ${mobileDownloadCtasHtml(language)}
    <p>If you have any questions getting started, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because you successfully verified your Moneko account.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t("Welcome to Moneko!")),
  };
});

// Household invite email template
export const householdInviteTemplate = localizedEmailTemplate((data: {
  inviteUrl: string;
  personalMessage?: string;
  householdName?: string;
  inviterName?: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const inviter = data.inviterName?.trim();
  const household = data.householdName?.trim();
  const title = inviter && household
    ? t`${inviter} invited you to ${household}`
    : inviter
    ? t`${inviter} invited you to a shared space`
    : household
    ? t`You are invited to ${household}`
    : t("You are invited to join a shared space");
  const subtitle = household
    ? t`Join ${household} on Moneko to manage shared expenses and budgets together.`
    : t(
      "Join your shared space on Moneko to manage expenses and budgets together.",
    );
  const safeMessage = data.personalMessage?.trim();

  const content = h`
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    ${
    safeMessage
      ? h`<p><strong>Personal message:</strong></p><p>${
        escapeHtml(
          safeMessage,
        )
      }</p>`
      : ""
  }
    <p>Click the button below to accept your invitation.</p>
    ${renderButton(t("Accept Invitation"), sanitizeUrl(data.inviteUrl))}
    <p>If you did not expect this email, you can safely ignore it.</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because you were invited to join a Moneko space.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      inviter && household
        ? t`${inviter} invited you to ${household} on Moneko`
        : inviter
        ? t`${inviter} invited you to a space on Moneko`
        : household
        ? t`Invitation to join ${household} on Moneko`
        : t("Invitation to join a space on Moneko"),
    ),
  };
});

// Course completion template
export const courseCompletionTemplate = localizedEmailTemplate((data: {
  name: string;
  courseName: string;
  completionDate: string;
  certificateUrl?: string;
  nextCourseUrl?: string;
  dashboardUrl: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const content = h`
    <h1 class="title">Congratulations on Completing Your Course</h1>
    <p class="subtitle">${
    renderGreeting(
      data.name,
      language,
    )
  } You successfully completed the <strong>${
    escapeHtml(
      data.courseName,
    )
  }</strong> course on ${formatDate(data.completionDate, language)}.</p>
    <p>Thank you for taking another step in building your financial knowledge.</p>
    ${
    data.certificateUrl
      ? renderButton(
        t("Download Certificate"),
        sanitizeUrl(data.certificateUrl),
      )
      : ""
  }
    ${
    data.nextCourseUrl
      ? h`<p>Ready for your next challenge? <a href="${
        sanitizeUrl(
          data.nextCourseUrl,
        )
      }">Check out recommended courses</a> to continue your learning journey.</p>`
      : ""
  }
    ${mobileDownloadCtasHtml(language)}
    <p>Keep up the great work.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because you completed a course.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t`You Completed ${data.courseName}`),
  };
});

// Invoice finalized template (invoice ready for payment or viewing)
export const invoiceFinalizedTemplate = localizedEmailTemplate((data: {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  invoiceUrl: string;
  invoicePdfUrl?: string;
  dueDate?: string;
  dashboardUrl: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const content = h`
    <h1 class="title">Your Invoice Is Ready</h1>
    <p class="subtitle">A new invoice for ${
    escapeHtml(
      data.planName,
    )
  } is ready to view.</p>
    <p><strong>Amount:</strong> ${
    formatCurrency(
      data.amount,
      data.currency,
      language,
    )
  }</p>
    ${
    data.dueDate
      ? h`<p><strong>Due Date:</strong> ${
        formatDate(data.dueDate, language)
      }</p>`
      : ""
  }
    ${renderButton(t("View Invoice"), sanitizeUrl(data.invoiceUrl))}
    ${
    data.invoicePdfUrl
      ? h`<p>You can also <a href="${
        sanitizeUrl(
          data.invoicePdfUrl,
        )
      }">download the PDF version</a>.</p>`
      : ""
  }
    ${
    data.dueDate
      ? h(
        "<p>Please review the invoice and complete payment by the due date if needed.</p>",
      )
      : h(
        "<p>If you have automatic payments enabled, your payment method will be charged automatically.</p>",
      )
  }
    <p>If you have any questions about this invoice, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because an invoice is ready for your subscription.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t("Your Moneko Invoice Is Ready")),
  };
});

export const invoiceLocationRequiredTemplate = localizedEmailTemplate(
  (data: { name: string }, language) => {
    const { t, h } = createEmailTranslator(language);

    const content = h`
    <h1 class="title">Billing Information Needed</h1>
    <p>${renderGreeting(data.name, language)}</p>
    <p class="subtitle">We couldn’t prepare your Moneko invoice because your billing location is missing or incomplete.</p>
    <p>Please update your billing details so Stripe can calculate the required tax and complete your invoice.</p>
    ${renderButton(t("Update Billing Details"), sanitizeUrl(LINKS.membership))}
    <p>If you need help, reply to this email and our support team will assist you.</p>
    <p>The Moneko Team</p>
  `;

    return {
      html: baseTemplate(
        content,
        renderFooter({
          customReason: t(
            "You're receiving this email because your Moneko invoice needs updated billing information.",
          ),
        }, language),
        language,
      ),
      text: htmlToText(content),
      subject: sanitizeSubject(t("Update Your Billing Information")),
    };
  },
);

// Invoice upcoming template (renewal reminder)
export const invoiceUpcomingTemplate = localizedEmailTemplate((data: {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  chargeDate: string;
  daysUntil: number;
  dashboardUrl: string;
  updatePaymentUrl?: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const shouldShowPaymentUpdate = Boolean(
    data.updatePaymentUrl && data.daysUntil <= 7,
  );
  const actionUrl = shouldShowPaymentUpdate
    ? data.updatePaymentUrl!
    : LINKS.membership;
  const actionText = shouldShowPaymentUpdate
    ? t("Update Payment Method")
    : t("Manage Subscription");

  const content = h`
    <h1 class="title">Upcoming Subscription Renewal</h1>
    <p class="subtitle">Your ${
    escapeHtml(
      data.planName,
    )
  } subscription is scheduled to renew on ${
    formatDate(data.chargeDate, language)
  }.</p>
    <p><strong>Amount:</strong> ${
    formatCurrency(
      data.amount,
      data.currency,
      language,
    )
  }</p>
    <p><strong>Renewal Date:</strong> ${
    formatDate(data.chargeDate, language)
  }</p>
    <p>Your subscription is scheduled to renew on this date. The payment method on file will be charged.</p>
    ${
    shouldShowPaymentUpdate
      ? h(
        "<p>Please ensure your payment method is up to date to avoid any interruption in service.</p>",
      )
      : ""
  }
    ${renderButton(actionText, sanitizeUrl(actionUrl))}
    <p>If you want to make changes to your subscription or cancel, please do so before the renewal date.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because your subscription is renewing soon.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      t`Your ${data.planName} Subscription Renews on ${
        formatDate(
          data.chargeDate,
          language,
        )
      }`,
    ),
  };
});

// Payment action required template (3DS authentication needed)
export const paymentActionRequiredTemplate = localizedEmailTemplate((data: {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  authenticationUrl: string;
  expiryHours?: number;
  dashboardUrl: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const expiryText = data.expiryHours
    ? t`Please complete this additional security check within ${data.expiryHours} ${
      localizedPluralize(
        data.expiryHours,
        "hour",
        undefined,
        language,
      )
    } to avoid subscription interruption.`
    : "";

  const content = h`
    <h1 class="title">Verify Your Moneko Payment</h1>
    <p class="subtitle">Your bank requires additional verification before we can complete your ${
    escapeHtml(
      data.planName,
    )
  } payment.</p>
    <p><strong>Amount:</strong> ${
    formatCurrency(
      data.amount,
      data.currency,
      language,
    )
  }</p>
    <p>Your bank requires an additional security check to complete this payment.</p>
    ${
    renderButton(t("Authenticate Payment"), sanitizeUrl(data.authenticationUrl))
  }
    ${expiryText ? h`<p>${escapeHtml(expiryText)}</p>` : ""}
    <p>This additional verification helps protect your payment.</p>
    <p>If you don't recognize this charge, please <a href="${
    sanitizeUrl(
      LINKS.membership,
    )
  }">review your subscription</a> immediately.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because payment authentication is required.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t("Verify Your Moneko Payment")),
  };
});

// Payment method updated confirmation template
export const paymentMethodUpdatedTemplate = localizedEmailTemplate((data: {
  name: string;
  paymentMethodType: string;
  paymentMethodDetails?: string;
  dashboardUrl: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const content = h`
    <h1 class="title">Your Payment Method Was Updated</h1>
    <p class="subtitle">Your new payment method will be used for future Moneko subscription payments.</p>
    <p><strong>Payment Method:</strong> ${
    escapeHtml(
      data.paymentMethodType,
    )
  }</p>
    ${
    data.paymentMethodDetails
      ? h`<p><strong>Details:</strong> ${
        escapeHtml(
          data.paymentMethodDetails,
        )
      }</p>`
      : ""
  }
    ${renderButton(t("Manage Payment Methods"), sanitizeUrl(LINKS.membership))}
    <p>If you didn't make this change, please contact our support team immediately.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because your payment method was updated.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(t("Your Moneko Payment Method Was Updated")),
  };
});

// Discount expiring template
export const discountExpiringTemplate = localizedEmailTemplate((data: {
  name: string;
  discountPercent: number;
  expiryDate: string;
  daysUntil: number;
  dashboardUrl: string;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const content = h`
    <h1 class="title">Your Moneko Discount Expires Soon</h1>
    <p class="subtitle">Your ${data.discountPercent}% promotional discount expires on ${
    formatDate(
      data.expiryDate,
      language,
    )
  }.</p>
    <p>Complete your Moneko Plus subscription before this date to use the discounted price.</p>
    <p><strong>Discount Amount:</strong> ${data.discountPercent}% off</p>
    <p><strong>Expires:</strong> ${formatDate(data.expiryDate, language)}</p>
    ${renderButton(t("Use My Discount"), sanitizeUrl(LINKS.membership))}
    <p>Your promotional pricing will no longer be available after this date.</p>
    <p>Thank you for being part of Moneko.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because your promotional discount is expiring.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      t`Your Moneko Discount Expires on ${
        formatDate(data.expiryDate, language)
      }`,
    ),
  };
});

// Invoice payment succeeded template (payment receipt with invoice PDF)
export const invoicePaymentSucceededTemplate = localizedEmailTemplate((data: {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  paymentDate: string;
  invoiceUrl: string;
  invoicePdfUrl?: string;
  dashboardUrl: string;
  isRenewal?: boolean;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const title = data.isRenewal
    ? t("Your Subscription Renewal Payment Was Successful")
    : t("Payment Received — Thank You");
  const content = h`
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">We've successfully received your payment for ${
    escapeHtml(
      data.planName,
    )
  }.</p>
    <p><strong>Invoice Number:</strong> ${escapeHtml(data.invoiceNumber)}</p>
    <p><strong>Amount Paid:</strong> ${
    formatCurrency(
      data.amount,
      data.currency,
      language,
    )
  }</p>
    <p><strong>Payment Date:</strong> ${
    formatDate(data.paymentDate, language)
  }</p>
    ${renderButton(t("View Invoice"), sanitizeUrl(data.invoiceUrl))}
    ${
    data.invoicePdfUrl
      ? h`<p>You can also <a href="${
        sanitizeUrl(
          data.invoicePdfUrl,
        )
      }">download the invoice PDF</a> for your records.</p>`
      : ""
  }
    <p>This receipt confirms that your payment was processed successfully. Your subscription remains active, and your current plan access continues.</p>
    <p><a href="${sanitizeUrl(LINKS.membership)}">Manage Subscription</a></p>
    <p>If you have any questions about this payment, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because your payment was processed successfully.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      data.isRenewal
        ? t`Renewal Payment Successful — ${data.planName}`
        : t`Payment Received — ${data.planName}`,
    ),
  };
});

export const notificationTemplate = localizedEmailTemplate((data: {
  name: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  supportingMessage?: string;
  subject?: string;
  preheader?: string;
  priority?: "low" | "medium" | "high";
  localizedCopy?: (language: string) => Partial<{
    title: string;
    message: string;
    actionUrl: string;
    actionText: string;
    supportingMessage: string;
    subject: string;
    preheader: string;
    priority: "low" | "medium" | "high";
  }>;
}, language) => {
  const { h } = createEmailTranslator(language);

  data = { ...data, ...data.localizedCopy?.(language) };

  const content = h`
    ${
    data.preheader
      ? h`<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${
        escapeHtml(data.preheader)
      }</span>`
      : ""
  }
    <h1 class="title">${escapeHtml(data.title)}</h1>
    <p class="subtitle">${renderGreeting(data.name, language)}</p>
    <p>${escapeHtml(data.message)}</p>
    ${
    data.actionUrl && data.actionText
      ? renderButton(escapeHtml(data.actionText), sanitizeUrl(data.actionUrl))
      : ""
  }
    ${
    data.supportingMessage
      ? h`<p>${escapeHtml(data.supportingMessage)}</p>`
      : ""
  }
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content, renderFooter({}, language), language),
    text: htmlToText(content),
    subject: sanitizeSubject(data.subject || data.title),
  };
});

export const mobileBetaWelcomeTemplate = localizedEmailTemplate(
  (data: { name: string }, language) => {
    const { t, h } = createEmailTranslator(language);

    const content = h`
    <h1 class="title">Welcome to Moneko Mobile</h1>
    <p class="subtitle">${renderGreeting(data.name, language)}</p>
    <p>Thanks for joining Moneko. You can now manage your expenses, budgets, and financial plans from your phone.</p>
    <p><strong>What You Can Do in Moneko</strong></p>
    <ul>
      <li><strong>WhatsApp Capture</strong> - Log expenses with a quick message.</li>
      <li><strong>Email Receipt Capture</strong> - Forward receipt emails and have expenses logged automatically.</li>
      <li><strong>Shared Spaces</strong> - Manage shared expenses and budgets together.</li>
      <li><strong>AI-assisted expense capture</strong> - Organize spending with less manual work.</li>
      <li><strong>Bank Sync where supported</strong> - Keep eligible accounts up to date automatically.</li>
    </ul>
    ${mobileDownloadCtasHtml(language)}
    <p>Need help or have feedback about Moneko? Reply to this email or contact us at <a href="${
      sanitizeUrl(
        LINKS.support,
      )
    }">hello@moneko.io</a>.</p>
    <p class="muted">The Moneko Team</p>
  `;

    return {
      html: baseTemplate(
        content,
        renderFooter({
          customReason: t(
            "You're receiving this email because you signed up to use Moneko mobile.",
          ),
        }, language),
        language,
      ),
      text: htmlToText(content),
      subject: sanitizeSubject(t("Welcome to Moneko Mobile")),
    };
  },
);

// Invitation reminder for inviter (person who sent the invite)
export const inviteReminderInviterTemplate = localizedEmailTemplate((data: {
  inviterName: string;
  inviteeName: string;
  householdName: string;
  inviteUrl: string;
  daysSinceInvite: number;
  reminderTier: 1 | 2 | 3;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const inviteePerson = data.inviteeName || t("Your invitee");
  const timeText = data.daysSinceInvite === 1
    ? "yesterday"
    : t`${data.daysSinceInvite} days ago`;

  let title: string;
  let subtitle: string;

  if (data.reminderTier === 3) {
    title = t("Your Invitation is Expiring Soon");
    subtitle = t`${escapeHtml(inviteePerson)} hasn't joined ${
      escapeHtml(
        data.householdName,
      )
    } yet, and your invitation expires in 2 days.`;
  } else if (data.reminderTier === 2) {
    title = t("Your Invitation is Still Pending");
    subtitle = t`${escapeHtml(inviteePerson)} hasn't joined ${
      escapeHtml(
        data.householdName,
      )
    } yet.`;
  } else {
    title = t("Pending Invitation");
    subtitle = t`${escapeHtml(inviteePerson)} hasn't joined ${
      escapeHtml(
        data.householdName,
      )
    } yet.`;
  }

  const content = h`
    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <p>You invited ${escapeHtml(inviteePerson)} to join ${
    escapeHtml(
      data.householdName,
    )
  } ${timeText}.</p>
    ${
    data.reminderTier === 3
      ? h`<p>The invitation expires in two days. You can send them a reminder or share the invitation link directly.</p>`
      : data.reminderTier === 2
      ? h`<p>You may want to send them a quick reminder or share the invitation link directly.</p>`
      : h`<p>They may have missed the email or need a gentle reminder. Feel free to reach out to them directly.</p>`
  }
    ${renderButton(t("View Invitation"), sanitizeUrl(data.inviteUrl))}
    <p>You can also copy and share the invitation link with them via your preferred messaging app.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because you sent a household invitation that is still pending.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      data.reminderTier === 3
        ? t`Reminder: Your invitation to ${data.householdName} expires soon`
        : t`${
          data.inviteeName || t("Your invitee")
        } hasn't joined ${data.householdName} yet`,
    ),
  };
});

// Invitation reminder for invitee (person who received the invite) - with tier variations
export const inviteReminderInviteeTemplate = localizedEmailTemplate((data: {
  inviteeName?: string;
  inviterName: string;
  householdName: string;
  inviteUrl: string;
  personalMessage?: string;
  daysSinceInvite: number;
  daysUntilExpiry?: number;
  reminderTier: 1 | 2 | 3;
}, language) => {
  const { t, h } = createEmailTranslator(language);

  const greeting = renderGreeting(data.inviteeName, language);
  const daysUntilExpiry = data.daysUntilExpiry ?? 2;

  let title: string;
  let subtitle: string;
  let bodyMessage: string;

  if (data.reminderTier === 3) {
    title = t`Your Invitation to ${
      escapeHtml(
        data.householdName,
      )
    } Expires in ${daysUntilExpiry} ${
      localizedPluralize(daysUntilExpiry, "Day", undefined, language)
    }`;
    subtitle = t`${escapeHtml(data.inviterName)} invited you to join ${
      escapeHtml(
        data.householdName,
      )
    } on Moneko.`;
    bodyMessage = t`Your invitation expires in ${daysUntilExpiry} ${
      localizedPluralize(
        daysUntilExpiry,
        "day",
        undefined,
        language,
      )
    }. You can manage shared expenses, budgets, and settlements together with ${
      escapeHtml(
        data.inviterName,
      )
    }.`;
  } else if (data.reminderTier === 2) {
    title = t`Reminder: Your Invitation to ${
      escapeHtml(
        data.householdName,
      )
    } Is Still Available`;
    subtitle = t`${escapeHtml(data.inviterName)} invited you to join ${
      escapeHtml(
        data.householdName,
      )
    } on Moneko.`;
    bodyMessage =
      t`It's been ${data.daysSinceInvite} days since the invitation was sent. Once you join, you can manage shared expenses, budgets, and settlements together.`;
  } else {
    title = t`${escapeHtml(data.inviterName)} invited you to join ${
      escapeHtml(
        data.householdName,
      )
    }`;
    subtitle = t("Join your shared space on Moneko.");
    bodyMessage = t`${
      escapeHtml(
        data.inviterName,
      )
    } sent you an invitation ${data.daysSinceInvite} days ago. Once you join, you can manage shared expenses and budgets together.`;
  }

  const content = h`
    <h1 class="title">${title}</h1>
    <p class="subtitle">${greeting}</p>
    <p>${subtitle}</p>
    <p>${bodyMessage}</p>
    ${
    data.personalMessage
      ? h`<p><strong>Personal message from ${
        escapeHtml(
          data.inviterName,
        )
      }:</strong></p><p><em>"${escapeHtml(data.personalMessage)}"</em></p>`
      : ""
  }
    ${renderButton(t("Accept Invitation"), sanitizeUrl(data.inviteUrl))}
    <p><strong>Why join a space on Moneko?</strong></p>
    <ul>
      <li>Track shared expenses</li>
      <li>Manage budgets together</li>
      <li>Split costs and settle balances</li>
    </ul>
    ${mobileDownloadCtasHtml(language)}
    <p>If you did not expect this email, you can safely ignore it.</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason: t(
          "You're receiving this email because you were invited to join a Moneko space.",
        ),
      }, language),
      language,
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      data.reminderTier === 3
        ? t`Your invitation to ${data.householdName} expires in ${daysUntilExpiry} ${
          localizedPluralize(
            daysUntilExpiry,
            "day",
            undefined,
            language,
          )
        }`
        : data.reminderTier === 2
        ? t`Reminder: Your invitation to ${data.householdName} is still available`
        : t`${data.inviterName} invited you to join ${data.householdName} on Moneko`,
    ),
  };
});
