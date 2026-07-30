import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../shared/cors.ts";
import {
  sendEmail,
  sendUserEmail,
  EmailOptions,
} from "../shared/email-service.ts";
import { LINKS } from "../shared/email-security.ts";
import {
  welcomeTemplate,
  notificationTemplate,
  mobileBetaWelcomeTemplate,
} from "../shared/email-templates.ts";
import { resolveUserDisplayName } from "../shared/user-display-name.ts";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);
const PLUS_FEATURE_SUMMARY =
  "WhatsApp Capture, Email Receipt Capture, advanced budgeting tools, and Bank Sync where supported";

// Supabase webhook payload structure
interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: any;
  old_record?: any;
  schema: string;
}

interface SendEmailRequest {
  type: "direct" | "template";
  // For direct emails
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
  // For template emails
  email?: string;
  name?: string;
  template?: {
    html: string;
    text: string;
    subject: string;
  };
}

interface SendEmailResponse {
  success: boolean;
  id?: string;
  error?: string;
  test?: boolean;
}

serve(async (req) => {
  try {
    // Handle CORS preflight OPTIONS request
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST.",
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    let requestData: SendEmailRequest | WebhookPayload;
    try {
      requestData = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let result: {
      success: boolean;
      id?: string;
      error?: string;
      test?: boolean;
    };

    // Check if this is a webhook payload (has table and type fields)
    if ("table" in requestData && "type" in requestData) {
      // Handle webhook
      result = await handleWebhookEmail(requestData as WebhookPayload);
    } else {
      // Handle direct/template emails
      const emailRequest = requestData as SendEmailRequest;

      // Validate required fields based on email type
      if (!emailRequest.type) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Email type is required (direct or template)",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      result = await handleDirectEmail(emailRequest);
    }

    // Return response
    const responseData: SendEmailResponse = {
      success: result.success,
      id: result.id,
      error: result.error,
      test: result.test,
    };

    const statusCode = result.success ? 200 : 500;

    return new Response(JSON.stringify(responseData), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in send-email function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: `Server error: ${error instanceof Error ? error.message : String(error)}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// Handle direct/template emails
async function handleDirectEmail(
  data: SendEmailRequest,
): Promise<{ success: boolean; id?: string; error?: string; test?: boolean }> {
  if (data.type === "direct") {
    // Validate required fields for direct email
    if (!data.to || !data.subject || !data.html) {
      return {
        success: false,
        error: "Missing required fields: to, subject, html",
      };
    }

    // Send direct email
    const emailOptions: EmailOptions = {
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
      from: data.from,
      replyTo: data.replyTo,
      cc: data.cc,
      bcc: data.bcc,
      attachments: data.attachments,
    };

    return await sendEmail(emailOptions);
  } else if (data.type === "template") {
    // Validate required fields for template email
    if (!data.email || !data.name || !data.template) {
      return {
        success: false,
        error: "Missing required fields: email, name, template",
      };
    }

    if (!data.template.html || !data.template.text || !data.template.subject) {
      return {
        success: false,
        error: "Template must include html, text, and subject",
      };
    }

    // Send template email
    return await sendUserEmail(data.email, data.name, data.template);
  }

  return { success: false, error: "Invalid email type" };
}

// Handle webhook-triggered emails from Supabase
async function handleWebhookEmail(
  webhook: WebhookPayload,
): Promise<{ success: boolean; id?: string; error?: string; test?: boolean }> {
  try {
    console.log(`Webhook received: ${webhook.type} on ${webhook.table}`);

    // Handle users table events
    if (webhook.table === "users") {
      if (webhook.type === "INSERT") {
        // Skip welcome email on user creation, wait for first login after verification
        if (webhook.record?.email) {
          console.log(
            `User record created for: ${webhook.record.email}, skipping welcome email until verified`,
          );
          return { success: true, id: "user-created-no-email" };
        }
      }

      if (
        webhook.type === "UPDATE" &&
        webhook.record?.email &&
        webhook.old_record
      ) {
        // Detect first login after verification (when last_login changes from null to a timestamp)
        const wasFirstLogin =
          webhook.old_record.last_login === null &&
          webhook.record.last_login !== null;

        if (wasFirstLogin) {
          console.log(
            `First login detected for verified user: ${webhook.record.email}`,
          );

          // Verify user is actually confirmed by checking auth.users
          const { data: authUser, error: authError } =
            await supabase.auth.admin.getUserById(webhook.record.id);

          if (authError) {
            console.error("Error fetching auth user:", authError);
            return { success: false, error: "Could not verify user status" };
          }

          if (!authUser?.user?.email_confirmed_at) {
            console.log(
              `User ${webhook.record.email} still not verified, skipping welcome email`,
            );
            return { success: true, id: "user-not-verified-yet" };
          }

          console.log(
            `Sending welcome email to newly verified user: ${webhook.record.email}`,
          );

          // Send welcome email to newly verified users
          const fullName = resolveUserDisplayName(
            webhook.record.full_name,
            webhook.record.email,
            "",
          );
          const template = welcomeTemplate({
            name: fullName,
            email: webhook.record.email,
            appUrl: "moneko://home",
          });

          return await sendUserEmail(webhook.record.email, fullName, template);
        }
      }
    }

    // Handle early access claims table events
    if (webhook.table === "early_access_claims" && webhook.type === "INSERT") {
      if (webhook.record?.email) {
        console.log(
          `Sending early access welcome email to: ${webhook.record.email}`,
        );

        const userName = webhook.record.first_name || "Early Access Member";

        const template = mobileBetaWelcomeTemplate({ name: userName });

        return await sendUserEmail(webhook.record.email, userName, template);
      }
    }

    // Handle subscriptions table events
    if (webhook.table === "subscriptions") {
      if (webhook.type === "INSERT") {
        console.log(`New subscription created: ${webhook.record.id}`);

        // Get user details from database
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("id", webhook.record.user_id)
          .single();

        if (userError || !userData) {
          console.error("Error fetching user for subscription:", userError);
          return { success: false, error: "User not found" };
        }

        console.log(`Sending subscription welcome email to: ${userData.email}`);

        // Send welcome email for new subscriptions
        const status = String(webhook.record.status || "").toLowerCase();
        const plan = String(webhook.record.plan || "").toLowerCase();
        const isLifetime = plan === "lifetime";

        if ((status !== "active" && status !== "trialing") || plan === "free") {
          return { success: true, id: "subscription-status-not-welcome" };
        }

        const fullName = resolveUserDisplayName(
          userData.full_name,
          userData.email,
          "",
        );
        const template = notificationTemplate({
          name: fullName,
          title:
            status === "trialing"
              ? "Your Moneko Plus Trial Is Active"
              : isLifetime
                ? "Welcome to Moneko Plus Lifetime"
                : "Welcome to Moneko Plus",
          message:
            status === "trialing"
              ? `Your trial is now active. Explore ${PLUS_FEATURE_SUMMARY}.`
              : isLifetime
                ? `Your Moneko Plus Lifetime access is now active. Get started with ${PLUS_FEATURE_SUMMARY}.`
                : `Your Plus access is now active. Get started with ${PLUS_FEATURE_SUMMARY}.`,
          actionUrl: "moneko://home",
          actionText:
            status === "trialing" ? "Explore Moneko Plus" : "Open Moneko",
          priority: "high",
        });

        return await sendUserEmail(userData.email, fullName, template);
      } else if (webhook.type === "UPDATE" && webhook.old_record) {
        console.log(`Subscription updated: ${webhook.record.id}`);

        // Get user details from database
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("id", webhook.record.user_id)
          .single();

        if (userError || !userData) {
          console.error(
            "Error fetching user for subscription update:",
            userError,
          );
          return { success: false, error: "User not found" };
        }

        console.log(`Sending subscription update email to: ${userData.email}`);

        // Determine what changed and create appropriate message
        let title = "Your Moneko Subscription Is Up to Date";
        let message =
          "Your Moneko account is up to date and your current access is unchanged.";
        let actionUrl = "moneko://home";
        let actionText = "Open Moneko";
        let priority: "low" | "medium" | "high" = "medium";

        if (webhook.record.status !== webhook.old_record.status) {
          const status = String(webhook.record.status || "").toLowerCase();
          const previousStatus = String(
            webhook.old_record.status || "",
          ).toLowerCase();
          const plan = String(webhook.record.plan || "").toLowerCase();
          const periodEnd = formatSubscriptionDate(
            webhook.record.current_period_end,
          );

          if (status === "active") {
            if (plan === "lifetime") {
              title = "Your Moneko Plus Lifetime Access Is Active";
              message = `Your lifetime access is ready. You can start using ${PLUS_FEATURE_SUMMARY}.`;
            } else {
              title = "Your Moneko Plus Subscription Is Active";
              message =
                previousStatus === "trialing"
                  ? `Your trial has ended, and your Moneko Plus subscription is now active. You can continue using ${PLUS_FEATURE_SUMMARY}.`
                  : `Your Plus access is ready. You can start using ${PLUS_FEATURE_SUMMARY}.`;
            }
            priority = "high";
          } else if (status === "trialing") {
            title = "Your Moneko Plus Trial Is Active";
            message = `Your trial is now active. Explore ${PLUS_FEATURE_SUMMARY}.`;
            priority = "high";
          } else if (status === "past_due") {
            title = "We Couldn’t Process Your Moneko Payment";
            message =
              "Please update your payment details to keep your Moneko Plus access active.";
            actionUrl = LINKS.membership;
            actionText = "Update Payment Details";
            priority = "high";
          } else if (status === "canceled" || status === "expired") {
            const hasRemainingAccess = isFutureSubscriptionDate(
              webhook.record.current_period_end,
            );
            title = hasRemainingAccess
              ? "Your Moneko Plus Cancellation Is Confirmed"
              : "Your Moneko Plus Access Has Ended";
            message =
              hasRemainingAccess && periodEnd
                ? `You’ll continue to have access to all Moneko Plus features until ${periodEnd}.`
                : "Your Moneko Plus access has ended, but you can continue using Moneko Free. You can reactivate Moneko Plus whenever you’re ready.";
            actionUrl = hasRemainingAccess
              ? "moneko://home"
              : "https://moneko.io/pricing";
            actionText = hasRemainingAccess ? "Open Moneko" : "View Plans";
            priority = "medium";
          } else {
            return { success: true, id: "subscription-status-unrecognized" };
          }
        } else if (webhook.record.plan !== webhook.old_record.plan) {
          const plan = toUserPlanLabel(webhook.record.plan);
          const normalizedPlan = String(
            webhook.record.plan || "",
          ).toLowerCase();
          const hadPlusAccess = isPlusPlan(webhook.old_record.plan);
          const hasPlusAccess = isPlusPlan(webhook.record.plan);

          if (normalizedPlan === "lifetime" && hadPlusAccess) {
            title = "Your Moneko Plus Lifetime Access Is Ready";
            message = `Your upgrade is complete, and your Moneko Plus Lifetime access is now active. You can continue using ${PLUS_FEATURE_SUMMARY}.`;
            priority = "high";
          } else if (normalizedPlan === "lifetime") {
            title = "Welcome to Moneko Plus Lifetime";
            message = `Your Moneko Plus Lifetime access is now active. Get started with ${PLUS_FEATURE_SUMMARY}.`;
            priority = "high";
          } else if (!hadPlusAccess && hasPlusAccess) {
            title = "Welcome to Moneko Plus";
            message = `Your upgrade is complete. You now have access to ${PLUS_FEATURE_SUMMARY}.`;
            actionText = "Explore Moneko Plus";
            priority = "high";
          } else if (hadPlusAccess && !hasPlusAccess) {
            title = "Your Moneko Plan Has Been Updated";
            message =
              "Your Moneko Plus access has ended, but you can continue tracking and managing your finances with Moneko Free.";
            actionUrl = "https://moneko.io/pricing";
            actionText = "View Plans";
            priority = "medium";
          } else {
            title = "Your Moneko Plan Has Changed";
            message =
              plan === "Moneko Free"
                ? "Your plan is now Moneko Free. You can continue using all features included with the free plan."
                : `Your plan is now ${plan}, and your updated access is ready to use.`;
          }
        } else if (
          webhook.record.current_period_end !==
          webhook.old_record.current_period_end
        ) {
          if (String(webhook.record.plan || "").toLowerCase() === "lifetime") {
            return { success: true, id: "lifetime-renewal-no-email" };
          }

          title = "Your Moneko Plus Subscription Has Renewed";
          const periodEnd = formatSubscriptionDate(
            webhook.record.current_period_end,
          );
          message = periodEnd
            ? `Your subscription renewed successfully. Your Moneko Plus access is active through ${periodEnd}.`
            : "Your subscription renewed successfully, and your Moneko Plus access remains active.";
          priority = "medium";
        } else {
          return { success: true, id: "subscription-update-no-email" };
        }

        // Send notification for subscription update
        const fullName = resolveUserDisplayName(
          userData.full_name,
          userData.email,
          "",
        );
        const template = notificationTemplate({
          name: fullName,
          title,
          message,
          actionUrl,
          actionText,
          priority,
        });

        return await sendUserEmail(userData.email, fullName, template);
      }
    }

    // Default case - no email sent
    console.log(`No email handler for ${webhook.type} on ${webhook.table}`);
    return { success: true, id: "no-email-sent" };
  } catch (error) {
    console.error("Error in handleWebhookEmail:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function isPlusPlan(plan: unknown): boolean {
  const normalized = String(plan || "").toLowerCase();
  return (
    normalized === "plus" ||
    normalized === "premium" ||
    normalized === "lifetime"
  );
}

function toUserPlanLabel(plan: unknown): string {
  const normalized = String(plan || "").toLowerCase();
  if (normalized === "lifetime") return "Moneko Plus Lifetime";
  if (isPlusPlan(normalized)) return "Moneko Plus";
  return "Moneko Free";
}

function formatSubscriptionDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isFutureSubscriptionDate(value: unknown): boolean {
  if (!value) return false;
  const date = new Date(String(value));
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}
