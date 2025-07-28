"use client";

import React from 'react';
import { motion } from 'framer-motion';

/**
 * AmbientHalo component that creates a constantly animating, organic, jellyfish-like background effect.
 */
const AmbientHalo = () => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none bg-halo-bg dark:bg-dark-halo-bg">
      {/* Primary Ambient Halo - Light Purple */}
      <motion.div
        className="absolute inset-0"
        style={{ willChange: 'transform, opacity' }}
        animate={{
          x: [0, 80, -60, 100, -40, 60, 0],
          y: [0, -90, 120, -80, 50, -30, 0],
          scale: [1, 1.05, 0.97, 1.08, 0.99, 1.03, 1],
          rotate: [0, 25, -18, 30, -12, 20, 0],
          opacity: [0.85, 0.95, 0.9, 0.92, 0.88, 0.90, 0.85],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-[900px] h-[900px] rounded-full blur-3xl bg-gradient-radial from-halo-purple via-halo-purple-mid to-halo-purple-outer dark:from-dark-halo-purple dark:via-dark-halo-purple-mid dark:to-dark-halo-purple-outer" />
          <div className="absolute inset-8 w-[550px] h-[550px] rounded-full blur-2xl bg-gradient-radial from-halo-purple via-halo-purple-mid to-transparent dark:from-dark-halo-purple dark:via-dark-halo-purple-mid dark:to-transparent" />
        </div>
      </motion.div>

      {/* Light Pink Halo */}
      <motion.div
        className="absolute inset-0"
        style={{ willChange: 'transform, opacity', zIndex: 0 }}
        animate={{
          x: [0, 60, -40, 15, -50, 30, 0],
          y: [0, -70, 50, -30, 80, -25, 0],
          scale: [1, 1.08, 0.92, 1.05, 0.95, 1.06, 1],
          rotate: [0, -15, 25, -8, 18, -12, 0],
          opacity: [0.7, 0.85, 0.75, 0.82, 0.72, 0.83, 0.7],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
          delay: 1,
        }}
      >
        <div className="absolute top-1/3 left-2/3 transform -translate-x-1/2 -translate-y-1/3">
          <div className="w-[750px] h-[750px] rounded-full blur-3xl bg-gradient-radial from-halo-pink via-halo-pink-mid to-halo-pink-outer dark:from-dark-halo-pink dark:via-dark-halo-pink-mid dark:to-dark-halo-pink-outer" />
          <div className="absolute inset-8 w-[500px] h-[500px] rounded-full blur-2xl bg-gradient-radial from-halo-pink via-halo-pink-mid to-transparent dark:from-dark-halo-pink dark:via-dark-halo-pink-mid dark:to-transparent" />
        </div>
      </motion.div>
      
      {/* Light Blue Halo */}
      <motion.div
        className="absolute inset-0"
        style={{ willChange: 'transform, opacity', zIndex: 1 }}
        animate={{
          x: [0, -90, 60, -70, 40, -20, 0],
          y: [0, 110, -80, 60, -40, 30, 0],
          scale: [1, 0.96, 1.1, 0.98, 1.06, 1.01, 1],
          rotate: [0, 35, -25, 40, -15, 25, 0],
          opacity: [0.9, 0.98, 0.95, 0.88, 0.93, 0.96, 0.9],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
          delay: 1.5,
        }}
      >
        <div className="absolute top-1/3 left-2/3 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-[700px] h-[700px] rounded-full blur-3xl bg-gradient-radial from-halo-blue via-halo-blue-mid to-halo-blue-outer dark:from-dark-halo-blue dark:via-dark-halo-blue-mid dark:to-dark-halo-blue-outer" />
          <div className="absolute inset-8 w-[450px] h-[450px] rounded-full blur-2xl bg-gradient-radial from-halo-blue via-halo-blue-mid to-transparent dark:from-dark-halo-blue dark:via-dark-halo-blue-mid dark:to-transparent" />
        </div>
      </motion.div>

      {/* Even Lighter Blue Halo */}
      <motion.div
        className="absolute inset-0"
        style={{ willChange: 'transform, opacity', zIndex: 2 }}
        animate={{
          x: [0, -40, 20, -10, 30, 0],
          y: [0, 80, -35, 50, -20, 0],
          scale: [1, 1.04, 0.96, 1.08, 0.98, 1],
          rotate: [0, -20, 12, -25, 15, 0],
          opacity: [0.75, 0.9, 0.8, 0.87, 0.77, 0.75],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
          delay: 0.5,
        }}
      >
        <div className="absolute top-2/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-[750px] h-[750px] rounded-full blur-3xl bg-gradient-radial from-halo-light-blue via-halo-light-blue-mid to-halo-light-blue-outer dark:from-dark-halo-light-blue dark:via-dark-halo-light-blue-mid dark:to-dark-halo-light-blue-outer" />
          <div className="absolute inset-8 w-[500px] h-[500px] rounded-full blur-2xl bg-gradient-radial from-halo-light-blue via-halo-light-blue-mid to-transparent dark:from-dark-halo-light-blue dark:via-dark-halo-light-blue-mid dark:to-transparent" />
        </div>
      </motion.div>

      {/* Additional Dynamic Accent Halo - Purple-Pink Mix */}
      <motion.div
        className="absolute inset-0"
        style={{ willChange: 'transform, opacity', zIndex: 0 }}
        animate={{
          x: [0, 70, -50, 90, -60, 35, 0],
          y: [0, -60, 100, -45, 70, -80, 0],
          scale: [1, 1.12, 0.9, 1.06, 0.96, 1.04, 1],
          rotate: [0, 18, -30, 35, -20, 25, 0],
          opacity: [0.6, 0.75, 0.65, 0.72, 0.62, 0.73, 0.6],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
          delay: 2.5,
        }}
      >
        <div className="absolute top-3/4 left-3/4 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-[600px] h-[600px] rounded-full blur-3xl bg-gradient-radial from-halo-purple via-halo-pink to-halo-purple-outer dark:from-dark-halo-purple dark:via-dark-halo-pink dark:to-dark-halo-purple-outer" />
        </div>
      </motion.div>
    </div>
  );
};

export default AmbientHalo;