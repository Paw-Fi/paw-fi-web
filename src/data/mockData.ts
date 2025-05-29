import type { Lesson } from "@/types/learning.types";

export const mockLessons = [
    {
      "id": "stock-market-basics",
      "title": "Stock Market Basics",
      "description": "Learn how stocks work and how to start investing in the market.",
      "xp": 50,
      "unlocked": true,
      "icon": "📈",
      "questions": [
      
        {
          "id": "dividend-aristocrats",
          "type": "image-choice",
          "question": "Which dividend history would qualify as a 'Dividend Aristocrat'?",
          "explanation": "Dividend Aristocrats are companies that have increased their dividend payments for at least 25 consecutive years.",
          "itemsPerRow": 2,
          "options": [
            {
              "id": "consistent",
              "content": "Company A",
              "imagePrompt": "graph LR\n    A[2000] --> B[2005]\n    B --> C[2010]\n    C --> D[2015]\n    D --> E[2020]\n    A -. &dollar;1 .-> B\n    B -. 1 .-> C\n    C -. 1 .-> D\n    D -. 1 .-> E\n    style A fill:#f9f9f9,stroke:#ccc\n    style B fill:#d1f5d3,stroke:#82c985\n    style C fill:#a5eba8,stroke:#55b559\n    style D fill:#7ae07e,stroke:#2a9a2e\n    style E fill:#50d655,stroke:#1d881f",
              "caption": "Consistent dividend increases for 25+ years",
              "isCorrect": true
            },
            {
              "id": "fluctuating",
              "content": "Company B",
              "imagePrompt": "graph LR\n    A[2000] --> B[2005]\n    B --> C[2010]\n    C --> D[2015]\n    D --> E[2020]\n    A -. 1 .-> B\n    B -. 1 .-> C\n    C -. 0 .-> D\n    D -. 2 .-> E\n    style A fill:#f9f9f9,stroke:#ccc\n    style B fill:#d1f5d3,stroke:#82c985\n    style C fill:#ffd4d4,stroke:#e29a9a\n    style D fill:#7ae07e,stroke:#2a9a2e\n    style E fill:#50d655,stroke:#1d881f",
              "caption": "Fluctuating dividends with cuts and increases",
              "isCorrect": false
            }
          ]
        },
        {
          "id": "portfolio-rebalancing",
          "type": "image-choice",
          "question": "Which portfolio needs rebalancing?",
          "itemsPerRow": 2,
          "options": [
            {
              "id": "balanced",
              "content": "Portfolio A",
              "imagePrompt": "pie title \"Current: 60% Stocks, 40% Bonds\" \"Stocks\" : 60 \"Bonds\" : 40",
              "caption": "Target: 60% Stocks, 40% Bonds",
              "isCorrect": false
            },
            {
              "id": "unbalanced",
              "content": "Portfolio B",
              "imagePrompt": "pie title \"Current: 80% Stocks, 20% Bonds\" \"Stocks\" : 80 \"Bonds\" : 20",
              "caption": "Target: 60% Stocks, 40% Bonds",
              "isCorrect": true
            }
          ],
          "explanation": "Rebalancing means adjusting your portfolio back to your target allocation. Portfolio B has drifted significantly from its 60/40 target and needs rebalancing to maintain your desired risk level."
        },
        {
          "id": "what-are-stocks",
          "type": "scq",
          "question": "What do you actually own when you buy a stock?",
          "options": [
            { "id": "opt-1", "content": "A loan to the company", "isCorrect": false },
            { "id": "opt-2", "content": "A small piece of ownership in the company", "isCorrect": true },
            { "id": "opt-3", "content": "The right to company profits only", "isCorrect": false },
            { "id": "opt-4", "content": "A guarantee of future returns", "isCorrect": false }
          ],
          "explanation": "When you buy a stock, you're purchasing partial ownership (equity) in a company. This gives you certain rights, including potential dividends and voting on company matters."
        },
        {
          "id": "stock-price-factors",
          "type": "match",
          "question": "Match each factor with how it typically affects stock prices.",
          "items": [
            { "id": "item-1", "content": "Strong company earnings" },
            { "id": "item-2", "content": "Rising interest rates" },
            { "id": "item-3", "content": "New revolutionary product" },
            { "id": "item-4", "content": "Industry scandal" }
          ],
          "options": [
            { "id": "opt-1", "content": "Stock price rises" },
            { "id": "opt-2", "content": "Stock price falls" },
            { "id": "opt-3", "content": "Stock price rises" },
            { "id": "opt-4", "content": "Stock price falls" }
          ],
          "correctMatches": {
            "item-1": "opt-1",
            "item-2": "opt-2",
            "item-3": "opt-3",
            "item-4": "opt-2"
          },
          "hint": "Think about investor confidence - what makes people more or less excited about a company's future?"
        },
        {
          "id": "stock-market-types",
          "type": "sort-categories",
          "question": "Sort these items into Primary or Secondary Market.",
          "items": [
            { "id": "item-1", "content": "IPO (Initial Public Offering)" },
            { "id": "item-2", "content": "Trading on NYSE" },
            { "id": "item-3", "content": "Company issues new shares" },
            { "id": "item-4", "content": "Buying stocks on an app" }
          ],
          "categories": [
            { "id": "primary", "name": "Primary Market" },
            { "id": "secondary", "name": "Secondary Market" }
          ],
          "correct_answers": {
            "item-1": "primary",
            "item-2": "secondary",
            "item-3": "primary",
            "item-4": "secondary"
          },
          "help_tips": "Primary Market = When companies create and sell NEW shares directly to investors (money goes to the company)\n\nSecondary Market = When investors trade EXISTING shares with each other (company doesn't get the money)"
        },
        {
          "id": "bull-vs-bear",
          "type": "image-choice",
          "question": "Which market trend would you prefer as a new investor?",
          "itemsPerRow": 2,
          "options": [
            {
              "id": "bull",
              "content": "Bull Market",
              "imagePrompt": "graph LR\n    A[Start] ---> B[Month 1]\n    B ---> C[Month 2]\n    C ---> D[Month 3]\n    D ---> E[Month 4]\n    A -. $100 .-> B\n    B -. $110 .-> C\n    C -. $122 .-> D\n    D -. $132 .-> E\n    style A fill:#f9f9f9,stroke:#ccc\n    style B fill:#d1f5d3,stroke:#82c985\n    style C fill:#a5eba8,stroke:#55b559\n    style D fill:#7ae07e,stroke:#2a9a2e\n    style E fill:#50d655,stroke:#1d881f",
              "caption": "Prices rising over time",
              "isCorrect": true
            },
            {
              "id": "bear",
              "content": "Bear Market",
              "imagePrompt": "graph LR\n    A[Start] ---> B[Month 1]\n    B ---> C[Month 2]\n    C ---> D[Month 3]\n    D ---> E[Month 4]\n    A -. $100 .-> B\n    B -. $92 .-> C\n    C -. $85 .-> D\n    D -. $76 .-> E\n    style A fill:#f9f9f9,stroke:#ccc\n    style B fill:#ffd4d4,stroke:#e29a9a\n    style C fill:#ffb0b0,stroke:#cc7a7a\n    style D fill:#ff8a8a,stroke:#b55555\n    style E fill:#ff6666,stroke:#992e2e",
              "caption": "Prices falling over time",
              "isCorrect": false
            }
          ],
          "explanation": "Bull markets (rising prices) are generally better for beginners. Your investments grow naturally with the market, giving you confidence while you learn."
        },
        {
          "id": "stock-index",
          "type": "mcq",
          "question": "Which of these are major stock market indexes? (Select all that apply)",
          "options": [
            { "id": "opt-1", "content": "S&P 500", "isCorrect": true },
            { "id": "opt-2", "content": "NASDAQ", "isCorrect": true },
            { "id": "opt-3", "content": "FDIC", "isCorrect": false },
            { "id": "opt-4", "content": "Dow Jones", "isCorrect": true },
            { "id": "opt-5", "content": "NYSE", "isCorrect": false }
          ],
          "help_tips": "Stock indexes track groups of stocks to measure market performance. They're like the temperature of the market!"
        },
        {
          "id": "stockbroker-role",
          "type": "text-input",
          "question": "What's the main role of a stockbroker or trading app?",
          "correct_answers": ["facilitate", "execute", "place", "process", "buy", "sell", "trades", "orders", "transactions", "connect", "facilitate trades", "execute trades", "place trades", "buy and sell", "buy stocks", "sell stocks"],
          "explanation": "A stockbroker or trading app helps execute your trades, connecting you with the market so you can buy and sell investments."
        },
        {
          "id": "investment-amount",
          "type": "matrix-rating",
          "question": "How suitable are these investment amounts for beginners?",
          "items": [
            { "id": "item-1", "content": "$5-$50 per month" },
            { "id": "item-2", "content": "$100-$500 per month" },
            { "id": "item-3", "content": "$1,000+ per month" },
            { "id": "item-4", "content": "Investing your entire savings" }
          ],
          "ratingOptions": [
            { "id": "good", "content": "Good", "color": "green" },
            { "id": "okay", "content": "Okay", "color": "yellow" },
            { "id": "risky", "content": "Risky", "color": "red" }
          ],
          "correctRatings": {
            "item-1": "good",
            "item-2": "good",
            "item-3": "okay",
            "item-4": "risky"
          },
          "help_tips": "Start small and consistent! Even small amounts grow over time through compound interest."
        },
        {
          "id": "stock-charts",
          "type": "scq",
          "question": "What does a stock chart that looks like this typically show?",
          "imagePrompt": "graph LR\n    A[Jan] --> B[Feb]\n    B --> C[Mar]\n    C --> D[Apr]\n    D --> E[May]\n    A -- $85 --> B\n    B -- $75 --> C\n    C -- $90 --> D\n    D -- $105 --> E\n    style A fill:#f9f9f9,stroke:#ccc\n    style B fill:#f7d9d9,stroke:#e29a9a\n    style C fill:#f2f2a9,stroke:#d6d64f\n    style D fill:#ceecce,stroke:#82c985\n    style E fill:#a3e2a3,stroke:#55b559",
          "options": [
            { "id": "opt-1", "content": "Company's inventory levels", "isCorrect": false },
            { "id": "opt-2", "content": "Stock price over time", "isCorrect": true },
            { "id": "opt-3", "content": "Number of shareholders", "isCorrect": false },
            { "id": "opt-4", "content": "Dividend payment schedule", "isCorrect": false }
          ],
          "explanation": "Stock charts typically show price history over time. This helps investors spot trends and make decisions."
        }
      ]
    },
    {
      "id": "passive-income-strategies",
      "title": "Passive Income Through Stocks",
      "description": "Discover ways to earn passive income from stock market investments.",
      "xp": 75,
      "unlocked": true,
      "icon": "💰",
      "questions": [
        {
          "id": "dividend-basics",
          "type": "scq",
          "question": "What is a dividend?",
          "options": [
            { "id": "opt-1", "content": "A loan you give to a company", "isCorrect": false },
            { "id": "opt-2", "content": "A payment companies make to shareholders", "isCorrect": true },
            { "id": "opt-3", "content": "The fee for buying stocks", "isCorrect": false },
            { "id": "opt-4", "content": "A type of stock", "isCorrect": false }
          ],
          "explanation": "Dividends are regular payments that some companies make to shareholders from their profits. It's one way to earn passive income from stocks."
        },
        {
          "id": "dividend-frequency",
          "type": "match",
          "question": "Match each dividend payment schedule with its description.",
          "items": [
            { "id": "item-1", "content": "Quarterly dividends" },
            { "id": "item-2", "content": "Monthly dividends" },
            { "id": "item-3", "content": "Special dividends" },
            { "id": "item-4", "content": "Dividend reinvestment" }
          ],
          "options": [
            { "id": "opt-1", "content": "Most common, paid four times per year" },
            { "id": "opt-2", "content": "Paid twelve times per year" },
            { "id": "opt-3", "content": "One-time payments outside regular schedule" },
            { "id": "opt-4", "content": "Using dividends to buy more shares" }
          ],
          "correctMatches": {
            "item-1": "opt-1",
            "item-2": "opt-2",
            "item-3": "opt-3",
            "item-4": "opt-4"
          },
          "help_tips": "Different companies have different dividend schedules. Understanding these helps you plan your passive income stream."
        },
        {
          "id": "dividend-yield",
          "type": "matrix-rating",
          "question": "Rate these dividend yields for a passive income strategy.",
          "items": [
            { "id": "item-1", "content": "1-2% yield" },
            { "id": "item-2", "content": "3-5% yield" },
            { "id": "item-3", "content": "7-10% yield" },
            { "id": "item-4", "content": "15%+ yield" }
          ],
          "ratingOptions": [
            { "id": "low", "content": "Low", "color": "yellow" },
            { "id": "good", "content": "Good", "color": "green" },
            { "id": "suspicious", "content": "Suspicious", "color": "red" }
          ],
          "correctRatings": {
            "item-1": "low",
            "item-2": "good",
            "item-3": "good",
            "item-4": "suspicious"
          },
          "explanation": "Extremely high yields (10%+) often indicate risk or unsustainable payouts. 3-7% is typically considered a good balance of income and stability.",
          "imagePrompt": "pie title \"Typical Dividend Yields\" \"Low (1-2%)\" : 30 \"Good (3-7%)\" : 50 \"Suspicious (10%+)\" : 20"
        },
        {
          "id": "dividend-calculation",
          "type": "text-input",
          "question": "If you own 100 shares of a $50 stock with a 4% annual dividend yield, how much dividend income will you receive per year?",
          "correct_answers": ["$200", "200", "200 dollars", "$200.00", "200.00"],
          "help_tips": "Step 1: Calculate total investment (shares × price)\nStep 2: Multiply by dividend yield percentage",
          "explanation": "100 shares × $50 = $5,000 total investment\n$5,000 × 4% = $200 annual dividend income"
        },
        {
          "id": "passive-strategies",
          "type": "sort-categories",
          "question": "Sort these approaches by how passive they are.",
          "items": [
            { "id": "item-1", "content": "Dividend ETFs" },
            { "id": "item-2", "content": "Day trading" },
            { "id": "item-3", "content": "Dividend reinvestment plans (DRIPs)" },
            { "id": "item-4", "content": "Researching individual stocks weekly" }
          ],
          "categories": [
            { "id": "more", "name": "More Passive" },
            { "id": "less", "name": "Less Passive" }
          ],
          "correct_answers": {
            "item-1": "more",
            "item-2": "less",
            "item-3": "more",
            "item-4": "less"
          },
          "help_tips": "The most passive strategies require minimal ongoing time, research, or decision-making."
        },
        {
          "id": "drip-benefits",
          "type": "mcq",
          "question": "What are the benefits of a Dividend Reinvestment Plan (DRIP)? (Select all that apply)",
          "options": [
            { "id": "opt-1", "content": "Automatic compounding of returns", "isCorrect": true },
            { "id": "opt-2", "content": "No transaction fees on reinvested dividends", "isCorrect": true },
            { "id": "opt-3", "content": "Guaranteed returns", "isCorrect": false },
            { "id": "opt-4", "content": "Fractional share purchases", "isCorrect": true },
            { "id": "opt-5", "content": "Immediate cash payouts", "isCorrect": false }
          ],
          "explanation": "DRIPs automatically reinvest your dividends to buy more shares, often with no fees and allowing fractional shares. This compounds your returns over time."
        },
        {
          "id": "dividend-aristocrats",
          "type": "image-choice",
          "question": "Which dividend history would qualify as a 'Dividend Aristocrat'?",
          "explanation": "Dividend Aristocrats are companies that have increased their dividend payments for at least 25 consecutive years.",
          "itemsPerRow": 2,
          "options": [
            {
              "id": "consistent",
              "content": "Company A",
              "imagePrompt": "graph LR\n    A[2000] --> B[2005]\n    B --> C[2010]\n    C --> D[2015]\n    D --> E[2020]\n    A -. $1.00 .-> B\n    B -. $1.20 .-> C\n    C -. $1.45 .-> D\n    D -. $1.75 .-> E\n    style A fill:#f9f9f9,stroke:#ccc\n    style B fill:#d1f5d3,stroke:#82c985\n    style C fill:#a5eba8,stroke:#55b559\n    style D fill:#7ae07e,stroke:#2a9a2e\n    style E fill:#50d655,stroke:#1d881f",
              "caption": "Consistent dividend increases for 25+ years",
              "isCorrect": true
            },
            {
              "id": "fluctuating",
              "content": "Company B",
              "imagePrompt": "graph LR\n    A[2000] --> B[2005]\n    B --> C[2010]\n    C --> D[2015]\n    D --> E[2020]\n    A -. $1.00 .-> B\n    B -. $1.25 .-> C\n    C -. $0.75 .-> D\n    D -. $2.00 .-> E\n    style A fill:#f9f9f9,stroke:#ccc\n    style B fill:#d1f5d3,stroke:#82c985\n    style C fill:#ffd4d4,stroke:#e29a9a\n    style D fill:#7ae07e,stroke:#2a9a2e\n    style E fill:#50d655,stroke:#1d881f",
              "caption": "Fluctuating dividends with cuts and increases",
              "isCorrect": false
            }
          ]
        },
        {
          "id": "etf-vs-individual",
          "type": "scq",
          "question": "Which is typically better for a beginner seeking passive dividend income?",
          "options": [
            { "id": "opt-1", "content": "Researching and selecting individual dividend stocks", "isCorrect": false },
            { "id": "opt-2", "content": "Investing in a dividend-focused ETF or index fund", "isCorrect": true },
            { "id": "opt-3", "content": "Day trading dividend stocks", "isCorrect": false },
            { "id": "opt-4", "content": "Trading dividend options", "isCorrect": false }
          ],
          "help_tips": "ETFs offer instant diversification across many dividend-paying companies with a single purchase. This reduces risk while still providing passive income."
        },
        {
          "id": "dividend-taxation",
          "type": "scq",
          "question": "How are stock dividends typically taxed?",
          "options": [
            { "id": "opt-1", "content": "Not taxed at all", "isCorrect": false },
            { "id": "opt-2", "content": "As ordinary income (same as your job)", "isCorrect": false },
            { "id": "opt-3", "content": "At qualified dividend tax rates (lower than income tax)", "isCorrect": true },
            { "id": "opt-4", "content": "Only taxed when you sell the stock", "isCorrect": false }
          ],
          "explanation": "Most dividends from U.S. companies are 'qualified dividends' taxed at lower capital gains rates, making them tax-efficient passive income."
        },
        {
          "id": "dividend-growth",
          "type": "text-input",
          "question": "If a company raises its dividend by 7% each year, how many years until your dividend income doubles?",
          "correct_answers": ["10", "10 years", "about 10", "approximately 10", "~10"],
          "help_tips": "Use the Rule of 72: 72 ÷ annual percentage increase = years to double",
          "explanation": "72 ÷ 7 = 10.3 years (roughly 10 years) to double your dividend income with 7% annual increases."
        }
      ]
    },
    {
      "id": "investing-fundamentals",
      "title": "Investment Fundamentals",
      "description": "Master core investing principles to build wealth over time.",
      "xp": 60,
      "unlocked": true,
      "icon": "🏗️",
      "questions": [
        {
          "id": "compound-interest",
          "type": "scq",
          "question": "What makes compound interest so powerful for investors?",
          "options": [
            { "id": "opt-1", "content": "It only applies to government bonds", "isCorrect": false },
            { "id": "opt-2", "content": "You earn interest on your interest", "isCorrect": true },
            { "id": "opt-3", "content": "It guarantees fixed returns", "isCorrect": false },
            { "id": "opt-4", "content": "It eliminates all investment risk", "isCorrect": false }
          ],
          "explanation": "Compound interest means you earn returns not just on your original investment, but also on all the interest/returns you've earned so far. This creates exponential growth over time.",
          "imagePrompt": "graph TD\n    A[Initial Investment: $1,000] --> B[Year 1: $1,100]\n    B --> C[Year 2: $1,210]\n    C --> D[Year 3: $1,331]\n    A -- +$100 --> B\n    B -- +$110 --> C\n    C -- +$121 --> D\n    style A fill:#f1f1f1,stroke:#999\n    style B fill:#d1f5d3,stroke:#82c985\n    style C fill:#a5eba8,stroke:#55b559\n    style D fill:#7ae07e,stroke:#2a9a2e"
        },
        {
          "id": "time-horizon",
          "type": "matrix-rating",
          "question": "Match each investment timeframe with the appropriate risk level.",
          "items": [
            { "id": "item-1", "content": "1-2 years (short-term)" },
            { "id": "item-2", "content": "3-7 years (medium-term)" },
            { "id": "item-3", "content": "10+ years (long-term)" },
            { "id": "item-4", "content": "Emergency fund (immediate access)" }
          ],
          "ratingOptions": [
            { "id": "low", "content": "Low Risk", "color": "green" },
            { "id": "medium", "content": "Medium Risk", "color": "yellow" },
            { "id": "high", "content": "High Risk", "color": "red" }
          ],
          "correctRatings": {
            "item-1": "low",
            "item-2": "medium",
            "item-3": "high",
            "item-4": "low"
          },
          "help_tips": "Longer time horizons allow you to take more risk since you have time to recover from market downturns."
        },
        {
          "id": "risk-return",
          "type": "sort-order",
          "question": "Sort these investments from lowest to highest potential return (and risk).",
          "items": [
            { "id": "item-1", "content": "Savings Account" },
            { "id": "item-2", "content": "Government Bonds" },
            { "id": "item-3", "content": "S&P 500 Index Fund" },
            { "id": "item-4", "content": "Individual Tech Stocks" },
            { "id": "item-5", "content": "Early-Stage Startups" }
          ],
          "correct_answers": ["item-1", "item-2", "item-3", "item-4", "item-5"],
          "help_tips": "Generally, higher potential returns come with higher risk. Lower risk investments tend to be more stable but offer lower returns."
        },
        {
          "id": "diversification",
          "type": "image-choice",
          "question": "Which portfolio is better diversified?",
          "itemsPerRow": 2,
          "options": [
            {
              "id": "single-sector",
              "content": "Portfolio A",
              "imagePrompt": "pie title \"Portfolio A\" \"Tech Stocks\" : 100",
              "caption": "100% Technology stocks",
              "isCorrect": false
            },
            {
              "id": "multi-sector",
              "content": "Portfolio B",
              "imagePrompt": "pie title \"Portfolio B\" \"Tech\" : 25 \"Healthcare\" : 20 \"Financial\" : 20 \"Consumer\" : 20 \"Bonds\" : 15",
              "caption": "Mix of sectors and asset types",
              "isCorrect": true
            }
          ],
          "explanation": "Diversification means spreading investments across different assets to reduce risk. If one sector struggles, others might perform well, balancing your returns."
        },
        {
          "id": "dollar-cost",
          "type": "scq",
          "question": "What is dollar-cost averaging?",
          "options": [
            { "id": "opt-1", "content": "Converting all investments to US dollars", "isCorrect": false },
            { "id": "opt-2", "content": "Investing a fixed dollar amount at regular intervals", "isCorrect": true },
            { "id": "opt-3", "content": "Always buying at the lowest price", "isCorrect": false },
            { "id": "opt-4", "content": "Selling investments for a guaranteed profit", "isCorrect": false }
          ],
          "explanation": "Dollar-cost averaging means investing a consistent amount regularly (e.g., $100 monthly), regardless of market prices. This strategy helps avoid trying to time the market and reduces the impact of volatility.",
          "imagePrompt": "graph LR\n    A[Month 1: $100] --> |Buy 10 shares| B[$10/share]\n    C[Month 2: $100] --> |Buy 20 shares| D[$5/share]\n    E[Month 3: $100] --> |Buy 12.5 shares| F[$8/share]\n    G[Month 4: $100] --> |Buy 8.33 shares| H[$12/share]\n    style A fill:#d1f5d3,stroke:#82c985\n    style C fill:#d1f5d3,stroke:#82c985\n    style E fill:#d1f5d3,stroke:#82c985\n    style G fill:#d1f5d3,stroke:#82c985"
        },
        {
          "id": "risk-factors",
          "type": "mcq",
          "question": "Which factors help determine your appropriate investment risk level? (Select all that apply)",
          "options": [
            { "id": "opt-1", "content": "Your age", "isCorrect": true },
            { "id": "opt-2", "content": "Time until you need the money", "isCorrect": true },
            { "id": "opt-3", "content": "Your income source", "isCorrect": true },
            { "id": "opt-4", "content": "Your emotional comfort with volatility", "isCorrect": true },
            { "id": "opt-5", "content": "The current president", "isCorrect": false }
          ],
          "help_tips": "Your personal risk tolerance depends on both objective factors (age, timeline, income) and subjective factors (comfort with seeing investments fluctuate)."
        },
        {
          "id": "investment-math",
          "type": "text-input",
          "question": "If you invest $200 monthly for 10 years with an 8% average annual return, approximately how much will you have? (Round to nearest $5,000)",
          "correct_answers": ["$35,000", "$35000", "35000", "35k", "$35k", "about $35,000", "approximately $35,000", "$35,000", "around $35,000", "roughly $35,000"],
          "help_tips": "The formula is: FV = P × [(1 + r)^n - 1] ÷ r × (1 + r)\nWhere FV = future value, P = periodic contribution, r = rate per period, n = number of periods",
          "explanation": "$200 monthly × 12 months × 10 years with compound interest at 8% grows to approximately $35,000."
        },
        {
          "id": "investing-myths",
          "type": "sort-categories",
          "question": "Sort these statements into True or False.",
          "items": [
            { "id": "item-1", "content": "You need a lot of money to start investing" },
            { "id": "item-2", "content": "Time in the market beats timing the market" },
            { "id": "item-3", "content": "Investing is the same as gambling" },
            { "id": "item-4", "content": "Historical performance guarantees future results" }
          ],
          "categories": [
            { "id": "true", "name": "True" },
            { "id": "false", "name": "False" }
          ],
          "correct_answers": {
            "item-1": "false",
            "item-2": "true",
            "item-3": "false",
            "item-4": "false"
          },
          "explanation": "Many investing myths prevent people from starting. Today, you can begin with just a few dollars, and consistent investing over time typically outperforms trying to time market highs and lows."
        },
        {
          "id": "investing-goals",
          "type": "match",
          "question": "Match each investment goal with the most suitable approach.",
          "items": [
            { "id": "item-1", "content": "Retirement (30+ years away)" },
            { "id": "item-2", "content": "House down payment (5 years away)" },
            { "id": "item-3", "content": "Emergency fund" },
            { "id": "item-4", "content": "Passive income now" }
          ],
          "options": [
            { "id": "opt-1", "content": "Growth stocks and index funds" },
            { "id": "opt-2", "content": "Balanced portfolio with some bonds" },
            { "id": "opt-3", "content": "High-yield savings account" },
            { "id": "opt-4", "content": "Dividend stocks and REITs" }
          ],
          "correctMatches": {
            "item-1": "opt-1",
            "item-2": "opt-2",
            "item-3": "opt-3",
            "item-4": "opt-4"
          },
          "help_tips": "Different investment goals require different strategies. Match your investment approach to your timeline and objectives."
        }
      ]
    },
    {
      "id": "etf-fundamentals",
      "title": "ETF Investing",
      "description": "Learn how ETFs work and how they can help build a passive income portfolio.",
      "xp": 80,
      "unlocked": true,
      "icon": "📊",
      "questions": [
        {
          "id": "etf-basics",
          "type": "scq",
          "question": "What is an ETF?",
          "options": [
            { "id": "opt-1", "content": "A type of individual stock", "isCorrect": false },
            { "id": "opt-2", "content": "A basket of investments that trades like a stock", "isCorrect": true },
            { "id": "opt-3", "content": "A government bond", "isCorrect": false },
            { "id": "opt-4", "content": "A retirement account", "isCorrect": false }
          ],
          "explanation": "ETF stands for Exchange-Traded Fund. It's a collection of securities (stocks, bonds, etc.) that you can buy and sell like a single stock, giving you instant diversification."
        },
        {
          "id": "etf-vs-stocks",
          "type": "sort-categories",
          "question": "Sort these characteristics into ETFs or Individual Stocks.",
          "items": [
            { "id": "item-1", "content": "Built-in diversification" },
            { "id": "item-2", "content": "Can pick specific companies" },
            { "id": "item-3", "content": "Generally lower risk" },
            { "id": "item-4", "content": "Potential for huge gains from one company" }
          ],
          "categories": [
            { "id": "etfs", "name": "ETFs" },
            { "id": "stocks", "name": "Individual Stocks" }
          ],
          "correct_answers": {
            "item-1": "etfs",
            "item-2": "stocks",
            "item-3": "etfs",
            "item-4": "stocks"
          },
          "help_tips": "ETFs spread risk across many investments, while individual stocks let you invest in specific companies you believe in."
        },
        {
          "id": "etf-types",
          "type": "match",
          "question": "Match each ETF type with its description.",
          "items": [
            { "id": "item-1", "content": "Index ETF" },
            { "id": "item-2", "content": "Sector ETF" },
            { "id": "item-3", "content": "Dividend ETF" },
            { "id": "item-4", "content": "Bond ETF" }
          ],
          "options": [
            { "id": "opt-1", "content": "Tracks a market index like S&P 500" },
            { "id": "opt-2", "content": "Focuses on one industry like technology" },
            { "id": "opt-3", "content": "Holds stocks that pay regular income" },
            { "id": "opt-4", "content": "Contains fixed-income securities" }
          ],
          "correctMatches": {
            "item-1": "opt-1",
            "item-2": "opt-2",
            "item-3": "opt-3",
            "item-4": "opt-4"
          },
          "explanation": "Different ETF types serve different investment goals. Understanding these helps you build a portfolio aligned with your passive income objectives."
        },
        {
          "id": "etf-fees",
          "type": "matrix-rating",
          "question": "Rate these ETF expense ratios (annual fees).",
          "items": [
            { "id": "item-1", "content": "0.03% expense ratio" },
            { "id": "item-2", "content": "0.25% expense ratio" },
            { "id": "item-3", "content": "0.75% expense ratio" },
            { "id": "item-4", "content": "1.5% expense ratio" }
          ],
          "ratingOptions": [
            { "id": "excellent", "content": "Excellent", "color": "green" },
            { "id": "good", "content": "Good", "color": "yellow" },
            { "id": "expensive", "content": "Expensive", "color": "red" }
          ],
          "correctRatings": {
            "item-1": "excellent",
            "item-2": "good",
            "item-3": "good",
            "item-4": "expensive"
          },
          "help_tips": "ETF fees directly reduce your returns. Lower is better! Even small differences compound significantly over time.",
          "imagePrompt": "graph LR\n    A[$10,000 investment] --> B[30 years]\n    B --> C[0.03% fee: $9,900 lost]\n    B --> D[0.5% fee: $47,000 lost]\n    B --> E[1.5% fee: $120,000 lost]\n    style A fill:#f9f9f9,stroke:#ccc\n    style B fill:#f9f9f9,stroke:#ccc\n    style C fill:#d1f5d3,stroke:#82c985\n    style D fill:#fff2a8,stroke:#d6d64f\n    style E fill:#ffb0b0,stroke:#cc7a7a"
        },
        {
          "id": "dividend-etfs",
          "type": "mcq",
          "question": "Which are advantages of dividend ETFs for passive income? (Select all that apply)",
          "options": [
            { "id": "opt-1", "content": "Instant diversification across many dividend stocks", "isCorrect": true },
            { "id": "opt-2", "content": "Professional management of holdings", "isCorrect": true },
            { "id": "opt-3", "content": "Higher yields than individual dividend stocks", "isCorrect": false },
            { "id": "opt-4", "content": "Less research required than picking individual stocks", "isCorrect": true },
            { "id": "opt-5", "content": "Guaranteed dividend payments", "isCorrect": false }
          ],
          "explanation": "Dividend ETFs offer diversification, professional management, and convenience - perfect for passive income investors who don't want to research individual companies."
        },
        {
          "id": "popular-etfs",
          "type": "image-choice",
          "question": "Which ETF would likely provide more consistent dividend income?",
          "itemsPerRow": 2,
          "options": [
            {
              "id": "growth",
              "content": "VUG (Vanguard Growth ETF)",
              "imagePrompt": "graph LR\n    A[Focus] --> B[Stock price growth]\n    C[Yield] --> D[0.5% dividend yield]\n    E[Holdings] --> F[Growth-oriented companies]\n    style A fill:#f9f9f9,stroke:#ccc\n    style C fill:#f9f9f9,stroke:#ccc\n    style E fill:#f9f9f9,stroke:#ccc\n    style B fill:#a3e2a3,stroke:#55b559\n    style D fill:#ffd4d4,stroke:#e29a9a\n    style F fill:#a3e2a3,stroke:#55b559",
              "caption": "Focus on growth companies with low dividends",
              "isCorrect": false
            },
            {
              "id": "dividend",
              "content": "VYM (Vanguard High Dividend Yield ETF)",
              "imagePrompt": "graph LR\n    A[Focus] --> B[Dividend income]\n    C[Yield] --> D[3.0% dividend yield]\n    E[Holdings] --> F[Established dividend payers]\n    style A fill:#f9f9f9,stroke:#ccc\n    style C fill:#f9f9f9,stroke:#ccc\n    style E fill:#f9f9f9,stroke:#ccc\n    style B fill:#a3e2a3,stroke:#55b559\n    style D fill:#a3e2a3,stroke:#55b559\n    style F fill:#a3e2a3,stroke:#55b559",
              "caption": "Focus on companies with history of dividend payments",
              "isCorrect": true
            }
          ],
          "explanation": "ETFs specifically designed for dividend income (like VYM) focus on companies with established dividend payment histories, making them better for consistent passive income."
        },
        {
          "id": "etf-volume",
          "type": "scq",
          "question": "Why is trading volume important when choosing an ETF?",
          "options": [
            { "id": "opt-1", "content": "Higher volume means the ETF will have better returns", "isCorrect": false },
            { "id": "opt-2", "content": "It affects how easily you can buy and sell shares", "isCorrect": true },
            { "id": "opt-3", "content": "Volume determines the dividend yield", "isCorrect": false },
            { "id": "opt-4", "content": "Higher volume means lower fees", "isCorrect": false }
          ],
          "help_tips": "ETFs with higher trading volume typically have tighter bid-ask spreads, making them easier and potentially cheaper to trade when you need to buy or sell."
        },
        {
          "id": "etf-calculation",
          "type": "text-input",
          "question": "If you invest $10,000 in an ETF with a 3% dividend yield, how much annual dividend income would you expect?",
          "correct_answers": ["$300", "300", "300 dollars", "$300.00"],
          "explanation": "$10,000 × 3% = $300 expected annual dividend income",
          "help_tips": "Dividend yield percentage × investment amount = annual dividend income"
        },
        {
          "id": "etf-strategy",
          "type": "sort-order",
          "question": "Order these steps for building a passive income ETF portfolio from first to last.",
          "items": [
            { "id": "item-1", "content": "Determine your income goals and timeline" },
            { "id": "item-2", "content": "Research ETFs that match your criteria" },
            { "id": "item-3", "content": "Compare expense ratios and holdings" },
            { "id": "item-4", "content": "Create a regular investment schedule" },
            { "id": "item-5", "content": "Set up dividend reinvestment if growing" }
          ],
          "correct_answers": ["item-1", "item-2", "item-3", "item-4", "item-5"],
          "explanation": "Building a passive income ETF portfolio starts with clear goals, followed by research, comparison, regular investing, and finally setting up systems like dividend reinvestment for compounding growth."
        },
        {
          "id": "etf-diversification",
          "type": "scq",
          "question": "What's a potential downside of only investing in a single sector ETF?",
          "options": [
            { "id": "opt-1", "content": "Too much diversification", "isCorrect": false },
            { "id": "opt-2", "content": "Higher fees than individual stocks", "isCorrect": false },
            { "id": "opt-3", "content": "Risk if that entire sector struggles", "isCorrect": true },
            { "id": "opt-4", "content": "Not being able to pick your favorite companies", "isCorrect": false }
          ],
          "explanation": "While sector ETFs provide diversification within an industry, they still expose you to risks affecting that entire sector. For example, a tech-only ETF would suffer during a tech industry downturn."
        }
      ]
    },
    {
      "id": "risk-management",
      "title": "Investment Risk Management",
      "description": "Learn strategies to protect your investments and manage risk effectively.",
      "xp": 85,
      "unlocked": true,
      "icon": "🛡️",
      "questions": [
        {
          "id": "risk-types",
          "type": "match",
          "question": "Match each risk type with its description.",
          "items": [
            { "id": "item-1", "content": "Market risk" },
            { "id": "item-2", "content": "Inflation risk" },
            { "id": "item-3", "content": "Liquidity risk" },
            { "id": "item-4", "content": "Concentration risk" }
          ],
          "options": [
            { "id": "opt-1", "content": "Overall market declines affecting most stocks" },
            { "id": "opt-2", "content": "Money losing purchasing power over time" },
            { "id": "opt-3", "content": "Difficulty selling an investment quickly" },
            { "id": "opt-4", "content": "Too much money in one investment or sector" }
          ],
          "correctMatches": {
            "item-1": "opt-1",
            "item-2": "opt-2",
            "item-3": "opt-3",
            "item-4": "opt-4"
          },
          "help_tips": "Understanding different risk types helps you build protection strategies into your portfolio."
        },
        {
          "id": "diversification-benefits",
          "type": "mcq",
          "question": "Which are benefits of proper diversification? (Select all that apply)",
          "options": [
            { "id": "opt-1", "content": "Reduces impact of single investment failures", "isCorrect": true },
            { "id": "opt-2", "content": "Guarantees positive returns", "isCorrect": false },
            { "id": "opt-3", "content": "May capture growth in different market sectors", "isCorrect": true },
            { "id": "opt-4", "content": "Smooths out portfolio volatility", "isCorrect": true },
            { "id": "opt-5", "content": "Eliminates all investment risk", "isCorrect": false }
          ],
          "explanation": "Diversification spreads risk but doesn't eliminate it. It's about not putting all your eggs in one basket, so a single failure doesn't devastate your portfolio."
        },
        {
          "id": "risk-tolerance",
          "type": "sort-categories",
          "question": "Sort these investor profiles by their likely risk tolerance.",
          "items": [
            { "id": "item-1", "content": "19-year-old with 40+ years until retirement" },
            { "id": "item-2", "content": "35-year-old saving for a house in 2 years" },
            { "id": "item-3", "content": "62-year-old retiring next year" },
            { "id": "item-4", "content": "45-year-old with stable job and emergency fund" }
          ],
          "categories": [
            { "id": "higher", "name": "Higher Risk Tolerance" },
            { "id": "lower", "name": "Lower Risk Tolerance" }
          ],
          "correct_answers": {
            "item-1": "higher",
            "item-4": "higher",
            "item-2": "lower",
            "item-3": "lower"
          },
          "help_tips": "Risk tolerance depends heavily on time horizon (years until you need the money) and personal financial stability."
        },
        {
          "id": "portfolio-rebalancing",
          "type": "image-choice",
          "question": "Which portfolio needs rebalancing?",
          "itemsPerRow": 2,
          "options": [
            {
              "id": "balanced",
              "content": "Portfolio A",
              "imagePrompt": "pie title \"Current: 60% Stocks, 40% Bonds\" \"Stocks\" : 60 \"Bonds\" : 40",
              "caption": "Target: 60% Stocks, 40% Bonds",
              "isCorrect": false
            },
            {
              "id": "unbalanced",
              "content": "Portfolio B",
              "imagePrompt": "pie title \"Current: 80% Stocks, 20% Bonds\" \"Stocks\" : 80 \"Bonds\" : 20",
              "caption": "Target: 60% Stocks, 40% Bonds",
              "isCorrect": true
            }
          ],
          "explanation": "Rebalancing means adjusting your portfolio back to your target allocation. Portfolio B has drifted significantly from its 60/40 target and needs rebalancing to maintain your desired risk level."
        },
        {
          "id": "stop-loss",
          "type": "scq",
          "question": "What is a stop-loss order?",
          "options": [
            { "id": "opt-1", "content": "An order to buy a stock when it reaches a certain price", "isCorrect": false },
            { "id": "opt-2", "content": "An order to sell a stock if it falls to a certain price", "isCorrect": true },
            { "id": "opt-3", "content": "A guarantee that you won't lose money", "isCorrect": false },
            { "id": "opt-4", "content": "An insurance policy for investments", "isCorrect": false }
          ],
          "help_tips": "Stop-loss orders are risk management tools that automatically sell a stock if it drops to a price you set, helping limit potential losses."
        },
        {
          "id": "emergency-fund",
          "type": "text-input",
          "question": "How many months of expenses should a basic emergency fund cover?",
          "correct_answers": ["3-6", "3 to 6", "3 to 6 months", "3-6 months", "three to six", "three to six months", "between 3 and 6", "between 3 and 6 months"],
          "explanation": "A standard emergency fund should cover 3-6 months of necessary expenses. This protects your investments by preventing forced selling during downturns or emergencies.",
          "help_tips": "An emergency fund acts as a financial buffer between you and unexpected expenses, protecting your investments from early withdrawal."
        },
        {
          "id": "volatility-management",
          "type": "sort-order",
          "question": "Sort these investments from typically least to most volatile.",
          "items": [
            { "id": "item-1", "content": "High-yield savings account" },
            { "id": "item-2", "content": "Government bonds" },
            { "id": "item-3", "content": "Blue-chip stocks" },
            { "id": "item-4", "content": "Small-cap growth stocks" },
            { "id": "item-5", "content": "Cryptocurrency" }
          ],
          "correct_answers": ["item-1", "item-2", "item-3", "item-4", "item-5"],
          "help_tips": "Volatility refers to how much an investment's price fluctuates. Generally, the potential for higher returns comes with higher volatility.",
          "imagePrompt": "graph LR\n    A[Savings] --> B[Bonds]\n    B --> C[Blue-chip Stocks]\n    C --> D[Small-cap Stocks]\n    D --> E[Crypto]\n    A -. Low volatility .-> B\n    B -. Low-medium .-> C\n    C -. Medium-high .-> D\n    D -. Very high .-> E\n    style A fill:#d1f5d3,stroke:#82c985\n    style B fill:#e6f7c9,stroke:#a4cb77\n    style C fill:#fff2a8,stroke:#d6d64f\n    style D fill:#ffd4d4,stroke:#e29a9a\n    style E fill:#ffb0b0,stroke:#cc7a7a"
        },
        {
          "id": "dollar-cost-volatility",
          "type": "matrix-rating",
          "question": "Rate how these market conditions affect someone using dollar-cost averaging.",
          "items": [
            { "id": "item-1", "content": "Steadily rising market" },
            { "id": "item-2", "content": "Steadily falling market" },
            { "id": "item-3", "content": "Volatile but sideways market" },
            { "id": "item-4", "content": "Extreme market crash" }
          ],
          "ratingOptions": [
            { "id": "good", "content": "Good", "color": "green" },
            { "id": "neutral", "content": "Neutral", "color": "yellow" },
            { "id": "challenging", "content": "Challenging", "color": "red" }
          ],
          "correctRatings": {
            "item-1": "good",
            "item-2": "challenging",
            "item-3": "good",
            "item-4": "good"
          },
          "explanation": "Dollar-cost averaging works well in volatile and even crashing markets since you buy more shares when prices are lower. It's most challenging in consistently falling markets but still better than lump-sum investing at the wrong time."
        },
        {
          "id": "risk-pyramids",
          "type": "scq",
          "question": "In a risk pyramid, where should you place your largest percentage of money?",
          "options": [
            { "id": "opt-1", "content": "At the top (highest risk investments)", "isCorrect": false },
            { "id": "opt-2", "content": "In the middle (moderate risk investments)", "isCorrect": false },
            { "id": "opt-3", "content": "At the bottom (lowest risk investments)", "isCorrect": true },
            { "id": "opt-4", "content": "Equally across all risk levels", "isCorrect": false }
          ],
          "explanation": "A risk pyramid puts your largest percentage of money in the safest investments at the bottom, with progressively smaller amounts in higher-risk investments as you move up."
        },
        {
          "id": "expected-returns",
          "type": "sort-categories",
          "question": "Are these expectations realistic or unrealistic for long-term investing?",
          "items": [
            { "id": "item-1", "content": "7-10% average annual return from a stock index fund" },
            { "id": "item-2", "content": "Guaranteed 20% returns every year" },
            { "id": "item-3", "content": "Losing money some years, gaining in others" },
            { "id": "item-4", "content": "Never experiencing a market downturn" }
          ],
          "categories": [
            { "id": "realistic", "name": "Realistic" },
            { "id": "unrealistic", "name": "Unrealistic" }
          ],
          "correct_answers": {
            "item-1": "realistic",
            "item-2": "unrealistic",
            "item-3": "realistic",
            "item-4": "unrealistic"
          },
          "help_tips": "Setting realistic expectations helps you stick to your investment plan during inevitable market fluctuations."
        }
      ]
    }
  ] as Lesson[]