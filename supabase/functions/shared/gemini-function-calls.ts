export function getGeminiFunctionCalls(response: any): any[] {
  const direct = response?.response?.functionCalls?.();
  const calls: any[] = Array.isArray(direct) ? [...direct] : [];
  const candidates = response?.response?.candidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part?.functionCall) calls.push(part.functionCall);
      }
    }
  }

  if (calls.length <= 1) return calls;

  const deduped: any[] = [];
  const seen = new Set<string>();
  for (const call of calls) {
    const key = `${call?.name ?? ""}:${JSON.stringify(call?.args ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(call);
  }
  return deduped;
}
