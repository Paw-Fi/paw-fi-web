// =============================================================================
// TEMPLATE 1: Financial Overview Dashboard (High-Level Summary)
// =============================================================================
export const dashboardTemplate1: any[] = [
  {
    "id": "keyMetricsDashboard",
    "type": "metricCard",
    "title": "Key Financial Overview",
    "icon": "fas fa-chart-pie",
    "column_span": 2,
    "data": {
      "metrics": [
        { "id": "metric-networth", "value": "150,000.00", "currency": "$", "trend": "up", "trendPercentage": "7.5", "description": "Total Assets minus Liabilities", "displayOrder": 1 },
        { "id": "metric-liquid-cash", "value": "8,500.00", "currency": "$", "description": "Available Cash", "displayOrder": 2 },
        { "id": "metric-investment-gain", "value": "1,200.00", "currency": "$", "trend": "up", "trendPercentage": "3.1", "description": "Monthly Investment Gain", "displayOrder": 3 }
      ]
    }
  },
  {
    "id": "financialHealthOverview",
    "type": "financialHealthScorecard",
    "title": "Financial Health Score",
    "icon": "fas fa-heartbeat",
    "column_span": 1,
    "data": {
      "items": [
        { "id": "fhs-budget", "category": "Budgeting", "score": 85, "status": "Excellent", "explanation": "Spending is well-managed and within income.", "displayOrder": 1 },
        { "id": "fhs-savings", "category": "Savings", "score": 70, "status": "Good", "explanation": "Consistent savings, but emergency fund could be larger.", "displayOrder": 2 },
        { "id": "fhs-debt", "category": "Debt", "score": 60, "status": "Fair", "explanation": "Some high-interest debt impacting overall health.", "displayOrder": 3 }
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
    "column_span": 1,
    "data": [
      { "id": "nba-debt", "title": "Consolidate Credit Card Debt", "message": "Consider a balance transfer to lower interest rates.", "priority": "high", "category": "Debt Management", "callToAction": "Explore Options", "actionLink": "#", "displayOrder": 1 },
      { "id": "nba-emergency", "title": "Boost Emergency Fund", "message": "Increase monthly contribution by $100.", "priority": "medium", "category": "Savings", "callToAction": "Adjust Savings", "actionLink": "#", "displayOrder": 2 }
    ]
  },
  {
    "id": "expenseCategoryPieChart",
    "type": "pieChart",
    "title": "Expense Categories",
    "icon": "fas fa-chart-pie",
    "column_span": 1,
    "data": {
      "dataPoints": [
        { "id": "chart-exp-cat-1", "label": "Housing", "value": 1200, "color": "#FF6384", "displayOrder": 1 },
        { "id": "chart-exp-cat-2", "label": "Transportation", "value": 400, "color": "#36A2EB", "displayOrder": 2 },
        { "id": "chart-exp-cat-3", "label": "Food", "value": 600, "color": "#FFCE56", "displayOrder": 3 },
        { "id": "chart-exp-cat-4", "label": "Other", "value": 650, "color": "#9966FF", "displayOrder": 4 }
      ],
      "height": 280,
      "showLegend": true
    }
  },
  {
    "id": "cashFlowSnapshot",
    "type": "quickCashFlowSummary",
    "title": "Monthly Cash Flow",
    "icon": "fas fa-exchange-alt",
    "column_span": 1,
    "data": {
      "inflows": [
        { "id": "cf-in-salary", "title": "Salary", "value": 5000, "category": "Primary Income", "displayOrder": 1 },
        { "id": "cf-in-freelance", "title": "Freelance", "value": 500, "category": "Secondary Income", "displayOrder": 2 }
      ],
      "outflows": [
        { "id": "cf-out-rent", "title": "Rent", "value": 1500, "category": "Housing", "displayOrder": 1 },
        { "id": "cf-out-loan", "title": "Student Loan", "value": 300, "category": "Debt", "displayOrder": 4 }
      ],
      "projectedPeriod": "Monthly"
    }
  }
];

// =============================================================================
// TEMPLATE 2: Goals & Future Planning Dashboard
// =============================================================================
export const dashboardTemplate2: any[] = [
  {
    "id": "retirementOutlook",
    "type": "retirementReadiness",
    "title": "Retirement Readiness",
    "icon": "fas fa-umbrella-beach",
    "column_span": 1,
    "row_span": 2,
    "data": {
      "scenarios": [
        { "id": "ret-scen-current", "scenarioName": "Current Path", "score": 65, "status": "Needs Significant Work", "projectionAmount": 850000, "projectionDate": "Age 67", "explanation": "Based on current savings rate.", "assumptions": "4% real return, $300/mo", "displayOrder": 1 },
        { "id": "ret-scen-optimized", "scenarioName": "Optimized", "score": 80, "status": "On Track", "projectionAmount": 1200000, "projectionDate": "Age 65", "explanation": "With increased contributions.", "assumptions": "5% real return, $600/mo", "displayOrder": 2 }
      ],
      "currentScenarioId": "ret-scen-current"
    }
  },
  {
    "id": "majorSavingsGoals",
    "type": "enhancedSavingsGoals",
    "title": "Major Savings Goals",
    "icon": "fas fa-piggy-bank",
    "column_span": 1,
    "data": {
      "items": [
        { "id": "esg-house", "name": "House Down Payment", "savedAmount": 25000, "targetAmount": 50000, "estimatedCompletionDate": "Dec 2026", "status": "On Track", "priority": "high", "displayOrder": 1 },
        { "id": "esg-travel", "name": "World Trip", "savedAmount": 3000, "targetAmount": 15000, "estimatedCompletionDate": "Jun 2027", "status": "Behind", "priority": "medium", "displayOrder": 2 }
      ]
    }
  },
  {
    "id": "debtProgress",
    "type": "debtVisualizer",
    "title": "Debt Payoff Progress",
    "icon": "fas fa-hand-holding-dollar",
    "column_span": 2,
    "strategy": "avalanche",
    "data": [
      { "id": "debt-cc-1", "name": "Visa Card", "currentBalance": 1200, "originalBalance": 2000, "interestRate": 24, "minPayment": 60, "payoffDate": "Dec 2025", "category": "Credit Card", "priority": 1, "displayOrder": 1 },
      { "id": "debt-loan-1", "name": "Personal Loan", "currentBalance": 5000, "originalBalance": 10000, "interestRate": 12, "minPayment": 200, "payoffDate": "Dec 2025", "category": "Loan", "priority": 2, "displayOrder": 2 },
      { "id": "debt-student", "name": "Student Loan", "currentBalance": 22000, "originalBalance": 25000, "interestRate": 4.5, "minPayment": 250, "payoffDate": "Jan 2030", "category": "Student Loan", "displayOrder": 3 }
    ]
  },
  {
    "id": "upcomingDeadlines",
    "type": "countdownCard",
    "title": "Important Dates",
    "icon": "fas fa-hourglass-half",
    "column_span": 1,
    "data": { "id": "countdown-trip", "title": "Summer Vacation to Italy", "days": 60, "image": "https://placehold.co/100x50/34D399/ffffff?text=✈️", "targetDate": "2025-08-07" }
  },
];

// =============================================================================
// TEMPLATE 3: Spending & Budgeting Deep Dive
// =============================================================================
export const dashboardTemplate3: any[] = [
  {
    "id": "monthlyExpenseBarChart",
    "type": "barChart",
    "title": "Monthly Expense Breakdown",
    "icon": "fas fa-chart-bar",
    "column_span": 2,
    "data": {
      "dataPoints": [
        { "id": "chart-exp-1", "label": "Rent", "value": 1500, "color": "#FF6384", "displayOrder": 1 },
        { "id": "chart-exp-2", "label": "Groceries", "value": 500, "color": "#36A2EB", "displayOrder": 2 },
        { "id": "chart-exp-3", "label": "Utilities", "value": 200, "color": "#FFCE56", "displayOrder": 3 },
        { "id": "chart-exp-4", "label": "Transport", "value": 180, "color": "#4BC0C0", "displayOrder": 4 },
        { "id": "chart-exp-5", "label": "Dining Out", "value": 350, "color": "#9966FF", "displayOrder": 5 }
      ],
      "xAxisLabel": "Expense Category",
      "yAxisLabel": "Amount ($)",
      "height": 280,
      "showLegend": false
    }
  },
  {
    "id": "cashFlowSummary",
    "type": "quickCashFlowSummary",
    "title": "Detailed Monthly Cash Flow",
    "icon": "fas fa-coins",
    "column_span": 1,
    "data": {
      "inflows": [
        { "id": "inc-salary", "title": "Main Salary", "value": 5000, "category": "Employment", "displayOrder": 1 },
        { "id": "inc-bonus", "title": "Bonus", "value": 1000, "category": "Bonus", "displayOrder": 2 },
        { "id": "inc-div", "title": "Dividends", "value": 50, "category": "Investments", "displayOrder": 3 }
      ],
      "outflows": [
        { "id": "out-rent", "title": "Rent", "value": 1800, "category": "Housing", "displayOrder": 1 },
        { "id": "out-food", "title": "Groceries", "value": 600, "category": "Food", "displayOrder": 2 },
        { "id": "out-util", "title": "Electricity", "value": 120, "category": "Utilities", "displayOrder": 3 },
        { "id": "out-ent", "title": "Entertainment", "value": 250, "category": "Discretionary", "displayOrder": 4 }
      ],
      "projectedPeriod": "Monthly"
    },
    "showCategories": true
  },
  {
    "id": "savingsBreakdown",
    "type": "dataList",
    "title": "Savings & Checking",
    "icon": "fas fa-piggy-bank",
    "column_span": 1,
    "data": {
      "items": [
        { "id": "dl-sav-1", "label": "Checking Account", "value": "2,500.00", "currency": "$", "category": "Liquid", "displayOrder": 1 },
        { "id": "dl-sav-2", "label": "High-Yield Savings", "value": "8,000.00", "currency": "$", "category": "Savings", "displayOrder": 2 },
        { "id": "dl-sav-3", "label": "Investment Account", "value": "45,000.00", "currency": "$", "category": "Investments", "displayOrder": 3 }
      ],
      "groupByCategory": true,
      "showTotals": true
    }
  }
];

// =============================================================================
// TEMPLATE 4: Assets & Protection Dashboard
// =============================================================================
export const dashboardTemplate4: any[] = [
  {
    "id": "investmentGrowthLineChart",
    "type": "lineChart",
    "title": "Investment Portfolio Growth",
    "icon": "fas fa-chart-line",
    "column_span": 2,
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
      "yAxisLabel": "Portfolio Value ($)",
      "height": 280,
      "showDataPoints": true
    }
  },
  {
    "id": "insuranceSummary",
    "type": "insuranceCoverage",
    "title": "Insurance Overview",
    "icon": "fas fa-shield-alt",
    "column_span": 1,
    "data": {
      "items": [
        { "id": "ins-health", "type": "Health Insurance", "provider": "MediCare Plus", "coverage": "$1M limit, $5k deductible", "premium": 350, "status": "Adequate", "renewalDate": "2026-01-01", "displayOrder": 1 },
        { "id": "ins-auto", "type": "Auto Insurance", "provider": "AutoSecure", "coverage": "Comprehensive, $500 deductible", "premium": 120, "status": "Review Recommended", "suggestion": "Shop for better rates.", "renewalDate": "2025-09-15", "displayOrder": 2 }
      ]
    }
  },
  {
    "id": "employeeBenefits",
    "type": "dataList",
    "title": "My Benefits",
    "icon": "fas fa-briefcase",
    "column_span": 1,
    "data": {
      "items": [
        { "id": "dl-ben-1", "label": "401K Match", "value": "6%", "currency": "", "displayOrder": 1 },
        { "id": "dl-ben-2", "label": "Health Deductible", "value": "1,500.00", "currency": "$", "displayOrder": 2 },
        { "id": "dl-ben-3", "label": "PTO Remaining", "value": "120", "currency": "hours", "displayOrder": 3 }
      ]
    }
  }
];

// =============================================================================
// TEMPLATE 5: Productivity & Tasks Dashboard
// =============================================================================
export const dashboardTemplate5: any[] = [
  {
    "id": "financialChecklist",
    "type": "checklist",
    "title": "Financial To-Do List",
    "icon": "fas fa-tasks",
    "column_span": 1,
    "row_span": 2,
    "data": {
      "items": [
        { "id": "chk-will", "task": "Update will and estate plan", "isCompleted": false, "dueDate": "2025-12-31", "priority": "high", "displayOrder": 1 },
        { "id": "chk-budget-review", "task": "Monthly budget review", "isCompleted": true, "category": "Budgeting", "displayOrder": 2 },
        { "id": "chk-invest-review", "task": "Quarterly portfolio review", "isCompleted": false, "priority": "medium", "displayOrder": 3 }
      ],
      "showCompleted": true,
      "sortBy": "priority"
    }
  },
  {
    "id": "actionableSteps",
    "type": "nextBestAction",
    "title": "Priority Actions",
    "icon": "fas fa-gavel",
    "column_span": 1,
    "data": [
      { "id": "nba-auto-invest", "title": "Setup Automated Investing", "message": "Automate monthly contributions to your brokerage.", "priority": "high", "callToAction": "Setup Now", "actionLink": "#", "isCompleted": false, "displayOrder": 1 },
      { "id": "nba-review-insurance", "title": "Review Life Insurance", "message": "Assess if current coverage meets family's needs.", "priority": "medium", "callToAction": "Consult Advisor", "dueDate": "2025-08-01", "isCompleted": false, "displayOrder": 2 }
    ],
    "maxDisplayItems": 2
  },
  {
    "id": "personalGoals",
    "type": "progressBarList",
    "title": "Personal Goals",
    "icon": "fas fa-bullseye",
    "column_span": 1,
    "data": {
      "items": [
        { "id": "goal-read", "label": "Books Read This Year", "current": 13, "max": 20, "color": "#4CAF50", "displayOrder": 1 },
        { "id": "goal-learn-code", "label": "Coding Course", "current": 8, "max": 10, "color": "#2196F3", "displayOrder": 2 },
        { "id": "goal-volunteer", "label": "Volunteer Hours", "current": 20, "max": 50, "color": "#FFC107", "displayOrder": 3 }
      ],
      "showPercentages": true
    }
  },
  {
    "id": "financialTips",
    "type": "tipCard",
    "title": "Smart Money Tips",
    "icon": "fas fa-lightbulb",
    "column_span": 1,
    "data": {
      "tips": [
        { "id": "tip-budget", "title": "Budgeting", "content": "Regularly review your budget to find savings.", "displayOrder": 1 },
        { "id": "tip-emergency", "title": "Emergency Fund", "content": "Aim for 3-6 months of living expenses.", "displayOrder": 2 },
        { "id": "tip-debt", "title": "Debt", "content": "Prioritize high-interest debts for faster payoff.", "displayOrder": 3 }
      ],
      "currentTipIndex": 0,
      "autoRotate": true
    }
  }
];
