/**
 * Grant or reset a system-granted Plus trial to 30 days from now, including
 * expired trials. Creates a row when absent, without Stripe or billing changes.
 * Sends confirmation through Resend unless --no-email is supplied.
 * Creating a missing subscription requires interactive yes/no approval.
 *
 * Usage: node scripts/extend-trial-one-month.js <email_or_user_id> [--no-email]
 * Loads .env.production: SUPABASE_URL (or VITE_SUPABASE_URL),
 * SUPABASE_SERVICE_ROLE_KEY, and RESEND_API_KEY (unless --no-email).
 */
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

export async function extendTrialOneMonth(
  supabase,
  userInput,
  now = new Date(),
  resend = null,
  confirmCreation = async () => false,
) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userInput,
    );
  if (!isUuid && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInput)) {
    throw new Error("Input must be a valid email address or UUID");
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, email")
    .eq(isUuid ? "id" : "email", userInput)
    .single();
  if (userError || !user)
    throw new Error(
      `User lookup failed: ${userError?.message || "User not found"}`,
    );

  const { data: subscription, error: readError } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, provider, plan, status, trial_start, trial_end, current_period_end, updated_at, stripe_subscription_id, stripe_customer_id, store_product_id, bound_to_user_id, bound_to_household_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError)
    throw new Error(
      `Failed to load subscription: ${readError?.message || "No subscription found"}`,
    );

  if (
    subscription &&
    (subscription.provider !== "stripe" ||
      subscription.plan !== "plus" ||
      !["trialing", "canceled", "expired"].includes(subscription.status) ||
      !subscription.trial_start ||
      !subscription.trial_end ||
      subscription.stripe_subscription_id ||
      subscription.stripe_customer_id ||
      subscription.store_product_id ||
      subscription.bound_to_user_id ||
      subscription.bound_to_household_id)
  ) {
    throw new Error(
      "Only an existing system-granted Plus trial can be extended; paid, store-managed, lifetime, and household-shared subscriptions are not eligible",
    );
  }

  const trialEnd = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  let updated;
  if (!subscription) {
    if ((await confirmCreation(user, trialEnd)) !== true) return null;
    // Match update-subscription's grant_paywall_return_trial row contract.
    // Insert rather than upsert so a concurrent purchase is never overwritten.
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "plus",
        status: "trialing",
        billing_interval: "yearly",
        current_period_end: trialEnd,
        trial_start: now.toISOString(),
        trial_end: trialEnd,
        provider: "stripe",
        store_product_id: null,
        cancel_at_period_end: false,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        bound_to_user_id: null,
        bound_to_household_id: null,
      })
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(
        `Trial creation failed: ${
          error?.code === "23505"
            ? "Subscription was created concurrently; nothing was overwritten"
            : error?.message || "No row returned"
        }`,
      );
    }
    updated = data;
  } else {
    let update = supabase.from("subscriptions").update({
      status: "trialing",
      trial_end: trialEnd,
      current_period_end: trialEnd,
      updated_at: now.toISOString(),
    });
    // Do not overwrite a purchase, household binding, or another extension that
    // occurred after the eligibility read.
    for (const [column, value] of Object.entries(subscription)) {
      update =
        value === null ? update.is(column, null) : update.eq(column, value);
    }
    const { data, error: updateError } = await update.select("*").single();
    if (updateError || !data) {
      throw new Error(
        `Trial update failed or subscription changed concurrently: ${updateError?.message || "No row updated"}`,
      );
    }
    updated = data;
  }

  let emailError = null;
  if (resend) {
    const until = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(new Date(updated.trial_end));
    try {
      const { data, error } = await resend.emails.send({
        from: "Moneko <hello@moneko.io>",
        to: user.email,
        replyTo: "hello@moneko.io",
        subject: "Enjoy 30 More Days of Moneko Plus!",
        text: `Hi there,\n\nWe have extended your Moneko Plus trial to give you 30 days from today, until ${until}.\n\nEnjoy more time exploring Moneko Plus and building your money habits. Open the Moneko app to keep going!\n\nThis extension is on us, with no payment needed. If you have any questions, just reply to this email. We are happy to help.\n\nThe Moneko Team`,
        html: `<p>Hi there,</p><p>We have extended your <strong>Moneko Plus</strong> trial to give you <strong>30 days from today, until ${until}</strong>.</p><p>Enjoy more time exploring Moneko Plus and building your money habits. Open the Moneko app to keep going!</p><p>This extension is on us, with no payment needed. If you have any questions, just reply to this email. We are happy to help.</p><p>The Moneko Team</p>`,
      });
      if (error || !data?.id)
        throw new Error(
          error?.message || "Resend did not confirm email acceptance",
        );
    } catch (error) {
      emailError = error.message;
    }
  }
  return { ...updated, emailError };
}

async function main() {
  const args = process.argv.slice(2);
  const skipEmail = args.includes("--no-email");
  const inputs = args.filter((arg) => arg !== "--no-email");
  if (inputs.length !== 1 || inputs[0].startsWith("--")) {
    throw new Error(
      "Usage: node scripts/extend-trial-one-month.js <email_or_user_id> [--no-email]",
    );
  }

  const { config } = await import("dotenv");
  config({
    path: fileURLToPath(new URL("../.env.production", import.meta.url)),
    quiet: true,
  });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || (!skipEmail && !process.env.RESEND_API_KEY)) {
    throw new Error(
      "Required: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, and RESEND_API_KEY (unless --no-email)",
    );
  }
  const { createClient } = await import("@supabase/supabase-js");
  const resend = skipEmail
    ? null
    : new (await import("resend")).Resend(process.env.RESEND_API_KEY);
  const subscription = await extendTrialOneMonth(
    createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    inputs[0],
    new Date(),
    resend,
    async (user, trialEnd) => {
      process.stdout.write(
        `No subscription exists for ${user.email} (${user.id}).\nNew Plus trial expires: ${trialEnd}\n`,
      );
      if (!process.stdin.isTTY) return false;
      const readline = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        const answer = await readline.question(
          "Create this 30-day Plus trial? (yes/no) [no]: ",
        );
        return ["y", "yes"].includes(answer.trim().toLowerCase());
      } finally {
        readline.close();
      }
    },
  );
  if (!subscription) {
    process.stdout.write(
      "Canceled. No subscription was created and no email was sent.\n",
    );
    return;
  }
  process.stdout.write(
    `Trial extended for ${subscription.user_id}\nStatus: ${subscription.status}\nExpires: ${subscription.trial_end}\n`,
  );
  if (subscription.emailError) {
    process.stderr.write(
      `Trial extended successfully, but email failed: ${subscription.emailError}\nDo not rerun the script just to retry email; it resets the expiry again.\n`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(
      skipEmail
        ? "Email skipped.\n"
        : "Confirmation email accepted by Resend.\n",
    );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
  });
}
