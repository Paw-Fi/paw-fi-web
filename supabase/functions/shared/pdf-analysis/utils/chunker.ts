import type { PdfChunk, PdfChunkerOptions } from "../types.ts";
import { cleanExtractedText, estimateTokenCount } from "./cleaner.ts";

function toPageBlocks(options: PdfChunkerOptions): string[] {
  if (Array.isArray(options.pages) && options.pages.length > 0) {
    return options.pages
      .map((page) => cleanExtractedText(page))
      .filter(Boolean);
  }

  const fullText = cleanExtractedText(options.text || "");
  if (!fullText) return [];
  return [fullText];
}

export function chunkDocumentContent(options: PdfChunkerOptions): PdfChunk[] {
  const pageBlocks = toPageBlocks(options);
  if (pageBlocks.length === 0) return [];

  const chunks: PdfChunk[] = [];
  let chunkIndex = 0;
  let activePages: number[] = [];
  let activeLines: string[] = [];
  let activeTokens = 0;

  for (let index = 0; index < pageBlocks.length; index++) {
    const pageNumber = index + 1;
    const pageText = `[Page ${pageNumber}]\n${pageBlocks[index]}`;
    const pageTokens = estimateTokenCount(pageText);
    const effectiveTokenLimit = Math.max(
      1,
      Math.floor(options.tokenLimit * 0.9),
    );
    const exceedsBudget =
      activeTokens > 0 && activeTokens + pageTokens > effectiveTokenLimit;

    if (exceedsBudget) {
      chunks.push({
        index: chunkIndex,
        pages: activePages,
        text: activeLines.join("\n\n"),
        estimatedTokens: activeTokens,
      });
      chunkIndex += 1;
      activePages = [];
      activeLines = [];
      activeTokens = 0;
    }

    activePages.push(pageNumber);
    activeLines.push(pageText);
    activeTokens += pageTokens;
  }

  if (activePages.length > 0) {
    chunks.push({
      index: chunkIndex,
      pages: activePages,
      text: activeLines.join("\n\n"),
      estimatedTokens: activeTokens,
    });
  }

  return chunks;
}
