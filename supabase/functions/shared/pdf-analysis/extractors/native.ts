import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import {
  getDocument,
  GlobalWorkerOptions,
} from "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs?no-dts";

import type { PdfNativeExtractionResult } from "../types.ts";
import { cleanExtractedText } from "../utils/cleaner.ts";

try {
  GlobalWorkerOptions.workerSrc = "";
} catch {
  // Server-side PDF.js worker setup is best-effort in the Edge runtime.
}

export async function extractNativeTextFromPdf(
  base64Pdf: string,
): Promise<PdfNativeExtractionResult | null> {
  try {
    const pdfBytes = decodeBase64(base64Pdf);
    const task = getDocument({
      data: pdfBytes,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
    });
    const pdf = await task.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = cleanExtractedText(
        (textContent.items || [])
          .map((item: any) => (typeof item?.str === "string" ? item.str : ""))
          .join(" "),
      );
      pages.push(pageText);
    }

    return {
      text: cleanExtractedText(pages.join("\n\n")),
      pages,
      pageCount: pdf.numPages,
    };
  } catch (error) {
    console.warn("[pdf-analysis] native extraction failed", error);
    return null;
  }
}
