'use client';

import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  overlayClassName?: string;
  contentClassName?: string;
  disableOverlayClick?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  fullHeight?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  disableOverlayClick = false,
  overlayClassName = 'bg-black/50 backdrop-blur-sm',
  contentClassName = '',
  maxWidth = '2xl',
  fullHeight = false,
}: ModalProps) {
  // Lock body scroll when modal is open
  useLockBodyScroll(isOpen);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.15,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: { 
      opacity: 0,
      transition: { 
        duration: 0.1,
        ease: [0.4, 0, 1, 1],
      },
    },
  };
  
  const contentVariants = {
    hidden: { 
      opacity: 0, 
      y: 20, 
      scale: 0.98,
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.25, 
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: { 
      opacity: 0, 
      y: 20, 
      scale: 0.98,
      transition: { 
        duration: 0.15, 
        ease: [0.4, 0, 1, 1],
      },
    },
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full',
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          role="dialog" 
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div 
            className={cn(
              'fixed inset-0',
              overlayClassName
            )}
            onClick={!disableOverlayClick ? onClose : undefined}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
            aria-hidden="true"
          />

          {/* Modal content */}
          <div className="flex items-center justify-center min-h-full w-full">
            <motion.div
              className={cn(
                'relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden',
                'flex flex-col max-h-[90vh]',
                maxWidthClasses[maxWidth],
                fullHeight ? 'h-[90vh]' : 'max-h-[90vh]',
                contentClassName
              )}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={contentVariants}
              onClick={(e) => e.stopPropagation()}
              role="document"
            >
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
