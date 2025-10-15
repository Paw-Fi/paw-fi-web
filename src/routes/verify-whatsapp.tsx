import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

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

  useEffect(() => {
    // Redirect to mobile app with deep link
    if (otp) {
      const deepLink = `moneko://verify-whatsapp?otp=${otp}`;
      window.location.href = deepLink;
    }
  }, [otp]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">
          Opening mobile app...
        </p>
      </div>
    </div>
  );
}
