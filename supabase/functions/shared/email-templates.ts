// Email templates for Moneko
import { baseTemplate, renderButton, renderFooter, testFlightCtaHtml } from './email-layout.ts';
import { htmlToText } from './email-html-to-text.ts';
import { escapeHtml, sanitizeSubject, formatDate, formatCurrency, pluralize } from './email-utils.ts';
import { sanitizeUrl, LINKS } from './email-security.ts';

// Subscription created email template
export const subscriptionCreatedTemplate = (data: {
  name: string;
  planName: string;
  endDate?: string; // Optional for Lifetime (no renewal)
  dashboardUrl: string;
  isLifetime?: boolean;
}) => {
  const subscriptionMessage = data.isLifetime
    ? 'You now have lifetime access to all premium features — no renewals, no recurring charges.'
    : data.endDate 
      ? `Your subscription is now active and will automatically renew on ${formatDate(data.endDate)}.`
      : 'Your subscription is now active.';

  const content = `
    <h1 class="title">Welcome to ${escapeHtml(data.planName)}</h1>
    <p class="subtitle">Thank you for joining Moneko. ${escapeHtml(subscriptionMessage)}</p>
    <p>You now have full access to all premium features included in your plan.</p>
    ${testFlightCtaHtml()}
    <p>If you have any questions, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because you subscribed to Moneko.' })),
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
  changeType: 'upgrade' | 'downgrade' | 'renewal' | 'interval_changed';
}) => {
  const title = data.changeType === 'upgrade' ? 'Your Subscription Has Been Upgraded' :
                data.changeType === 'downgrade' ? 'Your Subscription Has Been Changed' :
                data.changeType === 'interval_changed' ? 'Your Billing Interval Has Changed' :
                'Your Subscription Has Been Renewed';
  
  const subtitle = data.changeType === 'upgrade' ? `You've been upgraded to ${escapeHtml(data.planName)}.` :
                   data.changeType === 'downgrade' ? `Your plan has been changed to ${escapeHtml(data.planName)}.` :
                   data.changeType === 'interval_changed' ? `Your billing interval is now ${escapeHtml(data.planName)}.` :
                   `Your ${escapeHtml(data.planName)} subscription has been renewed.`;

  const content = `
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    <p>Your subscription will automatically renew on ${formatDate(data.endDate)}.</p>
    ${renderButton('Manage Subscription', sanitizeUrl(data.dashboardUrl))}
    ${testFlightCtaHtml()}
    <p>If you have any questions, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because your subscription was updated.' })),
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
    ${renderButton('Resubscribe', sanitizeUrl(data.dashboardUrl))}
    ${testFlightCtaHtml()}
    <p>We'd love to hear your feedback about why you canceled. Your input helps us improve.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because your subscription was canceled.' })),
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
    ${data.isDowngraded ? 
      `<p><strong>Important:</strong> Your account has been downgraded to the free plan due to the payment failure.</p>` : 
      `<p><strong>Warning:</strong> Your subscription will be downgraded if payment is not updated soon.</p>`}
    ${data.updatePaymentUrl ? renderButton('Update Payment Method', sanitizeUrl(data.updatePaymentUrl)) : ''}
    ${data.resubscribeUrl ? renderButton('Resubscribe', sanitizeUrl(data.resubscribeUrl)) : ''}
    ${renderButton('Manage Membership', sanitizeUrl(data.dashboardUrl))}
    <p>If you believe this is an error, please contact our support team for assistance.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because your subscription payment failed.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Payment Failed — Action Required'),
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
    ${renderButton('Manage Membership', sanitizeUrl(data.dashboardUrl))}
    <p>If you have any questions, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because your free trial is ending soon.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Your Moneko Trial Ends Soon'),
  };
};

// Referral accepted email template (to referrer)
export const referralAcceptedTemplate = (data: {
  referrerName: string
  refereeName: string
}) => {
  const content = `
    <h1 class="title">Your Friend Joined Moneko 🎉</h1>
    <p class="subtitle">Hi ${escapeHtml(data.referrerName)}, your friend ${data.refereeName ? escapeHtml(data.refereeName)+" " : ''}has accepted your invitation and joined Moneko!</p>
    <p>Thank you for helping grow our community. Your support means a lot to us.</p>
    ${renderButton('Download on TestFlight', sanitizeUrl(LINKS.testflight), 'apple')}
    <p>Keep sharing the love - you'll earn rewards for each friend who subscribes to a premium plan.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because your friend accepted your Moneko invitation.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Your Friend Accepted Your Moneko Invitation!'),
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
    <p class="subtitle">Hi ${escapeHtml(data.name)}, thanks for joining Moneko through ${escapeHtml(data.referrerName)}'s invitation!</p>
    <p>You're all set up and ready to start your financial journey with us. We're excited to have you on board!</p>
    ${renderButton('Go to Dashboard', sanitizeUrl(data.dashboardUrl))}
    ${testFlightCtaHtml()}
    <p>If you have any questions getting started, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because you joined Moneko through a referral invitation.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Welcome to Moneko!'),
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
    ${renderButton('Go to Dashboard', sanitizeUrl(data.dashboardUrl))}
    ${testFlightCtaHtml()}
    <p>If you have any questions getting started, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because you successfully verified your Moneko account.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Welcome to Moneko!'),
  };
};

// Email verification template
export const emailVerificationTemplate = (data: {
  name: string;
  verificationUrl: string;
}) => {
  const content = `
    <h1 class="title">Verify Your Email Address</h1>
    <p class="subtitle">Hi ${escapeHtml(data.name)}, please verify your email address to complete your Moneko account setup.</p>
    <p>Click the button below to confirm your email address and activate your account:</p>
    ${renderButton('Verify Email', sanitizeUrl(data.verificationUrl))}
    <p>This verification link will expire in 24 hours for security reasons.</p>
    <p>If you didn't create a Moneko account, you can safely ignore this email.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email to verify your email address.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Verify Your Moneko Account'),
  };
};

// Password reset template
export const passwordResetTemplate = (data: {
  name: string;
  resetUrl: string;
  expiryHours?: number;
}) => {
  const expiryText = data.expiryHours ? ` This link will expire in ${data.expiryHours} ${pluralize(data.expiryHours, 'hour')}.` : '';
  
  const content = `
    <h1 class="title">Reset Your Password</h1>
    <p class="subtitle">We received a request to reset your password for your Moneko account.</p>
    <p>Click the button below to create a new password:</p>
    ${renderButton('Reset Password', sanitizeUrl(data.resetUrl))}
    <p>${escapeHtml(expiryText)}</p>
    <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    <p>For security reasons, this link can only be used once.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because a password reset was requested for your account.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Reset Your Moneko Password'),
  };
};

// Newsletter subscription confirmation template
export const newsletterSubscribeTemplate = (data: {
  name: string;
  email: string;
}) => {
  const content = `
    <h1 class="title">Welcome to the Moneko Newsletter</h1>
    <p class="subtitle">Hi ${escapeHtml(data.name)}, thanks for subscribing to our newsletter!</p>
    <p>You'll now receive regular updates about new features, financial tips, and exclusive content from the Moneko team.</p>
    <p>We're excited to share our journey with you and help you achieve your financial goals.</p>
    ${renderButton('Explore Features', sanitizeUrl(LINKS.dashboard))}
    <p>If you didn't subscribe to this newsletter, you can unsubscribe at any time using the link below.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because you subscribed to the Moneko newsletter.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Welcome to the Moneko Newsletter'),
  };
};

// Newsletter unsubscribe confirmation template
export const newsletterUnsubscribeTemplate = (data: {
  email: string;
}) => {
  const content = `
    <h1 class="title">You've Been Unsubscribed</h1>
    <p class="subtitle">You've been successfully removed from the Moneko newsletter mailing list.</p>
    <p>We're sorry to see you go. If you change your mind, you can always resubscribe from your account settings.</p>
    <p>Thank you for being part of our community. We wish you the best on your financial journey.</p>
    ${renderButton('Manage Account', sanitizeUrl(LINKS.dashboard))}
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because you unsubscribed from the Moneko newsletter.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Unsubscribed from Moneko Newsletter'),
  };
};

// Security alert template
export const securityAlertTemplate = (data: {
  name: string;
  alertType: 'login' | 'password_change' | 'email_change' | 'suspicious_activity';
  location?: string;
  ipAddress?: string;
  timestamp: string;
  dashboardUrl: string;
  supportUrl?: string;
}) => {
  const title = data.alertType === 'login' ? 'New Login Detected' :
                data.alertType === 'password_change' ? 'Password Changed' :
                data.alertType === 'email_change' ? 'Email Address Changed' :
                'Suspicious Activity Detected';
  
  const subtitle = data.alertType === 'login' ? 'We detected a new login to your Moneko account.' :
                   data.alertType === 'password_change' ? 'Your password was successfully changed.' :
                   data.alertType === 'email_change' ? 'Your email address was successfully changed.' :
                   'We detected suspicious activity on your account.';
  
  const content = `
    <h1 class="title">${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    ${data.location ? `<p><strong>Location:</strong> ${escapeHtml(data.location)}</p>` : ''}
    ${data.ipAddress ? `<p><strong>IP Address:</strong> ${escapeHtml(data.ipAddress)}</p>` : ''}
    ${data.timestamp ? `<p><strong>Time:</strong> ${formatDate(data.timestamp)}</p>` : ''}
    ${data.alertType === 'login' ? 
      `<p>If this was you, no further action is needed.</p>
       <p>If you don't recognize this activity, please secure your account immediately:</p>
       ${renderButton('Secure My Account', sanitizeUrl(data.dashboardUrl))}
       ${data.supportUrl ? `<p>If you need help, please <a href="${sanitizeUrl(data.supportUrl)}">contact our support team</a>.</p>` : ''}` :
      `<p>If this was you, no further action is needed.</p>
       <p>If you don't recognize this activity, please contact support immediately.</p>`}
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because of security activity on your account.' })),
    text: htmlToText(content),
    subject: sanitizeSubject(`Moneko Security Alert — ${title}`),
  };
};

// General notification template
export const notificationTemplate = (data: {
  name: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  priority?: 'low' | 'medium' | 'high';
}) => {
  
  const content = `
    <h1 class="title">${escapeHtml(data.title)}</h1>
    <p class="subtitle">${escapeHtml(data.message)}</p>
    ${data.actionUrl && data.actionText ? renderButton(escapeHtml(data.actionText), sanitizeUrl(data.actionUrl)) : ''}
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email as a notification from Moneko.' })),
    text: htmlToText(content),
    subject: sanitizeSubject(data.title),
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
    ${data.certificateUrl ? renderButton('Download Certificate', sanitizeUrl(data.certificateUrl)) : ''}
    ${data.nextCourseUrl ? `<p>Ready for your next challenge? <a href="${sanitizeUrl(data.nextCourseUrl)}">Check out recommended courses</a> to continue your learning journey.</p>` : ''}
    ${testFlightCtaHtml()}
    <p>Keep up the great work.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because you completed a course.' })),
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
    ${data.dueDate ? `<p><strong>Due Date:</strong> ${formatDate(data.dueDate)}</p>` : ''}
    ${renderButton('View Invoice', sanitizeUrl(data.invoiceUrl))}
    ${data.invoicePdfUrl ? `<p>You can also <a href="${sanitizeUrl(data.invoicePdfUrl)}">download the PDF version</a>.</p>` : ''}
    <p>If you have automatic payments enabled, your payment method will be charged automatically.</p>
    <p>If you have any questions about this invoice, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because an invoice is ready for your subscription.' })),
    text: htmlToText(content),
    subject: sanitizeSubject(`Invoice Ready — ${data.planName}`),
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
  const urgencyText = data.daysUntil <= 3 ? 'soon' : `in ${data.daysUntil} days`;
  
  const content = `
    <h1 class="title">Upcoming Subscription Renewal</h1>
    <p class="subtitle">Your ${escapeHtml(data.planName)} subscription will renew ${urgencyText}.</p>
    <p><strong>Amount:</strong> ${formatCurrency(data.amount, data.currency)}</p>
    <p><strong>Renewal Date:</strong> ${formatDate(data.chargeDate)}</p>
    <p>Your subscription will automatically renew on this date. The payment method on file will be charged.</p>
    ${data.updatePaymentUrl && data.daysUntil <= 7 ? 
      `<p>Please ensure your payment method is up to date to avoid any interruption in service.</p>
       ${renderButton('Update Payment Method', sanitizeUrl(data.updatePaymentUrl))}
       ` : ''}
    ${renderButton('Manage Subscription', sanitizeUrl(data.dashboardUrl))}
    <p>If you want to make changes to your subscription or cancel, please do so before the renewal date.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because your subscription is renewing soon.' })),
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
    ? ` Please complete authentication within ${data.expiryHours} ${pluralize(data.expiryHours, 'hour')} to avoid subscription interruption.`
    : '';

  const content = `
    <h1 class="title">Action Required — Authenticate Your Payment</h1>
    <p class="subtitle">We need you to authenticate your payment for the ${escapeHtml(data.planName)} subscription.</p>
    <p><strong>Amount:</strong> ${formatCurrency(data.amount, data.currency)}</p>
    <p>Your bank requires additional verification (3D Secure) to complete this payment.</p>
    ${renderButton('Authenticate Payment', sanitizeUrl(data.authenticationUrl))}
    <p>${escapeHtml(expiryText)}</p>
    <p>This is a security measure to protect you from unauthorized transactions. The authentication process is quick and secure.</p>
    <p>If you don't recognize this charge, please <a href="${sanitizeUrl(data.dashboardUrl)}">review your subscription</a> immediately.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because payment authentication is required.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Action Required — Authenticate Your Payment'),
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
    ${data.paymentMethodDetails ? `<p><strong>Details:</strong> ${escapeHtml(data.paymentMethodDetails)}</p>` : ''}
    <p>Your new payment method will be used for future subscription renewals.</p>
    ${renderButton('Manage Payment Methods', sanitizeUrl(data.dashboardUrl))}
    <p>If you didn't make this change, please contact our support team immediately.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because your payment method was updated.' })),
    text: htmlToText(content),
    subject: sanitizeSubject('Payment Method Updated Successfully'),
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
  const urgencyText = data.daysUntil <= 7 ? 'soon' : `in ${data.daysUntil} days`;
  
  const content = `
    <h1 class="title">Your Discount is Expiring</h1>
    <p class="subtitle">Your ${data.discountPercent}% discount expires ${urgencyText}.</p>
    <p>Don't miss out on your special pricing! Add a payment method to lock in your discount before it expires.</p>
    <p><strong>Discount Amount:</strong> ${data.discountPercent}% off</p>
    <p><strong>Expires:</strong> ${formatDate(data.expiryDate)}</p>
    ${renderButton('Add Payment Method', sanitizeUrl(data.dashboardUrl))}
    <p><strong>What happens if you don't add a payment method?</strong></p>
    <p>After ${formatDate(data.expiryDate)}, if no payment method is on file, your account will be automatically downgraded to our free plan. You can always resubscribe later from your membership dashboard.</p>
    ${renderButton('Manage Membership', sanitizeUrl(data.dashboardUrl))}
    <p>Thank you for being part of Moneko. We hope you continue your premium experience.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because your promotional discount is expiring.' })),
    text: htmlToText(content),
    subject: sanitizeSubject(`Action Needed — Your Moneko Discount Expires ${data.daysUntil <= 7 ? 'Soon' : `in ${data.daysUntil} days`}`),
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
    ${renderButton('View Invoice', sanitizeUrl(data.invoiceUrl))}
    ${data.invoicePdfUrl ? `<p>You can also <a href="${sanitizeUrl(data.invoicePdfUrl)}">download your receipt (PDF)</a> for your records.</p>` : ''}
    <p>This receipt confirms your payment has been processed successfully. Your subscription remains active and you continue to have full access to all premium features.</p>
    <p><a href="${sanitizeUrl(data.dashboardUrl)}">Manage Your Subscription</a></p>
    <p>If you have any questions about this payment, just reply to this email and our support team will help you out.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content, renderFooter({ customReason: 'You\'re receiving this email because your payment was processed successfully.' })),
    text: htmlToText(content),
    subject: sanitizeSubject(`Payment Received — ${data.planName}`),
  };
};
