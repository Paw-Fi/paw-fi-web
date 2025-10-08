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
  { name: '/verify', usage: '/verify', description: 'Get verification link to connect your account' },
  { name: '/setBudget', alias: ['/setbudget'], usage: '/setBudget <amount>', description: "Set today's budget using your preferred currency" },
  { name: '/setCurrency', alias: ['/setcurrency'], usage: '/setCurrency <ISO>', description: 'Set your preferred currency (e.g., USD, EUR, GBP)' },
  { name: '/expenses', usage: '/expenses', description: "List today's expenses with totals" },
  { name: '/addCategory', alias: ['/addcategory'], usage: '/addCategory <name>', description: 'Add a custom expense category' },
];

export function buildHelpMessage(helpImageUrl?: string): WhatsAppReply {
  const lines = [
    '🎉 *Welcome to Moneko Budgeting!*',
    '',
    '💬 *Free-form text:*',
    'Just type naturally, like:',
    '"I spent 4 on food and 2 on groceries today"',
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
  return `🔐 *Account Not Verified*\n\nTo use Moneko, you need to verify your WhatsApp number.\n\n📱 *Send this command:*\n*/verify*\n\nYou'll receive a verification link to connect your account.`;
}
