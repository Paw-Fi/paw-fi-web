
export const dashboardTemplate1: any[] =[
  {
    "id": "actionableSteps",
    "type": "nextBestAction",
    "title": "Your Next Priority Actions",
    "icon": "fas fa-gavel",
    "columnSpan": 1,
    "data": [
      {
        "id": "nba-auto-invest",
        "title": "Setup Automated Investing",
        "message": "Automate monthly contributions to your brokerage account.",
        "priority": "high",
        "category": "Investing",
        "callToAction": "Setup Auto-Invest",
        "actionLink": "https://www.example.com/autoinvest",
        "dueDate": "2025-07-10",
        "isCompleted": false,
        "displayOrder": 1
      },
      {
        "id": "nba-review-insurance",
        "title": "Review Life Insurance Coverage",
        "message": "Assess if current life insurance meets family's future needs.",
        "priority": "medium",
        "category": "Insurance",
        "callToAction": "Consult Advisor",
        "dueDate": "2025-08-01",
        "isCompleted": false,
        "displayOrder": 2
      },
      {
        "id": "nba-refinance-car",
        "title": "Refinance Car Loan",
        "message": "Check for lower interest rates on your car loan.",
        "priority": "low",
        "category": "Debt",
        "isCompleted": true,
        "displayOrder": 3
      }
    ],
    "maxDisplayItems": 2,
    "filterByPriority": "high"
  },
  {
    "id": "cashFlowSummary",
    "type": "quickCashFlowSummary",
    "title": "Monthly Cash Flow Summary",
    "icon": "fas fa-coins",
    "columnSpan": 1,
    "data": {
      "inflows": [
        { "id": "inc-salary", "title": "Main Salary", "value": 5000, "category": "Employment", "frequency": "monthly", "isRecurring": true, "displayOrder": 1 },
        { "id": "inc-bonus", "title": "Quarterly Bonus", "value": 1000, "category": "Bonus", "frequency": "quarterly", "isRecurring": false, "displayOrder": 2 },
        { "id": "inc-div", "title": "Dividends", "value": 50, "category": "Investments", "frequency": "monthly", "isRecurring": true, "displayOrder": 3 }
      ],
      "outflows": [
        { "id": "out-rent", "title": "Apartment Rent", "value": 1800, "category": "Housing", "frequency": "monthly", "isRecurring": true, "displayOrder": 1 },
        { "id": "out-food", "title": "Groceries", "value": 600, "category": "Food", "frequency": "monthly", "isRecurring": true, "displayOrder": 2 },
        { "id": "out-util", "title": "Electricity Bill", "value": 120, "category": "Utilities", "frequency": "monthly", "isRecurring": true, "displayOrder": 3 },
        { "id": "out-ent", "title": "Entertainment", "value": 250, "category": "Discretionary", "frequency": "monthly", "isRecurring": true, "displayOrder": 4 }
      ],
      "projectedPeriod": "Monthly"
    },
    "showCategories": true,
    "showProjections": true
  },
  {
    "id": "debtProgress",
    "type": "debtVisualizer",
    "title": "Debt Payoff Progress",
    "icon": "fas fa-hand-holding-dollar",
    "columnSpan": 2,
    "strategy": "avalanche",
    "data": [
      {
        "id": "debt-cc-1",
        "name": "Visa Card",
        "currentBalance": 1200,
        "originalBalance": 2000,
        "interestRate": 24,
        "minPayment": 60,
        "payoffDate": "Dec 2025",
        "category": "Credit Card",
        "priority": 1,
        "displayOrder": 1
      },
      {
        "id": "debt-loan-1",
        "name": "Personal Loan",
        "currentBalance": 5000,
        "originalBalance": 10000,
        "interestRate": 12,
        "minPayment": 200,
        "payoffDate": "Dec 2025",
        "category": "Loan",
        "priority": 2,
        "displayOrder": 2
      }
    ]
  },
  {
    "id": "financialHealthOverview",
    "type": "financialHealthScorecard",
    "title": "Financial Health Score",
    "icon": "fas fa-heartbeat",
    "columnSpan": 1,
    "data": {
      "items": [
        {
          "id": "fhs-budget",
          "category": "Budgeting",
          "score": 85,
          "status": "Excellent",
          "explanation": "Spending is well-managed and within income.",
          "displayOrder": 1
        },
        {
          "id": "fhs-savings",
          "category": "Savings",
          "score": 70,
          "status": "Good",
          "explanation": "Consistent savings, but emergency fund could be larger.",
          "displayOrder": 2
        },
        {
          "id": "fhs-debt",
          "category": "Debt",
          "score": 60,
          "status": "Fair",
          "explanation": "Some high-interest debt impacting overall health.",
          "displayOrder": 3
        }
      ],
      "overallScore": 72,
      "overallStatus": "Good"
    }
  },
  {
    "id": "nextActions",
    "type": "nextBestAction",
    "title": "Recommended Actions",
    "icon": "fas fa-clipboard-check",
    "columnSpan": 1,
    "data": [
      {
        "id": "nba-debt",
        "title": "Consolidate Credit Card Debt",
        "message": "Consider a balance transfer or personal loan to lower interest rates on your credit card debt.",
        "priority": "high",
        "category": "Debt Management",
        "callToAction": "Explore Options",
        "actionLink": "#/debt-consolidation",
        "displayOrder": 1
      },
      {
        "id": "nba-emergency",
        "title": "Boost Emergency Fund",
        "message": "Increase your monthly contribution to your emergency fund by $100.",
        "priority": "medium",
        "category": "Savings",
        "callToAction": "Adjust Savings",
        "actionLink": "#/savings-adjust",
        "displayOrder": 2
      }
    ]
  },
  {
    "id": "cashFlowSnapshot",
    "type": "quickCashFlowSummary",
    "title": "Monthly Cash Flow",
    "icon": "fas fa-exchange-alt",
    "columnSpan": 2,
    "data": {
      "inflows": [
        { "id": "cf-in-salary", "title": "Salary", "value": 5000, "category": "Primary Income", "frequency": "monthly", "displayOrder": 1 },
        { "id": "cf-in-freelance", "title": "Freelance Work", "value": 500, "category": "Secondary Income", "frequency": "monthly", "displayOrder": 2 }
      ],
      "outflows": [
        { "id": "cf-out-rent", "title": "Rent", "value": 1500, "category": "Housing", "frequency": "monthly", "displayOrder": 1 },
        { "id": "cf-out-utilities", "title": "Utilities", "value": 200, "category": "Housing", "frequency": "monthly", "displayOrder": 2 },
        { "id": "cf-out-groceries", "title": "Groceries", "value": 400, "category": "Living Expenses", "frequency": "monthly", "displayOrder": 3 },
        { "id": "cf-out-loan", "title": "Student Loan", "value": 300, "category": "Debt", "frequency": "monthly", "displayOrder": 4 }
      ],
      "projectedPeriod": "Monthly"
    }
  },
  {
    "id": "debtOverview",
    "type": "debtVisualizer",
    "title": "Debt Breakdown",
    "icon": "fas fa-credit-card",
    "columnSpan": 2,
    "strategy": "avalanche",
    "data": [
      {
        "id": "debt-cc1",
        "name": "Visa Gold Card",
        "currentBalance": 5200,
        "originalBalance": 6000,
        "interestRate": 18.9,
        "minPayment": 150,
        "payoffDate": "Dec 2026",
        "category": "Credit Card",
        "displayOrder": 1
      },
      {
        "id": "debt-student",
        "name": "Student Loan - Federal",
        "currentBalance": 22000,
        "originalBalance": 25000,
        "interestRate": 4.5,
        "minPayment": 250,
        "payoffDate": "Jan 2030",
        "category": "Student Loan",
        "displayOrder": 2
      }
    ]
  },
]