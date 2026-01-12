import { Link, createFileRoute } from '@tanstack/react-router';
import { ShadcnSignUpForm } from '@/components/auth/shadcn-sign-up-form';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import authBg from '@/assets/images/auth/auth-bg.webp';
import authBgPng from '@/assets/images/auth/auth-bg.png';
import { MonekoIcon } from '@/components/shared/moneko-icon';
import { StructuredData } from '@/components/seo/structured-data';
import { OptimizedImage } from '@/components/seo/optimized-image';

export const Route = createFileRoute('/register/')({
  component: Register,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
      code: (search.code as string) || undefined,
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl('/register');
    const meta = seo({
      title: 'Sign Up Free - Start Your Financial Journey | Moneko',
      description: 'Create free account for personalized financial education, AI coaching, portfolio tracking & calculators.',
      keywords: 'sign up, register, create account, Moneko, financial education, free account, personal finance, AI coaching, investment education',
      url: pageUrl,
    });

    // GEO-Optimized Service Schema for Registration
    const serviceSchema = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Moneko Financial Education Platform Registration",
      "description": "Free registration for comprehensive financial education platform with AI coaching, investment guidance, and personalized budgeting tools",
      "provider": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://moneko.io",
        "logo": "https://moneko.io/logo192.png",
        "founder": {
          "@type": "Person",
          "name": "Sabina Shao",
          "jobTitle": "CEO & Financial Education Expert",
          "hasCredential": "CFA Charterholder"
        }
      },
      "serviceType": "Financial Education Technology",
      "areaServed": "United States",
      "availableChannel": {
        "@type": "ServiceChannel",
        "serviceUrl": "https://moneko.io/register",
        "serviceSmsNumber": null,
        "servicePhone": null
      },
      "category": "Financial Education",
      "audience": {
        "@type": "Audience",
        "audienceType": "Individual Financial Learners",
        "geographicArea": "United States"
      },
      "offers": {
        "@type": "Offer",
        "name": "Free Financial Education Account",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    };
    
    return {
      meta,
      links: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(serviceSchema),
        },
      ],
    };
  },
});

export function Register() {
  const { redirect, code } = Route.useSearch();

  return (
    <>
      {/* GEO-Optimized FAQ Schema for Registration Process */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What do I get with a free Moneko account?",
            answer: "Free Moneko accounts include access to basic financial calculators, educational content, budgeting tools, and limited AI coaching sessions. You can track your financial progress and access expert-designed learning modules."
          },
          {
            question: "How quickly can I start learning about personal finance on Moneko?",
            answer: "Immediately after registration! Your personalized financial education dashboard is ready in under 60 seconds, with AI-powered recommendations based on your financial goals and experience level."
          },
          {
            question: "Is my personal information secure during registration?",
            answer: "Yes, Moneko uses bank-level 256-bit SSL encryption and follows SOC 2 compliance standards. We never share your personal information and use industry-leading security practices to protect your data."
          },
          {
            question: "Who created the financial education content on Moneko?",
            answer: "All content is created and reviewed by CFA charterholder Sabina Shao and a team of financial education experts with over 50 years of combined experience in personal finance, investment strategy, and wealth building."
          }
        ]}
      />

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-moneko-background">
        {/* Left: Form side */}
        <div className="relative flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4">
            <MonekoIcon />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Already have an account?</span>
              <Button asChild size="sm" variant="outline">
                <Link to="/login" search={{ redirect }}>Sign in</Link>
              </Button>
            </div>
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-md mx-auto px-6 py-8">

              {/* Referral Code Badge (if present) */}
              {code && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      Referral Invitation
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    You've been invited! Complete registration to accept this invitation and get lifetime premium access.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-mono">
                    Code: {code}
                  </p>
                </div>
              )}

              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight text-moneko-foreground">
                  {code ? 'Accept Your Invitation' : 'Start Your Financial Journey'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {code
                    ? 'Create your account to accept this referral and unlock lifetime premium access.'
                    : 'Create your free account to access personalized financial education, AI coaching, and wealth-building tools.'}
                </p>
              </div>
            {/* Sign Up Form */}
            <ShadcnSignUpForm
              redirectUrl={code ? `/referral/${code}` : redirect}
              hideBottomLink
              variant="plain"
              hideHeader
            />

            {/* Additional Information */}
            <div className="mt-8 max-w-md text-center space-y-4 mx-auto">
              <p className="text-xs text-muted-foreground">
                By creating an account, you agree to our{' '}
                <Button variant="link" className="p-0 h-auto text-xs underline" asChild>
                  <Link to="/terms-of-service">Terms of Service</Link>
                </Button>
                {' '}and{' '}
                <Button variant="link" className="p-0 h-auto text-xs underline" asChild>
                  <Link to="/privacy-policy">Privacy Policy</Link>
                </Button>
              </p>

              {/* Links moved to top bar */}
            </div>
          </div>
        </div>
      </div>

        {/* Right: Image side */}
        <div className="hidden lg:block relative overflow-hidden rounded-3xl m-4 ml-0">
        <OptimizedImage
          src={authBgPng}
          webpSrc={authBg}
          alt="Start your financial education journey with expert-designed courses and AI coaching"
          className="absolute inset-0 h-full w-full object-cover dark:contrast-80 dark:brightness-90"
          priority={true}
          loading="eager"
          width={1080}
          height={1080}
        />
        
        {/* GEO-Enhanced Success Stories & Benefits */}
        <div className="absolute bottom-6 left-6 right-6 p-4 bg-overlay/80 backdrop-blur-sm rounded-lg text-white dark:text-moneko-foreground">
          <h3 className="font-semibold mb-3 text-white dark:text-moneko-foreground">What You'll Get (100% Free)</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-medium text-white dark:text-moneko-foreground">✓ AI Financial Coach</p>
              <p className="opacity-90 text-xs text-white dark:text-moneko-foreground">Personalized guidance</p>
            </div>
            <div>
              <p className="font-medium text-white dark:text-moneko-foreground">✓ Expert Courses</p>
              <p className="opacity-90 text-xs text-white dark:text-moneko-foreground">CFA-designed curriculum</p>
            </div>
            <div>
              <p className="font-medium text-white dark:text-moneko-foreground">✓ Smart Calculators</p>
              <p className="opacity-90 text-xs text-white dark:text-moneko-foreground">Investment & retirement</p>
            </div>
            <div>
              <p className="font-medium text-white dark:text-moneko-foreground">✓ Progress Tracking</p>
              <p className="opacity-90 text-xs text-white dark:text-moneko-foreground">Monitor your wealth</p>
            </div>
          </div>
          <p className="text-xs mt-3 opacity-75 text-white dark:text-moneko-foreground">Join 50,000+ users building financial confidence</p>
        </div>
        </div>
      </div>
    </>
  );
}

export default Register;
