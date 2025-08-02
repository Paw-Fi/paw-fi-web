import { useState, useEffect } from "react";

// Animated Number Component - moved outside to prevent hooks violation
export function AnimatedNumber({ value, prefix = '', suffix = '', className = '', isAnimated }: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  className?: string;
  isAnimated: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (isAnimated) {
      const duration = 1000;
      const steps = 60;
      const stepValue = value / steps;
      let currentStep = 0;
      
      const timer = setInterval(() => {
        currentStep++;
        setDisplayValue(Math.round(stepValue * currentStep));
        
        if (currentStep >= steps) {
          setDisplayValue(value);
          clearInterval(timer);
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, isAnimated]);
  
  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}
