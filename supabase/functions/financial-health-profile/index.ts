import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../shared/cors.ts";
import { PROFILE_GENERATION_PROMPT } from "./prompt.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error(
    "CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.",
  );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

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
    const rawBody: string = await req.text();
    let requestData;
    
    try {
      if (!rawBody || rawBody.trim() === "") {
        return new Response(
          JSON.stringify({ error: "Request body is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      requestData = JSON.parse(rawBody);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
          details: { rawBody },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { quizAnswers, userId } = requestData;

    if (!quizAnswers) {
      return new Response(
        JSON.stringify({ error: "Quiz answers are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Processing quiz answers for user:", userId);
    console.log("Quiz answers received:", quizAnswers);

    // Prepare data for AI analysis
    const profileData = {
      demographics: {
        age: quizAnswers['current-age'] || 'Not specified',
        dependents: quizAnswers['number-of-dependents'] || 0,
        housing: quizAnswers['housing-situation'] || 'Not specified',
        income: {
          gross: quizAnswers['gross-monthly-income'] || 0,
          net: quizAnswers['net-monthly-income'] || 0,
        },
        expenses: quizAnswers['total-monthly-expenses'] || 0,
      },
      financial_situation: {
        cash_savings: quizAnswers['cash-savings'] || 0,
        pension_value: quizAnswers['pension-value'] || 0,
        other_investments: quizAnswers['other-investments'] || 0,
        monthly_pension_contribution: quizAnswers['monthly-pension-contribution'] || 0,
        emergency_fund: quizAnswers['emergency-fund'] || 0,
        debt_amount: quizAnswers['total-debt-amount'] || 0,
        debt_interest: quizAnswers['average-debt-interest'] || 'none',
        insurance_coverage: quizAnswers['insurance-coverage'] || [],
      },
      goals_and_timeline: {
        retirement_age: quizAnswers['retirement-age'] || 65,
        target_retirement: quizAnswers['target-retirement'] || 0,
        financial_priorities: quizAnswers['financial-priorities'] || [],
        investment_goals: quizAnswers['investment-goals'] || [],
        time_horizon: quizAnswers['time-horizon'] || 'medium',
        expect_lump_sum: quizAnswers['expect-lump-sum'] || 'no',
      },
      risk_profile: {
        predictable_income: quizAnswers['predictable-income'] || 'yes',
        high_risk_preference: quizAnswers['high-risk-preference'] || 'no',
        risky_investments: quizAnswers['risky-investments'] || 'no',
        market_downturn: quizAnswers['market-downturn'] || 'wait',
        investment_knowledge: quizAnswers['investment-knowledge'] || 'beginner',
        liquidity_importance: quizAnswers['liquidity-importance'] || 'important',
      },
      calculated_metrics: {
        // Basic calculations we can do without importing the calculation functions
        monthly_savings: (quizAnswers['net-monthly-income'] || 0) - (quizAnswers['total-monthly-expenses'] || 0),
        years_to_retirement: (quizAnswers['retirement-age'] || 65) - (quizAnswers['current-age'] || 30),
        total_assets: (quizAnswers['cash-savings'] || 0) + (quizAnswers['pension-value'] || 0) + (quizAnswers['other-investments'] || 0),
        // Note: More complex calculations are done in the client-side code
      },
    };

    console.log("Profile data prepared for AI:", profileData);

    // Generate AI prompt with the profile data
    const prompt = `${PROFILE_GENERATION_PROMPT}

FINANCIAL PROFILE DATA:
${JSON.stringify(profileData, null, 2)}

Please generate a comprehensive financial profile description based on this data.`;

    console.log("Sending request to Gemini AI...");

    // Call Google Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const generationConfig = {
      responseMimeType: "text/plain",
      maxOutputTokens: 2000,
      temperature: 0.7,
    };

    const result = await model.generateContent(
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      generationConfig,
    );

    const profileDescription = result.response.text();
    console.log("AI generated profile description:", profileDescription);

    // Store the profile in the database
    console.log("Storing profile in database for user:", userId);
    const { data: dbResult, error: dbError } = await supabaseClient
      .from("financial_health_profiles")
      .insert({
        user_id: userId,
        profile_description: profileDescription,
        quiz_answers: quizAnswers,
        profile_data: profileData,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Error storing profile in database:", dbError);
      // Continue without failing - return the profile even if storage fails
    } else {
      console.log("Successfully stored profile in database with ID:", dbResult.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        profileDescription: profileDescription,
        profileData: profileData,
        profileId: dbResult?.id || null,
        debug: {
          message: "Profile generated and stored successfully",
          timestamp: new Date().toISOString(),
          stored_in_db: !dbError,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );

  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown internal server error";
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
      },
    );
  }
});