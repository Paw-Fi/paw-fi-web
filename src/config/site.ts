// Site configuration for SEO and branding
export const siteConfig = {
  name: 'Moneko',
  twitterHandle: '@moneko_ai',
  description: 'Moneko is a free, beginner-friendly app that helps you build good money habits through fun, interactive lessons in saving, budgeting, and investing',
  url: 'https://moneko.io',
  
  // Default Open Graph image settings
  ogImage: {
    width: '1200',
    height: '628',
    type: 'image/png'
  },
  
  // Social media links (for consistency across the app)
  social: {
    twitter: 'https://x.com/moneko_ai',
    facebook: 'https://www.facebook.com/monekoai/',
    instagram: 'https://www.instagram.com/moneko_ai/',
    email: 'hello@moneko.io'
  }
} as const;