import { useEffect, useLayoutEffect, useState, useRef } from "react";
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
    is_reusable: boolean;
    invited_role: "admin" | "member";
  };
}

function InvitePage() {
  const { token } = Route.useParams();
  const { user, isLoading: authLoading } = useAuth();

  // A new token or actor owns fresh state, including app-open/request guards.
  return (
    <InviteContent
      key={JSON.stringify([token, user?.id ?? null])}
      token={token}
      userId={user?.id ?? null}
      authLoading={authLoading}
    />
  );
}

async function readInvitePayload(response: { data: any; error: any }) {
  // Non-2xx function responses put their JSON contract in the HTTP error context.
  const context = response.error?.context;
  if (context && typeof context.clone === "function") {
    try {
      return await context.clone().json();
    } catch {
      return response.data;
    }
  }
  return response.data;
}

function mapInviteData(data: any): InviteData | null {
  const invite = data?.invite === undefined ? {} : data.invite;
  if (!invite || typeof invite !== "object" || Array.isArray(invite)) {
    return null;
  }
  // Older validation responses omit these fields; absence is never reusable.
  const isReusable = Object.prototype.hasOwnProperty.call(invite, "is_reusable")
    ? invite.is_reusable
    : false;
  const invitedRole = Object.prototype.hasOwnProperty.call(
    invite,
    "invited_role",
  )
    ? invite.invited_role
    : "admin";
  if (
    typeof data?.household?.id !== "string" ||
    !data.household.id ||
    typeof data.household.name !== "string" ||
    !data.household.name ||
    typeof isReusable !== "boolean" ||
    !["admin", "member"].includes(invitedRole)
  ) {
    return null;
  }
  return {
    household: {
      id: data.household.id,
      name: data.household.name,
      emoji:
        typeof data.household.cover_image_url === "string"
          ? data.household.cover_image_url
          : null,
    },
    inviter: {
      full_name:
        typeof data.inviter?.full_name === "string" && data.inviter.full_name
          ? data.inviter.full_name
          : typeof data.inviter?.email === "string" && data.inviter.email
            ? data.inviter.email
            : "Someone",
      avatar_url:
        typeof data.inviter?.avatar_url === "string"
          ? data.inviter.avatar_url
          : null,
    },
    invite: {
      personal_message:
        typeof invite.personal_message === "string"
          ? invite.personal_message
          : null,
      is_reusable: isReusable,
      invited_role: invitedRole,
    },
  };
}

function InviteContent({
  token,
  userId,
  authLoading,
}: {
  token: string;
  userId: string | null;
  authLoading: boolean;
}) {
  const navigate = useNavigate();
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
  const mountedRef = useRef(false);
  const validatingRef = useRef(false);
  const acceptingRef = useRef(false);
  const acceptedRef = useRef(false);
  const appOpenCleanupRef = useRef<(() => void) | null>(null);

  // Revoke request ownership during commit, before passive cleanup or old toasts.
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      appOpenCleanupRef.current?.();
      appOpenCleanupRef.current = null;
    };
  }, []);

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
    if (
      isMobileDevice &&
      (!appOpenAttemptedRef.current ||
        (attemptedAppOpen && !appOpenCleanupRef.current))
    ) {
      const shouldNavigate = !appOpenAttemptedRef.current;
      appOpenAttemptedRef.current = true;
      // StrictMode may replay setup after cleanup; resume fallback without reopening.
      tryOpenApp(shouldNavigate);
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
    if (!userId) {
      navigate({
        to: "/login",
        search: { redirect: `/invites/${encodeURIComponent(token)}` },
      });
      return;
    }

    // User is authenticated, validate the invite if we haven't already
    // But only if not attempting to open app (wait for app open to fail first)
    if (
      userId &&
      !inviteData &&
      !error &&
      !hasValidatedRef.current &&
      !attemptedAppOpen
    ) {
      void validateInvite();
    }
  }, [authLoading, userId, token, inviteData, error, attemptedAppOpen]);

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
    if (
      !mountedRef.current ||
      authLoading ||
      !userId ||
      validatingRef.current
    ) {
      return;
    }
    hasValidatedRef.current = true;
    validatingRef.current = true;
    setIsValidating(true);
    setError(null);
    setShowTimeout(false);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (!mountedRef.current) return;
      const session = sessionData.session;
      if (sessionError || !session || session.user.id !== userId) {
        throw new Error("Your session changed. Please log in again.");
      }
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise(
        (_, reject) =>
          (timeoutId = setTimeout(
            () => reject(new Error("Request timeout")),
            30000,
          )),
      );

      const validatePromise = supabase.functions.invoke(
        "households-validate-invite",
        {
          body: { token },
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      const response = (await Promise.race([
        validatePromise,
        timeoutPromise,
      ])) as any;
      const data = await readInvitePayload(response);
      if (!mountedRef.current) return;

      if (data?.error_code === "ALREADY_MEMBER") {
        const mappedData = mapInviteData(data);
        if (!mappedData) throw new Error("Invalid response from server");
        setInviteData(mappedData);
        acceptedRef.current = true;
        setIsAccepted(true);
        return;
      }

      if (response.error || data?.valid !== true) {
        throw new Error(
          data?.error || response.error?.message || "Invalid invitation",
        );
      }

      const mappedData = mapInviteData(data);
      if (!mappedData) throw new Error("Invalid response from server");
      setInviteData(mappedData);
      setShowTimeout(false);
      setIsValidating(false);
      // Start once from authoritative validation, never from an error-retrying effect.
      if (mappedData.invite.is_reusable) {
        void acceptInvite(mappedData);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(
          err.message === "Request timeout"
            ? "Request timed out. Check your connection and try again."
            : err.message || "Failed to validate invitation. Please try again.",
        );
      }
    } finally {
      clearTimeout(timeoutId);
      validatingRef.current = false;
      if (mountedRef.current) setIsValidating(false);
    }
  };

  const acceptInvite = async (validatedInvite: InviteData) => {
    if (
      !mountedRef.current ||
      authLoading ||
      !userId ||
      acceptingRef.current ||
      acceptedRef.current
    ) {
      return;
    }

    acceptingRef.current = true;
    setIsAccepting(true);
    setError(null);
    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              "Joining timed out. Your membership may already have been saved. Try again to confirm.",
            ),
          );
          abortController.abort();
        }, 30000);
      });
      // Bound session lookup, HTTP dispatch, and error-body decoding as one attempt.
      const acceptancePromise = (async () => {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (!mountedRef.current || abortController.signal.aborted) return null;
        const session = sessionData.session;
        if (sessionError || !session || session.user.id !== userId) {
          throw new Error("Your session changed. Please log in again.");
        }
        const response = await supabase.functions.invoke(
          "households-accept-invite",
          {
            body: { token },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            signal: abortController.signal,
          },
        );
        return { response, data: await readInvitePayload(response) };
      })();
      const result = await Promise.race([acceptancePromise, timeoutPromise]);
      if (!mountedRef.current || !result) return;
      const { response, data } = result;

      const alreadyMember = data?.error_code === "ALREADY_MEMBER";
      if (!alreadyMember && (response.error || data?.error)) {
        throw new Error(
          data?.error ||
            response.error?.message ||
            "Failed to accept invitation",
        );
      }
      if (
        !alreadyMember &&
        (data?.success !== true ||
          data.household_id !== validatedInvite.household.id ||
          typeof data.member_id !== "string" ||
          !data.member_id)
      ) {
        throw new Error("Invalid response from server. Please try again.");
      }

      acceptedRef.current = true;
      setIsAccepted(true);
      toast.success(`Welcome to ${validatedInvite.household.name}!`);
    } catch (err: any) {
      if (mountedRef.current) {
        setError(
          err.message || "Failed to accept invitation. Please try again.",
        );
        toast.error("Failed to accept invitation");
      }
    } finally {
      clearTimeout(timeoutId);
      acceptingRef.current = false;
      if (mountedRef.current) setIsAccepting(false);
    }
  };

  const handleAcceptInvite = () => {
    if (inviteData) void acceptInvite(inviteData);
  };

  const tryOpenApp = (shouldNavigate = true) => {
    appOpenCleanupRef.current?.();
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
    if (shouldNavigate) window.location.href = deepLink;

    // Fallback: Check if app opened after 2 seconds
    const cleanupListeners = () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("blur", onBlur);
    };
    const timeoutId = setTimeout(() => {
      cleanupListeners();
      if (!mountedRef.current) return;

      // If app didn't open and we're still on mobile, show continue button
      if (!appOpened && !document.hidden) {
        // The auth-gated effect owns validation after app fallback.
        setAttemptedAppOpen(false);
      }
    }, 2500);
    appOpenCleanupRef.current = () => {
      clearTimeout(timeoutId);
      cleanupListeners();
    };
  };

  const handleOpenApp = () => {
    tryOpenApp();
  };

  // Loading state
  if (
    isValidating ||
    authLoading ||
    !userId ||
    (isAccepting && inviteData?.invite.is_reusable)
  ) {
    return (
      <div className="bg-moneko-background flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          {!showTimeout ? (
            <>
              <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-t-transparent"></div>
              <p className="text-muted-foreground">
                {isAccepting
                  ? "Joining..."
                  : isValidating
                    ? "Validating invitation..."
                    : "Loading..."}
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
            {inviteData ? "Couldn't Join" : "Invalid Invitation"}
          </h1>
          <p className="text-muted-foreground mb-8">{error}</p>
          <motion.button
            onClick={() => {
              if (inviteData) void acceptInvite(inviteData);
              else void validateInvite();
            }}
            className="bg-primary text-primary-foreground mb-3 w-full rounded-full px-6 py-4 font-medium transition-all duration-200 hover:shadow-md"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Try Again
          </motion.button>
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
              <p className="text-muted-foreground mt-2 text-sm">
                You'll join as{" "}
                {inviteData.invite.invited_role === "admin"
                  ? "an admin"
                  : "a member"}
                .
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
