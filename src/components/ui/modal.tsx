"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  contentClassName?: string;
  width?: "standard" | "wide" | "xwide";
  fullHeight?: boolean;
  title?: string;
  description?: string;
  footer?: () => ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  children,
  contentClassName = "",
  fullHeight = false,
  title = "",
  description = "",
  footer,
  width = "standard"
}: ModalProps) {

  const widthClasses = {
    standard: "sm:max-w-lg",
    wide: "sm:max-w-2xl", 
    xwide: "sm:max-w-4xl"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "max-w-[90vw]",
          widthClasses[width],
          fullHeight && "h-[90vh] max-h-[90vh]",
          contentClassName
        )}
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        
        <div className={cn(
          "overflow-auto",
          fullHeight && "flex-1"
        )}>
          {children}
        </div>
        
        {footer && (
          <DialogFooter>
            {footer()}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
