"use client";

import { BackgroundGradientAnimation } from "@/components/ui/shadcn-io/background-gradient-animation";
import { memo } from 'react';

/**
 * AmbientHalo component using BackgroundGradientAnimation.
 * Colors are defined in app.css and automatically support light/dark mode.
 */
const AmbientHalo = memo(() => {
  return (
    <BackgroundGradientAnimation
      size="80%"
      blendingValue="hard-light"
      interactive={false}
      containerClassName="fixed inset-0 z-0 pointer-events-none"
    />
  );
});

AmbientHalo.displayName = 'AmbientHalo';

export default AmbientHalo;
