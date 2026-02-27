import { ReactNode, useState, MouseEvent } from "react";
import { ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 lg:grid-cols-2 gap-0 auto-rows-fr",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  component,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className: string;
  component: ReactNode;
  Icon: any;
  description: string;
  href: string;
  cta: string;
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (event: MouseEvent<HTMLAnchorElement>) => {
    const { clientX, clientY, currentTarget } = event;
    const { left, top } = currentTarget.getBoundingClientRect();
    setMousePosition({ x: clientX - left, y: clientY - top });
  };

  return (
    <Link
      to={href}
      className={cn(
        "group relative overflow-hidden flex flex-col min-h-[300px] bg-card transition-all duration-300 border-r border-b border-border last:border-r-0 [&:nth-child(2)]:border-r-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0 cursor-pointer",
        className,
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Component Content - Full Height */}
      <div className="w-full h-full pointer-events-none">
        {component}
      </div>

       {/* Water Drop / Spotlight Effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(
            600px circle at ${mousePosition.x}px ${mousePosition.y}px,
            hsl(var(--primary) / 0.15),
            transparent 40%
          )`,
        }}
      />
      
      {/* Searchlight / Blur Hint */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-duration-300"
        style={{
             background: `radial-gradient(
            400px circle at ${mousePosition.x}px ${mousePosition.y}px,
            hsl(var(--foreground) / 0.05),
            transparent 40%
          )`
        }}
      />

      {/* Floating Info Bar with Glassmorphism */}
      <div className="absolute bottom-0 h-22 w-full bg-card/80 backdrop-blur-md border md:border-t-0 border-t border-border/20 shadow-lg p-4 group-hover:bg-card/90 transition-colors z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground mb-1 text-sm">
                {name}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="flex-shrink-0 ml-3 rounded-full opacity-70 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all">
              {cta}
              <ArrowRightIcon className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </Link>
  );
};

export { BentoGrid, BentoCard };