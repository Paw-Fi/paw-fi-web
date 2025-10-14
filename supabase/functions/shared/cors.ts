// Get the allowed origins from environment variable or use default
// Support multiple origins separated by comma
const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:3000,https://moneko.io,https://www.moneko.io';
const allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim());

// Base CORS headers (without Origin since it's dynamic)
export const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
};

/**
 * Get CORS headers for a specific request
 * Dynamically sets Access-Control-Allow-Origin based on request origin
 */
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  let origin = allowedOrigins[0]; // Default fallback
  
  if (requestOrigin) {
    // Check exact match first
    if (allowedOrigins.includes(requestOrigin)) {
      origin = requestOrigin;
    } 
    // Allow any moneko.io subdomain (www, apex, etc.)
    else if (requestOrigin.match(/^https?:\/\/(www\.)?moneko\.io$/)) {
      origin = requestOrigin;
    }
    // Allow localhost on any port for development
    else if (requestOrigin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      origin = requestOrigin;
    }
  }
  
  return {
    ...baseCorsHeaders,
    'Access-Control-Allow-Origin': origin,
  };
}

// Legacy export for backward compatibility - defaults to localhost
export const corsHeaders = {
  ...baseCorsHeaders,
  'Access-Control-Allow-Origin': allowedOrigins[0],
};