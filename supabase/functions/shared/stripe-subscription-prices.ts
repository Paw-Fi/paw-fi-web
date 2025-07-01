export const SUBSCRIPTION_PRICES = {
    free: null, // Map of plan types to Stripe price IDs
  // IMPORTANT: Replace these placeholder IDs with your actual Stripe price IDs from your Stripe Dashboard
  // You can find these under Products > [Your Product] > Pricing
  // They will look like: price_1NcJX4KL6JzIj83kMgLtXyzB
    plus: {
      monthly: Deno.env.get("STRIPE_MONTHLY_PLUS_PLAN_ID"), // REPLACE: Your Plus plan monthly price ID from Stripe Dashboard
      yearly: Deno.env.get("STRIPE_YEARLY_PLUS_PLAN_ID"),   // REPLACE: Your Plus plan yearly price ID from Stripe Dashboard
    },
    premium: {
      monthly: Deno.env.get("STRIPE_MONTHLY_PLUS_PLAN_ID"), // REPLACE: Your Premium plan monthly price ID from Stripe Dashboard
      yearly: Deno.env.get("STRIPE_YEARLY_PLUS_PLAN_ID"),   // REPLACE: Your Premium plan yearly price ID from Stripe Dashboard
    },
  }