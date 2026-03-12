import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute('/calculators/')({
  component: lazyRouteComponent(() => import("@/components/performance/calculators-index-route-component"), "CalculatorsIndexRouteComponent"),
  head: () => {
    const pageUrl = getCanonicalUrl('/calculators');
    const meta = seo({
      title: 'Financial Calculators - Investment & Planning Tools | Moneko',
      description: 'Calculate compound interest, mortgage payments, investment returns, retirement savings, and more with our comprehensive suite of free financial planning calculators.',
      keywords: 'financial calculators, compound interest calculator, mortgage calculator, retirement calculator, investment calculator, auto loan calculator, savings goal calculator, budgeting tools, financial planning',
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Financial Calculators",
      "description": "Interactive financial calculators to help with money management and financial planning",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Compound Interest Calculator",
          "url": getCanonicalUrl('/calculators/compound-calculator')
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Mortgage Calculator",
          "url": getCanonicalUrl('/calculators/mortgage-calculator')
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Investment Calculator",
          "url": getCanonicalUrl('/calculators/investment-calculator')
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Auto Loan Calculator",
          "url": getCanonicalUrl('/calculators/auto-loan-calculator')
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "Retirement Calculator",
          "url": getCanonicalUrl('/calculators/retirement-calculator')
        },
        {
          "@type": "ListItem",
          "position": 6,
          "name": "Savings Goal Calculator",
          "url": getCanonicalUrl('/calculators/saving-goals-calculator')
        }
      ]
    };
    
    return {
      meta,
      links: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});
