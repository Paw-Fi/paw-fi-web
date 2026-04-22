/**
 * PDF text extraction and structuring module.
 *
 * Handles:
 * - Google Cloud Document AI text extraction (80-90% cheaper than sending raw PDFs to Gemini)
 * - PDF page chunking via pdf-lib for large documents
 * - Document AI page structure parsing (tables, lines, columns)
 * - Text normalization and cleanup
 *
 * This module is the deterministic layer between raw PDF bytes and structured text.
 * LLM orchestration (Gemini vision, function calling) stays in analyze-core.ts.
 */

import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1?target=deno";
import {
  decodeBase64,
  encodeBase64,
} from "https://deno.land/std@0.224.0/encoding/base64.ts";

// ---------------------------------------------------------------------------
// Configuration (read from environment)
// ---------------------------------------------------------------------------

const DOCUMENT_AI_ENDPOINT =
  "https://us-documentai.googleapis.com/v1/projects/1075784863194/locations/us/processors/26186df0eef1dad9:process";

function getGoogleCloudServiceAccount(): string {
  try {
    return Deno.env.get("GOOGLE_CLOUD_SERVICE_ACCOUNT") || "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of Document AI text extraction from a PDF. */
export interface PdfTextResult {
  /** Cleaned, concatenated text from all pages. */
  text: string;
  /** Total number of pages in the PDF. */
  pageCount: number;
  /** Per-page text chunks for parallel processing (only for >3 page PDFs). */
  pages?: string[];
  /** Pipe-delimited table row strings extracted from Document AI tables. */
  tableRows?: string[];
  /** Individual line texts from Document AI line-level detection. */
  lineTexts?: string[];
}

/** Configuration for PDF processing limits. */
export interface PdfParseConfig {
  /** Maximum pages per chunk when splitting large PDFs (default: 5). */
  maxPagesPerChunk: number;
  /** Minimum text length to consider extraction successful (default: 50). */
  minTextLength: number;
}

export const DEFAULT_PDF_CONFIG: PdfParseConfig = {
  maxPagesPerChunk: 5,
  minTextLength: 50,
};

// ---------------------------------------------------------------------------
// Google Cloud OAuth2 — JWT-based service account authentication
// ---------------------------------------------------------------------------

/**
 * Generates an OAuth2 access token from Google Cloud service account credentials.
 * Uses JWT signing to authenticate with Google's OAuth2 endpoint.
 */
async function getGoogleCloudAccessToken(): Promise<string | null> {
  try {
    const rawServiceAccount = getGoogleCloudServiceAccount();
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch {
      console.log("[pdf] Service account JSON parse error, checking format");
      return null;
    }

    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      console.log(
        "[pdf] Service account missing required fields (private_key or client_email)",
      );
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claims = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const encodedClaims = btoa(JSON.stringify(claims))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const signatureInput = `${encodedHeader}.${encodedClaims}`;

    // Import and sign with private key
    const privateKey = serviceAccount.private_key;
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";

    let pemContents = privateKey;
    if (pemContents.includes(pemHeader)) {
      pemContents = pemContents.split(pemHeader)[1];
    }
    if (pemContents.includes(pemFooter)) {
      pemContents = pemContents.split(pemFooter)[0];
    }
    pemContents = pemContents.replace(/\s+/g, "");

    let binaryKey;
    try {
      binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
    } catch (decodeError) {
      console.log(
        "[pdf] Failed to decode base64 private key:",
        decodeError instanceof Error
          ? decodeError.message
          : String(decodeError),
      );
      return null;
    }

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      new TextEncoder().encode(signatureInput),
    );

    const signatureArray = new Uint8Array(signature);
    const signatureChars: string[] = [];
    for (let i = 0; i < signatureArray.length; i++) {
      signatureChars.push(String.fromCharCode(signatureArray[i]));
    }
    const encodedSignature = btoa(signatureChars.join(""))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const jwt = `${signatureInput}.${encodedSignature}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log(`[pdf] Failed to get access token: ${errorText}`);
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[pdf] Error generating access token: ${errorMessage}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Document AI page processing helpers
// ---------------------------------------------------------------------------

/**
 * Extracts text from a Document AI text anchor by resolving segment offsets
 * against the full document text.
 */
export function textAnchorToText(textAnchor: any, fullText: string): string {
  if (!textAnchor || !Array.isArray(textAnchor.textSegments)) return "";
  const segments = textAnchor.textSegments;
  let content = "";
  for (const segment of segments) {
    const start = Number(segment.startIndex ?? 0);
    const end = Number(segment.endIndex ?? fullText.length);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      content += fullText.substring(start, end);
    }
  }
  return content;
}

/**
 * Extracts pipe-delimited row strings from Document AI table structures.
 * Each row becomes "cell1 | cell2 | cell3".
 */
export function buildTableRowTexts(page: any, fullText: string): string[] {
  if (!page || !Array.isArray(page.tables)) return [];
  const rows: string[] = [];

  for (const table of page.tables) {
    const tableRows = [...(table.headerRows ?? []), ...(table.bodyRows ?? [])];

    for (const row of tableRows) {
      const cells = Array.isArray(row.cells) ? row.cells : [];
      const cellTexts: string[] = [];
      for (const cell of cells) {
        const cellText = textAnchorToText(cell.layout?.textAnchor, fullText)
          .replace(/\s+/g, " ")
          .trim();
        if (cellText.length > 0) {
          cellTexts.push(cellText);
        }
      }
      if (cellTexts.length > 0) {
        rows.push(cellTexts.join(" | "));
      }
    }
  }

  return rows;
}

/**
 * Extracts individual line texts from Document AI line-level detection.
 */
export function buildLineTexts(page: any, fullText: string): string[] {
  if (!page || !Array.isArray(page.lines)) return [];
  const lines: string[] = [];

  for (const line of page.lines) {
    const lineText = textAnchorToText(line.layout?.textAnchor, fullText)
      .replace(/\s+/g, " ")
      .trim();
    if (lineText) {
      lines.push(lineText);
    }
  }

  return lines;
}

/**
 * Converts multi-space-separated line texts into pipe-delimited column rows.
 * Useful for statements without explicit table markup but with column alignment.
 */
export function buildColumnRowTextsFromLines(lines: string[]): string[] {
  if (!lines || lines.length === 0) return [];
  return lines
    .map((line) => line.replace(/\s{2,}/g, " | ").trim())
    .filter((line) => line.includes("|"));
}

/**
 * Reconstructs readable text from a single Document AI page,
 * preferring table structure, then line texts, then raw layout text.
 */
export function buildPageTextFromDocumentAiPage(
  page: any,
  fullText: string,
): string {
  const tableRows = buildTableRowTexts(page, fullText);
  if (tableRows.length > 0) {
    return tableRows.join("\n");
  }

  const lineTexts = buildLineTexts(page, fullText);
  if (lineTexts.length > 0) {
    return lineTexts.join("\n");
  }

  if (page?.layout?.textAnchor) {
    return textAnchorToText(page.layout.textAnchor, fullText);
  }

  return "";
}

// ---------------------------------------------------------------------------
// Text normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes extracted document text by collapsing whitespace and
 * removing excessive blank lines.
 */
export function normalizeDocumentText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// PDF text extraction via Document AI
// ---------------------------------------------------------------------------

/**
 * Extracts text from a PDF using Google Cloud Document AI.
 *
 * This is the primary extraction path — 80-90% cheaper than sending raw PDFs
 * to Gemini vision. Returns `null` when Document AI is not configured or
 * extraction fails, signaling the caller to fall back to vision mode.
 *
 * The result includes structured table rows and line texts when available,
 * allowing the caller to attempt deterministic parsing before resorting to LLM.
 */
export async function extractPdfText(
  base64Pdf: string,
): Promise<PdfTextResult | null> {
  if (!getGoogleCloudServiceAccount()) {
    console.log(
      "[pdf] Document AI service account not configured, will use Gemini native processing",
    );
    return null;
  }

  try {
    console.log("[pdf] Extracting text with Google Cloud Document AI");

    const accessToken = await getGoogleCloudAccessToken();
    if (!accessToken) {
      console.log(
        "[pdf] Failed to get access token, will use Gemini native processing",
      );
      return null;
    }

    const response = await fetch(DOCUMENT_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        rawDocument: {
          content: base64Pdf,
          mimeType: "application/pdf",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(
        `[pdf] Document AI failed (${response.status}): ${errorText}`,
      );
      return null;
    }

    const data = await response.json();

    if (!data.document || !data.document.text) {
      console.log("[pdf] No text extracted from Document AI");
      return null;
    }

    const fullText: string = data.document.text;
    const pages: any[] = data.document.pages || [];
    const totalPages = pages.length;

    // Process each page for structured data
    const pageTexts: string[] = [];
    const tableRows: string[] = [];
    const inferredRows: string[] = [];
    const collectedLineTexts: string[] = [];

    for (const page of pages) {
      const pageTableRows = buildTableRowTexts(page, fullText);
      if (pageTableRows.length > 0) {
        tableRows.push(...pageTableRows);
      }

      const pageLineTexts = buildLineTexts(page, fullText);
      const columnRows = buildColumnRowTextsFromLines(pageLineTexts);
      if (columnRows.length > 0) {
        inferredRows.push(...columnRows);
      }
      if (pageLineTexts.length > 0) {
        collectedLineTexts.push(...pageLineTexts);
      }

      const pageText = buildPageTextFromDocumentAiPage(page, fullText);
      const cleaned = normalizeDocumentText(pageText);
      if (cleaned.length > 0) {
        pageTexts.push(cleaned);
        const extraRows = buildColumnRowTextsFromLines(cleaned.split("\n"));
        if (extraRows.length > 0) {
          inferredRows.push(...extraRows);
        }
      }
    }

    // Validate extracted text
    const fallbackText = normalizeDocumentText(fullText);
    const cleanText =
      pageTexts.length > 0
        ? normalizeDocumentText(pageTexts.join("\n\n"))
        : fallbackText;
    const hasSubstantialText =
      cleanText.length >= DEFAULT_PDF_CONFIG.minTextLength;
    const hasTransactionLikeContent =
      /\d+\.\d{2}|\$|€|£|¥|₹/.test(cleanText) ||
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(cleanText);

    if (hasSubstantialText && hasTransactionLikeContent) {
      let pagesForProcessing: string[] | undefined;
      if (totalPages > 3 && pageTexts.length > 1) {
        pagesForProcessing = pageTexts.filter((p) => p.length > 0);
      }

      console.log(
        `[pdf] Document AI extraction SUCCESS - ${totalPages} pages, ${cleanText.length} chars` +
          (pagesForProcessing
            ? `, ${pagesForProcessing.length} page chunks for parallel processing`
            : ""),
      );

      const finalTableRows =
        tableRows.length > 0
          ? tableRows
          : inferredRows.length > 0
            ? inferredRows
            : undefined;

      return {
        text: cleanText,
        pageCount: totalPages,
        pages: pagesForProcessing,
        tableRows: finalTableRows,
        lineTexts:
          collectedLineTexts.length > 0 ? collectedLineTexts : undefined,
      };
    }

    console.log(
      `[pdf] Insufficient text from Document AI (${cleanText.length} chars, transaction patterns: ${hasTransactionLikeContent})`,
    );
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[pdf] Document AI extraction failed: ${errorMessage}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// PDF page chunking
// ---------------------------------------------------------------------------

/**
 * Splits a large PDF into smaller chunks for processing within model page limits.
 *
 * Returns `null` if the PDF cannot be parsed. Returns a single-chunk array
 * if the document is already within `maxPagesPerChunk`.
 */
export async function splitPdfBase64IntoChunks(
  base64Pdf: string,
  maxPagesPerChunk: number = DEFAULT_PDF_CONFIG.maxPagesPerChunk,
): Promise<{ chunks: string[]; pageCount: number } | null> {
  try {
    const sourceBytes = decodeBase64(base64Pdf);
    const source = await PDFDocument.load(sourceBytes, {
      ignoreEncryption: true,
    });

    const totalPages = source.getPageCount();
    if (totalPages <= 0) {
      return null;
    }

    if (totalPages <= maxPagesPerChunk) {
      return { chunks: [base64Pdf], pageCount: totalPages };
    }

    const chunks: string[] = [];
    for (let start = 0; start < totalPages; start += maxPagesPerChunk) {
      const end = Math.min(start + maxPagesPerChunk, totalPages);
      const chunkDoc = await PDFDocument.create();
      const pageIndices = Array.from(
        { length: end - start },
        (_, idx) => start + idx,
      );
      const copiedPages = await chunkDoc.copyPages(source, pageIndices);
      for (const page of copiedPages) {
        chunkDoc.addPage(page);
      }
      const chunkBytes = await chunkDoc.save();
      chunks.push(encodeBase64(chunkBytes));
    }

    return { chunks, pageCount: totalPages };
  } catch (error) {
    console.warn("[pdf] PDF split failed, continuing unsplit", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Error detection
// ---------------------------------------------------------------------------

/**
 * Checks if an error message indicates a PDF page limit exceeded error
 * from the Gemini model.
 */
export function isPdfPageLimitErrorMessage(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    (lowered.includes("pdf") && lowered.includes("5 page")) ||
    (lowered.includes("pdf") && lowered.includes("page limit")) ||
    lowered.includes("maximum number of pages") ||
    lowered.includes("too many pages") ||
    lowered.includes("document exceeds page limit")
  );
}
