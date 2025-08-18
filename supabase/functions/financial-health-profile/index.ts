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
  // Use snake_case field names to match frontend quiz structure
  const netIncome = answers['net_monthly_income'] || 0;
  const grossIncome = answers['gross_monthly_income'] || 0;
  const age = answers['current_age'] || 0;
  const retirementAge = answers['retirement_age'] || 0;
  const dependents = answers['dependents'] || 0;
  const maritalStatus = answers['marital_status'] || 'single';
  
  // Calculate total monthly expenses from individual expense categories
  const housingCost = answers['housing_cost'] || 0;
  const foodExpenses = answers['food_expenses'] || 0;
  const transportationExpenses = answers['transportation_expenses'] || 0;
  const healthcareExpenses = answers['healthcare_expenses'] || 0;
  const insuranceExpenses = answers['insurance_expenses'] || 0;
  const entertainmentExpenses = answers['entertainment_expenses'] || 0;
  const otherExpenses = answers['other_monthly_expenses'] || 0;
  const totalExpenses = housingCost + foodExpenses + transportationExpenses + 
                       healthcareExpenses + insuranceExpenses + entertainmentExpenses + otherExpenses;
  
  // Assets and savings
  const emergencyFund = answers['emergency_fund'] || 0;
  const checkingAccount = answers['checking_account'] || 0;
  const savingsAccount = answers['savings_account'] || 0;
  const investmentAccounts = answers['investment_accounts'] || 0;
  const retirementAccounts = answers['retirement_accounts'] || 0;
  const realEstateValue = answers['real_estate_value'] || 0;
  const otherAssets = answers['other_assets'] || 0;
  
  // Debts
  const creditCardDebt = answers['credit_card_debt'] || 0;
  const studentLoanDebt = answers['student_loan_debt'] || 0;
  const mortgageBalance = answers['mortgage_balance'] || 0;
  const autoLoanBalance = answers['auto_loan_balance'] || 0;
  const otherDebt = answers['other_debt'] || 0;
  const totalDebt = creditCardDebt + studentLoanDebt + mortgageBalance + autoLoanBalance + otherDebt;
  
  // Goals
  const shortTermGoals = answers['short_term_goals'] || [];
  const mediumTermGoals = answers['medium_term_goals'] || [];
  const longTermGoals = answers['long_term_goals'] || [];
  const desiredRetirementIncome = answers['desired_retirement_income'] || 0;
  
  // Risk and investment profile
  const riskTolerance = answers['risk_tolerance'] || 'moderate';
  const investmentExperience = answers['investment_experience'] || 'beginner';
  const investmentTimeline = answers['investment_timeline'] || 'long';
  const investmentPriorities = answers['investment_priorities'] || [];
  
  // Financial behavior
  const savingsRate = answers['savings_rate'] || 0;
  const spendingTracking = answers['spending_tracking'] || 'occasionally';
  const budgetAdherence = answers['budget_adherence'] || 'sometimes';
  const financialStressLevel = answers['financial_stress_level'] || 5;

  return {
    demographics: {
      age: age || 'Not specified',
      dependents: dependents,
      marital_status: maritalStatus,
      housing_type: answers['housing_type'] || 'Not specified',
      income: {
        gross_monthly: grossIncome,
        net_monthly: netIncome,
        stability: answers['income_stability'] || 'stable',
        additional_sources: answers['additional_income_sources'] || [],
        annual_bonus: answers['annual_bonus'] || 0,
      },
      expenses: {
        total_monthly: totalExpenses,
        housing: housingCost,
        food: foodExpenses,
        transportation: transportationExpenses,
        healthcare: healthcareExpenses,
        insurance: insuranceExpenses,
        entertainment: entertainmentExpenses,
        other: otherExpenses,
      },
    },
    financial_situation: {
      assets: {
        emergency_fund: emergencyFund,
        checking_account: checkingAccount,
        savings_account: savingsAccount,
        investment_accounts: investmentAccounts,
        retirement_accounts: retirementAccounts,
        real_estate_value: realEstateValue,
        other_assets: otherAssets,
        total_assets: emergencyFund + checkingAccount + savingsAccount + investmentAccounts + retirementAccounts + realEstateValue + otherAssets,
      },
      debts: {
        credit_card_debt: creditCardDebt,
        credit_card_interest_rate: answers['credit_card_interest_rate'] || 0,
        student_loan_debt: studentLoanDebt,
        student_loan_interest_rate: answers['student_loan_interest_rate'] || 0,
        mortgage_balance: mortgageBalance,
        mortgage_interest_rate: answers['mortgage_interest_rate'] || 0,
        auto_loan_balance: autoLoanBalance,
        auto_loan_interest_rate: answers['auto_loan_interest_rate'] || 0,
        other_debt: otherDebt,
        other_debt_interest_rate: answers['other_debt_interest_rate'] || 0,
        total_debt: totalDebt,
      },
    },
    goals_and_timeline: {
      retirement_age: retirementAge || 'Not specified',
      desired_retirement_income: desiredRetirementIncome,
      short_term_goals: shortTermGoals,
      medium_term_goals: mediumTermGoals,
      long_term_goals: longTermGoals,
      major_purchase_timeline: answers['major_purchase_timeline'] || 'Not specified',
    },
    risk_profile: {
      risk_tolerance: riskTolerance,
      investment_experience: investmentExperience,
      investment_timeline: investmentTimeline,
      investment_priorities: investmentPriorities,
    },
    financial_behavior: {
      savings_rate: savingsRate,
      spending_tracking: spendingTracking,
      budget_adherence: budgetAdherence,
      financial_stress_level: financialStressLevel,
    },
    calculated_metrics: {
      monthly_savings: netIncome - totalExpenses,
      years_to_retirement: retirementAge > age ? retirementAge - age : 0,
      net_worth: (emergencyFund + checkingAccount + savingsAccount + investmentAccounts + retirementAccounts + realEstateValue + otherAssets) - totalDebt,
      debt_to_income_ratio: grossIncome > 0 ? (totalDebt / (grossIncome * 12)) : 0,
      emergency_fund_months: totalExpenses > 0 ? emergencyFund / totalExpenses : 0,
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
  console.log("Backend calculated profileData:", JSON.stringify(profileData, null, 2));

  console.log(`${isUpdate ? 'Upserting' : 'Inserting'} profile in database for user:`, userId);
  const { data: dbResult, error: dbError } = await supabaseClient
    .from("financial_health_profiles")
    .upsert({
      user_id: userId,
      profile_description: profileDescription,
      quiz_answers: quizAnswers,
      profile_data: profileData, // Always use backend's calculated data
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
      profileData: profileData, // Backend's calculated data, not AI's
      profileId: dbResult?.id || null,
      debug: {
        message: `Profile ${isUpdate ? 'updated' : 'created'} and stored successfully`,
        timestamp: new Date().toISOString(),
        stored_in_db: !dbError,
        backend_calculated_monthly_savings: profileData.calculated_metrics.monthly_savings,
        backend_calculated_total_assets: profileData.calculated_metrics.total_assets,
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
