import { useState } from "react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

interface ForgotPasswordFormProps {
  initialEmail?: string;
}

export function ForgotPasswordForm({ initialEmail }: ForgotPasswordFormProps) {
  const { user } = useAuth();
  const [resetEmail, setResetEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const resolvedEmail = initialEmail || user?.email || "";

  useEffect(() => {
    if (resolvedEmail && resolvedEmail !== resetEmail) {
      setResetEmail(resolvedEmail);
    }
  }, [resolvedEmail, resetEmail]);

  async function handleSendReset() {
    setResetError(null);
    setResetSent(false);
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
    } catch (err: any) {
      setResetError(err.message || "Failed to send reset email");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-moneko-foreground">
          Reset your password
        </DialogTitle>
        <DialogDescription>
          Enter your email and we will send you a password reset link.
        </DialogDescription>
      </DialogHeader>

      {resetError && (
        <Alert variant="destructive">
          <AlertDescription>{resetError}</AlertDescription>
        </Alert>
      )}

      {resetSent && (
        <Alert variant="default">
          <AlertDescription>
            Check your email for the reset link.
          </AlertDescription>
        </Alert>
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
        />
      </div>

      <DialogFooter>
        <Button onClick={handleSendReset} disabled={isSending || !resetEmail}>
          {isSending ? "Sending…" : "Send reset link"}
        </Button>
      </DialogFooter>
    </>
  );
}
