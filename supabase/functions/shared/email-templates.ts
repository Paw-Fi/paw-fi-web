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
  pluralize,
  sanitizeSubject,
} from "./email-utils.ts";
import { LINKS, sanitizeUrl } from "./email-security.ts";

function renderGreeting(name?: string): string {
  const trimmedName = name?.trim();
  return trimmedName ? `Hi ${escapeHtml(trimmedName)},` : "Hi,";
}

// Subscription created email template
export const subscriptionCreatedTemplate = (data: {
  name: string;
  planName: string;
  endDate?: string; // Optional for Lifetime (no renewal)
  dashboardUrl: string;
  isLifetime?: boolean;
}) => {
  const subscriptionMessage = data.isLifetime
    ? "Your Moneko Plus Lifetime access is now active, with no recurring subscription charges."
    : data.endDate
      ? `Your subscription is now active and is scheduled to renew on ${formatDate(
          data.endDate,
        )}.`
      : "Your Moneko Plus subscription is now active.";
  const accessTitle = data.isLifetime
    ? "Welcome to Moneko Plus Lifetime"
    : "Welcome to Moneko Plus";

  const content = `
    <h1 class="title">${accessTitle}</h1>
    <p class="subtitle">Thank you for joining Moneko. ${escapeHtml(
      subscriptionMessage,
    )}</p>
    <p>You can now use WhatsApp Capture, Email Receipt Capture, advanced budgeting tools, and Bank Sync where supported. A great way to get started is to log your next expense in Moneko.</p>
    ${renderButton("Open Moneko", sanitizeUrl(LINKS.appHome))}
    ${mobileDownloadCtasHtml()}
    <p>If you have any questions, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you subscribed to Moneko.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(accessTitle),
  };
};

// Subscription updated email template
export const subscriptionUpdatedTemplate = (data: {
  name: string;
  planName: string;
  endDate: string;
  dashboardUrl: string;
  changeType: "upgrade" | "downgrade" | "renewal" | "interval_changed";
}) => {
  const title =
    data.changeType === "upgrade"
      ? "Welcome to Moneko Plus"
      : data.changeType === "downgrade"
        ? "Your Moneko Plan Has Changed"
        : data.changeType === "interval_changed"
          ? "Your Billing Schedule Has Changed"
          : "Your Moneko Subscription Has Renewed";

  const subtitle =
    data.changeType === "upgrade"
      ? "Your upgrade is complete."
      : data.changeType === "downgrade"
        ? "Your Moneko Plus access has ended."
        : data.changeType === "interval_changed"
          ? "Your billing schedule has changed."
          : "Your subscription has renewed.";

  const valueMessage =
    data.changeType === "upgrade"
      ? "You now have access to WhatsApp Capture, Email Receipt Capture, advanced budgeting tools, and Bank Sync where supported."
      : data.changeType === "downgrade"
        ? "Your Moneko Plus access has ended, but you can continue tracking and managing your finances with Moneko Free."
        : data.changeType === "interval_changed"
          ? `Your updated billing schedule is now in effect. Your Moneko access continues through ${formatDate(
              data.endDate,
            )}.`
          : `Your Moneko Plus access continues through ${formatDate(data.endDate)}.`;

  const content = `
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    <p>${escapeHtml(valueMessage)}</p>
    ${renderButton("Manage Subscription", sanitizeUrl(LINKS.membership))}
    ${mobileDownloadCtasHtml()}
    <p>If you have any questions, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your subscription was updated.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(title),
  };
};

// Subscription cancelled email template
export const subscriptionCanceledTemplate = (data: {
  name: string;
  planName: string;
  endDate: string | null;
  dashboardUrl: string;
  immediateCancel: boolean;
}) => {
  const title = data.immediateCancel
    ? "Your Moneko Plus Access Has Ended"
    : "Your Moneko Plus Cancellation Is Confirmed";
  let subtitle;

  if (data.immediateCancel) {
    subtitle =
      "Your Moneko Plus access is no longer active, but you can continue using Moneko Free.";
  } else {
    subtitle = data.endDate
      ? `You’ll continue to have access to all Moneko Plus features until ${formatDate(
          data.endDate,
        )}.`
      : "You’ll continue to have access to Moneko Plus until the end of your current billing period.";
  }

  const content = `
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    ${renderButton(
      data.immediateCancel ? "View Plans" : "Open Moneko",
      sanitizeUrl(data.immediateCancel ? LINKS.pricing : LINKS.appHome),
    )}
    ${mobileDownloadCtasHtml()}
    <p>If you’re open to sharing, just reply and let us know what Moneko was missing or what we could have done better. Even a short response would be really helpful.</p>
    <p>Thank you for giving Moneko a try.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your subscription was cancelled.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(title),
  };
};

export const subscriptionPausedTemplate = (data: { name: string }) => {
  const content = `
    <h1 class="title">Your Moneko Plus Access Is Paused</h1>
    <p>${renderGreeting(data.name)}</p>
    <p class="subtitle">Your trial ended without a payment method, so your Moneko Plus access is now paused.</p>
    <p>Add a payment method from your membership settings to resume your subscription.</p>
    ${renderButton("Manage Subscription", sanitizeUrl(LINKS.membership))}
    <p>If you need help, reply to this email and our support team will assist you.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your Moneko Plus subscription was paused.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Your Moneko Plus Access Is Paused"),
  };
};

export const subscriptionResumedTemplate = (data: { name: string }) => {
  const content = `
    <h1 class="title">Your Moneko Plus Access Has Resumed</h1>
    <p>${renderGreeting(data.name)}</p>
    <p class="subtitle">Your subscription is active again and your Moneko Plus access has been restored.</p>
    ${renderButton("Open Moneko", sanitizeUrl(LINKS.appHome))}
    ${mobileDownloadCtasHtml()}
    <p>If you have any questions, reply to this email and our support team will help you.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your Moneko Plus subscription resumed.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Your Moneko Plus Access Has Resumed"),
  };
};

export const refundProcessedTemplate = (data: {
  name: string;
  amount: number;
  currency: string;
}) => {
  const content = `
    <h1 class="title">Your Refund Has Been Processed</h1>
    <p>${renderGreeting(data.name)}</p>
    <p class="subtitle">We have processed your refund of ${formatCurrency(
      data.amount,
      data.currency,
    )}.</p>
    <p>The funds will be returned to your original payment method. Most refunds appear within 5-10 business days, depending on your bank or card provider.</p>
    <p>If the refund has not appeared after 10 business days, reply to this email and our support team will help you.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because a Moneko payment was refunded.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Your Moneko Refund Has Been Processed"),
  };
};

export const refundFailedTemplate = (data: {
  name: string;
  amount: number;
  currency: string;
  failureReason?: string | null;
  accessRestored?: boolean;
}) => {
  const content = `
    <h1 class="title">We Couldn’t Complete Your Refund</h1>
    <p>${renderGreeting(data.name)}</p>
    <p class="subtitle">Your refund of ${formatCurrency(
      data.amount,
      data.currency,
    )} could not be completed.</p>
    ${
      data.failureReason
        ? `<p><strong>Reason:</strong> ${escapeHtml(data.failureReason)}</p>`
        : ""
    }
    ${
      data.accessRestored
        ? "<p>Your Moneko Plus Lifetime access has been restored because the refund did not complete.</p>"
        : ""
    }
    <p>Please reply to this email so our support team can arrange another way to return the funds.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because a Moneko refund could not be completed.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Action Needed for Your Moneko Refund"),
  };
};

// Payment failed template
export const paymentFailedTemplate = (data: {
  name: string;
  planName: string;
  dashboardUrl: string;
  updatePaymentUrl?: string;
  failureReason?: string;
  isDowngraded?: boolean;
  resubscribeUrl?: string;
}) => {
  const isDowngraded = Boolean(data.isDowngraded);
  const paymentActionUrl = isDowngraded
    ? (data.resubscribeUrl ?? data.updatePaymentUrl ?? LINKS.membership)
    : (data.updatePaymentUrl ?? LINKS.membership);
  const paymentActionText = isDowngraded
    ? "Reactivate Moneko Plus"
    : "Update Payment Details";

  const content = `
    <h1 class="title">We Couldn’t Process Your Moneko Payment</h1>
    <p class="subtitle">We couldn’t process your latest payment for ${escapeHtml(
      data.planName,
    )}.</p>
    ${
      data.failureReason
        ? `<p>Reason: ${escapeHtml(data.failureReason)}</p>`
        : ""
    }
    ${
      isDowngraded
        ? `<p>Your Moneko Plus access has ended, but you can continue using Moneko Free. Update your payment details to reactivate Moneko Plus.</p>`
        : `<p>Please update your payment details to keep your Moneko Plus access active.</p>`
    }
    ${renderButton(paymentActionText, sanitizeUrl(paymentActionUrl))}
    <p>If you believe this is an error, please contact our support team for assistance.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your subscription payment failed.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("We Couldn’t Process Your Moneko Payment"),
  };
};

// Trial ending email template
export const trialEndingTemplate = (data: {
  name: string;
  planName: string;
  trialEndDate: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Your Moneko Plus Trial Ends Soon</h1>
    <p class="subtitle">Your ${escapeHtml(data.planName)} trial will end on ${formatDate(
      data.trialEndDate,
    )}.</p>
    <p>Choose a plan before your trial ends to continue using Moneko Plus without interruption.</p>
    ${renderButton("Choose a Plan", sanitizeUrl(LINKS.membership))}
    <p>If you have any questions, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your free trial is ending soon.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Your Moneko Plus Trial Ends Soon"),
  };
};

// Referral accepted email template (to referrer)
export const referralAcceptedTemplate = (data: {
  referrerName: string;
  refereeName: string;
}) => {
  const content = `
    <h1 class="title">Your Friend Joined Moneko Through Your Referral</h1>
    <p class="subtitle">${renderGreeting(data.referrerName)} ${
      data.refereeName
        ? `${escapeHtml(
            data.refereeName,
          )} completed their purchase through your referral link.`
        : "Your friend completed their purchase through your referral link."
    }</p>
    <p>Thanks for recommending Moneko. Your referral helped them receive 50% off Moneko Plus Lifetime.</p>
    ${mobileDownloadCtasHtml()}
    <p>Keep sharing your link to help more people discover Moneko and claim the discounted lifetime offer.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your friend completed a purchase through your Moneko referral link.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Your Friend Joined Moneko Through Your Referral"),
  };
};

// Referral successful email template (to referee)
export const referralSuccessfulTemplate = (data: {
  name: string;
  referrerName: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Welcome to Moneko Plus Lifetime</h1>
    <p class="subtitle">${renderGreeting(
      data.name,
    )} Your referral purchase is complete.</p>
    <p>Your Moneko Plus Lifetime access is now active, with no recurring subscription charges. Thanks to ${escapeHtml(
      data.referrerName,
    )} for inviting you.</p>
    ${renderButton("Open Moneko", sanitizeUrl(LINKS.appHome))}
    ${mobileDownloadCtasHtml()}
    <p>If you have any questions getting started, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you completed a Moneko Plus Lifetime purchase through a referral invitation.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Welcome to Moneko Plus Lifetime"),
  };
};

// Welcome email template for newly verified users
export const welcomeTemplate = (data: {
  name: string;
  email: string;
  appUrl: string;
}) => {
  const greeting = renderGreeting(data.name);
  const content = `
    <h1 class="title">Welcome to Moneko! 🎉</h1>
    <p class="subtitle">${greeting} Your account is all set up and ready to go!</p>
    <p>Thank you for verifying your email address. Moneko brings your spending, budgets, and financial insights into one place.</p>
    <p>A great way to get started is to log your first expense and explore how Moneko organizes your spending automatically.</p>
    <p>You can track expenses manually, through WhatsApp, or by forwarding receipt emails after setting up Email Receipt Capture.</p>
    ${renderButton("Open Moneko", sanitizeUrl(data.appUrl))}
    ${mobileDownloadCtasHtml()}
    <p>If you have any questions getting started, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you successfully verified your Moneko account.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Welcome to Moneko!"),
  };
};

// Household invite email template
export const householdInviteTemplate = (data: {
  inviteUrl: string;
  personalMessage?: string;
  householdName?: string;
  inviterName?: string;
}) => {
  const inviter = data.inviterName?.trim();
  const household = data.householdName?.trim();
  const title =
    inviter && household
      ? `${inviter} invited you to ${household}`
      : inviter
        ? `${inviter} invited you to a shared space`
        : household
          ? `You are invited to ${household}`
          : "You are invited to join a shared space";
  const subtitle = household
    ? `Join ${household} on Moneko to manage shared expenses and budgets together.`
    : "Join your shared space on Moneko to manage expenses and budgets together.";
  const safeMessage = data.personalMessage?.trim();

  const content = `
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    ${
      safeMessage
        ? `<p><strong>Personal message:</strong></p><p>${escapeHtml(
            safeMessage,
          )}</p>`
        : ""
    }
    <p>Click the button below to accept your invitation.</p>
    ${renderButton("Accept Invitation", sanitizeUrl(data.inviteUrl))}
    <p>If you did not expect this email, you can safely ignore it.</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you were invited to join a Moneko space.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      inviter && household
        ? `${inviter} invited you to ${household} on Moneko`
        : inviter
          ? `${inviter} invited you to a space on Moneko`
          : household
            ? `Invitation to join ${household} on Moneko`
            : "Invitation to join a space on Moneko",
    ),
  };
};

// Course completion template
export const courseCompletionTemplate = (data: {
  name: string;
  courseName: string;
  completionDate: string;
  certificateUrl?: string;
  nextCourseUrl?: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Congratulations on Completing Your Course</h1>
    <p class="subtitle">${renderGreeting(
      data.name,
    )} You successfully completed the <strong>${escapeHtml(
      data.courseName,
    )}</strong> course on ${formatDate(data.completionDate)}.</p>
    <p>Thank you for taking another step in building your financial knowledge.</p>
    ${
      data.certificateUrl
        ? renderButton("Download Certificate", sanitizeUrl(data.certificateUrl))
        : ""
    }
    ${
      data.nextCourseUrl
        ? `<p>Ready for your next challenge? <a href="${sanitizeUrl(
            data.nextCourseUrl,
          )}">Check out recommended courses</a> to continue your learning journey.</p>`
        : ""
    }
    ${mobileDownloadCtasHtml()}
    <p>Keep up the great work.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you completed a course.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(`You Completed ${data.courseName}`),
  };
};

// Invoice finalized template (invoice ready for payment or viewing)
export const invoiceFinalizedTemplate = (data: {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  invoiceUrl: string;
  invoicePdfUrl?: string;
  dueDate?: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Your Invoice Is Ready</h1>
    <p class="subtitle">A new invoice for ${escapeHtml(
      data.planName,
    )} is ready to view.</p>
    <p><strong>Amount:</strong> ${formatCurrency(
      data.amount,
      data.currency,
    )}</p>
    ${
      data.dueDate
        ? `<p><strong>Due Date:</strong> ${formatDate(data.dueDate)}</p>`
        : ""
    }
    ${renderButton("View Invoice", sanitizeUrl(data.invoiceUrl))}
    ${
      data.invoicePdfUrl
        ? `<p>You can also <a href="${sanitizeUrl(
            data.invoicePdfUrl,
          )}">download the PDF version</a>.</p>`
        : ""
    }
    ${
      data.dueDate
        ? "<p>Please review the invoice and complete payment by the due date if needed.</p>"
        : "<p>If you have automatic payments enabled, your payment method will be charged automatically.</p>"
    }
    <p>If you have any questions about this invoice, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because an invoice is ready for your subscription.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Your Moneko Invoice Is Ready"),
  };
};

export const invoiceLocationRequiredTemplate = (data: { name: string }) => {
  const content = `
    <h1 class="title">Billing Information Needed</h1>
    <p>${renderGreeting(data.name)}</p>
    <p class="subtitle">We couldn’t prepare your Moneko invoice because your billing location is missing or incomplete.</p>
    <p>Please update your billing details so Stripe can calculate the required tax and complete your invoice.</p>
    ${renderButton("Update Billing Details", sanitizeUrl(LINKS.membership))}
    <p>If you need help, reply to this email and our support team will assist you.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your Moneko invoice needs updated billing information.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Update Your Billing Information"),
  };
};

// Invoice upcoming template (renewal reminder)
export const invoiceUpcomingTemplate = (data: {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  chargeDate: string;
  daysUntil: number;
  dashboardUrl: string;
  updatePaymentUrl?: string;
}) => {
  const shouldShowPaymentUpdate = Boolean(
    data.updatePaymentUrl && data.daysUntil <= 7,
  );
  const actionUrl = shouldShowPaymentUpdate
    ? data.updatePaymentUrl!
    : LINKS.membership;
  const actionText = shouldShowPaymentUpdate
    ? "Update Payment Method"
    : "Manage Subscription";

  const content = `
    <h1 class="title">Upcoming Subscription Renewal</h1>
    <p class="subtitle">Your ${escapeHtml(
      data.planName,
    )} subscription is scheduled to renew on ${formatDate(data.chargeDate)}.</p>
    <p><strong>Amount:</strong> ${formatCurrency(
      data.amount,
      data.currency,
    )}</p>
    <p><strong>Renewal Date:</strong> ${formatDate(data.chargeDate)}</p>
    <p>Your subscription is scheduled to renew on this date. The payment method on file will be charged.</p>
    ${
      shouldShowPaymentUpdate
        ? "<p>Please ensure your payment method is up to date to avoid any interruption in service.</p>"
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
        customReason:
          "You're receiving this email because your subscription is renewing soon.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      `Your ${data.planName} Subscription Renews on ${formatDate(
        data.chargeDate,
      )}`,
    ),
  };
};

// Payment action required template (3DS authentication needed)
export const paymentActionRequiredTemplate = (data: {
  name: string;
  planName: string;
  amount: number;
  currency: string;
  authenticationUrl: string;
  expiryHours?: number;
  dashboardUrl: string;
}) => {
  const expiryText = data.expiryHours
    ? `Please complete this additional security check within ${data.expiryHours} ${pluralize(
        data.expiryHours,
        "hour",
      )} to avoid subscription interruption.`
    : "";

  const content = `
    <h1 class="title">Verify Your Moneko Payment</h1>
    <p class="subtitle">Your bank requires additional verification before we can complete your ${escapeHtml(
      data.planName,
    )} payment.</p>
    <p><strong>Amount:</strong> ${formatCurrency(
      data.amount,
      data.currency,
    )}</p>
    <p>Your bank requires an additional security check to complete this payment.</p>
    ${renderButton("Authenticate Payment", sanitizeUrl(data.authenticationUrl))}
    ${expiryText ? `<p>${escapeHtml(expiryText)}</p>` : ""}
    <p>This additional verification helps protect your payment.</p>
    <p>If you don't recognize this charge, please <a href="${sanitizeUrl(
      LINKS.membership,
    )}">review your subscription</a> immediately.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because payment authentication is required.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Verify Your Moneko Payment"),
  };
};

// Payment method updated confirmation template
export const paymentMethodUpdatedTemplate = (data: {
  name: string;
  paymentMethodType: string;
  paymentMethodDetails?: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Your Payment Method Was Updated</h1>
    <p class="subtitle">Your new payment method will be used for future Moneko subscription payments.</p>
    <p><strong>Payment Method:</strong> ${escapeHtml(
      data.paymentMethodType,
    )}</p>
    ${
      data.paymentMethodDetails
        ? `<p><strong>Details:</strong> ${escapeHtml(
            data.paymentMethodDetails,
          )}</p>`
        : ""
    }
    ${renderButton("Manage Payment Methods", sanitizeUrl(LINKS.membership))}
    <p>If you didn't make this change, please contact our support team immediately.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your payment method was updated.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Your Moneko Payment Method Was Updated"),
  };
};

// Discount expiring template
export const discountExpiringTemplate = (data: {
  name: string;
  discountPercent: number;
  expiryDate: string;
  daysUntil: number;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Your Moneko Discount Expires Soon</h1>
    <p class="subtitle">Your ${data.discountPercent}% promotional discount expires on ${formatDate(
      data.expiryDate,
    )}.</p>
    <p>Complete your Moneko Plus subscription before this date to use the discounted price.</p>
    <p><strong>Discount Amount:</strong> ${data.discountPercent}% off</p>
    <p><strong>Expires:</strong> ${formatDate(data.expiryDate)}</p>
    ${renderButton("Use My Discount", sanitizeUrl(LINKS.membership))}
    <p>Your promotional pricing will no longer be available after this date.</p>
    <p>Thank you for being part of Moneko.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your promotional discount is expiring.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      `Your Moneko Discount Expires on ${formatDate(data.expiryDate)}`,
    ),
  };
};

// Invoice payment succeeded template (payment receipt with invoice PDF)
export const invoicePaymentSucceededTemplate = (data: {
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
}) => {
  const title = data.isRenewal
    ? "Your Subscription Renewal Payment Was Successful"
    : "Payment Received — Thank You";
  const content = `
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">We've successfully received your payment for ${escapeHtml(
      data.planName,
    )}.</p>
    <p><strong>Invoice Number:</strong> ${escapeHtml(data.invoiceNumber)}</p>
    <p><strong>Amount Paid:</strong> ${formatCurrency(
      data.amount,
      data.currency,
    )}</p>
    <p><strong>Payment Date:</strong> ${formatDate(data.paymentDate)}</p>
    ${renderButton("View Invoice", sanitizeUrl(data.invoiceUrl))}
    ${
      data.invoicePdfUrl
        ? `<p>You can also <a href="${sanitizeUrl(
            data.invoicePdfUrl,
          )}">download the invoice PDF</a> for your records.</p>`
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
        customReason:
          "You're receiving this email because your payment was processed successfully.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      data.isRenewal
        ? `Renewal Payment Successful — ${data.planName}`
        : `Payment Received — ${data.planName}`,
    ),
  };
};

export const notificationTemplate = (data: {
  name: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  priority?: "low" | "medium" | "high";
}) => {
  const content = `
    <h1 class="title">${escapeHtml(data.title)}</h1>
    <p class="subtitle">${renderGreeting(data.name)}</p>
    <p>${escapeHtml(data.message)}</p>
    ${
      data.actionUrl && data.actionText
        ? renderButton(escapeHtml(data.actionText), sanitizeUrl(data.actionUrl))
        : ""
    }
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content, renderFooter()),
    text: htmlToText(content),
    subject: sanitizeSubject(data.title),
  };
};

export const mobileBetaWelcomeTemplate = (data: { name: string }) => {
  const content = `
    <h1 class="title">Welcome to Moneko Mobile</h1>
    <p class="subtitle">${renderGreeting(data.name)}</p>
    <p>Thanks for joining Moneko. You can now manage your expenses, budgets, and financial plans from your phone.</p>
    <p><strong>What You Can Do in Moneko</strong></p>
    <ul>
      <li><strong>WhatsApp Capture</strong> - Log expenses with a quick message.</li>
      <li><strong>Email Receipt Capture</strong> - Forward receipt emails and have expenses logged automatically.</li>
      <li><strong>Shared Spaces</strong> - Manage shared expenses and budgets together.</li>
      <li><strong>AI-assisted expense capture</strong> - Organize spending with less manual work.</li>
      <li><strong>Bank Sync where supported</strong> - Keep eligible accounts up to date automatically.</li>
    </ul>
    ${mobileDownloadCtasHtml()}
    <p>Need help or have feedback about Moneko? Reply to this email or contact us at <a href="${sanitizeUrl(
      LINKS.support,
    )}">hello@moneko.io</a>.</p>
    <p class="muted">The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you signed up to use Moneko mobile.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Welcome to Moneko Mobile"),
  };
};

// Invitation reminder for inviter (person who sent the invite)
export const inviteReminderInviterTemplate = (data: {
  inviterName: string;
  inviteeName: string;
  householdName: string;
  inviteUrl: string;
  daysSinceInvite: number;
  reminderTier: 1 | 2 | 3;
}) => {
  const inviteePerson = data.inviteeName || "Your invitee";
  const timeText =
    data.daysSinceInvite === 1
      ? "yesterday"
      : `${data.daysSinceInvite} days ago`;

  let title: string;
  let subtitle: string;

  if (data.reminderTier === 3) {
    title = "Your Invitation is Expiring Soon";
    subtitle = `${escapeHtml(inviteePerson)} hasn't joined ${escapeHtml(
      data.householdName,
    )} yet, and your invitation expires in 2 days.`;
  } else if (data.reminderTier === 2) {
    title = "Your Invitation is Still Pending";
    subtitle = `${escapeHtml(inviteePerson)} hasn't joined ${escapeHtml(
      data.householdName,
    )} yet.`;
  } else {
    title = "Pending Invitation";
    subtitle = `${escapeHtml(inviteePerson)} hasn't joined ${escapeHtml(
      data.householdName,
    )} yet.`;
  }

  const content = `
    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <p>You invited ${escapeHtml(inviteePerson)} to join ${escapeHtml(
      data.householdName,
    )} ${timeText}.</p>
    ${
      data.reminderTier === 3
        ? `<p>The invitation expires in two days. You can send them a reminder or share the invitation link directly.</p>`
        : data.reminderTier === 2
          ? `<p>You may want to send them a quick reminder or share the invitation link directly.</p>`
          : `<p>They may have missed the email or need a gentle reminder. Feel free to reach out to them directly.</p>`
    }
    ${renderButton("View Invitation", sanitizeUrl(data.inviteUrl))}
    <p>You can also copy and share the invitation link with them via your preferred messaging app.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you sent a household invitation that is still pending.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      data.reminderTier === 3
        ? `Reminder: Your invitation to ${data.householdName} expires soon`
        : `${
            data.inviteeName || "Your invitee"
          } hasn't joined ${data.householdName} yet`,
    ),
  };
};

// Invitation reminder for invitee (person who received the invite) - with tier variations
export const inviteReminderInviteeTemplate = (data: {
  inviteeName?: string;
  inviterName: string;
  householdName: string;
  inviteUrl: string;
  personalMessage?: string;
  daysSinceInvite: number;
  daysUntilExpiry?: number;
  reminderTier: 1 | 2 | 3;
}) => {
  const greeting = renderGreeting(data.inviteeName);
  const daysUntilExpiry = data.daysUntilExpiry ?? 2;

  let title: string;
  let subtitle: string;
  let bodyMessage: string;

  if (data.reminderTier === 3) {
    title = `Your Invitation to ${escapeHtml(
      data.householdName,
    )} Expires in ${daysUntilExpiry} ${pluralize(daysUntilExpiry, "Day")}`;
    subtitle = `${escapeHtml(data.inviterName)} invited you to join ${escapeHtml(
      data.householdName,
    )} on Moneko.`;
    bodyMessage = `Your invitation expires in ${daysUntilExpiry} ${pluralize(
      daysUntilExpiry,
      "day",
    )}. You can manage shared expenses, budgets, and settlements together with ${escapeHtml(
      data.inviterName,
    )}.`;
  } else if (data.reminderTier === 2) {
    title = `Reminder: Your Invitation to ${escapeHtml(
      data.householdName,
    )} Is Still Available`;
    subtitle = `${escapeHtml(data.inviterName)} invited you to join ${escapeHtml(
      data.householdName,
    )} on Moneko.`;
    bodyMessage = `It's been ${data.daysSinceInvite} days since the invitation was sent. Once you join, you can manage shared expenses, budgets, and settlements together.`;
  } else {
    title = `${escapeHtml(data.inviterName)} invited you to join ${escapeHtml(
      data.householdName,
    )}`;
    subtitle = "Join your shared space on Moneko.";
    bodyMessage = `${escapeHtml(
      data.inviterName,
    )} sent you an invitation ${data.daysSinceInvite} days ago. Once you join, you can manage shared expenses and budgets together.`;
  }

  const content = `
    <h1 class="title">${title}</h1>
    <p class="subtitle">${greeting}</p>
    <p>${subtitle}</p>
    <p>${bodyMessage}</p>
    ${
      data.personalMessage
        ? `<p><strong>Personal message from ${escapeHtml(
            data.inviterName,
          )}:</strong></p><p><em>"${escapeHtml(data.personalMessage)}"</em></p>`
        : ""
    }
    ${renderButton("Accept Invitation", sanitizeUrl(data.inviteUrl))}
    <p><strong>Why join a space on Moneko?</strong></p>
    <ul>
      <li>Track shared expenses</li>
      <li>Manage budgets together</li>
      <li>Split costs and settle balances</li>
    </ul>
    ${mobileDownloadCtasHtml()}
    <p>If you did not expect this email, you can safely ignore it.</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you were invited to join a Moneko space.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      data.reminderTier === 3
        ? `Your invitation to ${data.householdName} expires in ${daysUntilExpiry} ${pluralize(
            daysUntilExpiry,
            "day",
          )}`
        : data.reminderTier === 2
          ? `Reminder: Your invitation to ${data.householdName} is still available`
          : `${data.inviterName} invited you to join ${data.householdName} on Moneko`,
    ),
  };
};
