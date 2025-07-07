import { createFileRoute, Link } from "@tanstack/react-router";
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

export const Route = createFileRoute('/privacy-policy')({
  component: PrivacyPolicy,
  head: () => {
    const pageUrl = getCanonicalUrl('/privacy-policy');
    const meta = seo({
      title: 'Privacy Policy | Moneko',
      description: 'Learn how Moneko collects, uses, and protects your personal information when you use our financial education services.',
      keywords: 'privacy policy, data protection, personal information, Moneko privacy',
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });
    
    // Add structured data for privacy policy page
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Privacy Policy",
      "description": "Moneko's privacy policy explaining how we collect, use, and protect your personal information",
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

function PrivacyPolicy() {
  return (
    <div className="flex-1 bg-white px-6 py-12 md:px-12 lg:px-24">
      <div className="mx-auto max-w-4xl">
        <Link 
          to="/" 
          className="mb-8 inline-flex items-center text-purple-600 hover:text-purple-800"
        >
          &larr; Back to Home
        </Link>
        
        <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>
        
        <div className="prose max-w-none">
          <p className="text-lg text-gray-700">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="mt-8 text-2xl font-semibold">1. Introduction</h2>
          <p>
            Welcome to Moneko's Privacy Policy. This policy explains how we collect, use, and protect your personal information when you use our services.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">2. Information We Collect</h2>
          <p>
            We may collect the following types of information:
          </p>
          <ul className="list-disc pl-8">
            <li>Contact information (such as name and email address)</li>
            <li>Usage data (how you interact with our services)</li>
            <li>Device information (browser type, IP address)</li>
          </ul>
          
          <h2 className="mt-8 text-2xl font-semibold">3. How We Use Your Information</h2>
          <p>
            We use your information to:
          </p>
          <ul className="list-disc pl-8">
            <li>Provide and improve our services</li>
            <li>Communicate with you about updates or changes</li>
            <li>Personalize your experience</li>
            <li>Analyze usage patterns to improve functionality</li>
          </ul>
          
          <h2 className="mt-8 text-2xl font-semibold">4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">5. Third-Party Services</h2>
          <p>
            Our service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites and encourage you to read their privacy policies.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">6. Your Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal information, including:
          </p>
          <ul className="list-disc pl-8">
            <li>The right to access your data</li>
            <li>The right to correct inaccurate data</li>
            <li>The right to delete your data</li>
            <li>The right to restrict processing</li>
          </ul>
          
          <h2 className="mt-8 text-2xl font-semibold">7. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">8. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> privacy@moneko.io
          </p>
        </div>
        
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex gap-4">
            <Link to="/terms-of-service" className="text-purple-600 hover:text-purple-800">
              Terms of Service
            </Link>
            <Link to="/cookie-policy" className="text-purple-600 hover:text-purple-800">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
