"use client";

import { useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
// Using Link directly with viewTransition prop instead of Button component
import catIcon from "../assets/images/ani_transparent.gif";
import { Typewriter } from "../components/animations/typewriter";
import waveBackground from "../assets/images/wave.svg";

export const Route = createFileRoute("/intro")({
  component: IntroPage,
});

function IntroPage() {
  const [showContent, setShowContent] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);

  const catIconRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const secondParagraphRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Cat animation effect using useGSAP hook
  useGSAP(
    () => {
      if (!catIconRef.current) return;

      // Animate the cat with a little bounce
      gsap.to(catIconRef.current, {
        y: -10,
        duration: 1.5,
        ease: "power1.inOut",
        repeat: -1,
        yoyo: true,
      });
    },
    { scope: catIconRef },
  );

  // Animate content elements when they appear
  useGSAP(
    () => {
      if (showContent && contentRef.current) {
        const items = contentRef.current.querySelectorAll(".animate-item");
        if (items.length === 0) return;

        gsap.fromTo(
          items,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.15,
            ease: "power2.out",
          },
        );
      }
    },
    {
      dependencies: [showContent],
      scope: contentRef,
    },
  );

  // Animate second paragraph when it appears
  useGSAP(
    () => {
      if (typingComplete && secondParagraphRef.current) {
        // Animate the second paragraph after typewriter finishes
        gsap.fromTo(
          secondParagraphRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
        );
      }
    },
    { dependencies: [typingComplete], scope: secondParagraphRef },
  );

  // Handle button animation when it appears
  useGSAP(
    () => {
      if (showButton && buttonRef.current) {
        gsap.fromTo(
          buttonRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" },
        );
      }
    },
    {
      dependencies: [showButton],
      scope: buttonRef,
    },
  );

  // Using direct Link components with viewTransition prop

  return (
    <div className="bg-background flex flex-1 items-center justify-center">
      <div
        className="relative flex w-full max-w-[90vw] lg:max-w-md flex-col gap-4 overflow-hidden rounded-3xl bg-white  shadow-lg lg:min-h-[33rem] min-h-[34rem]"
      >
        <img src={waveBackground} alt="Wave Background" className="absolute top-0 left-0 w-full" />
       <div className="absolute top-0 left-0 w-full h-full px-4 py-6 flex items-center justify-center flex-col">
        {/* Title animation */}
        <h1 className="animate-item mb-4 text-center text-2xl font-bold text-gray-800">
          Welcome to PawFi!
        </h1>

        {/* Animated Cat icon */}
        <div className="mb-4 flex justify-center">
          <img
            ref={catIconRef}
            src={catIcon}
            alt="PawFi Cat"
            className="h-36"
            onLoad={() => setShowContent(true)}
          />
        </div>

        {/* Introduction text with typewriter effect */}
        {showContent && (
          <div
            ref={contentRef}
            className="mb-6 text-center text-sm text-gray-700 md:text-base mt-6"
          >
            <Typewriter
              text="I'm PawFi, your personal finance guide! I'm here to help you save and invest toward your life goals. "
              duration={2}
              className="mb-2"
              onComplete={() => {
                setTypingComplete(true);
              }}
            />

            {typingComplete && (
              <Typewriter
                text="Let's create a personalized plan that fits
                your needs and goals. Ready to start your financial journey?"
                duration={2}
                className="mb-2"
                onComplete={() => {
                  setShowButton(true);
                }}
              />
            )}
          </div>
        )}

        {/* Get started button */}
        {showButton && (
          <div ref={buttonRef} className="flex justify-center">
            <Link
              to="/chat"
              viewTransition={{ types: ["slide-left"] }}
              className="inline-block rounded-lg bg-[#1b1b1b] px-6 py-3 text-center font-medium text-white hover:opacity-90"
            >
              Let's get started!
            </Link>
          </div>
        )}
       </div>
      </div>
    </div>
  );
}
