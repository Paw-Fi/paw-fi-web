/**
 * Environment Variable Validation - Production Ready
 * 
 * Validates all required environment variables at startup
 * Fails fast if critical configuration is missing
 * 
 * NOTE: Some variables are optional depending on the function:
 * - STRIPE_WEBHOOK_SECRET: Required only for stripe-webhook function
 */

interface EnvironmentConfig {
  // Supabase
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  
  // Stripe
  stripeSecretKey: string;
  stripeWebhookSecret?: string; // Optional - only required for webhook function
  
  // Stripe Price IDs
  stripeMonthlyPlusPlanId: string;
  stripeYearlyPlusPlanId: string;
  stripeMonthlyPremiumPlanId: string;
  stripeYearlyPremiumPlanId: string;
  
  // Application
  appUrl: string;
  
  // Optional
  environment?: 'development' | 'staging' | 'production';
}

interface ValidationOptions {
  requireWebhookSecret?: boolean; // Set to true for webhook function
}

class EnvironmentValidationError extends Error {
  constructor(missingVars: string[]) {
    super(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      `Please ensure all required environment variables are set before deploying.`
    );
    this.name = 'EnvironmentValidationError';
  }
}

/**
 * Validates and returns typed environment configuration
 * Throws EnvironmentValidationError if any required variables are missing
 * 
 * @param options - Optional validation requirements
 */
export function validateEnvironment(options: ValidationOptions = {}): EnvironmentConfig {
  const missingVars: string[] = [];
  
  // Helper to get and validate environment variable
  const getEnvVar = (key: string, required = true): string => {
    const value = Deno.env.get(key);
    
    if (required && (!value || value.trim() === '')) {
      missingVars.push(key);
      return '';
    }
    
    return value || '';
  };
  
  const config: EnvironmentConfig = {
    // Supabase
    supabaseUrl: getEnvVar('SUPABASE_URL'),
    supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
    
    // Stripe Core
    stripeSecretKey: getEnvVar('STRIPE_SECRET_KEY'),
    stripeWebhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET', options.requireWebhookSecret || false),
    
    // Stripe Price IDs - CORRECTED to match actual Supabase secret names
    // CRITICAL: Actual Supabase secrets that exist are:
    // - STRIPE_MONTHLY_PLUS_PLAN_ID (✓ CORRECT)
    // - STRIPE_YEARLY_PLUS_PLAN_ID (✓ CORRECT)
    // These match what's configured in stripe-subscription-prices.ts
    stripeMonthlyPlusPlanId: getEnvVar('STRIPE_MONTHLY_PLUS_PLAN_ID'),
    stripeYearlyPlusPlanId: getEnvVar('STRIPE_YEARLY_PLUS_PLAN_ID'),
    
    // Premium plans
    stripeMonthlyPremiumPlanId: getEnvVar('STRIPE_MONTHLY_PREMIUM_PLAN_ID'),
    stripeYearlyPremiumPlanId: getEnvVar('STRIPE_YEARLY_PREMIUM_PLAN_ID'),
    
    // Application
    appUrl: getEnvVar('APP_URL', false) || 'https://moneko.io',
    
    // Optional
    environment: getEnvVar('ENVIRONMENT', false) as any || 'production',
  };
  
  // Validate price IDs are unique
  // const priceIds = [
  //   config.stripeMonthlyPlusPlanId,
  //   config.stripeYearlyPlusPlanId,
  //   config.stripeMonthlyPremiumPlanId,
  //   config.stripeYearlyPremiumPlanId,
  // ].filter(id => id); // Filter out empty strings
  
  // const uniquePriceIds = new Set(priceIds);
  // if (priceIds.length !== uniquePriceIds.size) {
  //   throw new Error(
  //     'Duplicate Stripe Price IDs detected! Each plan/interval combination must have a unique price ID.\n' +
  //     'Check your STRIPE_*_PLAN_ID environment variables.'
  //   );
  // }
  
  // Validate Stripe price ID format (should start with 'price_')
  // for (const id of priceIds) {
  //   if (!id.startsWith('price_')) {
  //     throw new Error(
  //       `Invalid Stripe Price ID format: ${id}\n` +
  //       `Price IDs should start with 'price_' (e.g., price_1AbC2DeF3GhI4JkL)`
  //     );
  //   }
  // }
  
  // Throw if any required vars are missing
  if (missingVars.length > 0) {
    throw new EnvironmentValidationError(missingVars);
  }
  
  return config;
}

/**
 * Get validated environment configuration
 * Safe to use after validateEnvironment() has been called
 */
export function getEnvironment(): EnvironmentConfig {
  return validateEnvironment();
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  const env = Deno.env.get('ENVIRONMENT') || 'production';
  return env === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  const env = Deno.env.get('ENVIRONMENT') || 'production';
  return env === 'development';
}

/**
 * Logs environment configuration (safely, without secrets)
 */
export function logEnvironmentInfo(): void {
  const env = Deno.env.get('ENVIRONMENT') || 'production';
  const appUrl = Deno.env.get('APP_URL') || 'https://moneko.io';
  
  console.log('Environment Configuration:', {
    environment: env,
    appUrl,
    stripeConfigured: !!Deno.env.get('STRIPE_SECRET_KEY'),
    webhookSecretConfigured: !!Deno.env.get('STRIPE_WEBHOOK_SECRET'),
    supabaseConfigured: !!Deno.env.get('SUPABASE_URL'),
    priceIdsConfigured: {
      plusMonthly: !!Deno.env.get('STRIPE_MONTHLY_PLUS_PLAN_ID'),
      plusYearly: !!Deno.env.get('STRIPE_YEARLY_PLUS_PLAN_ID'),
      premiumMonthly: !!Deno.env.get('STRIPE_MONTHLY_PREMIUM_PLAN_ID'),
      premiumYearly: !!Deno.env.get('STRIPE_YEARLY_PREMIUM_PLAN_ID'),
    },
  });
}
