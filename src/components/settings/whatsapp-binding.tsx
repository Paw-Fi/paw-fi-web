import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";

interface WhatsAppBindingProps {
  otpFromUrl?: string;
}

export function WhatsAppBinding({ otpFromUrl }: WhatsAppBindingProps) {
  const [code, setCode] = useState(otpFromUrl || "");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill OTP from URL parameter
  useEffect(() => {
    if (otpFromUrl && otpFromUrl !== code) {
      setCode(otpFromUrl);

      verifyCode(otpFromUrl);
    }
  }, [otpFromUrl]);

  const verifyCode = async (codeToVerify?: string) => {
    const verificationCode = codeToVerify || code;

    if (!verificationCode.toString().trim()) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Please log in first");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "verify-whatsapp-binding",
        {
          body: { code: verificationCode },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (error) {
        // Extract actual error message from Supabase function error
        const errorMessage = error.message || "Failed to verify code";
        console.error("Error verifying code:", error);
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (data?.success) {
        setVerified(true);
        setError(null);
      } else {
        // Use the error message from the backend response
        setError(data?.error || "Invalid verification code");
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      // Extract the actual error message if available
      const errorMessage =
        error?.context?.body?.error || error.message || "Failed to verify code";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            WhatsApp Verified
          </CardTitle>
          <CardDescription>
            Your WhatsApp number is successfully linked to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            You can now use WhatsApp to track expenses and manage your budget.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Verification Failed
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Enter code manually
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
                disabled={loading}
                pattern={REGEXP_ONLY_DIGITS}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          <Button
            onClick={() => verifyCode()}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying...</CardTitle>
          <CardDescription>
            Please wait while we verify your WhatsApp number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Verification Code
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
                disabled={true}
                pattern={REGEXP_ONLY_DIGITS}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {otpFromUrl ? (
              <p className="text-primary text-center text-xs font-medium">
                Code auto-filled from verification link
              </p>
            ) : (
              <p className="text-muted-foreground text-center text-xs">
                Enter the 6-digit code from WhatsApp
              </p>
            )}
          </div>
          <Button disabled={true} className="w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium">
            Verification Code
          </label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
              disabled={loading || !!otpFromUrl}
              pattern={REGEXP_ONLY_DIGITS}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {otpFromUrl ? (
            <p className="text-primary text-center text-xs font-medium">
              Code auto-filled from verification link
            </p>
          ) : (
            <p className="text-muted-foreground text-center text-xs">
              Enter the 6-digit code from WhatsApp
            </p>
          )}
        </div>
        <Button
          onClick={() => verifyCode()}
          disabled={loading || !code}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
