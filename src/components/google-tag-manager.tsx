// app/components/GoogleTagManager.jsx
import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (command: string, ...args: any[]) => void;
  }
}

export function GoogleTagManager({ gtmId }: { gtmId: string }) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];
    function gtag(command: string, ...args: any[]){window.dataLayer.push([command, ...args]);}
    window.gtag = gtag;
    gtag('js', new Date());
  
    gtag('config', gtmId);
  }, [gtmId]);

  return (
    <>
      {/* Preconnect to Google Tag Manager domain for faster connection setup */}
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      {/* Use defer instead of async for better performance */}
      <script defer src={`https://www.googletagmanager.com/gtag/js?id=${gtmId}`}></script>
    </>
  );
}