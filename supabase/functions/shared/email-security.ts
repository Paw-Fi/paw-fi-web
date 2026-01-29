// URL sanitization and security utilities
export const LINKS = {
  moneko: 'https://moneko.io',
  dashboard: 'https://moneko.io/dashboard',
  support: 'mailto:hello@moneko.io',
  privacy: 'https://moneko.io/privacy-policy',
  terms: 'https://moneko.io/terms-of-service',
  testflight: 'https://apps.apple.com/app/moneko/id6753925279',
  appStore: 'https://apps.apple.com/app/moneko/id6753925279',
  appleLogo: 'https://pbopcsmrcykdzbilpilf.supabase.co/storage/v1/object/public/web/apple-logo.png',
  googleLogo: 'https://pbopcsmrcykdzbilpilf.supabase.co/storage/v1/object/public/web/google-play.png',
  playStore:'https://play.google.com/store/apps/details?id=com.moneko.mobile',
  stripe: 'https://stripe.com',
} as const;

// Domain allowlist for URL sanitization
const ALLOWED_HOSTS = [
  'moneko.io',
  'testflight.apple.com',
  'apps.apple.com',
  'play.google.com',
  'stripe.com',
  'supabase.co',
  'upload.wikimedia.org',
];

// Enhanced URL sanitizer with allowlist and protocol validation
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '#';
  
  // Short-circuit for mailto: and tel: protocols with basic validation
  if (url.startsWith('mailto:')) {
    const email = url.substring(7);
    // Basic email validation
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return url;
    }
    return '#';
  }
  
  if (url.startsWith('tel:')) {
    const phone = url.substring(4);
    // Basic phone validation - allow digits, +, -, (, ), and spaces
    if (/^[\d\+\-\(\)\s]+$/.test(phone)) {
      return url;
    }
    return '#';
  }
  
  try {
    // Only allow https: for web URLs
    if (!url.startsWith('https://')) {
      return '#';
    }
    
    const parsed = new URL(url);
    
    // Check against allowlist
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return '#';
    }
    
    return url;
  } catch (error) {
    // URL parsing failed, return safe fallback
    return '#';
  }
}
