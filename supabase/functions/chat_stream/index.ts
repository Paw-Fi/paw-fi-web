// supabase/functions/gemini-structured-stream/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { corsHeaders } from "../shared/cors.ts";
import { parse } from "https://esm.sh/partial-json@0.1.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AI_PROMPT } from "./prompt.ts";
import { prompt as FA_PROMPT } from "./fa-prompt.ts";
import { AI_ROLES } from "../shared/ai-roles/ai-roles.ts";
import { processGoalTrackingRequest, getGeminiFunctionDeclarations } from "./goal-tracker.ts";

// Configuration constants
const AI_MODEL = "gemini-2.5-flash-lite";
const MAX_HISTORY_MESSAGES = 20;
const MAX_OUTPUT_TOKENS = 8000;
const MAX_JSON_COMPLETION_ATTEMPTS = 5;
const MESSAGE_TIMESTAMP_OFFSET_MS = 1;

// Environment validation
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.");
  throw new Error("Missing required environment variable: GEMINI_API_KEY");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// Random response arrays for different scenarios
const RANDOM_RESPONSES = {
  FINANCIAL_ADVISOR_FIRST: [
    "Hi {{username}}! I'm ready to help you build a clear path to your financial goals.\n\nTo begin, please complete your financial health assessment by clicking ``QUESTIONNAIRE``. Your answers will allow me to create a truly personalized plan that's right for you.",
    "Hello {{username}}! Welcome to your personal financial journey.\n\nLet's start by understanding your unique financial situation. Click ``QUESTIONNAIRE`` to complete your assessment and unlock personalized guidance tailored specifically for you.",
    "Great to meet you, {{username}}! I'm here to help you achieve your financial dreams.\n\nTo provide you with the most relevant advice, I need to learn about your goals and current situation. Please click ``QUESTIONNAIRE`` to get started with your personalized financial assessment.",
    "Welcome {{username}}! I'm excited to be your financial guide on this journey.\n\nEvery great financial plan starts with understanding where you are today. Click ``QUESTIONNAIRE`` to complete your assessment and let's build your personalized roadmap to success.",
    "Hi there, {{username}}! Ready to take control of your financial future?\n\nThe first step is understanding your unique situation and goals. Click ``QUESTIONNAIRE`` to complete your financial health assessment and unlock personalized strategies designed just for you."
  ],
  EDUCATOR_FIRST: [
    "Welcome, {{username}}! I'm here to help you build your financial knowledge with lessons tailored just for you.\n\nTo get started, please tell me a bit about your learning goals by clicking ``QUESTIONNAIRE``. This will help me create a personalized learning plan to boost your financial literacy.",
    "Hello {{username}}! I'm excited to be your financial education companion.\n\nLet's discover the best way for you to learn about money and investing. Click ``QUESTIONNAIRE`` to share your learning preferences and I'll create a customized educational journey just for you.",
    "Great to see you, {{username}}! Ready to master the world of personal finance?\n\nEvery learner is unique, and I want to make sure your educational experience is perfectly suited to your style. Click ``QUESTIONNAIRE`` to help me understand how you learn best.",
    "Welcome to your financial education journey, {{username}}!\n\nI'm here to make learning about money engaging and effective for you. To create the most impactful learning experience, please click ``QUESTIONNAIRE`` and tell me about your goals and preferences.",
    "Hi {{username}}! I'm thrilled to help you become financially savvy.\n\nLet's start by understanding what you want to learn and how you prefer to absorb new information. Click ``QUESTIONNAIRE`` to begin your personalized financial education assessment."
  ],
  FINANCIAL_ADVISOR_FOLLOWUP: [
    "To provide you with the most personalized financial guidance, I recommend completing your financial health assessment. Click ``QUESTIONNAIRE`` to get started and unlock tailored advice for your unique situation.",
    "I'd love to give you specific financial advice, but I need to understand your situation first. Please complete your financial assessment by clicking ``QUESTIONNAIRE`` to unlock personalized recommendations.",
    "For the best financial guidance tailored to your needs, let's start with your assessment. Click ``QUESTIONNAIRE`` to share your financial goals and current situation with me.",
    "To create a financial plan that truly works for you, I need to know more about your goals and circumstances. Please click ``QUESTIONNAIRE`` to complete your personalized assessment.",
    "Every great financial strategy starts with understanding your unique situation. Click ``QUESTIONNAIRE`` to complete your assessment and I'll provide guidance specifically designed for your goals."
  ],
  EDUCATOR_FOLLOWUP: [
    "I can create personalized lessons to help you master the concepts of money.\n\nTo discover your unique learning path, start by answering a few questions. Click ``QUESTIONNAIRE`` to begin!",
    "I'm ready to design a learning experience that matches your style and goals.\n\nLet me understand how you learn best by completing a quick assessment. Click ``QUESTIONNAIRE`` to get started with your personalized education plan!",
    "Your financial education journey awaits! I can tailor lessons specifically for your learning preferences.\n\nTo create the perfect curriculum for you, please click ``QUESTIONNAIRE`` and share your learning goals with me.",
    "I have so many great lessons to share with you, but I want to make sure they're perfectly suited to your needs.\n\nClick ``QUESTIONNAIRE`` to tell me about your learning style and goals, and I'll create a customized educational experience just for you.",
    "Ready to dive deep into financial knowledge? I can craft lessons that match exactly how you learn best.\n\nTo get started with your personalized learning journey, click ``QUESTIONNAIRE`` and complete your educational assessment."
  ],
  FINANCIAL_ADVISOR_PARTIAL_PROFILE: [
    "I can see you've started your financial profile ({{completionRate}}% complete), but I need more information to provide you with the most accurate advice.\n\nPlease complete your full financial assessment by clicking ``QUESTIONNAIRE`` to unlock personalized recommendations tailored specifically for your situation.",
    "Thanks for beginning your financial profile! You're {{completionRate}}% of the way there.\n\nTo give you the most relevant and actionable advice, I need a complete picture of your finances. Click ``QUESTIONNAIRE`` to finish your assessment and get personalized guidance.",
    "I notice your financial profile is partially complete ({{completionRate}}%). While I can provide general advice, completing your full assessment will unlock much more personalized and effective recommendations.\n\nClick ``QUESTIONNAIRE`` to finish your profile and get advice tailored specifically to your goals and situation.",
    "Great start on your financial profile! You've completed {{completionRate}}% so far.\n\nTo provide you with the most accurate financial strategies and goal recommendations, I need the complete picture. Please click ``QUESTIONNAIRE`` to finish your assessment.",
    "I can see you've made progress on your financial profile ({{completionRate}}% complete). The more information you provide, the better I can help you achieve your financial goals.\n\nClick ``QUESTIONNAIRE`` to complete your assessment and unlock personalized financial strategies designed specifically for you."
  ],
  EDUCATOR_PARTIAL_PROFILE: [
    "I see you've started building your learning profile ({{completionRate}}% complete)! To create the most effective educational experience for you, I'd love to know more about your learning preferences.\n\nClick ``QUESTIONNAIRE`` to complete your assessment and unlock personalized lessons designed just for you.",
    "Thanks for beginning your educational assessment! You're {{completionRate}}% complete.\n\nTo design lessons that truly match your learning style and goals, I need a bit more information. Click ``QUESTIONNAIRE`` to finish your profile and get customized educational content.",
    "I notice your learning profile is partially complete ({{completionRate}}%). While I can provide general financial education, completing your assessment will help me create lessons perfectly suited to how you learn best.\n\nClick ``QUESTIONNAIRE`` to finish your profile for a truly personalized educational journey.",
    "Good progress on your learning profile! You've completed {{completionRate}}% so far.\n\nThe more I know about your learning preferences and goals, the better I can tailor my teaching approach for you. Please click ``QUESTIONNAIRE`` to complete your assessment.",
    "I can see you've started your educational profile ({{completionRate}}% complete). Finishing your assessment will help me create engaging lessons that match your exact learning style and financial education goals.\n\nClick ``QUESTIONNAIRE`` to complete your profile and unlock your personalized learning experience."
  ]
};

// Utility functions
function getRandomResponse(responses: string[]): string {
  if (!responses?.length) throw new Error("Empty responses array");
  return responses[Math.floor(Math.random() * responses.length)];
}

// Function to check financial profile completeness
function checkProfileCompleteness(userProfile: any): { isComplete: boolean; isPartial: boolean; completionRate: number } {
  if (!userProfile) {
    return { isComplete: false, isPartial: false, completionRate: 0 };
  }

  // Define essential fields for a complete financial profile
  const essentialFields = [
    'current_age',
    'marital_status', 
    'gross_monthly_income',
    'net_monthly_income',
    'housing_cost',
    'emergency_fund',
    'savings_account',
    'retirement_age',
    'risk_tolerance',
    'investment_experience'
  ];

  // Count completed essential fields
  let completedFields = 0;
  essentialFields.forEach(field => {
    if (userProfile[field] !== undefined && userProfile[field] !== null && userProfile[field] !== '' && userProfile[field] !== 0) {
      completedFields++;
    }
  });

  const completionRate = Math.round((completedFields / essentialFields.length) * 100);
  const isComplete = completionRate >= 80; // Consider 80%+ as complete
  const isPartial = completionRate >= 30 && completionRate < 80; // 30-79% is partial

  return { isComplete, isPartial, completionRate };
}

function validateRequestData(data: any): boolean {
  return data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim().length > 0;
}

function createTimestampPair(): { userTimestamp: string; aiTimestamp: string } {
  const baseTimestamp = new Date();
  return {
    userTimestamp: baseTimestamp.toISOString(),
    aiTimestamp: new Date(baseTimestamp.getTime() + MESSAGE_TIMESTAMP_OFFSET_MS).toISOString()
  };
}

// Helper function to detect navigation requests (like "Take me to dashboard")
function isNavigationRequest(message: string): boolean {
  const navigationPatterns = [
    /take me to (dashboard|goals?|insights?|calculator)/i,
    /go to (dashboard|goals?|insights?|calculator)/i,
    /show me (dashboard|goals?|insights?|calculator)/i,
    /open (dashboard|goals?|insights?|calculator)/i,
    /navigate to (dashboard|goals?|insights?|calculator)/i,
    /^(dashboard|goals?|insights?|calculator)$/i
  ];
  
  return navigationPatterns.some(pattern => pattern.test(message.trim()));
}

// Helper function to generate informative fallback responses for navigation requests
function generateNavigationFallback(message: string): string {
  const destination = extractNavigationDestination(message);
  
  switch (destination) {
    case 'dashboard':
      return "I understand you'd like to view your dashboard. As your financial advisor, I'm here to help with financial planning and goal management through our conversation. To navigate to your dashboard, please use the navigation menu in the app interface.";
    case 'goals':
      return "I can see you're interested in your goals. I can help you analyze, create, and manage your financial goals right here in our conversation. Would you like me to show you your current goals or help you work on a specific goal?";
    case 'insights':
      return "I'd be happy to provide insights about your financial progress! I can analyze your goals and provide personalized recommendations. Would you like me to review your current financial situation and provide insights?";
    case 'calculator':
      return "I can help you with financial calculations and planning right here in our conversation. What kind of calculation would you like assistance with? I can help with budgeting, savings projections, loan calculations, and more.";
    default:
      return "I'm here to help you with financial advice and goal management through our conversation. If you're looking to navigate to a different part of the app, please use the navigation menu. How can I assist you with your finances today?";
  }
}

// Helper function to extract navigation destination from message
function extractNavigationDestination(message: string): string {
  const lowerMessage = message.toLowerCase().trim();
  
  if (lowerMessage.includes('dashboard')) return 'dashboard';
  if (lowerMessage.includes('goal')) return 'goals';
  if (lowerMessage.includes('insight')) return 'insights';
  if (lowerMessage.includes('calculator')) return 'calculator';
  
  return 'unknown';
}

// Helper function to format goal context for AI comprehension
function formatGoalContextForAI(goalContext: any): string {
  if (!goalContext || !goalContext.goalsSummary) {
    return "";
  }
  
  const { totalGoals, activeGoals, totalProgress, goalsSummary } = goalContext;
  
  let formattedContext = `=== USER'S CURRENT FINANCIAL GOALS ===

OVERVIEW:
- Total Goals: ${totalGoals}
- Active Goals: ${activeGoals}
- Average Progress: ${totalProgress}%

DETAILED GOAL BREAKDOWN:
`;

  goalsSummary.forEach((goal: any, index: number) => {
    const progressStatus = goal.is_on_track ? "✅ ON TRACK" : "⚠️ BEHIND SCHEDULE";
    const completionDate = goal.target_date ? ` (Target: ${goal.target_date})` : "";
    
    formattedContext += `
${index + 1}. **${goal.title}** (ID: ${goal.id})
   - Type: ${goal.goal_type}
   - Progress: $${goal.current_amount.toLocaleString()} / $${goal.target_amount.toLocaleString()} (${goal.progress_percentage}%)
   - Status: ${goal.status.toUpperCase()} - ${progressStatus}${completionDate}
   - Milestones: ${goal.milestone_count} milestones set`;
  });

  formattedContext += `

GOAL TRACKING CONTEXT:
- When providing advice, reference these specific goals by name and ID
- Suggest goal modifications when appropriate (timeline, amount, milestones)
- Proactively suggest creating new goals when advice aligns with goal opportunities
- Always confirm before executing any goal functions
- Use the goal tracking tools to help users make progress on these objectives
- Consider how any financial advice impacts their existing goal timelines and progress

Remember: Every piece of financial advice should be evaluated against these existing goals and how it helps or hinders the user's progress toward achieving them.`;

  return formattedContext;
}

// HTTP request handlers
function handleOptionsRequest(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function handleMethodNotAllowed(): Response {
  return new Response(
    JSON.stringify({ error: "Method Not Allowed" }),
    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function createErrorResponse(message: string, status: number = 500, details?: any): Response {
  const body = details ? { error: message, details } : { error: message };
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return handleOptionsRequest();
  if (req.method !== "POST") return handleMethodNotAllowed();

  try {
    // Parse and validate request body
    const rawBody = await req.text();
    let requestData;
    
    try {
      requestData = rawBody?.trim() ? JSON.parse(rawBody) : {};
    } catch (error) {
      return createErrorResponse("Invalid JSON in request body", 400, { rawBody });
    }
    
    if (!validateRequestData(requestData)) {
      return createErrorResponse("Message is required and must be a non-empty string", 400);
    }
    
    
    const { 
      message, 
      userProfile, 
      userId, 
      conversationId, 
      model: chatModel,
      goalContext,
      isGlobalMode,
      goalId,
      goal 
    } = requestData;
    
    // Note: Frontend no longer sends history - we fetch it from database
    let history: any[] = []; // Will be populated from database
    
    // Initialize Supabase client with service role for database operations
    // Initialize Supabase client
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase credentials");
      return createErrorResponse("Server configuration error");
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Log user profile availability
    if (userProfile) {
      console.log("User profile provided for personalized response");
    }
    
    let currentConversationId = conversationId;
    
    // Handle session creation/retrieval for both authenticated users and guests
    if (!currentConversationId) {
      // Create new chat session if none provided
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId || null, // null for guests, user_id for authenticated users
          model: chatModel || 'financial_educator' // Default to financial_educator
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating chat session:', createError);
        return new Response(JSON.stringify({ error: "Failed to create chat session" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      currentConversationId = newSession.id;
      console.log(`Created new chat session: ${currentConversationId} for ${userId ? 'authenticated user' : 'guest'}`);
    }
    
    // Fetch conversation history
    const { data: recentMessages, error: fetchError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_session_id', currentConversationId)
      .order('timestamp', { ascending: true })
      .order('id', { ascending: true })
      .limit(MAX_HISTORY_MESSAGES);
      
    if (fetchError) {
      console.error('Error fetching conversation history:', fetchError);
      // Continue with empty history rather than failing
    }
    
    
    // Use the fetched messages as history
    history = recentMessages || [];
    
    // Note: User message will be saved to database after AI response is generated

    let aiResponse: string = "";

    let userActivities=null;

    if(userId)
    {
      const { data: userActivitiesData, error: activitiesError } = await supabase.functions.invoke(
        `user-activities?user_id=${userId}`,
        {
          method: "GET",
        },
      );
      if (activitiesError) {
        console.error('Error fetching user activities:', activitiesError);
      }else
      userActivities = userActivitiesData?.activities;
    }
  
    
    // Check if user is authenticated and handle profile completeness
    if (userId) {
      const profileStatus = checkProfileCompleteness(userProfile);
      
      // Check if user has no profile or incomplete profile
      if (!userProfile || !profileStatus.isComplete) {
        // Check if this is the first message by looking at conversation history
        const isFirstMessage = !history || history.length <=1;
        
        if (!userProfile) {
          // No profile at all
          if (isFirstMessage) {
            // First message - welcome message with random variation
            if(chatModel === AI_ROLES.FINANCIAL_ADVISOR)
            {
              aiResponse = getRandomResponse(RANDOM_RESPONSES.FINANCIAL_ADVISOR_FIRST);
            }
            else
            {
              aiResponse = getRandomResponse(RANDOM_RESPONSES.EDUCATOR_FIRST);
            }
          } else {
            // Has conversation history - encourage completing assessment with random variation
            if(chatModel === AI_ROLES.FINANCIAL_ADVISOR)
            {
              aiResponse = getRandomResponse(RANDOM_RESPONSES.FINANCIAL_ADVISOR_FOLLOWUP);
            }
            else
            {
              aiResponse = getRandomResponse(RANDOM_RESPONSES.EDUCATOR_FOLLOWUP);
            }
          }
        } else if (profileStatus.isPartial) {
          // Partial profile - encourage completion with progress information
          let partialResponse;
          if(chatModel === AI_ROLES.FINANCIAL_ADVISOR)
          {
            partialResponse = getRandomResponse(RANDOM_RESPONSES.FINANCIAL_ADVISOR_PARTIAL_PROFILE);
          }
          else
          {
            partialResponse = getRandomResponse(RANDOM_RESPONSES.EDUCATOR_PARTIAL_PROFILE);
          }
          // Replace the completion rate placeholder
          aiResponse = partialResponse.replace(/{{completionRate}}/g, profileStatus.completionRate.toString());
        } else {
          // Profile exists but completion rate is too low, treat as no profile
          if(chatModel === AI_ROLES.FINANCIAL_ADVISOR)
          {
            aiResponse = getRandomResponse(RANDOM_RESPONSES.FINANCIAL_ADVISOR_FOLLOWUP);
          }
          else
          {
            aiResponse = getRandomResponse(RANDOM_RESPONSES.EDUCATOR_FOLLOWUP);
          }
        }
      }
    } else {
      // User has profile, generate AI response using Gemini
      
      // Format conversation history for Gemini: support both {role, parts} and {role, content}
      
      const formattedHistory = (history || [])
        .filter((msg: any) => {
          // Accept only messages with valid text
          if (
            msg.parts &&
            Array.isArray(msg.parts) &&
            typeof msg.parts[0]?.text === "string" &&
            msg.parts[0].text.trim() !== ""
          ) {
            return true;
          }
          if (typeof msg.content === "string" && msg.content.trim() !== "") {
            return true;
          }
          return false;
        })
        .map((msg: any) => {
          if (
            msg.parts &&
            Array.isArray(msg.parts) &&
            typeof msg.parts[0]?.text === "string"
          ) {
            // Already Gemini format, just fix role if needed
            return {
              role: msg.role === "assistant" ? "model" : msg.role,
              parts: msg.parts,
            };
          }
          // Legacy: convert from { role, content }
          return {
            role: msg.role === "assistant" ? "model" : msg.role,
            parts: [{ text: msg.content }],
          };
        });
      
      
      // Check if this is a Financial Advisor request that might need goal tracking
      // Goal tracking should be attempted for ANY financial advisor message, not just when goalContext exists
      let goalTrackingAttempted = false;
      if (chatModel === AI_ROLES.FINANCIAL_ADVISOR) {
        goalTrackingAttempted = true;
        try {
          
          const goalTrackingResult = await processGoalTrackingRequest(
            {
              message,
              userId: userId || '',
              goalContext: goalContext || null, // All user goals - AI will decide
              conversationHistory: formattedHistory
            },
            supabase,
            genAI
          );
          
          // Handle successful goal tracking function execution
          if (goalTrackingResult.function_executed) {
            // Save goal tracking messages to database
            if (currentConversationId) {
              const timestamps = createTimestampPair();
              
              const messagesToInsert = [
                {
                  chat_session_id: currentConversationId,
                  content: message,
                  role: 'user',
                  metadata: null,
                  timestamp: timestamps.userTimestamp
                },
                {
                  chat_session_id: currentConversationId,
                  content: goalTrackingResult.response,
                  role: 'assistant',
                  metadata: { 
                    function_executed: goalTrackingResult.function_executed,
                    function_result: goalTrackingResult.function_result 
                  },
                  timestamp: timestamps.aiTimestamp
                }
              ];
              
              const { error: batchInsertError } = await supabase
                .from('chat_messages')
                .insert(messagesToInsert);
                
              if (batchInsertError) {
                console.error('Error saving goal tracking messages:', batchInsertError);
              }
            }
            
            return new Response(
              JSON.stringify({
                response: goalTrackingResult.response,
                conversationId: currentConversationId,
                function_executed: goalTrackingResult.function_executed,
                function_result: goalTrackingResult.function_result,
                next_actions: goalTrackingResult.next_actions,
                cache_refresh_needed: goalTrackingResult.cache_refresh_needed
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } else {
            // Goal tracking didn't execute a function, check if this might be an unhandled navigation request
            if (isNavigationRequest(message)) {
              const fallbackResponse = generateNavigationFallback(message);
              
              // Save navigation fallback messages to database
              if (currentConversationId) {
                const timestamps = createTimestampPair();
                
                const messagesToInsert = [
                  {
                    chat_session_id: currentConversationId,
                    content: message,
                    role: 'user',
                    metadata: null,
                    timestamp: timestamps.userTimestamp
                  },
                  {
                    chat_session_id: currentConversationId,
                    content: fallbackResponse,
                    role: 'assistant',
                    metadata: { fallback_type: 'navigation_request' },
                    timestamp: timestamps.aiTimestamp
                  }
                ];
                
                const { error: batchInsertError } = await supabase
                  .from('chat_messages')
                  .insert(messagesToInsert);
                  
                if (batchInsertError) {
                  console.error('Error saving fallback messages:', batchInsertError);
                }
              }
              
              return new Response(
                JSON.stringify({
                  response: fallbackResponse,
                  conversationId: currentConversationId,
                  fallback_used: true
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
              );
            }
          }
        } catch (goalError) {
          console.error('Goal tracking error, falling back to normal processing:', goalError);
          // Fall through to normal processing
        }
      }
      
      
      // Append the current user message
      const contents = [
        ...formattedHistory,
        {
          role: "user",
          parts: [{ text: message }],
        },
      ];
      
      // Initialize model with function calling for Financial Advisor if goals are available
      // BUT avoid function calling if goal tracking was already attempted to prevent duplicate calls
      let model;
      
      if (chatModel === AI_ROLES.FINANCIAL_ADVISOR && goalContext && !goalTrackingAttempted) {
        // Add function calling capabilities for Financial Advisor with goals
        const functionDeclarations = getGeminiFunctionDeclarations();
        model = genAI.getGenerativeModel({ 
          model: AI_MODEL,
          tools: [{
            function_declarations: functionDeclarations
          }]
        });
      } else {
        model = genAI.getGenerativeModel({ model: AI_MODEL });
      }
      const generationConfig = {
        responseMimeType: "text/plain",
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      };
      
      // Helper function to check if JSON is complete
      function isJsonComplete(text: string): boolean {
        // If we find ```json but don't find a closing ```, it's incomplete
        const jsonStart = text.indexOf("```json");
        if (jsonStart === -1) return true; // No JSON code block found, considered complete

        // Look for closing ``` after the start of ```json
        const jsonEnd = text.indexOf("```", jsonStart + 7);
        return jsonEnd !== -1;
      }

      // Select appropriate prompt based on model
      let basePrompt = AI_PROMPT; // Default to financial educator prompt
      if (chatModel === AI_ROLES.FINANCIAL_ADVISOR) {
        basePrompt = FA_PROMPT;
      }
      
      // Construct system instruction with user profile if available
      let systemInstruction = basePrompt;
      if (userProfile) {
        systemInstruction = `${basePrompt}\n\n${userProfile}`;
      }
      if(userActivities){
        systemInstruction = `${systemInstruction}\n\nMost recent activities of this user: ${userActivities}`;
      }
      
      // Append goal context to Financial Advisor's system instruction
      if (chatModel === AI_ROLES.FINANCIAL_ADVISOR && goalContext) {
        const goalContextText = formatGoalContextForAI(goalContext);
        systemInstruction = `${systemInstruction}\n\n${goalContextText}`;
      }

      // Initial generation
      let result = await model.generateContent(
        {
          contents,
          systemInstruction: systemInstruction,
        },
        generationConfig,
      );

      let responseText = result.response.text();
      let attempts = 0;

      // Handle incomplete JSON responses
      while (!isJsonComplete(responseText) && attempts < MAX_JSON_COMPLETION_ATTEMPTS) {
        attempts++;

        // Add the current response to history and ask for continuation
        const continuationContents = [
          ...contents,
          {
            role: "model",
            parts: [{ text: responseText }],
          },
          {
            role: "user",
            parts: [
              {
                text: "Please continue and send the rest of the JSON code block without any additional text.",
              },
            ],
          },
        ];

        // Generate continuation
        const continuationResult = await model.generateContent(
          {
            contents: continuationContents,
            systemInstruction: systemInstruction,
          },
          generationConfig,
        );

        // Append continuation to response
        const continuationText = continuationResult.response.text();
        responseText += "\n" + continuationText;

        // If the combined response now has complete JSON, or we've reached max attempts, exit
        if (isJsonComplete(responseText) || attempts >= MAX_JSON_COMPLETION_ATTEMPTS) {
          break;
        }
      }
      
      aiResponse = responseText;
    }

    // Clean up the response - if we have multiple ```json markers from continuations, fix it
    let cleanedResponse = aiResponse;
    const jsonStartMarker = "```json";
    const firstJsonStart = cleanedResponse.indexOf(jsonStartMarker);

    if (firstJsonStart !== -1) {
      // Find duplicate ```json markers after the first one
      let restOfString = cleanedResponse.substring(
        firstJsonStart + jsonStartMarker.length,
      );
      restOfString = restOfString.replace(/```json/g, "");

      // Remove any extra closing ``` markers except the last one
      const lastClosingMarker = restOfString.lastIndexOf("```");
      if (lastClosingMarker !== -1) {
        const beforeLast = restOfString.substring(0, lastClosingMarker);
        const afterLast = restOfString.substring(lastClosingMarker);
        restOfString = beforeLast.replace(/```/g, "") + afterLast;
      }

      cleanedResponse =
        cleanedResponse.substring(0, firstJsonStart) +
        jsonStartMarker +
        restOfString;
    }

    const markdownJsonPrefix = "```json";
    const markdownSuffix = "```";
    const trimmedCleanedResponse = cleanedResponse.trim();

    // Check if the response looks like it contains JSON (either with markdown fences or starts with a curly brace)
    const hasJsonMarkdown = trimmedCleanedResponse.includes(markdownJsonPrefix);
    const looksLikeRawJson =
      trimmedCleanedResponse.startsWith("{") &&
      trimmedCleanedResponse.endsWith("}");

    // If it doesn't look like JSON at all, treat it as simple text response
    let finalResponse = cleanedResponse;
    let extractedCourse = null;
    let course_id = null;
    
    if (!hasJsonMarkdown && !looksLikeRawJson) {
      // Simple text response (like profile prompts)
      finalResponse = cleanedResponse;
    } else {

    // Extract JSON content if markdown fences are present
    let stringToParseForJson = cleanedResponse; // Start with the full cleaned response

    if (hasJsonMarkdown) {
      const firstPrefixIndex = cleanedResponse.indexOf(markdownJsonPrefix);
      // Content after the first "```json"
      let potentialJsonContent = cleanedResponse.substring(
        firstPrefixIndex + markdownJsonPrefix.length,
      );

      // Find the last "```" to ensure we get everything even if JSON itself contains "```"
      const lastSuffixIndex = potentialJsonContent.lastIndexOf(markdownSuffix);

      if (lastSuffixIndex !== -1) {
        // Found a closing fence, take content between the first prefix and last suffix
        stringToParseForJson = potentialJsonContent.substring(
          0,
          lastSuffixIndex,
        );
      } else {
        // No closing fence found after the opening one, or it's part of the content.
        // Assume the rest of the string is the content to parse.
        stringToParseForJson = potentialJsonContent;
      }
    } else if (looksLikeRawJson) {
      // It's raw JSON without markdown fences
      stringToParseForJson = trimmedCleanedResponse;
    }

    stringToParseForJson = stringToParseForJson.trim();

    if (!stringToParseForJson) {
      console.warn(
        "JSON string to parse is empty after stripping fences and trimming. Original cleanedResponse:",
        cleanedResponse,
      );
      return new Response(JSON.stringify({ response: cleanedResponse }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {

      // Only try to parse if it looks like JSON
      const parsedJsonObject = parse(stringToParseForJson);

      // Stringify the now valid JavaScript object back to a well-formed JSON string
      const wellFormedJsonString = JSON.stringify(parsedJsonObject, null, 2); // Pretty-print
      // --- Course Extraction & Storage ---
      // Attempt to extract a valid course object using Zod
      const extractedCourse = wellFormedJsonString
      if (extractedCourse) {
        // Await course storage to get course_id (works for both authenticated and guest users)
        try {
          // For guest users, use the session ID as user identifier; for authenticated users, use user_id
          const user_id = requestData.userId || currentConversationId;
          
          // Ensure course is an object, not a string
          let parsedCourse;
          try {
            parsedCourse = typeof extractedCourse === "string" ? JSON.parse(extractedCourse) : extractedCourse;
          } catch (err) {
            console.error("Failed to parse extractedCourse as JSON", err);
          }
          
          if (parsedCourse && user_id) {
            const { error, data } = await supabase.functions.invoke(
              "store-course-from-ai",
              {
                body: { 
                  user_id: requestData.userId || null, // null for guests
                  session_id: requestData.userId ? null : currentConversationId, // session_id for guests
                  course: parsedCourse 
                },
              },
            );
            if (error) {
              console.error("Error invoking store-course-from-ai:", error);
            } else if (data?.course_id) {
              course_id = data.course_id;
            }
          }
        } catch (err) {
          console.error("Course storage error:", err);
        }
      } else {
      }
      // --- End Course Extraction & Async Storage ---

      // Preserve preamble and epilogue text from the original response
      let preamble = "";
      let epilogue = "";
      if (hasJsonMarkdown) {
        const preambleMatch = cleanedResponse.split(markdownJsonPrefix)[0];
        preamble = preambleMatch.trim();
        // Find epilogue after the last closing markdown fence
        const lastSuffixIndex = cleanedResponse.lastIndexOf(markdownSuffix);
        if (
          lastSuffixIndex !== -1 &&
          lastSuffixIndex + markdownSuffix.length < cleanedResponse.length
        ) {
          epilogue = cleanedResponse
            .slice(lastSuffixIndex + markdownSuffix.length)
            .trim();
        }
      }

      // Parse the wellFormedJsonString to access its properties
      const parsedJson = typeof wellFormedJsonString === 'string' 
        ? JSON.parse(wellFormedJsonString) 
        : wellFormedJsonString;
      
      // Create the simplified JSON object
      const simpleJsonObject = {
        id: parsedJson.id,
        title: parsedJson.title,
        description: parsedJson.description,
        icon: parsedJson.icon,
        unlocked: parsedJson.unlocked,
        lesson_count: parsedJson.lessons ? parsedJson.lessons.length : 0
      };
      
      // Convert the simplified JSON object to a properly formatted string
      const simpleJsonString = JSON.stringify(simpleJsonObject, null, 2);

      // Reconstruct the response with preamble, sanitized JSON, and epilogue
      const fullMessageParts = [
        preamble,
        `${markdownJsonPrefix}
${simpleJsonString}
${markdownSuffix}`,
        epilogue,
      ].filter(Boolean);
      finalResponse = fullMessageParts.join("\n\n");
      } catch (parseError) {
        const errorMessage =
          parseError instanceof Error
            ? parseError.message
            : "Unknown parsing error";
        console.error(
          "Failed to parse JSON string with partial-json. Error:",
          errorMessage,
        );
        if (parseError instanceof Error && parseError.stack) {
          console.error("Stack trace:", parseError.stack);
        }
        console.error(
          "Original cleanedResponse from AI (multi-turn, pre-stripping):",
          cleanedResponse,
        );
        console.error(
          "String attempted for parsing (after stripping fences):",
          `"${stringToParseForJson}"`,
        );
        // For parse errors, use the original response
        finalResponse = cleanedResponse;
      }
    }
    
    // Save final messages to database
    if (currentConversationId) {
      const timestamps = createTimestampPair();
      
      const messagesToInsert = [
        {
          chat_session_id: currentConversationId,
          content: message,
          role: 'user',
          metadata: null,
          timestamp: timestamps.userTimestamp
        },
        {
          chat_session_id: currentConversationId,
          content: finalResponse,
          role: 'assistant',
          metadata: extractedCourse ? { courseRecommendation: extractedCourse } : null,
          timestamp: timestamps.aiTimestamp
        }
      ];
      
      const { error: batchInsertError } = await supabase
        .from('chat_messages')
        .insert(messagesToInsert);
        
      if (batchInsertError) {
        console.error('Error saving messages:', batchInsertError);
        // Continue anyway - don't fail the response
      }
    }
    
    // Final safety check: ensure response is not empty or meaningless
    if (!finalResponse || finalResponse.trim().length === 0 || finalResponse.trim() === '{}') {
      // Generate a context-appropriate fallback response
      let fallbackResponse = "I apologize, but I didn't quite understand your request. ";
      
      if (chatModel === AI_ROLES.FINANCIAL_ADVISOR) {
        fallbackResponse += "As your financial advisor, I'm here to help with financial planning, goal management, budgeting advice, and investment guidance. Could you please rephrase your question or let me know what specific financial topic you'd like assistance with?";
      } else {
        fallbackResponse += "As your financial educator, I'm here to help you learn about personal finance topics, investment concepts, and money management strategies. What would you like to learn about today?";
      }
      
      finalResponse = fallbackResponse;
    }
    
    return new Response(
      JSON.stringify({ 
        response: finalResponse,
        conversationId: currentConversationId,
        generatedLessons: extractedCourse,
        course_id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Internal Server Error:", errorMessage);
    
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    
    return createErrorResponse("Internal Server Error", 500, errorMessage);
  }
});
