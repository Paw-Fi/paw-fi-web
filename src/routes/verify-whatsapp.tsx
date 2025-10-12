import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { WhatsAppBinding } from "@/components/settings/whatsapp-binding";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/verify-whatsapp")({
  component: VerifyWhatsappPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      otp: (search.otp as string) || undefined,
    };
  },
});

function VerifyWhatsappPage() {
  const { otp } = Route.useSearch();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    // Build redirect URL with OTP parameter
    const currentUrl = window.location.pathname + window.location.search;
    navigate({
      to: '/login',
      search: { redirect: currentUrl }
    });
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Login Required
            </CardTitle>
            <CardDescription>
              You need to be logged in to verify your WhatsApp connection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Please log in to continue with WhatsApp verification.
              {otp && " Your verification code will be preserved."}
            </p>
            <Button
              onClick={handleLoginRedirect}
              className="w-full"
            >
              Log In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated, show WhatsApp binding component
  return (
    <div className="container mx-auto max-w-md py-8">
      <WhatsAppBinding otpFromUrl={otp} />
    </div>
  );
}
