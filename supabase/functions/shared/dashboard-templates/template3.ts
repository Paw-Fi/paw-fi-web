export const dashboardTemplate3: any[] =[
  {
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