import { createFileRoute, Link } from "@tanstack/react-router";
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

export const Route = createFileRoute('/cookie-policy')({
  component: CookiePolicy,
  head: () => {
    const pageUrl = getCanonicalUrl('/cookie-policy');
    const meta = seo({
      title: 'Cookie Policy | Moneko',
      description: 'Learn about how Moneko uses cookies and similar technologies on our website to enhance your browsing experience.',
      keywords: 'cookie policy, cookies, tracking technologies, Moneko cookies',
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });
    
    // Add structured data for cookie policy page
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Cookie Policy",
      "description": "Moneko's cookie policy explaining how we use cookies and similar technologies",
      "url": pageUrl,
      "publisher": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://moneko.io/"
      }
    };
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});

function CookiePolicy() {
  return (
    <div className="flex-1 bg-white px-6 py-12 md:px-12 lg:px-24">
      <div className="mx-auto max-w-4xl">
        <Link 
          to="/" 
          className="mb-8 inline-flex items-center text-purple-600 hover:text-purple-800"
        >
          &larr; Back to Home
        </Link>
        
        <h1 className="mb-8 text-4xl font-bold">Cookie Policy</h1>
        
        <div className="prose max-w-none">
          <p className="text-lg text-gray-700">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="mt-8 text-2xl font-semibold">1. What Are Cookies</h2>
          <p>
            Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">2. How We Use Cookies</h2>
          <p>
            Moneko uses cookies for several purposes, including:
          </p>
          <ul className="list-disc pl-8">
            <li><strong>Essential cookies:</strong> These are necessary for the website to function properly.</li>
            <li><strong>Preference cookies:</strong> These remember your preferences and settings.</li>
            <li><strong>Analytics cookies:</strong> These help us understand how visitors interact with our website.</li>
            <li><strong>Functionality cookies:</strong> These enhance the functionality of the website.</li>
          </ul>
          
          <h2 className="mt-8 text-2xl font-semibold">3. Types of Cookies We Use</h2>
          
          <h3 className="mt-6 text-xl font-semibold">Session Cookies</h3>
          <p>
            These are temporary cookies that are erased when you close your browser. They are used to maintain your session while you navigate our website.
          </p>
          
          <h3 className="mt-6 text-xl font-semibold">Persistent Cookies</h3>
          <p>
            These remain on your device after you close your browser. They help our website recognize you as a returning visitor and remember your preferences.
          </p>
          
          <h3 className="mt-6 text-xl font-semibold">First-Party Cookies</h3>
          <p>
            These are set by our website directly.
          </p>
          
          <h3 className="mt-6 text-xl font-semibold">Third-Party Cookies</h3>
          <p>
            These are set by third-party services we use, such as analytics providers.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">4. Managing Cookies</h2>
          <p>
            Most web browsers allow you to control cookies through their settings. You can usually find these settings in the "Options," "Preferences," or "Settings" menu of your browser. You can:
          </p>
          <ul className="list-disc pl-8">
            <li>Delete all cookies</li>
            <li>Block all cookies</li>
            <li>Allow only first-party cookies</li>
            <li>Clear cookies when you close your browser</li>
          </ul>
          <p className="mt-4">
            Please note that if you choose to block or delete cookies, some features of our website may not function properly.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">5. Changes to Our Cookie Policy</h2>
          <p>
            We may update our Cookie Policy from time to time. Any changes will be posted on this page, and if the changes are significant, we will provide a more prominent notice.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">6. Contact Us</h2>
          <p>
            If you have any questions about our Cookie Policy, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> hello@moneko.io
          </p>
        </div>
        
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="text-purple-600 hover:text-purple-800">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-purple-600 hover:text-purple-800">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
