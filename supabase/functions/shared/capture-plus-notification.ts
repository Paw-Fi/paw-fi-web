import { PRICING_URL } from "./plus-entitlement.ts";
import { normalizeWalletCaptureSource } from "./wallet-capture.ts";

export const CAPTURE_PLUS_REQUIRED_EVENT = "capture_plus_required";

export async function queueCapturePlusRequiredNotification(params: {
  supabase: any;
  userId: string;
  captureSource?: string | null;
}): Promise<void> {
  const captureSource =
    normalizeWalletCaptureSource(params.captureSource) ?? "unknown";
  const { error } = await params.supabase.from("notification_events").insert({
    user_id: params.userId,
    household_id: null,
    event_type: CAPTURE_PLUS_REQUIRED_EVENT,
    payload: {
      capture_source: captureSource,
      pricing_url: PRICING_URL,
    },
  });
  if (error) throw error;
}
