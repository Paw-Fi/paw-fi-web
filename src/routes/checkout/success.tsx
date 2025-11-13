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

    console.log('🔗 Checkout Success: flow=', flow, 'sessionId=', sessionId);

    // Mobile app trial flow - redirect to deep link IMMEDIATELY
    if (flow === 'trial') {
      const deepLink = `moneko://payment?status=success&flow=trial${sessionId ? `&session_id=${sessionId}` : ''}`;
      console.log('🔗 Redirecting to deep link:', deepLink);
      
      // Use window.location.replace to prevent back button and ensure immediate redirect
      window.location.replace(deepLink);
      return;
    }

    // Web flow - redirect to checkout page with status
    console.log('🌐 Web flow: redirecting to checkout');
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
