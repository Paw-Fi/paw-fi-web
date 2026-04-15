import { Link, createFileRoute } from "@tanstack/react-router";
import { ShadcnSignInForm } from "@/components/auth/shadcn-sign-in-form";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import authBg from "@/assets/images/auth/auth-bg.webp";
import authBgPng from "@/assets/images/auth/auth-bg.png";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { StructuredData } from "@/components/seo/structured-data";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const Route = createFileRoute("/login/")({
  component: Login,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl("/login");
    const meta = seo({
      title: "Sign In - Access Your Financial Dashboard | Moneko",
      description:
        "Sign in to access personalized financial education, AI coaching, portfolio tracking & smart calculators.",
      keywords:
        "sign in, login, Moneko, financial education, user account, secure login, financial dashboard access",
      url: pageUrl,
    });

    // GEO-Optimized Organization Schema for Login Context
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Moneko",
      description:
        "AI-powered financial education platform providing personalized budgeting, investment guidance, and wealth-building tools",
      url: "https://moneko.io",
      logo: "https://moneko.io/logo192.png",
      sameAs: [
        "https://linkedin.com/company/moneko-ai",
        "https://x.com/moneko_ai",
        "https://facebook.com/moneko-ai",
      ],
      serviceType: "Financial Education Technology",
      areaServed: "United States",
      knowsAbout: [
        "Personal Finance",
        "Investment Strategy",
        "Budgeting",
        "Financial Planning",
        "Wealth Building",
        "AI-Powered Financial Coaching",
      ],
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
          children: JSON.stringify(organizationSchema),
        },
      ],
    };
  },
});

export function Login() {
  const { redirect } = Route.useSearch();

  return (
    <>
      {/* GEO-Optimized FAQ Schema for Login Process */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "How do I securely access my Moneko financial dashboard?",
            answer:
              "Sign in with your registered email and password to access your dashboard and account features.",
          },
          {
            question: "What features are available after logging into Moneko?",
            answer:
              "Once logged in, you'll access your personalized financial dashboard with AI coaching, portfolio tracking, budgeting tools, investment calculators, educational courses, and progress tracking for your financial goals.",
          },
          {
            question: "Is my login information secure with Moneko?",
            answer:
              "We use encryption in transit and follow industry-standard security practices to protect your account.",
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
              <span>New to Moneko?</span>
              <Button asChild size="sm" variant="outline">
                <Link to="/register" search={{ redirect }}>
                  Register
                </Link>
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 items-center">
            <div className="mx-auto w-full max-w-md px-6 py-8">
              {/* Heading */}
              <div className="mb-8">
                <h1 className="text-moneko-foreground text-3xl font-semibold tracking-tight">
                  Login to your account
                </h1>
                <p className="text-muted-foreground mt-1">
                  Access your personalized financial education and AI coaching
                  dashboard.
                </p>
              </div>

              {/* Form */}
              <ShadcnSignInForm
                variant="plain"
                hideHeader
                redirectUrl={redirect}
                submitLabel="Login"
              >
                <Dialog>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="remember"
                      className="flex items-center gap-2"
                    >
                      <Checkbox id="remember" />
                      <span className="text-muted-foreground text-sm">
                        Remember me
                      </span>
                    </label>
                    <DialogTrigger asChild>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-sm"
                        type="button"
                      >
                        Forgot password?
                      </Button>
                    </DialogTrigger>
                  </div>

                  <DialogContent>
                    <ForgotPasswordForm />
                  </DialogContent>
                </Dialog>
              </ShadcnSignInForm>
            </div>
          </div>
        </div>

        {/* Right: Image side */}
        <div className="relative m-4 ml-0 hidden overflow-hidden rounded-3xl lg:block">
          <OptimizedImage
            src={authBgPng}
            webpSrc={authBg}
            alt="Secure financial dashboard access for personalized budgeting and investment education"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-90 dark:contrast-80"
            priority={true}
            loading="eager"
            width={1080}
            height={1080}
          />

          {/* GEO-Enhanced Value Proposition Overlay */}
          <div className="bg-overlay/80 dark:text-moneko-foreground absolute right-6 bottom-6 left-6 rounded-lg p-4 text-white backdrop-blur-sm">
            <h3 className="dark:text-moneko-foreground mb-2 font-semibold text-white">
              Sign in to continue
            </h3>
            <ul className="dark:text-moneko-foreground space-y-1 text-sm text-white opacity-90">
              <li>• AI-powered personalized financial coaching</li>
              <li>• Expert-designed investment education courses</li>
              <li>• Real-time portfolio tracking and analysis</li>
              <li>• Tools to help you stay organized</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
