# ai-scenario-planner

POST an authenticated request to evaluate a user scenario like "Can I..." by a target date. Uses Gemini and your DB data.

Body:
{
  "question": "Can I buy a $1,200 laptop?",
  "targetDate": "2025-04-01"
}

Returns: { success, advice, meta }
