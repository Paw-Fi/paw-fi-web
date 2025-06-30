import { Widget } from "../types/dashboard-data.typings";

export const dashboardData: Widget[] =[
  {
    "id": "expenseCategoryPieChart",
    "type": "pieChart",
    "title": "Monthly Expense Categories",
    "icon": "fas fa-chart-pie",
    "columnSpan": 1,
    "data": {
      "dataPoints": [
        { "id": "chart-exp-cat-1", "label": "Housing", "value": 1200, "color": "#FF6384", "displayOrder": 1 },
        { "id": "chart-exp-cat-2", "label": "Transportation", "value": 400, "color": "#36A2EB", "displayOrder": 2 },
        { "id": "chart-exp-cat-3", "label": "Food", "value": 600, "color": "#FFCE56", "displayOrder": 3 },
        { "id": "chart-exp-cat-4", "label": "Utilities", "value": 300, "color": "#4BC0C0", "displayOrder": 4 },
        { "id": "chart-exp-cat-5", "label": "Entertainment", "value": 200, "color": "#9966FF", "displayOrder": 5 },
        { "id": "chart-exp-cat-6", "label": "Other", "value": 150, "color": "#FF9F40", "displayOrder": 6 }
      ],
      "xAxisLabel": "Category",
      "yAxisLabel": "Amount ($)"
    },
    "height": 280,
    "showLegend": true
  },
  {
    "id": "keyMetricsDashboard",
    "type": "metricCard",
    "title": "Key Financial Overview",
    "icon": "fas fa-chart-pie",
    "columnSpan": 1,
    "data": [
      {
        "id": "metric-networth",
        "value": "150,000.00",
        "currency": "$",
        "trend": "up",
        "trendPercentage": "7.5",
        "description": "Total Assets minus Liabilities",
        "displayOrder": 1
      },
      {
        "id": "metric-liquid-cash",
        "value": "8,500.00",
        "currency": "$",
        "description": "Available Cash",
        "displayOrder": 2
      },
      {
        "id": "metric-investment-gain",
        "value": "1,200.00",
        "currency": "$",
        "trend": "up",
        "trendPercentage": "3.1",
        "description": "Monthly Investment Gain",
        "displayOrder": 3
      }
    ],
    "displayMode": "carousel"
  },
  {
    "id": "personalGoals",
    "type": "progressBarList",
    "title": "My Personal Goals",
    "icon": "fas fa-bullseye",
    "columnSpan": 1,
    "data": [
      {
        "id": "goal-read",
        "label": "Books Read This Year",
        "current": 13,
        "max": 20,
        "color": "#4CAF50",
        "displayOrder": 1
      },
      {
        "id": "goal-learn-code",
        "label": "Coding Course Progress",
        "current": 8,
        "max": 10,
        "color": "#2196F3",
        "displayOrder": 2
      },
      {
        "id": "goal-volunteer",
        "label": "Volunteer Hours",
        "current": 20,
        "max": 50,
        "color": "#FFC107",
        "displayOrder": 3
      }
    ],
    "showPercentages": true,
    "sortBy": "progress"
  },
  {
    "id": "upcomingDeadlines",
    "type": "countdownCard",
    "title": "Important Dates",
    "icon": "fas fa-hourglass-half",
    "columnSpan": 1,
    "data": {
      "id": "countdown-trip",
      "title": "Summer Vacation to Italy",
      "days": 60,
      "image": "https://placehold.co/100x50/34D399/ffffff?text=✈️",
      "targetDate": "2025-08-07"
    }
  },
  {
    "id": "financialTips",
    "type": "tipCard",
    "title": "Smart Money Tips",
    "icon": "fas fa-lightbulb",
    "columnSpan": 2,
    "data": {
      "tips": [
        {
          "id": "tip-budget",
          "title": "Budgeting Tip",
          "content": "Regularly review your budget to identify areas for savings.",
          "displayOrder": 1
        },
        {
          "id": "tip-emergency",
          "title": "Emergency Fund",
          "content": "Aim for 3-6 months of living expenses in your emergency fund.",
          "displayOrder": 2
        },
        {
          "id": "tip-debt",
          "title": "Debt Management",
          "content": "Prioritize high-interest debts for faster payoff.",
          "displayOrder": 3
        }
      ],
      "currentTipIndex": 0,
      "autoRotate": true
    }
  },
  {
    "id": "savingsBreakdown",
    "type": "dataList",
    "title": "Savings Accounts",
    "icon": "fas fa-piggy-bank",
    "columnSpan": 1,
    "data": [
      { "id": "dl-sav-1", "label": "Checking Account", "value": "2,500.00", "currency": "$", "category": "Liquid", "displayOrder": 1 },
      { "id": "dl-sav-2", "label": "High-Yield Savings", "value": "8,000.00", "currency": "$", "category": "Savings", "displayOrder": 2 },
      { "id": "dl-sav-3", "label": "Investment Account", "value": "45,000.00", "currency": "$", "category": "Investments", "displayOrder": 3 }
    ],
    "groupByCategory": true,
    "showTotals": true,
    "tip": "Consider diversifying your investments.",
    "footerLink": { "text": "View All Accounts", "url": "#", "icon": "fas fa-chevron-circle-right" }
  },
  {
    "id": "employeeBenefits",
    "type": "dataList",
    "title": "My Benefits",
    "icon": "fas fa-briefcase",
    "columnSpan": 1,
    "data": [
      { "id": "dl-ben-1", "label": "401K Match", "value": "6%", "currency": "", "displayOrder": 1 },
      { "id": "dl-ben-2", "label": "Health Insurance Deductible", "value": "1,500.00", "currency": "$", "displayOrder": 2 },
      { "id": "dl-ben-3", "label": "PTO Remaining", "value": "120", "currency": "hours", "displayOrder": 3 }
    ]
  },
  {
    "id": "monthlyExpenseBarChart",
    "type": "barChart",
    "title": "Monthly Expense Breakdown",
    "icon": "fas fa-chart-bar",
    "columnSpan": 2,
    "data": {
      "dataPoints": [
        { "id": "chart-exp-1", "label": "Rent", "value": 1500, "color": "#FF6384", "displayOrder": 1 },
        { "id": "chart-exp-2", "label": "Groceries", "value": 500, "color": "#36A2EB", "displayOrder": 2 },
        { "id": "chart-exp-3", "label": "Utilities", "value": 200, "color": "#FFCE56", "displayOrder": 3 },
        { "id": "chart-exp-4", "label": "Transport", "value": 180, "color": "#4BC0C0", "displayOrder": 4 },
        { "id": "chart-exp-5", "label": "Dining Out", "value": 350, "color": "#9966FF", "displayOrder": 5 }
      ],
      "xAxisLabel": "Expense Category",
      "yAxisLabel": "Amount ($)"
    },
    "height": 280,
    "showLegend": false
  },
  {
    "id": "investmentGrowthLineChart",
    "type": "lineChart",
    "title": "Investment Portfolio Growth",
    "icon": "fas fa-chart-line",
    "columnSpan": 2,
    "data": {
      "dataPoints": [
        { "id": "chart-inv-1", "label": "Jan", "value": 40000, "displayOrder": 1 },
        { "id": "chart-inv-2", "label": "Feb", "value": 41500, "displayOrder": 2 },
        { "id": "chart-inv-3", "label": "Mar", "value": 40800, "displayOrder": 3 },
        { "id": "chart-inv-4", "label": "Apr", "value": 42500, "displayOrder": 4 },
        { "id": "chart-inv-5", "label": "May", "value": 43100, "displayOrder": 5 },
        { "id": "chart-inv-6", "label": "Jun", "value": 44000, "displayOrder": 6 }
      ],
      "xAxisLabel": "Month",
      "yAxisLabel": "Portfolio Value ($)"
    },
    "height": 280,
    "showDataPoints": true,
    "showLegend": false
  },
  {
    "id": "overallHealthScore",
    "type": "financialHealthScorecard",
    "title": "Comprehensive Health Report",
    "icon": "fas fa-heart-pulse",
    "columnSpan": 1,
    "data": {
      "items": [
        {
          "id": "fhi-budget",
          "category": "Budgeting",
          "score": 85,
          "status": "Excellent",
          "explanation": "Consistent tracking and adherence to budget limits.",
          "weight": 0.25,
          "displayOrder": 1
        },
        {
          "id": "fhi-savings",
          "category": "Savings",
          "score": 70,
          "status": "Good",
          "explanation": "Solid emergency fund, consistent savings for goals.",
          "weight": 0.25,
          "displayOrder": 2
        },
        {
          "id": "fhi-debt",
          "category": "Debt",
          "score": 60,
          "status": "Fair",
          "explanation": "Some high-interest debt, but actively working on payoff.",
          "weight": 0.25,
          "displayOrder": 3
        },
        {
          "id": "fhi-investments",
          "category": "Investments",
          "score": 78,
          "status": "Good",
          "explanation": "Diversified portfolio with steady growth.",
          "weight": 0.25,
          "displayOrder": 4
        }
      ],
      "overallScore": 73,
      "overallStatus": "Good"
    },
    "showIndividualScores": true
  },
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
  {
    "id": "retirementOutlook",
    "type": "retirementReadiness",
    "title": "Retirement Readiness",
    "icon": "fas fa-umbrella-beach",
    "columnSpan": 1,
    "data": {
      "scenarios": [
        {
          "id": "ret-scen-current",
          "scenarioName": "Current Path",
          "score": 65,
          "status": "Needs Significant Work",
          "projectionAmount": 850000,
          "projectionDate": "Age 67",
          "explanation": "Based on current savings rate and market assumptions. Consider increasing contributions.",
          "assumptions": "4% real return, $300/month contribution",
          "displayOrder": 1
        },
        {
          "id": "ret-scen-optimized",
          "scenarioName": "Optimized Path",
          "score": 80,
          "status": "On Track",
          "projectionAmount": 1200000,
          "projectionDate": "Age 65",
          "explanation": "With increased contributions and diversified investments.",
          "assumptions": "5% real return, $600/month contribution",
          "displayOrder": 2
        }
      ],
      "currentScenarioId": "ret-scen-current"
    }
  },
  {
    "id": "majorSavingsGoals",
    "type": "enhancedSavingsGoals",
    "title": "Major Savings Goals",
    "icon": "fas fa-piggy-bank",
    "columnSpan": 1,
    "data": [
      {
        "id": "esg-house",
        "name": "House Down Payment",
        "savedAmount": 25000,
        "targetAmount": 50000,
        "estimatedCompletionDate": "Dec 2026",
        "status": "On Track",
        "category": "Home",
        "priority": "high",
        "displayOrder": 1
      },
      {
        "id": "esg-travel",
        "name": "World Trip",
        "savedAmount": 3000,
        "targetAmount": 15000,
        "estimatedCompletionDate": "Jun 2027",
        "status": "Behind",
        "category": "Travel",
        "priority": "medium",
        "displayOrder": 2
      }
    ]
  },
  {
    "id": "insuranceSummary",
    "type": "insuranceCoverage",
    "title": "Insurance Overview",
    "icon": "fas fa-shield-alt",
    "columnSpan": 1,
    "data": [
      {
        "id": "ins-health",
        "type": "Health Insurance",
        "provider": "MediCare Plus",
        "coverage": "$1M annual limit, $5k deductible",
        "premium": 350,
        "status": "Adequate",
        "renewalDate": "2026-01-01",
        "displayOrder": 1
      },
      {
        "id": "ins-auto",
        "type": "Auto Insurance",
        "provider": "AutoSecure",
        "coverage": "Comprehensive, $500 deductible",
        "premium": 120,
        "status": "Review Recommended",
        "suggestion": "Shop for better rates or increased liability.",
        "renewalDate": "2025-09-15",
        "displayOrder": 2
      }
    ]
  },
  {
    "id": "financialChecklist",
    "type": "checklist",
    "title": "Financial To-Do List",
    "icon": "fas fa-tasks",
    "columnSpan": 1,
    "data": [
      {
        "id": "chk-will",
        "task": "Update will and estate plan",
        "isCompleted": false,
        "dueDate": "2025-12-31",
        "priority": "high",
        "displayOrder": 1
      },
      {
        "id": "chk-budget-review",
        "task": "Monthly budget review",
        "isCompleted": true,
        "category": "Budgeting",
        "displayOrder": 2
      },
      {
        "id": "chk-invest-review",
        "task": "Quarterly investment portfolio review",
        "isCompleted": false,
        "priority": "medium",
        "displayOrder": 3
      }
    ]
  }
]