// Email service using Resend
// https://resend.com/docs/sdk/deno

import { Resend } from "https://esm.sh/resend@3.2.0";

// Initialize Resend with API key
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Constants
const DEFAULT_FROM = 'Moneko <noreply@moneko.io>';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM,
  replyTo,
  cc,
  bcc,
  attachments,
}: EmailOptions) {
  try {
    // For testing/development: log email instead of sending
    if (Deno.env.get('EMAIL_TEST_MODE') === 'true') {
      console.log('SENDING EMAIL (TEST MODE):');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body (text):', text?.substring(0, 100) + '...');
      return { success: true, id: 'test-mode-email', test: true };
    }

    // Send the actual email
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      reply_to: replyTo,
      cc,
      bcc,
      attachments,
    });

    if (result.error) {
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Helper function for user-related emails
export async function sendUserEmail(
  email: string, 
  name: string, 
  emailTemplate: { 
    html: string, 
    text: string, 
    subject: string 
  }
) {
  // Replace template variables
  const html = emailTemplate.html
    .replace(/{{email}}/g, email)
    .replace(/{{name}}/g, name)
    .replace(/{{unsubscribeUrl}}/g, `https://moneko.io/unsubscribe?email=${encodeURIComponent(email)}`);

  const text = emailTemplate.text
    .replace(/{{email}}/g, email)
    .replace(/{{name}}/g, name)
    .replace(/{{unsubscribeUrl}}/g, `https://moneko.io/unsubscribe?email=${encodeURIComponent(email)}`);

  return sendEmail({
    to: email,
    subject: emailTemplate.subject,
    html,
    text,
    replyTo: 'hello@moneko.io',
  });
}
