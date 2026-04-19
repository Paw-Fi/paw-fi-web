"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

import { Carousel } from "@/components/ui/apple-cards-carousel";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { cn } from "@/lib/utils";
import phone1 from "@assets/images/couple-budgeting/1.png";
import phone2 from "@assets/images/couple-budgeting/2.png";
import phone3 from "@assets/images/couple-budgeting/3.png";
import phone4 from "@assets/images/couple-budgeting/4.png";
import phone5 from "@assets/images/couple-budgeting/5.png";

export interface MobileAppPreviewSlide {
  src: string;
  title: string;
  description: string;
  alt?: string;
}

interface MobileAppPreviewCarouselProps {
  title?: string;
  description?: string;
  slides?: MobileAppPreviewSlide[];
  className?: string;
  contentClassName?: string;
  carouselClassName?: string;
  showDownloadButtons?: boolean;
  headerSlot?: ReactNode;
  footerSlot?: ReactNode;
}

export const defaultMobileAppPreviewSlides: MobileAppPreviewSlide[] = [
  {
    src: phone1,
    title: "Link accounts, view, and manage together",
    description:
      "Log groceries, bills, and everyday spending so everyone stays aligned.",
  },
  {
    src: phone2,
    title: "Add expenses, split bills fast and fair",
    description:
      "Capture shared spending quickly and keep totals clear before settling up.",
  },
  {
    src: phone3,
    title: "Get notified, confirm, and stay aligned",
    description:
      "Review important budget updates before they become part of your plan.",
  },
  {
    src: phone4,
    title: "Set goals, track, and celebrate progress",
    description:
      "Plan bigger purchases and watch shared savings move in the right direction.",
  },
  {
    src: phone5,
    title: "Scan receipts in WhatsApp, log automatically",
    description:
      "Turn receipts and chat messages into organized budget entries with AI.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export function MobileAppPreviewCarousel({
  title = "See Moneko working on your phone",
  description = "Preview the mobile workflows that help you capture spending, review AI entries, and keep your budget current.",
  slides = defaultMobileAppPreviewSlides,
  className,
  contentClassName,
  carouselClassName,
  showDownloadButtons = true,
  headerSlot,
  footerSlot,
}: MobileAppPreviewCarouselProps) {
  return (
    <section
      className={cn(
        "relative z-10 overflow-hidden px-4 py-20 sm:px-6 lg:px-8",
        className,
      )}
    >
      <motion.div
        className={cn(
          "mx-auto flex max-w-7xl flex-col items-center",
          contentClassName,
        )}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        <motion.div className="mb-16 text-center" variants={itemVariants}>
          {headerSlot}
          <h2 className="text-foreground mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
            {description}
          </p>
          {showDownloadButtons && (
            <div className="mt-6 mb-4 flex flex-col justify-center gap-3 sm:flex-row">
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </div>
          )}
          {footerSlot}
        </motion.div>

        <Carousel
          className={cn(
            "h-[540px] md:h-[620px] lg:h-[600px] xl:h-[600px] 2xl:h-[700px]",
            carouselClassName,
          )}
          items={slides.map((slide, index) => (
            <motion.div
              key={`${slide.title}-${index}`}
              className="relative flex w-[280px] flex-col items-center px-4 text-center sm:w-[340px]"
              variants={itemVariants}
            >
              <h3 className="text-foreground -translate-y-8 text-lg font-semibold">
                {slide.title}
              </h3>
              <p className="text-muted-foreground -translate-y-5 text-sm leading-relaxed">
                {slide.description}
              </p>
            </motion.div>
          ))}
          iphoneMockups={slides.map((slide, index) => (
            <motion.div
              key={`${slide.title}-phone-${index}`}
              className="flex h-[78%] w-full items-end justify-center"
              variants={itemVariants}
            >
              <img
                src={slide.src}
                alt={slide.alt ?? `${slide.title} in the Moneko mobile app`}
                className="h-full w-auto"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          ))}
        />
      </motion.div>
    </section>
  );
}
