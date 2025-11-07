/**
 * Referral Invitation Accept Page
 *
 * Route: /referral/$code
 * Purpose: Handle invitee flow for accepting referral invitations
 *
 * Flow:
 * 1. If not authenticated: show auth prompt with code preserved in redirect
 * 2. If authenticated: validate code and show acceptance card
 * 3. After acceptance: redirect to Stripe checkout
 * 4. After payment: show success message and download app
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Download, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { DotPattern } from '@/components/ui/dot-pattern';
import { BackgroundBeamsWithCollision } from '@/components/ui/background-beams-with-collision';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useValidateReferral } from '@/hooks/use-validate-referral';
import { useAcceptReferral } from '@/hooks/use-accept-referral';
import { useEffect, useRef, useState } from 'react';
import { AcceptInvitationCard } from '@/components/referral/accept-invitation-card';
import { MonekoIcon } from '@/components/shared/moneko-icon';
import { ReferralAuthPrompt } from '@/components/auth/referral-auth-prompt';
import AppleLogo from '@assets/images/shared/apple-logo.png';
import { AppleDownloadButton } from '@/components/ui/apple-download-button';

// Route search params type
type InviteeSearch = {
  status?: 'success' | 'canceled';
  session_id?: string;
};

export const Route = createFileRoute('/referral/$code')({
  component: InviteePage,
  validateSearch: (search: Record<string, unknown>): InviteeSearch => ({
    status: search.status === 'success' || search.status === 'canceled'
      ? search.status
      : undefined,
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [
      ...seo({
        title: 'Accept Your Invitation | Moneko',
        description: 'Accept your invitation to join Moneko Premium and unlock lifetime access to premium features.',
        url: getCanonicalUrl('/referral'),
      }),
    ],
  }),
});

function InviteePage() {
  const { code } = Route.useParams();
  const { status, session_id } = Route.useSearch();
  const { user, isLoading: userLoading } = useAuth();
  const navigate = useNavigate();
  const initialStatusRef = useRef(status);

  // Ref to prevent multiple validation calls
  const hasValidatedRef = useRef(false);

  // Validate referral code (public endpoint - works without auth)
  const {
    validate,
    isLoading: validateLoading,
    isValid,
    referrerInfo,
    error: validateError,
  } = useValidateReferral();

  // Accept referral mutation (requires auth)
  const { accept, isLoading: acceptLoading } = useAcceptReferral();

  // Validation function
  const validateReferralCode = async () => {
    if (!code) return;
    try {
      await validate(code);
    } catch (err) {
      // Error is already handled by the hook
      console.error('[InviteePage] Validation error:', err);
    }
  };

  // Kick off validation ASAP when component mounts (public endpoint)
  useEffect(() => {
    if (!code) return;
    if (hasValidatedRef.current) return;
    if (isValid || referrerInfo !== null || validateError) return;
    hasValidatedRef.current = true;
    validateReferralCode();
  }, [code]);

  // Defensive: If user logs in during validation, re-validate if needed
  useEffect(() => {
    if (userLoading) return;
    if (!user || !code) return;
    if (isValid || referrerInfo !== null || validateError) return;
    if (hasValidatedRef.current) return;
    hasValidatedRef.current = true;
    validateReferralCode();
  }, [userLoading, user, code, isValid, referrerInfo, validateError]);

  // Handle accept invitation
  const handleAcceptInvitation = async () => {
    if (!code || !user) return;
    await accept(code);
  };

  // Preserve canceled status in URL; do not auto-strip it
  useEffect(() => {
    if (!code) return;
    if (initialStatusRef.current === 'canceled' && status !== 'canceled') {
      navigate({
        to: '/referral/$code',
        params: { code },
        search: { status: 'canceled', session_id },
        replace: true,
      });
    }
  }, [status, session_id, code, navigate]);

  return (
    <div className="min-h-screen bg-moneko-background relative overflow-hidden px-5 pt-4">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/70 backdrop-blur-xl border-b border-subtle-border" style={{ transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <MonekoIcon />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              style={{ position: 'relative', zIndex: 1 }}
              onClick={() => navigate({ to: '/' })}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Background Beams */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen pointer-events-none" />

      {/* Dotted grid pattern overlay */}
      <DotPattern
        className="fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none z-[1] [mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]"
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-0 sm:px-8 lg:px-8 py-20" style={{ transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)' }}>
        {/* Success Banner */}
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-2xl border border-green-200 dark:border-green-900/40 bg-green-50/80 dark:bg-green-900/20 px-4 py-3 text-sm text-green-800 dark:text-green-200"
          >
            🎉 Invitation accepted! Your lifetime access will be activated shortly.
          </motion.div>
        )}

        {/* Download App card after successful acceptance */}
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-card rounded-3xl p-8 shadow-sm border border-subtle-border mb-8 "
          >
            <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-subtle-background rounded-2xl p-3 shrink-0">
                <Download className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-medium text-foreground mb-2">Download the App</h3>
                <p className="text-muted-foreground mb-4">
                  Get started with Moneko on your iPhone or iPad
                </p>
              </div>
            </div>
               <AppleDownloadButton/>
          </div>
          </motion.div>
        )}

        {/* Canceled Banner */}
        {status === 'canceled' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
          >
            The transaction was canceled. Please try again to accept your invitation.
          </motion.div>
        )}

        {/* Only render hero + invite flow when not a success return */}
        {status !== 'success' && (
          <>
            {/* Header */}
            <motion.div className="text-center mb-12">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight tracking-tight mb-4">
                Join Moneko Premium
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
                Accept your invitation and unlock lifetime premium access for both you and your friend
              </p>
            </motion.div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Loading skeleton while auth resolves */}
              {userLoading && (
                <div className="bg-card rounded-3xl p-8 shadow-sm border border-subtle-border animate-pulse">
                  <div className="h-6 bg-subtle-background rounded w-1/3 mb-6" />
                  <div className="h-10 bg-subtle-background rounded w-full mb-4" />
                  <div className="h-10 bg-subtle-background rounded w-1/2" />
                </div>
              )}

              {/* If not authenticated: show auth prompt */}
              {!userLoading && !user && (
                <ReferralAuthPrompt
                  code={code}
                  redirectTo={`/referral/${code}`}
                  title="Join to accept your invite"
                  description="Sign in or create an account to accept the invitation and claim your lifetime premium access."
                />
              )}

              {/* If authenticated but validating */}
              {!userLoading && user && validateLoading && (
                <div className="bg-card rounded-3xl p-8 shadow-sm border border-subtle-border animate-pulse">
                  <div className="h-6 bg-subtle-background rounded w-1/3 mb-6" />
                  <div className="h-10 bg-subtle-background rounded w-full mb-4" />
                  <div className="h-10 bg-subtle-background rounded w-1/2" />
                </div>
              )}

              {/* If authenticated and code is valid: show acceptance card */}
              {!userLoading && user && !validateLoading && isValid && referrerInfo && (
                <AcceptInvitationCard
                  code={code}
                  referrerEmail={referrerInfo.email}
                  onAccept={handleAcceptInvitation}
                  isLoading={acceptLoading}
                />
              )}

              {/* If authenticated and code is invalid */}
              {!userLoading && user && !validateLoading && !isValid && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 shadow-sm border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
                    <div>
                      <h3 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
                        Invalid Referral Code
                      </h3>
                      <p className="text-red-700 dark:text-red-300">
                        This referral code is invalid or has expired. Please check the code and try
                        again.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
