import { Link, createFileRoute } from "@tanstack/react-router";
import { ShadcnSignUpForm } from "@/components/auth/shadcn-sign-up-form";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import authBg from "@/assets/images/auth/auth-bg.webp";
import authBgPng from "@/assets/images/auth/auth-bg.png";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { StructuredData } from "@/components/seo/structured-data";
import { OptimizedImage } from "@/components/seo/optimized-image";

export const Route = createFileRoute("/register/")({
  component: Register,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
      code: (search.code as string) || undefined,
      trial: search.trial === true || search.trial === "true",
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl("/register");
    const meta = seo({
      title: "Sign Up Free - Start Your Financial Journey | Moneko",
      description:
        "Create free account for personalized financial education, AI coaching, portfolio tracking & calculators.",
      keywords:
        "sign up, register, create account, Moneko, financial education, free account, personal finance, AI coaching, investment education",
      url: pageUrl,
    });

    // GEO-Optimized Service Schema for Registration
    const serviceSchema = {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Moneko Financial Education Platform Registration",
      description:
        "Free registration for comprehensive financial education platform with AI coaching, investment guidance, and personalized budgeting tools",
      provider: {
        "@type": "Organization",
        name: "Moneko",
        url: "https://moneko.io",
        logo: "https://moneko.io/logo192.png",
      },
      serviceType: "Financial Education Technology",
      areaServed: "United States",
      availableChannel: {
        "@type": "ServiceChannel",
        serviceUrl: "https://moneko.io/register",
        serviceSmsNumber: null,
        servicePhone: null,
      },
      category: "Financial Education",
      audience: {
        "@type": "Audience",
        audienceType: "Individual Financial Learners",
        geographicArea: "United States",
      },
      offers: {
        "@type": "Offer",
        name: "Free Financial Education Account",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    };

    return {
      meta: [
        ...meta,
        {
          name: "robots",
          content: "noindex, nofollow",
        },
      ],
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(serviceSchema),
        },
      ],
    };
  },
});

export function Register() {
  const { redirect, code, trial } = Route.useSearch();

  return (
    <>
      {/* GEO-Optimized FAQ Schema for Registration Process */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What do I get with a free Moneko account?",
            answer:
              "Free Moneko accounts include access to basic financial calculators, educational content, budgeting tools, and limited AI coaching sessions. You can track your financial progress and access expert-designed learning modules.",
          },
          {
            question:
              "How quickly can I start learning about personal finance on Moneko?",
            answer:
              "Immediately after registration! Your personalized financial education dashboard is ready in under 60 seconds, with AI-powered recommendations based on your financial goals and experience level.",
          },
          {
            question: "Is my personal information secure during registration?",
            answer:
              "We use encryption in transit and follow industry-standard security practices to protect your account and personal information.",
          },
        ]}
      />

      <div className="bg-moneko-background grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left: Form side */}
        <div className="relative flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4">
            <MonekoIcon />
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>Already have an account?</span>
              <Button asChild size="sm" variant="outline">
                <Link to="/login" search={{ redirect }}>
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-1 items-center">
            <div className="mx-auto w-full max-w-md px-6 py-8">
              {/* Referral Code Badge (if present) */}
              {code && (
                <div className="mb-6 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4 dark:border-purple-700 dark:from-purple-900/20 dark:to-pink-900/20">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    >
                      Referral Invitation
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    You've been invited. Complete registration to accept this
                    invitation and get 50% off the lifetime plan at checkout.
                  </p>
                  <p className="mt-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                    Code: {code}
                  </p>
                </div>
              )}

              {/* Header */}
              <div className="mb-8">
                <h1 className="text-moneko-foreground text-3xl font-semibold tracking-tight">
                  {code
                    ? "Accept Your Invitation"
                    : "Start Your Financial Journey"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {code
                    ? "Create your account to accept this referral and continue to checkout with 50% off the lifetime plan."
                    : "Create your free account to access personalized financial education, AI coaching, and wealth-building tools."}
                </p>
              </div>
              {/* Sign Up Form */}
              <ShadcnSignUpForm
                redirectUrl={code ? `/referral/${code}` : redirect}
                hideBottomLink
                variant="plain"
                hideHeader
                trial={trial}
              />

              {/* Additional Information */}
              <div className="mx-auto mt-8 max-w-md space-y-4 text-center">
                <p className="text-muted-foreground text-xs">
                  By creating an account, you agree to our{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs underline"
                    asChild
                  >
                    <Link to="/terms-of-service">Terms of Service</Link>
                  </Button>{" "}
                  and{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs underline"
                    asChild
                  >
                    <Link to="/privacy-policy">Privacy Policy</Link>
                  </Button>
                </p>

                {/* Links moved to top bar */}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Image side */}
        <div className="relative m-4 ml-0 hidden overflow-hidden rounded-3xl lg:block">
          <OptimizedImage
            src={authBgPng}
            webpSrc={authBg}
            alt="Start your financial education journey with expert-designed courses and AI coaching"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-90 dark:contrast-80"
            priority={true}
            loading="eager"
            width={1080}
            height={1080}
          />

          {/* GEO-Enhanced Success Stories & Benefits */}
          <div className="bg-overlay/80 dark:text-moneko-foreground absolute right-6 bottom-6 left-6 rounded-lg p-4 text-white backdrop-blur-sm">
            <h3 className="dark:text-moneko-foreground mb-3 font-semibold text-white">
              What You'll Get (100% Free)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="dark:text-moneko-foreground font-medium text-white">
                  ✓ AI Financial Coach
                </p>
                <p className="dark:text-moneko-foreground text-xs text-white opacity-90">
                  Personalized guidance
                </p>
              </div>
              <div>
                <p className="dark:text-moneko-foreground font-medium text-white">
                  ✓ Expert Courses
                </p>
                <p className="dark:text-moneko-foreground text-xs text-white opacity-90">
                  Practical lessons
                </p>
              </div>
              <div>
                <p className="dark:text-moneko-foreground font-medium text-white">
                  ✓ Smart Calculators
                </p>
                <p className="dark:text-moneko-foreground text-xs text-white opacity-90">
                  Investment & retirement
                </p>
              </div>
              <div>
                <p className="dark:text-moneko-foreground font-medium text-white">
                  ✓ Progress Tracking
                </p>
                <p className="dark:text-moneko-foreground text-xs text-white opacity-90">
                  Monitor your wealth
                </p>
              </div>
            </div>
            <p className="dark:text-moneko-foreground mt-3 text-xs text-white opacity-75">
              Create an account to get started
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Register;
