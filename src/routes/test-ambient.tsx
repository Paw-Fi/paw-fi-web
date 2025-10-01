"use client";

import { createFileRoute } from "@tanstack/react-router";
import AmbientHalo from "@/components/ui/ambient-halo";

export const Route = createFileRoute("/test-ambient")({
  component: TestAmbient,
});

function TestAmbient() {
  return (
    <div className="relative min-h-screen w-full bg-moneko-background dark:bg-dark-background">
      <AmbientHalo />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 space-y-8">
        <h1 className="text-4xl font-bold text-moneko-text dark:text-dark-text">
          Test: AmbientHalo Component Only
        </h1>

        <div className="max-w-2xl space-y-4 text-center">
          <p className="text-lg text-moneko-text-secondary dark:text-dark-text-secondary">
            This is a minimal test page with ONLY the AmbientHalo component.
          </p>
          <p className="text-lg text-moneko-text-secondary dark:text-dark-text-secondary">
            Testing on iOS Safari to see if AmbientHalo alone causes slow rendering.
          </p>
        </div>

        {/* Add some scrollable content */}
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

        <div className="mt-16 p-6 bg-green-500/20 rounded-lg border-2 border-green-500">
          <p className="text-lg font-semibold text-green-400">
            ✓ If you can see this immediately and scroll smoothly, AmbientHalo is NOT the problem!
          </p>
        </div>
      </div>
    </div>
  );
}
