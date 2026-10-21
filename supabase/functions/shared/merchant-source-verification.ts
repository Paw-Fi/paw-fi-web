import {
  decodeBase64,
  encodeBase64,
} from "https://deno.land/std@0.224.0/encoding/base64.ts";
import type { AnalyzeRequestBody } from "./analyze-core.ts";
import { runWithTimeout } from "./async-timeout.ts";
import { GEMINI_MODEL_FALLBACKS } from "./gemini-models.ts";
import { decodeFileBytes } from "./import/csv.ts";
import { normalizeAudioContentType } from "./audio-source.ts";
import {
  buildMerchantSourceProposals,
  MERCHANT_SOURCE_INSTRUCTIONS,
  MERCHANT_SOURCE_SCHEMA,
} from "./merchant-source-contract.ts";
export { MERCHANT_SOURCE_INSTRUCTIONS } from "./merchant-source-contract.ts";
import { canonicalMerchantDomain } from "./merchant-resolver.ts";
import { normalizeMerchantCountry } from "./merchant-regional-selection.ts";
import {
  enrichAnalyzedMerchantItems,
  type MerchantAnalysisContext,
} from "./merchant-analysis.ts";
import { blockAnalyzedMerchantIdentity } from "./merchant-auto-resolution-policy.ts";
import {
  createVertexGenerativeAI,
  getVertexAiConfigFromEnv,
} from "./vertex-ai-chat.ts";

export interface MerchantSourceVerdict {
  approved: true;
  merchant: string;
  evidence: string;
  merchantUrl?: string;
  merchantCountry?: string;
}

type SourcePart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };
type MerchantSourceCompletion = (
  parts: SourcePart[],
  signal?: AbortSignal,
) => Promise<unknown>;

interface PreparedSource {
  parts: SourcePart[];
  texts: string[];
}

const MAX_SOURCE_TEXT = 60_000;
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const MAX_VERIFIED_ITEMS = 40;
const VERIFICATION_TIMEOUT_MS = 8_000;

function mediaPart(
  media: NonNullable<AnalyzeRequestBody["image"]>,
): SourcePart {
  const data = media.bytes
    ? encodeBase64(media.bytes)
    : media.data.replace(/^data:[^,]*;base64,/, "").replace(/\s/g, "");
  if (!data || data.length * 0.75 > MAX_MEDIA_BYTES) {
    throw new Error("Merchant source exceeds verification budget");
  }
  return {
    inlineData: {
      mimeType: media.contentType.startsWith("audio/")
        ? normalizeAudioContentType(data, media.contentType)
        : media.contentType,
      data,
    },
  };
}

async function sourceParts(
  body: Partial<AnalyzeRequestBody>,
): Promise<PreparedSource> {
  const parts: SourcePart[] = [];
  const texts: string[] = [];
  if (body.text) {
    parts.push({ text: body.text });
    texts.push(body.text);
  }
  if (body.image) parts.push(mediaPart(body.image));
  if (body.audio) parts.push(mediaPart(body.audio));
  if (parts.length) return { parts, texts };
  const sources = await Promise.all(
    (body.attachments ?? []).map(
      async (attachment): Promise<PreparedSource> => {
        const mimeType = attachment.contentType.toLowerCase().split(";")[0];
        if (
          mimeType === "application/pdf" ||
          /\.pdf$/i.test(attachment.filename) ||
          mimeType.startsWith("image/") ||
          mimeType.startsWith("audio/")
        ) {
          return {
            parts: [
              mediaPart({
                ...attachment,
                contentType: /\.pdf$/i.test(attachment.filename)
                  ? "application/pdf"
                  : mimeType,
              }),
            ],
            texts: [],
          };
        }
        const data = attachment.data.replace(/^data:[^,]*;base64,/, "");
        if (data.length * 0.75 > MAX_MEDIA_BYTES) {
          throw new Error("Merchant source exceeds verification budget");
        }
        const bytes = decodeBase64(data);
        const spreadsheet = /\.(xlsx|xls)$/i.test(attachment.filename) ||
          mimeType.includes("spreadsheet") ||
          mimeType.includes("excel");
        const text = spreadsheet
          ? (await import("./import/xlsx.ts")).buildXlsxPreview(bytes)
          : decodeFileBytes(bytes).text;
        if (!text) throw new Error("Merchant source unavailable");
        return {
          parts: [
            {
              text: JSON.stringify({
                filename: attachment.filename,
                partialSpreadsheetPreview: spreadsheet,
              }),
            },
            { text },
          ],
          texts: [text],
        };
      },
    ),
  );
  return {
    parts: sources.flatMap((source) => source.parts),
    texts: sources.flatMap((source) => source.texts),
  };
}

async function completeMerchantSource(
  parts: SourcePart[],
  signal?: AbortSignal,
): Promise<unknown> {
  const client = createVertexGenerativeAI({
    ...getVertexAiConfigFromEnv(),
  });
  const response = await client
    .getGenerativeModel({
      model: GEMINI_MODEL_FALLBACKS[1],
      systemInstruction: MERCHANT_SOURCE_INSTRUCTIONS,
    })
    .generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: MERCHANT_SOURCE_SCHEMA,
      },
    }, { signal });
  return JSON.parse(response.response.text());
}

export async function verifyMerchantSources(params: {
  body: Partial<AnalyzeRequestBody>;
  items: readonly Record<string, unknown>[];
  answers?: readonly unknown[];
  complete?: MerchantSourceCompletion;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<Array<MerchantSourceVerdict | null>> {
  const denied = params.items.map(() => null);
  const proposals = buildMerchantSourceProposals(params.items);
  if (!proposals.length) return denied;
  try {
    const preparedSource = await sourceParts(params.body);
    const source = preparedSource.parts;
    const answers = params.answers ?? [];
    if (!source.length) return denied;
    const textParts = source.flatMap((part) =>
      "text" in part ? [part.text] : []
    );
    const proposalText = JSON.stringify({
      proposals,
      clarificationHistory: answers,
    });
    if (
      textParts.join("").length + proposalText.length > MAX_SOURCE_TEXT ||
      source.length > 10 ||
      source.reduce(
          (size, part) =>
            size +
            ("inlineData" in part ? part.inlineData.data.length * 0.75 : 0),
          0,
        ) > MAX_MEDIA_BYTES
    ) {
      return denied;
    }
    const response = await runWithTimeout({
      operation: (signal) =>
        (params.complete ?? completeMerchantSource)(
          [{ text: proposalText }, ...source],
          signal,
        ),
      timeoutMs: params.timeoutMs ?? VERIFICATION_TIMEOUT_MS,
      signal: params.signal,
      timeoutMessage: "Merchant source verification timed out",
    });
    if (
      !response ||
      typeof response !== "object" ||
      !Array.isArray((response as { verdicts?: unknown }).verdicts)
    ) {
      return denied;
    }
    const rows = (response as { verdicts: unknown[] }).verdicts;
    if (rows.length > MAX_VERIFIED_ITEMS) return denied;
    const result: Array<MerchantSourceVerdict | null> = [...denied];
    const seen = new Set<number>();
    const sourceTexts = [
      ...preparedSource.texts,
      ...answers.flatMap((answer) => {
        if (!answer || typeof answer !== "object") return [];
        const value = (answer as { answer?: unknown }).answer;
        return typeof value === "string" ? [value] : [];
      }),
    ];
    const hasMedia = source.some((part) => "inlineData" in part);
    // This checks provenance of quoted evidence, not merchant meaning or name matching.
    const grounded = (value: unknown): value is string =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= 1000 &&
      (hasMedia ||
        sourceTexts.some((text) =>
          text.normalize("NFC").includes(value.normalize("NFC"))
        ));
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const value = row as Record<string, unknown>;
      const index = value.itemIndex;
      if (typeof index !== "number" || !Number.isInteger(index)) continue;
      const proposal = proposals.find((item) => item.itemIndex === index);
      if (!proposal) continue;
      if (seen.has(index)) {
        result[index] = null;
        continue;
      }
      seen.add(index);
      if (value.approved !== true || !grounded(value.evidence)) continue;
      const domain = typeof value.merchantUrl === "string"
        ? canonicalMerchantDomain(value.merchantUrl)
        : null;
      const country = normalizeMerchantCountry(value.merchantCountry);
      result[index] = {
        approved: true,
        merchant: proposal.merchant,
        evidence: value.evidence,
        ...(domain &&
            grounded(value.merchantUrlEvidence) &&
            value.merchantUrlEvidence.toLowerCase().includes(domain)
          ? { merchantUrl: domain }
          : {}),
        ...(country && grounded(value.merchantCountryEvidence)
          ? { merchantCountry: country }
          : {}),
      };
    }
    return result;
  } catch {
    // Logo verification is optional; never discard valid financial transactions.
    return denied;
  }
}

export async function enrichSourceVerifiedMerchantItems(params: {
  body: Partial<AnalyzeRequestBody>;
  items: Record<string, unknown>[];
  answers?: readonly unknown[];
  merchantContext: MerchantAnalysisContext;
  deadlineAt?: number;
  signal?: AbortSignal;
  complete?: MerchantSourceCompletion;
}): Promise<Record<string, unknown>[]> {
  const blocked = () => params.items.map(blockAnalyzedMerchantIdentity);
  const timeoutMs = Math.min(
    20_000,
    (params.deadlineAt ?? Date.now() + 20_000) - Date.now(),
  );
  if (timeoutMs <= 0) return blocked();
  try {
    // Optional logo work must finish before the financial request's hard deadline.
    return await runWithTimeout({
      timeoutMs,
      timeoutMessage: "Optional merchant enrichment timed out",
      signal: params.signal,
      operation: async (signal) => {
        const sourceVerdicts = await verifyMerchantSources({
          body: params.body,
          items: params.items,
          answers: params.answers,
          complete: params.complete,
          timeoutMs: Math.min(VERIFICATION_TIMEOUT_MS, timeoutMs),
          signal,
        });
        // Do not start discovery if verification consumed the optional budget.
        signal.throwIfAborted();
        return await enrichAnalyzedMerchantItems({
          items: params.items,
          ...params.merchantContext,
          sourceVerdicts,
        });
      },
    });
  } catch {
    return blocked();
  }
}
