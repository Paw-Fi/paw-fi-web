import { createFileRoute, Link } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicy,
  head: () => {
    const pageUrl = getCanonicalUrl("/privacy-policy");
    const meta = seo({
      title: "Privacy Policy | Moneko",
      description:
        "Learn how Moneko collects, uses, and protects your personal information when you use our financial education services.",
      keywords:
        "privacy policy, data protection, personal information, Moneko privacy",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    // Add structured data for privacy policy page
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Privacy Policy",
      description:
        "Moneko's privacy policy explaining how we collect, use, and protect your personal information",
      url: pageUrl,
      publisher: {
        "@type": "Organization",
        name: "Moneko",
        url: "https://moneko.io/",
      },
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
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
          <p className="text-lg text-gray-700">Last updated: 2026-09-02</p>

          <h2 className="mt-8 text-2xl font-semibold">1. Introduction</h2>
          <p>
            Welcome to Moneko's Privacy Policy. This policy explains how we
            collect, use, and protect your personal information when you use our
            services.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">
            2. Information We Collect
          </h2>
          <p>We may collect the following types of information:</p>
          <ul className="list-disc pl-8">
            <li>Contact information (such as name and email address)</li>
            <li>Usage data (how you interact with our services)</li>
            <li>Device information (browser type, IP address)</li>
            <li>
              Financial data you add or import, such as transactions, balances,
              budgets, recurring items, and receipts
            </li>
            <li>
              Bank transaction and balance data that Plaid provides when you
              choose to use Bank Sync; Moneko does not receive or store your
              bank login credentials
            </li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">
            3. How We Use Your Information
          </h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-8">
            <li>Provide and improve our services</li>
            <li>Communicate with you about updates or changes</li>
            <li>Personalize your experience</li>
            <li>Analyze usage patterns to improve functionality</li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">4. Data Security</h2>
          <p>
            We use AES-256 encryption at rest and TLS 1.2+ encryption in transit
            to protect data sent between your device and our services. Moneko is
            not an end-to-end encrypted service. Access to production data is
            restricted to authorized personnel and systems that need it to
            operate, secure, or support the service. However, no method of
            transmission over the Internet is 100% secure, and we cannot
            guarantee absolute security.
          </p>

          <h3 className="mt-6 text-xl font-semibold">Data Location</h3>
          <p>
            Our production application data is hosted by Supabase in AWS&apos;s
            US East (Ohio) region (us-east-2). Third-party services, including
            Plaid, Google Gemini, and payment providers, process data under
            their own terms and may use different locations.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">5. AI Processing</h2>
          <p>
            Moneko uses Google Gemini for selected AI features. The information
            sent depends on the feature you use: expense capture can send the
            text, receipt, image, or voice-derived information you submit;
            financial guidance and scenario planning can also send the relevant
            Moneko financial context needed to answer your request, such as
            applicable transactions, balances, budgets, recurring items, and
            conversation context. We do not send bank login credentials to
            Gemini.
          </p>
          <p>
            We use Gemini through its paid API. Prompts, attachments, and
            responses are not used to train Google&apos;s models. Google may
            retain API prompts and responses for a limited period for safety,
            abuse prevention, and legal requirements. Moneko may retain the
            records and conversation history needed to provide an AI feature;
            you can delete your conversation history or account data from
            Moneko.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">
            6. Data Export and Deletion
          </h2>
          <p>
            We believe your financial data is yours alone. You have complete
            control over your data with the following rights:
          </p>

          <h3 className="mt-6 text-xl font-semibold">Data Export</h3>
          <p>
            You can export all your data from Moneko at any time, free of
            charge. We provide:
          </p>
          <ul className="list-disc pl-8">
            <li>
              Excel (.xlsx) format downloads of your complete transaction
              history
            </li>
            <li>
              CSV format exports for compatibility with other financial tools
            </li>
            <li>Instant download access from your account settings</li>
            <li>No restrictions on how you use your exported data</li>
          </ul>
          <p className="mt-3">
            This allows you to maintain your own backups, perform custom
            analysis, or migrate to other services seamlessly.
          </p>

          <h3 className="mt-6 text-xl font-semibold">Complete Data Deletion</h3>
          <p>
            If you decide to stop using Moneko, you can permanently delete your
            account and all associated data with a single click:
          </p>
          <ul className="list-disc pl-8">
            <li>One-click account deletion from your settings</li>
            <li>
              Immediate removal of all personal information and financial data
            </li>
            <li>No backup copies retained by Moneko</li>
            <li>
              Irreversible deletion - once deleted, data cannot be recovered
            </li>
          </ul>
          <p className="mt-3">
            We implement true deletion, not just deactivation. When you delete
            your account, we permanently remove all your data from our systems.
            We do not keep backups of deleted user data, ensuring your privacy
            is maintained even after you leave our service.
          </p>

          <h3 className="mt-6 text-xl font-semibold">Our Commitment</h3>
          <p>
            These features reflect our commitment to data ownership and user
            privacy:
          </p>
          <ul className="list-disc pl-8">
            <li>
              We never sell your personal or financial data to third parties
            </li>
            <li>We make it easy for you to take your data with you</li>
            <li>We respect your right to complete data removal</li>
            <li>
              We believe in zero lock-in - you should always control your
              financial information
            </li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">
            7. Third-Party Services
          </h2>
          <p>
            Our service may contain links to third-party websites. We are not
            responsible for the privacy practices of these external sites and
            encourage you to read their privacy policies.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">8. Your Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding
            your personal information, including:
          </p>
          <ul className="list-disc pl-8">
            <li>The right to access your data</li>
            <li>The right to correct inaccurate data</li>
            <li>The right to delete your data</li>
            <li>The right to restrict processing</li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">
            9. Changes to This Policy
          </h2>
          <p>
            We may update this privacy policy from time to time. We will notify
            you of any changes by posting the new policy on this page.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us
            at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> hello@moneko.io
          </p>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex gap-4">
            <Link
              to="/terms-of-service"
              className="text-purple-600 hover:text-purple-800"
            >
              Terms of Service
            </Link>
            <Link
              to="/cookie-policy"
              className="text-purple-600 hover:text-purple-800"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
