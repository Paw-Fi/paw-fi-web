import { reportEdgeFunctionError } from "./edge-error-alert.ts";

type EdgeReporterInput = {
  functionName: string;
  error: unknown;
  context?: Record<string, unknown>;
};

type ReportVertexAiFailureInput = {
  functionName: string;
  error: unknown;
  phase: string;
  modelName?: string;
  context?: Record<string, unknown>;
  reportImpl?: (input: EdgeReporterInput) => Promise<void>;
  logImpl?: (...args: unknown[]) => void;
};

export async function reportVertexAiFailure(
  input: ReportVertexAiFailureInput,
): Promise<void> {
  const reportImpl = input.reportImpl ?? reportEdgeFunctionError;
  const logImpl = input.logImpl ?? console.error;

  try {
    await reportImpl({
      functionName: input.functionName,
      error: input.error,
      context: {
        provider: "vertex-ai",
        phase: input.phase,
        ...(input.modelName ? { modelName: input.modelName } : {}),
        ...(input.context ?? {}),
      },
    });
  } catch (reportError) {
    logImpl(`[${input.functionName}] reportEdgeFunctionError failed`, {
      phase: input.phase,
      error: String(reportError),
    });
  }
}
