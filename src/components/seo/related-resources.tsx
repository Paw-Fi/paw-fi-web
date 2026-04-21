import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface RelatedResource {
  href: string;
  title: string;
  description?: string;
  kind?: "Guide" | "Calculator" | "Question";
}

interface RelatedResourcesProps {
  title?: string;
  resources: RelatedResource[];
  className?: string;
}

export function RelatedResources({
  title = "Related resources",
  resources,
  className = "",
}: RelatedResourcesProps) {
  if (!resources.length) return null;

  return (
    <section className={className} aria-labelledby="related-resources-title">
      <div className="mb-4">
        <h2
          id="related-resources-title"
          className="text-foreground text-xl font-bold"
        >
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Helpful next steps: guides, calculators, and related questions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <a key={resource.href} href={resource.href} className="group block">
            <Card className="group-hover:border-primary/50 h-full transition-colors">
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{resource.title}</CardTitle>
                  {resource.kind ? (
                    <span className="text-muted-foreground border-subtle-border rounded-full border px-2 py-0.5 text-xs">
                      {resource.kind}
                    </span>
                  ) : null}
                </div>
                {resource.description ? (
                  <CardDescription>{resource.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-primary text-sm font-medium">Open</span>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}

interface RelatedForQuestionInput {
  questionSlug: string;
  keywords?: string;
  category?: string;
}

function hasAny(haystack: string, needles: string[]) {
  const value = haystack.toLowerCase();
  return needles.some((needle) => value.includes(needle));
}

function uniqueByHref(resources: RelatedResource[]) {
  const seen = new Set<string>();
  const result: RelatedResource[] = [];

  for (const resource of resources) {
    if (seen.has(resource.href)) continue;
    seen.add(resource.href);
    result.push(resource);
  }

  return result;
}

export function getRelatedResourcesForQuestion({
  questionSlug,
  keywords,
  category,
}: RelatedForQuestionInput): RelatedResource[] {
  const haystack = `${questionSlug} ${keywords ?? ""} ${category ?? ""}`;

  const base: RelatedResource[] = [
    {
      href: "/questions",
      title: "Browse more financial questions",
      description: "Explore related topics by category.",
      kind: "Question",
    },
    {
      href: "/calculators",
      title: "Try a financial calculator",
      description: "Run quick numbers for your situation.",
      kind: "Calculator",
    },
  ];

  const related: RelatedResource[] = [];

  if (
    hasAny(haystack, ["emergency", "emergency-fund", "rainy", "safety net"])
  ) {
    related.push(
      {
        href: "/guides/how-to-calculate-emergency-fund",
        title: "How to calculate your emergency fund",
        description: "Pick a target amount and timeline.",
        kind: "Guide",
      },
      {
        href: "/calculators/saving-goals-calculator",
        title: "Savings goal calculator",
        description: "Turn your goal into a monthly plan.",
        kind: "Calculator",
      },
    );
  }

  if (hasAny(haystack, ["mortgage", "house", "home", "rent", "buy"])) {
    related.push(
      {
        href: "/guides/how-much-house-can-i-afford",
        title: "How much house can I afford?",
        description: "Work from income, debts, and down payment.",
        kind: "Guide",
      },
      {
        href: "/calculators/mortgage-calculator",
        title: "Mortgage calculator",
        description: "Estimate monthly payment and total cost.",
        kind: "Calculator",
      },
    );
  }

  if (hasAny(haystack, ["dti", "debt-to-income", "debt to income"])) {
    related.push(
      {
        href: "/guides/how-to-calculate-debt-to-income-ratio",
        title: "How to calculate debt-to-income (DTI)",
        description: "Understand what lenders look at.",
        kind: "Guide",
      },
      {
        href: "/calculators/mortgage-calculator",
        title: "Mortgage calculator",
        description: "See how loan terms affect affordability.",
        kind: "Calculator",
      },
    );
  }

  if (hasAny(haystack, ["net-worth", "net worth"])) {
    related.push({
      href: "/guides/how-to-calculate-net-worth",
      title: "How to calculate your net worth",
      description: "Assets minus liabilities, step by step.",
      kind: "Guide",
    });
  }

  if (hasAny(haystack, ["retire", "retirement", "401k", "ira", "roth"])) {
    related.push(
      {
        href: "/guides/how-much-do-i-need-to-retire",
        title: "How much do I need to retire?",
        description: "Estimate a target and savings rate.",
        kind: "Guide",
      },
      {
        href: "/calculators/retirement-calculator",
        title: "Retirement calculator",
        description: "Project contributions and balances over time.",
        kind: "Calculator",
      },
      {
        href: "/guides/401k-vs-ira-complete-comparison",
        title: "401(k) vs IRA",
        description: "Compare account types and tradeoffs.",
        kind: "Guide",
      },
    );
  }

  if (
    hasAny(haystack, ["invest", "portfolio", "compound", "etf", "index fund"])
  ) {
    related.push(
      {
        href: "/guides/complete-beginner-guide-to-investing",
        title: "Beginner guide to investing",
        description: "Core concepts and common starting points.",
        kind: "Guide",
      },
      {
        href: "/calculators/investment-calculator",
        title: "Investment calculator",
        description: "Model contributions, time horizon, and return rate.",
        kind: "Calculator",
      },
      {
        href: "/calculators/compound-calculator",
        title: "Compound interest calculator",
        description: "See growth from compounding over time.",
        kind: "Calculator",
      },
    );
  }

  if (hasAny(haystack, ["take-home", "take home", "paycheck", "salary"])) {
    related.push({
      href: "/guides/how-to-calculate-take-home-pay",
      title: "How to calculate take-home pay",
      description: "Estimate net pay after taxes and deductions.",
      kind: "Guide",
    });
  }

  if (hasAny(haystack, ["savings", "saving", "goal", "down payment"])) {
    related.push(
      {
        href: "/guides/when-will-i-reach-my-savings-goal",
        title: "When will I reach my savings goal?",
        description: "Timeline planning for big purchases.",
        kind: "Guide",
      },
      {
        href: "/calculators/saving-goals-calculator",
        title: "Savings goal calculator",
        description: "Build a plan from your target amount.",
        kind: "Calculator",
      },
    );
  }

  return uniqueByHref([...related, ...base]);
}

export function getRelatedResourcesForGuide(
  guidePath: string,
): RelatedResource[] {
  const key = guidePath.startsWith("/guides/")
    ? guidePath
    : `/guides/${guidePath}`;

  const related: Record<string, RelatedResource[]> = {
    "/guides/how-to-calculate-emergency-fund": [
      {
        href: "/calculators/saving-goals-calculator",
        title: "Savings goal calculator",
        description: "Create a monthly savings plan.",
        kind: "Calculator",
      },
      {
        href: "/calculators/compound-calculator",
        title: "Compound interest calculator",
        description: "Estimate growth while you save.",
        kind: "Calculator",
      },
      {
        href: "/questions/emergency-fund-amount",
        title: "How much should I have in my emergency fund?",
        description: "A related question with a quick explanation.",
        kind: "Question",
      },
    ],
    "/guides/how-much-house-can-i-afford": [
      {
        href: "/calculators/mortgage-calculator",
        title: "Mortgage calculator",
        description: "Estimate monthly payments.",
        kind: "Calculator",
      },
      {
        href: "/guides/what-will-my-house-payment-be",
        title: "What will my house payment be?",
        description: "A deeper walkthrough of payment components.",
        kind: "Guide",
      },
      {
        href: "/questions/housing-market-rent-vs-buy",
        title: "Rent vs buy",
        description: "A related question about tradeoffs.",
        kind: "Question",
      },
    ],
    "/guides/how-to-calculate-debt-to-income-ratio": [
      {
        href: "/calculators/mortgage-calculator",
        title: "Mortgage calculator",
        description: "See how payments affect DTI.",
        kind: "Calculator",
      },
      {
        href: "/questions/how-to-get-out-of-credit-card-debt-fast",
        title: "How to get out of credit card debt fast",
        description: "A related question with practical steps.",
        kind: "Question",
      },
    ],
    "/guides/how-to-calculate-net-worth": [
      {
        href: "/questions/how-to-calculate-my-net-worth",
        title: "How to calculate my net worth",
        description: "A related question with quick guidance.",
        kind: "Question",
      },
      {
        href: "/calculators/retirement-calculator",
        title: "Retirement calculator",
        description: "Connect your net worth to long-term goals.",
        kind: "Calculator",
      },
    ],
    "/guides/how-to-calculate-take-home-pay": [
      {
        href: "/questions/remote-work-financial-planning",
        title: "Remote work taxes and deductions",
        description: "A related question about taxes.",
        kind: "Question",
      },
      {
        href: "/calculators/saving-goals-calculator",
        title: "Savings goal calculator",
        description: "Plan savings from your net pay.",
        kind: "Calculator",
      },
    ],
    "/guides/when-will-i-reach-my-savings-goal": [
      {
        href: "/calculators/saving-goals-calculator",
        title: "Savings goal calculator",
        description: "Find the monthly amount to hit your goal.",
        kind: "Calculator",
      },
      {
        href: "/calculators/compound-calculator",
        title: "Compound interest calculator",
        description: "Model growth with compounding.",
        kind: "Calculator",
      },
      {
        href: "/questions/house-down-payment-savings",
        title: "How to save for a down payment",
        description: "A related question for homebuyers.",
        kind: "Question",
      },
    ],
    "/guides/how-much-do-i-need-to-retire": [
      {
        href: "/calculators/retirement-calculator",
        title: "Retirement calculator",
        description: "Project savings over time.",
        kind: "Calculator",
      },
      {
        href: "/guides/401k-vs-ira-complete-comparison",
        title: "401(k) vs IRA",
        description: "Choose account types for your plan.",
        kind: "Guide",
      },
      {
        href: "/questions/how-to-retire-early-fire",
        title: "How to retire early (FIRE)",
        description: "A related question on early retirement.",
        kind: "Question",
      },
    ],
    "/guides/complete-beginner-guide-to-investing": [
      {
        href: "/calculators/investment-calculator",
        title: "Investment calculator",
        description: "Model contributions and return assumptions.",
        kind: "Calculator",
      },
      {
        href: "/calculators/compound-calculator",
        title: "Compound interest calculator",
        description: "See compounding in action.",
        kind: "Calculator",
      },
      {
        href: "/questions/how-to-start-investing-100-dollars",
        title: "How to start investing with $100",
        description: "A related beginner question.",
        kind: "Question",
      },
    ],
    "/guides/401k-vs-ira-complete-comparison": [
      {
        href: "/calculators/retirement-calculator",
        title: "Retirement calculator",
        description: "Compare savings scenarios.",
        kind: "Calculator",
      },
      {
        href: "/questions/roth-ira-vs-traditional-ira",
        title: "Roth IRA vs Traditional IRA",
        description: "A related question on account selection.",
        kind: "Question",
      },
    ],
    "/guides/what-will-my-house-payment-be": [
      {
        href: "/calculators/mortgage-calculator",
        title: "Mortgage calculator",
        description: "Estimate a payment breakdown.",
        kind: "Calculator",
      },
      {
        href: "/guides/how-much-house-can-i-afford",
        title: "How much house can I afford?",
        description: "Connect payment to affordability.",
        kind: "Guide",
      },
    ],
    "/guides/should-i-pay-off-debt-or-save-first": [
      {
        href: "/calculators/compound-calculator",
        title: "Compound interest calculator",
        description: "Compare growth vs payoff scenarios.",
        kind: "Calculator",
      },
      {
        href: "/questions/how-to-get-out-of-credit-card-debt-fast",
        title: "How to get out of credit card debt fast",
        description: "A related question on debt payoff strategy.",
        kind: "Question",
      },
    ],
    "/guides/financial-terms-glossary": [
      {
        href: "/calculators/compound-calculator",
        title: "Compound interest calculator",
        description: "Try a concept from the glossary.",
        kind: "Calculator",
      },
      {
        href: "/questions/how-to-calculate-my-net-worth",
        title: "How to calculate my net worth",
        description: "Put terms into practice.",
        kind: "Question",
      },
    ],
  };

  return (
    related[key] ?? [
      {
        href: "/questions",
        title: "Browse financial questions",
        description: "Explore related topics by category.",
        kind: "Question",
      },
      {
        href: "/calculators",
        title: "Try a financial calculator",
        description: "Run quick numbers for your situation.",
        kind: "Calculator",
      },
    ]
  );
}

export function getRelatedResourcesForCalculator(
  calculatorPath: string,
): RelatedResource[] {
  const key = calculatorPath.startsWith("/calculators/")
    ? calculatorPath
    : `/calculators/${calculatorPath}`;

  const related: Record<string, RelatedResource[]> = {
    "/calculators/mortgage-calculator": [
      {
        href: "/guides/how-much-house-can-i-afford",
        title: "How much house can I afford?",
        description: "Affordability rules and inputs to consider.",
        kind: "Guide",
      },
      {
        href: "/guides/what-will-my-house-payment-be",
        title: "What will my house payment be?",
        description: "Understand principal, interest, taxes, and insurance.",
        kind: "Guide",
      },
      {
        href: "/questions/housing-market-rent-vs-buy",
        title: "Rent vs buy",
        description: "A related question on tradeoffs.",
        kind: "Question",
      },
    ],
    "/calculators/compound-calculator": [
      {
        href: "/guides/complete-beginner-guide-to-investing",
        title: "Beginner guide to investing",
        description: "Core investing concepts.",
        kind: "Guide",
      },
      {
        href: "/calculators/investment-calculator",
        title: "Investment calculator",
        description: "Model contributions and scenarios.",
        kind: "Calculator",
      },
      {
        href: "/questions/how-to-start-investing-100-dollars",
        title: "How to start investing with $100",
        description: "A related beginner question.",
        kind: "Question",
      },
    ],
    "/calculators/investment-calculator": [
      {
        href: "/guides/complete-beginner-guide-to-investing",
        title: "Beginner guide to investing",
        description: "Get the basics before choosing inputs.",
        kind: "Guide",
      },
      {
        href: "/calculators/compound-calculator",
        title: "Compound interest calculator",
        description: "Model simple compounding.",
        kind: "Calculator",
      },
      {
        href: "/questions/how-to-start-investing-100-dollars",
        title: "How to start investing with $100",
        description: "A related beginner question.",
        kind: "Question",
      },
    ],
    "/calculators/retirement-calculator": [
      {
        href: "/guides/how-much-do-i-need-to-retire",
        title: "How much do I need to retire?",
        description: "Common starting points and assumptions.",
        kind: "Guide",
      },
      {
        href: "/guides/401k-vs-ira-complete-comparison",
        title: "401(k) vs IRA",
        description: "How account types differ.",
        kind: "Guide",
      },
      {
        href: "/questions/how-to-retire-early-fire",
        title: "How to retire early (FIRE)",
        description: "A related question on early retirement.",
        kind: "Question",
      },
    ],
    "/calculators/saving-goals-calculator": [
      {
        href: "/guides/when-will-i-reach-my-savings-goal",
        title: "When will I reach my savings goal?",
        description: "Plan your timeline and monthly amount.",
        kind: "Guide",
      },
      {
        href: "/guides/how-to-calculate-emergency-fund",
        title: "How to calculate your emergency fund",
        description: "Pick a target amount and timeline.",
        kind: "Guide",
      },
      {
        href: "/questions/emergency-fund-amount",
        title: "How much should I have in my emergency fund?",
        description: "A related question about target size.",
        kind: "Question",
      },
    ],
    "/calculators/auto-loan-calculator": [
      {
        href: "/guides/how-to-calculate-debt-to-income-ratio",
        title: "How to calculate debt-to-income (DTI)",
        description: "Understand what lenders look at.",
        kind: "Guide",
      },
      {
        href: "/calculators/compound-calculator",
        title: "Compound interest calculator",
        description: "Compare financing vs saving.",
        kind: "Calculator",
      },
      {
        href: "/questions/how-to-get-out-of-credit-card-debt-fast",
        title: "How to get out of credit card debt fast",
        description: "A related question on debt strategy.",
        kind: "Question",
      },
    ],
  };

  return (
    related[key] ?? [
      {
        href: "/calculators",
        title: "Explore calculators",
        description: "Browse all tools.",
        kind: "Calculator",
      },
      {
        href: "/questions",
        title: "Browse financial questions",
        description: "Explore related topics.",
        kind: "Question",
      },
    ]
  );
}
