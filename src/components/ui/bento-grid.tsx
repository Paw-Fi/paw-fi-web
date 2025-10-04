import { ReactNode } from "react";
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
}) => (
  <div
    className={cn(
      "group relative overflow-hidden bg-card hover:bg-card/95 transition-all duration-200 border-r border-b border-border last:border-r-0 [&:nth-child(2)]:border-r-0 [&:nth-child(3)]:border-b-0 [&:nth-child(4)]:border-b-0",
      className,
    )}
  >
    {/* Component Content - Full Height */}
    <div className="w-full h-full">
      {component}
    </div>
    
    {/* Floating Info Bar with Glassmorphism */}
    <div className="absolute bottom-0  h-22 w-full bg-card/80 backdrop-blur-md border border-border/20 shadow-lg p-4">
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
        <Button variant="ghost" asChild size="sm" className="flex-shrink-0 ml-3 rounded-full opacity-70 hover:opacity-100">
          <Link to={href}>
            {cta}
            <ArrowRightIcon className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  </div>
);

export { BentoGrid, BentoCard };