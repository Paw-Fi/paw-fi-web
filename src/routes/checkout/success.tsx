import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

type SuccessSearchParams = {
  status?: string;
  flow?: string;
  session_id?: string;
};

export const Route = createFileRoute("/checkout/success")({
  component: CheckoutSuccessRedirect,
});

function CheckoutSuccessRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const flow = params.get('flow');
    const sessionId = params.get('session_id');

    // Mobile app trial flow - redirect to deep link
    if (flow === 'trial') {
      const deepLink = `moneko://payment?status=success&flow=trial${sessionId ? `&session_id=${sessionId}` : ''}`;
      window.location.href = deepLink;
      return;
    }

    // Web flow - redirect to checkout page with status
    const checkoutParams = new URLSearchParams();
    checkoutParams.set('status', 'success');
    if (sessionId) checkoutParams.set('session_id', sessionId);

    window.location.href = `/checkout?${checkoutParams.toString()}`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground-color">Redirecting...</p>
      </div>
    </div>
  );
}
