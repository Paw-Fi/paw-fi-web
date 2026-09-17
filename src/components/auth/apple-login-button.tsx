"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faApple } from "@fortawesome/free-brands-svg-icons";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface AppleLoginButtonProps {
  redirectUrl?: string;
  className?: string;
  disabled?: boolean;
}

export function AppleLoginButton({
  redirectUrl,
  className = "w-full",
  disabled = false,
}: AppleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAppleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl || "/dashboard")}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: callbackUrl },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Apple login error:", error);
      setError(error.message || "Failed to sign in with Apple");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleAppleLogin}
        disabled={isLoading || disabled}
        className={className}
      >
        {isLoading ? (
          <>
            <FontAwesomeIcon
              icon={faSpinner}
              className="mr-2 h-4 w-4 animate-spin"
            />
            Signing in with Apple...
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faApple} className="mr-2 h-4 w-4" />
            Continue with Apple
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
