// Site configuration for SEO and branding
export const siteConfig = {
  name: "Moneko",
  twitterHandle: "@moneko_ai",
  description:
    "Moneko is an AI budgeting app and expense tracker for iPhone, Android, WhatsApp, Telegram, and the web. Track spending, organize pockets, forward receipt emails, and manage shared budgets.",
  url: "https://moneko.io",

  // Default Open Graph image settings
  ogImage: {
    width: "1200",
    height: "628",
    type: "image/png",
  },

  // Social media links (for consistency across the app)
  social: {
    twitter: "https://x.com/moneko_ai",
    linkedin: "https://www.linkedin.com/company/moneko-ai",
    facebook: "https://www.facebook.com/monekoai/",
    instagram: "https://www.instagram.com/moneko_ai/",
    email: "hello@moneko.io",
  },
} as const;
