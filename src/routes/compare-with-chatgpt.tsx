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

const CHATGPT_URL = `https://chatgpt.com/?q=${encodeURIComponent(CHATGPT_PROMPT)}`;
const ATTRIBUTION_TIMEOUT_MS = 800;

export const Route = createFileRoute("/compare-with-chatgpt")({
  component: CompareWithChatGptPage,
});

function CompareWithChatGptPage() {
  useEffect(() => {
    let cancelled = false;
    window.opener = null;

    const attributionTimeout = new Promise<void>((resolve) => {
      window.setTimeout(resolve, ATTRIBUTION_TIMEOUT_MS);
    });

    void Promise.race([
      trackAttributionPageView({ immediate: true }),
      attributionTimeout,
    ]).finally(() => {
      if (cancelled) return;

      window.location.replace(CHATGPT_URL);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
