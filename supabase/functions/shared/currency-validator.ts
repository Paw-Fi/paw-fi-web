// Currency validation utilities
// Provides security validation for currency codes to prevent injection attacks

import { CURRENCY_SYMBOLS } from "./currency-symbols.ts";

export const VALID_CURRENCIES = Object.keys( CURRENCY_SYMBOLS);

/**
 * Validates and normalizes currency code
 * Returns USD if code is invalid or missing
 * Security: Prevents SQL injection and special character attacks
 */
export function validateCurrency(code: string | null | undefined): string {
  if (!code) return 'USD';
  
  const upper = code.toUpperCase().trim();
  
  // Only allow 3-letter codes
  if (upper.length !== 3) {
    console.warn(`Invalid currency format: ${code}`);
    return 'USD';
  }
  
  // Only allow A-Z characters (security: prevent injection)
  if (!/^[A-Z]{3}$/.test(upper)) {
    console.warn(`Invalid currency characters: ${code}`);
    return 'USD';
  }
  
  if (!VALID_CURRENCIES.includes(upper as any)) {
    console.warn(`Unsupported currency: ${code}`);
    return 'USD';
  }
  
  return upper;
}
