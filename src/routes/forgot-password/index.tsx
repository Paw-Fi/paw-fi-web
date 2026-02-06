import { Link, createFileRoute } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { Button } from "@/components/ui/button";
import authBg from "@/assets/images/auth/auth-bg.webp";
import authBgPng from "@/assets/images/auth/auth-bg.png";
import { MonekoIcon } from "@/components/shared/moneko-icon";
import { StructuredData } from "@/components/seo/structured-data";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const Route = createFileRoute("/forgot-password/")({
  component: ForgotPassword,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: (search.email as string) || undefined,
    };
  },
  head: () => {
    const pageUrl = getCanonicalUrl("/forgot-password");
    const meta = seo({
      title: "Forgot Password | Reset Your Moneko Account",
      description:
        "Request a password reset link to regain access to your Moneko account.",
      keywords: "forgot password, reset password, account recovery, Moneko",
      url: pageUrl,
    });

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

export function ForgotPassword() {
  const { email } = Route.useSearch();
  return (
    <>
      <StructuredData
        type="faq"
        data={[
          {
            question: "How do I reset my Moneko password?",
            answer:
              "Enter your email address and we will send you a secure password reset link to regain access to your account.",
          },
          {
            question: "How long does the reset link take to arrive?",
            answer:
              "Reset emails typically arrive within a few minutes. If you don’t see it, check your spam or promotions folder.",
          },
          {
            question: "Is the password reset process secure?",
            answer:
              "Yes. Moneko uses secure, time-limited reset links to protect your account and personal data.",
          },
        ]}
      />

      <div className="bg-moneko-background grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="relative flex flex-col">
          <div className="flex items-center justify-between px-6 py-4">
            <MonekoIcon />
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>Remembered your password?</span>
              <Button asChild size="sm" variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-1 items-center">
            <div className="mx-auto w-full max-w-md px-6 py-8">
              <div className="space-y-4">
                <ForgotPasswordForm initialEmail={email} />
              </div>
            </div>
          </div>
        </div>

        <div className="relative m-4 ml-0 hidden overflow-hidden rounded-3xl lg:block">
          <OptimizedImage
            src={authBgPng}
            webpSrc={authBg}
            alt="Secure password recovery for your Moneko account"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-90 dark:contrast-80"
            priority={true}
            loading="eager"
            width={1080}
            height={1080}
          />

          <div className="bg-overlay/80 dark:text-moneko-foreground absolute right-6 bottom-6 left-6 rounded-lg p-4 text-white backdrop-blur-sm">
            <h3 className="dark:text-moneko-foreground mb-2 font-semibold text-white">
              Secure Account Recovery
            </h3>
            <ul className="dark:text-moneko-foreground space-y-1 text-sm text-white opacity-90">
              <li>• Time-limited reset links</li>
              <li>• Bank-level encryption</li>
              <li>• SOC 2 compliant security</li>
              <li>• Trusted by 50,000+ users</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default ForgotPassword;
