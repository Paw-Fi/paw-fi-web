import { createNotificationTranslator } from "./notification-localization.ts";

export function fileImportMessage(
  payload: Record<string, unknown>,
  language = "en",
) {
  const { t, locale } = createNotificationTranslator(language);
  if (payload.status === "processing") {
    return {
      title: t("File import started"),
      body: t("Moneko is processing your file. You can close the app."),
    };
  }
  if (payload.status === "completed") {
    return {
      title: t("File import completed"),
      body: t`Imported ${Number(payload.imported)} transactions. Skipped ${
        Number(payload.skipped)
      } duplicate or grouped rows.`,
    };
  }
  const nextStep = t(
    "Open Import Data to see what happened and how to continue.",
  );
  const reason = typeof payload.message === "string" ? payload.message : "";
  return {
    title: t("File import needs attention"),
    body: reason
      ? (locale === "en" ? reason : reason + " " + nextStep)
      : nextStep,
  };
}
