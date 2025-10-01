/**
 * Idempotency Utilities - Production Ready
 * 
 * Handles idempotent operations for Stripe API calls and webhook processing
 * Prevents duplicate operations and race conditions
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

/**
 * Generate an idempotency key for Stripe API requests
 * Format: {operation}:{identifier}:{timestamp}
 */
export function generateIdempotencyKey(operation: string, identifier: string): string {
  const timestamp = Date.now();
  return `${operation}:${identifier}:${timestamp}`;
}

/**
 * Check if a webhook event has already been processed
 * Returns true if event was already processed, false otherwise
 */
export async function isWebhookEventProcessed(
  supabase: SupabaseClient,
  eventId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .maybeSingle();
  
  if (error) {
    console.error('Error checking webhook event:', error);
    // In case of error, assume not processed to avoid missing events
    return false;
  }
  
  return !!data;
}

/**
 * Mark a webhook event as processed
 * Stores the event ID and metadata for audit trail
 */
export async function markWebhookEventProcessed(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
  eventData?: Record<string, any>
): Promise<boolean> {
  const { error } = await supabase
    .from('webhook_events')
    .insert({
      stripe_event_id: eventId,
      event_type: eventType,
      event_data: eventData || {},
      processed_at: new Date().toISOString(),
    });
  
  if (error) {
    // Handle unique constraint violation (event already processed)
    if (error.code === '23505') {
      console.log(`Webhook event ${eventId} already processed (duplicate delivery)`);
      return false;
    }
    
    console.error('Error marking webhook event as processed:', error);
    return false;
  }
  
  return true;
}

/**
 * Execute an operation with idempotency protection
 * Checks if operation was already executed, executes if not
 * 
 * @param supabase Supabase client
 * @param key Idempotency key
 * @param operation Function to execute
 * @returns Result of the operation or cached result
 */
export async function withIdempotency<T>(
  supabase: SupabaseClient,
  key: string,
  operation: () => Promise<T>
): Promise<T> {
  // Check if operation was already executed
  const { data: existing } = await supabase
    .from('idempotency_keys')
    .select('result')
    .eq('key', key)
    .maybeSingle();
  
  if (existing) {
    console.log(`Operation with key ${key} already executed, returning cached result`);
    return existing.result as T;
  }
  
  // Execute operation
  const result = await operation();
  
  // Store result for future idempotency checks
  await supabase
    .from('idempotency_keys')
    .insert({
      key,
      result: result as any,
      created_at: new Date().toISOString(),
    })
    .onConflict('key')
    .ignore();
  
  return result;
}

/**
 * Clean up old idempotency keys
 * Should be run periodically (e.g., via cron job)
 * Keeps keys for 24 hours by default
 */
export async function cleanupOldIdempotencyKeys(
  supabase: SupabaseClient,
  hoursToKeep: number = 24
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursToKeep);
  
  const { data, error } = await supabase
    .from('idempotency_keys')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');
  
  if (error) {
    console.error('Error cleaning up idempotency keys:', error);
    return 0;
  }
  
  const count = data?.length || 0;
  console.log(`Cleaned up ${count} old idempotency keys`);
  return count;
}

/**
 * Clean up old webhook events
 * Should be run periodically (e.g., via cron job)
 * Keeps events for 30 days by default
 */
export async function cleanupOldWebhookEvents(
  supabase: SupabaseClient,
  daysToKeep: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const { data, error } = await supabase
    .from('webhook_events')
    .delete()
    .lt('processed_at', cutoffDate.toISOString())
    .select('id');
  
  if (error) {
    console.error('Error cleaning up webhook events:', error);
    return 0;
  }
  
  const count = data?.length || 0;
  console.log(`Cleaned up ${count} old webhook events`);
  return count;
}
