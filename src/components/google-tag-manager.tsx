// app/components/GoogleTagManager.jsx
import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function GoogleTagManager({ gtmId }: { gtmId: string }) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]){window.dataLayer.push(args);}
    window.gtag = gtag;
    gtag('js', new Date());
  
    gtag('config', gtmId);
  }, [gtmId]);

  return <script async src={`https://www.googletagmanager.com/gtag/js?id=${gtmId}`}></script>
  ;
}