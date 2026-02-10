import type { MDXComponents } from "mdx/types";
import { cn } from "@/lib/utils";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    img: ({ className, ...props }: React.ComponentProps<"img">) => (
      <img className={cn("rounded-md border", className)} {...props} />
    ),
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;
