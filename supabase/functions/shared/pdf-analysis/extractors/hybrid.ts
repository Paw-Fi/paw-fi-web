import { PDF_EXTRACTION_STRATEGY } from "../types.ts";
import type {
  PdfDocumentContent,
  PdfNativeExtractionResult,
  PdfOcrExtractionResult,
} from "../types.ts";
import { cleanExtractedText } from "../utils/cleaner.ts";
import { buildVisionDocumentsFromPdf } from "./vision.ts";

export async function buildHybridPdfContent(params: {
  base64Pdf: string;
  nativeResult?: PdfNativeExtractionResult | null;
  ocrResult?: PdfOcrExtractionResult | null;
}): Promise<PdfDocumentContent> {
  const vision = await buildVisionDocumentsFromPdf(params.base64Pdf);
  const nativeLength = params.nativeResult?.text.length ?? 0;
  const ocrLength = params.ocrResult?.text.length ?? 0;
  const preferredText =
    nativeLength >= ocrLength
      ? params.nativeResult?.text || params.ocrResult?.text || ""
      : params.ocrResult?.text || params.nativeResult?.text || "";
  const preferredPages =
    (params.ocrResult?.pages?.length
      ? params.ocrResult.pages
      : params.nativeResult?.pages) || [];

  return {
    text: cleanExtractedText(preferredText),
    pages: preferredPages,
    documents: vision.documents,
    pageCount: vision.pageCount,
    extractionStrategy: PDF_EXTRACTION_STRATEGY.hybrid,
  };
}
