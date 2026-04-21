"use client";

import React from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import catCoin from "@/assets/images/icon.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faPlus,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { faX } from "@fortawesome/free-solid-svg-icons";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FaqSection } from "@/components/ui/faq-section";
import { MobileAppPreviewCarousel } from "@/components/shared/mobile-app-preview-carousel";
import faqData from "@/data/home/home-faq.json";
import type { HomePageVariant } from "@/components/index/reusable-home-page";

function LazyLottieAnimation({
  path,
  className = "w-3/4 h-3/4",
}: {
  path: string;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!shouldLoad || !containerRef.current) {
      return;
    }

    let isDisposed = false;
    let cleanupAnimation: (() => void) | undefined;

    void import("lottie-web").then(({ default: lottie }) => {
      if (isDisposed || !containerRef.current) {
        return;
      }

      const animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path,
      });

      setHasLoaded(true);
      cleanupAnimation = () => animation.destroy();
    });

    return () => {
      isDisposed = true;
      cleanupAnimation?.();
    };
  }, [path, shouldLoad]);

  return (
    <div className={`relative ${className}`}>
      {!hasLoaded && (
        <div className="bg-muted absolute inset-0 animate-pulse rounded-lg" />
      )}
      <div ref={containerRef} className="h-full w-full" aria-hidden="true" />
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  route,
}: {
  title: string;
  description: string;
  icon: string;
  route: string;
}) {
  return (
    <Card className="group border-border bg-card hover:bg-accent/50 h-full touch-manipulation transition-all duration-200 ease-out active:scale-[0.98]">
      <Link to={route} className="flex h-full flex-col">
        <CardHeader className="flex-grow space-y-4 p-4 sm:space-y-6 sm:p-6 md:p-8">
          <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-lg sm:h-14 sm:w-14 sm:rounded-xl">
            <span className="text-lg sm:text-xl md:text-2xl">{icon}</span>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <CardTitle className="text-card-foreground text-base leading-tight font-semibold sm:text-lg md:text-xl">
              {title}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="p-4 pt-0 sm:p-6 md:p-8">
          <div className="text-primary flex items-center text-sm font-medium transition-transform duration-200 group-hover:translate-x-1 sm:text-base">
            Get Started
            <FontAwesomeIcon
              icon={faArrowRight}
              className="ml-1.5 text-xs sm:ml-2 sm:text-sm"
              aria-hidden="true"
            />
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}

function LessonCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Card className="group border-border bg-card hover:bg-accent/50 h-full touch-manipulation transition-all duration-200 ease-out active:scale-[0.98]">
      <CardHeader className="flex-grow space-y-4 p-4 sm:space-y-6 sm:p-6 md:p-8">
        <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-lg sm:h-14 sm:w-14 sm:rounded-xl">
          <span className="text-lg sm:text-xl md:text-2xl">{icon}</span>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <CardTitle className="text-card-foreground text-base leading-tight font-semibold sm:text-lg md:text-xl">
            {title}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

export function ReusableHomePageDeferredContent({
  variant,
}: {
  variant: HomePageVariant;
}) {
  const [isVideoOpen, setIsVideoOpen] = React.useState(false);

  return (
    <>
      <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center sm:mb-10 md:mb-12">
            <motion.h2
              className="text-foreground mb-4 text-2xl leading-tight font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              {variant.videoSection.title}
            </motion.h2>
            <motion.p
              className="text-muted-foreground dark:text-moneko-foreground mx-auto max-w-3xl text-base leading-relaxed sm:text-lg md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {variant.videoSection.subtitle}
            </motion.p>
          </div>

          <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
            <DialogTrigger asChild>
              <motion.div
                className="group border-border relative cursor-pointer touch-manipulation overflow-hidden rounded-xl border sm:rounded-2xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative aspect-video w-full">
                  <img
                    className="h-full w-full object-cover"
                    src="/video-poster.webp"
                    alt={variant.videoSection.title}
                    width="800"
                    height="450"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/60 via-black/30 to-transparent">
                    <div className="max-w-2xl p-4 text-white sm:p-6 md:p-8 lg:p-12">
                      <h3 className="mb-3 text-lg leading-tight font-bold sm:mb-4 sm:text-xl md:text-2xl lg:text-3xl">
                        Personalized Financial Education & Planning
                      </h3>
                      <p className="mb-4 text-sm leading-relaxed text-white/90 sm:mb-6 sm:text-base md:text-lg lg:text-xl">
                        Watch how our AI analyzes your financial situation and
                        creates personalized budgeting strategies and investment
                        recommendations.
                      </p>
                      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 sm:gap-2 sm:text-base">
                        <FontAwesomeIcon
                          icon={faPlay}
                          className="text-xs sm:text-sm"
                        />
                        <span>Watch Demo</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-300 group-hover:opacity-100 group-active:opacity-100">
                    <div className="bg-moneko-background flex h-12 w-12 items-center justify-center rounded-full shadow-lg sm:h-14 sm:w-14 md:h-16 md:w-16">
                      <FontAwesomeIcon
                        icon={faPlay}
                        className="text-primary ml-0.5 text-sm sm:ml-1 sm:text-base md:text-lg"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-6xl border-none bg-black p-0">
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                <video
                  className="absolute inset-0 h-full w-full object-contain"
                  src={isVideoOpen ? "/Moneko-onboard%20.webm" : undefined}
                  poster="/video-poster.webp"
                  width="1920"
                  height="1080"
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="bg-muted/30 relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center sm:mb-12 md:mb-16">
            <motion.h2
              className="text-foreground mb-4 text-2xl leading-tight font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              AI-Powered Financial Tools & Learning Platform
            </motion.h2>
            <motion.p
              className="text-muted-foreground dark:text-moneko-foreground mx-auto max-w-3xl text-base leading-relaxed sm:text-lg md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Access comprehensive budgeting calculators, investment planning
              tools, and personalized financial education designed to accelerate
              your journey to financial independence.
            </motion.p>
          </div>

          <div className="mx-auto grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:w-2/3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="group border-border bg-card hover:border-primary/50 h-full touch-manipulation overflow-hidden transition-all duration-200 active:scale-[0.98]">
                <CardContent className="p-0">
                  <div className="from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 flex aspect-square items-center justify-center bg-gradient-to-br">
                    <LazyLottieAnimation
                      path="/animations/ai-chat.json"
                      className="h-3/4 w-3/4"
                    />
                  </div>
                  <div className="p-4 sm:p-6">
                    <CardTitle className="text-card-foreground mb-2 text-lg leading-tight font-semibold sm:mb-3 sm:text-xl">
                      24/7 Moneko AI Finance Coach
                    </CardTitle>
                    <CardDescription className="text-muted-foreground feature-summary text-sm leading-relaxed sm:text-base">
                      Ask budget questions, review spending patterns, and get
                      practical next steps from Moneko's AI finance coach.
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="group border-border bg-card hover:border-primary/50 h-full touch-manipulation overflow-hidden transition-all duration-200 active:scale-[0.98]">
                <CardContent className="p-0">
                  <div className="from-accent/20 to-secondary/20 dark:from-accent/10 dark:to-secondary/10 flex aspect-square items-center justify-center bg-gradient-to-br">
                    <LazyLottieAnimation
                      path="/animations/badge-unlock.json"
                      className="h-3/4 w-3/4"
                    />
                  </div>
                  <div className="p-4 sm:p-6">
                    <CardTitle className="text-card-foreground mb-2 text-lg leading-tight font-semibold sm:mb-3 sm:text-xl">
                      Smart Goal Tracking & Gamified Learning
                    </CardTitle>
                    <CardDescription className="text-muted-foreground feature-summary text-sm leading-relaxed sm:text-base">
                      Stay motivated with Moneko's achievement system, visual
                      goal tracking, and XP rewards as you build wealth and
                      achieve financial milestones through personalized learning
                      paths.
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center sm:mb-12 md:mb-16">
            <motion.h2
              className="text-foreground mb-4 text-2xl leading-tight font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Professional Financial Education Courses
            </motion.h2>
            <motion.p
              className="text-muted-foreground dark:text-moneko-foreground mx-auto max-w-3xl text-base leading-relaxed sm:text-lg md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Master the essential concepts and strategies for building
              sustainable passive income without complex trading or market
              timing.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-3">
            {variant.lessons.slice(0, 2).map((lesson, index) => (
              <motion.div
                key={lesson.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <LessonCard {...lesson} />
              </motion.div>
            ))}

            {variant.lessons.length > 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="group border-border bg-card hover:bg-accent/50 h-full touch-manipulation transition-all duration-200 active:scale-[0.98]">
                  <Link
                    to="/guides/how-to-calculate-net-worth"
                    className="flex h-full w-full flex-col items-center justify-center p-4 text-center sm:p-6 md:p-8"
                  >
                    <div className="bg-muted text-muted-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-lg sm:mb-6 sm:h-14 sm:w-14 sm:rounded-xl">
                      <FontAwesomeIcon
                        icon={faPlus}
                        className="text-lg sm:text-xl"
                      />
                    </div>
                    <CardTitle className="text-card-foreground mb-2 text-base leading-tight font-semibold sm:mb-3 sm:text-lg md:text-xl">
                      Explore All Lessons
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                      Browse practical guides and lessons to build your
                      financial fundamentals.
                    </CardDescription>
                  </Link>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h2
            className="text-foreground mb-8 text-2xl leading-tight font-bold sm:mb-12 sm:text-3xl md:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Why Choose Our Approach?
          </motion.h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {variant.benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                className="bg-moneko-background border-border rounded-lg border p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <p className="text-foreground font-medium">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-muted/30 relative z-10">
        <MobileAppPreviewCarousel
          title="Use Moneko while you build your money plan"
          description="Move from reading about passive income to tracking the spending, goals, and decisions that make the plan real."
        />
      </div>

      <div className="bg-muted/30 relative z-10">
        <FaqSection faqData={faqData} />
      </div>

      <footer className="border-border bg-card relative z-10 border-t px-4 py-12 sm:px-6 sm:py-14 md:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 md:gap-12 lg:grid-cols-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center">
                <OptimizedImage
                  src={catCoin}
                  alt="Moneko Logo"
                  className="h-6 w-6 sm:h-8 sm:w-8"
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
                />
                <span className="text-card-foreground ml-2 text-lg font-bold sm:text-xl">
                  Moneko
                </span>
              </div>
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed sm:text-base">
                <strong>Moneko</strong> helps you budget, track goals, and learn
                personal finance with guided tools.
              </p>
            </div>

            <div>
              <h3 className="text-card-foreground mb-4 text-xs font-semibold tracking-wider uppercase sm:mb-6 sm:text-sm">
                Quick Links
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <Link
                    to="/guides/how-to-calculate-net-worth"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    AI Financial Education
                  </Link>
                </li>
                <li>
                  <Link
                    to="/guides/how-to-calculate-net-worth"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Financial Planning Courses
                  </Link>
                </li>
                <li>
                  <Link
                    to="/calculators"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Budgeting & Investment Calculators
                  </Link>
                </li>
                <li>
                  <Link
                    to="/questions"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Ask a question
                  </Link>
                </li>
                <li>
                  <Link
                    to="/team"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Meet the Team
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-card-foreground mb-4 text-xs font-semibold tracking-wider uppercase sm:mb-6 sm:text-sm">
                Legal
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <Link
                    to="/privacy-policy"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms-of-service"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookie-policy"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-card-foreground mb-4 text-xs font-semibold tracking-wider uppercase sm:mb-6 sm:text-sm">
                Connect
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <a
                    href="https://www.facebook.com/monekoai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/moneko_ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@moneko.io"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-border mt-12 flex flex-col border-t pt-6 sm:mt-14 sm:pt-8 md:mt-16 md:flex-row md:items-center md:justify-between">
            <p className="text-muted-foreground mb-3 text-xs sm:mb-4 sm:text-sm md:mb-0">
              © 2026 Moneko. All rights reserved.
            </p>

            <div className="flex space-x-4 sm:space-x-6">
              <a
                href="https://www.facebook.com/monekoai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Moneko on Facebook"
                className="text-muted-foreground hover:text-primary touch-manipulation transition-colors active:scale-95"
              >
                <FontAwesomeIcon
                  icon={faFacebook}
                  className="h-4 w-4 sm:h-5 sm:w-5"
                />
              </a>
              <a
                href="https://x.com/moneko_ai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Moneko on X"
                className="text-muted-foreground hover:text-primary touch-manipulation transition-colors active:scale-95"
              >
                <FontAwesomeIcon icon={faX} className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
              <a
                href="https://www.instagram.com/moneko_ai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Moneko on Instagram"
                className="text-muted-foreground hover:text-primary touch-manipulation transition-colors active:scale-95"
              >
                <FontAwesomeIcon
                  icon={faInstagram}
                  className="h-4 w-4 sm:h-5 sm:w-5"
                />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
