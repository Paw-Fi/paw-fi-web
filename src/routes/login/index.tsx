import { useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ShadcnSignInForm } from '@/components/auth/shadcn-sign-in-form';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import authBg from '@/assets/images/auth/auth-bg.webp';
import authBgPng from '@/assets/images/auth/auth-bg.png';
import { MonekoIcon } from '@/components/shared/moneko-icon';
import { StructuredData } from '@/components/seo/structured-data';
import { OptimizedImage } from '@/components/seo/optimized-image';

export const Route = createFileRoute('/login/')({  
  component: Login,
validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl('/login');
    const meta = seo({
      title: 'Sign In - Access Your Financial Dashboard | Moneko',
      description: 'Sign in to access personalized financial education, AI coaching, portfolio tracking & smart calculators.',
      keywords: 'sign in, login, Moneko, financial education, user account, secure login, financial dashboard access',
      url: pageUrl,
    });

    // GEO-Optimized Organization Schema for Login Context
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Moneko",
      "description": "AI-powered financial education platform providing personalized budgeting, investment guidance, and wealth-building tools",
      "url": "https://moneko.io",
      "logo": "https://moneko.io/logo192.png",
      "sameAs": [
        "https://linkedin.com/company/moneko-ai",
        "https://x.com/moneko_ai",
        "https://facebook.com/moneko-ai"
      ],
      "founder": {
        "@type": "Person",
        "name": "Sabina Shao",
        "jobTitle": "CEO & Financial Education Expert",
        "description": "CFA charterholder and financial education expert with over 10 years of experience in personal finance and investment strategy"
      },
      "serviceType": "Financial Education Technology",
      "areaServed": "United States",
      "knowsAbout": [
        "Personal Finance",
        "Investment Strategy",
        "Budgeting",
        "Financial Planning",
        "Wealth Building",
        "AI-Powered Financial Coaching"
      ]
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
          children: JSON.stringify(organizationSchema),
        },
      ],
    };
  },
});

export function Login() {
  const { redirect } = Route.useSearch();
  const [resetEmail, setResetEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function handleSendReset() {
    setResetError(null);
    setResetSent(false);
    if (!resetEmail) {
      setResetError('Please enter your email address');
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset email');
    } finally {
      setIsSending(false);
    }
  }
  
  return (
    <>
      {/* GEO-Optimized FAQ Schema for Login Process */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "How do I securely access my Moneko financial dashboard?",
            answer: "Sign in with your registered email and password to access your personalized financial dashboard, AI coaching sessions, investment tracking, and educational content. We use bank-level security to protect your account."
          },
          {
            question: "What features are available after logging into Moneko?",
            answer: "Once logged in, you'll access your personalized financial dashboard with AI coaching, portfolio tracking, budgeting tools, investment calculators, educational courses, and progress tracking for your financial goals."
          },
          {
            question: "Is my login information secure with Moneko?",
            answer: "Yes, Moneko uses bank-level 256-bit SSL encryption and SOC 2 compliance to protect your login credentials. We follow industry-standard security practices to keep your financial information safe."
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
              <span>New to Moneko?</span>
              <Button asChild size="sm" variant="outline">
                <Link to="/register" search={{ redirect }}>Register</Link>
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-md mx-auto px-6 py-8">
            

              {/* Heading */}
              <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight text-moneko-foreground">Login to your account</h1>
                <p className="text-muted-foreground mt-1">Access your personalized financial education and AI coaching dashboard.</p>
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
                  <label htmlFor="remember" className="flex items-center gap-2">
                    <Checkbox id="remember" />
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>
                  <DialogTrigger asChild>
                    <Button variant="link" className="p-0 h-auto text-sm" type="button">
                      Forgot password?
                    </Button>
                  </DialogTrigger>
                </div>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-moneko-foreground">Reset your password</DialogTitle>
                    <DialogDescription>
                      Enter your email and we will send you a password reset link.
                    </DialogDescription>
                  </DialogHeader>

                  {resetError && (
                    <Alert variant="destructive">
                      <AlertDescription>{resetError}</AlertDescription>
                    </Alert>
                  )}

                  {resetSent && (
                    <Alert variant="default">
                      <AlertDescription>Check your email for the reset link.</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    <label htmlFor="resetEmail" className="text-sm font-medium text-moneko-foreground">Email</label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                    />
                  </div>

                  <DialogFooter>
                    <Button onClick={handleSendReset} disabled={isSending || !resetEmail}>
                      {isSending ? 'Sending…' : 'Send reset link'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </ShadcnSignInForm>
          </div>
        </div>
      </div>

      {/* Right: Image side */}
      <div className="hidden lg:block relative overflow-hidden rounded-3xl m-4 ml-0">
        <OptimizedImage
          src={authBgPng}
          webpSrc={authBg}
          alt="Secure financial dashboard access for personalized budgeting and investment education"
          className="absolute inset-0 h-full w-full object-cover dark:contrast-80 dark:brightness-90"
          priority={true}
          loading="eager"
          width={1080}
          height={1080}
        />
        
        {/* GEO-Enhanced Value Proposition Overlay */}
        <div className="absolute bottom-6 left-6 right-6 p-4 bg-overlay/80 backdrop-blur-sm rounded-lg text-white dark:text-moneko-foreground">
          <h3 className="font-semibold mb-2 text-white dark:text-moneko-foreground">Join 50,000+ Users Building Wealth</h3>
          <ul className="text-sm space-y-1 opacity-90 text-white dark:text-moneko-foreground">
            <li>• AI-powered personalized financial coaching</li>
            <li>• Expert-designed investment education courses</li>
            <li>• Real-time portfolio tracking and analysis</li>
            <li>• Created by CFA charterholder financial experts</li>
          </ul>
        </div>
      </div>
    </div>
    </>
  );
}

export default Login;
