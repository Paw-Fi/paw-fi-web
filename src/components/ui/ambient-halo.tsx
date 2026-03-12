"use client";

import { memo } from "react";
import { BackgroundBeams } from "./shadcn-io/background-beams";
import { useReducedVisualEffects } from "@/hooks/use-reduced-visual-effects";

/**
 * AmbientHalo component with a low-cost mobile/Safari fallback.
 */
const AmbientHalo = memo(() => {
  const reducedVisualEffects = useReducedVisualEffects();

  if (reducedVisualEffects) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.10),_transparent_40%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.08),_transparent_35%)]" />
    );
  }

  return (
    <BackgroundBeams className="pointer-events-none fixed inset-0 z-[1]" />
  );
});

AmbientHalo.displayName = "AmbientHalo";

export default AmbientHalo;
