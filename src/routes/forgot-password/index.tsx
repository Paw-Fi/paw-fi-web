import { Link, createFileRoute } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function ForgotPassword() {
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

      <div className="bg-moneko-background h-screen flex w-screen flex-col px-6 lg:py-4">
            <MonekoIcon />

          <div className="flex flex-1 items-center justify-center">
            <div className="mx-auto w-full lg:max-w-md">
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <ForgotPasswordForm initialEmail={email} />
                  </CardContent>
                </Card>
            </div>
          </div>
        </div>

      
      </div>
    </>
  );
}
