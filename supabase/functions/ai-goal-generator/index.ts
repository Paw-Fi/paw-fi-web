import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

interface AIGoalResponse {
  goal: {
    title: string;
    description: string;
    targetAmount: number;
    targetDate: string;
    rationale: string;
  };
  strategy: string;
  milestones: Array<{
    title: string;
    description: string;
    type: string;
    targetAmount?: number;
    dueDate: string;
    habitDescription?: string;
    frequency?: string;
    habitTargetValue?: number;
    priority: string;
    aiRationale: string;
  }>;
  insights: Array<{
    type: string;
    title: string;
    content: string;
    priority: string;
    actionable: boolean;
  }>;
  projections?: {
    monthlyRequired?: number;
    projectedFinalAmount?: number;
    incomeReplacement?: number;
    confidenceLevel?: number;
  } | null;
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
    const { userId, goalType, questionnaireAnswers } = await req.json();

    if (!userId || !goalType || !questionnaireAnswers) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: userId, goalType, and questionnaireAnswers are required" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing AI goal generation for user: ${userId}, goal type: ${goalType}`);

    // Get questionnaire template
    const { data: template, error: templateError } = await supabaseClient
      .from("goal_questionnaire_templates")
      .select("*")
      .eq("goal_type", goalType)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("Template error:", templateError);
      return new Response(
        JSON.stringify({ 
          error: `No active questionnaire template found for goal type: ${goalType}` 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare AI prompt with questionnaire data
    const aiPrompt = template.ai_prompt_template.replace(
      "{{QUESTIONNAIRE_DATA}}", 
      JSON.stringify(questionnaireAnswers, null, 2)
    );

    console.log("Sending request to Gemini AI...");

    // Generate AI response
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const generationConfig = {
      responseMimeType: "text/plain",
      maxOutputTokens: 3000,
      temperature: 0.7,
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
    }, generationConfig);

    const aiResponseText = result.response.text();
    console.log("AI Response received:", aiResponseText);

    // Parse AI response - handle JSON wrapped in markdown code blocks
    let aiResponse: AIGoalResponse;
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = aiResponseText.trim();
      const jsonMatch = jsonText.match(/\{.*\}/s);

      if (jsonMatch && jsonMatch[0]) {
        jsonText = jsonMatch[0];
      } else {
        // Fallback for cases where regex might fail but it's still valid JSON
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.substring(7, jsonText.length - 3).trim();
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.substring(3, jsonText.length - 3).trim();
        }
      }
      
      const parsed = JSON.parse(jsonText);

      // Validate the structure of the AI response
      if (!parsed.goal || !parsed.strategy) {
        throw new Error("Missing required fields: goal or strategy");
      }

      // Ensure milestones, insights, and projections are at least empty arrays/null if not provided
      parsed.milestones = parsed.milestones || [];
      parsed.insights = parsed.insights || [];
      parsed.projections = parsed.projections || null;

      aiResponse = parsed as AIGoalResponse;

    } catch (e) {
      console.error("AI Response parsing error:", e);
      return new Response(
        JSON.stringify({
          error: "Invalid AI response structure",
          details: e.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create goal in database
    const { data: newGoal, error: goalError } = await supabaseClient
      .from("financial_goals")
      .insert({
        user_id: userId,
        title: aiResponse.goal.title,
        description: aiResponse.goal.description,
        goal_type: goalType,
        target_amount: aiResponse.goal.targetAmount,
        target_date: aiResponse.goal.targetDate,
        ai_questionnaire_data: questionnaireAnswers,
        ai_generated_strategy: aiResponse.strategy,
        ai_generated_milestones: aiResponse.milestones,
      })
      .select()
      .single();

    if (goalError) {
      console.error("Goal creation error:", goalError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create goal in database", 
          details: goalError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Goal created successfully:", newGoal.id);

    let newMilestones: any[] | null = [];
    // Create AI-generated milestones
    if (aiResponse.milestones && aiResponse.milestones.length > 0) {
      const milestoneInserts = aiResponse.milestones.map((milestone, index) => ({
        goal_id: newGoal.id,
        title: milestone.title,
        description: milestone.description,
        milestone_type: milestone.type,
        target_amount: milestone.targetAmount || null,
        due_date: milestone.dueDate,
        habit_description: milestone.habitDescription || null,
        frequency: milestone.frequency || null,
        habit_target_value: milestone.habitTargetValue || null,
        is_ai_generated: true,
        display_order: index,
        priority: milestone.priority || 'medium',
      }));

      const { data, error: milestonesError } = await supabaseClient
        .from("goal_milestones")
        .insert(milestoneInserts)
        .select();
      
      newMilestones = data;

      if (milestonesError) {
        console.error("Milestones creation error:", milestonesError);
        // Don't fail the entire operation, just log the error
        console.warn("Continuing without milestones due to creation error");
      } else {
        console.log(`Created ${newMilestones?.length || 0} milestones`);
      }
    }

    // Create AI insights if provided
    if (aiResponse.insights && aiResponse.insights.length > 0) {
      const insightInserts = aiResponse.insights.map((insight) => ({
        goal_id: newGoal.id,
        insight_type: insight.type,
        title: insight.title,
        content: insight.content,
        priority: insight.priority,
        is_ai_generated: true,
        ai_confidence_score: 0.8, // Default confidence for initial insights
      }));

      const { error: insightsError } = await supabaseClient
        .from("goal_insights")
        .insert(insightInserts);

      if (insightsError) {
        console.warn("Failed to create insights:", insightsError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      goal: newGoal,
      milestones: newMilestones || [],
      strategy: aiResponse.strategy,
      insights: aiResponse.insights || [],
      projections: aiResponse.projections || null,
      debug: {
        message: "Goal generated and stored successfully",
        timestamp: new Date().toISOString(),
        goalId: newGoal.id,
        milestonesCreated: newMilestones?.length || 0,
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