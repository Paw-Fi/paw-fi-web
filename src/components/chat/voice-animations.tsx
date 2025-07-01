import React from 'react';
import { motion, Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faStop, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

// --- Listening Animation ---
const soundWaveVariants: Variants = {
  animate: (i: number) => ({
    scaleY: [1, 1.5, 1, 0.8, 1.2, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      delay: i * 0.1,
      ease: 'easeInOut',
    },
  }),
};

export function ListeningAnimation() {
  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="flex items-end h-16 space-x-2">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={soundWaveVariants}
            animate="animate"
            className="w-3 h-8 bg-violet-500 rounded-full"
          />
        ))}
      </div>
      <p className="text-lg text-slate-100">Listening...</p>
      
    </div>
  );
}

// --- Thinking Animation ---
const orbVariants: Variants = {
  initial: { y: 0, scale: 0.8, opacity: 0.5 },
  animate: (i: number) => ({
    y: [0, -20, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      delay: i * 0.2,
      ease: 'easeInOut',
    },
  }),
};

export function ThinkingAnimation() {
  return (
    <div className="flex flex-col items-center space-y-6">
        <div className="flex items-center justify-center h-16 space-x-3">
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    custom={i}
                    variants={orbVariants}
                    animate="animate"
                    className="w-4 h-4 bg-violet-500 rounded-full"
                />
            ))}
        </div>
        <p className="text-lg text-slate-100">Thinking...</p>
    </div>
  );
}

// --- Speaking Animation ---
const speakingWaveVariants: Variants = {
    animate: (i: number) => ({
      scaleY: [1, 1.8, 1, 0.6, 1.4, 1],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        delay: i * 0.15,
        ease: 'backInOut',
      },
    }),
  };
  
export function SpeakingAnimation() {
    return (
        <div className="flex flex-col items-center space-y-6">
            <div className="flex items-end h-16 space-x-2.5">
            {[...Array(7)].map((_, i) => (
                <motion.div
                key={i}
                custom={i}
                variants={speakingWaveVariants}
                animate="animate"
                className="w-2.5 bg-violet-500 rounded-full"
                style={{ height: `${10 + (i % 2) * 15}px` }}
                />
            ))}
            </div>
            <p className="text-lg text-slate-100">...</p>
        </div>
    );
}

// --- Idle Animation ---
export function IdleAnimation({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center space-y-6">
      <p className="text-lg text-center text-slate-100">Ready to listen.</p>
      <motion.button
        onClick={onStart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full text-white shadow-lg shadow-violet-500/30"
        aria-label="Start recording"
      >
        <FontAwesomeIcon icon={faMicrophone} size="2x" />
      </motion.button>
    </div>
  );
}

// --- Error Animation ---
export function ErrorAnimation({ message }: { message: string }) {
    return (
      <div className="flex flex-col items-center space-y-4 text-center">
        <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="text-red-500" />
        <h3 className="text-xl font-bold text-white">Oops!</h3>
        <p className="text-slate-200">{message}</p>
      </div>
    );
  }
