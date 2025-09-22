// Regional FAQ Data for Geo-targeted SEO and AI Model Accessibility
// Comprehensive financial guidance tailored to specific regions

export interface RegionalFAQ {
  id: string;
  question: string;
  answer: string;
  category: "security" | "ai" | "pricing" | "education" | "investing" | "support" | "regional-finance" | "tax-planning" | "retirement" | "housing";
  region: "global" | "us" | "ca" | "uk" | "au" | "ie" | "sg" | "nz";
  tags: string[];
  lastUpdated: string;
  priority: number; // 1-10, higher = more important
  relatedRegulations?: string[];
  localResources?: LocalResource[];
  currency: string;
  icon: any;
  popular: boolean;
}

export interface LocalResource {
  name: string;
  url: string;
  type: "government" | "regulatory" | "calculator" | "guide";
}

export interface RegionInfo {
  code: string;
  name: string;
  currency: string;
  taxYear: string;
  regulatoryBody: string;
  commonChallenges: string[];
}

// Regional Information
export const regionInfo: Record<string, RegionInfo> = {
  us: {
    code: "us",
    name: "United States",
    currency: "USD",
    taxYear: "2024",
    regulatoryBody: "SEC, IRS",
    commonChallenges: ["Student loans", "Healthcare costs", "401k optimization", "State tax variations"]
  },
  ca: {
    code: "ca", 
    name: "Canada",
    currency: "CAD",
    taxYear: "2024",
    regulatoryBody: "CRA, OSFI",
    commonChallenges: ["RRSP vs TFSA", "Housing affordability", "Provincial tax differences", "Currency hedging"]
  },
  uk: {
    code: "uk",
    name: "United Kingdom", 
    currency: "GBP",
    taxYear: "2024/25",
    regulatoryBody: "FCA, HMRC",
    commonChallenges: ["ISA limits", "Pension auto-enrollment", "Brexit impacts", "Property ladder"]
  },
  au: {
    code: "au",
    name: "Australia",
    currency: "AUD", 
    taxYear: "2023-24",
    regulatoryBody: "ASIC, ATO",
    commonChallenges: ["Superannuation", "Negative gearing", "Property prices", "FHSS scheme"]
  },
  ie: {
    code: "ie",
    name: "Ireland",
    currency: "EUR",
    taxYear: "2024", 
    regulatoryBody: "Central Bank of Ireland",
    commonChallenges: ["PRSA pensions", "Property taxes", "EU investment rules", "Help to Buy scheme"]
  },
  sg: {
    code: "sg",
    name: "Singapore",
    currency: "SGD",
    taxYear: "2024",
    regulatoryBody: "MAS, IRAS", 
    commonChallenges: ["CPF optimization", "HDB financing", "Investment restrictions", "Foreign investment"]
  },
  nz: {
    code: "nz",
    name: "New Zealand",
    currency: "NZD",
    taxYear: "2024",
    regulatoryBody: "FMA, IRD",
    commonChallenges: ["KiwiSaver optimization", "Property affordability", "Investment options", "Retirement planning"]
  }
};

// Import icons (reusing existing ones)
import { 
  faShieldAlt,
  faRobot,
  faDollarSign,
  faGraduationCap,
  faChartLine,
  faLock,
  faHeadset,
  faHome,
  faUniversity,
  faCalculator,
  faPiggyBank,
  faFileInvoiceDollar
} from "@fortawesome/free-solid-svg-icons";

// United States Regional FAQs
export const usRegionalFAQs: RegionalFAQ[] = [
  {
    id: "us-401k-match",
    question: "How do I maximize my 401(k) employer match in the US?",
    answer: "To maximize your 401(k) employer match: 1) Contribute at least the percentage your employer matches (typically 3-6% of salary). 2) If your employer offers 50% match up to 6%, contribute exactly 6% to get the full 3% match. 3) This is free money - a 50% immediate return on investment. 4) Contribute early in the year if possible to maximize compound growth. 5) If you can't afford the full match immediately, increase by 1% each quarter until you reach it. For 2024, the 401(k) contribution limit is $23,000 ($30,500 if over 50).",
    category: "retirement",
    region: "us",
    tags: ["401k", "employer match", "retirement", "tax-advantaged"],
    lastUpdated: "2024-01-15",
    priority: 10,
    currency: "USD",
    icon: faUniversity,
    popular: true,
    relatedRegulations: ["IRS Code Section 401(k)", "ERISA"],
    localResources: [
      {
        name: "IRS 401(k) Plans",
        url: "https://www.irs.gov/retirement-plans/401k-plans",
        type: "government"
      }
    ]
  },
  {
    id: "us-roth-vs-traditional",
    question: "Should I choose Roth IRA or Traditional IRA in the US?",
    answer: "Choose based on your current vs expected future tax rate: **Choose Roth IRA if:** You're in a lower tax bracket now (22% or below), expect higher income in retirement, or are young with decades to grow tax-free. **Choose Traditional IRA if:** You're in a high tax bracket now (24%+ marginal rate), need the immediate tax deduction, or expect lower retirement income. **2024 limits:** $7,000 annually ($8,000 if over 50). **Income limits for Roth:** Phase-out starts at $138,000 (single) or $218,000 (married). Many choose a mix of both for tax diversification.",
    category: "retirement", 
    region: "us",
    tags: ["IRA", "Roth", "Traditional", "tax planning", "retirement"],
    lastUpdated: "2024-01-15",
    priority: 9,
    currency: "USD",
    icon: faPiggyBank,
    popular: true,
    relatedRegulations: ["IRS Publication 590-A", "IRS Publication 590-B"],
    localResources: [
      {
        name: "IRA Comparison Tool",
        url: "https://www.irs.gov/retirement-plans/traditional-and-roth-iras",
        type: "government"
      }
    ]
  },
  {
    id: "us-student-loan-strategy",
    question: "What's the best strategy for paying off student loans while investing in the US?",
    answer: "Follow this priority order: 1) **Get employer 401(k) match first** - it's guaranteed returns. 2) **Pay minimums on loans below 5% interest** and invest the difference in index funds. 3) **Aggressively pay loans above 7% interest** - guaranteed 'return' by avoiding interest. 4) **For 5-7% loans:** It depends on risk tolerance. Historically, S&P 500 returns 10% annually, but consider your comfort with debt. 5) **Use tax benefits:** Student loan interest deduction up to $2,500/year. 6) **Consider Public Service Loan Forgiveness (PSLF)** if eligible. Average student debt is $37,000 - prioritizing high-interest debt saves thousands in interest.",
    category: "education",
    region: "us", 
    tags: ["student loans", "debt management", "investing", "PSLF"],
    lastUpdated: "2024-01-15",
    priority: 8,
    currency: "USD",
    icon: faGraduationCap,
    popular: true,
    relatedRegulations: ["Federal Student Aid", "PSLF Program"],
    localResources: [
      {
        name: "Federal Student Aid",
        url: "https://studentaid.gov/",
        type: "government"
      }
    ]
  },
  {
    id: "us-healthcare-retirement-costs",
    question: "How much should I save for healthcare costs in retirement in the US?",
    answer: "Plan for significant healthcare expenses: **Average costs:** $300,000+ per couple over retirement (Fidelity 2023 estimate). **Monthly estimates:** $400-700/month per person for Medicare premiums and supplements. **HSA strategy:** If eligible, maximize HSA contributions ($4,150 individual, $8,300 family for 2024, plus $1,000 catch-up if over 55). HSAs offer triple tax advantage for healthcare. **Medicare gaps:** Traditional Medicare covers ~80% of costs. Plan for long-term care (~$55,000/year average). **Start early:** Healthcare inflation outpaces general inflation. Consider this 20-30% of total retirement savings needs.",
    category: "retirement",
    region: "us",
    tags: ["healthcare", "Medicare", "HSA", "retirement planning", "long-term care"],
    lastUpdated: "2024-01-15", 
    priority: 8,
    currency: "USD",
    icon: faShieldAlt,
    popular: true,
    relatedRegulations: ["Medicare Act", "HSA regulations"],
    localResources: [
      {
        name: "Medicare.gov",
        url: "https://www.medicare.gov/",
        type: "government"
      }
    ]
  },
  {
    id: "us-state-tax-strategy",
    question: "How do state taxes affect my investment strategy in the US?",
    answer: "State tax considerations significantly impact strategy: **No state income tax states:** TX, FL, NV, WA, TN, SD, AK, WY, NH - favor Roth accounts less since no state tax benefit from Traditional. **High-tax states:** CA (13.3%), NY (8.82%), NJ (10.75%) - Traditional IRAs/401(k)s provide bigger immediate benefits. **Municipal bonds:** Interest often exempt from federal and home-state taxes - valuable in high-tax states. **Retirement location planning:** Some retirees move to no-tax states. **SALT deduction cap:** $10,000 limit affects high earners in high-tax states. **Tax-loss harvesting:** More valuable in high-tax jurisdictions. Consider domicile change implications for wealth preservation.",
    category: "tax-planning",
    region: "us",
    tags: ["state taxes", "tax strategy", "municipal bonds", "retirement planning"],
    lastUpdated: "2024-01-15",
    priority: 7,
    currency: "USD", 
    icon: faCalculator,
    popular: false,
    relatedRegulations: ["SALT deduction rules", "State tax codes"],
    localResources: [
      {
        name: "State Tax Information",
        url: "https://www.taxpolicycenter.org/briefing-book/how-do-state-and-local-individual-income-taxes-work",
        type: "guide"
      }
    ]
  },
  {
    id: "us-first-time-homebuyer",
    question: "What programs are available for first-time homebuyers in the US?",
    answer: "Multiple programs can help with homebuying: **FHA loans:** 3.5% down payment, credit scores as low as 580, mortgage insurance required. **VA loans:** 0% down for eligible veterans, no mortgage insurance. **USDA loans:** 0% down for rural areas, income limits apply. **Conventional loans:** 3% down programs available, PMI removable at 20% equity. **State/local programs:** Down payment assistance, grants up to $10,000+ in many areas. **IRA withdrawals:** $10,000 lifetime limit from Traditional IRA penalty-free for first home. **401(k) loans:** Borrow up to 50% of balance or $50,000. **Median home price:** $420,000 nationally (varies significantly by region). Research local housing authorities for additional assistance.",
    category: "housing",
    region: "us",
    tags: ["homebuying", "FHA", "VA loans", "down payment assistance", "first-time buyer"],
    lastUpdated: "2024-01-15",
    priority: 8,
    currency: "USD",
    icon: faHome,
    popular: true,
    relatedRegulations: ["FHA guidelines", "VA loan requirements"],
    localResources: [
      {
        name: "HUD First-Time Homebuyer Programs",
        url: "https://www.hud.gov/topics/buying_a_home",
        type: "government"
      }
    ]
  }
];

// Canada Regional FAQs
export const caRegionalFAQs: RegionalFAQ[] = [
  {
    id: "ca-rrsp-vs-tfsa",
    question: "RRSP vs TFSA: Which should I prioritize in Canada?",
    answer: "Choose based on your tax situation: **Prioritize RRSP if:** You're in a high tax bracket (26%+), expect lower retirement income, or need the immediate tax deduction. **Prioritize TFSA if:** You're in a low tax bracket, young with time to grow tax-free, or want flexibility to withdraw without penalties. **2024 limits:** RRSP - 18% of income up to $31,560; TFSA - $7,000 annually. **Best strategy:** Many Canadians use both - RRSP for current tax relief, TFSA for future tax-free growth. **Withdrawal rules:** TFSA withdrawals don't affect taxes or benefits; RRSP withdrawals are taxable income. Consider your marginal tax rate now vs retirement to optimize the mix.",
    category: "retirement",
    region: "ca",
    tags: ["RRSP", "TFSA", "tax planning", "retirement", "Canadian taxes"],
    lastUpdated: "2024-01-15",
    priority: 10,
    currency: "CAD",
    icon: faPiggyBank,
    popular: true,
    relatedRegulations: ["Income Tax Act", "CRA guidelines"],
    localResources: [
      {
        name: "CRA RRSP and TFSA Information",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-retirement-savings-plan-rrsp.html",
        type: "government"
      }
    ]
  },
  {
    id: "ca-home-buyers-plan",
    question: "How does the Home Buyers' Plan work for first-time buyers in Canada?",
    answer: "The Home Buyers' Plan (HBP) lets you withdraw from RRSP for your first home: **Withdrawal limit:** Up to $35,000 per person ($70,000 per couple) from RRSP. **Repayment:** Must repay over 15 years starting the second year after withdrawal. **No interest:** No interest charged, but you lose potential investment growth. **Eligibility:** First-time buyer (no home ownership in past 4 years), Canadian resident, must buy/build qualifying home. **Process:** 1) Make RRSP contribution, 2) Wait 90 days, 3) Apply for HBP withdrawal, 4) Buy home within year. **Alternative:** Consider regular down payment savings vs RRSP withdrawal - weigh immediate homeownership against long-term retirement savings.",
    category: "housing", 
    region: "ca",
    tags: ["Home Buyers Plan", "RRSP", "first-time buyer", "homebuying", "down payment"],
    lastUpdated: "2024-01-15",
    priority: 9,
    currency: "CAD",
    icon: faHome,
    popular: true,
    relatedRegulations: ["Income Tax Act Section 146.01"],
    localResources: [
      {
        name: "CRA Home Buyers' Plan",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/what-home-buyers-plan.html",
        type: "government"
      }
    ]
  },
  {
    id: "ca-provincial-tax-strategy",
    question: "How do provincial tax differences affect my savings strategy in Canada?",
    answer: "Provincial tax rates significantly impact strategy: **Highest rates:** Quebec (25.75%), Nova Scotia (21%), Prince Edward Island (16.7%) - maximize RRSP deductions. **Lowest rates:** Alberta (10%), Saskatchewan (10.5%), Ontario (11.16%) - TFSAs relatively more attractive. **Tax credits:** Each province offers different credits affecting effective rates. **Moving considerations:** Changing provinces affects marginal rates - time large RRSP withdrawals strategically. **Pension income splitting:** Available federally and provincially. **Small business tax:** Varies by province (11.5%-27%) affecting business owners. **Tax-loss harvesting:** More valuable in high-tax provinces. Consider provincial tax planning when optimizing RRSP vs TFSA contributions.",
    category: "tax-planning",
    region: "ca", 
    tags: ["provincial taxes", "tax strategy", "RRSP", "TFSA", "Canadian taxes"],
    lastUpdated: "2024-01-15",
    priority: 6,
    currency: "CAD",
    icon: faCalculator, 
    popular: false,
    relatedRegulations: ["Provincial Income Tax Acts"],
    localResources: [
      {
        name: "Provincial Tax Rates",
        url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html",
        type: "government"
      }
    ]
  },
  {
    id: "ca-housing-affordability",
    question: "How can I afford housing in expensive Canadian markets like Toronto and Vancouver?",
    answer: "Strategies for expensive markets: **Average prices:** Toronto $1.1M+, Vancouver $1.2M+ (2024). **Down payment:** Minimum 5% for first $500K, 10% for $500K-$1M, 20% for $1M+. **First-Time Buyer Incentive:** Shared equity with government (up to 10% of home value). **Stress test:** Must qualify at higher rate (currently ~7%). **Alternative markets:** Consider smaller cities, commuter towns, or pre-construction. **Increase income:** Side hustles, roommates, house hacking. **Family assistance:** Gifted down payments allowed. **Timing:** Market cycles matter - don't rush. **Budget reality:** Aim for housing costs under 32% of gross income including all costs (taxes, insurance, maintenance).",
    category: "housing",
    region: "ca",
    tags: ["housing affordability", "Toronto", "Vancouver", "down payment", "homebuying"],
    lastUpdated: "2024-01-15", 
    priority: 9,
    currency: "CAD",
    icon: faHome,
    popular: true,
    relatedRegulations: ["Mortgage stress test", "OSFI guidelines"],
    localResources: [
      {
        name: "CMHC Housing Programs",
        url: "https://www.cmhc-schl.gc.ca/en/consumers/home-buying/first-time-home-buyer-programs",
        type: "government"
      }
    ]
  }
];

// United Kingdom Regional FAQs
export const ukRegionalFAQs: RegionalFAQ[] = [
  {
    id: "uk-isa-allowance-optimization", 
    question: "What's the annual ISA allowance and how should I use it effectively in the UK?",
    answer: "**2024/25 ISA allowance:** £20,000 total across all ISA types. **Types available:** Cash ISA (instant access savings), Stocks & Shares ISA (investments), Innovative Finance ISA (P2P lending), Lifetime ISA (under 40, for first home or retirement). **Optimal strategy:** 1) Emergency fund first in Cash ISA (3-6 months expenses), 2) Long-term investments in Stocks & Shares ISA, 3) LISA if under 40 and buying first home or saving for retirement (25% government bonus). **Use it or lose it:** Unused allowance expires April 5th. **Tax benefits:** All growth and income tax-free forever. **Transfer rules:** Can transfer between providers but counts toward annual limit if moving to different ISA type.",
    category: "investing",
    region: "uk", 
    tags: ["ISA", "Stocks and Shares ISA", "Cash ISA", "LISA", "tax-free investing"],
    lastUpdated: "2024-01-15",
    priority: 10,
    currency: "GBP",
    icon: faPiggyBank,
    popular: true,
    relatedRegulations: ["ISA Regulations 1998", "HMRC guidance"],
    localResources: [
      {
        name: "HMRC ISA Information",
        url: "https://www.gov.uk/individual-savings-accounts",
        type: "government"
      }
    ]
  },
  {
    id: "uk-pension-auto-enrollment",
    question: "How does pension auto-enrollment work and should I increase contributions in the UK?",
    answer: "**Auto-enrollment basics:** Employers must enroll eligible workers aged 22+ earning £10,000+ into pension scheme. **Minimum contributions (2024):** Total 8% of qualifying earnings (£6,240-£50,270) - employee 5%, employer 3%. **Qualifying earnings:** Band of £6,240-£50,270 annually means contributions on ~£44,000 maximum. **Should you increase?** Yes, 8% is insufficient for comfortable retirement. Target 12-15% total. **Salary sacrifice:** More tax-efficient way to contribute - saves National Insurance too. **Annual allowance:** £60,000 maximum pension contributions with tax relief (tapered for high earners). **State pension:** Currently £10,600/year - insufficient alone. Most need private pension income of £20,000+ for comfortable retirement.",
    category: "retirement",
    region: "uk",
    tags: ["pension", "auto-enrollment", "workplace pension", "retirement planning", "salary sacrifice"],
    lastUpdated: "2024-01-15",
    priority: 9,
    currency: "GBP", 
    icon: faUniversity,
    popular: true,
    relatedRegulations: ["Pensions Act 2008", "Automatic Enrolment regulations"],
    localResources: [
      {
        name: "The Pensions Regulator",
        url: "https://www.thepensionsregulator.gov.uk/en/workers/automatic-enrolment-workplace-pensions",
        type: "regulatory"
      }
    ]
  },
  {
    id: "uk-first-home-deposit",
    question: "What deposit do I need to buy my first home in the UK?",
    answer: "**Minimum deposits:** 5% for most first-time buyers, though 10%+ gets better rates. **Average house prices:** £285,000 nationally (London £535,000+). **Government schemes:** 1) **Mortgage Guarantee Scheme** - 5% deposits on homes up to £600,000, 2) **Shared Ownership** - buy 25-75% of home, rent remainder, 3) **Help to Buy ISA/LISA** - government bonuses on savings. **Regional variations:** Scotland - average £180,000, Northern England - £150,000, London - £535,000+. **Additional costs:** Stamp duty (none for first-time buyers under £425,000), solicitor fees (£1,000-2,000), survey (£400-1,500), moving costs. **Affordability:** Typically borrow 4.5x annual income, must pass affordability stress tests.",
    category: "housing",
    region: "uk",
    tags: ["homebuying", "deposit", "first-time buyer", "Help to Buy", "mortgage"],
    lastUpdated: "2024-01-15",
    priority: 9,
    currency: "GBP",
    icon: faHome,
    popular: true,
    relatedRegulations: ["Mortgage Market Review", "PRA rules"],
    localResources: [
      {
        name: "Gov.uk Help to Buy", 
        url: "https://www.gov.uk/affordable-home-ownership-schemes",
        type: "government"
      }
    ]
  },
  {
    id: "uk-brexit-investment-impact",
    question: "How has Brexit affected my investment options and strategy in the UK?",
    answer: "**Key Brexit investment impacts:** 1) **EU fund access:** Limited access to new EU retail funds, existing holdings typically protected. 2) **Currency volatility:** GBP more volatile vs EUR/USD - consider currency hedging. 3) **UK-focused vs global:** Reduced correlation with EU markets may benefit global diversification. 4) **Financial services:** Some platforms restricted EU access - ensure your provider serves UK clients. 5) **Tax implications:** No change to ISA/SIPP rules, but cross-border tax treaties remain complex. **Strategy adjustments:** Emphasize global diversification, consider Brexit-resistant sectors (domestic services, healthcare), maintain currency diversification. **Opportunities:** UK assets potentially undervalued, global funds may offer better value than previously.",
    category: "investing", 
    region: "uk",
    tags: ["Brexit", "EU investments", "currency risk", "global diversification", "UK funds"],
    lastUpdated: "2024-01-15",
    priority: 6,
    currency: "GBP",
    icon: faChartLine,
    popular: false,
    relatedRegulations: ["UK Investment Firms Prudential Regime", "FCA rules"],
    localResources: [
      {
        name: "FCA Brexit Information",
        url: "https://www.fca.org.uk/brexit",
        type: "regulatory"
      }
    ]
  }
];

// Australia Regional FAQs  
export const auRegionalFAQs: RegionalFAQ[] = [
  {
    id: "au-superannuation-optimization",
    question: "How do I optimize my superannuation contributions in Australia?",
    answer: "**Superannuation basics:** Employers contribute 11.5% of salary (increasing to 12% by 2025). **Contribution types:** 1) **Concessional** (before-tax): salary sacrifice, employer contributions - $30,000 annual cap, 2) **Non-concessional** (after-tax): personal contributions - $120,000 annual cap. **Optimization strategies:** Salary sacrifice to utilize full concessional cap saves tax (15% super tax vs marginal rate). **Co-contribution:** Government adds up to $500 if earning under $58,445 and making non-concessional contributions. **Preservation:** Generally can't access until age 60+. **Insurance:** Super often includes life/TPD insurance - review coverage levels. **Low-income super tax offset:** Refunds super tax for earners under $37,000. Choose growth investment options when young for long-term compounding.",
    category: "retirement",
    region: "au",
    tags: ["superannuation", "salary sacrifice", "concessional contributions", "retirement planning"],
    lastUpdated: "2024-01-15",
    priority: 10,
    currency: "AUD",
    icon: faUniversity,
    popular: true,
    relatedRegulations: ["Superannuation Industry (Supervision) Act", "ATO regulations"], 
    localResources: [
      {
        name: "ATO Super Information",
        url: "https://www.ato.gov.au/individuals/super/",
        type: "government"
      }
    ]
  },
  {
    id: "au-negative-gearing",
    question: "What is negative gearing and should I use it for property investment in Australia?",
    answer: "**Negative gearing:** When rental income is less than property expenses (loan interest, maintenance, management), creating a tax-deductible loss. **Tax benefit:** Offset loss against other income, reducing taxable income. **Example:** $50,000 rental income, $60,000 expenses = $10,000 loss to offset other income. **Pros:** Tax deductions, potential capital growth, leverage benefits. **Cons:** Ongoing cash flow negative, risk of capital loss, interest rate risk. **Who benefits most:** High income earners (37-45% tax brackets) get biggest deductions. **Alternatives:** Positive cash flow properties, REITs, shares. **Current landscape:** Rising interest rates reducing appeal, housing affordability concerns affecting policy. **Key consideration:** Don't invest just for tax benefits - property must have good fundamentals and growth prospects.",
    category: "investing",
    region: "au", 
    tags: ["negative gearing", "property investment", "tax strategy", "rental income"],
    lastUpdated: "2024-01-15",
    priority: 7,
    currency: "AUD",
    icon: faHome,
    popular: false,
    relatedRegulations: ["Income Tax Assessment Act", "ATO rental property rules"],
    localResources: [
      {
        name: "ATO Rental Property Information",
        url: "https://www.ato.gov.au/individuals/income-and-deductions/income-you-must-declare/rental-income/",
        type: "government"
      }
    ]
  },
  {
    id: "au-fhss-scheme",
    question: "How does the First Home Super Saver (FHSS) scheme work in Australia?", 
    answer: "**FHSS basics:** Allows voluntary super contributions to be withdrawn for first home deposit. **Contribution limits:** Up to $15,000 per year, $50,000 total lifetime. **Tax benefits:** Contributions taxed at 15% (vs marginal rate), earnings taxed at 15%, withdrawal taxed at marginal rate minus 30% offset. **Eligibility:** Must be first-time buyer, never owned property anywhere. **Process:** 1) Make voluntary concessional or non-concessional super contributions, 2) Apply to ATO for determination, 3) Apply for release from super fund, 4) Must sign purchase contract within 12 months. **Calculation example:** $15,000 contribution saves ~$3,000+ tax for median earners. **Considerations:** Reduces super balance, property purchase time pressure, limited to deposit only. **Best for:** Higher income earners getting biggest tax savings.",
    category: "housing",
    region: "au",
    tags: ["FHSS", "first home buyer", "superannuation", "property deposit", "tax savings"],
    lastUpdated: "2024-01-15", 
    priority: 8,
    currency: "AUD",
    icon: faHome,
    popular: true,
    relatedRegulations: ["Superannuation (Government Co-contribution for Low Income Earners) Act"],
    localResources: [
      {
        name: "ATO FHSS Scheme",
        url: "https://www.ato.gov.au/individuals/super/withdrawing-and-using-your-super/first-home-super-saver-scheme/",
        type: "government"
      }
    ]
  },
  {
    id: "au-capital-gains-tax",
    question: "What are the capital gains tax implications of investing in Australia?",
    answer: "**CGT basics:** Tax on profit from selling assets held >1 year. **Discount:** 50% discount on capital gains for assets held >12 months (individuals/trusts), 33.33% for super funds. **Calculation example:** $20,000 gain on shares held >1 year = $10,000 taxable gain (after 50% discount). **Exemptions:** Main residence (primary home), assets acquired before Sept 20, 1985. **Timing strategies:** Realize losses in high-income years, gains in low-income years. **Record keeping:** Purchase price, improvement costs, selling costs all reduce CGT. **Super vs personal:** Super pays 15% tax on gains (10% if >12 months), vs marginal rates personally. **Small business concessions:** Additional exemptions for business assets. **Cryptocurrency:** Treated as CGT asset for investment purposes. Plan asset sales timing around income fluctuations for tax optimization.",
    category: "investing",
    region: "au",
    tags: ["capital gains tax", "CGT discount", "tax planning", "asset sales"], 
    lastUpdated: "2024-01-15",
    priority: 7,
    currency: "AUD",
    icon: faCalculator,
    popular: false,
    relatedRegulations: ["Income Tax Assessment Act 1997"],
    localResources: [
      {
        name: "ATO Capital Gains Tax",
        url: "https://www.ato.gov.au/individuals/capital-gains-tax/",
        type: "government"
      }
    ]
  }
];

// Ireland Regional FAQs
export const ieRegionalFAQs: RegionalFAQ[] = [
  {
    id: "ie-prsa-pension-planning",
    question: "How do PRSA pensions work and should I contribute to one in Ireland?",
    answer: "**PRSA basics:** Personal Retirement Savings Account - flexible pension for employees without workplace schemes or self-employed. **Tax relief:** Up to 40% of net relevant earnings, varying by age: Under 30 (15%), 30-39 (20%), 40-49 (25%), 50-59 (30%), 60+ (40%). **Annual limits:** 2024 limits range €15,300-€115,200 based on age and income. **Provider choice:** Can choose any approved PRSA provider - compare fees carefully (typically 0.75-1.5% annually). **Flexibility:** Contributions can be irregular, benefits portable between jobs. **State pension:** Currently €265.30/week maximum - insufficient alone for comfortable retirement. **Access:** Generally from age 60, or 50 if retiring early. Consider PRSA if no workplace pension or as additional retirement savings.",
    category: "retirement",
    region: "ie",
    tags: ["PRSA", "pension", "tax relief", "retirement planning", "Ireland"],
    lastUpdated: "2024-01-15",
    priority: 10,
    currency: "EUR",
    icon: faUniversity,
    popular: true,
    relatedRegulations: ["Pensions Act", "Revenue guidelines"],
    localResources: [
      {
        name: "Citizens Information - PRSA",
        url: "https://www.citizensinformation.ie/en/money-and-tax/personal-finance/pensions/personal-retirement-savings-accounts/",
        type: "government"
      }
    ]
  },
  {
    id: "ie-help-to-buy-scheme",
    question: "How does Ireland's Help to Buy scheme work for first-time buyers?",
    answer: "**Help to Buy incentive:** Tax refund for first-time buyers purchasing new builds. **Refund amount:** Up to €30,000 or 10% of purchase price (whichever is lower). **Eligibility:** Must be first-time buyer, purchase new property (self-build or from developer), value under €500,000, get mortgage for at least 70% of purchase price. **Tax requirement:** Must have paid income tax/DIRT in Ireland for 2 of previous 4 years. **Application process:** Apply to Revenue online, get refund after purchase completion. **Other supports:** Local authority shared equity loans up to 30% of property value in some areas. **Down payment:** Still need minimum 10% deposit beyond Help to Buy. **Property price caps:** Vary by county - €450,000 in Cork/Dublin commuter counties, lower elsewhere. Use refund for deposit, legal fees, or furniture.",
    category: "housing",
    region: "ie",
    tags: ["Help to Buy", "first-time buyer", "property", "tax refund", "mortgage"],
    lastUpdated: "2024-01-15",
    priority: 9,
    currency: "EUR",
    icon: faHome,
    popular: true,
    relatedRegulations: ["Help to Buy (HTB) incentive scheme"],
    localResources: [
      {
        name: "Revenue Help to Buy",
        url: "https://www.revenue.ie/en/property/help-to-buy-incentive/index.aspx",
        type: "government"
      }
    ]
  },
  {
    id: "ie-property-tax-implications",
    question: "What are the property tax implications for homeowners and investors in Ireland?",
    answer: "**Local Property Tax (LPT):** Annual tax on residential properties. **2024 rates:** 0.1029% (properties under €1.75M), 0.25% (over €1.75M). **Valuation:** Based on 2019 valuations, next revaluation due 2025. **Payment options:** Annual lump sum, installments, or deduction from salary/pension. **Rental properties:** LPT deductible against rental income for tax purposes. **Rental income tax:** Taxed as income at marginal rates (20% or 40%). **PRSI:** 4% PRSI on rental income. **Deductions:** Mortgage interest, management fees, insurance, repairs allowable. **Capital gains:** 33% CGT on disposal (primary residence exempt). **REIT option:** Consider REITs for property exposure without direct ownership complexities. **First-time landlords:** Often underestimate tax obligations - keep detailed records.",
    category: "housing", 
    region: "ie",
    tags: ["property tax", "LPT", "rental income", "capital gains", "CGT"],
    lastUpdated: "2024-01-15",
    priority: 7,
    currency: "EUR",
    icon: faCalculator,
    popular: false,
    relatedRegulations: ["Local Property Tax Act", "Capital Gains Tax"],
    localResources: [
      {
        name: "Revenue Property Tax Information",
        url: "https://www.revenue.ie/en/property/local-property-tax/index.aspx",
        type: "government"
      }
    ]
  },
  {
    id: "ie-eu-investment-rules",
    question: "What EU investment rules affect Irish investors and what opportunities are available?",
    answer: "**EU investment freedoms:** Can invest freely across EU/EEA without restrictions. **UCITS funds:** EU-regulated funds with strong investor protections - popular choice for Irish investors. **MiFID II protections:** Enhanced investor protections and disclosure requirements. **Tax implications:** Must declare foreign investment income to Revenue. **FATCA/CRS:** Automatic exchange of information with other countries for tax compliance. **Currency considerations:** Euro investments avoid currency risk, but diversification may warrant other currencies. **Deemed disposal:** Irish funds subject to 8-year deemed disposal rule at 41% - consider ETFs domiciled elsewhere. **Passport rights:** EU passport allows access to investment services across member states. **Brexit impact:** Reduced access to UK-domiciled funds, but EU alternatives available. **Green investing:** EU taxonomy regulation promotes sustainable investing options.",
    category: "investing",
    region: "ie", 
    tags: ["EU investment", "UCITS", "MiFID", "tax compliance", "diversification"],
    lastUpdated: "2024-01-15",
    priority: 6,
    currency: "EUR",
    icon: faChartLine,
    popular: false,
    relatedRegulations: ["MiFID II", "UCITS Directive", "EU Taxonomy Regulation"],
    localResources: [
      {
        name: "Central Bank of Ireland - Investment",
        url: "https://www.centralbank.ie/consumer-hub/explainers/what-is-investing",
        type: "regulatory"
      }
    ]
  }
];

// Singapore Regional FAQs
export const sgRegionalFAQs: RegionalFAQ[] = [
  {
    id: "sg-cpf-optimization",
    question: "How can I optimize my CPF contributions and withdrawals in Singapore?",
    answer: "**CPF basics:** Mandatory savings scheme with Ordinary (OA), Special (SA), and Medisave accounts. **2024 contribution rates:** Age 35 and below: Employee 20%, Employer 17% (37% total). **Voluntary contributions:** Top up SA/MA for tax relief up to $37,740 annually. **CPF LIFE:** Mandatory annuity providing monthly payouts from age 65. **Retirement Sum Topping-Up (RSTU):** Tax-deductible contributions to own/family CPF accounts. **SA interest:** Currently 4.08% risk-free return - consider maxing before other investments. **Property usage:** Can use OA for property down payment and monthly payments. **Investment options:** CPF Investment Scheme allows investing OA/SA in approved instruments. **Early withdrawal:** Limited scenarios - medical, education, property. **Strategy:** Prioritize SA top-ups for guaranteed returns, then diversify with SRS and other investments.",
    category: "retirement",
    region: "sg",
    tags: ["CPF", "retirement planning", "voluntary contributions", "tax relief", "Singapore"],
    lastUpdated: "2024-01-15", 
    priority: 10,
    currency: "SGD",
    icon: faUniversity,
    popular: true,
    relatedRegulations: ["CPF Act", "Monetary Authority of Singapore"],
    localResources: [
      {
        name: "CPF Board",
        url: "https://www.cpf.gov.sg/",
        type: "government"
      }
    ]
  },
  {
    id: "sg-hdb-financing-strategy",
    question: "What's the best financing strategy for HDB flats in Singapore?",
    answer: "**HDB loan vs bank loan:** HDB loan: 2.6% fixed, up to 80% loan, no early repayment penalty. Bank loans: Floating rates (~3-4% currently), up to 75% loan, potential for refinancing. **Ethnic Integration Policy (EIP):** Affects resale flat availability for different ethnic groups. **Income ceiling:** BTO eligibility capped at $14,000 (families) or $7,000 (singles) monthly household income. **CPF usage:** Can use OA for down payment and monthly payments - impacts retirement savings. **Cash-over-valuation (COV):** Additional cash payment beyond valuation for popular resale flats. **MOP (Minimum Occupation Period):** 5 years before can sell HDB flat. **Proximity grants:** Up to $30,000 for living near parents/children. **Strategy:** Consider opportunity cost of using CPF vs cash, factor in MOP when timing purchase, evaluate total cost including grants and location premiums.",
    category: "housing",
    region: "sg",
    tags: ["HDB", "property financing", "CPF", "BTO", "resale flat"],
    lastUpdated: "2024-01-15",
    priority: 9,
    currency: "SGD", 
    icon: faHome,
    popular: true,
    relatedRegulations: ["Housing Development Act", "MAS housing loan regulations"],
    localResources: [
      {
        name: "HDB InfoWEB",
        url: "https://www.hdb.gov.sg/",
        type: "government"
      }
    ]
  },
  {
    id: "sg-investment-restrictions-foreigners",
    question: "What investment restrictions apply to foreigners and PRs in Singapore?",
    answer: "**Property restrictions:** Foreigners can buy condos but not landed property or HDB flats. PRs can buy HDB after 3 years, some landed properties with approval. **ABSD (Additional Buyer's Stamp Duty):** Foreigners pay 60% ABSD, PRs pay 5% (first property) or 30% (second). **SRS eligibility:** Supplementary Retirement Scheme open to PRs and some foreigners - tax deferred savings up to $15,300 annually. **Investment accounts:** Full access to SGX, bonds, funds, robo-advisors regardless of status. **Tax implications:** Resident vs non-resident tax rates affect investment returns. **Banking:** PRs get local banking rates, foreigners may face higher rates/fees. **CPF eligibility:** PRs contribute to CPF, foreigners don't (except in specific work categories). **Estate planning:** Different inheritance tax implications for non-residents. **Strategy:** PRs should maximize SRS and CPF, foreigners focus on global diversification through Singapore as financial hub.",
    category: "investing",
    region: "sg",
    tags: ["foreign investment", "PR", "ABSD", "SRS", "property restrictions"],
    lastUpdated: "2024-01-15",
    priority: 8, 
    currency: "SGD",
    icon: faChartLine,
    popular: true,
    relatedRegulations: ["Residential Property Act", "Income Tax Act"],
    localResources: [
      {
        name: "IRAS Investment Information",
        url: "https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/what-is-taxable-what-is-not/investment-income",
        type: "government"
      }
    ]
  },
  {
    id: "sg-tax-optimization-strategies",
    question: "What are effective tax optimization strategies for Singapore residents?",
    answer: "**Progressive tax rates:** 0% on first $20,000, up to 24% on income above $1M. **Tax reliefs:** Personal relief $4,000, parent relief up to $9,000, life insurance relief up to $5,000. **SRS benefits:** Tax deduction now, withdrawal at reduced rate in retirement (50% taxable). **CPF voluntary contributions:** RSTU scheme provides dollar-for-dollar tax relief. **Course fee relief:** Up to $5,500 for approved skills development courses. **Working mother's child relief:** Up to $50,000 for working mothers. **Foreign income:** Generally not taxed if received in Singapore more than 1 year later. **Investment holding company:** Consider for significant investment portfolios to optimize tax. **Timing strategies:** Defer bonuses to January for next tax year if beneficial. **Estate planning:** No inheritance tax but consider CPF nominations and insurance for dependents. Focus on maximizing reliefs and tax-deferred savings like SRS and CPF.",
    category: "tax-planning",
    region: "sg",
    tags: ["tax optimization", "SRS", "CPF", "tax relief", "income tax"],
    lastUpdated: "2024-01-15",
    priority: 7,
    currency: "SGD",
    icon: faCalculator,
    popular: false, 
    relatedRegulations: ["Income Tax Act", "IRAS guidelines"],
    localResources: [
      {
        name: "IRAS Tax Reliefs",
        url: "https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs",
        type: "government"
      }
    ]
  }
];

// New Zealand Regional FAQs (bonus content)
export const nzRegionalFAQs: RegionalFAQ[] = [
  {
    id: "nz-kiwisaver-optimization",
    question: "How do I optimize my KiwiSaver contributions and investment strategy in New Zealand?",
    answer: "**KiwiSaver basics:** Voluntary long-term savings scheme for retirement and first home. **Contribution rates:** Choose 3%, 4%, 6%, 8%, or 10% of gross salary. **Employer match:** Minimum 3% employer contribution (compulsory). **Government contribution:** Up to $521.43 annually if you contribute at least $1,042.86. **Member tax credit:** Dollar-for-dollar match up to $521.43 on first $1,042.86 contributed. **Optimization strategy:** Contribute at least $1,042.86 annually to maximize government contribution. **Fund choice:** Choose between conservative, balanced, growth, or aggressive funds based on risk tolerance and time to retirement. **First Home Withdrawal:** Can withdraw for first home after 3+ years (minimum $1,000 must remain). **HomeStart Grant:** Up to $10,000 for new builds, $5,000 for existing homes (income and price caps apply). **Holiday provision:** Take contribution breaks if experiencing financial hardship.",
    category: "retirement",
    region: "nz",
    tags: ["KiwiSaver", "retirement planning", "government contribution", "first home", "investment"],
    lastUpdated: "2024-01-15",
    priority: 10,
    currency: "NZD",
    icon: faUniversity,
    popular: true,
    relatedRegulations: ["KiwiSaver Act 2006", "Financial Markets Conduct Act"],
    localResources: [
      {
        name: "Sorted KiwiSaver",
        url: "https://sorted.org.nz/guides/kiwisaver/",
        type: "government"
      }
    ]
  }
];

// Combine all regional FAQs
export const allRegionalFAQs: RegionalFAQ[] = [
  ...usRegionalFAQs,
  ...caRegionalFAQs,
  ...ukRegionalFAQs,
  ...auRegionalFAQs,
  ...ieRegionalFAQs,
  ...sgRegionalFAQs,
  ...nzRegionalFAQs
];

// Helper functions for region detection and content filtering
export const detectUserRegion = (): string => {
  // This could be enhanced with IP geolocation or user preference
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('user-region');
    if (stored) return stored;
    
    // Basic timezone-based detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('America/New_York') || timezone.includes('America/Chicago')) return 'us';
    if (timezone.includes('America/Toronto')) return 'ca';
    if (timezone.includes('Europe/London')) return 'uk';
    if (timezone.includes('Australia/')) return 'au';
    if (timezone.includes('Europe/Dublin')) return 'ie';
    if (timezone.includes('Asia/Singapore')) return 'sg';
    if (timezone.includes('Pacific/Auckland')) return 'nz';
  }
  return 'global';
};

export const getRegionalFAQs = (region: string, category?: string): RegionalFAQ[] => {
  let faqs = allRegionalFAQs.filter(faq => faq.region === region || faq.region === 'global');
  
  if (category) {
    faqs = faqs.filter(faq => faq.category === category);
  }
  
  return faqs.sort((a, b) => b.priority - a.priority);
};

export const getPopularRegionalFAQs = (region: string): RegionalFAQ[] => {
  return getRegionalFAQs(region).filter(faq => faq.popular);
};