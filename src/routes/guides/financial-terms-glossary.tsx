import { createFileRoute } from '@tanstack/react-router';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { StructuredData } from '@/components/seo/structured-data';
import { FINANCIAL_GLOSSARY } from '@/components/ui/financial-tooltip';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBookOpen } from '@fortawesome/free-solid-svg-icons';

export const Route = createFileRoute('/guides/financial-terms-glossary')(
  {
    component: FinancialGlossary,
    head: () => {
      const pageUrl = getCanonicalUrl('/guides/financial-terms-glossary');
      const title = 'Complete Financial Terms Glossary | 50+ Definitions | Moneko';
      const description = 'Comprehensive glossary of financial terms with real-world examples and expert sources. Learn investing, retirement, mortgage, and debt terminology.';
      const keywords = 'financial terms glossary, investment definitions, finance dictionary, financial literacy, money terms explained';

      const meta = seo({
        title,
        description,
        keywords,
        image: 'https://moneko.io/og-img.png',
        url: pageUrl,
      });

      return {
        meta,
        links: [
          {
            rel: 'canonical',
            href: pageUrl,
          },
        ],
      };
    },
  }
);

function FinancialGlossary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Categorize terms
  const categories = {
    'all': 'All Terms',
    'investment': 'Investment & Trading',
    'retirement': 'Retirement Planning', 
    'mortgage': 'Home & Mortgage',
    'debt': 'Debt & Credit',
    'insurance': 'Insurance',
    'tax': 'Tax Planning'
  };

  const termCategories: Record<string, string> = {
    'initial investment': 'investment',
    'annual contribution': 'investment',
    'annual return': 'investment',
    'compounding frequency': 'investment',
    'compound interest': 'investment',
    'asset allocation': 'investment',
    'expense ratio': 'investment',
    'diversification': 'investment',
    'dollar cost averaging': 'investment',
    '401k': 'retirement',
    'roth ira': 'retirement',
    'vesting': 'retirement',
    'required minimum distribution': 'retirement',
    'amortization': 'mortgage',
    'apr': 'mortgage',
    'loan to value': 'mortgage',
    'points': 'mortgage',
    'pmi': 'mortgage',
    'debt to income ratio': 'debt',
    'credit utilization': 'debt',
    'debt avalanche': 'debt',
    'debt snowball': 'debt',
    'deductible': 'insurance',
    'term life insurance': 'insurance',
    'tax bracket': 'tax',
    'standard deduction': 'tax',
    'emergency fund': 'investment',
    'high yield savings': 'investment'
  };

  // Filter terms based on search and category
  const filteredTerms = Object.entries(FINANCIAL_GLOSSARY).filter(([term]) => {
    const matchesSearch = term.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || termCategories[term] === selectedCategory;
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
          description: "Comprehensive dictionary of financial terms covering investment, retirement, mortgage, debt, insurance, and tax terminology with expert sources and real-world examples.",
          author: {
            "@type": "Person",
            name: "Moneko Education Team",
            jobTitle: "Financial Education Specialists",
            url: "https://moneko.io/team"
          },
          datePublished: "2025-01-07T00:00:00Z",
          dateModified: "2025-01-07T00:00:00Z",
          publisher: {
            "@type": "Organization",
            name: "Moneko",
            logo: "https://moneko.io/icon.svg"
          },
          mainEntityOfPage: getCanonicalUrl('/guides/financial-terms-glossary'),
          wordCount: 4000,
          timeRequired: "PT20M",
          educationalLevel: "Beginner to Advanced",
          isAccessibleForFree: true,
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".definition-content", ".term-examples"]
          }
        }}
      />

      {/* FAQ Schema */}
      <StructuredData
        type="faq"
        data={[
          {
            question: "What is compound interest?",
            answer: "Compound interest is interest calculated on the initial principal and accumulated interest from previous periods. Einstein allegedly called it 'the eighth wonder of the world.' For example, if you invest $1,000 at 7% annually, you earn $70 in year 1. In year 2, you earn 7% on $1,070 = $74.90."
          },
          {
            question: "What's the difference between a 401(k) and IRA?",
            answer: "A 401(k) is an employer-sponsored retirement plan with higher contribution limits ($23,500 for 2025) and potential employer matching. An IRA is an individual retirement account you open independently with lower limits ($7,000 for 2025) but more investment flexibility."
          },
          {
            question: "What does APR mean on a loan?",
            answer: "Annual Percentage Rate (APR) includes not just the interest rate but also loan fees, providing the true cost of borrowing money annually. For example, a 6.5% interest rate might have a 6.8% APR when fees for origination, points, and insurance are included."
          },
          {
            question: "How is debt-to-income ratio calculated?",
            answer: "Debt-to-income ratio is your monthly debt payments divided by gross monthly income. For example, with $5,000 monthly income and $1,500 debt payments, your DTI is 30% (1,500 ÷ 5,000 = 0.30). Lenders prefer DTI ratios of 43% or lower."
          }
        ]}
      />

      <div className="container mx-auto px-4 py-4 md:px-8 lg:px-12">
        <HomeHeader />
        <div className="mt-4 mb-8">
          <BreadCrumbsHeader />
        </div>

        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-3xl font-bold text-center text-foreground dark:text-dark-foreground">
            Financial Terms Glossary
          </h1>
          <p className="mb-6 text-lg text-center text-gray-700 dark:text-gray-300">
            Master financial terminology with definitions, examples, and expert sources for 50+ essential terms.
          </p>

          {/* Content Attribution */}
          <div className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-4">
            <p className="mb-1"><strong>Last Updated:</strong> January 7, 2025 | <strong>Compiled by:</strong> Moneko Financial Education Team</p>
            <p><strong>Expert Sources:</strong> SEC, CFPB, IRS, Federal Reserve, Morningstar, CFA Institute, and leading financial institutions</p>
          </div>

          {/* Search and Filter */}
          <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <FontAwesomeIcon 
                  icon={faSearch} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                />
                <input
                  type="text"
                  placeholder="Search financial terms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground dark:text-dark-foreground focus:ring-2 focus:ring-primary min-w-[200px]"
                >
                  {Object.entries(categories).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Search Results Count */}
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
              Showing {sortedTerms.length} of {Object.keys(FINANCIAL_GLOSSARY).length} terms
            </div>
          </div>

          {/* Terms Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {sortedTerms.map(([term, definition]) => (
              <div 
                key={term}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-primary dark:text-primary capitalize">
                    {term}
                  </h3>
                  <span className="text-xs bg-primary/10 dark:bg-primary/20 text-primary px-2 py-1 rounded-full">
                    {categories[termCategories[term] as keyof typeof categories] || 'General'}
                  </span>
                </div>
                
                <div className="definition-content mb-4">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {definition.definition}
                  </p>
                </div>
                
                {definition.example && (
                  <div className="term-examples mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1 text-sm">
                      <FontAwesomeIcon icon={faBookOpen} className="mr-1" />
                      Example
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {definition.example}
                    </p>
                  </div>
                )}
                
                {definition.sources && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="font-medium">Sources: </span>
                    {definition.sources.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* No Results */}
          {sortedTerms.length === 0 && (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faSearch} className="text-4xl text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No terms found
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}

          {/* Educational Section */}
          <div className="mt-16 p-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">
              Why Financial Literacy Matters
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="p-4">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">85%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  of financially literate individuals feel confident about retirement planning
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Source: <a href="https://www.nfec.org/financial-literacy-research/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">National Financial Educators Council</a>
                </div>
              </div>
              
              <div className="p-4">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">$1,230</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  average annual cost of financial illiteracy per person
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Source: <a href="https://www.nfec.org/financial-literacy-research/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">NFEC Research Study</a>
                </div>
              </div>
              
              <div className="p-4">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">57%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  of US adults are considered financially literate
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Source: <a href="https://gflec.org/initiatives/fit/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Global Financial Literacy Excellence Center</a>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
                Understanding financial terminology is the first step toward making informed money decisions. 
                Each term you learn builds your confidence and ability to navigate complex financial choices.
              </p>
            </div>
          </div>

          {/* Categories Quick Reference */}
          <div className="mt-12 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-gray-200">
              Quick Category Reference
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(categories).filter(([key]) => key !== 'all').map(([key, label]) => {
                const termCount = Object.values(termCategories).filter(cat => cat === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`p-3 rounded-lg text-left border transition-colors ${
                      selectedCategory === key
                        ? 'bg-primary text-white border-primary'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{label}</div>
                    <div className="text-sm opacity-80">{termCount} terms</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-12 p-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Put Your Knowledge to Work</h2>
            <p className="mb-6">
              Now that you understand the terminology, use our calculators to apply these concepts to your financial planning.
            </p>
            <div className="space-x-4">
              <a href="/calculators/compound-calculator" className="inline-block bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Compound Calculator
              </a>
              <a href="/calculators/retirement-calculator" className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold border border-white hover:bg-green-700 transition-colors">
                Retirement Calculator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AmbientHaloLayout>
  );
}