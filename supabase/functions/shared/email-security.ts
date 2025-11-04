// URL sanitization and security utilities
export const LINKS = {
  moneko: 'https://moneko.io',
  dashboard: 'https://moneko.io/dashboard',
  support: 'mailto:support@moneko.io',
  privacy: 'https://moneko.io/privacy',
  terms: 'https://moneko.io/terms',
  testflight: 'https://testflight.apple.com/join/xQxYzZ',
  appStore: 'https://apps.apple.com/app/moneko/id123456789',
  appleLogo: 'https://moneko.io/apple-logo.png',
  stripe: 'https://stripe.com',
} as const;

// Domain allowlist for URL sanitization
const ALLOWED_HOSTS = [
  'moneko.io',
  'testflight.apple.com',
  'apps.apple.com',
  'pawfi.app',
  'stripe.com',
  'supabase.co',
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
