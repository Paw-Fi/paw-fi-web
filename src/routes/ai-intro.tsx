import { createFileRoute } from '@tanstack/react-router';
import { AIIntroComponent } from '@/components/onboarding/ai-intro-component';

import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute('/ai-intro')({
  component: AIIntroPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/ai-intro");
    const title = "Moneko AI Introduction: Your Smart Financial Assistant";
    const description = "Meet Moneko AI, your personalized financial assistant. Get smart insights, tailored advice, and automated financial planning to achieve your goals faster.";
    const keywords = "Moneko AI, AI financial assistant, smart financial planning, AI financial advice, automated finance, personal finance AI";
    const imageUrl = "https://moneko.io/og-img.png"; // Generic OG image

    return {
      meta: seo({
        title,
        description,
        keywords,
        image: imageUrl,
        url: pageUrl,
      }),
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

function AIIntroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/50 dark:to-gray-900">
      <AIIntroComponent className="h-screen" />
    </div>
  );
}
