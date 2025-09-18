import AmbientHaloLazy from "@/components/ui/ambient-halo-lazy";
import { disableAnimationsOnMobile } from "@/utils/disable-framer-motion-mobile";
import { useEffect } from "react";

interface AmbientHaloLayoutProps {
  children: React.ReactNode;
}

export const AmbientHaloLayout = ({ children }: AmbientHaloLayoutProps) => {
  // Disable Framer Motion animations on mobile
  useEffect(() => {
    disableAnimationsOnMobile();
    
    // Listen for window resize to handle orientation changes
    const handleResize = () => {
      disableAnimationsOnMobile();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div className="relative h-full w-full flex-1 bg-background dark:bg-dark-background">
      <AmbientHaloLazy />
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};