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

/**
 * Builds the structured profile data object for the AI from flat quiz answers.
 * @param answers A flat object of quiz answers.
 * @returns A structured object for the AI prompt.
 */
function buildProfileData(answers: Record<string, any>) {
  const netIncome = answers['net-monthly-income'] || 0;
  const expenses = answers['total-monthly-expenses'] || 0;
  const age = answers['current-age'] || 0;
  const retirementAge = answers['retirement-age'] || 0;
  const cash = answers['cash-savings'] || 0;
  const pension = answers['pension-value'] || 0;
  const investments = answers['other-investments'] || 0;

  return {
    demographics: {
      age: age || 'Not specified',
      dependents: answers['number-of-dependents'] ?? 'Not specified',
      housing: answers['housing-situation'] || 'Not specified',
      income: {
        gross: answers['gross-monthly-income'] || 0,
        net: netIncome,
      },
      expenses: expenses,
    },
    financial_situation: {
      cash_savings: cash,
      pension_value: pension,
      other_investments: investments,
      monthly_pension_contribution: answers['monthly-pension-contribution'] || 0,
      emergency_fund: answers['emergency-fund'] || 0,
      debt_amount: answers['total-debt-amount'] || 0,
      debt_interest: answers['average-debt-interest'] || 'none',
      insurance_coverage: answers['insurance-coverage'] || [],
    },
    goals_and_timeline: {
      retirement_age: retirementAge || 'Not specified',
      target_retirement: answers['target-retirement'] || 0,
      financial_priorities: answers['financial-priorities'] || [],
      investment_goals: answers['investment-goals'] || [],
      time_horizon: answers['time-horizon'] || 'Not specified',
      expect_lump_sum: answers['expect-lump-sum'] || 'no',
    },
    risk_profile: {
      predictable_income: answers['predictable-income'] || 'Not specified',
      high_risk_preference: answers['high-risk-preference'] || 'Not specified',
      risky_investments: answers['risky-investments'] || 'Not specified',
      market_downturn: answers['market-downturn'] || 'Not specified',
      investment_knowledge: answers['investment-knowledge'] || 'beginner',
      liquidity_importance: answers['liquidity-importance'] || 'Not specified',
    },
    calculated_metrics: {
      monthly_savings: netIncome - expenses,
      years_to_retirement: retirementAge > age ? retirementAge - age : 0,
      total_assets: cash + pension + investments,
    },
  };
}

/**
 * Generates a profile description using AI and stores the complete profile in Supabase.
 * @param profileData The structured data for the AI.
 * @param quizAnswers The flat quiz answers.
 * @param userId The user's ID.
 * @param isUpdate A flag to adjust logging messages.
 * @returns A Response object.
 */
async function generateAndStoreProfile(profileData: any, quizAnswers: any, userId: string, isUpdate = false) {
  console.log("Profile data prepared for AI:", profileData);

  const prompt = `${PROFILE_GENERATION_PROMPT}

FINANCIAL PROFILE DATA:
${JSON.stringify(profileData, null, 2)}

Please generate a comprehensive financial profile description based on this data.`

  console.log("Sending request to Gemini AI...");

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

  console.log(`${isUpdate ? 'Upserting' : 'Inserting'} profile in database for user:`, userId);
  const { data: dbResult, error: dbError } = await supabaseClient
    .from("financial_health_profiles")
    .upsert({
      user_id: userId,
      profile_description: profileDescription,
      quiz_answers: quizAnswers,
      profile_data: profileData,
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (dbError) {
    console.error("Error upserting profile in database:", dbError);
  } else {
    console.log(`Successfully upserted profile in database with ID:`, dbResult.id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      profileDescription: profileDescription,
      profileData: profileData,
      profileId: dbResult?.id || null,
      debug: {
        message: `Profile ${isUpdate ? 'updated' : 'created'} and stored successfully`,
        timestamp: new Date().toISOString(),
        stored_in_db: !dbError,
      },
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const rawBody: string = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      return new Response(JSON.stringify({ error: "Request body is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const requestData = JSON.parse(rawBody);
    const { userId } = requestData;

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { quizAnswers, isPartialUpdate } = requestData;
      if (!quizAnswers) {
        return new Response(JSON.stringify({ error: "quizAnswers are required for POST" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Handle partial updates
      if (isPartialUpdate) {
        const { data: existingProfile } = await supabaseClient
          .from('financial_health_profiles')
          .select('quiz_answers')
          .eq('user_id', userId)
          .single();

        const existingAnswers = existingProfile?.quiz_answers || {};
        const updatedQuizAnswers = { ...existingAnswers, ...quizAnswers };
        
        const updatedProfileData = buildProfileData(updatedQuizAnswers);
        return await generateAndStoreProfile(updatedProfileData, updatedQuizAnswers, userId, true);
      }
      
      // Handle complete profile creation/update
      const profileData = buildProfileData(quizAnswers);
      return await generateAndStoreProfile(profileData, quizAnswers, userId, false);

    } else if (req.method === "PATCH") {
      const { partialData } = requestData;
      if (!partialData) {
        return new Response(JSON.stringify({ error: "partialData is required for PATCH" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingProfile } = await supabaseClient
        .from('financial_health_profiles')
        .select('quiz_answers')
        .eq('user_id', userId)
        .single();

      const existingAnswers = existingProfile?.quiz_answers || {};
      const updatedQuizAnswers = { ...existingAnswers, ...partialData };
      
      const updatedProfileData = buildProfileData(updatedQuizAnswers);
      return await generateAndStoreProfile(updatedProfileData, updatedQuizAnswers, userId, true);

    } else {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Internal Server Error:", errorMessage, error.stack);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
