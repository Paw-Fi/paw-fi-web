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
    <img src="https://your-domain.com/logo.png" alt="Moneko Logo" class="logo" />
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
  changeType: 'upgrade' | 'downgrade' | 'renewal';
}) => {
  let title, message;
  
  if (data.changeType === 'upgrade') {
    title = 'Your subscription has been upgraded!';
    message = `You've successfully upgraded to our ${data.planName} plan.`;
  } else if (data.changeType === 'downgrade') {
    title = 'Your subscription has been changed';
    message = `Your subscription has been changed to our ${data.planName} plan.`;
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
