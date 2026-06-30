// Email service using the Resend HTTP API.
// Avoid the Resend SDK here: its React Email dependency pulls html-to-text,
// which currently breaks Supabase Edge Function bundling through esm.sh.

// Constants
const DEFAULT_FROM = "Moneko Team <hello@moneko.io>";

// Rate limiting: Resend allows 2 requests per second
// We'll be conservative and ensure at least 600ms between sends
const MIN_DELAY_BETWEEN_EMAILS_MS = 600;
let lastEmailSentAt = 0;

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

interface ResendApiResponse {
  id?: string;
  message?: string;
  error?: string | { message?: string };
}

function getResendErrorMessage(
  payload: ResendApiResponse,
  fallback: string,
): string {
  if (typeof payload.error === "string") return payload.error;
  if (typeof payload.error?.message === "string") return payload.error.message;
  if (typeof payload.message === "string") return payload.message;
  return fallback;
}

// Helper to enforce rate limiting
async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastEmail = now - lastEmailSentAt;

  if (timeSinceLastEmail < MIN_DELAY_BETWEEN_EMAILS_MS) {
    const delayNeeded = MIN_DELAY_BETWEEN_EMAILS_MS - timeSinceLastEmail;
    await new Promise((resolve) => setTimeout(resolve, delayNeeded));
  }

  lastEmailSentAt = Date.now();
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
    if (Deno.env.get("EMAIL_TEST_MODE") === "true") {
      console.log("SENDING EMAIL (TEST MODE):");
      console.log("To:", to);
      console.log("Subject:", subject);
      console.log("Body (text):", text?.substring(0, 100) + "...");
      return { success: true, id: "test-mode-email", test: true };
    }

    // Enforce rate limiting before sending
    await waitForRateLimit();

    // Send the actual email with retry logic for rate limit errors
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") || ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to,
            subject,
            html,
            text,
            reply_to: replyTo,
            cc,
            bcc,
            attachments,
            // CRITICAL: Disable click tracking to prevent breaking Supabase auth URLs
            tags: [],
            headers: {},
          }),
        });

        const result = (await response
          .json()
          .catch(() => ({}))) as ResendApiResponse;
        if (!response.ok) {
          const message = getResendErrorMessage(
            result,
            `Resend API request failed with status ${response.status}`,
          );
          // Check if it's a rate limit error
          if (
            response.status === 429 ||
            message.includes("Too many requests") ||
            message.includes("rate limit")
          ) {
            attempt++;
            if (attempt < maxAttempts) {
              const backoffDelay = 1000 * attempt;
              await new Promise((resolve) => setTimeout(resolve, backoffDelay));
              continue;
            }
          }
          throw new Error(`Failed to send email: ${message}`);
        }

        return { success: true, id: result.id };
      } catch (sendError) {
        // Check if it's a rate limit error from exception
        const errorMsg = (sendError as any)?.message || "";
        if (
          (errorMsg.includes("Too many requests") ||
            errorMsg.includes("rate limit")) &&
          attempt < maxAttempts - 1
        ) {
          attempt++;
          const backoffDelay = 1000 * attempt;
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          continue;
        }
        throw sendError;
      }
    }

    throw new Error("Failed to send email after maximum retry attempts");
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: (error as any).message };
  }
}

// Helper function for user-related emails
export async function sendUserEmail(
  email: string,
  name: string,
  emailTemplate: {
    html: string;
    text: string;
    subject: string;
  },
) {
  // Replace template variables
  const html = emailTemplate.html
    .replace(/{{email}}/g, email)
    .replace(/{{name}}/g, name)
    .replace(
      /{{unsubscribeUrl}}/g,
      `https://moneko.io/unsubscribe?email=${encodeURIComponent(email)}`,
    );

  const text = emailTemplate.text
    .replace(/{{email}}/g, email)
    .replace(/{{name}}/g, name)
    .replace(
      /{{unsubscribeUrl}}/g,
      `https://moneko.io/unsubscribe?email=${encodeURIComponent(email)}`,
    );

  return sendEmail({
    to: email,
    subject: emailTemplate.subject,
    html,
    text,
    replyTo: "hello@moneko.io",
  });
}
