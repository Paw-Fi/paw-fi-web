import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { CheckCircle2 } from "lucide-react";

interface ForgotPasswordFormProps {
  initialEmail?: string;
}

export function ForgotPasswordForm({ initialEmail }: ForgotPasswordFormProps) {
  const { user } = useAuth();
  const [resetEmail, setResetEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const resolvedEmail = initialEmail || user?.email || "";

  useEffect(() => {
    if (resolvedEmail && resolvedEmail !== resetEmail) {
      setResetEmail(resolvedEmail);
    }
  }, [resolvedEmail, resetEmail]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleSendReset() {
    setResetError(null);
    setResetSent(false);
    setCountdown(0);
    if (!resetEmail) {
      setResetError("Please enter your email address");
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      setCountdown(60);
    } catch (err: any) {
      setResetError(err.message || "Failed to send reset email");
    } finally {
      setIsSending(false);
    }
  }

  const canResend = countdown === 0;
  const isDisabled = isSending || resetSent;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-moneko-foreground text-lg font-semibold">
          Reset your password
        </h2>
        <p className="text-muted-foreground text-sm">
          {resetSent
            ? "We've sent a password reset link to your email."
            : "Enter your email and we will send you a password reset link."}
        </p>
      </div>

      {resetError && (
        <Alert variant="destructive">
          <AlertDescription>{resetError}</AlertDescription>
        </Alert>
      )}

      {resetSent && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Reset link sent
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Check your inbox for the password reset link.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label
          htmlFor="resetEmail"
          className="text-moneko-foreground text-sm font-medium"
        >
          Email
        </label>
        <Input
          id="resetEmail"
          type="email"
          placeholder="you@example.com"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect="off"
          disabled={isDisabled}
        />
      </div>

      <div className="flex flex-col items-stretch pt-2">
        {resetSent && (
          <div className="mb-4 flex flex-col items-center gap-2">
            <div className="text-muted-foreground flex items-center gap-2">
              <p className="text-xs">Check your spam or junk folder.</p>
            </div>
            {countdown > 0 && (
              <p className="text-muted-foreground text-xs">
                Resend available in{" "}
                <span className="font-mono font-semibold">{countdown}s</span>
              </p>
            )}
          </div>
        )}
        <Button
          onClick={handleSendReset}
          disabled={isSending || !resetEmail || !canResend}
        >
          {isSending
            ? "Sending…"
            : resetSent && !canResend
              ? `Resend in ${countdown}s`
              : resetSent
                ? "Send new link"
                : "Send reset link"}
        </Button>
      </div>
    </div>
  );
}
