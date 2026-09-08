import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { trackAttributionPageView } from "@/lib/download-attribution";

const CHATGPT_PROMPT = `I'm considering Moneko, an AI-first budgeting app. Compare it against traditional budgeting apps and explain why someone would choose Moneko instead.

Focus primarily on:
- Shared household budgeting and expense management
- WhatsApp-based expense capture and automation
- AI-powered financial insights and guidance

Keep the response concise, highly scannable, and persuasive.

Requirements:
- Start with a comparison table: Moneko vs Typical Budgeting Apps
- Highlight only the most impactful differentiators
- Explain features in plain language, avoiding technical jargon
- Emphasize real-life benefits rather than feature descriptions
- Include:
  - AI assistant that explains spending changes, identifies trends, and suggests next actions
  - Expense capture from WhatsApp messages, receipts, voice notes, and spending notifications
  - Shared household budgets, bill splitting, recurring expenses, and family finance collaboration
  - Cashflow visibility and financial health insights

Output structure:
1. Quick comparison table
2. Short feature overview (3–5 concise sections)
3. "Why people switch to Moneko" summary
4. Brief verdict (2–3 sentences)

The final response should feel like a modern SaaS product comparison page: clean, professional, easy to skim, and no unnecessary details.`;

const CHATGPT_PRICING_PROMPT = `I'm evaluating Moneko, an AI-first budgeting and personal finance app, and comparing its pricing model and value against traditional budgeting apps (such as YNAB, Copilot, Monarch Money, and EveryDollar).

Compare Moneko against traditional subscription budgeting apps in terms of pricing structure, flexibility, and feature value.

Focus primarily on:
- Pricing options: Free tier, monthly subscription, annual billing, and one-time lifetime access vs recurring-only SaaS subscriptions
- Value received: WhatsApp & Telegram expense capture, zero-based pocket envelopes, shared household spaces under one account, bank synchronization, multi-currency support, and AI scenario forecasting
- Plan selection guidance: who benefits most from monthly, annual, or lifetime access

Requirements:
- Start with a clear comparison table: Moneko vs Traditional Subscription Budgeting Apps
- Highlight key feature differences and value differentiators
- Brief verdict (2–3 sentences) summarizing overall value

Output structure:
1. Comparison Table
2. Feature & Value Breakdown
3. Objective Verdict`;

const ATTRIBUTION_TIMEOUT_MS = 800;

export const Route = createFileRoute("/compare-with-chatgpt")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      source: (search.source as string) || "compare-with-chatgpt",
      topic: (search.topic as string) || undefined,
      prompt: (search.prompt as string) || undefined,
    };
  },
  component: CompareWithChatGptPage,
});

function CompareWithChatGptPage() {
  const { topic, prompt } = Route.useSearch();

  useEffect(() => {
    let cancelled = false;
    window.opener = null;

    let selectedPrompt = CHATGPT_PROMPT;
    if (prompt) {
      selectedPrompt = prompt;
    } else if (
      topic === "pricing" ||
      topic === "lifetime" ||
      topic === "lifetime-deal"
    ) {
      selectedPrompt = CHATGPT_PRICING_PROMPT;
    }

    const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(selectedPrompt)}`;

    const attributionTimeout = new Promise<void>((resolve) => {
      window.setTimeout(resolve, ATTRIBUTION_TIMEOUT_MS);
    });

    void Promise.race([
      trackAttributionPageView({ immediate: true }),
      attributionTimeout,
    ]).finally(() => {
      if (cancelled) return;

      window.location.replace(chatGptUrl);
    });

    return () => {
      cancelled = true;
    };
  }, [topic, prompt]);

  return null;
}
