import { htmlToText } from 'https://esm.sh/html-to-text@9.0.5';

// Apple-inspired base template with Moneko design system
const baseTemplate = (content: string, footerContent?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Moneko</title>
  <style>
    /* Reset & mobile optimization */
    body, html {
      margin: 0;
      padding: 0;
      background-color: #f9f9fb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111;
    }
    table {
      border-spacing: 0;
      width: 100%;
    }
    img {
      border: none;
      max-width: 100%;
      display: block;
    }
    a {
      color: #7458FF;
      text-decoration: none;
    }
    /* Container */
    .email-body {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      padding: 48px 40px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    }
    /* Logo */
    .logo {
      margin: 0 auto 32px auto;
      width: 100px;
      height: auto;
    }
    /* Typography */
    .title {
      font-size: 28px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #111;
      line-height: 1.3;
    }
    .subtitle {
      font-size: 16px;
      color: #555;
      margin: 0 0 32px 0;
      line-height: 1.5;
    }
    p {
      font-size: 16px;
      color: #333;
      margin: 0 0 16px 0;
      line-height: 1.6;
    }
    ul {
      margin: 16px 0;
      padding-left: 24px;
    }
    li {
      font-size: 16px;
      color: #333;
      margin-bottom: 8px;
      line-height: 1.6;
    }
    strong {
      font-weight: 600;
      color: #111;
    }
    /* Button */
    .button {
      display: inline-block;
      background-color: #7458FF !important;
      color: #ffffff !important;
      padding: 14px 28px;
      border-radius: 9999px;
      font-weight: 500;
      font-size: 16px;
      text-decoration: none !important;
      margin: 24px 0;
      transition: opacity 0.2s ease-in-out;
    }
    .button:hover {
      opacity: 0.9;
      color: #ffffff !important;
    }
    .button:visited {
      color: #ffffff !important;
    }
    .button:active {
      color: #ffffff !important;
    }
    /* Footer */
    .footer {
      margin-top: 48px;
      font-size: 12px;
      color: #999;
      text-align: center;
      line-height: 1.5;
    }
    .footer p {
      font-size: 12px;
      color: #999;
      margin: 8px 0;
    }
    .footer a {
      color: #7458FF;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <table>
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <div class="email-body">
          <img src="https://moneko.io/logo192.png" alt="Moneko" class="logo" />
          ${content}
          <div class="footer">
            ${footerContent || `
              <p>&copy; 2025 Moneko. All rights reserved.</p>
              <p>You're receiving this email because you joined Moneko.</p>
            `}
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Subscription created email template
export const subscriptionCreatedTemplate = (data: {
  name: string;
  planName: string;
  endDate?: string; // Optional for Lifetime (no renewal)
  dashboardUrl: string;
  isLifetime?: boolean;
}) => {
  const subscriptionMessage = data.isLifetime
    ? `You now have lifetime access to all premium features — no renewals, no recurring charges.`
    : `Your subscription is now active and will automatically renew on ${data.endDate}.`;

  const content = `
    <h1 class="title">Welcome to ${data.planName}</h1>
    <p class="subtitle">Thank you for joining Moneko. ${subscriptionMessage}</p>
    <p>You now have full access to all premium features included in your plan.</p>
    <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Go to Dashboard</a>
    <p>If you have any questions, our support team is here to help.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Welcome to Moneko ${data.planName}`,
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
  let title, subtitle;
  
  if (data.changeType === 'upgrade') {
    title = 'Your Subscription Has Been Upgraded';
    subtitle = `You've successfully upgraded to the ${data.planName} plan.`;
  } else if (data.changeType === 'downgrade') {
    title = 'Your Subscription Has Been Changed';
    subtitle = `Your subscription has been changed to the ${data.planName} plan.`;
  } else if (data.changeType === 'interval_changed') {
    title = 'Your Billing Cycle Has Been Updated';
    subtitle = `Your ${data.planName} subscription billing cycle has been updated.`;
  } else {
    title = 'Your Subscription Has Been Renewed';
    subtitle = `Your ${data.planName} subscription has been successfully renewed.`;
  }
  
  const content = `
    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <p>Your subscription will automatically renew on ${data.endDate}.</p>
    <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Go to Dashboard</a>
    <p>If you have any questions, our support team is here to help.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: title,
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
    subtitle = `Your ${data.planName} subscription is no longer active.`;
  } else {
    subtitle = `Your ${data.planName} subscription will remain active until ${data.endDate}.`;
  }
  
  const content = `
    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>
    <p>We're sorry to see you go. If you change your mind, you can resubscribe anytime.</p>
    <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Manage Membership</a>
    <p>We'd love to hear your feedback about why you canceled. Your input helps us improve.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: title,
  };
};

// Payment failed email template
export const paymentFailedTemplate = (data: {
  name: string;
  planName: string;
  dashboardUrl: string;
  updatePaymentUrl: string;
}) => {
  const content = `
    <h1 class="title">Payment Failed</h1>
    <p class="subtitle">We were unable to process your payment for the ${data.planName} subscription.</p>
    <p>Please update your payment method to avoid any interruption to your service.</p>
    <a href="${data.updatePaymentUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Update Payment Method</a>
    <p>If you need assistance, our support team is here to help.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Action Required — Payment Failed`,
  };
};

// Subscription trial ending email template
export const trialEndingTemplate = (data: {
  name: string;
  planName: string;
  trialEndDate: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Your Trial Period Ends Soon</h1>
    <p class="subtitle">Your ${data.planName} trial will end on ${data.trialEndDate}.</p>
    <p>To continue enjoying all the benefits without interruption, please ensure your payment method is up to date.</p>
    <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Manage Membership</a>
    <p>If you have any questions, our support team is here to help.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Your Moneko Trial Ends Soon`,
  };
};

// Welcome email template for new users
export const welcomeTemplate = (data: {
  name: string;
  email: string;
  dashboardUrl: string;
  gettingStartedUrl?: string;
}) => {
  const content = `
    <h1 class="title">Welcome to Moneko</h1>
    <p class="subtitle">We're excited to help you take control of your financial future.</p>
    <p>Your account has been successfully created with the email: <strong>${data.email}</strong></p>
    <p>Here's what you can do to get started:</p>
    <ul>
      <li>Set up your financial goals</li>
      <li>Connect your accounts for automatic tracking</li>
      <li>Explore our budgeting tools</li>
      <li>Review personalized insights</li>
    </ul>
    <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Get Started</a>
    ${data.gettingStartedUrl ? `<p>Need help? Check out our <a href="${data.gettingStartedUrl}">Getting Started Guide</a>.</p>` : ''}
    <p>If you have any questions, our support team is here to help.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: 'Welcome to Moneko',
  };
};

// Email verification template
export const emailVerificationTemplate = (data: {
  name: string;
  verificationUrl: string;
  expiryHours?: number;
}) => {
  const expiryText = data.expiryHours ? ` within ${data.expiryHours} hours` : '';
  
  const content = `
    <h1 class="title">Verify Your Email Address</h1>
    <p class="subtitle">To complete your registration, please verify your email address.</p>
    <p>Click the button below to activate your account and start using Moneko:</p>
    <a href="${data.verificationUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Verify Email Address</a>
    <p>Please verify your email${expiryText} to activate your account.</p>
    <p>If you didn't create this account, you can safely ignore this email.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: 'Verify Your Moneko Account',
  };
};

// Password reset template
export const passwordResetTemplate = (data: {
  name: string;
  resetUrl: string;
  expiryHours?: number;
}) => {
  const expiryText = data.expiryHours ? ` This link will expire in ${data.expiryHours} hours.` : '';
  
  const content = `
    <h1 class="title">Reset Your Password</h1>
    <p class="subtitle">We received a request to reset your password for your Moneko account.</p>
    <p>Click the button below to create a new password:</p>
    <a href="${data.resetUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Reset Password</a>
    <p>${expiryText}</p>
    <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    <p>For security reasons, this link can only be used once.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: 'Reset Your Moneko Password',
  };
};

// Newsletter subscription confirmation
export const newsletterSubscriptionTemplate = (data: {
  email: string;
  unsubscribeUrl: string;
}) => {
  const content = `
    <h1 class="title">Newsletter Subscription Confirmed</h1>
    <p class="subtitle">Thank you for subscribing to the Moneko newsletter.</p>
    <p>You'll now receive our latest financial tips, product updates, and insights at <strong>${data.email}</strong>.</p>
    <p>We promise to keep your inbox valuable with actionable content.</p>
    <p>You can <a href="${data.unsubscribeUrl}">unsubscribe</a> at any time.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: 'Welcome to the Moneko Newsletter',
  };
};

// Newsletter unsubscribe confirmation
export const newsletterUnsubscribeTemplate = (data: {
  email: string;
  resubscribeUrl?: string;
}) => {
  const content = `
    <h1 class="title">You've Been Unsubscribed</h1>
    <p class="subtitle">We've successfully unsubscribed <strong>${data.email}</strong> from the Moneko newsletter.</p>
    <p>We're sorry to see you go. Your email address has been removed from our mailing list.</p>
    ${data.resubscribeUrl ? `<p>Changed your mind? You can <a href="${data.resubscribeUrl}">resubscribe here</a>.</p>` : ''}
    <p>If you have any feedback about why you unsubscribed, we'd love to hear from you.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: 'Unsubscribed from Moneko Newsletter',
  };
};

// Account security alert template
export const securityAlertTemplate = (data: {
  name: string;
  alertType: 'login' | 'password_change' | 'email_change' | 'suspicious_activity';
  timestamp: string;
  location?: string;
  ipAddress?: string;
  dashboardUrl: string;
  supportUrl?: string;
}) => {
  let title, subtitle;
  
  switch (data.alertType) {
    case 'login':
      title = 'New Login to Your Account';
      subtitle = `We detected a new login to your Moneko account on ${data.timestamp}.`;
      break;
    case 'password_change':
      title = 'Password Changed Successfully';
      subtitle = `Your Moneko account password was changed on ${data.timestamp}.`;
      break;
    case 'email_change':
      title = 'Email Address Changed';
      subtitle = `Your Moneko account email address was changed on ${data.timestamp}.`;
      break;
    case 'suspicious_activity':
      title = 'Suspicious Activity Detected';
      subtitle = `We detected suspicious activity on your Moneko account on ${data.timestamp}.`;
      break;
  }
  
  const locationInfo = data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : '';
  const ipInfo = data.ipAddress ? `<p><strong>IP Address:</strong> ${data.ipAddress}</p>` : '';
  
  const content = `
    <h1 class="title">${title}</h1>
    <p class="subtitle">${subtitle}</p>
    ${locationInfo}
    ${ipInfo}
    <p>If this was you, no further action is needed.</p>
    <p>If you don't recognize this activity, please secure your account immediately:</p>
    <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Secure My Account</a>
    ${data.supportUrl ? `<p>If you need help, please <a href="${data.supportUrl}">contact our support team</a>.</p>` : ''}
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Moneko Security Alert — ${title}`,
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
    <h1 class="title">${data.title}</h1>
    <p class="subtitle">${data.message}</p>
    ${data.actionUrl && data.actionText ? `<a href="${data.actionUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">${data.actionText}</a>` : ''}
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `${data.title}`,
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
    <p class="subtitle">You've successfully completed the <strong>${data.courseName}</strong> course on ${data.completionDate}.</p>
    <p>You've taken an important step in your financial education journey. We're proud of your dedication to learning.</p>
    ${data.certificateUrl ? `<a href="${data.certificateUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Download Certificate</a>` : ''}
    ${data.nextCourseUrl ? `<p>Ready for your next challenge? <a href="${data.nextCourseUrl}">Check out recommended courses</a> to continue your learning journey.</p>` : ''}
    <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">View Dashboard</a>
    <p>Keep up the great work.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Course Completed — ${data.courseName}`,
  };
};

// Invoice finalized template (invoice ready for payment or viewing)
export const invoiceFinalizedTemplate = (data: {
  name: string;
  planName: string;
  amount: string;
  currency: string;
  invoiceUrl: string;
  invoicePdfUrl?: string;
  dueDate?: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Your Invoice is Ready</h1>
    <p class="subtitle">Your invoice for ${data.planName} subscription is now ready.</p>
    <p><strong>Amount:</strong> ${data.amount} ${data.currency.toUpperCase()}</p>
    ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
    <a href="${data.invoiceUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">View Invoice</a>
    ${data.invoicePdfUrl ? `<p>You can also <a href="${data.invoicePdfUrl}">download the PDF version</a>.</p>` : ''}
    <p>If you have automatic payments enabled, your payment method will be charged automatically.</p>
    <p>If you have any questions about this invoice, our support team is here to help.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Invoice Ready — ${data.planName}`,
  };
};

// Invoice upcoming template (renewal reminder)
export const invoiceUpcomingTemplate = (data: {
  name: string;
  planName: string;
  amount: string;
  currency: string;
  chargeDate: string;
  daysUntil: number;
  dashboardUrl: string;
  updatePaymentUrl?: string;
}) => {
  const urgencyMessage = data.daysUntil <= 3
    ? `Your subscription will renew in ${data.daysUntil} ${data.daysUntil === 1 ? 'day' : 'days'}.`
    : `Your subscription will renew soon.`;

  const content = `
    <h1 class="title">Upcoming Subscription Renewal</h1>
    <p class="subtitle">${urgencyMessage}</p>
    <p><strong>Plan:</strong> ${data.planName}</p>
    <p><strong>Amount:</strong> ${data.amount} ${data.currency.toUpperCase()}</p>
    <p><strong>Charge Date:</strong> ${data.chargeDate}</p>
    <p>Your payment method on file will be charged automatically on this date.</p>
    ${data.updatePaymentUrl ? `
    <p>If you need to update your payment method, please do so before the charge date:</p>
    <a href="${data.updatePaymentUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Update Payment Method</a>
    ` : ''}
    <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Manage Subscription</a>
    <p>If you want to make changes to your subscription or cancel, please do so before the renewal date.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Upcoming Renewal — ${data.planName}`,
  };
};

// Payment action required template (3DS authentication needed)
export const paymentActionRequiredTemplate = (data: {
  name: string;
  planName: string;
  amount: string;
  currency: string;
  authenticationUrl: string;
  expiryHours?: number;
  dashboardUrl: string;
}) => {
  const expiryText = data.expiryHours
    ? ` Please complete authentication within ${data.expiryHours} hours to avoid subscription interruption.`
    : '';

  const content = `
    <h1 class="title">Action Required — Authenticate Your Payment</h1>
    <p class="subtitle">We need you to authenticate your payment for the ${data.planName} subscription.</p>
    <p><strong>Amount:</strong> ${data.amount} ${data.currency.toUpperCase()}</p>
    <p>Your bank requires additional verification (3D Secure) to complete this payment.</p>
    <a href="${data.authenticationUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">Authenticate Payment</a>
    <p>${expiryText}</p>
    <p>This is a security measure to protect you from unauthorized transactions. The authentication process is quick and secure.</p>
    <p>If you don't recognize this charge, please <a href="${data.dashboardUrl}">review your subscription</a> immediately.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Action Required — Authenticate Your Payment`,
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
    <p><strong>New Payment Method:</strong> ${data.paymentMethodDetails || data.paymentMethodType}</p>
    <p>This payment method will be used for all future charges on your account.</p>
    <a href="${data.dashboardUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">View Payment Methods</a>
    <p>If you didn't make this change, please <a href="${data.dashboardUrl}">review your account</a> immediately and contact our support team.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: 'Payment Method Updated Successfully',
  };
};

// Invoice payment succeeded template (payment receipt with invoice PDF)
export const invoicePaymentSucceededTemplate = (data: {
  name: string;
  planName: string;
  amount: string;
  currency: string;
  invoiceNumber: string;
  paymentDate: string;
  invoiceUrl: string;
  invoicePdfUrl?: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1 class="title">Payment Received — Thank You</h1>
    <p class="subtitle">We've successfully received your payment for ${data.planName}.</p>
    <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
    <p><strong>Amount Paid:</strong> ${data.amount} ${data.currency.toUpperCase()}</p>
    <p><strong>Payment Date:</strong> ${data.paymentDate}</p>
    <a href="${data.invoiceUrl}" class="button" style="display: inline-block; background-color: #7458FF !important; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; font-weight: 500; font-size: 16px; text-decoration: none !important; margin: 24px 0;">View Invoice</a>
    ${data.invoicePdfUrl ? `<p>You can also <a href="${data.invoicePdfUrl}">download your receipt (PDF)</a> for your records.</p>` : ''}
    <p>This receipt confirms your payment has been processed successfully. Your subscription remains active and you continue to have full access to all premium features.</p>
    <p><a href="${data.dashboardUrl}">Manage Your Subscription</a></p>
    <p>If you have any questions about this payment, our support team is here to help.</p>
    <p>Thank you for being a valued member.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Payment Receipt — Invoice ${data.invoiceNumber}`,
  };
};
