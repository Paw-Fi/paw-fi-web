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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, AlertCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useValidateReferral } from "@/hooks/use-validate-referral";
import { useAcceptReferral } from "@/hooks/use-accept-referral";
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { AcceptInvitationCard } from "@/components/referral/accept-invitation-card";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { ReferralAuthPrompt } from "@/components/auth/referral-auth-prompt";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";

// Route search params type
type InviteeSearch = {
  status?: "success" | "canceled";
  session_id?: string;
};

export const Route = createFileRoute("/referral/$code")({
  component: InviteePage,
  validateSearch: (search: Record<string, unknown>): InviteeSearch => ({
    status:
      search.status === "success" || search.status === "canceled"
        ? search.status
        : undefined,
    session_id:
      typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [
      ...seo({
        title: "Accept Your Invitation | Moneko",
        description:
          "Accept your invitation to join Moneko and claim 50% off the lifetime plan with the referral code auto-applied at checkout.",
        url: getCanonicalUrl("/referral"),
      }),
      {
        name: "robots",
        content: "noindex, nofollow",
      },
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
      console.error("[InviteePage] Validation error:", err);
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
    try {
      await accept(code);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to continue to checkout. Please try again.";
      toast.error(message);
    }
  };

  // Preserve canceled status in URL; do not auto-strip it
  useEffect(() => {
    if (!code) return;
    if (initialStatusRef.current === "canceled" && status !== "canceled") {
      navigate({
        to: "/referral/$code",
        params: { code },
        search: { status: "canceled", session_id },
        replace: true,
      });
    }
  }, [status, session_id, code, navigate]);

  return (
    <div className="bg-moneko-background relative min-h-screen overflow-hidden px-5 pt-4">
      {/* Header */}
      <header
        className="bg-card/70 border-subtle-border fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-xl"
        style={{
          transform: "translate3d(0,0,0)",
          WebkitTransform: "translate3d(0,0,0)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-8">
          <div className="flex items-center justify-between">
            <MonekoIcon />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              style={{ position: "relative", zIndex: 1 }}
              onClick={() => navigate({ to: "/" })}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Background Beams */}
      <BackgroundBeamsWithCollision className="pointer-events-none fixed inset-0 z-0 h-screen" />

      {/* Dotted grid pattern overlay */}
      <DotPattern
        className="pointer-events-none fixed inset-0 z-[1] [mask-image:radial-gradient(1200px_circle_at_center,white,transparent)] opacity-30 dark:opacity-15"
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Content */}
      <div
        className="relative z-10 mx-auto max-w-5xl px-0 py-20 sm:px-8 lg:px-8"
        style={{
          transform: "translate3d(0,0,0)",
          WebkitTransform: "translate3d(0,0,0)",
        }}
      >
        {/* Success Banner */}
        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-2xl border border-green-200 bg-green-50/80 px-4 py-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200"
          >
            Payment complete. Your discounted lifetime plan is being activated.
          </motion.div>
        )}

        {/* Download App card after successful acceptance */}
        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.1,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="bg-card border-subtle-border mb-8 rounded-3xl border p-8 shadow-sm"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-subtle-background shrink-0 rounded-2xl p-3">
                  <Download className="text-foreground h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground mb-2 text-xl font-medium">
                    Download the App
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Get started with Moneko on your iPhone or iPad
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4 lg:flex-row">
                <AppleDownloadButton />
                <AndroidDownloadButton />
              </div>
            </div>
          </motion.div>
        )}

        {/* Canceled Banner */}
        {status === "canceled" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200"
          >
            The transaction was canceled. Please try again to accept your
            invitation.
          </motion.div>
        )}

        {/* Only render hero + invite flow when not a success return */}
        {status !== "success" && (
          <>
            {/* Header */}
            <motion.div className="mb-12 text-center">
              <h1 className="text-foreground mb-4 text-5xl leading-tight font-bold tracking-tight sm:text-6xl lg:text-7xl">
                Join Moneko Premium
              </h1>
              <p className="text-muted-foreground mx-auto mb-6 max-w-2xl text-lg leading-relaxed">
                Accept your invitation to get 50% off the lifetime plan. Your
                discount will be applied automatically at checkout.
              </p>
            </motion.div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Loading skeleton while auth resolves */}
              {userLoading && (
                <div className="bg-card border-subtle-border animate-pulse rounded-3xl border p-8 shadow-sm">
                  <div className="bg-subtle-background mb-6 h-6 w-1/3 rounded" />
                  <div className="bg-subtle-background mb-4 h-10 w-full rounded" />
                  <div className="bg-subtle-background h-10 w-1/2 rounded" />
                </div>
              )}

              {/* If not authenticated: show auth prompt */}
              {!userLoading && !user && (
                <ReferralAuthPrompt
                  code={code}
                  redirectTo={`/referral/${code}`}
                  title="Join to accept your invite"
                  description="Sign in or create an account to accept the invitation and continue to checkout with 50% off the lifetime plan."
                />
              )}

              {/* If authenticated but validating */}
              {!userLoading && user && validateLoading && (
                <div className="bg-card border-subtle-border animate-pulse rounded-3xl border p-8 shadow-sm">
                  <div className="bg-subtle-background mb-6 h-6 w-1/3 rounded" />
                  <div className="bg-subtle-background mb-4 h-10 w-full rounded" />
                  <div className="bg-subtle-background h-10 w-1/2 rounded" />
                </div>
              )}

              {/* If authenticated and code is valid: show acceptance card */}
              {!userLoading &&
                user &&
                !validateLoading &&
                isValid &&
                referrerInfo && (
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
                  className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm dark:border-red-800 dark:bg-red-900/20"
                >
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                      <h3 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">
                        Invalid Referral Code
                      </h3>
                      <p className="text-red-700 dark:text-red-300">
                        This referral code is invalid or has expired. Please
                        check the code and try again.
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
