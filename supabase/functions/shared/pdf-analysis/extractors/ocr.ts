import { extractPdfText } from "../../import/pdf.ts";

import type { PdfOcrExtractionResult } from "../types.ts";
import { cleanExtractedText } from "../utils/cleaner.ts";

export async function extractOcrTextFromPdf(
  base64Pdf: string,
  signal?: AbortSignal,
): Promise<PdfOcrExtractionResult | null> {
  const extracted = await extractPdfText(base64Pdf, signal);
  if (!extracted?.text) return null;

  return {
    text: cleanExtractedText(extracted.text),
    pages: (extracted.pages || [extracted.text]).map((page) =>
      cleanExtractedText(page)
    ),
    pageCount: extracted.pageCount,
  };
}
