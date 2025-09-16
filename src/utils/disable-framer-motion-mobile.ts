import { MotionGlobalConfig } from 'framer-motion';

export const disableAnimationsOnMobile = () => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') return;
  
  // Use viewport width to detect mobile (consistent with useDeviceType hook)
  const isMobile = window.innerWidth < 640;
  
  if (isMobile) {
    MotionGlobalConfig.skipAnimations = true;
  } else {
    // Re-enable animations if not mobile (in case of window resize)
    MotionGlobalConfig.skipAnimations = false;
  }
};