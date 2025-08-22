import { Link, createFileRoute } from '@tanstack/react-router';
import { ShadcnSignUpForm } from '@/components/auth/shadcn-sign-up-form';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import authBg from '@/assets/images/auth/auth-bg.png';
import { MonekoIcon } from '@/components/shared/moneko-icon';

export const Route = createFileRoute('/register/')({  
  component: Register,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search.redirect as string) || undefined,
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl('/register');
    const meta = seo({
      title: 'Sign Up | Moneko',
      description: 'Create a free Moneko account to access personalized financial education, calculators, and AI chat.',
      keywords: 'sign up, register, create account, Moneko, financial education, free account',
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});

export function Register() {
  const { redirect } = Route.useSearch();
  
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
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
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-tight">Register</h2>
              <p className="text-muted-foreground mt-1">                  Create an account to start your financial learning journey
              </p>
            </div>
            {/* Sign Up Form */}
            <ShadcnSignUpForm
              redirectUrl={redirect}
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
        <img
          src={authBg}
          alt="Authentication background"
          className="absolute inset-0 h-full w-full object-cover dark:contrast-80 dark:brightness-90"
        />
      </div>
    </div>
  );
}

export default Register;
