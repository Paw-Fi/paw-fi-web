// Email template rendering utilities
import { sanitizeUrl, LINKS } from './email-security.ts';
import { escapeHtml } from './email-utils.ts';

// Base email template with modern design and dark mode support
export function baseTemplate(content: string, footer?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>Moneko</title>
  <style>
    /* Base styles */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      background-color: #F9FAFB;
      margin: 0;
      padding: 20px;
    }
    
    /* Container */
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    /* Header */
    .header {
      background-color: #7458FF;
      padding: 30px;
      text-align: center;
    }
    
    .logo {
      color: #FFFFFF;
      font-size: 28px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    
    .logo img {
      height: 40px;
      width: auto;
    }
    
    /* Content */
    .content {
      padding: 40px 30px;
    }
    
    .title {
      color: #1F2937;
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }
    
    .subtitle {
      color: #6B7280;
      font-size: 16px;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    
    p {
      color: #374151;
      font-size: 16px;
      margin: 0 0 16px 0;
      line-height: 1.6;
    }
    
    /* Buttons */
    .button {
      display: inline-block;
      background-color: #7458FF;
      color: #FFFFFF !important;
      padding: 14px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      margin: 24px 0;
      transition: all 0.2s ease;
    }
    
    .button:hover {
      background-color: #6B46C1 !important;
      transform: translateY(-1px);
    }
    
    .button.secondary {
      background-color: transparent !important;
      color: #7458FF !important;
      border: 2px solid #7458FF;
    }
    
    .button.secondary:hover {
      background-color: #7458FF !important;
      color: #FFFFFF !important;
    }
    
    /* Footer */
    .footer {
      background-color: #F9FAFB;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }
    
    .footer p {
      color: #6B7280;
      font-size: 14px;
      margin: 0 0 8px 0;
    }
    
    .footer a {
      color: #7458FF;
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #111827;
        color: #F9FAFB;
      }
      
      .container {
        background-color: #1F2937;
      }
      
      .title {
        color: #F9FAFB;
      }
      
      .subtitle {
        color: #AA76FF;
      }
      
      p {
        color: #E5E7EB;
      }
      
      .footer {
        background-color: #111827;
        border-top: 1px solid #374151;
      }
      
      .footer p {
        color: #9CA3AF;
      }
      
      .footer a {
        color: #AA76FF;
      }
      
      .button {
        background-color: #AA76FF;
      }
      
      .button:hover {
        background-color: #9F6FFF !important;
      }
      
      .button.secondary {
        color: #AA76FF !important;
        border-color: #AA76FF;
      }
      
      .button.secondary:hover {
        background-color: #AA76FF !important;
        color: #FFFFFF !important;
      }
    }
    
    /* Responsive */
    @media (max-width: 600px) {
      .container {
        margin: 10px;
        border-radius: 8px;
      }
      
      .header, .content, .footer {
        padding: 20px;
      }
      
      .title {
        font-size: 20px;
      }
      
      .button {
        display: block;
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="email-body">
    <div class="container">
      <div class="header">
        <h1 class="logo">
          <img src="https://pbopcsmrcykdzbilpilf.supabase.co/storage/v1/object/public/web/icon-transparent.png" alt="Moneko Logo" style="height: 60px; margin-right: 5px;" />
          Moneko
        </h1>
      </div>
      <div class="content">
        ${content}
      </div>
      ${footer ? `<div class="footer">${footer}</div>` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Centralized CTA renderer factory
export function renderButton(text: string, url: string, variant: 'primary' | 'secondary' | 'apple' = 'primary'): string {
  const safeUrl = sanitizeUrl(url);
  const safeText = escapeHtml(text);
  
  switch (variant) {
    case 'apple':
      const appleLogoUrl = sanitizeUrl(LINKS.appleLogo);
      const appleLogoImg = appleLogoUrl !== '#' 
        ? `<img src="${appleLogoUrl}" alt="Apple" style="height: 20px; width: auto; margin-right: 5px;" />`
        : ''; // Fallback to text if image is blocked
      
      return `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="${appleButtonStyle}">
            ${appleLogoImg}
            ${safeText}
          </a>
        </div>
      `;
    case 'secondary':
      return `
        <a href="${safeUrl}" class="button secondary" style="display:inline-block;background-color:transparent !important;color:#7458FF !important;padding:14px 24px;border:2px solid #7458FF;border-radius:9999px;font-weight:500;font-size:16px;text-decoration:none !important;margin:24px 0;">
          ${safeText}
        </a>
      `;
    default:
      return `
        <a href="${safeUrl}" class="button primary" style="display:inline-block;background-color:#7458FF !important;color:#ffffff !important;padding:14px 24px;border-radius:8px;font-weight:600;font-size:16px;text-decoration:none !important;margin:24px 0;">
          ${safeText}
        </a>
      `;
  }
}

// Footer factory with conditional content
export function renderFooter(options: {
  showUnsubscribe?: boolean;
  showSupport?: boolean;
  customReason?: string;
  unsubscribeUrl?: string;
} = {}): string {
  const { showUnsubscribe = false, showSupport = true, customReason, unsubscribeUrl } = options;
  
  let footerContent = '<p>&copy; 2025 Moneko. All rights reserved.</p>';
  
  if (customReason) {
    footerContent += `<p>${escapeHtml(customReason)}</p>`;
  } else {
    footerContent += '<p>You\'re receiving this email because you joined Moneko.</p>';
  }
  
  if (showSupport) {
    footerContent += `<p>Questions? <a href="${sanitizeUrl(LINKS.support)}" style="color: #7458FF; text-decoration: none;">Contact Support</a></p>`;
  }
  
  if (showUnsubscribe) {
    if (unsubscribeUrl) {
      footerContent += `<p><a href="${sanitizeUrl(unsubscribeUrl)}" style="color: #7458FF; text-decoration: none;">Unsubscribe</a></p>`;
    }
    // If showUnsubscribe is true but no unsubscribeUrl provided, omit the link entirely
  }
  
  return footerContent;
}

// Shared Apple button style
const appleButtonStyle = 'display: inline-flex; align-items: center; gap: 12px; background-color: #000000; color: #ffffff; padding: 16px 24px; border-radius: 16px; font-size: 16px; font-weight: 600; text-decoration: none; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); transition: opacity 0.2s ease;';

// TestFlight CTA helper
export function testFlightCtaHtml(): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${sanitizeUrl(LINKS.testflight)}" target="_blank" rel="noopener noreferrer" style="${appleButtonStyle}">
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg" alt="Apple" style="height: 20px; width: auto; margin-right: 5px;" />
        Download on TestFlight
      </a>
    </div>
  `;
}
