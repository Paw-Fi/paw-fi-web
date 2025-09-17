import { useDeviceType } from "./use-device-type";
import type { Variants } from "framer-motion";

/**
 * Custom hook for mobile-aware Framer Motion animations
 * Provides optimized viewport and animation configurations for mobile devices
 */
export function useMobileAnimation() {
  const { isMobile } = useDeviceType();

  // Mobile-optimized viewport configuration
  const mobileViewport = {
    once: true,
    margin: "-50px 0px -50px 0px", // Trigger animations earlier on mobile
    amount: 0.1, // Only need 10% of element visible on mobile
  };

  // Desktop viewport configuration
  const desktopViewport = {
    once: true,
    margin: "0px 0px -100px 0px",
    amount: 0.3, // Need 30% of element visible on desktop
  };

  // Get appropriate viewport config
  const getViewportConfig = () => {
    return isMobile ? mobileViewport : desktopViewport;
  };

  // Animation configurations
  const mobileAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" as const }
  };

  const desktopAnimation = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
  };

  // Get appropriate animation config
  const getAnimationConfig = () => {
    return isMobile ? mobileAnimation : desktopAnimation;
  };

  // Staggered animation for lists/grids
  const getStaggerConfig = (index: number) => {
    const baseDelay = isMobile ? 0.05 : 0.1;
    const config = getAnimationConfig();
    return {
      ...config,
      transition: {
        ...config.transition,
        delay: index * baseDelay
      }
    };
  };

  // Simple fade animation for mobile fallback
  const simpleFadeConfig = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 }
  };

  return {
    isMobile,
    viewport: getViewportConfig(),
    animation: getAnimationConfig(),
    staggerAnimation: getStaggerConfig,
    simpleFade: simpleFadeConfig,
    // Helper function to conditionally apply animations
    conditionalAnimation: (desktopProps: any, mobileProps?: any) => {
      if (isMobile && mobileProps) {
        return mobileProps;
      }
      return isMobile ? {} : desktopProps; // No animation on mobile if no mobile props provided
    }
  };
}
