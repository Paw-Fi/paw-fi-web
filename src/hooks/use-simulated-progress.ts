// src/hooks/use-simulated-progress.ts
import { useState, useEffect, useRef } from 'react';

/**
 * A hook to simulate progress for an async operation.
 * It starts an interval when `isLoading` is true, updating progress
 * on a non-linear scale (atan function) to appear fast initially and
 * slow down as it nears 100%.
 *
 * @param isLoading - Boolean to start or stop the simulation.
 * @param durationInSeconds - The approximate time the simulation should take to reach ~99%.
 * @returns The current progress value (0-99).
 */
export const useSimulatedProgress = (isLoading: boolean, durationInSeconds: number = 15) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      let currentStep = 0;
      
      // We use the arctan function to create a curve that starts steep and flattens out.
      // To make it reach ~99% in the desired duration, we calculate a `step` value.
      // The value of `x` in `tan(x)` needs to be ~64 for `atan(x)` to approach 99% of its max value (PI/2).
      const targetStepValue = 64; 
      const totalTicks = durationInSeconds * 10; // 10 ticks per second (100ms interval)
      const stepIncrement = targetStepValue / totalTicks;

      intervalRef.current = setInterval(() => {
        currentStep += stepIncrement;
        const newProgress = Math.round((Math.atan(currentStep) / (Math.PI / 2)) * 100);
        
        // We cap the progress at 99 to ensure it only hits 100% on actual completion.
        setProgress(Math.min(newProgress, 99));
      }, 100);

    } else {
      // If loading is finished, clear the interval and reset progress.
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setProgress(0); // Reset for next time
    }

    // Cleanup function to clear interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoading, durationInSeconds]);

  return progress;
};