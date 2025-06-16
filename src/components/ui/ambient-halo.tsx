"use client";

import React from 'react';
import { motion } from 'framer-motion';

/**
 * AmbientHalo component that creates a constantly animating, organic, jellyfish-like background effect.
 */
const AmbientHalo = () => {
  return (
    <div 
      className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none"
      style={{ backgroundColor: '#f7f5ff' }}
    >
      {/* Primary Ambient Halo */}
      <motion.div
        className="absolute inset-0"
        style={{ willChange: 'transform, opacity' }}
        animate={{
          x: [0, 80, -60, 120, -40, 0],
          y: [0, -100, 150, -80, 0],
          scale: [1, 1.05, 0.98, 1.02, 1],
          rotate: [0, 20, -15, 30, 0],
          opacity: [0.9, 1, 0.95, 0.9, 0.9],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          repeatType: "mirror",
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
        style={{ willChange: 'transform, opacity', zIndex: 0 }}
        animate={{
          x: [0, 50, -30, 10, 0],
          y: [0, -60, 40, -20, 0],
          scale: [1, 1.1, 0.9, 1.05, 1],
          rotate: [0, -10, 20, -5, 0],
          opacity: [0.7, 0.85, 0.75, 0.8, 0.7],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          repeatType: "mirror",
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
        style={{ willChange: 'transform, opacity', zIndex: 1 }}
        animate={{
          x: [0, -100, 60, -80, 40, 0],
          y: [0, 120, -90, 60, 0],
          scale: [1, 0.95, 1.08, 0.98, 1],
          rotate: [0, 40, -30, 50, 0],
          opacity: [0.95, 1, 0.98, 0.9, 0.95],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          repeatType: "mirror",
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
        style={{ willChange: 'transform, opacity' }}
        animate={{
          x: [0, -40, 20, -10, 0],
          y: [0, 80, -30, 50, 0],
          scale: [1, 1.03, 0.97, 1.05, 1],
          rotate: [0, -25, 10, -20, 0],
          opacity: [0.8, 0.95, 0.85, 0.9, 0.8],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          repeatType: "mirror",
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
