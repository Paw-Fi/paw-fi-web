"use client";

import { BackgroundGradientAnimation } from "@/components/ui/shadcn-io/background-gradient-animation";
import { memo } from 'react';
import { BackgroundBeams } from "./shadcn-io/background-beams";

/**
 * AmbientHalo component using BackgroundGradientAnimation.
 * Colors are defined in app.css and automatically support light/dark mode.
 */
const AmbientHalo = memo(() => {
  return (
    <BackgroundBeams className="fixed inset-0 z-[1] pointer-events-none"/>
  );
});

AmbientHalo.displayName = 'AmbientHalo';

export default AmbientHalo;
