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
      return appStoreCtaHtml();
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
  
  let footerContent = '<p>&copy; 2026 Moneko. All rights reserved.</p>';
  
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

// Shared Button Base Style (Flex & Reset)
const baseBtnStyle = 'display: inline-flex; align-items: center; justify-content: center; height: 56px; background-color: #000000; color: #ffffff; text-decoration: none; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); transition: opacity 0.2s ease; box-sizing: border-box;';

// Apple Specific Style (rounded-xl -> 12px, px-6 -> 24px)
const appleBtnStyle = `${baseBtnStyle} padding: 0 24px; border-radius: 12px;`;

// Android Specific Style (rounded-lg -> 8px, px-4 -> 16px)
const androidBtnStyle = `${baseBtnStyle} padding: 0 16px; border-radius: 8px;`;

// App Store CTA helper
export function appStoreCtaHtml(): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${sanitizeUrl(LINKS.appStore)}" target="_blank" rel="noopener noreferrer" style="${appleBtnStyle}">
        <div style="margin-right: 12px; display: flex; align-items: center;">
          <svg viewBox="0 0 384 512" width="30" height="30" style="fill: currentColor; display: block;">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"></path>
          </svg>
        </div>
        <div style="text-align: left; display: flex; flex-direction: column;">
          <span style="font-size: 12px; line-height: 1; opacity: 0.9; font-weight: 500;">Download on the</span>
          <span style="font-size: 20px; line-height: 1; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-top: 2px;">App Store</span>
        </div>
      </a>
    </div>
  `;
}

// Google Play CTA helper
export function googlePlayCtaHtml(): string {
  return `
 <div style="text-align: center; margin: 32px 0;">
      <a href="\${sanitizeUrl(LINKS.playStore)}" target="_blank" rel="noopener noreferrer" style="${androidBtnStyle}">
        <div style="margin-right: 12px; display: flex; align-items: center;">
          <svg viewBox="30 336.7 120.9 129.2" width="30" height="30" style="display: block;">
            <path fill="#FFD400" d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,0-9.7  c-2.1-1.1-13.4-7.3-28-15.3l-20.1,20.2L119.2,421.2z"></path>
            <path fill="#FF3333" d="M99.1,401.1l-64.2,64.7c1.5,0.2,3.2-0.2,5.2-1.3  c4.2-2.3,48.8-26.7,79.1-43.3L99.1,401.1L99.1,401.1z"></path>
            <path fill="#48FF48" d="M99.1,401.1l20.1-20.2c0,0-74.6-40.7-79.1-43.1  c-1.7-1-3.6-1.3-5.3-1L99.1,401.1z"></path>
            <path fill="#3BCCFF" d="M99.1,401.1l-64.3-64.3c-2.6,0.6-4.8,2.9-4.8,7.6  c0,7.5,0,107.5,0,113.8c0,4.3,1.7,7.4,4.9,7.7L99.1,401.1z"></path>
          </svg>
        </div>
        <div style="text-align: left; display: flex; flex-direction: column;">
          <span style="font-size: 10px; line-height: 1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">GET IT ON</span>
          <span style="font-size: 19px; line-height: 1; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Google Play</span>
        </div>
      </a>
    </div>
  `;
}

// Combined CTA helper for mobile downloads (appStore + Google Play)
export function mobileDownloadCtasHtml(): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <div style="display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 12px;">
         <a href="${sanitizeUrl(LINKS.appStore)}" target="_blank" rel="noopener noreferrer" style="${appleBtnStyle}">
           <div style="margin-right: 12px; display: flex; align-items: center;">
             <svg viewBox="0 0 384 512" width="30" height="30" style="fill: currentColor; display: block;">
               <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"></path>
             </svg>
           </div>
           <div style="text-align: left; display: flex; flex-direction: column;">
             <span style="font-size: 12px; line-height: 1; opacity: 0.9; font-weight: 500;">Download on the</span>
             <span style="font-size: 20px; line-height: 1; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-top: 2px;">App Store</span>
           </div>
         </a>

         <a href="${sanitizeUrl(LINKS.playStore)}" target="_blank" rel="noopener noreferrer" style="${androidBtnStyle}">
           <div style="margin-right: 12px; display: flex; align-items: center;">
             <svg viewBox="30 336.7 120.9 129.2" width="30" height="30" style="display: block;">
               <path fill="#FFD400" d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,0-9.7  c-2.1-1.1-13.4-7.3-28-15.3l-20.1,20.2L119.2,421.2z"></path>
               <path fill="#FF3333" d="M99.1,401.1l-64.2,64.7c1.5,0.2,3.2-0.2,5.2-1.3  c4.2-2.3,48.8-26.7,79.1-43.3L99.1,401.1L99.1,401.1z"></path>
               <path fill="#48FF48" d="M99.1,401.1l20.1-20.2c0,0-74.6-40.7-79.1-43.1  c-1.7-1-3.6-1.3-5.3-1L99.1,401.1z"></path>
               <path fill="#3BCCFF" d="M99.1,401.1l-64.3-64.3c-2.6,0.6-4.8,2.9-4.8,7.6  c0,7.5,0,107.5,0,113.8c0,4.3,1.7,7.4,4.9,7.7L99.1,401.1z"></path>
             </svg>
           </div>
           <div style="text-align: left; display: flex; flex-direction: column;">
             <span style="font-size: 10px; line-height: 1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">GET IT ON</span>
             <span style="font-size: 19px; line-height: 1; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Google Play</span>
           </div>
         </a>
      </div>
    </div>
  `;
}
