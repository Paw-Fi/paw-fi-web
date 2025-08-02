import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { RewardActions } from "../shared/update-reward-actions/reward-actions.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const INSIGHTS_GENERATION_PROMPT = `
You are Moneko, an enthusiastic and knowledgeable AI goal tracking assistant who loves helping users achieve their financial dreams! 🐱💰

GOAL DATA:
{{GOAL_DATA}}

PROGRESS ANALYSIS:
{{PROGRESS_ANALYSIS}}

As Moneko, analyze this user's goal progress and provide personalized insights. Speak in first person as Moneko with an encouraging, educational, and lively tone. Focus on:

1. Progress Assessment: How is the user doing? Are they on track?
2. Strategy Adjustments: What does Moneko think could work better?
3. Milestone Recommendations: Should milestones be tweaked based on what Moneko sees?
4. Motivational Support: Celebrate wins and encourage continued progress!
5. Risk Warnings: Alert about potential roadblocks Moneko notices

IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Generate insights as Moneko speaking directly to the user:

[
  {
    "type": "progress_assessment" | "strategy_suggestion" | "milestone_recommendation" | "celebration" | "progress_warning",
    "title": "What Moneko noticed (max 60 characters)",
    "content": "Moneko's personal message starting with phrases like 'I think...', 'I noticed...', 'I suggest...' (2-3 sentences max)",
    "priority": "low" | "medium" | "high" | "critical",
    "confidence": 0.0-1.0,
    "expiresAt": "YYYY-MM-DD" or null,
    "actionable": true | false
  }
]

Moneko's Guidelines:
- Generate 2-4 insights maximum as Moneko
- Be specific, actionable, and speak as a friendly AI assistant
- Use encouraging, educational language with personality
- Focus on most impactful recommendations Moneko can offer
- Set expiration dates for time-sensitive insights
- Confidence should reflect how certain Moneko is about the recommendation
- Always speak in first person as Moneko ("I think", "I noticed", "I suggest")
`;

interface InsightRequest {
  goalId: string;
  userId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { goalId, userId }: InsightRequest = await req.json();

    if (!goalId || !userId) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: goalId and userId are required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Generating insights for goal: ${goalId}, user: ${userId}`);

    // Get goal with current progress and milestones
    const { data: goalData, error: goalError } = await supabaseClient
      .from("financial_goals")
      .select(`
        *,
        goal_milestones (*),
        goal_progress_updates (*)
      `)
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (goalError || !goalData) {
      console.error("Goal not found:", goalError);
      return new Response(
        JSON.stringify({ 
          error: "Goal not found or access denied",
          details: goalError?.message 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate progress metrics
    const currentDate = new Date();
    const startDate = new Date(goalData.start_date);
    const targetDate = new Date(goalData.target_date);
    
    const daysTotal = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, daysTotal - daysPassed);
    
    const progressAnalysis = {
      currentProgress: goalData.progress_percentage,
      daysToTarget: daysRemaining,
      daysTotal,
      daysPassed,
      completedMilestones: goalData.goal_milestones?.filter((m: any) => m.status === 'completed').length || 0,
      totalMilestones: goalData.goal_milestones?.length || 0,
      overdueMilestones: goalData.goal_milestones?.filter((m: any) => 
        m.status !== 'completed' && new Date(m.due_date) < currentDate
      ).length || 0,
      recentUpdates: goalData.goal_progress_updates?.slice(-5) || [],
      monthlyProgress: calculateMonthlyProgress(goalData.goal_progress_updates || []),
      isOnTrack: goalData.is_on_track,
      amountRemaining: goalData.target_amount - goalData.current_amount,
      expectedProgress: daysTotal > 0 ? (daysPassed / daysTotal) * 100 : 0,
    };

    console.log("Progress analysis:", progressAnalysis);

    // Only generate insights if we don't have recent ones
    const { data: recentInsights } = await supabaseClient
      .from("goal_insights")
      .select("created_at")
      .eq("goal_id", goalId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(1);

    if (recentInsights && recentInsights.length > 0) {
      console.log("Recent insights exist, skipping generation");
      return new Response(JSON.stringify({
        success: true,
        insights: [],
        message: "Recent insights already exist",
        debug: { recentInsightsCount: recentInsights.length }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate AI insights
    const aiPrompt = INSIGHTS_GENERATION_PROMPT
      .replace("{{GOAL_DATA}}", JSON.stringify(goalData, null, 2))
      .replace("{{PROGRESS_ANALYSIS}}", JSON.stringify(progressAnalysis, null, 2));

    console.log("Sending request to Gemini AI for insights...");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const generationConfig = {
      responseMimeType: "application/json",
      maxOutputTokens: 2000,
      temperature: 0.7,
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
    }, generationConfig);

    const aiResponseText = result.response.text();
    console.log("AI insights response received:", aiResponseText);

    // Clean the response text to remove markdown formatting
    let cleanedResponse = aiResponseText.trim();
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
    }
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
    }
    
    console.log("Cleaned AI response:", cleanedResponse);

    // Parse AI response
    let insights;
    try {
      insights = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI insights response:", parseError);
      console.error("Original response:", aiResponseText);
      console.error("Cleaned response:", cleanedResponse);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse AI insights response", 
          details: parseError.message,
          rawResponse: aiResponseText,
          cleanedResponse: cleanedResponse
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate insights structure
    if (!Array.isArray(insights)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid AI insights response structure", 
          details: "Expected array of insights" 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Store insights in database
    const insightInserts = insights.map((insight: any) => ({
      goal_id: goalId,
      insight_type: insight.type,
      title: insight.title,
      content: insight.content,
      priority: insight.priority || 'medium',
      is_ai_generated: true,
      ai_confidence_score: Math.min(Math.max(insight.confidence || 0.8, 0), 1), // Clamp between 0 and 1
      expires_at: insight.expiresAt || null,
    }));

    const { data: newInsights, error: insightsError } = await supabaseClient
      .from("goal_insights")
      .insert(insightInserts)
      .select();

    if (insightsError) {
      console.error("Failed to save insights:", insightsError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to save insights to database", 
          details: insightsError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Successfully created ${newInsights?.length || 0} insights`);

    return new Response(JSON.stringify({
      success: true,
      insights: newInsights || [],
      progressAnalysis,
      debug: {
        message: "Insights generated and stored successfully",
        timestamp: new Date().toISOString(),
        goalId,
        insightsCreated: newInsights?.length || 0,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Internal Server Error:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateMonthlyProgress(progressUpdates: any[]): number {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const recentUpdates = progressUpdates.filter(update => 
    new Date(update.created_at) >= oneMonthAgo && 
    update.update_type === RewardActions.GOAL_PROGRESS_UPDATED
  );

  return recentUpdates.reduce((total, update) => total + (update.amount_change || 0), 0);
}