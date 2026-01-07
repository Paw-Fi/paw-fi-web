"use client"

import { useState, ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/contexts/auth-context"
import { useAvatar } from "@/hooks/use-avatar"
import { Link, useNavigate } from "@tanstack/react-router"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { GoogleLoginButton } from "@/components/auth/google-login-button"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faEye, faEyeSlash, faEnvelope, faLock, faUser, faSpinner, faCircleCheck, faArrowLeft } from "@fortawesome/free-solid-svg-icons"

const signUpSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .min(2, "Full name must be at least 2 characters long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
})

const otpSchema = z.object({
  otp: z
    .string()
    .regex(/^\d{6}$/, "Please enter the 6-digit verification code"),
})

type SignUpForm = z.infer<typeof signUpSchema>
type OTPForm = z.infer<typeof otpSchema>

interface ShadcnSignUpFormProps {
  redirectUrl?: string
  hideBottomLink?: boolean
  variant?: 'card' | 'plain'
  hideHeader?: boolean
  submitLabel?: string
  submitClassName?: string
  children?: ReactNode
}

// Helper function to parse redirect URLs with query parameters
const parseRedirectUrl = (url: string | undefined) => {
  if (!url) return { to: "/couple-budgeting" as const };
  
  // Split by ? to separate path and query string
  const [path, queryString] = url.split('?');
  
  // If no query string, return simple path navigation
  if (!queryString) return { to: path as any };
  
  // Parse query string into search params object
  const searchParams: Record<string, any> = {};
  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key && value) {
      searchParams[key] = decodeURIComponent(value);
    }
  });
  
  return { to: path as any, search: searchParams as any };
}

export function ShadcnSignUpForm({
  redirectUrl,
  hideBottomLink,
  variant = 'card',
  hideHeader = false,
  submitLabel = 'Create Account',
  submitClassName,
  children,
}: ShadcnSignUpFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationSent, setVerificationSent] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [lastResendTime, setLastResendTime] = useState<number | null>(null)
  
  const { signUp, isLoading } = useAuth()
  const { checkUserHasAvatar } = useAvatar()
  const navigate = useNavigate()

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  })

  const [otpValue, setOtpValue] = useState("")
  const otpForm = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  })

  const onSignUpSubmit = async (data: SignUpForm) => {
    setError(null)
    
    try {
      const result = await signUp(data.email, data.password, { full_name: data.fullName }, redirectUrl)
      
      if (result.success) {
        // Check if email confirmation is required
        if (result.data?.user?.confirmation_sent_at) {
          setRegisteredEmail(data.email)
          setVerificationSent(true)
        } else {
          // If no confirmation needed, check avatar and navigate accordingly
          const hasAvatar = await checkUserHasAvatar()
          
          if (!hasAvatar) {
            // CRITICAL FIX: Preserve redirect URL when going to avatar customizer
            // This ensures users registering to purchase (e.g., lifetime) get back to checkout
            navigate({ 
              to: "/avatar-customizer",
              search: redirectUrl ? { redirect: redirectUrl } : undefined 
            })
          } else {
            const redirectParams = parseRedirectUrl(redirectUrl)
            navigate(redirectParams)
          }
        }
      }
    } catch (error: any) {
      console.error("Sign up error:", error)
      
      // Handle specific Supabase error messages
      let errorMessage = "An error occurred during sign up"
      
      if (error.message) {
        if (error.message.includes("User already registered")) {
          errorMessage = "An account with this email already exists. Please sign in instead."
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "Please enter a valid email address."
        } else if (error.message.includes("Password")) {
          errorMessage = "Password must be at least 8 characters long."
        } else if (error.message.includes("rate limit")) {
          errorMessage = "Too many attempts. Please wait a moment before trying again."
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    }
  }

  const onOtpSubmit = async (data: OTPForm) => {
    setError(null)
    setIsVerifying(true)
    
    try {
      const { data: authData, error } = await supabase.auth.verifyOtp({
        email: registeredEmail,
        token: otpValue,
        type: "email",
      })
      
      if (error) {
        throw error
      }
      
      if (authData.session) {
        // Successfully verified and logged in
        const hasAvatar = await checkUserHasAvatar()
        
        if (!hasAvatar) {
          // CRITICAL FIX: Preserve redirect URL when going to avatar customizer
          // This ensures users registering to purchase (e.g., lifetime) get back to checkout
          navigate({ 
            to: "/avatar-customizer",
            search: redirectUrl ? { redirect: redirectUrl } : undefined 
          })
        } else {
          const redirectParams = parseRedirectUrl(redirectUrl)
          navigate(redirectParams)
        }
      }
    } catch (error: any) {
      console.error("OTP verification error:", error)
      
      let errorMessage = "Invalid verification code. Please try again."
      
      if (error.message) {
        if (error.message.includes("expired")) {
          errorMessage = "Verification code has expired. Please request a new one."
        } else if (error.message.includes("invalid")) {
          errorMessage = "Invalid verification code. Please check and try again."
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendVerification = async () => {
    // Check cooldown period (60 seconds between resends)
    const now = Date.now()
    if (lastResendTime && now - lastResendTime < 60000) {
      const remainingSeconds = Math.ceil((60000 - (now - lastResendTime)) / 1000)
      setError(`Please wait ${remainingSeconds} seconds before requesting another code.`)
      return
    }
    
    setError(null)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
      })
      
      if (error) {
        throw error
      }
      
      // Success - clear the OTP field and update state
      setOtpValue("")
      otpForm.reset()
      setError(null)
      setLastResendTime(Date.now())
      
      // Start 60-second cooldown timer
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      console.log("Verification email resent successfully")
    } catch (error: any) {
      console.error("Resend verification error:", error)
      
      let errorMessage = "Failed to resend verification email"
      
      if (error.message) {
        if (error.message.includes("rate limit") || error.message.includes("email_send_rate_limit")) {
          errorMessage = "You've reached the email limit. Please wait 5-10 minutes before trying again, or contact support if this persists."
        } else if (error.message.includes("Email rate limit exceeded")) {
          errorMessage = "Email service is temporarily rate-limited. Please wait a few minutes and try again."
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    }
  }

  const handleBackToSignUp = () => {
    setVerificationSent(false)
    setRegisteredEmail("")
    setError(null)
    setOtpValue("")
    otpForm.reset()
  }

  if (verificationSent) {
    return (
      <div className="w-full max-w-md mx-auto">
        {variant === 'card' ? (
          <Card className="w-full">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-success-light dark:bg-success/20 p-3">
                  <FontAwesomeIcon icon={faCircleCheck} className="h-12 w-12 text-success" />
                </div>
              </div>
              <CardTitle className="text-2xl text-moneko-foreground">Verify Your Email</CardTitle>
              <CardDescription>
                We've sent a 6-digit verification code to{" "}
                <Badge variant="secondary" className="text-xs">
                  {registeredEmail}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={(e) => {
                e.preventDefault()
                if (otpValue.length === 6) {
                  onOtpSubmit({ otp: otpValue })
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-center block text-moneko-foreground">Verification Code</label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpValue}
                      onChange={(value) => setOtpValue(value)}
                      disabled={isVerifying}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isVerifying || otpValue.length !== 6}
                >
                  {isVerifying ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Email"
                  )}
                </Button>
              </form>
              <div className="space-y-4 text-center text-sm">
                <div className="text-muted-foreground">
                  Didn't receive the code? Check your spam folder or{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={handleResendVerification}
                    disabled={isLoading || resendCooldown > 0}
                  >
                    {resendCooldown > 0 ? `resend in ${resendCooldown}s` : "resend verification email"}
                  </Button>
                </div>
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mx-auto"
                    onClick={handleBackToSignUp}
                    disabled={isVerifying}
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4" />
                    Back to sign up
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {!hideHeader && (
              <div className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-success-light dark:bg-success/20 p-3">
                    <FontAwesomeIcon icon={faCircleCheck} className="h-12 w-12 text-success" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-moneko-foreground">Verify Your Email</h2>
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit verification code to{" "}
                  <Badge variant="secondary" className="text-xs align-middle ml-1">{registeredEmail}</Badge>
                </p>
              </div>
            )}
            <form onSubmit={(e) => {
              e.preventDefault()
              if (otpValue.length === 6) {
                onOtpSubmit({ otp: otpValue })
              }
            }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-center block">Verification Code</label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={(value) => setOtpValue(value)}
                    disabled={isVerifying}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isVerifying || otpValue.length !== 6}
              >
                {isVerifying ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </form>
            <div className="space-y-4 text-center text-sm">
              <div className="text-muted-foreground">
                Didn't receive the code? Check your spam folder or{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={handleResendVerification}
                  disabled={isLoading || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `resend in ${resendCooldown}s` : "resend verification email"}
                </Button>
              </div>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  className="mx-auto"
                  onClick={handleBackToSignUp}
                  disabled={isVerifying}
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4" />
                  Back to sign up
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {variant === 'card' ? (
        <Card className="w-full">
          {hideHeader ? null : (
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-moneko-foreground">Create account</CardTitle>
              <CardDescription className="text-center">
                Enter your details to create your account
              </CardDescription>
            </CardHeader>
          )}
          <CardContent className="space-y-4">
            {/* Google Login Button */}
            <GoogleLoginButton 
              redirectUrl={redirectUrl}
              disabled={isLoading}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-moneko-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                <FormField
                  control={signUpForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Your full name"
                            className="pl-10"
                            type="text"
                            disabled={isLoading}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="name@example.com"
                            className="pl-10"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isLoading}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            className="pl-10 pr-10"
                            autoComplete="new-password"
                            disabled={isLoading}
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <FontAwesomeIcon icon={faEyeSlash} className="h-4 w-4" />
                            ) : (
                              <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {children}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className={`w-full ${submitClassName ? submitClassName : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    submitLabel
                  )}
                </Button>
              </form>
            </Form>

            {!hideBottomLink && (
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" search={{ redirect: redirectUrl }} className="underline">Sign in</Link>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {!hideHeader && (
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-semibold text-moneko-foreground">Create account</h2>
              <p className="text-sm text-muted-foreground">Enter your details to create your account</p>
            </div>
          )}
          
          {/* Google Login Button */}
          <GoogleLoginButton 
            redirectUrl={redirectUrl}
            disabled={isLoading}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-moneko-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Form {...signUpForm}>
            <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
              <FormField
                control={signUpForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Your full name"
                          className="pl-10"
                          type="text"
                          disabled={isLoading}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signUpForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="name@example.com"
                          className="pl-10"
                          type="email"
                          autoCapitalize="none"
                          autoComplete="email"
                          autoCorrect="off"
                          disabled={isLoading}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signUpForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          className="pl-10 pr-10"
                          autoComplete="new-password"
                          disabled={isLoading}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <FontAwesomeIcon icon={faEyeSlash} className="h-4 w-4" />
                          ) : (
                            <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {children}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className={`w-full ${submitClassName ? submitClassName : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </form>
          </Form>
          {!hideBottomLink && (
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" search={{ redirect: redirectUrl }} className="underline">Sign in</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
