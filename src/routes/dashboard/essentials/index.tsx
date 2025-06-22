import { createFileRoute } from "@tanstack/react-router";
import { LearningPage } from "../learning";
import { seo } from "@/utils/seo";

export const Route = createFileRoute("/dashboard/essentials/")({
  component: Essentials,
  head: () => {
    const pageUrl = "https://moneko.io/essentials/";
    const meta = seo({
      title: "Moneko: Essential Financial Lessons",
      description: "Master the essentials of personal finance with Moneko's curated lessons on budgeting, investing, and financial planning.",
      keywords: "financial essentials, basic finance lessons, Moneko, financial education, money basics, personal finance fundamentals",
      image: "https://paw-fi.app/og-img.png",
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl
        }
      ]
    };
  },
});

function Essentials() {
  // Pass source='local' as a prop to LearningPage
  return <LearningPage dataSource="local" />;
}
