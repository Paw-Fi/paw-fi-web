'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

export const Route = createFileRoute('/reset-password/')({
  component: ResetPassword,
  head: () => {
    const pageUrl = getCanonicalUrl('/reset-password');
    const meta = seo({
      title: 'Reset Password | Moneko',
      description: 'Reset your Moneko account password',
      keywords: 'reset password, account recovery, Moneko',
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

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        console.log('[ResetPassword] Initializing recovery session', {
          href: window.location.href,
          searchParams: Object.fromEntries(url.searchParams.entries()),
        });

        // 1) Let Supabase JS handle any tokens in the URL first.
        //    With detectSessionInUrl enabled, getSession will parse the URL
        //    for password recovery tokens / PKCE codes and establish a session.
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession?.user) {
          console.log('[ResetPassword] Session already established from getSession', {
            userId: initialSession.user.id,
          });
          // Clean up common auth-related query params once we have a session
          ['code', 'token', 'token_hash', 'type'].forEach((param) => {
            url.searchParams.delete(param);
          });
          const cleanedSearch = url.searchParams.toString();
          const newUrl = cleanedSearch
            ? `${url.pathname}?${cleanedSearch}${url.hash}`
            : url.pathname + url.hash;
          window.history.replaceState({}, document.title, newUrl);
          setIsValidSession(true);
          return;
        }

        // 2) If no session yet but we have a PKCE code, try manual exchange
        const code = url.searchParams.get('code');
        if (code) {
          console.log('[ResetPassword] Found PKCE code in URL, attempting exchangeCodeForSession', {
            codePresent: !!code,
          });
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error || !data?.session?.user) {
            console.error('Error exchanging code for session:', error);

            // As a fallback, re-check session in case Supabase already processed the URL
            const {
              data: { session: retrySession },
            } = await supabase.auth.getSession();

            if (retrySession?.user) {
              ['code', 'token', 'token_hash', 'type'].forEach((param) => {
                url.searchParams.delete(param);
              });
              const cleanedSearch = url.searchParams.toString();
              const newUrl = cleanedSearch
                ? `${url.pathname}?${cleanedSearch}${url.hash}`
                : url.pathname + url.hash;
              window.history.replaceState({}, document.title, newUrl);
              setIsValidSession(true);
              return;
            }

            setIsValidSession(false);
            return;
          }

          ['code', 'token', 'token_hash', 'type'].forEach((param) => {
            url.searchParams.delete(param);
          });
          const cleanedSearch = url.searchParams.toString();
          const newUrl = cleanedSearch
            ? `${url.pathname}?${cleanedSearch}${url.hash}`
            : url.pathname + url.hash;
          window.history.replaceState({}, document.title, newUrl);
          setIsValidSession(true);
          return;
        }

        // 3) Fallback for email OTP-style recovery links using token/token_hash
        const tokenHash = url.searchParams.get('token_hash') ?? url.searchParams.get('token');
        const type = url.searchParams.get('type');

        if (tokenHash && type === 'recovery') {
          console.log('[ResetPassword] Found recovery token in URL, attempting verifyOtp', {
            hasTokenHash: !!tokenHash,
            type,
          });
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (error) {
            console.error('Error verifying recovery OTP:', error);
            setIsValidSession(false);
            return;
          }

          const {
            data: { session: otpSession },
          } = await supabase.auth.getSession();

          if (otpSession?.user) {
            console.log('[ResetPassword] verifyOtp succeeded, session established', {
              userId: otpSession.user.id,
            });
            ['code', 'token', 'token_hash', 'type'].forEach((param) => {
              url.searchParams.delete(param);
            });
            const cleanedSearch = url.searchParams.toString();
            const newUrl = cleanedSearch
              ? `${url.pathname}?${cleanedSearch}${url.hash}`
              : url.pathname + url.hash;
            window.history.replaceState({}, document.title, newUrl);
            setIsValidSession(true);
            return;
          }

          setIsValidSession(false);
          return;
        }

        // 4) No session, no usable recovery parameters
        console.warn('[ResetPassword] No session and no usable recovery parameters, marking link invalid');
        setIsValidSession(false);
      } catch (err) {
        console.error('[ResetPassword] Error initializing recovery session:', err);
        setIsValidSession(false);
      }
    };

    initializeRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      
      // Redirect to dashboard after successful password update
      setTimeout(() => {
        navigate({ to: '/dashboard' });
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating your password');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error if no valid recovery session
  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a new password reset.
          </p>
          <Button
            onClick={() => navigate({ to: '/login', search: { redirect: undefined } })}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-green-600">Password Updated!</h2>
          <p className="text-gray-600 mb-6">
            Your password has been successfully updated. You will be redirected to your dashboard shortly.
          </p>
        </div>
      </div>
    );
  }

  // Show password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Reset Your Password</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full"
              placeholder="Enter your new password"
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full"
              placeholder="Confirm your new password"
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{error}</div>
          )}
          
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;