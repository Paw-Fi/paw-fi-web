import type { PdfStrategyScore } from "../types.ts";
import { PDF_EXTRACTION_STRATEGY } from "../types.ts";

export interface PdfStrategyInput {
  pageCount: number;
  nativeText: string;
  maxNativePages?: number;
}

export function scoreExtractionStrategy(
  input: PdfStrategyInput,
): PdfStrategyScore {
  const safePageCount = Math.max(1, Math.trunc(input.pageCount || 1));
  const maxNativePages = Math.max(1, Math.trunc(input.maxNativePages || 100));
  const charDensity = Math.floor(
    String(input.nativeText || "").length / safePageCount,
  );

  let strategy: string = PDF_EXTRACTION_STRATEGY.vision;
  if (charDensity > 200) {
    strategy =
      safePageCount > maxNativePages
        ? PDF_EXTRACTION_STRATEGY.hybrid
        : PDF_EXTRACTION_STRATEGY.native;
  } else if (charDensity > 20) {
    strategy = PDF_EXTRACTION_STRATEGY.hybrid;
  }

  return {
    strategy,
    charDensity,
    pageCount: safePageCount,
    maxNativePages,
  };
}

export function detectExtractionStrategy(input: PdfStrategyInput): string {
  return scoreExtractionStrategy(input).strategy;
}
