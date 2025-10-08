// Twilio WhatsApp Content Template SIDs
// Centralized configuration for all WhatsApp templates

export const TWILIO_TEMPLATES = {
  // Verification prompt - asks unverified users to start verification
  VERIFICATION_PROMPT: 'HXbcabf9507251ad843e0de1400d305a3a',
  
  // Verification code - sends OTP code with link
  // Variables: {{CODE}} - 6-digit verification code
  VERIFICATION_CODE: 'HX0003bf09a1dc97d5a01edbeb6025fe65',
} as const;

export type TemplateId = typeof TWILIO_TEMPLATES[keyof typeof TWILIO_TEMPLATES];
