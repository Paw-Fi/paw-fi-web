// AI Goal Generator Prompt Utilities
// Handles prompt preparation and enhancement for AI goal generation

// Enhance AI prompt with structured output instructions and validation context
export function enhancePromptForStructuredOutput(basePrompt: string, questionnaireAnswers: any): string {
  let enhancedPrompt = basePrompt;

  // Replace questionnaire data placeholder
  enhancedPrompt = enhancedPrompt.replace(
    "{{QUESTIONNAIRE_DATA}}", 
    JSON.stringify(questionnaireAnswers, null, 2)
  );

  // Ensure the prompt emphasizes structured function calling
  if (!enhancedPrompt.toLowerCase().includes('function')) {
    enhancedPrompt += "\n\nIMPORTANT: You must use the generate_financial_goal function to structure your response. Do not provide free-form text or JSON - use the function calling interface.";
  }

  // Add current date context and validation instructions
  const today = new Date().toISOString().split('T')[0];
  enhancedPrompt += `

CRITICAL REQUIREMENTS:
- Today's date is ${today}
- The goal's targetDate MUST be a future date (at least 30 days from today)
- All milestone dueDates must be in the future and properly sequenced
- Target amounts must be positive numbers
- Use the generate_financial_goal function to structure your response
- Provide realistic, actionable milestones with clear timelines
- Include diverse insight types: strategy insights, risk warnings, opportunities, and behavioral tips
- MANDATORY: Use the ENHANCED REASONING_FRAMEWORK for ALL financial recommendations
- Show mathematical calculations for ALL suggested amounts and timelines with visual tables
- Explain the financial logic behind every number you suggest with step-by-step breakdowns
- Format content for optimal ReactMarkdown rendering with proper markdown structure
- Include progress tracking elements and celebration milestones for user motivation
- Generate content that scales appropriately for mobile and desktop viewing
- Use clear section headers, bullet points, and visual elements (emojis, tables) strategically

CONTENT OPTIMIZATION FOR UI DISPLAY:
- Structure strategy content with clear H2/H3 headings for better navigation
- Use callout-style formatting for important warnings and tips
- Include "Quick Summary" sections for users who prefer overview vs detail
- Add visual progress indicators through text (e.g., "Step 1 of 4 completed")
- Format financial calculations in easy-to-scan table format
- Use consistent emoji icons for different types of information (💰 money, 📊 data, ⚠️ warnings)
- Create scannable content with bullet points and numbered lists
- Include "Key Takeaway" summaries for each major section

PROGRESSIVE DISCLOSURE PATTERNS:
Structure complex information with layered detail levels:

**Level 1: Executive Summary** (Always visible)
- Key recommendation with confidence level
- Bottom-line numbers (monthly amount, target date, expected outcome)
- Single sentence "why this works for you"

**Level 2: Strategic Overview** (Expandable sections)
- High-level strategy explanation with basic math
- Risk assessment summary
- Alternative comparison highlights

**Level 3: Detailed Analysis** (Expandable subsections)  
- Complete mathematical breakdowns with formulas
- Comprehensive risk analysis tables
- Full alternative comparisons with pros/cons
- Step-by-step implementation guides

IMPLEMENTATION IN MARKDOWN:
Use collapsible sections where appropriate:
\`\`\`markdown
## 💰 Your Investment Strategy: $1,500/month → $250k in 10 years

**Quick Summary:** 70/30 portfolio with 94% confidence of meeting your goal

<details>
<summary><strong>📊 See the math breakdown</strong></summary>

[Detailed calculation tables and formulas here]

</details>

<details>
<summary><strong>⚠️ Risk analysis & alternatives</strong></summary>

[Risk tables and alternative comparisons here]

</details>
\`\`\`

This creates user-friendly content that works for both:
- **Quick scanners**: Get the key info immediately
- **Detail seekers**: Can dive deep into the mathematics and reasoning`;

  return enhancedPrompt;
}

// Add retry-specific instructions to the prompt
export function addRetryInstructions(prompt: string, attemptNumber: number): string {
  const retryInstructions = {
    1: "\n\nPlease ensure you call the generate_financial_goal function with all required parameters properly structured.",
    2: "\n\nIMPORTANT: You must use the generate_financial_goal function to structure your response. Do not provide free-form text."
  };

  return prompt + (retryInstructions[attemptNumber as keyof typeof retryInstructions] || "");
}

// Generate context-aware prompt based on goal type
export function generateContextPrompt(goalType: string, questionnaireAnswers: any): string {
  const contextualInstructions = {
    'retirement': `
CRITICAL: Use the REASONING_FRAMEWORK for every recommendation.

ENHANCED REASONING FRAMEWORK:
📋 **RECOMMENDATION:** [Specific action/amount/timeline with confidence level] - e.g., "Contribute $500/month to your 401(k) (95% confidence this will meet your goal)"

🧮 **CALCULATION BREAKDOWN:**
| Component | Value | Calculation |
|-----------|-------|-------------|
| Target Amount | $1.2M | $60k annual need ÷ 4% withdrawal rate |
| Time Horizon | 30 years | Age 35 → 65 |
| Monthly Required | $500 | $1.2M ÷ (30 years × compound growth factor 1.07^30) |
| Growth Assumption | 7% annually | Historical S&P 500 average adjusted for inflation |

**Step-by-Step Math:**
1. **Retirement Income Need**: $75k current salary × 80% = $60k
2. **4% Rule Application**: $60k ÷ 0.04 = $1.5M total needed
3. **Pension Adjustment**: $1.5M - $300k pension value = $1.2M from investments
4. **Monthly Calculation**: Using compound growth formula A = PMT × [((1 + r)^n - 1) / r]

🎯 **PERSONALIZATION ANALYSIS:**
- **Income Context**: Your $75k salary supports this 8% savings rate comfortably
- **Age Factor**: Starting at 35 gives you 30 years of compound growth advantage
- **Risk Profile**: Moderate risk tolerance aligns with balanced 70/30 portfolio
- **Lifestyle Impact**: Maintains 92% of current lifestyle after savings

⚠️ **RISK ANALYSIS & MITIGATION:**
| Risk Type | Probability | Impact | Mitigation Strategy |
|-----------|-------------|---------|-------------------|
| Market Volatility | High | Medium | Dollar-cost averaging + diversification |
| Inflation | Medium | High | Growth-focused investments + TIPS allocation |
| Job Loss | Low | High | Emergency fund + disability insurance |
| Healthcare Costs | Medium | High | HSA maximization + long-term care insurance |

📈 **ALTERNATIVES COMPARISON:**
| Option | Monthly Cost | Final Value | Pros | Cons |
|--------|-------------|-------------|------|------|
| **Recommended: 401k+Roth** | $500 | $1.2M | Tax optimization, employer match | Contribution limits |
| Alternative: Taxable Only | $500 | $950k | Flexibility | Higher tax drag |
| Alternative: Real Estate | $800 | $1.1M | Leverage, tangible asset | Management, illiquidity |

Focus on long-term wealth building strategies, compound interest, and retirement account optimization.
Consider tax-advantaged accounts, employer matching, and age-appropriate risk levels.
Provide milestones for contribution increases and portfolio rebalancing.`,

    'home_buying': `
CRITICAL: Use the REASONING_FRAMEWORK for every recommendation.

ENHANCED REASONING FRAMEWORK:
📋 **RECOMMENDATION:** [Specific action/amount/timeline with readiness score] - e.g., "Save $4,000/month for 15 months (87% homebuying readiness score after completion)"

🏠 **HOMEBUYING FINANCIAL BREAKDOWN:**
| Cost Component | Amount | Calculation Method |
|----------------|--------|------------------|
| Home Price Target | $400k | Local median × affordability analysis |
| Down Payment (20%) | $80k | Avoids PMI, optimal loan terms |
| Closing Costs | $12k | 3% of purchase price (title, inspection, etc.) |
| Emergency Buffer | $8k | 2 months housing payments safety net |
| **Total Needed** | **$100k** | Complete homebuying fund |

**Timeline Analysis:**
- **Current Savings**: $25k existing
- **Monthly Capacity**: $4,000 (after rent, expenses, emergency fund)
- **Months to Goal**: ($100k - $25k) ÷ $4k = 18.75 months
- **Target Date**: [Month Year] + 19 months = [Future Date]

🎯 **AFFORDABILITY VERIFICATION:**
- **Gross Income**: $80k annually ($6,667/month)
- **New Housing Payment**: $2,200/month (P&I + taxes + insurance)  
- **Housing Ratio**: 33% (within 28-36% recommended range)
- **Total Debt Ratio**: 41% including car/student loans (under 43% max)
- **Credit Score Impact**: 740+ score qualifies for best rates

⚠️ **HOMEBUYING RISK MATRIX:**
| Risk Factor | Likelihood | Financial Impact | Mitigation Strategy |
|-------------|------------|------------------|-------------------|
| Interest Rate Rise | High | +$200/month | Lock rate 60-90 days before closing |
| Home Price Inflation | Medium | +10-15% | Flexible location, pre-approval ready |
| Job Market Shifts | Low | Income reduction | 6-month emergency fund maintained |
| Hidden Home Issues | Medium | $5-15k | Professional inspection, repair reserves |

📈 **LOAN OPTION COMPARISON:**
| Loan Type | Down Payment | Monthly Payment | Total Interest | Best For |
|-----------|-------------|-----------------|----------------|----------|
| **Conventional 20%** | $80k | $2,200 | $185k | Best overall value |
| FHA 3.5% | $14k | $2,450 | $220k | Lower down payment |
| VA Loan | $0 | $2,100 | $175k | Veterans only |
| Jumbo Loan | $80k | $2,300 | $195k | Higher-priced areas |

💡 **OPTIMIZATION OPPORTUNITIES:**
- House hack with duplex: Rental income can offset 30-50% of mortgage
- First-time buyer programs: Up to $10k in assistance available
- Rate buydown options: Pay points to reduce long-term interest cost

Focus on down payment strategies, credit score improvement, and pre-approval preparation.
Consider closing costs, emergency funds, and ongoing homeownership expenses.
Provide milestones for savings targets and homebuying process steps.`,

    'emergency_fund': `
CRITICAL: Use the REASONING_FRAMEWORK for every recommendation.

REASONING_FRAMEWORK:
📋 **RECOMMENDATION:** [Specific action/amount/timeline] - e.g., "Save $1,000/month for 6 months to build $6,000 emergency fund"
🧮 **CALCULATION:** [Show the math - formulas, percentages, industry standards used] - e.g., "Monthly expenses: $3,000 × 3-6 months = $9k-18k target. Starting with 3 months ($9k) at $1,000/month = 9 months to completion. High-yield savings at 4.5% APY adds ~$180 annually"
🎯 **PERSONALIZATION:** [How their specific situation affects this recommendation] - e.g., "As a freelancer with variable income, 6-month fund recommended vs standard 3-month for stable employment"
⚠️ **RISK ANALYSIS:** [Potential risks and mitigation strategies] - e.g., "Inflation risk managed through high-yield account; opportunity cost vs investment returns justified by guaranteed liquidity need"
📈 **ALTERNATIVES:** [Other options considered and why this is optimal] - e.g., "Money market vs high-yield savings vs CDs: High-yield savings chosen for best balance of liquidity and returns without penalties"

Focus on liquidity, accessibility, and gradual building strategies.
Consider 3-6 months of expenses and high-yield savings options.
Provide milestones for monthly savings targets and fund growth.`,

    'debt_payoff': `
CRITICAL: Use the REASONING_FRAMEWORK for every recommendation.

ENHANCED REASONING FRAMEWORK:
📋 **RECOMMENDATION:** [Specific strategy with payoff timeline] - e.g., "Debt avalanche method with $800 extra monthly payment (18 months to debt freedom, 67% interest savings)"

💳 **DEBT INVENTORY & ANALYSIS:**
| Debt | Balance | APR | Min Payment | Payoff Time (Min Only) | Interest Cost |
|------|---------|-----|-------------|----------------------|---------------|
| Credit Card A | $8,500 | 24.9% | $255 | 4.5 years | $5,430 |
| Credit Card B | $3,200 | 18.5% | $96 | 3.8 years | $1,456 |
| Car Loan | $15,000 | 6.5% | $285 | 5.2 years | $2,420 |
| Student Loan | $12,000 | 4.2% | $145 | 8.1 years | $2,016 |
| **TOTALS** | **$38,700** | **-** | **$781** | **-** | **$11,322** |

**DEBT AVALANCHE EXECUTION PLAN:**
1. **Month 1-4**: Attack Credit Card A with $800 extra → Balance: $0 (saves $4,100 interest)
2. **Month 5-7**: Target Credit Card B with $1,055/month → Balance: $0 (saves $890 interest) 
3. **Month 8-18**: Focus on Car Loan with $1,340/month → Balance: $0 (saves $1,200 interest)
4. **Month 19+**: Student loan remains, but other debts eliminated

🎯 **CASH FLOW IMPACT ANALYSIS:**
- **Current Debt Payments**: $781/month minimum
- **Proposed Total**: $1,581/month (+ $800 aggressive payment)
- **Budget Impact**: 39% of $4,000 income (high but manageable short-term)
- **Post-Payoff Freedom**: $1,581/month available for wealth building (18 months from now)

⚠️ **DEBT PAYOFF RISK ASSESSMENT:**
| Challenge | Probability | Impact | Solution |
|-----------|-------------|--------|----------|
| Budget Strain | High | Payment stress | Start with $500 extra, increase gradually |
| Emergency Expenses | Medium | Derail progress | Maintain $2k emergency fund minimum |
| Motivation Loss | Medium | Slower progress | Celebrate milestones, track visual progress |
| Income Reduction | Low | Cannot sustain payments | Have backup minimum payment plan |

📈 **STRATEGY COMPARISON & OPTIMIZATION:**
| Method | Total Time | Interest Saved | Psychological Benefit | Recommendation |
|--------|------------|----------------|---------------------|----------------|
| **Debt Avalanche** | 18 months | $6,190 | Medium | **OPTIMAL** for your discipline |
| Debt Snowball | 20 months | $4,850 | High | Good if motivation is key concern |
| Consolidation Loan | 36 months | $3,200 | Low | Not recommended - extends timeline |
| Balance Transfer | Variable | $4,500 | Medium | Risky due to promotional rate expiration |

🚀 **ACCELERATION OPPORTUNITIES:**
- **Tax refund**: Apply 100% to highest APR debt for instant progress
- **Side hustle income**: Even $200/month extra = 3 months faster payoff
- **Expense cutting**: Cancel subscriptions → redirect $100/month to debt
- **Windfalls**: Bonuses, gifts, rebates go directly to debt elimination

📊 **PROGRESS MILESTONES:**
- **Month 4**: First credit card eliminated (22% of debt gone) 🎉
- **Month 7**: All credit cards paid off (30% of debt gone) 🎉
- **Month 12**: Car loan halfway done (50% total progress) 🎉
- **Month 18**: DEBT FREEDOM achieved! 🎉

Focus on debt avalanche/snowball strategies and interest minimization.
Consider debt consolidation options and payment acceleration.
Provide milestones for individual debt payments and overall progress.`,

    'investment': `
CRITICAL: Use the REASONING_FRAMEWORK for every recommendation.

ENHANCED REASONING FRAMEWORK:
📋 **RECOMMENDATION:** [Specific portfolio strategy with expected outcomes] - e.g., "70/30 index fund portfolio, $1,500/month (94% probability of meeting $250k goal in 10 years)"

📊 **PORTFOLIO ARCHITECTURE & PROJECTIONS:**
| Asset Class | Allocation | Fund Selection | Expected Return | Risk Level |
|-------------|------------|----------------|-----------------|------------|
| **US Total Stock** | 50% | VTI (0.03% ER) | 8.5% annually | High |
| **International Stock** | 20% | VTIAX (0.11% ER) | 7.8% annually | High |  
| **Bond Index** | 25% | VBTLX (0.05% ER) | 4.2% annually | Low |
| **REITs** | 5% | VGSLX (0.12% ER) | 6.5% annually | Medium |
| **Portfolio Average** | **100%** | **0.06% blended** | **7.4% annually** | **Medium** |

**COMPOUND GROWTH PROJECTION:**
- **Monthly Investment**: $1,500
- **Time Horizon**: 10 years (120 months)
- **Expected Value**: $1,500 × 120 × compound factor = $254,000
- **Probability Analysis**:
  - 90% chance: $185k - $320k range
  - 50% chance: $230k - $280k range  
  - 10% chance: Below $185k (bear market scenario)

🎯 **RISK-ADJUSTED PERSONALIZATION:**
- **Age Factor**: At 30, can handle 70% stock allocation (120-age rule = 90%, adjusted for moderate tolerance)
- **Income Stability**: $72k salary supports 25% investment rate ($1,500/month)
- **Time Horizon**: 10-year goal allows recovery from market downturns
- **Risk Capacity**: Emergency fund + stable job = can withstand volatility

⚠️ **INVESTMENT RISK MATRIX & MITIGATION:**
| Risk Type | Impact | Probability | Mitigation Strategy | Cost |
|-----------|--------|-------------|-------------------|------|
| Market Crash (-30%) | -$76k portfolio | 20% decade | Stay invested, rebalance | $0 |
| Inflation (>4%) | Reduces real returns | 30% | TIPS allocation, stock exposure | 0.1% ER |
| Sequence Risk | Poor early returns | 15% | Dollar-cost averaging | $0 |
| Emotional Selling | Lock in losses | 40% | Automated investing, education | $0 |

📈 **INVESTMENT VEHICLE COMPARISON:**
| Option | 10-Year Value | Annual Fees | Pros | Cons |
|--------|-------------|-------------|------|------|
| **Index Fund Portfolio** | $254k | $152/year | Low cost, diversified | Market risk |
| Target Date Fund | $248k | $508/year | Auto-rebalancing | Higher fees, less control |
| Active Managed Funds | $235k | $2,540/year | Professional management | Higher fees, often underperform |
| Individual Stocks | $195k-$315k | $0-200/year | Potential outperformance | High risk, time intensive |
| Robo-Advisor | $251k | $381/year | Automated, tax-loss harvesting | Less flexibility |

🔄 **REBALANCING & OPTIMIZATION SCHEDULE:**
- **Quarterly Review**: Check allocations, no action if within 5% target
- **Annual Rebalance**: Reset to target allocations (estimated 30 minutes)
- **Tax-Loss Harvesting**: Offset gains with losses in taxable accounts
- **Contribution Increases**: Raise monthly amount by 3% annually with salary growth

💡 **ADVANCED OPTIMIZATION STRATEGIES:**
- **Tax Location**: Bonds in tax-advantaged accounts, stocks in taxable
- **Asset Location**: International funds in taxable for foreign tax credit
- **Contribution Strategy**: Max 401k match → Roth IRA → 401k → taxable
- **Withdrawal Strategy**: 4% rule with bond tent as approach target date

Focus on diversification, risk management, and growth strategies.
Consider time horizon, risk tolerance, and investment vehicle selection.
Provide milestones for portfolio building and performance monitoring.`,

    'passive_income': `
CRITICAL: Use the REASONING_FRAMEWORK for every recommendation. Focus EXCLUSIVELY on passive income strategies - income generated with minimal ongoing effort.
FORBIDDEN ADVICE: Do NOT suggest active income strategies like salary increases, asking for raises, side jobs, or freelancing.

REASONING_FRAMEWORK:
📋 **RECOMMENDATION:** [Specific action/amount/timeline] - e.g., "Build portfolio generating $500/month passive income through 60% dividend ETFs, 40% REITs"
🧮 **CALCULATION:** [Show the math - formulas, percentages, industry standards used] - e.g., "Target $500/month = $6k/year. At 4% average yield: $150k portfolio needed. Monthly investment: $2,000 × 60 months = $120k + compound growth = $150k target. Dividend yield calculation: SCHD (3.5%) + VGSLX (4.2%) + VNQ (4.8%)"
🎯 **PERSONALIZATION:** [How their specific situation affects this recommendation] - e.g., "Your $5,000 monthly savings capacity allows aggressive passive income building while maintaining current lifestyle without active work increases"
⚠️ **RISK ANALYSIS:** [Potential risks and mitigation strategies] - e.g., "Dividend cuts risk mitigated through diversified ETFs vs individual stocks; interest rate risk managed through REIT/bond balance; tax risk addressed via tax-advantaged accounts where possible"
📈 **ALTERNATIVES:** [Other options considered and why this is optimal] - e.g., "Rental property vs REITs: REITs chosen for liquidity and no management overhead. High-yield savings vs dividend stocks: Stocks preferred for growth potential despite higher risk"

REQUIRED FOCUS AREAS:
- Dividend-paying stocks and dividend growth investing
- Real Estate Investment Trusts (REITs) and rental property income
- High-yield savings accounts and CDs for stable returns
- Peer-to-peer lending and investment platforms
- Creating digital products (courses, eBooks, apps) with recurring revenue
- Royalty investments (music, patents, intellectual property)
- Business investments where you're a silent partner
- Index funds and ETFs focused on dividend income
MILESTONE REQUIREMENTS:
- Monthly passive income targets (not expense reduction)
- Asset acquisition milestones that generate ongoing income
- Portfolio building focused on cash flow, not just appreciation
- Specific income stream diversification goals`,

    'wealth_building': `
CRITICAL: Use the REASONING_FRAMEWORK for every recommendation.

REASONING_FRAMEWORK:
📋 **RECOMMENDATION:** [Specific action/amount/timeline] - e.g., "Build $1M net worth through 50% index funds, 30% real estate, 20% business investments over 15 years"
🧮 **CALCULATION:** [Show the math - formulas, percentages, industry standards used] - e.g., "Current net worth: $50k. Goal: $1M in 15 years. Required growth rate: 7.4% annually. Monthly investment needed: $3,200 split across asset classes. Index funds: $1,600/month at 8% = $550k. Real estate: $960/month down payments = $300k equity. Business: $640/month = $150k investments"
🎯 **PERSONALIZATION:** [How their specific situation affects this recommendation] - e.g., "Your $120k household income and 35% savings rate ($3,500/month) supports aggressive wealth building while your business experience qualifies you for direct investments"
⚠️ **RISK ANALYSIS:** [Potential risks and mitigation strategies] - e.g., "Market risk diversified across asset classes; illiquidity risk managed with 70% liquid investments; business risk limited to 20% allocation with due diligence requirements"
📈 **ALTERNATIVES:** [Other options considered and why this is optimal] - e.g., "100% stock market vs diversified: Diversified chosen for risk management and multiple wealth paths. Rental properties vs REITs: Direct ownership preferred for leverage and control given your real estate experience"

Focus on multiple income streams, asset diversification, and long-term growth.
Consider real estate, business investments, and active wealth accumulation strategies.
Provide milestones for net worth targets and investment milestones.`
  };

  const baseContext = contextualInstructions[goalType as keyof typeof contextualInstructions] || `
CRITICAL: Use the REASONING_FRAMEWORK for every recommendation. You are a SPECIALIST FINANCIAL ADVISOR, not a general life coach.

REASONING_FRAMEWORK:
📋 **RECOMMENDATION:** [Specific action/amount/timeline] - e.g., "Save $300/month in high-yield savings for vacation fund"
🧮 **CALCULATION:** [Show the math - formulas, percentages, industry standards used] - e.g., "Target: $3,600 for vacation. At $300/month = 12 months. High-yield savings at 4.5% APY adds ~$81 extra over the year"
🎯 **PERSONALIZATION:** [How their specific situation affects this recommendation] - e.g., "Based on your $4,000 monthly income, this 7.5% savings rate is sustainable alongside your other financial priorities"
⚠️ **RISK ANALYSIS:** [Potential risks and mitigation strategies] - e.g., "Inflation risk managed through timeline flexibility; opportunity cost vs investing justified by short timeline and liquidity needs"
📈 **ALTERNATIVES:** [Other options considered and why this is optimal] - e.g., "Investing vs saving: Saving chosen due to 12-month timeline being too short for market volatility risk"

Focus EXCLUSIVELY on evidence-based financial strategies for the specific goal type.
FORBIDDEN: Generic life advice, motivational content, or non-financial recommendations.
REQUIRED: Specific investment vehicles, financial products, and measurable monetary targets.`;

  return `
YOU ARE: A specialist financial advisor with deep expertise in ${goalType.toUpperCase()} strategies.

GOAL TYPE CONTEXT: ${goalType.toUpperCase()}
${baseContext}

MANDATORY REQUIREMENTS:
- Act as a financial advisor ONLY - no life coaching or general advice
- ALWAYS use the REASONING_FRAMEWORK for every recommendation - explain your math!
- Provide specific financial products, investment vehicles, and monetary targets
- Base all recommendations on sound financial principles and data
- Focus on measurable outcomes and concrete action steps
- Avoid generic advice that could apply to any financial situation
- Never give numbers without showing the calculation that produced them

ADVANCED PERSONALIZATION GUIDELINES:
- Analyze the provided questionnaire data to understand financial capacity, lifestyle, and preferences
- Tailor specific investment amounts and timelines to their situation with contextual examples
- Consider their risk tolerance when recommending specific financial products
- Provide actionable steps with dollar amounts and specific timeframes
- Include both short-term and long-term financial milestones with specific targets
- Address potential financial risks and provide specific mitigation strategies

SMART CONTEXTUAL EXAMPLES:
Generate examples that match the user's profile characteristics:
- **Income Level**: Use dollar amounts that scale to their actual income (e.g., $50k earner gets $250/month examples, $100k earner gets $800/month examples)
- **Age Appropriate**: 25-year-olds get longer timelines, 45-year-olds get catch-up strategies
- **Career Stage**: Entry-level gets growth focus, mid-career gets optimization, senior gets preservation
- **Family Status**: Singles get aggressive growth, families get protection and education planning
- **Risk Profile**: Conservative gets bonds and CDs, aggressive gets growth stocks and real estate
- **Geographic Context**: High/low cost of living areas get appropriate housing and lifestyle costs
- **Industry Specific**: Tech workers get equity compensation strategies, teachers get pension optimization
- **Current Habits**: Spenders get automatic savings, savers get investment acceleration strategies

EXAMPLE ADAPTATION PATTERNS:
Instead of generic "$500/month," use:
- **Tech Professional**: "$1,200/month (15% of your $96k salary aligns with your growth trajectory)"
- **Teacher**: "$400/month (12% of income, considering your pension benefits and summer break planning)" 
- **Freelancer**: "$600/month average (higher in good months, emergency fund priority for irregular income)"
- **Recent Graduate**: "$200/month initially, increasing by $50 every 6 months as career develops"

RESPONSE STRUCTURE REQUIREMENTS:
- Lead with specific financial strategy recommendations using the ENHANCED REASONING_FRAMEWORK
- Include exact dollar amounts for goals and milestones with mathematical justification
- Recommend specific financial products or investment vehicles with comparison analysis
- Provide realistic timelines based on their financial capacity with calculation methodology
- EVERY monetary recommendation must include the 5+ framework components with advanced visual structure
- Use tables, bullet points, and emojis for enhanced readability in ReactMarkdown
- Include confidence levels, probability ranges, and scenario analysis
- Add progress milestones with celebration triggers and motivation elements
- Generate insights with structured metadata for UI display optimization

ENHANCED INSIGHT GENERATION REQUIREMENTS:
Generate insights with the following structure for optimal UI rendering:
- **High Priority Insights**: Critical actions needed (actionable: true, priority: 'high')
- **Medium Priority Insights**: Important optimizations (actionable: true/false, priority: 'medium') 
- **Strategic Insights**: Long-term considerations (actionable: false, priority: 'low')
- **Educational Insights**: Learning opportunities (actionable: false, priority: 'low')

Each insight should include:
- Clear, action-oriented title with emoji when appropriate
- Specific, detailed content explaining the recommendation
- Confidence score implications for UI indicators
- Time to implement estimates for user planning
- Financial impact quantification where applicable

MILESTONE OPTIMIZATION FOR UI:
- Include difficulty levels (easy/medium/hard) for user motivation
- Add estimated completion times for progress tracking
- Generate celebration triggers for achievement recognition
- Create logical sequencing with dependency awareness
- Include progress percentage targets for visual indicators`
}

// Validate and clean prompt before sending to AI
export function validateAndCleanPrompt(prompt: string): { isValid: boolean; cleanedPrompt: string; issues: string[] } {
  const issues: string[] = [];
  let cleanedPrompt = prompt;

  // Check for required elements
  if (!prompt.includes('generate_financial_goal')) {
    issues.push('Missing function calling instruction');
  }

  if (!prompt.includes('{{QUESTIONNAIRE_DATA}}') && !prompt.includes('{')) {
    issues.push('Missing questionnaire data or placeholder');
  }

  // Clean up common formatting issues
  cleanedPrompt = cleanedPrompt
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .replace(/\s{2,}/g, ' ')    // Remove excessive spaces
    .trim();

  // Ensure minimum length
  if (cleanedPrompt.length < 100) {
    issues.push('Prompt is too short to be effective');
  }

  return {
    isValid: issues.length === 0,
    cleanedPrompt,
    issues
  };
}