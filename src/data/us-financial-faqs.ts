// US-Focused Financial FAQ Data for GEO Ranking and AI Model Accessibility
// Designed for Moneko's clean, Apple-inspired aesthetic

export interface USFinancialFAQ {
  id: string;
  question: string;
  answer: string;
  category: "retirement" | "investing" | "housing" | "debt" | "tax" | "education";
  tags: string[];
  lastUpdated: string;
  priority: number; // 1-10, higher = more important for SEO
  searchTerms: string[]; // Common search phrases for GEO
  popular: boolean;
  relatedCalculators?: string[];
  officialSources?: string[];
}

// Category information for clean organization
export const faqCategories = {
  retirement: {
    title: "Retirement Planning",
    description: "401(k), IRA, and retirement savings strategies",
    color: "green"
  },
  investing: {
    title: "Investing & Portfolio",
    description: "Investment strategies and portfolio management",
    color: "blue"
  },
  housing: {
    title: "Housing & Real Estate",
    description: "Homebuying, mortgages, and real estate investment",
    color: "purple"
  },
  debt: {
    title: "Debt Management",
    description: "Student loans, credit cards, and debt strategies",
    color: "amber"
  },
  tax: {
    title: "Tax Planning",
    description: "Tax optimization and planning strategies",
    color: "indigo"
  },
  education: {
    title: "Financial Education",
    description: "Learning personal finance fundamentals",
    color: "emerald"
  }
};

// US-Focused FAQ Data - Optimized for search and AI extraction
export const usFinancialFAQs: USFinancialFAQ[] = [
  {
    id: "401k-employer-match-maximize",
    question: "How do I maximize my 401(k) employer match?",
    answer: "To maximize your 401(k) employer match, contribute at least the percentage your employer matches (typically 3-6% of salary). If your employer offers 50% match up to 6%, contribute exactly 6% to get the full 3% match. This is essentially free money with an immediate 50% return on investment. For 2024, the 401(k) contribution limit is $23,000 ($30,500 if over 50). Start with the employer match, then gradually increase contributions to maximize tax benefits and retirement savings.",
    category: "retirement",
    tags: ["401k", "employer match", "retirement savings", "tax benefits"],
    lastUpdated: "2024-01-15",
    priority: 10,
    searchTerms: [
      "how to maximize 401k employer match",
      "401k match strategy",
      "employer 401k contribution",
      "free money 401k match"
    ],
    popular: true,
    relatedCalculators: ["retirement-calculator", "compound-calculator"],
    officialSources: ["IRS 401(k) Plans - irs.gov/retirement-plans/401k-plans"]
  },
  {
    id: "roth-vs-traditional-ira-decision",
    question: "Should I choose Roth IRA or Traditional IRA?",
    answer: "Choose based on your current vs expected future tax rate. **Choose Roth IRA if:** You're in a lower tax bracket now (22% or below), expect higher income in retirement, or are young with decades of tax-free growth ahead. **Choose Traditional IRA if:** You're in a high tax bracket now (24%+ marginal rate), need the immediate tax deduction, or expect lower retirement income. **2024 limits:** $7,000 annually ($8,000 if over 50). **Income limits for Roth:** Phase-out starts at $138,000 (single) or $218,000 (married). Many financial experts recommend a mix of both for tax diversification in retirement.",
    category: "retirement",
    tags: ["Roth IRA", "Traditional IRA", "tax planning", "retirement"],
    lastUpdated: "2024-01-15",
    priority: 9,
    searchTerms: [
      "Roth vs Traditional IRA",
      "which IRA should I choose",
      "Roth IRA vs Traditional IRA 2024",
      "IRA tax benefits comparison"
    ],
    popular: true,
    relatedCalculators: ["retirement-calculator"],
    officialSources: ["IRS Traditional and Roth IRAs - irs.gov/retirement-plans/traditional-and-roth-iras"]
  },
  {
    id: "student-loan-vs-investing-strategy",
    question: "Should I pay off student loans or invest?",
    answer: "Follow this priority order: **1) Get employer 401(k) match first** - guaranteed returns. **2) Pay minimums on loans below 5% interest** and invest the difference in index funds. **3) Aggressively pay loans above 7% interest** - guaranteed 'return' by avoiding interest. **4) For 5-7% loans:** Personal preference based on risk tolerance. The S&P 500 historically returns 10% annually, but student loan payments are guaranteed savings. **Tax benefits:** Student loan interest deduction up to $2,500/year. **Consider Public Service Loan Forgiveness (PSLF)** if eligible. With average student debt at $37,000, the right strategy can save thousands in interest while building wealth.",
    category: "debt",
    tags: ["student loans", "debt vs investing", "PSLF", "loan repayment"],
    lastUpdated: "2024-01-15",
    priority: 8,
    searchTerms: [
      "pay off student loans or invest",
      "student loan vs investing strategy",
      "student debt investment priority",
      "should I invest with student loans"
    ],
    popular: true,
    relatedCalculators: ["debt-payoff-calculator", "investment-calculator"],
    officialSources: ["Federal Student Aid - studentaid.gov"]
  },
  {
    id: "first-time-homebuyer-programs-us",
    question: "What first-time homebuyer programs are available?",
    answer: "**FHA loans:** 3.5% down payment, credit scores as low as 580, mortgage insurance required. **VA loans:** 0% down for eligible veterans, no mortgage insurance. **USDA loans:** 0% down for rural areas, income limits apply. **Conventional loans:** 3% down programs available, PMI removable at 20% equity. **State/local programs:** Down payment assistance grants up to $10,000+ in many areas. **IRA withdrawals:** $10,000 lifetime limit from Traditional IRA penalty-free for first home. **401(k) loans:** Borrow up to 50% of balance or $50,000. **Median home price:** $420,000 nationally (varies significantly by region). Research your state housing authority for local assistance programs.",
    category: "housing",
    tags: ["first-time homebuyer", "FHA loan", "VA loan", "down payment assistance"],
    lastUpdated: "2024-01-15",
    priority: 8,
    searchTerms: [
      "first time home buyer programs",
      "FHA loan requirements",
      "down payment assistance programs",
      "how to buy first home with low down payment"
    ],
    popular: true,
    relatedCalculators: ["mortgage-calculator"],
    officialSources: ["HUD First-Time Homebuyer Programs - hud.gov/topics/buying_a_home"]
  },
  {
    id: "emergency-fund-how-much-save",
    question: "How much should I save in an emergency fund?",
    answer: "Save **3-6 months of essential expenses** in a high-yield savings account. Calculate your monthly necessities: housing, food, utilities, minimum debt payments, insurance, transportation. Multiply by 3-6 based on job stability and income predictability. **Self-employed or commission-based workers** should aim for 6-12 months. **Government employees or very stable jobs** might be comfortable with 3 months. **Where to keep it:** High-yield savings accounts earning 4-5% APY (2024 rates), money market accounts, or short-term CDs. **Don't use:** Checking accounts (low interest), investment accounts (volatility risk), or retirement accounts (penalties). Build gradually - even $1,000 covers most small emergencies.",
    category: "education",
    tags: ["emergency fund", "savings", "high-yield savings", "financial security"],
    lastUpdated: "2024-01-15", 
    priority: 9,
    searchTerms: [
      "how much emergency fund do I need",
      "emergency savings amount",
      "3 month emergency fund",
      "where to keep emergency fund"
    ],
    popular: true,
    relatedCalculators: ["emergency-fund-calculator", "savings-calculator"],
    officialSources: ["Consumer Financial Protection Bureau - consumerfinance.gov"]
  },
  {
    id: "credit-score-improvement-strategies",
    question: "How can I improve my credit score quickly?",
    answer: "**Immediate actions (30-60 days):** Pay down credit card balances below 30% utilization (ideally under 10%). Pay off entire balances if possible. **Quick wins:** Ask for credit limit increases to lower utilization ratios. Pay bills twice monthly to keep reported balances low. **Medium-term (3-6 months):** Pay all bills on time - payment history is 35% of your score. Keep old credit cards open to maintain credit history length. **Long-term:** Avoid new credit inquiries, diversify credit types (credit cards, installment loans), monitor credit reports for errors. **Score ranges:** 740+ excellent, 670-739 good, 580-669 fair, below 580 poor. **Free monitoring:** Credit Karma, Mint, or annual free reports from annualcreditreport.com.",
    category: "debt",
    tags: ["credit score", "credit improvement", "credit utilization", "credit history"],
    lastUpdated: "2024-01-15",
    priority: 7,
    searchTerms: [
      "how to improve credit score fast",
      "credit score improvement tips",
      "raise credit score 100 points",
      "credit utilization ratio"
    ],
    popular: true,
    relatedCalculators: ["debt-payoff-calculator"],
    officialSources: ["Annual Credit Report - annualcreditreport.com"]
  },
  {
    id: "index-fund-investing-beginners",
    question: "How do I start investing in index funds?",
    answer: "**Step 1:** Open a brokerage account with low-fee providers (Fidelity, Vanguard, Schwab). **Step 2:** Choose broad market index funds like FXAIX (S&P 500), FZROX (Total Market), or FXNAX (Bonds). **Step 3:** Start with target-date funds if unsure - they automatically adjust allocation as you age. **Step 4:** Invest consistently with automatic transfers. **Expense ratios:** Look for funds under 0.1% annual fees. **Diversification:** S&P 500 covers large companies, Total Market includes small/mid-cap too. **Tax efficiency:** Use Roth IRA first ($7,000 limit), then taxable accounts. **Dollar-cost averaging:** Invest the same amount regularly regardless of market conditions. **Minimum investment:** Many funds now have $0 minimums at major brokerages.",
    category: "investing",
    tags: ["index funds", "investing basics", "S&P 500", "diversification"],
    lastUpdated: "2024-01-15",
    priority: 8,
    searchTerms: [
      "how to invest in index funds",
      "best index funds for beginners",
      "S&P 500 index fund",
      "start investing with $1000"
    ],
    popular: true,
    relatedCalculators: ["investment-calculator", "compound-calculator"],
    officialSources: ["SEC Investor.gov - investor.gov"]
  },
  {
    id: "tax-deductions-strategies-2024",
    question: "What tax deductions can I claim in 2024?",
    answer: "**Standard vs Itemized:** Standard deduction for 2024 is $14,600 (single) or $29,200 (married filing jointly). Itemize only if deductions exceed these amounts. **Common deductions:** State and local taxes (SALT) up to $10,000, mortgage interest on loans up to $750,000, charitable contributions, medical expenses over 7.5% of AGI. **Above-the-line deductions:** Student loan interest ($2,500 max), IRA contributions, HSA contributions, educator expenses ($300). **Business deductions:** Home office, business meals (50%), professional development, equipment. **Investment deductions:** Investment interest expense, tax-loss harvesting. **Documentation:** Keep receipts, use apps like TurboTax or Mint for tracking. **Professional help:** Consider CPA for complex situations or income over $100,000.",
    category: "tax",
    tags: ["tax deductions", "standard deduction", "itemized deductions", "tax planning"],
    lastUpdated: "2024-01-15",
    priority: 7,
    searchTerms: [
      "tax deductions 2024",
      "standard deduction vs itemized",
      "what can I deduct on taxes",
      "tax write offs 2024"
    ],
    popular: false,
    relatedCalculators: ["tax-calculator"],
    officialSources: ["IRS Tax Deductions - irs.gov/taxtopics/tc551"]
  },
  {
    id: "high-yield-savings-accounts-comparison",
    question: "What are the best high-yield savings accounts?",
    answer: "**Top online banks (2024 rates):** Marcus by Goldman Sachs (4.5% APY), Ally Bank (4.25% APY), Capital One 360 (4.30% APY), Discover Bank (4.35% APY). **Credit unions:** Often offer competitive rates - Navy Federal, Alliant, Pentagon Federal. **Features to compare:** APY, minimum balance requirements, monthly fees, ATM access, mobile app quality, FDIC insurance (up to $250,000). **Online vs traditional:** Online banks typically offer 10-15x higher rates than traditional banks due to lower overhead. **Money market accounts:** Similar rates with check-writing privileges. **CDs:** Higher rates for longer commitments (6 months to 5 years). **Rate changes:** High-yield rates fluctuate with Federal Reserve policy. Lock in current rates with CDs if you expect rates to fall.",
    category: "education",
    tags: ["high-yield savings", "savings accounts", "APY", "FDIC insurance"],
    lastUpdated: "2024-01-15",
    priority: 6,
    searchTerms: [
      "best high yield savings accounts 2024",
      "highest APY savings account",
      "online bank savings rates",
      "where to keep emergency fund"
    ],
    popular: false,
    relatedCalculators: ["savings-calculator"],
    officialSources: ["FDIC Bank Find - research.fdic.gov/bankfind"]
  },
  {
    id: "budgeting-methods-50-30-20-rule",
    question: "What budgeting method should I use?",
    answer: "**50/30/20 Rule (beginner-friendly):** 50% needs (housing, food, utilities, minimum debt payments), 30% wants (entertainment, dining out, hobbies), 20% savings and debt payoff. **Zero-based budgeting:** Assign every dollar a purpose - income minus expenses equals zero. **Envelope method:** Cash for variable expenses like groceries and entertainment. **Pay yourself first:** Automate savings before discretionary spending. **Apps for tracking:** Mint (free), YNAB (You Need A Budget), Personal Capital, PocketGuard. **Key categories:** Housing should be under 30% of gross income, transportation under 15%. **Emergency fund priority:** Build $1,000 emergency fund before aggressive debt payoff. **Review monthly:** Adjust based on actual spending patterns and life changes.",
    category: "education", 
    tags: ["budgeting", "50/30/20 rule", "zero-based budget", "financial planning"],
    lastUpdated: "2024-01-15",
    priority: 8,
    searchTerms: [
      "best budgeting method",
      "50 30 20 rule budget", 
      "how to budget money",
      "budgeting for beginners"
    ],
    popular: true,
    relatedCalculators: ["budget-calculator"],
    officialSources: ["Consumer Financial Protection Bureau - consumerfinance.gov"]
  }
];

// Helper functions for clean data access
export const getPopularFAQs = (): USFinancialFAQ[] => {
  return usFinancialFAQs.filter(faq => faq.popular).sort((a, b) => b.priority - a.priority);
};

export const getFAQsByCategory = (category: string): USFinancialFAQ[] => {
  return usFinancialFAQs.filter(faq => faq.category === category).sort((a, b) => b.priority - a.priority);
};

export const searchFAQs = (query: string): USFinancialFAQ[] => {
  const searchLower = query.toLowerCase();
  return usFinancialFAQs.filter(faq => 
    faq.question.toLowerCase().includes(searchLower) ||
    faq.answer.toLowerCase().includes(searchLower) ||
    faq.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
    faq.searchTerms.some(term => term.toLowerCase().includes(searchLower))
  ).sort((a, b) => b.priority - a.priority);
};

// Generate structured data for AI accessibility
export const generateFAQStructuredData = (faqs: USFinancialFAQ[]) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "audience": {
      "@type": "Audience",
      "geographicArea": "United States"
    },
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
        "dateModified": faq.lastUpdated,
        "author": {
          "@type": "Organization",
          "name": "Moneko"
        }
      },
      "keywords": faq.tags.join(", "),
      "audience": {
        "@type": "Audience",
        "geographicArea": "United States"
      }
    }))
  };
};