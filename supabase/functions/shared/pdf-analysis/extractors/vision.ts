import { splitPdfBase64IntoChunks } from "../../import/pdf.ts";

import type { PdfInlineDocument } from "../types.ts";

export interface PdfVisionExtractionResult {
  documents: PdfInlineDocument[];
  pageCount: number;
}

export async function buildVisionDocumentsFromPdf(
  base64Pdf: string,
): Promise<PdfVisionExtractionResult> {
  const split = await splitPdfBase64IntoChunks(base64Pdf, 1);
  if (split?.chunks?.length) {
    return {
      documents: split.chunks.map((chunk, index) => ({
        page: index + 1,
        base64: chunk,
        mimeType: "application/pdf",
      })),
      pageCount: split.pageCount,
    };
  }

  return {
    documents: [{ page: 1, base64: base64Pdf, mimeType: "application/pdf" }],
    pageCount: 1,
  };
}
