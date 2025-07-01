
export const dashboardTemplate2: any[] =[
  {
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
]