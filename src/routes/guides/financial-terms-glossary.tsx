import { createFileRoute } from "@tanstack/react-router";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { HomeHeader } from "@/components/index/header";
import BreadCrumbsHeader from "@/components/ui/breadcrumbs";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { StructuredData } from "@/components/seo/structured-data";
import { FINANCIAL_GLOSSARY } from "@/components/ui/financial-tooltip";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBookOpen } from "@fortawesome/free-solid-svg-icons";
import {
  RelatedResources,
  getRelatedResourcesForGuide,
} from "@/components/seo/related-resources";

export const Route = createFileRoute("/guides/financial-terms-glossary")({
  component: FinancialGlossary,
  head: () => {
    const pageUrl = getCanonicalUrl("/guides/financial-terms-glossary");
    const title =
      "Complete Financial Terms Glossary | 50+ Definitions | Moneko";
    const description =
      "Comprehensive glossary of financial terms with real-world examples and expert sources. Learn investing, retirement, mortgage, and debt terminology.";
    const keywords =
      "financial terms glossary, investment definitions, finance dictionary, financial literacy, money terms explained";

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

function FinancialGlossary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Categorize terms
  const categories = {
    all: "All Terms",
    investment: "Investment & Trading",
    retirement: "Retirement Planning",
    mortgage: "Home & Mortgage",
    debt: "Debt & Credit",
    insurance: "Insurance",
    tax: "Tax Planning",
  };

  const termCategories: Record<string, string> = {
    "initial investment": "investment",
    "annual contribution": "investment",
    "annual return": "investment",
    "compounding frequency": "investment",
    "compound interest": "investment",
    "asset allocation": "investment",
    "expense ratio": "investment",
    diversification: "investment",
    "dollar cost averaging": "investment",
    "401k": "retirement",
    "roth ira": "retirement",
    vesting: "retirement",
    "required minimum distribution": "retirement",
    amortization: "mortgage",
    apr: "mortgage",
    "loan to value": "mortgage",
    points: "mortgage",
    pmi: "mortgage",
    "debt to income ratio": "debt",
    "credit utilization": "debt",
    "debt avalanche": "debt",
    "debt snowball": "debt",
    deductible: "insurance",
    "term life insurance": "insurance",
    "tax bracket": "tax",
    "standard deduction": "tax",
    "emergency fund": "investment",
    "high yield savings": "investment",
  };

  // Filter terms based on search and category
  const filteredTerms = Object.entries(FINANCIAL_GLOSSARY).filter(([term]) => {
    const matchesSearch = term.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || termCategories[term] === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort alphabetically
  const sortedTerms = filteredTerms.sort(([a], [b]) => a.localeCompare(b));

  return (
    <AmbientHaloLayout>
      {/* Article Schema for Glossary */}
      <StructuredData
        type="article"
        data={{
          headline: "Complete Financial Terms Glossary",
          description:
            "Comprehensive dictionary of financial terms covering investment, retirement, mortgage, debt, insurance, and tax terminology with expert sources and real-world examples.",
          author: {
            "@type": "Person",
            name: "Moneko Education Team",
            jobTitle: "Financial Education Specialists",
            url: "https://moneko.io/team",
          },
          publisher: {
            "@type": "Organization",
            name: "Moneko",
            logo: "https://moneko.io/icon.svg",
          },
          mainEntityOfPage: getCanonicalUrl("/guides/financial-terms-glossary"),
          wordCount: 4000,
          timeRequired: "PT20M",
          educationalLevel: "Beginner to Advanced",
          isAccessibleForFree: true,
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".definition-content", ".term-examples"],
          },
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What is compound interest?",
            answer:
              "Compound interest is interest calculated on the initial principal and accumulated interest from previous periods. Einstein allegedly called it 'the eighth wonder of the world.' For example, if you invest $1,000 at 7% annually, you earn $70 in year 1. In year 2, you earn 7% on $1,070 = $74.90.",
          },
          {
            question: "What's the difference between a 401(k) and IRA?",
            answer:
              "A 401(k) is an employer-sponsored retirement plan with higher contribution limits ($23,500 for 2025) and potential employer matching. An IRA is an individual retirement account you open independently with lower limits ($7,000 for 2025) but more investment flexibility.",
          },
          {
            question: "What does APR mean on a loan?",
            answer:
              "Annual Percentage Rate (APR) includes not just the interest rate but also loan fees, providing the true cost of borrowing money annually. For example, a 6.5% interest rate might have a 6.8% APR when fees for origination, points, and insurance are included.",
          },
          {
            question: "How is debt-to-income ratio calculated?",
            answer:
              "Debt-to-income ratio is your monthly debt payments divided by gross monthly income. For example, with $5,000 monthly income and $1,500 debt payments, your DTI is 30% (1,500 ÷ 5,000 = 0.30). Lenders prefer DTI ratios of 43% or lower.",
          },
        ]}
      />

      <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
        <HomeHeader />
        <div className="mt-4 mb-8">
          <BreadCrumbsHeader />
        </div>

        <div className="mx-auto max-w-6xl">
          <h1 className="text-foreground dark:text-dark-foreground mb-8 text-center text-3xl font-bold">
            Financial Terms Glossary
          </h1>
          <p className="mb-6 text-center text-lg text-gray-700 dark:text-gray-300">
            Master financial terminology with definitions, examples, and expert
            sources for 50+ essential terms.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 border-t border-b border-gray-200 py-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <p className="mb-1">
              <strong>Last Updated:</strong> January 7, 2025 |{" "}
              <strong>Compiled by:</strong> Moneko Financial Education Team
            </p>
            <p>
              <strong>Expert Sources:</strong> SEC, CFPB, IRS, Federal Reserve,
              Morningstar, CFA Institute, and leading financial institutions
            </p>
          </div>

          {/* Search and Filter */}
          <div className="mb-8 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <div className="relative flex-1">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search financial terms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-foreground dark:text-dark-foreground focus:ring-primary w-full rounded-lg border border-gray-300 bg-white py-3 pr-4 pl-10 focus:ring-2 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-foreground dark:text-dark-foreground focus:ring-primary min-w-[200px] rounded-lg border border-gray-300 bg-white px-4 py-3 focus:ring-2 dark:border-gray-600 dark:bg-gray-700"
                >
                  {Object.entries(categories).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Results Count */}
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Showing {sortedTerms.length} of{" "}
              {Object.keys(FINANCIAL_GLOSSARY).length} terms
            </div>
          </div>

          {/* Terms Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {sortedTerms.map(([term, definition]) => (
              <div
                key={term}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="text-primary dark:text-primary text-xl font-bold capitalize">
                    {term}
                  </h3>
                  <span className="bg-primary/10 dark:bg-primary/20 text-primary rounded-full px-2 py-1 text-xs">
                    {categories[
                      termCategories[term] as keyof typeof categories
                    ] || "General"}
                  </span>
                </div>

                <div className="definition-content mb-4">
                  <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                    {definition.definition}
                  </p>
                </div>

                {definition.example && (
                  <div className="term-examples mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                    <h4 className="mb-1 text-sm font-semibold text-blue-800 dark:text-blue-300">
                      <FontAwesomeIcon icon={faBookOpen} className="mr-1" />
                      Example
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {definition.example}
                    </p>
                  </div>
                )}

                {definition.sources && (
                  <div className="border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    <span className="font-medium">Sources: </span>
                    {definition.sources.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* No Results */}
          {sortedTerms.length === 0 && (
            <div className="py-12 text-center">
              <FontAwesomeIcon
                icon={faSearch}
                className="mb-4 text-4xl text-gray-400"
              />
              <h3 className="mb-2 text-xl font-semibold text-gray-600 dark:text-gray-400">
                No terms found
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}

          {/* Educational Section */}
          <div className="mt-16 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 p-8 dark:from-purple-900/20 dark:to-blue-900/20">
            <h2 className="mb-6 text-center text-2xl font-bold text-gray-800 dark:text-gray-200">
              Why Financial Literacy Matters
            </h2>

            <div className="grid gap-6 text-center md:grid-cols-3">
              <div className="p-4">
                <div className="mb-2 text-3xl font-bold text-green-600 dark:text-green-400">
                  85%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  of financially literate individuals feel confident about
                  retirement planning
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Source:{" "}
                  <a
                    href="https://www.nfec.org/financial-literacy-research/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    National Financial Educators Council
                  </a>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
                  $1,230
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  average annual cost of financial illiteracy per person
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Source:{" "}
                  <a
                    href="https://www.nfec.org/financial-literacy-research/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    NFEC Research Study
                  </a>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-2 text-3xl font-bold text-purple-600 dark:text-purple-400">
                  57%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  of US adults are considered financially literate
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  Source:{" "}
                  <a
                    href="https://gflec.org/initiatives/fit/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Global Financial Literacy Excellence Center
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="mx-auto max-w-2xl text-gray-700 dark:text-gray-300">
                Understanding financial terminology is the first step toward
                making informed money decisions. Each term you learn builds your
                confidence and ability to navigate complex financial choices.
              </p>
            </div>
          </div>

          {/* Categories Quick Reference */}
          <div className="mt-12 rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 text-center text-xl font-bold text-gray-800 dark:text-gray-200">
              Quick Category Reference
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Object.entries(categories)
                .filter(([key]) => key !== "all")
                .map(([key, label]) => {
                  const termCount = Object.values(termCategories).filter(
                    (cat) => cat === key,
                  ).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selectedCategory === key
                          ? "bg-primary border-primary text-white"
                          : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                      }`}
                    >
                      <div className="font-medium">{label}</div>
                      <div className="text-sm opacity-80">
                        {termCount} terms
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-12 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 p-6 text-center text-white">
            <h2 className="mb-4 text-2xl font-bold">
              Put Your Knowledge to Work
            </h2>
            <p className="mb-6">
              Now that you understand the terminology, use our calculators to
              apply these concepts to your financial planning.
            </p>
            <div className="space-x-4">
              <a
                href="/calculators/compound-calculator"
                className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-green-600 transition-colors hover:bg-gray-100"
              >
                Compound Calculator
              </a>
              <a
                href="/calculators/retirement-calculator"
                className="inline-block rounded-lg border border-white bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
              >
                Retirement Calculator
              </a>
            </div>
          </div>

          <RelatedResources
            className="mt-12"
            title="Related guides and calculators"
            resources={getRelatedResourcesForGuide(
              "/guides/financial-terms-glossary",
            )}
          />
        </div>
      </div>
    </AmbientHaloLayout>
  );
}
