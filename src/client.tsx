/// <reference types="vinxi/types/client" />
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'
import { ReduxProvider } from './providers/ReduxProvider'
import { Suspense } from 'react'
import { initializeAnalytics } from './lib/analytics'

// Optimized root component with performance enhancements
function RootApp() {
  return (
    <ReduxProvider>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <StartClient />
      </Suspense>
    </ReduxProvider>
  );
}

// React 19 hydration with concurrent features and error recovery
const root = document.body

// Enhanced hydration with error recovery
try {
  hydrateRoot(
    root,
    <RootApp />,
    {
      // React 19 concurrent features for better performance
      identifierPrefix: 'moneko-',
      // Enable concurrent rendering
      onRecoverableError: (error, errorInfo) => {
        console.warn('Recoverable hydration error:', error);
        // In production, you might want to send this to an error reporting service
      },
    }
  );
} catch (error) {
  console.error('Hydration failed:', error);
  // Fallback: force client-side render
  import('react-dom/client').then(({ createRoot }) => {
    const fallbackRoot = createRoot(root);
    fallbackRoot.render(<RootApp />);
  });
}

// Preload critical resources after hydration
if (typeof window !== 'undefined') {
  // Initialize Firebase Analytics
  initializeAnalytics();
  
  // Enable service worker for caching only in production to avoid dev hydration issues
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Prompt the SW to check for updates immediately
          registration.update?.();
        })
        .catch(() => {
          // Service worker registration failed, continue without it
        });
    });
  }
  
  // In development, proactively unregister any existing SW and clear app caches to avoid stale assets on reload
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.filter((k) => k.startsWith('moneko-')).forEach((k) => caches.delete(k));
      });
    }
  }
}

// Type augmentation for hydration progress callback
declare global {
  interface Window {
    __HYDRATION_PROGRESS?: (progress: number) => void;
  }
}
