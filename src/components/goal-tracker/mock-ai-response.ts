import { GoalCreationResult } from "./types";

export const MOCK_AI_RESPONSE: GoalCreationResult = {
    "success": true,
    "goal": {
        "id": "148ac48f-5e60-4be2-a089-8f434a844c7a",
        "title": "Achieve Homeownership: Your $400,000 Dream Home in 5 Years!",
        "description": "Your goal is to purchase a $400,000 home with a 10% down payment within 5 years. This includes not only the down payment but also estimated closing costs and moving expenses, ensuring you are fully prepared for all upfront financial commitments.",
        "goal_type": "home_buying",
        "category": null,
        "target_amount": 55000,
        "current_amount": 0,
        "currency": "USD",
        "start_date": "2025-07-31",
        "target_date": "2029-05-15",
        "estimated_completion_date": null,
        "ai_questionnaire_data": {
            "current_savings": "10000",
            "additional_costs": [
                "moving_expenses"
            ],
            "desired_timeline": "5_years",
            "target_home_price": "400000",
            "down_payment_percentage": "10",
            "monthly_savings_capacity": "1000"
        },
        "ai_generated_strategy": "Your comprehensive savings strategy will focus on consistent monthly contributions, leveraging your impressive savings capacity, and building a substantial financial buffer. We'll also integrate crucial financial health practices and timeline-specific actions to prepare you for a successful home purchase.",
        "ai_generated_milestones": [
            {
                "type": "habit",
                "title": "Establish Automated Savings",
                "dueDate": "2024-06-01",
                "priority": "critical",
                "frequency": "monthly",
                "aiRationale": "Automation is key to consistent savings. This ensures you prioritize your homeownership goal and build momentum without having to actively think about saving each month.",
                "description": "Set up an automatic transfer of $1,000 from your checking account to a dedicated savings account each month, ideally right after your paycheque arrives.",
                "habitDescription": "Automate transfer of $1,000 to home savings account.",
                "habitTargetValue": 1000
            },
            {
                "type": "amount",
                "title": "Reach Down Payment Fund",
                "dueDate": "2026-11-15",
                "priority": "high",
                "aiRationale": "Reaching the down payment milestone signifies significant progress towards your core goal and validates your savings plan. This amount is critical for securing your mortgage.",
                "description": "Accumulate enough savings to cover your target 10% down payment of $40,000.",
                "targetAmount": 40000
            },
            {
                "type": "amount",
                "title": "Total Target Savings Met",
                "dueDate": "2028-02-15",
                "priority": "high",
                "aiRationale": "Hitting your total target amount means you've successfully saved enough for all projected upfront costs, providing a clear pathway to beginning your home search without financial strain.",
                "description": "Achieve the full $55,000 target amount, covering down payment, closing costs, and moving expenses.",
                "targetAmount": 55000
            },
            {
                "type": "action",
                "title": "Credit Score Optimization & Pre-Approval",
                "dueDate": "2028-08-15",
                "priority": "critical",
                "aiRationale": "A strong credit score is vital for securing favorable mortgage rates. Pre-approval clarifies your borrowing power, makes you a more attractive buyer, and prepares you for the home-buying process.",
                "description": "Actively monitor and optimize your credit score. Once your total savings target is within reach (approx. 6-12 months before your desired purchase), apply for mortgage pre-approval."
            },
            {
                "type": "amount",
                "title": "Build Post-Purchase Emergency Fund",
                "dueDate": "2029-05-15",
                "priority": "high",
                "aiRationale": "Homeownership comes with unexpected expenses. A dedicated emergency fund provides a critical safety net for repairs, maintenance, or any unforeseen financial challenges, ensuring peace of mind after moving in.",
                "description": "Utilize the surplus savings beyond your target $55,000 (projected to be an additional $15,000) to establish a robust emergency fund specifically for home-related surprises and general financial stability.",
                "targetAmount": 70000
            },
            {
                "type": "habit",
                "title": "Annual Financial Health Check-in",
                "dueDate": "2025-05-15",
                "priority": "medium",
                "frequency": "one-time",
                "aiRationale": "Regular check-ins ensure your plan remains on track, allows for adjustments based on life changes or market conditions, and keeps you engaged with your financial progress.",
                "description": "Review your budget, savings progress, and financial goals annually to make any necessary adjustments to your plan.",
                "habitDescription": "Conduct a thorough review of budget, savings, and financial goals."
            }
        ],
        "ai_insights": null,
        "status": "active",
        "progress_percentage": 0,
        "is_on_track": true,
        "created_at": "2025-07-31T09:48:25.581981+00:00",
        "updated_at": "2025-07-31T09:48:25.581981+00:00",
        "completed_at": null
    },
    "milestones": [
        {
            "id": "a31e9b04-e300-41e3-a599-b1d83d4ad5b3",
            "goal_id": "148ac48f-5e60-4be2-a089-8f434a844c7a",
            "title": "Establish Automated Savings",
            "description": "Set up an automatic transfer of $1,000 from your checking account to a dedicated savings account each month, ideally right after your paycheque arrives.",
            "milestone_type": "habit",
            "target_amount": null,
            "current_amount": 0,
            "habit_description": "Automate transfer of $1,000 to home savings account.",
            "frequency": "monthly",
            "habit_target_value": 1000,
            "start_date": "2025-07-31",
            "due_date": "2024-06-01",
            "completed_date": null,
            "status": "pending",
            "progress_percentage": 0,
            "is_ai_generated": true,
            "display_order": 0,
            "priority": "critical",
            "created_at": "2025-07-31T09:48:25.973155+00:00",
            "updated_at": "2025-07-31T09:48:25.973155+00:00"
        },
        {
            "id": "cf8cdcdd-b949-426f-a1dd-5c9c6ea424ec",
            "goal_id": "148ac48f-5e60-4be2-a089-8f434a844c7a",
            "title": "Reach Down Payment Fund",
            "description": "Accumulate enough savings to cover your target 10% down payment of $40,000.",
            "milestone_type": "amount",
            "target_amount": 40000,
            "current_amount": 0,
            "habit_description": null,
            "frequency": null,
            "habit_target_value": null,
            "start_date": "2025-07-31",
            "due_date": "2026-11-15",
            "completed_date": null,
            "status": "pending",
            "progress_percentage": 0,
            "is_ai_generated": true,
            "display_order": 1,
            "priority": "high",
            "created_at": "2025-07-31T09:48:25.973155+00:00",
            "updated_at": "2025-07-31T09:48:25.973155+00:00"
        },
        {
            "id": "4cac0f80-1f53-4c9c-9690-f0170e21799c",
            "goal_id": "148ac48f-5e60-4be2-a089-8f434a844c7a",
            "title": "Total Target Savings Met",
            "description": "Achieve the full $55,000 target amount, covering down payment, closing costs, and moving expenses.",
            "milestone_type": "amount",
            "target_amount": 55000,
            "current_amount": 0,
            "habit_description": null,
            "frequency": null,
            "habit_target_value": null,
            "start_date": "2025-07-31",
            "due_date": "2028-02-15",
            "completed_date": null,
            "status": "pending",
            "progress_percentage": 0,
            "is_ai_generated": true,
            "display_order": 2,
            "priority": "high",
            "created_at": "2025-07-31T09:48:25.973155+00:00",
            "updated_at": "2025-07-31T09:48:25.973155+00:00"
        },
        {
            "id": "71713b4c-0482-4f23-8be5-6991ec7b15fa",
            "goal_id": "148ac48f-5e60-4be2-a089-8f434a844c7a",
            "title": "Credit Score Optimization & Pre-Approval",
            "description": "Actively monitor and optimize your credit score. Once your total savings target is within reach (approx. 6-12 months before your desired purchase), apply for mortgage pre-approval.",
            "milestone_type": "action",
            "target_amount": null,
            "current_amount": 0,
            "habit_description": null,
            "frequency": null,
            "habit_target_value": null,
            "start_date": "2025-07-31",
            "due_date": "2028-08-15",
            "completed_date": null,
            "status": "pending",
            "progress_percentage": 0,
            "is_ai_generated": true,
            "display_order": 3,
            "priority": "critical",
            "created_at": "2025-07-31T09:48:25.973155+00:00",
            "updated_at": "2025-07-31T09:48:25.973155+00:00"
        },
        {
            "id": "5868c4c1-d407-4dec-bc51-09ef3af8b3e2",
            "goal_id": "148ac48f-5e60-4be2-a089-8f434a844c7a",
            "title": "Build Post-Purchase Emergency Fund",
            "description": "Utilize the surplus savings beyond your target $55,000 (projected to be an additional $15,000) to establish a robust emergency fund specifically for home-related surprises and general financial stability.",
            "milestone_type": "amount",
            "target_amount": 70000,
            "current_amount": 0,
            "habit_description": null,
            "frequency": null,
            "habit_target_value": null,
            "start_date": "2025-07-31",
            "due_date": "2029-05-15",
            "completed_date": null,
            "status": "pending",
            "progress_percentage": 0,
            "is_ai_generated": true,
            "display_order": 4,
            "priority": "high",
            "created_at": "2025-07-31T09:48:25.973155+00:00",
            "updated_at": "2025-07-31T09:48:25.973155+00:00"
        },
        {
            "id": "a0d3f17c-b4ea-48e2-b817-0463b387b89e",
            "goal_id": "148ac48f-5e60-4be2-a089-8f434a844c7a",
            "title": "Annual Financial Health Check-in",
            "description": "Review your budget, savings progress, and financial goals annually to make any necessary adjustments to your plan.",
            "milestone_type": "habit",
            "target_amount": null,
            "current_amount": 0,
            "habit_description": "Conduct a thorough review of budget, savings, and financial goals.",
            "frequency": "one-time",
            "habit_target_value": null,
            "start_date": "2025-07-31",
            "due_date": "2025-05-15",
            "completed_date": null,
            "status": "pending",
            "progress_percentage": 0,
            "is_ai_generated": true,
            "display_order": 5,
            "priority": "medium",
            "created_at": "2025-07-31T09:48:25.973155+00:00",
            "updated_at": "2025-07-31T09:48:25.973155+00:00"
        }
    ],
    "strategy": "Your comprehensive savings strategy will focus on consistent monthly contributions, leveraging your impressive savings capacity, and building a substantial financial buffer. We'll also integrate crucial financial health practices and timeline-specific actions to prepare you for a successful home purchase.",
    "insights": [
        {
            "type": "savings",
            "title": "Excellent Savings Capacity & Buffer",
            "content": "Your current monthly savings capacity of $1,000 significantly exceeds the $750 required monthly to reach your goal. This means you will not only hit your target amount of $55,000 well before your 5-year timeline (approximately 3 years and 9 months), but you will also accumulate a substantial surplus of about $15,000 by the end of your desired 5-year period. This buffer is invaluable for post-purchase expenses or unexpected costs.",
            "priority": "high",
            "actionable": false
        },
        {
            "type": "timeline",
            "title": "Achievable Timeline with Room to Spare",
            "content": "The 5-year timeline is very realistic for your goal. In fact, you're projected to meet your core savings target even sooner, providing flexibility or the opportunity to save even more for a larger emergency fund or additional upgrades to your future home.",
            "priority": "medium",
            "actionable": false
        },
        {
            "type": "market",
            "title": "Monitor Market Conditions & Interest Rates",
            "content": "Over a 5-year period, real estate market conditions and interest rates can fluctuate. Stay informed about trends in your desired area and keep an eye on interest rate forecasts, as these will impact your mortgage affordability and monthly payments.",
            "priority": "high",
            "actionable": true
        },
        {
            "type": "strategy",
            "title": "Enhance Your Credit Profile",
            "content": "While saving, continuously work on maintaining and improving your credit score. A higher credit score can qualify you for better interest rates on your mortgage, saving you tens of thousands of dollars over the life of the loan. Pay bills on time, keep credit utilization low, and avoid opening new lines of credit unnecessarily.",
            "priority": "high",
            "actionable": true
        },
        {
            "type": "strategy",
            "title": "Consider Lender Options Early",
            "content": "As you get closer to your goal, research different mortgage lenders and loan programs. Understanding your options early can help you prepare the necessary documentation and choose the best fit for your financial situation when the time comes to apply for a mortgage.",
            "priority": "medium",
            "actionable": true
        }
    ],
    "projections": {
        "monthlyRequired": 750,
        "projectedFinalAmount": 70000,
        "confidenceLevel": 0.95
    },
    "debug": {
        "message": "Goal generated and stored successfully",
        "timestamp": "2025-07-31T09:48:26.209Z",
        "goalId": "148ac48f-5e60-4be2-a089-8f434a844c7a",
        "milestonesCreated": 6
    }
}