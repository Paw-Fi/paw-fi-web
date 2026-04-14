import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

type CancelSearchParams = {
  status?: string;
  flow?: string;
};

export const Route = createFileRoute("/checkout/cancel")({
  component: CheckoutCancelRedirect,
});

function CheckoutCancelRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const flow = params.get("flow");

    // Mobile app trial flow - redirect to deep link IMMEDIATELY
    if (flow === "trial") {
      const deepLink = `moneko://payment?status=canceled&flow=trial`;

      // Use window.location.replace to prevent back button and ensure immediate redirect
      window.location.replace(deepLink);
      return;
    }

    // Web flow - redirect to checkout page with status
    const checkoutParams = new URLSearchParams();
    checkoutParams.set("status", "canceled");

    window.location.href = `/checkout?${checkoutParams.toString()}`;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
        <p className="text-muted-foreground-color">Redirecting...</p>
      </div>
    </div>
  );
}
