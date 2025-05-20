import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute('/terms-of-service')({
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <div className="flex-1 bg-white px-6 py-12 md:px-12 lg:px-24">
      <div className="mx-auto max-w-4xl">
        <Link 
          to="/" 
          className="mb-8 inline-flex items-center text-purple-600 hover:text-purple-800"
        >
          &larr; Back to Home
        </Link>
        
        <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
        
        <div className="prose max-w-none">
          <p className="text-lg text-gray-700">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="mt-8 text-2xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Paw-Fi's services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">2. Description of Service</h2>
          <p>
            Paw-Fi provides an educational platform designed to help users learn financial concepts in an engaging way. Our services may include interactive lessons, quizzes, and personalized learning paths.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">3. User Accounts</h2>
          <p>
            When you create an account with us, you agree to provide accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">4. Acceptable Use</h2>
          <p>
            You agree not to:
          </p>
          <ul className="list-disc pl-8">
            <li>Use our services for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to any portion of our services</li>
            <li>Interfere with or disrupt the integrity or performance of the services</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Infringe the intellectual property rights of others</li>
          </ul>
          
          <h2 className="mt-8 text-2xl font-semibold">5. Intellectual Property</h2>
          <p>
            All content on Paw-Fi, including text, graphics, logos, and software, is the property of Paw-Fi or its content suppliers and is protected by copyright and other intellectual property laws.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">6. Disclaimer of Warranties</h2>
          <p>
            Our services are provided "as is" without warranties of any kind, either express or implied. We do not guarantee that our services will be uninterrupted, secure, or error-free.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">7. Limitation of Liability</h2>
          <p>
            Paw-Fi shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of our services.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">8. Educational Content Disclaimer</h2>
          <p>
            The educational content provided by Paw-Fi is for informational purposes only and does not constitute financial advice. Users should consult with qualified financial professionals before making investment decisions.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">9. Modification of Terms</h2>
          <p>
            We reserve the right to modify these Terms of Service at any time. We will notify users of any material changes through our website or by email.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">10. Governing Law</h2>
          <p>
            These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction in which Paw-Fi operates, without regard to its conflict of law provisions.
          </p>
          
          <h2 className="mt-8 text-2xl font-semibold">11. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> legal@paw-fi.com
          </p>
        </div>
        
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="text-purple-600 hover:text-purple-800">
              Privacy Policy
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
