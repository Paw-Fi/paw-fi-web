import React from "react";
import { BackgroundBeamsWithCollision } from "./background-beams-with-collision";

/**
 * Demo component showing how to use BackgroundBeamsWithCollision
 * This creates animated beams that collide and create shooting star effects
 * Similar to the visual effects used on Uninbox.com
 */
export function BackgroundBeamsWithCollisionDemo() {
  return (
    <BackgroundBeamsWithCollision>
      <h2 className="text-2xl relative z-20 md:text-4xl lg:text-7xl font-bold text-center text-black dark:text-white font-sans tracking-tight">
        What&apos;s cooler than Beams?{" "}
        <div className="relative mx-auto inline-block w-max [filter:drop-shadow(0px_1px_3px_rgba(27,_37,_80,_0.14))]">
          <div className="absolute left-0 top-[1px] bg-clip-text bg-no-repeat text-transparent bg-gradient-to-r py-4 from-purple-500 via-violet-500 to-pink-500 [text-shadow:0_0_rgba(0,0,0,0.1)]">
            <span className="">Exploding beams.</span>
          </div>
          <div className="relative bg-clip-text text-transparent bg-no-repeat bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500 py-4">
            <span className="">Exploding beams.</span>
          </div>
        </div>
      </h2>
    </BackgroundBeamsWithCollision>
  );
}

/**
 * Simple usage example with custom styling
 */
export function SimpleBeamsExample() {
  return (
    <BackgroundBeamsWithCollision className="h-screen">
      <div className="relative z-20 max-w-2xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-black dark:text-white mb-4">
          Beautiful Animations
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Watch the beams collide and create spectacular effects
        </p>
      </div>
    </BackgroundBeamsWithCollision>
  );
}