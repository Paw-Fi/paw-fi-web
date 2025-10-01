"use client";

import { createFileRoute } from "@tanstack/react-router";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";

export const Route = createFileRoute("/test-beams")({
  component: TestBeams,
});

function TestBeams() {
  return (
    <div className="relative min-h-screen w-full bg-moneko-background dark:bg-dark-background">
      <BackgroundBeamsWithCollision className="absolute inset-0">
        <div />
      </BackgroundBeamsWithCollision>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 space-y-8">
        <h1 className="text-4xl font-bold text-moneko-text dark:text-dark-text">
          Test: BackgroundBeamsWithCollision Component
        </h1>

        <div className="max-w-2xl space-y-4 text-center">
          <p className="text-lg text-moneko-text-secondary dark:text-dark-text-secondary">
            This is a test page with BackgroundBeamsWithCollision (same as early-access).
          </p>
          <p className="text-lg text-moneko-text-secondary dark:text-dark-text-secondary">
            Testing on iOS Safari for comparison with AmbientHalo performance.
          </p>
        </div>

        {/* Add same scrollable content */}
        <div className="grid grid-cols-1 gap-8 mt-16 max-w-4xl">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="p-8 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur-sm"
            >
              <h2 className="text-2xl font-semibold mb-4 text-moneko-text dark:text-dark-text">
                Section {i}
              </h2>
              <p className="text-moneko-text-secondary dark:text-dark-text-secondary">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 p-6 bg-blue-500/20 rounded-lg border-2 border-blue-500">
          <p className="text-lg font-semibold text-blue-400">
            ℹ️ Compare this with /test-ambient to see which background effect performs better
          </p>
        </div>
      </div>
    </div>
  );
}
