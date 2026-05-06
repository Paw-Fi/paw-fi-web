import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAvatar } from "@/hooks/use-avatar";

export const Route = createFileRoute("/auth/confirm/")({
  component: AuthConfirm,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      next: (search.next as string) || "/dashboard",
    };
  },
});

function AuthConfirm() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { shouldPromptForAvatar } = useAvatar();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Prevent multiple executions
    if (isProcessing) return;

    const handleEmailConfirmation = async () => {
      setIsProcessing(true);

      try {
        // Get current URL parameters
        const url = new URL(window.location.href);
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        // Handle errors from email confirmation
        if (error) {
          console.error("Email confirmation error:", error, errorDescription);
          navigate({
            to: "/login",
            search: {
              redirect: next,
              error: errorDescription || "Email confirmation failed",
            },
          });
          return;
        }

        // For email confirmations, Supabase automatically handles session creation
        // Just check if we have a session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {         
            navigate({ to: next });          
        } else {
          console.error("No session found after email confirmation");
          navigate({
            to: "/login",
            search: {
              redirect: next,
              error: "Email confirmation session could not be established",
            },
          });
        }
      } catch (error) {
        console.error("Email confirmation processing error:", error);
        navigate({
          to: "/login",
          search: {
            redirect: next,
            error: "An unexpected error occurred during email confirmation",
          },
        });
      }
    };

    // Process email confirmation immediately
    handleEmailConfirmation();
  }, [navigate, next, shouldPromptForAvatar, isProcessing]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
        <p className="text-muted-foreground">Confirming your email...</p>
      </div>
    </div>
  );
}
