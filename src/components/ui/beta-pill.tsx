import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BetaPillProps {
  size?: 'small' | 'large';
}

export const BetaPill = ({ size = 'small' }: BetaPillProps) => {
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "bg-warning-light text-warning font-bold border-none w-min",
        {
          "text-xs px-2 py-1": size === 'small',
          "text-base px-3 py-1": size === 'large',
        }
      )}
    >
      Beta
    </Badge>
  );
}