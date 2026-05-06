import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";

import { useAvatar } from "@/hooks/use-avatar";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback/")({
  component: AuthCallback,
  validateSearch: (search: Record<string, unknown>) => {
    const next = search.next as string;
    return {
      next: next ? decodeURIComponent(next) : "/dashboard",
    };
  },
});

function AuthCallback() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { shouldPromptForAvatar } = useAvatar();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    const handleAuthCallback = async () => {
      try {
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );
        const queryParams = new URLSearchParams(window.location.search);
        const type = hashParams.get("type") || queryParams.get("type");
        const authCode = queryParams.get("code");

        if (type === "recovery") {
          navigate({ to: "/reset-password" });
          return;
        }

        if (authCode) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(authCode);

          if (exchangeError) {
            console.error("OAuth code exchange error:", exchangeError);
          }
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          navigate({
            to: "/login",
            search: {
              redirect: next,
              error: "Authentication failed. Please try again.",
            },
          });
          return;
        }

        const resolvedSession = session ?? (await waitForAuthSession());

        if (!resolvedSession) {
          navigate({
            to: "/login",
            search: {
              redirect: next,
              error: "Authentication session could not be established",
            },
          });
          return;
        }
        navigate({ to: next });
      } catch (error) {
        console.error("OAuth callback processing error:", error);
        navigate({
          to: "/login",
          search: {
            redirect: next,
            error: "An unexpected error occurred during authentication",
          },
        });
      }
    };

    void handleAuthCallback();
  }, [navigate, next, shouldPromptForAvatar]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}

async function waitForAuthSession(): Promise<Session | null> {
  const existingSession = (await supabase.auth.getSession()).data.session;

  if (existingSession) {
    return existingSession;
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      authSubscription.data.subscription.unsubscribe();
      resolve(null);
    }, 8000);

    const authSubscription = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          return;
        }

        window.clearTimeout(timeoutId);
        authSubscription.data.subscription.unsubscribe();
        resolve(session);
      },
    );
  });
}
