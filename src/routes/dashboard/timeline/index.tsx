import { createFileRoute } from '@tanstack/react-router';
import { Timeline } from '@/components/timeline/Timeline';
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute('/dashboard/timeline/')({
  component: TimelinePage,
  head: () => {
    const pageUrl = getCanonicalUrl("/dashboard/timeline");
    const title = "Financial Timeline | Moneko - Track Your Financial Journey";
    const description = "Visualize your financial journey and key milestones with Moneko's interactive timeline. See your progress and plan for the future.";
    const keywords = "financial timeline, money journey, financial milestones, Moneko, personal finance history, financial planning";
    const imageUrl = "https://moneko.io/og-img.png"; // Generic OG image

    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": title,
      "description": description,
      "url": pageUrl,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Dashboard",
            "item": getCanonicalUrl("/dashboard")
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Timeline",
            "item": pageUrl
          }
        ]
      }
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});

function TimelinePage() {
  return (
      <Timeline />
  );
}