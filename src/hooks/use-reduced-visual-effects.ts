import { useEffect, useState } from "react";

function detectReducedEffects() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }

  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const isCoarsePointer =
    window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
  const userAgent = navigator.userAgent;
  const isSafari =
    /Safari/i.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/i.test(userAgent);

  return prefersReducedMotion || isCoarsePointer || isSafari;
}

export function useReducedVisualEffects() {
  const [reducedEffects, setReducedEffects] = useState(true);

  useEffect(() => {
    setReducedEffects(detectReducedEffects());
  }, []);

  return reducedEffects;
}
