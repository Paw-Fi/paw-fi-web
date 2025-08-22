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
import authBg from '@/assets/images/auth/auth-bg.png';
import { MonekoIcon } from '@/components/shared/moneko-icon';

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
      title: 'Sign In | Moneko',
      description: 'Sign in to your Moneko account to access personalized financial education, calculators, and AI chat.',
      keywords: 'sign in, login, Moneko, financial education, user account',
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
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
              <h2 className="text-3xl font-semibold tracking-tight">Login to your account</h2>
              <p className="text-muted-foreground mt-1">Enter your details to login.</p>
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
                    <DialogTitle>Reset your password</DialogTitle>
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
                    <label htmlFor="resetEmail" className="text-sm font-medium">Email</label>
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
        <img
          src={authBg}
          alt="Authentication background"
          className="absolute inset-0 h-full w-full object-cover dark:contrast-80 dark:brightness-90"
        />
      </div>
    </div>
  );
}

export default Login;
