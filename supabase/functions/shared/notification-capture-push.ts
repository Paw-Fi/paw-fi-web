import { getGoogleAccessToken } from "./google-auth.ts";

const FIREBASE_MESSAGING_SCOPE =
  "https://www.googleapis.com/auth/firebase.messaging";

export interface NotificationCapturePushParams {
  supabase: any;
  userId: string;
  title: string;
  body: string;
  data: Record<string, string>;
  firebaseProjectId: string;
  firebaseServiceAccountJson: string;
  iosBundleId: string;
}

export async function sendNotificationCapturePushBestEffort(
  params: NotificationCapturePushParams,
): Promise<void> {
  if (!params.firebaseProjectId || !params.firebaseServiceAccountJson) return;

  try {
    const { data: rows, error } = await params.supabase
      .from("devices")
      .select("push_token, platform")
      .eq("user_id", params.userId)
      .eq("is_active", true)
      .not("push_token", "is", null);
    if (error || !Array.isArray(rows)) return;

    const devices = rows
      .map((row: any) => ({
        token: typeof row?.push_token === "string" ? row.push_token.trim() : "",
        platform: typeof row?.platform === "string" ? row.platform : "",
      }))
      .filter((row: { token: string }) => row.token.length > 0)
      .filter(
        (row, index, all) =>
          all.findIndex((candidate) => candidate.token === row.token) === index,
      );
    if (!devices.length) return;

    const accessToken = await getGoogleAccessToken({
      serviceAccountJson: params.firebaseServiceAccountJson,
      scope: FIREBASE_MESSAGING_SCOPE,
    });

    await Promise.allSettled(
      devices.map(async (device) => {
        const deepLink = params.data.deep_link || "";
        const isWeb = /^(web|webpush|web_push|browser)$/i.test(device.platform);
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${params.firebaseProjectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token: device.token,
                notification: { title: params.title, body: params.body },
                data: {
                  ...params.data,
                  click_action: "FLUTTER_NOTIFICATION_CLICK",
                },
                android: {
                  priority: "high",
                  notification: {
                    sound: "default",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                  },
                },
                apns: {
                  headers: {
                    "apns-topic": params.iosBundleId,
                    "apns-push-type": "alert",
                    "apns-priority": "10",
                  },
                  payload: {
                    aps: { sound: "default", badge: 1 },
                    ...(deepLink ? { deep_link: deepLink } : {}),
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                  },
                },
                ...(isWeb
                  ? {
                    webpush: {
                      data: { ...params.data, deep_link: deepLink },
                      fcm_options: { link: "https://moneko.io/dashboard" },
                    },
                  }
                  : {}),
              },
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          if (
            errorText.includes("UNREGISTERED") ||
            errorText.includes("INVALID_ARGUMENT")
          ) {
            await params.supabase
              .from("devices")
              .update({
                is_active: false,
                updated_at: new Date().toISOString(),
              })
              .eq("push_token", device.token);
          }
          throw new Error(`FCM_${response.status}`);
        }
      }),
    );
  } catch (error) {
    console.error("[notification-capture] Push delivery failed", {
      error: error instanceof Error ? error.message : String(error),
      userId: params.userId,
    });
  }
}
