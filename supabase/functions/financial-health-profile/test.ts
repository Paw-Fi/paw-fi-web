// Test script to demonstrate the financial health profile edge function
// This would normally be called from the frontend after quiz completion

const sampleQuizAnswers = {
  // Demographics
  'current-age': 28,
  'number-of-dependents': 1,
  'housing-situation': 'rent',
  
  // Income & Expenses
  'gross-monthly-income': 5500,
  'net-monthly-income': 4200,
  'total-monthly-expenses': 3500,
  
  // Assets
  'cash-savings': 15000,
  'pension-value': 25000,
  'other-investments': 8000,
  'monthly-pension-contribution': 400,
  'emergency-fund': 12000,
  
  // Debt
  'total-debt-amount': 18000,
  'average-debt-interest': 'medium',
  
  // Insurance
  'insurance-coverage': ['health', 'auto', 'life'],
  
  // Goals
  'retirement-age': 62,
  'target-retirement': 800000,
  'financial-priorities': ['retirement', 'debt-reduction', 'emergency-fund'],
  'investment-goals': ['retirement', 'wealth'],
  'time-horizon': 'long',
  'expect-lump-sum': 'no',
  
  // Risk Profile
  'predictable-income': 'yes',
  'high-risk-preference': 'no',
  'risky-investments': 'no',
  'market-downturn': 'wait',
  'investment-knowledge': 'intermediate',
  'liquidity-importance': 'somewhat-important',
};

const testRequest = {
  quizAnswers: sampleQuizAnswers,
  userId: 'test-user-123',
};

console.log("Sample request that would be sent to the edge function:");
console.log(JSON.stringify(testRequest, null, 2));

// This demonstrates how the function would be called from the frontend
// Example usage in the quiz component:
const exampleFrontendCall = `
// 1. Generate and store a new profile
const handleCompleteQuiz = async () => {
  try {
    const response = await supabase.functions.invoke('financial-health-profile', {
      body: {
        quizAnswers: state.answers,
        userId: user.id,
      }
    });
    
    const { data, error } = response;
    if (error) throw error;
    
    console.log('AI-generated profile:', data.profileDescription);
    console.log('Profile stored with ID:', data.profileId);
    
    // Continue with existing dashboard creation logic
    handleCreateDashboard();
  } catch (error) {
    console.error('Error generating profile:', error);
    // Fall back to existing flow
    handleCreateDashboard();
  }
};

// 2. Retrieve an existing profile
const getExistingProfile = async (userId: string, profileId?: string) => {
  try {
    const response = await supabase.functions.invoke('get-financial-health-profile', {
      body: {
        userId: userId,
        profileId: profileId, // Optional: get specific profile, otherwise gets latest
      }
    });
    
    const { data, error } = response;
    if (error) throw error;
    
    console.log('Retrieved profile:', data.profile.profile_description);
    console.log('Quiz answers:', data.profile.quiz_answers);
    console.log('Profile data:', data.profile.profile_data);
    
    return data.profile;
  } catch (error) {
    console.error('Error retrieving profile:', error);
    return null;
  }
};
`;

console.log("\nExample frontend integration:");
console.log(exampleFrontendCall);

export { sampleQuizAnswers, testRequest };