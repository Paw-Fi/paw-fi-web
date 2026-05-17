import { useEffect, useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "react-toastify";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";

export const Route = createFileRoute("/invites/$token")({
  component: InvitePage,
});

interface InviteData {
  household: {
    id: string;
    name: string;
    emoji: string | null;
  };
  inviter: {
    full_name: string;
    avatar_url: string | null;
  };
  invite: {
    personal_message: string | null;
  };
}

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [attemptedAppOpen, setAttemptedAppOpen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Ref to prevent multiple validation calls
  const hasValidatedRef = useRef(false);
  const appOpenAttemptedRef = useRef(false);

  // Detect if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent =
        navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobile =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase(),
        );
      setIsMobileDevice(isMobile);
    };
    checkMobile();
  }, []);

  // Try to open app automatically if on mobile BEFORE auth check
  useEffect(() => {
    // Only attempt once, only on mobile, regardless of auth status
    if (!appOpenAttemptedRef.current && isMobileDevice) {
      appOpenAttemptedRef.current = true;
      tryOpenApp();
    }
  }, [isMobileDevice, token]);

  // Wait for auth check, then validate invite or redirect to login
  useEffect(() => {
    // Don't do anything until auth check is complete
    if (authLoading) return;

    // Skip auth check if still attempting to open app
    if (attemptedAppOpen) {
      return;
    }

    // If not authenticated, redirect to login/register with current URL
    if (!user) {
      navigate({
        to: "/login",
        search: { redirect: window.location.pathname },
      });
      return;
    }

    // User is authenticated, validate the invite if we haven't already
    // But only if not attempting to open app (wait for app open to fail first)
    if (
      user &&
      !inviteData &&
      !error &&
      !hasValidatedRef.current &&
      !attemptedAppOpen
    ) {
      hasValidatedRef.current = true;
      validateInvite();
    }
  }, [authLoading, user, token, inviteData, error, attemptedAppOpen]);

  // 10-second timeout for validation
  useEffect(() => {
    if (!isValidating) return;

    const timeoutId = setTimeout(() => {
      if (isValidating && !inviteData && !error) {
        setShowTimeout(true);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [isValidating, inviteData, error]);

  const validateInvite = async () => {
    setIsValidating(true);
    setError(null);

    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 30000),
      );

      const validatePromise = supabase.functions.invoke(
        "households-validate-invite",
        {
          body: { token },
        },
      );

      const { data, error } = (await Promise.race([
        validatePromise,
        timeoutPromise,
      ])) as any;

      if (error) {
        console.error("[InvitePage] Invoke error:", error);
        throw error;
      }

      // Check if the response indicates an invalid invite
      if (data && !data.valid) {
        setError(data.error || "Invalid invitation");
        return;
      }

      // Map the response to the expected format
      if (data && data.valid && data.household) {
        const mappedData: InviteData = {
          household: {
            id: data.household.id,
            name: data.household.name,
            emoji: data.household.cover_image_url || null, // Using cover_image_url as emoji
          },
          inviter: {
            full_name:
              data.inviter?.full_name || data.inviter?.email || "Someone",
            avatar_url: data.inviter?.avatar_url || null,
          },
          invite: {
            personal_message: data.invite?.personal_message || null,
          },
        };
        setInviteData(mappedData);
      } else {
        console.error("[InvitePage] Unexpected response structure:", data);
        setError("Invalid response from server");
      }
    } catch (err: any) {
      console.error("[InvitePage] Error validating invite:", err);

      // Provide more specific error messages
      let errorMessage = "Failed to validate invitation. Please try again.";

      if (err.message === "Request timeout") {
        errorMessage =
          "Request timed out. Please check if the Supabase Edge Functions are running locally (npx supabase functions serve) or if your network connection is stable.";
      } else if (
        err.message?.includes("Failed to fetch") ||
        err.message?.includes("NetworkError")
      ) {
        errorMessage =
          "Cannot connect to the server. Make sure Supabase is running locally (npx supabase start) and Edge Functions are served (npx supabase functions serve).";
      }

      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user) {
      // Should not happen due to redirect, but handle gracefully
      const currentUrl = encodeURIComponent(window.location.pathname);
      navigate({
        to: "/login",
        search: { redirect: currentUrl },
      });
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      // Get current session for auth header
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Not authenticated. Please log in again.");
      }

      const { data, error } = await supabase.functions.invoke(
        "households-accept-invite",
        {
          body: { token },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (error) throw error;

      if (data && data.error) {
        setError(data.error);
        toast.error(data.error);
        return;
      }

      // Success!
      setIsAccepted(true);
      toast.success(
        `Welcome to ${inviteData?.household.name || "the household"}!`,
      );
    } catch (err: any) {
      console.error("[InvitePage] Error accepting invite:", err);
      setError(err.message || "Failed to accept invitation. Please try again.");
      toast.error("Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  const tryOpenApp = () => {
    setAttemptedAppOpen(true);

    const deepLink = `moneko://households/join?token=${encodeURIComponent(token)}`;

    // Track whether browser was backgrounded (strong signal app was opened)
    let appOpened = false;
    const onVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
      }
    };
    const onPageHide = () => {
      appOpened = true;
    };
    const onBlur = () => {
      appOpened = true;
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("blur", onBlur);

    // iframe scheme open is blocked in many modern mobile browsers.
    // Direct navigation in a user-gesture path is more reliable.
    window.location.href = deepLink;

    // Fallback: Check if app opened after 2 seconds
    setTimeout(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("blur", onBlur);

      // If app didn't open and we're still on mobile, show continue button
      if (!appOpened && !document.hidden) {
        setAttemptedAppOpen(false); // Allow user to continue on web
        // Trigger validation now that we know app isn't available
        if (!hasValidatedRef.current) {
          hasValidatedRef.current = true;
          validateInvite();
        }
      }
    }, 2500);

    // Fallback to app store after longer delay if really didn't work
    setTimeout(() => {
      if (!appOpened && !document.hidden) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        // Only show app store link, don't force redirect
      }
    }, 3000);
  };

  const handleOpenApp = () => {
    tryOpenApp();
  };

  // Loading state
  if (isValidating || authLoading) {
    return (
      <div className="bg-moneko-background flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          {!showTimeout ? (
            <>
              <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-t-transparent"></div>
              <p className="text-muted-foreground">
                {isValidating ? "Validating invitation..." : "Loading..."}
              </p>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="bg-moneko-background rounded-3xl p-8"
            >
              <div className="mb-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50/50 dark:bg-amber-950/30">
                  <Clock className="text-warning h-5 w-5" />
                </div>
              </div>
              <h2 className="text-foreground mb-3 text-2xl font-light">
                Taking longer than expected
              </h2>
              <p className="text-muted-foreground mb-8">
                The invitation validation is taking longer than usual. Please
                refresh the page to try again.
              </p>
              <motion.button
                onClick={() => window.location.reload()}
                className="bg-primary text-primary-foreground w-full rounded-full px-6 py-4 font-medium transition-all duration-200 hover:shadow-md"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Refresh Page
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-moneko-background flex min-h-screen items-center justify-center px-4">
        <motion.div
          className="bg-card w-full max-w-md rounded-3xl p-8 text-center shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6">
            <div className="bg-danger/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-danger h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-foreground mb-3 text-2xl font-light">
            Invalid Invitation
          </h1>
          <p className="text-muted-foreground mb-8">{error}</p>
          <motion.button
            onClick={() => navigate({ to: "/" })}
            className="bg-primary text-primary-foreground w-full rounded-full px-6 py-4 font-medium transition-all duration-200 hover:shadow-md"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Go to Homepage
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Success state (after accepting)
  if (isAccepted && inviteData) {
    return (
      <div className="bg-moneko-background flex min-h-screen items-center justify-center px-4">
        <motion.div
          className="bg-card w-full max-w-md rounded-3xl p-8 text-center shadow-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div
            className="mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="bg-success/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
              <svg
                className="text-success h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </motion.div>
          <h1 className="text-foreground mb-3 text-3xl font-light">
            You're In! 🎉
          </h1>
          <p className="text-muted-foreground mb-8">
            You've successfully joined{" "}
            <span className="text-foreground font-medium">
              {inviteData.household.name}
            </span>
          </p>

          <div className="mb-8 space-y-3">
            <motion.button
              onClick={handleOpenApp}
              className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 font-medium transition-all duration-200 hover:shadow-md"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Open in Moneko App
            </motion.button>

            <motion.button
              onClick={() => navigate({ to: "/dashboard" })}
              className="bg-subtle-background text-foreground hover:bg-muted w-full rounded-full px-6 py-4 font-medium transition-all duration-200"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Go to Dashboard
            </motion.button>
          </div>

          <div className="text-muted-foreground text-sm">
            <p className="mb-3">Don't have the app yet?</p>
            <div className="flex flex-col items-center gap-3">
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Confirmation state (before accepting)
  if (!inviteData) return null;

  // Show "Opening app..." state while attempting to open
  if (attemptedAppOpen && isMobileDevice) {
    return (
      <div className="bg-moneko-background flex min-h-screen items-center justify-center px-4">
        <motion.div
          className="bg-card w-full max-w-md rounded-3xl p-8 text-center shadow-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6">
            <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-2 border-t-transparent"></div>
          </div>
          <h2 className="text-foreground mb-3 text-2xl font-light">
            Opening Moneko App...
          </h2>
          <p className="text-muted-foreground mb-6">
            If the app doesn't open automatically, you can continue on the web.
          </p>
          <motion.button
            onClick={() => setAttemptedAppOpen(false)}
            className="bg-subtle-background text-foreground hover:bg-muted w-full rounded-full px-6 py-4 font-medium transition-all duration-200"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Continue on Web
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-moneko-background flex min-h-screen items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="bg-card overflow-hidden rounded-3xl shadow-sm">
          {/* Household Cover Image */}
          {inviteData.household.emoji && (
            <div className="from-primary/10 to-primary/5 relative flex h-48 items-center justify-center bg-gradient-to-br">
              {inviteData.household.emoji.startsWith("http") ? (
                <img
                  src={inviteData.household.emoji}
                  alt={inviteData.household.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-8xl">{inviteData.household.emoji}</div>
              )}
            </div>
          )}

          <div className="p-8">
            {/* Header */}
            <motion.div
              className="mb-8 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h1 className="text-foreground mb-2 text-3xl font-light">
                Join {inviteData.household.name}
              </h1>
              <p className="text-muted-foreground">
                You've been invited to collaborate on household finances
              </p>
            </motion.div>

            {/* Inviter Info */}
            <motion.div
              className="bg-subtle-background mb-8 rounded-2xl p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="flex items-center gap-4">
                {inviteData.inviter.avatar_url ? (
                  <img
                    src={inviteData.inviter.avatar_url}
                    alt={inviteData.inviter.full_name}
                    className="ring-primary/20 h-16 w-16 rounded-full object-cover ring-2"
                  />
                ) : (
                  <div className="bg-primary/10 ring-primary/20 flex h-16 w-16 items-center justify-center rounded-full ring-2">
                    <span className="text-primary text-2xl font-medium">
                      {inviteData.inviter.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-muted-foreground mb-1 text-sm">
                    Invited by
                  </p>
                  <p className="text-foreground text-lg font-medium">
                    {inviteData.inviter.full_name}
                  </p>
                </div>
              </div>

              {inviteData.invite.personal_message && (
                <div className="border-border mt-6 border-t pt-6">
                  <p className="text-muted-foreground italic">
                    "{inviteData.invite.personal_message}"
                  </p>
                </div>
              )}
            </motion.div>

            {/* Benefits */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <h3 className="text-foreground mb-6 text-lg font-medium">
                What you can do together
              </h3>
              <div className="space-y-4">
                {[
                  {
                    text: "Track shared budgets and spending goals",
                    delay: 0.35,
                  },
                  { text: "Split expenses fairly and easily", delay: 0.4 },
                  { text: "Collaborate on financial decisions", delay: 0.45 },
                  {
                    text: "Keep your privacy with fine-grained sharing controls",
                    delay: 0.5,
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: item.delay, duration: 0.3 }}
                  >
                    <div className="bg-success/10 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full">
                      <svg
                        className="text-success h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-foreground">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
            >
              <motion.button
                onClick={handleAcceptInvite}
                disabled={isAccepting}
                className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 font-medium transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                whileHover={{ scale: isAccepting ? 1 : 1.01 }}
                whileTap={{ scale: isAccepting ? 1 : 0.99 }}
              >
                {isAccepting ? (
                  <>
                    <div className="border-primary-foreground h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Accept Invitation</span>
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={() => navigate({ to: "/" })}
                className="bg-subtle-background text-foreground hover:bg-muted w-full rounded-full px-6 py-4 font-medium transition-all duration-200"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Decline
              </motion.button>
            </motion.div>

            {/* Footer Note */}
            <motion.p
              className="text-muted-foreground mt-6 text-center text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              By joining this household, you agree to share financial
              information according to your privacy settings.
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
