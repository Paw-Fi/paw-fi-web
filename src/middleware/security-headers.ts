/**
 * Security headers middleware for production deployment
 */
export function securityHeadersMiddleware(request: Request): Response | null {
  // Only apply security headers in production
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const url = new URL(request.url);
  const headers = new Headers();

  // Strict-Transport-Security header
  headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  // Content Security Policy
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.supabase.co https://*.supabase.co https://www.google-analytics.com https://www.reddit.com https://reddit.com https://api.reddit.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  // X-Content-Type-Options
  headers.set("X-Content-Type-Options", "nosniff");

  // X-Frame-Options
  headers.set("X-Frame-Options", "DENY");

  // X-XSS-Protection
  headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy
  headers.set(
    "Permissions-Policy",
    ["camera=()", "microphone=()", "geolocation=()", "interest-cohort=()"].join(
      ", ",
    ),
  );

  return new Response(null, {
    status: 200,
    headers,
  });
}

/**
 * Cache headers middleware for static assets
 */
export function cacheHeadersMiddleware(request: Request): Response | null {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Define cache strategies for different asset types
  const cacheStrategies = {
    // Long-term cache for versioned assets
    longTerm: {
      pattern: /\.(js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/,
      maxAge: 31536000, // 1 year
      immutable: true,
    },
    // Medium-term cache for images
    mediumTerm: {
      pattern: /\.(png|jpg|jpeg|webp|svg|ico)$/,
      maxAge: 86400, // 1 day
      immutable: false,
    },
    // Short-term cache for HTML
    shortTerm: {
      pattern: /\.(html?)$/,
      maxAge: 3600, // 1 hour
      immutable: false,
    },
  };

  for (const [strategy, config] of Object.entries(cacheStrategies)) {
    if (config.pattern.test(pathname)) {
      const headers = new Headers();

      const cacheDirectives = [`max-age=${config.maxAge}`, "public"];

      if (config.immutable) {
        cacheDirectives.push("immutable");
      }

      headers.set("Cache-Control", cacheDirectives.join(", "));
      headers.set("ETag", generateETag(pathname));

      return new Response(null, {
        status: 200,
        headers,
      });
    }
  }

  return null;
}

function generateETag(pathname: string): string {
  // Simple ETag generation based on pathname and timestamp
  const hash = pathname.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  return `"${Math.abs(hash).toString(36)}"`;
}
