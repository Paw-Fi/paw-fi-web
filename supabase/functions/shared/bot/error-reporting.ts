/// <reference lib="deno.ns" />

import { reportEdgeFunctionError } from "../edge-error-alert.ts";
import { readInvokeErrorResponseDetails } from "../formatting-helpers.ts";

export type BotToolInvokeFailureParams = {
  functionName: string;
  traceId?: string;
  toolName: string;
  targetFunction: string;
  formatted: string;
  error?: unknown;
  context?: Record<string, unknown>;
};

export type BotBackendErrorParams = {
  functionName: string;
  phase: string;
  error: unknown;
  traceId?: string;
  context?: Record<string, unknown>;
};

export function getInvokeHttpStatus(error: unknown): number | undefined {
  const candidate = error as Record<string, any> | null | undefined;
  const contextStatus = candidate?.context?.status;
  if (typeof contextStatus === "number") return contextStatus;
  const status = candidate?.status;
  return typeof status === "number" ? status : undefined;
}

export async function reportBotBackendError({
  functionName,
  phase,
  error,
  traceId,
  context,
}: BotBackendErrorParams): Promise<void> {
  try {
    await reportEdgeFunctionError({
      functionName,
      error,
      context: {
        phase,
        ...(traceId ? { traceId } : {}),
        ...context,
      },
    });
  } catch (reportError) {
    console.error(`[${functionName}] reportEdgeFunctionError failed`, {
      phase,
      traceId,
      error: String(reportError),
    });
  }
}

export async function reportBotToolInvokeFailure({
  functionName,
  traceId,
  toolName,
  targetFunction,
  formatted,
  error,
  context,
}: BotToolInvokeFailureParams): Promise<void> {
  try {
    const responseDetails = await readInvokeErrorResponseDetails(error);
    await reportEdgeFunctionError({
      functionName,
      error: new Error(`${targetFunction} failed: ${formatted}`),
      context: {
        ...(traceId ? { traceId } : {}),
        step: `tool:${toolName}`,
        toolName,
        targetFunction,
        httpStatus: responseDetails?.status ?? getInvokeHttpStatus(error),
        ...(responseDetails?.statusText
          ? { targetStatusText: responseDetails.statusText }
          : {}),
        ...(responseDetails?.contentType
          ? { targetContentType: responseDetails.contentType }
          : {}),
        ...(responseDetails?.body
          ? { targetResponseBody: responseDetails.body }
          : {}),
        ...context,
      },
    });
  } catch (reportError) {
    console.error(`[${functionName}] reportEdgeFunctionError failed`, {
      traceId,
      toolName,
      targetFunction,
      error: String(reportError),
    });
  }
}
