export type AppStoreCandidateUserSource =
  | "ownership_binding"
  | "app_account_token"
  | "legacy_subscription";

export function shouldReportMissingCandidateUser(
  candidateSource: AppStoreCandidateUserSource,
): boolean {
  return candidateSource !== "app_account_token";
}
