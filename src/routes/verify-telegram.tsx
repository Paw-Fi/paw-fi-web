import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/verify-telegram")({
  component: VerifyTelegramPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      otp: (search.otp as string) || undefined,
    };
  },
});

function VerifyTelegramPage() {
  const { otp } = Route.useSearch();

  useEffect(() => {
    if (otp) {
      const deepLink = `moneko://verify-telegram?otp=${otp}`;
      window.location.href = deepLink;
    }
  }, [otp]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
        <p className="text-muted-foreground text-sm">Opening mobile app...</p>
      </div>
    </div>
  );
}
