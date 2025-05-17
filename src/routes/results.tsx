"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import {useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import piggyIcon from "@/assets/images/piggy.svg";
import lightbulbIcon from "@/assets/images/lightbulb.svg";
import bookIcon from "@/assets/images/book.svg";
import increaseIcon from "@/assets/images/increase.svg";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/results")({
  component: Results,
});

// Define the structure for feature cards
interface FeatureCard {
  id: string;
  title: string;
  description: string;
  bgColor: string;
  icon: string;
  alt: string;
}

// Feature card data
const featureCards: FeatureCard[] = [
  {
    id: "saving",
    title: "Goal-Based Saving",
    description:
      "Create savings goals and track your progress with playful milestones.",
    bgColor: "bg-purple-100",
    icon: piggyIcon,
    alt: "Piggy",
  },
  {
    id: "suggestions",
    title: "Smart Suggestions",
    description:
      "Get personalized tips to improve your financial habits, tailored to your needs.",
    bgColor: "bg-green-100",
    icon: lightbulbIcon,
    alt: "Lightbulb",
  },
  {
    id: "learning",
    title: "Learn Your Way",
    description:
      "Access bite-sized financial lessons that make money management fun.",
    bgColor: "bg-blue-100",
    icon: bookIcon,
    alt: "Book",
  },
  {
    id: "progress",
    title: "Motivational Progress",
    description:
      "Watch your progress with encouraging visual trackers and celebrations.",
    bgColor: "bg-yellow-100",
    icon: increaseIcon,
    alt: "Increase",
  },
];

function Results() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Animate results content using GSAP
  useGSAP(
    () => {
      // Animate header and description with a fade-in effect
      if (resultsRef.current) {
        const header = resultsRef.current.querySelector(".results-header");
        const description = resultsRef.current.querySelector(
          ".results-description",
        );

        gsap.fromTo(
          [header, description],
          { opacity: 0, y: -20 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.2, ease: "power2.out" },
        );
      }

      // Animate feature cards with a staggered entrance
      if (cardsRef.current) {
        const cards = cardsRef.current.querySelectorAll(".feature-card");

        gsap.fromTo(
          cards,
          { opacity: 0, y: 30, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: "back.out(1.2)",
            delay: 0.3,
          },
        );
      }
    },
    { scope: resultsRef },
  );

  return (
    <div
      ref={resultsRef}
      className="bg-background flex min-h-screen flex-col [view-transition-name:main-content]"
    >
      <div className="m-auto max-h-[95vh] max-w-md w-[95vw] lg:min-w-[40rem] overflow-hidden rounded-3xl bg-white p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="results-header mb-2 text-2xl font-bold">
            Your Plan is Ready!
          </h1>
          <p className="results-description mx-auto max-w-xl text-base text-gray-600">
            Based on your answers, we've crafted a personalized financial plan
            to help you achieve your goals.
          </p>
        </div>

        {/* Features grid */}
        <div
          ref={cardsRef}
          className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {featureCards.map((card) => (
            <div
              key={card.id}
              className={`${card.bgColor} feature-card rounded-xl p-6`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white">
                <img src={card.icon} alt={card.alt} className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-semibold">{card.title}</h3>
              <p className="text-sm text-gray-600">{card.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link to="/learning" viewTransition={{ types: ["slide-left"] }}>
            <Button>Start Learning Now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
