import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BetaPillProps {
  size?: "small" | "large";
}

export const BetaPill = ({ size = "small" }: BetaPillProps) => {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-warning-light text-warning w-min border-none font-bold",
        {
          "px-2 py-1 text-xs": size === "small",
          "px-3 py-1 text-base": size === "large",
        },
      )}
    >
      New
    </Badge>
  );
};
