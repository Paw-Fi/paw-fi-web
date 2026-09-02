interface ProductFact {
  statement: string;
  source: string;
  verifiedAt: string;
}

export const productFacts = {
  ordinaryAiCapture: {
    statement:
      "Ordinary AI capture saves parsed transactions immediately. Users can open the saved entry to edit or delete it.",
    source:
      "moneko-mobile/lib/features/home/presentation/widgets/home_ai_fab.dart",
    verifiedAt: "2026-09-03",
  },
  recurringItems: {
    statement:
      "A scheduled recurring item is a forecast until its occurrence is confirmed; it is not completed spending automatically.",
    source:
      "moneko-obsidian-vault/moneko-app-file-relationship-architecture.md",
    verifiedAt: "2026-09-03",
  },
  walletCurrencies: {
    statement:
      "Wallet and transaction rows keep their native currency. Aggregate totals can convert included values into the selected display currency.",
    source: "AGENTS.md: Moneko Multi-Currency Behavior",
    verifiedAt: "2026-09-03",
  },
  walletTransfers: {
    statement:
      "Transfers are available only between Wallets with the same native currency.",
    source: "AGENTS.md: Moneko Multi-Currency Behavior",
    verifiedAt: "2026-09-03",
  },
  pricing: {
    statement:
      "Current prices, eligibility, trial offers, limits, and purchase terms are shown on Moneko's pricing page and at checkout.",
    source: "https://www.moneko.io/pricing",
    verifiedAt: "2026-09-03",
  },
  privacy: {
    statement:
      "Current privacy, processor, security, retention, and deletion terms are defined by Moneko's Privacy Policy.",
    source: "https://www.moneko.io/privacy-policy",
    verifiedAt: "2026-09-03",
  },
} as const satisfies Record<string, ProductFact>;
