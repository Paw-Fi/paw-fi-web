"use client";

import { motion } from 'framer-motion';
import { memo } from 'react';

const animationVariants = {
  purple: {
    x: [0, 80, -60, 100, -40, 60, 0],
    y: [0, -90, 120, -80, 50, -30, 0],
    scale: [1, 1.05, 0.97, 1.08, 0.99, 1.03, 1],
    rotate: [0, 25, -18, 30, -12, 20, 0],
    opacity: [0.85, 0.95, 0.9, 0.92, 0.88, 0.90, 0.85],
  },
  pink: {
    x: [0, 60, -40, 15, -50, 30, 0],
    y: [0, -70, 50, -30, 80, -25, 0],
    scale: [1, 1.08, 0.92, 1.05, 0.95, 1.06, 1],
    rotate: [0, -15, 25, -8, 18, -12, 0],
    opacity: [0.7, 0.85, 0.75, 0.82, 0.72, 0.83, 0.7],
  },
  blue: {
    x: [0, -90, 60, -70, 40, -20, 0],
    y: [0, 110, -80, 60, -40, 30, 0],
    scale: [1, 0.96, 1.1, 0.98, 1.06, 1.01, 1],
    rotate: [0, 35, -25, 40, -15, 25, 0],
    opacity: [0.9, 0.98, 0.95, 0.88, 0.93, 0.96, 0.9],
  },
  lightBlue: {
    x: [0, -40, 20, -10, 30, 0],
    y: [0, 80, -35, 50, -20, 0],
    scale: [1, 1.04, 0.96, 1.08, 0.98, 1],
    rotate: [0, -20, 12, -25, 15, 0],
    opacity: [0.75, 0.9, 0.8, 0.87, 0.77, 0.75],
  },
  accent: {
    x: [0, 70, -50, 90, -60, 35, 0],
    y: [0, -60, 100, -45, 70, -80, 0],
    scale: [1, 1.12, 0.9, 1.06, 0.96, 1.04, 1],
    rotate: [0, 18, -30, 35, -20, 25, 0],
    opacity: [0.6, 0.75, 0.65, 0.72, 0.62, 0.73, 0.6],
  }
};

const transitionConfigs = {
  purple: { duration: 18, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" },
  pink: { duration: 22, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut", delay: 1 },
  blue: { duration: 20, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut", delay: 1.5 },
  lightBlue: { duration: 24, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut", delay: 0.5 },
  accent: { duration: 16, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut", delay: 2.5 }
};

const HaloLayer = memo(({ 
  variants, 
  transition, 
  position, 
  size, 
  colors, 
  zIndex = 0,
  hasInnerLayer = true 
}: {
  variants: any;
  transition: any;
  position: string;
  size: string;
  colors: string;
  zIndex?: number;
  hasInnerLayer?: boolean;
}) => (
  <>
    {/* Static version for mobile - no animation */}
    <div
      className="absolute inset-0 md:hidden"
      style={{ 
        zIndex,
        transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
        backfaceVisibility: 'hidden' // Prevent flicker
      }}
    >
      <div className={`absolute ${position} transform -translate-x-1/2 -translate-y-1/2`}>
        <div className={`${size} rounded-full blur-3xl bg-radial ${colors}`} />
        {hasInnerLayer && (
          <div className={`absolute inset-8 ${size.replace(/\d+/g, (match) => String(Math.floor(parseInt(match) * 0.6)))} rounded-full blur-2xl bg-radial ${colors.replace(/to-[\w-]+/g, 'to-transparent')}`} />
        )}
      </div>
    </div>

    {/* Animated version for desktop */}
    <motion.div
      className="absolute inset-0 hidden md:block"
      style={{ 
        willChange: 'transform, opacity', 
        zIndex,
        transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
        backfaceVisibility: 'hidden' // Prevent flicker
      }}
      variants={variants}
      animate="default"
      transition={transition}
    >
      <div className={`absolute ${position} transform -translate-x-1/2 -translate-y-1/2`}>
        <div className={`${size} rounded-full blur-3xl bg-radial ${colors}`} />
        {hasInnerLayer && (
          <div className={`absolute inset-8 ${size.replace(/\d+/g, (match) => String(Math.floor(parseInt(match) * 0.6)))} rounded-full blur-2xl bg-radial ${colors.replace(/to-[\w-]+/g, 'to-transparent')}`} />
        )}
      </div>
    </motion.div>
  </>
));

HaloLayer.displayName = 'HaloLayer';

/**
 * AmbientHalo component that creates a constantly animating, organic, jellyfish-like background effect.
 * Optimized for performance with memoization and hardware acceleration.
 */
const AmbientHalo = memo(() => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none bg-halo-bg">
      <HaloLayer
        variants={{ default: animationVariants.purple }}
        transition={transitionConfigs.purple}
        position="top-1/2 left-1/2"
        size="w-[900px] h-[900px]"
        colors="from-halo-purple via-halo-purple-mid to-halo-purple-outer"
        zIndex={0}
      />

      <HaloLayer
        variants={{ default: animationVariants.pink }}
        transition={transitionConfigs.pink}
        position="top-1/3 left-2/3"
        size="w-[750px] h-[750px]"
        colors="from-halo-pink via-halo-pink-mid to-halo-pink-outer"
        zIndex={0}
      />

      <HaloLayer
        variants={{ default: animationVariants.blue }}
        transition={transitionConfigs.blue}
        position="top-1/3 left-2/3"
        size="w-[700px] h-[700px]"
        colors="from-halo-blue via-halo-blue-mid to-halo-blue-outer"
        zIndex={1}
      />

      <HaloLayer
        variants={{ default: animationVariants.lightBlue }}
        transition={transitionConfigs.lightBlue}
        position="top-2/3 left-1/4"
        size="w-[750px] h-[750px]"
        colors="from-halo-light-blue via-halo-light-blue-mid to-halo-light-blue-outer"
        zIndex={2}
      />

      <HaloLayer
        variants={{ default: animationVariants.accent }}
        transition={transitionConfigs.accent}
        position="top-3/4 left-3/4"
        size="w-[600px] h-[600px]"
        colors="from-halo-purple via-halo-pink to-halo-purple-outer"
        zIndex={0}
        hasInnerLayer={false}
      />
    </div>
  );
});

AmbientHalo.displayName = 'AmbientHalo';

export default AmbientHalo;