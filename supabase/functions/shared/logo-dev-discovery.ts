import { type LogoDevCandidate } from "./merchant-resolution.ts";

/**
 * The sole Logo.dev Search transport. Callers must have already selected an
 * interactive resolver mode and exhausted internal/cache knowledge.
 */
export async function searchLogoDevCandidates(
  query: string,
  secretKey: string,
): Promise<LogoDevCandidate[]> {
  const url = new URL("https://api.logo.dev/search");
  url.searchParams.set("q", query);
  url.searchParams.set("strategy", "match");
  const result = await fetch(url, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!result.ok) throw new Error(`LOGO_DEV_${result.status}`);
  const payload = await result.json();
  return Array.isArray(payload)
    ? payload.filter(
      (candidate): candidate is LogoDevCandidate =>
        typeof candidate?.name === "string" &&
        typeof candidate?.domain === "string",
    )
    : [];
}
