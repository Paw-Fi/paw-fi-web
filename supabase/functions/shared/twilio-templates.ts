// Twilio WhatsApp Content Template SIDs
// Centralized configuration for all WhatsApp templates
//
// IMPORTANT (Twilio / WhatsApp locale):
// All Content Templates referenced here must be created and approved as
// "English (US)" in Twilio's Content Template Builder. If a template exists only
// for a different English locale (or is missing approvals for the sender/WABA),
// Twilio may fail sends with warning/error 63027: "Template does not exist for a
// language and locale".

export const TWILIO_TEMPLATES = {
  // Verification prompt - asks unverified users to start verification
  VERIFICATION_PROMPT: "HX5df90ee7a2eac9f7afb795d6577bf82a",

  // Verification code - sends OTP code with link
  // Variables: {{CODE}} - 6-digit verification code
  VERIFICATION_CODE: "HX0003bf09a1dc97d5a01edbeb6025fe65",

  //Onboarding message - sent after verification
  ONBOARDING: "HX077aaa1227e050cb6dcb25f60204e2cb",

  //Non-subscriber message - sent to users who are on the Free plan
  NON_SUBSCRIBER: "HX1f022ebaaba733057d471c3dbdc1c627",
} as const;

export type TemplateId =
  (typeof TWILIO_TEMPLATES)[keyof typeof TWILIO_TEMPLATES];
