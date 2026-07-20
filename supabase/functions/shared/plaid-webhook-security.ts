export interface PlaidWebhookReplayIdentityParams {
  rawBody: string;
  verificationToken?: string | null;
  receivedAtMs?: number;
}

export interface PlaidWebhookTerminalConnection {
  status?: string | null;
  item_status?: string | null;
  item_health_state?: string | null;
}

export async function buildPlaidWebhookReplayIdentity(
  params: PlaidWebhookReplayIdentityParams,
): Promise<string> {
  const payload = JSON.parse(params.rawBody) as Record<string, unknown>;
  const itemId = normalizeReplayPart(payload.item_id);
  const webhookType = normalizeReplayPart(payload.webhook_type);
  const webhookCode = normalizeReplayPart(payload.webhook_code);
  const bodyHash = await sha256Hex(JSON.stringify(canonicalizeJson(payload)));
  if (params.verificationToken) {
    const tokenHash = await sha256Hex(params.verificationToken);
    return `plaid:${itemId}:${webhookType}:${webhookCode}:jwt:${tokenHash}:${bodyHash}`;
  }
  const replayWindow = Math.floor(
    (params.receivedAtMs ?? Date.now()) / (5 * 60 * 1000),
  );

  return `plaid:${itemId}:${webhookType}:${webhookCode}:${replayWindow}:${bodyHash}`;
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalizeJson(entry)]),
  );
}

export function isPlaidConnectionTerminalForWebhook(
  connection: PlaidWebhookTerminalConnection | null | undefined,
): boolean {
  if (!connection) return false;

  const status = normalizeStatus(connection.status);
  const itemStatus = normalizeStatus(connection.item_status);
  const itemHealthState = normalizeStatus(connection.item_health_state);

  return (
    status === "disabled" ||
    status === "removed" ||
    itemStatus === "removed" ||
    itemStatus === "pending_removal" ||
    itemHealthState === "removed" ||
    itemHealthState === "removal_pending"
  );
}

function normalizeReplayPart(value: unknown): string {
  const normalized = String(value || "unknown").trim();
  return normalized.length > 0 ? normalized : "unknown";
}

function normalizeStatus(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function sha256Hex(value: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
