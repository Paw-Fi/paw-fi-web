import { initializeApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBlMgs8Go1eSElacNxrlDRx_FrhLKGzh_g",
  authDomain: "paw-fi-3c4f7.firebaseapp.com",
  projectId: "paw-fi-3c4f7",
  storageBucket: "paw-fi-3c4f7.firebasestorage.app",
  messagingSenderId: "1075784863194",
  appId: "1:1075784863194:web:22ba82c692e271f42ec4e3",
  measurementId: "G-YWMCF9JM0W"
};

let analytics: Analytics | null = null;

// Initialize Firebase Analytics only on client-side
export const initializeAnalytics = () => {
  // Only initialize in browser environment
  if (typeof window !== 'undefined' && !analytics) {
    try {
      const app = initializeApp(firebaseConfig);
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize Firebase Analytics:', error);
    }
  }
  return analytics;
};

// Get analytics instance (returns null on server-side)
export const getAnalyticsInstance = () => {
  return analytics;
};

// Utility function to track page views
export const trackPageView = (page_title: string, page_location: string) => {
  if (analytics && typeof window !== 'undefined') {
    // Import logEvent dynamically to avoid SSR issues
    import('firebase/analytics').then(({ logEvent }) => {
      logEvent(analytics!, 'page_view', {
        page_title,
        page_location,
      });
    });
  }
};

// Utility function to track custom events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (analytics && typeof window !== 'undefined') {
    import('firebase/analytics').then(({ logEvent }) => {
      logEvent(analytics!, eventName, parameters);
    });
  }
};