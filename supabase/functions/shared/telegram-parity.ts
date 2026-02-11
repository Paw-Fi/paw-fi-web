export const REQUIRED_TELEGRAM_TOOL_NAMES = [
  "add_transaction",
  "add_transactions_batch",
  "update_transaction",
  "delete_transaction",
  "list_expenses",
  "get_budget",
  "draft_budget",
  "confirm_budget",
  "set_budget",
  "set_pocket",
  "delete_pocket",
  "set_currency",
  "generate_chart_url",
  "financial_insight",
  "manage_recurring",
];

export function buildTelegramVerificationUrl(
  baseUrl: string,
  code: string,
): string {
  const sanitizedBaseUrl = baseUrl.replace(/\/$/, "");
  return `${sanitizedBaseUrl}/verify-telegram?otp=${encodeURIComponent(code)}`;
}

export function buildTelegramVerificationMessage(
  code: string,
  verificationUrl: string,
): string {
  return [
    "Moneko Verification",
    "",
    `Your code: ${code}`,
    "",
    "Or click here to verify:",
    verificationUrl,
    "",
    "Valid for 10 minutes.",
    "",
    "Do not share this code.",
  ].join("\n");
}
