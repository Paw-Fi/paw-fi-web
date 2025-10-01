/**
 * Stripe Retry Utility - Production Ready
 * 
 * Implements exponential backoff retry logic for Stripe API calls
 * Handles transient errors and rate limiting
 */

import Stripe from 'https://esm.sh/stripe@13.10.0';

interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Check if a Stripe error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.type === 'StripeConnectionError') {
    return true;
  }
  
  // API errors with retryable status codes
  if (error.type === 'StripeAPIError') {
    const statusCode = error.statusCode;
    // 429 = Rate limit
    // 500, 502, 503, 504 = Server errors
    return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
  }
  
  // Timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    return true;
  }
  
  return false;
}

/**
 * Calculate delay for next retry using exponential backoff
 */
function calculateDelay(
  attemptNumber: number,
  config: Required<RetryConfig>
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a Stripe API call with exponential backoff retry logic
 * 
 * @param operation Function that returns a Promise (Stripe API call)
 * @param config Retry configuration
 * @returns Result of the operation
 * @throws Last error if all retries are exhausted
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  
  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      const result = await operation();
      
      // Log retry success if this wasn't the first attempt
      if (attempt > 1) {
        console.log(`Operation succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.error('Non-retryable error encountered:', {
          type: error.type,
          code: error.code,
          message: error.message,
        });
        throw error;
      }
      
      // Check if we have retries left
      if (attempt > finalConfig.maxRetries) {
        console.error(`Operation failed after ${finalConfig.maxRetries} retries`);
        throw error;
      }
      
      // Calculate delay for next retry
      const delay = calculateDelay(attempt, finalConfig);
      
      console.warn(`Retryable error on attempt ${attempt}, retrying in ${delay}ms:`, {
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
      });
      
      // Wait before next retry
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Wrapper for Stripe subscription operations with retry logic
 */
export async function retrieveSubscriptionWithRetry(
  stripe: Stripe,
  subscriptionId: string,
  params?: Stripe.SubscriptionRetrieveParams
): Promise<Stripe.Subscription> {
  return withRetry(() => stripe.subscriptions.retrieve(subscriptionId, params));
}

/**
 * Wrapper for Stripe customer operations with retry logic
 */
export async function retrieveCustomerWithRetry(
  stripe: Stripe,
  customerId: string,
  params?: Stripe.CustomerRetrieveParams
): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  return withRetry(() => stripe.customers.retrieve(customerId, params));
}

/**
 * Wrapper for Stripe invoice operations with retry logic
 */
export async function retrieveUpcomingInvoiceWithRetry(
  stripe: Stripe,
  params: Stripe.InvoiceRetrieveUpcomingParams
): Promise<Stripe.Invoice> {
  return withRetry(() => stripe.invoices.retrieveUpcoming(params));
}

/**
 * Wrapper for creating Stripe checkout sessions with retry logic
 */
export async function createCheckoutSessionWithRetry(
  stripe: Stripe,
  params: Stripe.Checkout.SessionCreateParams
): Promise<Stripe.Checkout.Session> {
  return withRetry(() => stripe.checkout.sessions.create(params));
}

/**
 * Wrapper for updating Stripe subscriptions with retry logic
 */
export async function updateSubscriptionWithRetry(
  stripe: Stripe,
  subscriptionId: string,
  params: Stripe.SubscriptionUpdateParams
): Promise<Stripe.Subscription> {
  return withRetry(() => stripe.subscriptions.update(subscriptionId, params));
}

/**
 * Wrapper for canceling Stripe subscriptions with retry logic
 */
export async function cancelSubscriptionWithRetry(
  stripe: Stripe,
  subscriptionId: string,
  params?: Stripe.SubscriptionCancelParams
): Promise<Stripe.Subscription> {
  return withRetry(() => stripe.subscriptions.cancel(subscriptionId, params));
}

/**
 * Wrapper for creating Stripe customers with retry logic
 */
export async function createCustomerWithRetry(
  stripe: Stripe,
  params: Stripe.CustomerCreateParams
): Promise<Stripe.Customer> {
  return withRetry(() => stripe.customers.create(params));
}

/**
 * Wrapper for updating Stripe customers with retry logic
 */
export async function updateCustomerWithRetry(
  stripe: Stripe,
  customerId: string,
  params: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  return withRetry(() => stripe.customers.update(customerId, params));
}
