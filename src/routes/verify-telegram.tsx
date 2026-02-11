import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

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
  const [showFallback, setShowFallback] = useState(false);

  const deepLink = useMemo(() => {
    if (!otp) return "moneko://";
    return `moneko://verify-telegram?otp=${encodeURIComponent(otp)}`;
  }, [otp]);

  useEffect(() => {
    if (!otp) {
      setShowFallback(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowFallback(true);
    }, 1500);

    window.location.href = deepLink;

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [otp, deepLink]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {otp ? (
          <>
            <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
            <p className="text-muted-foreground text-sm">
              Opening mobile app...
            </p>
            {showFallback ? (
              <a
                href={deepLink}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
              >
                Open the app
              </a>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-center text-sm">
              Missing verification code. Please open the verification link from
              Telegram again.
            </p>
            <a
              href={deepLink}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
            >
              Open the app
            </a>
          </>
        )}
      </div>
    </div>
  );
}
