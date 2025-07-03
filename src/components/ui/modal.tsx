"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import classNames from "classnames";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  overlayClassName?: string;
  contentClassName?: string;
  disableOverlayClick?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  fullHeight?: boolean;
  title?: string;
  description?: string;
  footer?: () => ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  children,
  disableOverlayClick = false,
  overlayClassName = "bg-black/50 backdrop-blur-sm",
  contentClassName = "",
  fullHeight = false,
  title = "",
  description = "",
  footer,
}: ModalProps) {
  // Lock body scroll when modal is open
  useLockBodyScroll(isOpen);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Animation variants
  const overlayVariants: Variants = {
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

  const contentVariants: Variants = {
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
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.07,
      },
    },
    exit: {
      opacity: 0,
      y: 20,
      scale: 0.98,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
  };

  return (
   createPortal( <AnimatePresence>
    {isOpen && (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-30 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          className={classNames(
            "fixed inset-0 z-50 flex-1 flex-col",
            overlayClassName,
          )}
          onClick={!disableOverlayClick ? onClose : undefined}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          aria-hidden="true"
        />

        {/* Modal content */}
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={contentVariants}
          onClick={(e) => e.stopPropagation()}
          role="document"
          className={classNames(
            "relative z-50 flex w-[90vw] flex-col items-center justify-center overflow-hidden rounded-2xl bg-white px-6 py-4 shadow-2xl lg:w-[40rem]",
            fullHeight ? "h-[90vh]" : "max-h-[90vh]",
            contentClassName,
          )}
        >
          <div className="flex w-full justify-start pb-2 border-b border-gray-300/50 mb-2">
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>

          <div className="flex-1 overflow-scroll w-full">{children}</div>
          <div className="flex w-full justify-end border-t border-gray-300/50 pt-4 dark:border-slate-700/50">
            {footer && footer()}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>, document.body)
  );
}
