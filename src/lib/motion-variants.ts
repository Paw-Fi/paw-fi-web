/**
 * Framer Motion animation variants for the Moneko application
 * These variants define reusable animations that can be applied to components
 */

import { Variants } from 'framer-motion';

// Fade in from bottom animation (used for cards, sections)
export const fadeInUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.95
  },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      bounce: 0.4,
      duration: 0.7,
      delay: custom,
    }
  })
};

// Fade in from top animation (used for titles)
export const fadeInDown: Variants = {
  hidden: { 
    opacity: 0, 
    y: -30 
  },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      bounce: 0.3,
      duration: 0.8,
      delay: custom,
    }
  })
};

// Fade in from left animation (used for steps)
export const fadeInLeft: Variants = {
  hidden: { 
    opacity: 0, 
    x: -30 
  },
  visible: (custom = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      bounce: 0.3,
      duration: 0.5,
      delay: custom,
    }
  })
};

// Scale up animation (used for images)
export const scaleUp: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8 
  },
  visible: (custom = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      bounce: 0.4,
      duration: 0.8,
      delay: custom,
    }
  })
};

// Elastic animation (used for the cat icon)
export const elasticScale: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    rotate: -10
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      bounce: 0.5,
      duration: 1
    }
  },
  floating: {
    y: [0, 15, 0],
    transition: {
      y: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }
};

// Container variant for staggered children animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
};

// Simple fade in animation (used for containers)
export const fadeIn: Variants = {
  hidden: { 
    opacity: 0
  },
  visible: (custom = 0) => ({
    opacity: 1,
    transition: {
      duration: 0.6,
      delay: custom,
      ease: 'easeOut'
    }
  })
};

// Floating animation (used for images)
export const floatAnimation: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.9,
    y: 20
  },
  visible: (custom = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay: custom,
      ease: 'easeOut'
    }
  }),
  animate: {
    y: [0, -15, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut'
    }
  }
};
