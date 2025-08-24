import { MotionGlobalConfig } from 'framer-motion';

export const disableAnimationsOnMobile = () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    MotionGlobalConfig.skipAnimations = true;
  }
};