import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import type { EmailOtpType } from '@supabase/supabase-js';

export const Route = createFileRoute('/auth/confirm')({
  component: AuthConfirm,
  validateSearch: (search: Record<string, unknown> = {}) => {
    return {
      token_hash: (search.token_hash as string) || undefined,
      token: (search.token as string) || undefined,
      type: (search.type as EmailOtpType) || undefined,
      next: (search.next as string) || '/dashboard',
    };
  },
});

function AuthConfirm() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isProcessing) {
      return;
    }

    const handleConfirmation = async () => {
      setIsProcessing(true);

      try {
        const url = new URL(window.location.href);
        const tokenHash =
          url.searchParams.get('token_hash') ?? url.searchParams.get('token');
        const type = url.searchParams.get('type') as EmailOtpType | null;
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          navigate({ to: '/auth/error' });
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            code,
          );

          if (exchangeError) {
            console.error('Auth code exchange error:', exchangeError);
          }
        }

        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });

          if (verifyError) {
            console.error('Email verification error:', verifyError);
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          navigate({ to: next });
          return;
        }

        navigate({ to: '/auth/error' });
      } catch (confirmationError) {
        console.error('Email confirmation processing error:', confirmationError);
        navigate({ to: '/auth/error' });
      }
    };

    void handleConfirmation();
  }, [isProcessing, navigate, next]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
        <p className="text-gray-600">Please wait while we confirm your email address.</p>
      </div>
    </div>
  );
}
