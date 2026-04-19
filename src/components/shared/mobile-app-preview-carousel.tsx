"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

import { Carousel } from "@/components/ui/apple-cards-carousel";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { Iphone } from "@/components/ui/iphone";
import { cn } from "@/lib/utils";
import mockupVideo1 from "@assets/videos/mockups/1.mp4";
import mockupPoster1 from "@assets/videos/mockups/1.png";
import mockupVideo2 from "@assets/videos/mockups/2.mp4";
import mockupPoster2 from "@assets/videos/mockups/2.png";
import mockupVideo3 from "@assets/videos/mockups/3.mp4";
import mockupPoster3 from "@assets/videos/mockups/3.png";
import mockupVideo4 from "@assets/videos/mockups/4.mp4";
import mockupVideo5 from "@assets/videos/mockups/5.mp4";
import mockupPoster5 from "@assets/videos/mockups/5.png";
import mockupVideo6 from "@assets/videos/mockups/6.mp4";
import mockupPoster6 from "@assets/videos/mockups/6.png";
import mockupVideo7 from "@assets/videos/mockups/7.mp4";
import mockupPoster7 from "@assets/videos/mockups/7.png";
import mockupVideo8 from "@assets/videos/mockups/8.mp4";
import mockupPoster8 from "@assets/videos/mockups/8.png";

export interface MobileAppPreviewSlide {
  src: string;
  videoSrc?: string;
  title: string;
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
    src: mockupPoster1,
    videoSrc: mockupVideo1,
    title: "Track Expenses by Text",
  },
  {
    src: mockupPoster7,
    videoSrc: mockupVideo7,
    title: "Apple Pay Automation",
  },
  {
    src: mockupPoster8,
    videoSrc: mockupVideo8,
    title: "WhatsApp Integration",
  },
  {
    src: mockupPoster2,
    videoSrc: mockupVideo2,
    title: "Import Data in Seconds",
  },
  {
    src: mockupPoster3,
    videoSrc: mockupVideo3,
    title: "Split Expenses by Text",
  },
  {
    src: mockupPoster3,
    videoSrc: mockupVideo4,
    title: "Multi-Currency Support",
  },
  {
    src: mockupPoster5,
    videoSrc: mockupVideo5,
    title: "Envelope Budgeting",
  },
  {
    src: mockupPoster6,
    videoSrc: mockupVideo6,
    title: "Bank Sync for Transactions",
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
  showDownloadButtons = false,
  headerSlot,
  footerSlot,
}: MobileAppPreviewCarouselProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const activeIndices =
    slides.length === 0
      ? []
      : isDesktop
        ? [Math.max(0, carouselIndex - 1), carouselIndex]
        : [carouselIndex];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const updateIsDesktop = () => {
      setIsDesktop(mediaQuery.matches);
    };

    updateIsDesktop();
    mediaQuery.addEventListener("change", updateIsDesktop);

    return () => {
      mediaQuery.removeEventListener("change", updateIsDesktop);
    };
  }, []);

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
        <motion.div className="mb-16 text-left" variants={itemVariants}>
          {headerSlot}
          <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h2>

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
          onCurrentIndexChange={setCarouselIndex}
          items={slides.map((slide, index) => (
            <motion.div
              key={`${slide.title}-${index}`}
              className="relative flex w-[280px] flex-col items-center px-4 text-left sm:w-[340px]"
              variants={itemVariants}
            >
              <h3 className="text-foreground pt-4 pb-6 text-lg font-medium tracking-tight sm:text-2xl">
                {slide.title}
              </h3>
            </motion.div>
          ))}
          iphoneMockups={slides.map((slide, index) => (
            <motion.div
              key={`${slide.title}-phone-${index}`}
              className="flex h-[80%] w-full flex-1 items-end justify-center"
              variants={itemVariants}
            >
              <Iphone
                src={slide.src}
                showDynamicIsland={false}
                aria-label={
                  slide.alt ?? `${slide.title} in the Moneko mobile app`
                }
                className="h-full w-auto"
              >
                {slide.videoSrc ? (
                  <PreviewPhoneVideo
                    posterSrc={slide.src}
                    videoSrc={slide.videoSrc}
                    isActive={activeIndices.includes(index)}
                  />
                ) : null}
              </Iphone>
            </motion.div>
          ))}
        />
      </motion.div>
    </section>
  );
}

function PreviewPhoneVideo({
  posterSrc,
  videoSrc,
  isActive,
}: PreviewPhoneVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const playVideo = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const playPromise = video.play();

    if (playPromise !== undefined) {
      void playPromise.catch(() => {});
    }
  };

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!isActive) {
      video.pause();
      return;
    }

    playVideo();
  }, [isActive]);

  return (
    <video
      ref={videoRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
      src={videoSrc}
      poster={posterSrc}
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      onCanPlay={isActive ? playVideo : undefined}
    />
  );
}

interface PreviewPhoneVideoProps {
  posterSrc: string;
  videoSrc: string;
  isActive: boolean;
}
