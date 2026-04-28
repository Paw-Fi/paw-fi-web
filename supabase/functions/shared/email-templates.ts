// Email templates for Moneko
import {
  baseTemplate,
  renderButton,
  renderFooter,
  mobileDownloadCtasHtml,
} from "./email-layout.ts";
import { htmlToText } from "./email-html-to-text.ts";
import {
  escapeHtml,
  sanitizeSubject,
  formatDate,
  formatCurrency,
  pluralize,
} from "./email-utils.ts";
import { sanitizeUrl, LINKS } from "./email-security.ts";

// Subscription created email template
export const subscriptionCreatedTemplate = (data: {
  name: string;
  planName: string;
  endDate?: string; // Optional for Lifetime (no renewal)
  dashboardUrl: string;
  isLifetime?: boolean;
}) => {
  const subscriptionMessage = data.isLifetime
    ? "You now have lifetime access to all premium features — no renewals, no recurring charges."
    : data.endDate
      ? `Your subscription is now active and will automatically renew on ${formatDate(data.endDate)}.`
      : "Your subscription is now active.";

  const content = `
    <h1 class="title">Welcome to ${escapeHtml(data.planName)}</h1>
    <p class="subtitle">Thank you for joining Moneko. ${escapeHtml(subscriptionMessage)}</p>
    <p>You now have full access to all premium features included in your plan.</p>
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
    subject: sanitizeSubject(`Welcome to Moneko ${data.planName}`),
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
      ? "Your Subscription Has Been Upgraded"
      : data.changeType === "downgrade"
        ? "Your Subscription Has Been Changed"
        : data.changeType === "interval_changed"
          ? "Your Billing Interval Has Changed"
          : "Your Subscription Has Been Renewed";

  const subtitle =
    data.changeType === "upgrade"
      ? `You've been upgraded to ${escapeHtml(data.planName)}.`
      : data.changeType === "downgrade"
        ? `Your plan has been changed to ${escapeHtml(data.planName)}.`
        : data.changeType === "interval_changed"
          ? `Your billing interval is now ${escapeHtml(data.planName)}.`
          : `Your ${escapeHtml(data.planName)} subscription has been renewed.`;

  const content = `
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    <p>Your subscription will automatically renew on ${formatDate(data.endDate)}.</p>
    ${renderButton("Manage Subscription", sanitizeUrl(data.dashboardUrl))}
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

// Subscription canceled email template
export const subscriptionCanceledTemplate = (data: {
  name: string;
  planName: string;
  endDate: string | null;
  dashboardUrl: string;
  immediateCancel: boolean;
}) => {
  const title = "Your Subscription Has Been Canceled";
  let subtitle;

  if (data.immediateCancel) {
    subtitle = `Your ${escapeHtml(data.planName)} subscription is no longer active.`;
  } else {
    subtitle = data.endDate
      ? `Your ${escapeHtml(data.planName)} subscription will remain active until ${formatDate(data.endDate)}.`
      : `Your ${escapeHtml(data.planName)} subscription will remain active until your current period ends.`;
  }

  const content = `
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    <p>We're sorry to see you go. If you change your mind, you can resubscribe anytime.</p>
    ${renderButton("Resubscribe", sanitizeUrl(data.dashboardUrl))}
    ${mobileDownloadCtasHtml()}
    <p>We'd love to hear your feedback about why you canceled. Your input helps us improve.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your subscription was canceled.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(title),
  };
};

// Payment failed template
export const paymentFailedTemplate = (data: {
  name: string;
  planName: string;
  dashboardUrl: string;
  updatePaymentUrl?: string;
  isDowngraded?: boolean;
  resubscribeUrl?: string;
}) => {
  const content = `
    <h1 class="title">Payment Failed</h1>
    <p class="subtitle">We were unable to process your payment for ${escapeHtml(data.planName)}.</p>
    <p>Your payment method was declined. Please update your payment information to continue enjoying your premium benefits.</p>
    ${
      data.isDowngraded
        ? `<p><strong>Important:</strong> Your account has been downgraded to the free plan due to the payment failure.</p>`
        : `<p><strong>Warning:</strong> Your subscription will be downgraded if payment is not updated soon.</p>`
    }
    ${data.updatePaymentUrl ? renderButton("Update Payment Method", sanitizeUrl(data.updatePaymentUrl)) : ""}
    ${data.resubscribeUrl ? renderButton("Resubscribe", sanitizeUrl(data.resubscribeUrl)) : ""}
    ${renderButton("Manage Membership", sanitizeUrl(data.dashboardUrl))}
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
    subject: sanitizeSubject("Payment Failed — Action Required"),
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
    <h1 class="title">Your Trial Period Ends Soon</h1>
    <p class="subtitle">Your ${escapeHtml(data.planName)} trial will end on ${formatDate(data.trialEndDate)}.</p>
    <p>To continue enjoying all the benefits without interruption, please ensure your payment method is up to date.</p>
    ${renderButton("Manage Membership", sanitizeUrl(data.dashboardUrl))}
    <p><strong>Want to help a friend lock in lifetime access for less?</strong> Our referral program now gives new users <strong>50% off the lifetime plan</strong>.</p>
    <p>Share your referral link and friends will get the 50% discount applied automatically at checkout.</p>
    ${renderButton("Share Your Referral Link", sanitizeUrl("https://moneko.io/referral"), "secondary")}
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
    subject: sanitizeSubject("Your Moneko Trial Ends Soon"),
  };
};

// Referral accepted email template (to referrer)
export const referralAcceptedTemplate = (data: {
  referrerName: string;
  refereeName: string;
}) => {
  const content = `
    <h1 class="title">Your Friend Claimed Your Referral Offer 🎉</h1>
    <p class="subtitle">Hi ${escapeHtml(data.referrerName)}, ${data.refereeName ? escapeHtml(data.refereeName) + " " : "your friend "}completed checkout through your referral link.</p>
    <p>Thanks for sharing Moneko. Your referral helped someone unlock 50% off the lifetime plan.</p>
    ${mobileDownloadCtasHtml()}
    <p>Keep sharing your link to help more people discover Moneko and claim the discounted lifetime offer.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because your friend accepted your Moneko invitation.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Your Friend Completed a Referral Checkout"),
  };
};

// Referral successful email template (to referee)
export const referralSuccessfulTemplate = (data: {
  name: string;
  referrerName: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Welcome to Moneko! 🎉</h1>
    <p class="subtitle">Hi ${escapeHtml(data.name)}, thanks for joining Moneko through ${escapeHtml(data.referrerName)}'s invitation.</p>
    <p>Your referral offer gives you 50% off the lifetime plan, applied automatically in the referral checkout flow.</p>
    ${renderButton("Go to Dashboard", sanitizeUrl(data.dashboardUrl))}
    ${mobileDownloadCtasHtml()}
    <p>If you have any questions getting started or completing checkout, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you joined Moneko through a referral invitation.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Welcome to Moneko!"),
  };
};

// Welcome email template for newly verified users
export const welcomeTemplate = (data: {
  name: string;
  email: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Welcome to Moneko! 🎉</h1>
    <p class="subtitle">Hi ${escapeHtml(data.name)}, your account is all set up and ready to go!</p>
    <p>Thank you for verifying your email address. You now have full access to Moneko's powerful financial tools and insights.</p>
    <p>Start your journey to better financial health by exploring your personalized dashboard:</p>
    ${renderButton("Go to Dashboard", sanitizeUrl(data.dashboardUrl))}
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
      ? `${escapeHtml(inviter)} invited you to ${escapeHtml(household)}`
      : inviter
        ? `${escapeHtml(inviter)} invited you to a space`
        : household
          ? `You are invited to ${escapeHtml(household)}`
          : "You are invited to join a space";
  const subtitle = household
    ? `Join ${escapeHtml(household)} to start sharing expenses and budgets.`
    : "Join your space to start sharing expenses and budgets.";
  const safeMessage = data.personalMessage?.trim();
  const inviterLine = data.inviterName
    ? `<p>Invite sent by ${escapeHtml(data.inviterName)}.</p>`
    : "";

  const content = `
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${subtitle}</p>
    ${inviterLine}
    <p>Click the button below to accept your invitation.</p>
    ${renderButton("Accept Invite", sanitizeUrl(data.inviteUrl))}
    ${safeMessage ? `<p><strong>Personal message:</strong></p><p>${escapeHtml(safeMessage)}</p>` : ""}
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
    <p class="subtitle">You've successfully completed the <strong>${escapeHtml(data.courseName)}</strong> course on ${formatDate(data.completionDate)}.</p>
    <p>You've taken an important step in your financial education journey. We're proud of your dedication to learning.</p>
    ${data.certificateUrl ? renderButton("Download Certificate", sanitizeUrl(data.certificateUrl)) : ""}
    ${data.nextCourseUrl ? `<p>Ready for your next challenge? <a href="${sanitizeUrl(data.nextCourseUrl)}">Check out recommended courses</a> to continue your learning journey.</p>` : ""}
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
    subject: sanitizeSubject(`Course Completed — ${data.courseName}`),
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
    <h1 class="title">Your Invoice is Ready</h1>
    <p class="subtitle">Your invoice for ${escapeHtml(data.planName)} subscription is now ready.</p>
    <p><strong>Amount:</strong> ${formatCurrency(data.amount, data.currency)}</p>
    ${data.dueDate ? `<p><strong>Due Date:</strong> ${formatDate(data.dueDate)}</p>` : ""}
    ${renderButton("View Invoice", sanitizeUrl(data.invoiceUrl))}
    ${data.invoicePdfUrl ? `<p>You can also <a href="${sanitizeUrl(data.invoicePdfUrl)}">download the PDF version</a>.</p>` : ""}
    <p>If you have automatic payments enabled, your payment method will be charged automatically.</p>
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
    subject: sanitizeSubject(`Invoice Ready — Moneko`),
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
  const urgencyText =
    data.daysUntil <= 3 ? "soon" : `in ${data.daysUntil} days`;

  const content = `
    <h1 class="title">Upcoming Subscription Renewal</h1>
    <p class="subtitle">Your ${escapeHtml(data.planName)} subscription will renew ${urgencyText}.</p>
    <p><strong>Amount:</strong> ${formatCurrency(data.amount, data.currency)}</p>
    <p><strong>Renewal Date:</strong> ${formatDate(data.chargeDate)}</p>
    <p>Your subscription will automatically renew on this date. The payment method on file will be charged.</p>
    ${
      data.updatePaymentUrl && data.daysUntil <= 7
        ? `<p>Please ensure your payment method is up to date to avoid any interruption in service.</p>
       ${renderButton("Update Payment Method", sanitizeUrl(data.updatePaymentUrl))}
       `
        : ""
    }
    ${renderButton("Manage Subscription", sanitizeUrl(data.dashboardUrl))}
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
    subject: sanitizeSubject(`Upcoming Renewal — ${data.planName}`),
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
    ? ` Please complete authentication within ${data.expiryHours} ${pluralize(data.expiryHours, "hour")} to avoid subscription interruption.`
    : "";

  const content = `
    <h1 class="title">Action Required — Authenticate Your Payment</h1>
    <p class="subtitle">We need you to authenticate your payment for the ${escapeHtml(data.planName)} subscription.</p>
    <p><strong>Amount:</strong> ${formatCurrency(data.amount, data.currency)}</p>
    <p>Your bank requires additional verification (3D Secure) to complete this payment.</p>
    ${renderButton("Authenticate Payment", sanitizeUrl(data.authenticationUrl))}
    <p>${escapeHtml(expiryText)}</p>
    <p>This is a security measure to protect you from unauthorized transactions. The authentication process is quick and secure.</p>
    <p>If you don't recognize this charge, please <a href="${sanitizeUrl(data.dashboardUrl)}">review your subscription</a> immediately.</p>
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
    subject: sanitizeSubject("Action Required — Authenticate Your Payment"),
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
    <h1 class="title">Payment Method Updated</h1>
    <p class="subtitle">Your payment method has been successfully updated.</p>
    <p><strong>Payment Method:</strong> ${escapeHtml(data.paymentMethodType)}</p>
    ${data.paymentMethodDetails ? `<p><strong>Details:</strong> ${escapeHtml(data.paymentMethodDetails)}</p>` : ""}
    <p>Your new payment method will be used for future subscription renewals.</p>
    ${renderButton("Manage Payment Methods", sanitizeUrl(data.dashboardUrl))}
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
    subject: sanitizeSubject("Payment Method Updated Successfully"),
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
  const urgencyText =
    data.daysUntil <= 7 ? "soon" : `in ${data.daysUntil} days`;

  const content = `
    <h1 class="title">Your Discount is Expiring</h1>
    <p class="subtitle">Your ${data.discountPercent}% discount expires ${urgencyText}.</p>
    <p>Don't miss out on your special pricing! Add a payment method to lock in your discount before it expires.</p>
    <p><strong>Discount Amount:</strong> ${data.discountPercent}% off</p>
    <p><strong>Expires:</strong> ${formatDate(data.expiryDate)}</p>
    ${renderButton("Add Payment Method", sanitizeUrl(data.dashboardUrl))}
    <p><strong>What happens if you don't add a payment method?</strong></p>
    <p>After ${formatDate(data.expiryDate)}, if no payment method is on file, your account will be automatically downgraded to our free plan. You can always resubscribe later from your membership dashboard.</p>
    ${renderButton("Manage Membership", sanitizeUrl(data.dashboardUrl))}
    <p>Thank you for being part of Moneko. We hope you continue your premium experience.</p>
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
      `Action Needed — Your Moneko Discount Expires ${data.daysUntil <= 7 ? "Soon" : `in ${data.daysUntil} days`}`,
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
}) => {
  const content = `
    <h1 class="title">Payment Received — Thank You</h1>
    <p class="subtitle">We've successfully received your payment for ${escapeHtml(data.planName)}.</p>
    <p><strong>Invoice Number:</strong> ${escapeHtml(data.invoiceNumber)}</p>
    <p><strong>Amount Paid:</strong> ${formatCurrency(data.amount, data.currency)}</p>
    <p><strong>Payment Date:</strong> ${formatDate(data.paymentDate)}</p>
    ${renderButton("View Invoice", sanitizeUrl(data.invoiceUrl))}
    ${data.invoicePdfUrl ? `<p>You can also <a href="${sanitizeUrl(data.invoicePdfUrl)}">download your receipt (PDF)</a> for your records.</p>` : ""}
    <p>This receipt confirms your payment has been processed successfully. Your subscription remains active and you continue to have full access to all premium features.</p>
    <p><a href="${sanitizeUrl(data.dashboardUrl)}">Manage Your Subscription</a></p>
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
    subject: sanitizeSubject(`Payment Received — ${data.planName}`),
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
    <p class="subtitle">Hi ${escapeHtml(data.name)},</p>
    <p>${escapeHtml(data.message)}</p>
    ${data.actionUrl && data.actionText ? renderButton(escapeHtml(data.actionText), sanitizeUrl(data.actionUrl)) : ""}
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
    <h1 class="title">Welcome to the Moneko Mobile Public Beta!</h1>
    <p class="subtitle">Hi ${escapeHtml(data.name)},</p>
    <p>Thanks for helping us test the Moneko mobile experience. You're officially part of our public beta, and we can't wait for you to explore the latest build.</p>
    <p><strong>You're Ready to Install</strong></p>
    <ul>
      <li>Download the mobile build and start budgeting on the go</li>
      <li>Share feedback directly with the team to shape upcoming releases</li>
      <li>Expect frequent updates as we add more capabilities</li>
    </ul>
    <p><strong>What You Can Explore Right Now</strong></p>
    <ul>
      <li><strong>Chat-based expense logging</strong> - Log expenses or income with natural language and quick taps.</li>
      <li><strong>Smart spending insights</strong> - Let AI categorize your spending and surface top categories.</li>
      <li><strong>Bill & paycheck reminders</strong> - Stay notified about upcoming income and obligations.</li>
      <li><strong>Goal tracking with celebrations</strong> - Set goals, track growth, and celebrate milestones.</li>
    </ul>
    ${mobileDownloadCtasHtml()}
    <p>Need help or have feedback about the beta? Reply to this email or contact us at <a href="${sanitizeUrl(LINKS.support)}">hello@moneko.io</a>.</p>
    <p class="muted">The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "This email was sent to you because you joined our mobile app waitlist.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject("Welcome to the Moneko Mobile Public Beta!"),
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
    // Expiring soon - urgent
    title = "Your Invitation is Expiring Soon";
    subtitle = `${escapeHtml(inviteePerson)} hasn't joined ${escapeHtml(data.householdName)} yet, and your invitation expires in 2 days.`;
  } else {
    // Tier 1 - gentle reminder
    title = "Pending Invitation";
    subtitle = `${escapeHtml(inviteePerson)} hasn't joined ${escapeHtml(data.householdName)} yet.`;
  }

  const content = `
    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <p>You invited ${escapeHtml(inviteePerson)} to join ${escapeHtml(data.householdName)} ${timeText}.</p>
    ${
      data.reminderTier === 3
        ? `<p><strong>Action suggested:</strong> You might want to follow up with them directly or resend the invitation link.</p>`
        : `<p>They may have missed the email or need a gentle reminder. Feel free to reach out to them directly!</p>`
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
        : `${data.inviteeName || "Your invitee"} hasn't joined ${data.householdName} yet`,
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
  const greeting = data.inviteeName
    ? `Hi ${escapeHtml(data.inviteeName)}`
    : "Hi there";

  let title: string;
  let subtitle: string;
  let bodyMessage: string;

  if (data.reminderTier === 3) {
    // Tier 3: Expiring soon - urgency
    title = "Last Chance: Your Invitation Expires in 2 Days";
    subtitle = `${escapeHtml(data.inviterName)} invited you to join ${escapeHtml(data.householdName)} on Moneko.`;
    bodyMessage = `Your invitation expires in ${data.daysUntilExpiry || 2} days. Don't miss out on tracking expenses and budgets together with ${escapeHtml(data.inviterName)}!`;
  } else if (data.reminderTier === 2) {
    // Tier 2: Follow-up reminder - stronger nudge with benefits
    title = `Don't Miss Out: Join ${escapeHtml(data.householdName)} on Moneko`;
    subtitle = `${escapeHtml(data.inviterName)} is waiting for you to join.`;
    bodyMessage = `It's been ${data.daysSinceInvite} days since ${escapeHtml(data.inviterName)} invited you. Together, you can track shared expenses, set budgets, and stay on top of your finances effortlessly.`;
  } else {
    // Tier 1: Gentle reminder
    title = `${escapeHtml(data.inviterName)} invited you to join ${escapeHtml(data.householdName)}`;
    subtitle = "Start tracking finances together on Moneko.";
    bodyMessage = `${escapeHtml(data.inviterName)} sent you an invitation ${data.daysSinceInvite} days ago. Join ${escapeHtml(data.householdName)} to start collaborating on budgets and expenses.`;
  }

  const content = `
    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <p>${greeting},</p>
    <p>${bodyMessage}</p>
    ${data.personalMessage ? `<p><strong>Personal message from ${escapeHtml(data.inviterName)}:</strong></p><p><em>"${escapeHtml(data.personalMessage)}"</em></p>` : ""}
    ${renderButton("Accept Invitation", sanitizeUrl(data.inviteUrl))}
    <p><strong>Why join a space on Moneko?</strong></p>
    <ul>
      <li>Track shared expenses with ease</li>
      <li>Set and monitor budgets together</li>
      <li>Split bills fairly and settle up instantly</li>
      <li>Stay synced on household finances</li>
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
        ? `Last chance: Your invitation to ${data.householdName} expires in 2 days`
        : data.reminderTier === 2
          ? `Don't miss out: Join ${data.householdName} on Moneko`
          : `${data.inviterName} invited you to join ${data.householdName} on Moneko`,
    ),
  };
};
