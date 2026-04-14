import { createFileRoute, Link } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

interface GuideListItem {
  slug: string;
  title: string;
  description: string;
}

export const Route = createFileRoute("/guides/")({
  component: GuidesIndexRoute,
  head: () => {
    const pageUrl = getCanonicalUrl("/guides");
    const title =
      "Personal Finance Guides | Step-by-Step Money Guides | Moneko";
    const description =
      "Browse step-by-step personal finance guides on saving, retirement, investing, home buying, net worth, and more.";

    const meta = seo({
      title,
      description,
      keywords:
        "personal finance guides, money guides, budgeting guides, investing guides, retirement guide, net worth guide, emergency fund guide",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Personal Finance Guides",
      description,
      url: pageUrl,
      mainEntity: {
        "@type": "ItemList",
        name: "Finance guides",
        itemListElement: GUIDES.map((guide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: getCanonicalUrl(`/guides/${guide.slug}`),
          name: guide.title,
        })),
      },
    };

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
});

function GuidesIndexRoute() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10">
        <h1 className="text-foreground text-4xl font-bold">
          Personal finance guides
        </h1>
        <p className="text-muted-foreground mt-3 max-w-3xl text-lg">
          Step-by-step explanations, examples, and calculators to help you make
          better money decisions.
        </p>
      </header>

      <section aria-label="Guides" className="grid gap-6 md:grid-cols-2">
        {GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            to={`/guides/${guide.slug}`}
            className="border-border/50 bg-moneko-background/90 hover:border-primary/40 block rounded-2xl border p-6 shadow-sm transition-colors"
          >
            <h2 className="text-foreground text-xl font-semibold">
              {guide.title}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {guide.description}
            </p>
            <span className="text-primary mt-4 inline-block text-sm font-medium">
              Read guide
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}

const GUIDES: GuideListItem[] = [
  {
    slug: "how-to-calculate-net-worth",
    title: "How to Calculate Net Worth",
    description:
      "A step-by-step breakdown of assets and liabilities, plus a simple template you can reuse.",
  },
  {
    slug: "how-to-calculate-emergency-fund",
    title: "How to Calculate an Emergency Fund",
    description:
      "Pick a target amount and timeline based on expenses, income stability, and dependents.",
  },
  {
    slug: "how-to-calculate-debt-to-income-ratio",
    title: "How to Calculate Debt-to-Income (DTI)",
    description:
      "Compute your DTI and understand the thresholds lenders typically look for.",
  },
  {
    slug: "how-to-calculate-take-home-pay",
    title: "How to Calculate Take-Home Pay",
    description:
      "Estimate your paycheck after taxes and deductions so your budget is based on reality.",
  },
  {
    slug: "when-will-i-reach-my-savings-goal",
    title: "When Will I Reach My Savings Goal?",
    description:
      "Translate a savings goal into a monthly plan and see how timing changes with contributions.",
  },
  {
    slug: "how-much-house-can-i-afford",
    title: "How Much House Can I Afford?",
    description:
      "Work from income, debts, down payment, and rates to estimate a comfortable home price.",
  },
  {
    slug: "what-will-my-house-payment-be",
    title: "What Will My House Payment Be?",
    description:
      "Estimate mortgage payment, taxes, insurance, and the impact of different loan terms.",
  },
  {
    slug: "how-much-do-i-need-to-retire",
    title: "How Much Do I Need to Retire?",
    description:
      "A practical framework to estimate a retirement target using spending, withdrawal rate, and timing.",
  },
  {
    slug: "should-i-pay-off-debt-or-save-first",
    title: "Should I Pay Off Debt or Save First?",
    description:
      "A decision checklist balancing interest rates, emergency reserves, and employer matching.",
  },
  {
    slug: "401k-vs-ira-complete-comparison",
    title: "401(k) vs IRA: Complete Comparison",
    description:
      "Compare contribution limits, tax treatment, and when each account makes the most sense.",
  },
  {
    slug: "complete-beginner-guide-to-investing",
    title: "Beginner Guide to Investing",
    description:
      "Understand accounts, diversification, and a simple long-term investing approach.",
  },
  {
    slug: "financial-terms-glossary",
    title: "Financial Terms Glossary",
    description:
      "50+ definitions with examples across investing, retirement, mortgages, and debt.",
  },
];
