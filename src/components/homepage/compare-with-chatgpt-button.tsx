import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import chatGPTIcon from "@/assets/images/chatgpt.svg.webp";
import { cn } from "@/lib/utils";

interface CompareWithChatGptButtonProps {
  className?: string;
  labelClassName?: string;
  source?: string;
}

export function CompareWithChatGptButton({
  className,
  labelClassName,
  source = "compare-with-chatgpt",
}: CompareWithChatGptButtonProps) {
  const compareUrl = `/compare-with-chatgpt?source=${encodeURIComponent(source)}`;

  return (
    <Button
      variant="outline"
      size="lg"
      className={cn(
        "min-h-12 max-w-full gap-2 overflow-hidden px-4 sm:px-6",
        className,
      )}
      onClick={() => {
        window.open(compareUrl, "_blank");
      }}
    >
      <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white transition-transform group-hover:scale-110">
        <img
          src={chatGPTIcon}
          alt="ChatGPT"
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
        />
      </div>
      <span className={cn("min-w-0", labelClassName)}>
        Compare with ChatGPT
      </span>
      <ArrowRight className="ml-1 h-4 w-4 shrink-0 opacity-70 transition-transform group-hover:translate-x-1 sm:ml-2" />
    </Button>
  );
}
