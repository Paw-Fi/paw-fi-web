'use client';

import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  overlayClassName?: string;
  contentClassName?: string;
  disableOverlayClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  disableOverlayClick = false,
  overlayClassName = 'bg-overlay',
  contentClassName = 'mx-auto max-w-md flex flex-col rounded-3xl bg-white p-8'
}: ModalProps) {
  // Define animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' }
    }
  };
  
  const contentVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.4, 
        ease: [0.175, 0.885, 0.32, 1.275] // Equivalent to GSAP's back.out(1.7)
      }
    },
    exit: { 
      opacity: 0, 
      y: 20, 
      scale: 0.9,
      transition: { duration: 0.2, ease: 'easeIn' }
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div 
            className={`absolute inset-0 ${overlayClassName}`}
            onClick={!disableOverlayClick ? onClose : undefined}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
          />

          {/* Modal content */}
          <motion.div
            className={classNames(`relative p-6`, contentClassName)}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={contentVariants}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
