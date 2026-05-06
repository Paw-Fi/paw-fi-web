"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useAvatar } from "@/hooks/use-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface SignUpFormProps {
  redirectUrl?: string;
}

export function SignUpForm({ redirectUrl }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { signUp, isLoading } = useAuth();
  const { checkUserHasAvatar } = useAvatar();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await signUp(
        email,
        password,
        { full_name: fullName },
        redirectUrl,
      );
      if (result.success) {
        // Check if email confirmation is required
        // The confirmation_sent_at property indicates an email was sent for verification
        if (result.data?.user?.confirmation_sent_at) {
          setVerificationSent(true);
        } else {
          navigate({ to: redirectUrl || "/dashboard" });
        }
      }
    } catch (error: any) {
      console.error("Sign up error:", error);

      // Handle specific Supabase error messages
      let errorMessage = "An error occurred during sign up";

      if (error.message) {
        if (error.message.includes("User already registered")) {
          errorMessage =
            "An account with this email already exists. Please sign in instead.";
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "Please enter a valid email address.";
        } else if (error.message.includes("Password")) {
          errorMessage = "Password must be at least 8 characters long.";
        } else if (error.message.includes("rate limit")) {
          errorMessage =
            "Too many attempts. Please wait a moment before trying again.";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // Successfully verified and logged in    
          const targetUrl = redirectUrl || "/dashboard";
          navigate({ to: targetUrl });        
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);

      let errorMessage = "Invalid verification code. Please try again.";

      if (error.message) {
        if (error.message.includes("expired")) {
          errorMessage =
            "Verification code has expired. Please request a new one.";
        } else if (error.message.includes("invalid")) {
          errorMessage =
            "Invalid verification code. Please check and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    setError(null);

    try {
      const result = await signUp(
        email,
        password,
        { full_name: fullName },
        redirectUrl,
      );
      if (result.success) {
        setError(null);
        // Reset OTP code input
        setOtpCode("");
      }
    } catch (error: any) {
      setError(error.message || "Failed to resend verification email");
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
      {verificationSent ? (
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            Verify Your Email
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            We've sent a verification email to{" "}
            <span className="font-medium">{email}</span>. You can either click
            the verification link in the email or enter the 6-digit code below.
          </p>

          <form
            id="otp-form"
            onSubmit={handleOtpVerification}
            className="mb-6 space-y-6"
          >
            <div>
              <label className="mb-4 block text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                Enter verification code
              </label>
              <div className="mb-3 flex justify-center">
                <InputOTP
                  autoFocus
                  maxLength={6}
                  value={otpCode}
                  onChange={(val) =>
                    setOtpCode(val.replace(/\D/g, "").slice(0, 6))
                  }
                  onComplete={(val) => {
                    setOtpCode(val);
                    setTimeout(() => {
                      const form = document.getElementById(
                        "otp-form",
                      ) as HTMLFormElement | null;
                      form?.requestSubmit();
                    }, 0);
                  }}
                  pasteTransformer={(p) => p.replace(/\D/g, "").slice(0, 6)}
                  autoComplete="one-time-code"
                  disabled={isVerifying}
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
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Enter the 6-digit code from your email or paste it directly
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-500 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isVerifying || otpCode.length !== 6}
              className="bg-primary hover:bg-primary/90 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify Email"
              )}
            </Button>
          </form>

          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Didn't receive the email? Check your spam folder or
            </p>
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              className="text-primary text-sm font-medium hover:underline"
            >
              {isLoading ? "Sending..." : "Send new verification email"}
            </button>
            <br />
            <button
              onClick={() => setVerificationSent(false)}
              className="text-sm text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
            >
              Back to sign up
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Create Your Account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full"
                placeholder="Create a password (min. 8 characters)"
              />
            </div>

            {error && (
              <div className="rounded bg-red-50 p-2 text-sm text-red-500 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 w-full"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
        </>
      )}
      {!verificationSent && (
        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Already have an account?{" "}
            <Link
              to="/login"
              search={{ redirect: redirectUrl }}
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
