import { Widget } from "../types/dashboard-data.typings";

export const dashboardData: Widget[] = [
    {
      "id": "quickCashFlow",
      "type": "quickCashFlowSummary",
      "title": "Monthly Cash Flow",
      "icon": "Banknote",
      "columnSpan": 2,
      "data": {
        "income": 3000,
        "expenses": 1880
      }
    },
    {
      "id": "financialHealth",
      "type": "financialHealthScorecard",
      "title": "Financial Health",
      "icon": "ShieldCheck",
      "columnSpan": 1,
      "data": {
        "score": 55,
        "status": "Fair",
        "explanation": "You have a good income-to-essential expense ratio. Focus on building an emergency fund and starting retirement savings."
      }
    },
    {
      "id": "nextAction",
      "type": "nextBestAction",
      "title": "Your Next Step",
      "icon": "ChevronsRight",
      "columnSpan": 1,
      "data": {
        "message": "Start contributing to a retirement account early to take advantage of compound interest.",
        "callToAction": "Setup Retirement Contributions"
      }
    },
    {
      "id": "debtVisualizer",
      "type": "debtVisualizer",
      "title": "Debt Payoff Plan",
      "icon": "CreditCard",
      "columnSpan": 2,
      "strategy": "avalanche",
      "data": [
        {
          "name": "Mortgage",
          "currentBalance": 110000,
          "originalBalance": 110000,
          "interestRate": 4,
          "minPayment": 880,
          "payoffDate": "Dec 2037"
        }
      ]
    },
    {
      "id": "enhancedSavingsGoals",
      "type": "enhancedSavingsGoals",
      "title": "Your Savings Goals",
      "icon": "Target",
      "columnSpan": 1,
      "data": [
        {
          "name": "Mortgage Repayment",
          "savedAmount": 15000,
          "targetAmount": 110000,
          "estimatedCompletionDate": "Dec 2034",
          "status": "On Track"
        }
      ]
    },
    {
      "id": "retirementReadiness",
      "type": "retirementReadiness",
      "title": "Retirement Readiness",
      "icon": "Handshake",
      "columnSpan": 1,
      "data": {
        "score": 20,
        "status": "Needs Significant Work",
        "projectionAmount": 500000,
        "projectionDate": "Age 67",
        "explanation": "Starting early is key. Begin regular contributions to a retirement fund to significantly impact your future."
      }
    },
    {
      "id": "insuranceCoverage",
      "type": "insuranceCoverage",
      "title": "Insurance Coverage",
      "icon": "ShieldCheck",
      "columnSpan": 1,
      "data": [
        { "type": "Health Insurance", "status": "Adequate" },
        { "type": "Home Insurance", "status": "Adequate" },
        { "type": "Auto Insurance", "status": "Adequate" },
        { "type": "Life Insurance", "status": "Adequate" }
      ]
    },
    {
      "id": "barChartExpenses",
      "type": "barChart",
      "title": "Monthly Spending Categories",
      "icon": "BarChart2",
      "columnSpan": 2,
      "data": {
        "labels": ["Groceries & Shopping"],
        "values": [650]
      }
    },
    {
      "id": "lineChartInvestments",
      "type": "lineChart",
      "title": "Investment Value Trend",
      "icon": "LineChartIcon",
      "columnSpan": 2,
      "data": {
        "labels": ["6 Months Ago", "Today"],
        "values": [0, 0]
      }
    },
    {
      "id": "netWorth",
      "type": "metricCard",
      "title": "Estimated Net Worth",
      "icon": "Wallet",
      "columnSpan": 1,
      "data": {
        "value": "-95000.00",
        "currency": "$",
        "description": "Your current net worth (assets minus liabilities)."
      }
    },
    {
      "id": "progressBarGoals",
      "type": "progressBarList",
      "title": "General Financial Progress",
      "icon": "Target",
      "columnSpan": 1,
      "data": [
        { "label": "Debt Reduction (Mortgage)", "progress": 0.136 },
        { "label": "Wealth Growth", "progress": 0.05 }
      ]
    },
    {
      "id": "countdownFinancialReview",
      "type": "countdownCard",
      "title": "Days Until Next Financial Review",
      "icon": "Calendar",
      "columnSpan": 1,
      "data": {
        "days": 90,
        "image": "https://placehold.co/100x50/A78BFA/ffffff?text=📋"
      }
    },
    {
      "id": "dataListSavings",
      "type": "dataList",
      "title": "Key Savings Accounts",
      "icon": "PiggyBank",
      "columnSpan": 1,
      "data": [
        {
          "label": "Mortgage Repayment Fund",
          "value": "15000.00",
          "currency": "$"
        }
      ],
      "tip": "Consider allocating a portion of your monthly contribution to an emergency fund."
    },
    {
      "id": "dataListEmployeeBenefits",
      "type": "dataList",
      "title": "Employee Benefits Overview",
      "icon": "Briefcase",
      "columnSpan": 1,
      "data": [
        { "label": "401K Match", "value": "N/A", "currency": "" },
        { "label": "Health Coverage", "value": "Comprehensive", "currency": "" }
      ]
    },
    {
      "id": "tipCardComprehensive",
      "type": "tipCard",
      "title": "Pro Financial Tips",
      "icon": "Lightbulb",
      "columnSpan": 2,
      "data": {
        "currentTipIndex": 0,
        "tips": [
          "Building an emergency fund of 3-6 months' expenses is crucial for financial security.",
          "Even small, consistent contributions to retirement accounts can lead to significant growth over time.",
          "Regularly review your budget to ensure your spending aligns with your financial goals.",
          "Automate your savings to ensure you're consistently putting money towards your goals."
        ]
      }
    }
  ];