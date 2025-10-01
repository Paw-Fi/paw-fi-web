import { htmlToText } from 'https://esm.sh/html-to-text@9.0.5';

// Base template with common elements
const baseTemplate = (content: string, footerContent?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moneko</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      max-width: 150px;
      margin-bottom: 20px;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border-radius: 8px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(to right, #6d28d9, #4f46e5);
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://moneko.io/logo192.png" alt="Moneko Logo" class="logo" />
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    ${footerContent || `
      <p>Moneko Inc., 123 Financial St., San Francisco, CA 94103</p>
      <p>This email was sent to {{email}}. <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    `}
  </div>
</body>
</html>
`;

// Subscription created email template
export const subscriptionCreatedTemplate = (data: {
  name: string;
  planName: string;
  endDate: string;
  dashboardUrl: string;
}) => {
  const content = `
    <h1>Welcome to ${data.planName}!</h1>
    <p>Hi ${data.name},</p>
    <p>Thank you for subscribing to our ${data.planName} plan. Your subscription is now active and will automatically renew on ${data.endDate}.</p>
    <p>You now have access to all the premium features included in your plan.</p>
    <p>
      <a href="${data.dashboardUrl}" class="button">View Your Membership</a>
    </p>
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
    <p>Happy financial planning!</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Welcome to Moneko ${data.planName}!`,
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
  let title, message;
  
  if (data.changeType === 'upgrade') {
    title = 'Your subscription has been upgraded!';
    message = `You've successfully upgraded to our ${data.planName} plan.`;
  } else if (data.changeType === 'downgrade') {
    title = 'Your subscription has been changed';
    message = `Your subscription has been changed to our ${data.planName} plan.`;
  } else if (data.changeType === 'interval_changed') {
    title = 'Your billing cycle has been updated';
    message = `Your ${data.planName} subscription billing cycle has been updated.`;
  } else {
    title = 'Your subscription has been renewed!';
    message = `Your ${data.planName} subscription has been successfully renewed.`;
  }
  
  const content = `
    <h1>${title}</h1>
    <p>Hi ${data.name},</p>
    <p>${message} Your subscription will automatically renew on ${data.endDate}.</p>
    <p>
      <a href="${data.dashboardUrl}" class="button">View Your Membership</a>
    </p>
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
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
  const title = "Your subscription has been canceled";
  let message;
  
  if (data.immediateCancel) {
    message = `Your ${data.planName} subscription has been canceled and is no longer active. We're sorry to see you go!`;
  } else {
    message = `Your ${data.planName} subscription has been canceled and will remain active until ${data.endDate}. After this date, you'll no longer have access to premium features.`;
  }
  
  const content = `
    <h1>${title}</h1>
    <p>Hi ${data.name},</p>
    <p>${message}</p>
    <p>We hope to welcome you back soon. If you change your mind, you can resubscribe anytime.</p>
    <p>
      <a href="${data.dashboardUrl}" class="button">Manage Your Membership</a>
    </p>
    <p>We'd love to know why you've decided to cancel. Your feedback helps us improve.</p>
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
    <h1>Payment Failed</h1>
    <p>Hi ${data.name},</p>
    <p>We were unable to process your payment for the ${data.planName} subscription.</p>
    <p>Please update your payment method to avoid any interruption to your service.</p>
    <p>
      <a href="${data.updatePaymentUrl}" class="button">Update Payment Method</a>
    </p>
    <p>If you need assistance, please contact our support team.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Action Required: Payment Failed for Your Moneko Subscription`,
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
    <h1>Your Trial Period is Ending Soon</h1>
    <p>Hi ${data.name},</p>
    <p>Your ${data.planName} trial period will end on ${data.trialEndDate}.</p>
    <p>To continue enjoying all the benefits of your subscription without interruption, please ensure your payment method is up to date.</p>
    <p>
      <a href="${data.dashboardUrl}" class="button">Manage Your Membership</a>
    </p>
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
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
    <h1>Welcome to Moneko!</h1>
    <p>Hi ${data.name},</p>
    <p>Welcome to Moneko, your personal finance companion! We're excited to help you take control of your financial future.</p>
    <p>Your account has been successfully created with the email: <strong>${data.email}</strong></p>
    <p>Here's what you can do to get started:</p>
    <ul>
      <li>Set up your financial goals</li>
      <li>Connect your accounts for automatic tracking</li>
      <li>Explore our budgeting tools</li>
      <li>Review personalized insights</li>
    </ul>
    <p>
      <a href="${data.dashboardUrl}" class="button">Get Started</a>
    </p>
    ${data.gettingStartedUrl ? `<p>Need help getting started? Check out our <a href="${data.gettingStartedUrl}">Getting Started Guide</a>.</p>` : ''}
    <p>If you have any questions, our support team is here to help!</p>
    <p>Happy financial planning!</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: 'Welcome to Moneko - Let\'s Get Started!',
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
    <h1>Verify Your Email Address</h1>
    <p>Hi ${data.name},</p>
    <p>Thank you for signing up with Moneko! To complete your registration, please verify your email address by clicking the button below:</p>
    <p>
      <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
    </p>
    <p>Please verify your email${expiryText} to activate your account and start using Moneko.</p>
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
    <h1>Reset Your Password</h1>
    <p>Hi ${data.name},</p>
    <p>We received a request to reset your password for your Moneko account.</p>
    <p>Click the button below to create a new password:</p>
    <p>
      <a href="${data.resetUrl}" class="button">Reset Password</a>
    </p>
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
    <h1>Newsletter Subscription Confirmed</h1>
    <p>Thank you for subscribing to the Moneko newsletter!</p>
    <p>You'll now receive our latest financial tips, product updates, and insights delivered to <strong>${data.email}</strong>.</p>
    <p>We promise to keep your inbox valuable with actionable content and never spam you.</p>
    <p>You can unsubscribe at any time by <a href="${data.unsubscribeUrl}">clicking here</a>.</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: 'Welcome to the Moneko Newsletter!',
  };
};

// Newsletter unsubscribe confirmation
export const newsletterUnsubscribeTemplate = (data: {
  email: string;
  resubscribeUrl?: string;
}) => {
  const content = `
    <h1>You've Been Unsubscribed</h1>
    <p>We've successfully unsubscribed <strong>${data.email}</strong> from the Moneko newsletter.</p>
    <p>We're sorry to see you go! Your email address has been removed from our mailing list.</p>
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
  let title, message;
  
  switch (data.alertType) {
    case 'login':
      title = 'New Login to Your Account';
      message = `We detected a new login to your Moneko account on ${data.timestamp}.`;
      break;
    case 'password_change':
      title = 'Password Changed Successfully';
      message = `Your Moneko account password was changed on ${data.timestamp}.`;
      break;
    case 'email_change':
      title = 'Email Address Changed';
      message = `Your Moneko account email address was changed on ${data.timestamp}.`;
      break;
    case 'suspicious_activity':
      title = 'Suspicious Activity Detected';
      message = `We detected suspicious activity on your Moneko account on ${data.timestamp}.`;
      break;
  }
  
  const locationInfo = data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : '';
  const ipInfo = data.ipAddress ? `<p><strong>IP Address:</strong> ${data.ipAddress}</p>` : '';
  
  const content = `
    <h1>${title}</h1>
    <p>Hi ${data.name},</p>
    <p>${message}</p>
    ${locationInfo}
    ${ipInfo}
    <p>If this was you, no further action is needed.</p>
    <p>If you don't recognize this activity, please secure your account immediately:</p>
    <p>
      <a href="${data.dashboardUrl}" class="button">Secure My Account</a>
    </p>
    ${data.supportUrl ? `<p>If you need help, please <a href="${data.supportUrl}">contact our support team</a>.</p>` : ''}
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Moneko Security Alert: ${title}`,
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
    <h1>${data.title}</h1>
    <p>Hi ${data.name},</p>
    <p>${data.message}</p>
    ${data.actionUrl && data.actionText ? `
    <p>
      <a href="${data.actionUrl}" class="button">${data.actionText}</a>
    </p>
    ` : ''}
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
    <h1>🎉 Congratulations on Completing Your Course!</h1>
    <p>Hi ${data.name},</p>
    <p>Well done! You've successfully completed the <strong>${data.courseName}</strong> course on ${data.completionDate}.</p>
    <p>You've taken an important step in your financial education journey. We're proud of your dedication to learning!</p>
    ${data.certificateUrl ? `
    <p>
      <a href="${data.certificateUrl}" class="button">Download Certificate</a>
    </p>
    ` : ''}
    ${data.nextCourseUrl ? `<p>Ready for your next challenge? <a href="${data.nextCourseUrl}">Check out recommended courses</a> to continue your learning journey.</p>` : ''}
    <p>
      <a href="${data.dashboardUrl}" class="button">View Dashboard</a>
    </p>
    <p>Keep up the great work!</p>
    <p>The Moneko Team</p>
  `;
  
  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `🎉 Course Completed: ${data.courseName}`,
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
    <h1>Your Invoice is Ready</h1>
    <p>Hi ${data.name},</p>
    <p>Your invoice for ${data.planName} subscription is now ready.</p>
    <p><strong>Amount:</strong> ${data.amount} ${data.currency.toUpperCase()}</p>
    ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
    <p>
      <a href="${data.invoiceUrl}" class="button">View Invoice</a>
    </p>
    ${data.invoicePdfUrl ? `<p>You can also <a href="${data.invoicePdfUrl}">download the PDF version</a>.</p>` : ''}
    <p>If you have automatic payments enabled, your payment method will be charged automatically.</p>
    <p>If you have any questions about this invoice, please don't hesitate to contact our support team.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Invoice Ready: ${data.planName} Subscription`,
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
    ? `Your subscription will renew in ${data.daysUntil} ${data.daysUntil === 1 ? 'day' : 'days'}!`
    : `Your subscription will renew soon.`;

  const content = `
    <h1>Upcoming Subscription Renewal</h1>
    <p>Hi ${data.name},</p>
    <p>${urgencyMessage}</p>
    <p><strong>Plan:</strong> ${data.planName}</p>
    <p><strong>Amount:</strong> ${data.amount} ${data.currency.toUpperCase()}</p>
    <p><strong>Charge Date:</strong> ${data.chargeDate}</p>
    <p>Your payment method on file will be charged automatically on this date.</p>
    ${data.updatePaymentUrl ? `
    <p>If you need to update your payment method, please do so before the charge date:</p>
    <p>
      <a href="${data.updatePaymentUrl}" class="button">Update Payment Method</a>
    </p>
    ` : ''}
    <p>
      <a href="${data.dashboardUrl}" class="button">Manage Subscription</a>
    </p>
    <p>If you want to make changes to your subscription or cancel, please do so before the renewal date.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Upcoming Renewal: ${data.planName} - ${data.chargeDate}`,
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
    <h1>Action Required: Authenticate Your Payment</h1>
    <p>Hi ${data.name},</p>
    <p>We need you to authenticate your payment for the ${data.planName} subscription.</p>
    <p><strong>Amount:</strong> ${data.amount} ${data.currency.toUpperCase()}</p>
    <p>Your bank requires additional verification (3D Secure) to complete this payment.</p>
    <p>
      <a href="${data.authenticationUrl}" class="button">Authenticate Payment</a>
    </p>
    <p>${expiryText}</p>
    <p>This is a security measure to protect you from unauthorized transactions. The authentication process is quick and secure.</p>
    <p>If you don't recognize this charge, please <a href="${data.dashboardUrl}">review your subscription</a> immediately.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: `Action Required: Authenticate Your Payment - ${data.planName}`,
  };
};

// Payment method updated confirmation template
export const paymentMethodUpdatedTemplate = (data: {
  name: string;
  paymentMethodType: string;
  last4?: string;
  brand?: string;
  dashboardUrl: string;
}) => {
  const methodDetails = data.brand && data.last4
    ? `${data.brand} ending in ${data.last4}`
    : data.paymentMethodType;

  const content = `
    <h1>Payment Method Updated</h1>
    <p>Hi ${data.name},</p>
    <p>Your payment method has been successfully updated.</p>
    <p><strong>New Payment Method:</strong> ${methodDetails}</p>
    <p>This payment method will be used for all future charges on your account.</p>
    <p>
      <a href="${data.dashboardUrl}" class="button">View Payment Methods</a>
    </p>
    <p>If you didn't make this change, please <a href="${data.dashboardUrl}">review your account</a> immediately and contact our support team.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(content),
    text: htmlToText(baseTemplate(content)),
    subject: 'Payment Method Updated Successfully',
  };
};
