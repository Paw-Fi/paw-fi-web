// app/components/GoogleTagManager.jsx
import { useEffect } from 'react';
import ReactGA from 'react-ga4';

export function GoogleTagManager({ gtmId }: { gtmId: string }) {
  useEffect(() => {
    // Initialize Google Analytics
    ReactGA.initialize(gtmId);
    
    // Send pageview with current path
    ReactGA.send({ 
      hitType: "pageview", 
      page: window.location.pathname,
      title: document.title 
    });
  }, [gtmId]);

  return null; // No JSX needed - react-ga4 handles script injection
}