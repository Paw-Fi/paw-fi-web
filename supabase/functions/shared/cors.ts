// Get the allowed origins from environment variable or use default
// Support multiple origins separated by comma
const allowedOriginsEnv =
  Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:3000,https://moneko.io,https://www.moneko.io";
const allowedOrigins = allowedOriginsEnv
  .split(",")
  .map((origin) => origin.trim());

// Product origins must also work when production has an older ALLOWED_ORIGINS value.
const productOrigins = new Set([
  "https://moneko.io",
  "https://www.moneko.io",
  "https://dashboard.moneko.io",
  "https://moneko-desktop--paw-fi-3c4f7.us-east4.hosted.app",
]);

// Base CORS headers (without Origin since it's dynamic)
export const baseCorsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, stripe-signature",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
  Vary: "Origin",
};

/**
 * Get CORS headers for a specific request
 * Dynamically sets Access-Control-Allow-Origin based on request origin
 */
export function getCorsHeaders(requestOrigin?: string): Record<string, string> {
  let origin = requestOrigin ? undefined : allowedOrigins[0];

  if (requestOrigin) {
    // Check exact match first
    if (
      allowedOrigins.includes(requestOrigin) ||
      productOrigins.has(requestOrigin)
    ) {
      origin = requestOrigin;
    }
    // Preserve the existing apex/www and local development origins.
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
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
  };
}

// Legacy export for backward compatibility - defaults to localhost
export const corsHeaders = {
  ...baseCorsHeaders,
  "Access-Control-Allow-Origin": allowedOrigins[0],
};

/** Apply CORS at the response boundary so legacy helpers remain request-safe. */
export function withCors(
  handler: (request: Request) => Response | Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const response = await handler(request);
    const headers = new Headers(response.headers);
    headers.delete("Access-Control-Allow-Origin");
    const requestHeaders = getCorsHeaders(
      request.headers.get("origin") || undefined,
    );
    for (const [name, value] of Object.entries(requestHeaders)) {
      if (name !== "Vary" && !headers.has(name)) headers.set(name, value);
    }
    if (
      !headers
        .get("Vary")
        ?.split(",")
        .some((value) => value.trim().toLowerCase() === "origin")
    ) {
      headers.append("Vary", "Origin");
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
