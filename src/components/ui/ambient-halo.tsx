"use client";

import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

/**
 * AmbientHalo component that creates an organic, jellyfish-like background effect
 * with spring-based animations that respond to scroll position
 */
const AmbientHalo = () => {
  const { scrollY, scrollYProgress } = useScroll();
  
  // Enhanced spring configuration for more organic movement
  const springConfig = { 
    stiffness: 60, // Increased for performance
    damping: 20,   // Adjusted for performance
    mass: 1.2      // Reduced for performance
  };
  
  // Primary halo movements - jellyfish-like drift
  // Combine scroll-based and continuous animation
  const haloX = useSpring(
    useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, 80, -60, 120, -40]),
    springConfig
  );
  
  const haloY = useSpring(
    useTransform(scrollYProgress, [0, 0.3, 0.6, 1], [0, -100, 150, -80]),
    springConfig
  );
  
  // Secondary halo with different movement pattern
  const halo2X = useSpring(
    useTransform(scrollYProgress, [0, 0.2, 0.4, 0.7, 1], [0, -100, 60, -80, 40]),
    springConfig
  );
  
  const halo2Y = useSpring(
    useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [0, 120, -90, 60]),
    springConfig
  );
  
  // Enhanced scaling effects for more visible pulsing
  const haloScale = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.25, 0.95]),
    springConfig
  );
  
  const halo2Scale = useSpring(
    useTransform(scrollYProgress, [0, 0.4, 0.8, 1], [1, 0.85, 1.35, 1.15]),
    springConfig
  );
  
  // Enhanced rotation for more organic feel
  const haloRotate = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 180]), // Reduced rotation range
    { stiffness: 35, damping: 25 } // Adjusted for performance
  );
  
  // Opacity variations for depth - increased for stronger effect
  const haloOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.9, 1.0, 0.9, 0.8]);
  const halo2Opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.85, 0.95, 0.8, 0.9]);

  // Tertiary halo movements
  const halo3X = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], [0, -40, 20]),
    springConfig
  );
  
  const halo3Y = useSpring(
    useTransform(scrollYProgress, [0, 0.8, 1], [0, 80, -30]),
    springConfig
  );
  
  const halo3Scale = useSpring(
    useTransform(scrollYProgress, [0, 0.6, 1], [1, 1.15, 0.95]),
    springConfig
  );
  
  const halo3Opacity = useTransform(scrollYProgress, [0, 0.4, 1], [0.75, 0.85, 0.65]);
  
  // Mint green halo movements
  const halo4X = useSpring(
    useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 50, -30, 10]),
    springConfig
  );
  
  const halo4Y = useSpring(
    useTransform(scrollYProgress, [0, 0.4, 0.9, 1], [0, -60, 40, -20]),
    springConfig
  );
  
  const halo4Scale = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 0.8, 1], [1, 1.1, 0.9, 1.05]),
    springConfig
  );
  
  const halo4Opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.7, 0.8, 0.75, 0.65]);

  return (
    <div 
      className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none"
      style={{ backgroundColor: '#f7f5ff' }}
    >
      {/* Primary Ambient Halo */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: haloX,
          y: haloY,
          scale: haloScale,
          rotate: haloRotate,
          opacity: haloOpacity,
          willChange: 'transform, opacity',
        }}
        animate={{
          scale: [1, 1.05, 0.98, 1],
          opacity: [0.9, 1, 0.95, 0.9],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div 
            className="w-[900px] h-[900px] rounded-full blur-3xl" 
            style={{ 
              background: 'radial-gradient(circle, rgba(245, 225, 250, 0.9) 0%, rgba(245, 225, 250, 0.85) 50%, rgba(247, 245, 255, 0.5) 80%, rgba(247, 245, 255, 0) 100%)'
            }} 
          />
          <div 
            className="absolute inset-8 w-[550px] h-[550px] rounded-full blur-2xl" 
            style={{ 
              background: 'radial-gradient(circle, rgba(245, 225, 250, 0.9) 0%, rgba(245, 225, 250, 0.8) 50%, rgba(215, 217, 252, 0.6) 80%, rgba(215, 217, 252, 0) 100%)'
            }} 
          />
        </div>
      </motion.div>

      {/* Mint Green Halo (beneath blue) */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: halo4X,
          y: halo4Y,
          scale: halo4Scale,
          rotate: useTransform(haloRotate, (r) => r * 0.4),
          opacity: halo4Opacity,
          willChange: 'transform, opacity',
          zIndex: 0,
        }}
        animate={{
          scale: [1, 1.05, 0.97, 1],
          opacity: [0.7, 0.85, 0.75, 0.7],
        }}
        transition={{
          duration: 17,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
          delay: 1.5,
        }}
      >
        <div className="absolute top-1/3 left-2/3 transform -translate-x-1/2 -translate-y-1/3">
          <div 
            className="w-[750px] h-[750px] rounded-full blur-3xl" 
            style={{ 
              background: 'radial-gradient(circle, rgba(190, 252, 190, 0.8) 0%, rgba(180, 235, 210, 0.75) 40%, rgba(190, 252, 190, 0.5) 70%, rgba(190, 252, 190, 0) 100%)'
            }} 
          />
          <div 
            className="absolute inset-8 w-[500px] h-[500px] rounded-full blur-2xl" 
            style={{ 
              background: 'radial-gradient(circle, rgba(180, 235, 210, 0.9) 0%, rgba(190, 252, 190, 0.8) 50%, rgba(180, 235, 210, 0.6) 85%, rgba(180, 235, 210, 0) 100%)'
            }} 
          />
        </div>
      </motion.div>
      
      {/* Secondary Ambient Halo (blue) */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: halo2X,
          y: halo2Y,
          scale: halo2Scale,
          rotate: useTransform(haloRotate, (r) => -r * 0.7),
          opacity: halo2Opacity,
          willChange: 'transform, opacity',
          zIndex: 1,
        }}
        animate={{
          scale: [1, 0.95, 1.08, 1],
          opacity: [0.95, 1, 0.98, 0.95],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
          delay: 2,
        }}
      >
        <div className="absolute top-1/3 left-2/3 transform -translate-x-1/2 -translate-y-1/2">
          <div 
            className="w-[700px] h-[700px] rounded-full blur-3xl" 
            style={{ 
              background: 'radial-gradient(circle, rgba(225, 245, 255, 0.85) 0%, rgba(200, 235, 255, 0.8) 40%, rgba(225, 245, 255, 0.65) 70%, rgba(225, 245, 255, 0) 100%)'
            }} 
          />
          <div 
            className="absolute inset-8 w-[450px] h-[450px] rounded-full blur-2xl" 
            style={{ 
              background: 'radial-gradient(circle, rgba(200, 240, 255, 0.85) 0%, rgba(190, 230, 255, 0.8) 50%, rgba(200, 240, 255, 0.55) 85%, rgba(200, 240, 255, 0) 100%)' // Even lighter blue
            }} 
          />
        </div>
      </motion.div>

      {/* Tertiary Ambient Halo */}
      <motion.div
        className="absolute inset-0"
        style={{
          x: halo3X,
          y: halo3Y,
          scale: halo3Scale,
          rotate: useTransform(haloRotate, (r) => r * 0.5),
          opacity: halo3Opacity,
          willChange: 'transform, opacity',
        }}
        animate={{
          scale: [1, 1.03, 0.97, 1],
          opacity: [0.8, 0.95, 0.85, 0.8],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
          delay: 1,
        }}
      >
        <div className="absolute top-2/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
          <div 
            className="w-[750px] h-[750px] rounded-full blur-3xl" 
            style={{ 
              background: 'radial-gradient(circle, rgba(215, 217, 252, 0.8) 0%, rgba(245, 225, 250, 0.7) 40%, rgba(215, 217, 252, 0.5) 70%, rgba(215, 217, 252, 0) 100%)'
            }} 
          />
          <div 
            className="absolute inset-8 w-[500px] h-[500px] rounded-full blur-2xl" 
            style={{ 
              background: 'radial-gradient(circle, rgba(215, 217, 252, 0.9) 0%, rgba(245, 225, 250, 0.8) 50%, rgba(215, 217, 252, 0.6) 85%, rgba(215, 217, 252, 0) 100%)'
            }} 
          />
        </div>
      </motion.div>
    </div>
  );
};

export default AmbientHalo;
