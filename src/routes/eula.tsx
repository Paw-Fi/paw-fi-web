import { createFileRoute, Link } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute("/eula")({
  component: EULA,
  head: () => {
    const pageUrl = getCanonicalUrl("/eula");
    const meta = seo({
      title: "End User License Agreement (EULA) | Moneko",
      description:
        "Moneko's End User License Agreement for mobile app subscriptions. Learn about the terms and conditions for using Moneko on iOS and Android.",
      keywords:
        "EULA, end user license agreement, app license, Moneko license, subscription terms",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    // Add structured data for EULA page
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "End User License Agreement",
      description: "Moneko's End User License Agreement for mobile app usage",
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

function EULA() {
  return (
    <div className="flex-1 bg-white px-6 py-12 md:px-12 lg:px-24">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center text-purple-600 hover:text-purple-800"
        >
          &larr; Back to Home
        </Link>

        <h1 className="mb-8 text-4xl font-bold">
          End User License Agreement (EULA)
        </h1>

        <div className="prose max-w-none">
          <p className="text-lg text-gray-700">
            Last updated: January 27, 2025
          </p>

          <div className="my-8 rounded-lg border border-purple-200 bg-purple-50 p-6">
            <h3 className="mb-3 text-lg font-semibold text-purple-900">
              Apple Standard EULA
            </h3>
            <p className="mb-4 text-gray-700">
              Moneko's mobile application uses the Apple Standard End User
              License Agreement (EULA) for all iOS App Store purchases and
              subscriptions.
            </p>
            <a
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center font-semibold text-purple-600 hover:text-purple-800"
            >
              View Apple's Standard EULA →
            </a>
          </div>

          <h2 className="mt-8 text-2xl font-semibold">1. License Grant</h2>
          <p>
            Subject to your compliance with these terms, Moneko grants you a
            limited, non-exclusive, non-transferable, revocable license to
            download, install, and use the Moneko mobile application for your
            personal, non-commercial use on your mobile device.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">2. Subscription Terms</h2>
          <p>Moneko offers auto-renewing subscription plans:</p>
          <ul className="list-disc pl-8">
            <li>
              <strong>Monthly Subscription:</strong> Renews automatically every
              month
            </li>
            <li>
              <strong>Yearly Subscription:</strong> Renews automatically every
              year
            </li>
            <li>
              <strong>Lifetime Purchase:</strong> One-time payment for permanent
              access
            </li>
          </ul>

          <h3 className="mt-6 text-xl font-semibold">
            Auto-Renewal and Cancellation
          </h3>
          <p>
            Payment will be charged to your iTunes Account at confirmation of
            purchase. Subscriptions automatically renew unless auto-renew is
            turned off at least 24 hours before the end of the current period.
            Your account will be charged for renewal within 24 hours prior to
            the end of the current period.
          </p>
          <p className="mt-4">
            You can manage and cancel your subscriptions by going to your
            account settings on the App Store after purchase. Cancellation takes
            effect at the end of the current billing period.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">3. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-8">
            <li>Reverse engineer, decompile, or disassemble the application</li>
            <li>
              Remove any copyright, trademark, or other proprietary notices
            </li>
            <li>Use the application for any unlawful purpose</li>
            <li>
              Attempt to gain unauthorized access to any portion of the
              application
            </li>
            <li>Share your account credentials with others</li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">
            4. Intellectual Property Rights
          </h2>
          <p>
            The Moneko application and all content, features, and functionality
            are owned by Moneko and are protected by international copyright,
            trademark, patent, trade secret, and other intellectual property
            laws.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">5. Privacy</h2>
          <p>
            Your use of the Moneko application is also governed by our Privacy
            Policy. Please review our{" "}
            <Link
              to="/privacy-policy"
              className="text-purple-600 hover:text-purple-800"
            >
              Privacy Policy
            </Link>{" "}
            to understand our practices.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">
            6. Disclaimer of Warranties
          </h2>
          <p>
            THE APPLICATION IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT
            LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">
            7. Limitation of Liability
          </h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MONEKO SHALL NOT BE LIABLE
            FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED
            DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER
            INTANGIBLE LOSSES.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">8. Refund Policy</h2>
          <p>
            All purchases made through the Apple App Store are subject to
            Apple's refund policies. To request a refund, please contact Apple
            Support directly through the App Store or visit
            <a
              href="https://support.apple.com/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-purple-600 hover:text-purple-800"
            >
              Apple Billing Support
            </a>
            .
          </p>

          <h2 className="mt-8 text-2xl font-semibold">
            9. Termination and Data Rights
          </h2>
          <p>
            We may terminate or suspend your access to the application
            immediately, without prior notice or liability, for any reason,
            including if you breach these terms. Upon termination, your right to
            use the application will immediately cease.
          </p>
          <p className="mt-4">
            You retain the right to export all your data at any time and can
            permanently delete your account and all associated data with one
            click. We do not keep backup copies of deleted user data, ensuring
            complete privacy even after you stop using our service.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">
            10. Changes to This EULA
          </h2>
          <p>
            We reserve the right to modify this EULA at any time. We will notify
            users of any material changes through the application or by email.
            Your continued use of the application after such modifications
            constitutes your acceptance of the updated terms.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">11. Governing Law</h2>
          <p>
            This EULA shall be governed by and construed in accordance with the
            laws of the jurisdiction in which Moneko operates, without regard to
            its conflict of law provisions. For purchases made through the Apple
            App Store, Apple's terms and conditions also apply.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">
            12. Contact Information
          </h2>
          <p>
            If you have any questions about this EULA, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> hello@moneko.io
          </p>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex gap-4">
            <Link
              to="/privacy-policy"
              className="text-purple-600 hover:text-purple-800"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-of-service"
              className="text-purple-600 hover:text-purple-800"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
