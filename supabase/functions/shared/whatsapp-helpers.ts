// Shared WhatsApp helper functions and types

export interface WhatsAppReply {
  text: string;
  mediaUrl?: string | null;
}

export interface WhatsAppCommand {
  name: string;
  alias?: string[];
  usage: string;
  description: string;
}

export const WHATSAPP_COMMANDS: WhatsAppCommand[] = [
  { name: '/help', usage: '/help', description: 'Show available commands and how to use free-form updates' },
  { name: '/setBudget', alias: ['/setbudget'], usage: '/setBudget <amount>', description: "Set today's budget using your preferred currency" },
  { name: '/setCurrency', alias: ['/setcurrency'], usage: '/setCurrency <ISO>', description: 'Set your preferred currency (e.g., USD, EUR, GBP)' },
  { name: '/expenses', usage: '/expenses', description: "List today's expenses with totals" },
  { name: '/addCategory', alias: ['/addcategory'], usage: '/addCategory <name>', description: 'Add a custom expense category' },
  // Envelopes (Zero-Based Budgeting)
  { name: '/createEnvelope', alias: ['/createenvelope'], usage: '/createEnvelope <name> [monthlyTarget]', description: 'Create an envelope, optional default monthly target' },
  { name: '/setEnvelopeAlloc', alias: ['/setenvelopealloc'], usage: '/setEnvelopeAlloc <name> <YYYY-MM> <amount>', description: 'Set allocation for a month' },
  { name: '/linkCategoryEnvelope', alias: ['/linkcategoryenvelope'], usage: '/linkCategoryEnvelope <name> <category>', description: 'Map a category to an envelope' },
  { name: '/envelopeStatus', alias: ['/envelopestatus'], usage: '/envelopeStatus [YYYY-MM]', description: 'Show envelope allocations vs spent for a month' },
];

export function buildHelpMessage(helpImageUrl?: string): WhatsAppReply {
  const lines = [
    '🎉 *Welcome to Moneko Budgeting!*',
    '',
    '💬 *Free-form text:*',
    'Just type naturally, like:',
    '"I spent 3 on sandwich and 2 on coffee today"',
    '',
    "📸 *Receipt upload:*",
    'You can also log your expenses by simply snapping a photo of your receipt!',
    '',
    '📋 *Commands:*',
    ...WHATSAPP_COMMANDS.map(c => `  ${c.usage} — ${c.description}`),
  ];
  return { 
    text: lines.join('\n'), 
    mediaUrl: helpImageUrl || null 
  };
}

export function buildVerificationPrompt(): string {
  return `🔐 *Account Not Verified*\n\nTo use Moneko, you need to verify your WhatsApp number.\n\n📱 *To get started, simply reply:*\n*Start Verification*\n\nYou'll receive a verification link to connect your account.`;
}

/**
 * Send a WhatsApp message using Twilio Content Template (ContentSid)
 * @param accountSid - Twilio Account SID
 * @param authToken - Twilio Auth Token
 * @param from - Sender WhatsApp number (e.g., 'whatsapp:+14155238886')
 * @param to - Recipient WhatsApp number (e.g., 'whatsapp:+12345678901')
 * @param contentSid - Twilio Content Template SID (e.g., 'HXbcabf9507251ad843e0de1400d305a3a')
 * @param contentVariables - Optional JSON string of variables (e.g., '{"1":"value1","2":"value2"}')
 * @returns Promise with message SID or error
 */
export async function sendWhatsAppTemplate(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  contentSid: string,
  contentVariables?: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    // Ensure numbers have whatsapp: prefix
    const fromNumber = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    // Build form data for Twilio API
    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', toNumber);
    formData.append('ContentSid', contentSid);
    
    if (contentVariables) {
      formData.append('ContentVariables', contentVariables);
    }

    // Make request to Twilio Messages API
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sendWhatsAppTemplate] Twilio API error:', errorText);
      return { success: false, error: `Twilio API error: ${response.status}` };
    }

    const result = await response.json();
    console.log('[sendWhatsAppTemplate] Message sent successfully:', result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('[sendWhatsAppTemplate] Error:', error);
    return { success: false, error: String(error) };
  }
}
