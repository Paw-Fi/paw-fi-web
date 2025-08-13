// supabase/functions/gemini-structured-stream/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { corsHeaders } from "../shared/cors.ts";
import { parse } from "https://esm.sh/partial-json@0.1.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AI_PROMPT } from "./prompt.ts";
import { prompt as FA_PROMPT, formatPromptWithContext, buildContextPrompt } from "./fa-prompt.ts";
import { AI_ROLES } from "../shared/ai-roles/ai-roles.ts";
import { processGoalTrackingRequest, getGeminiFunctionDeclarations } from "./goal-tracker.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error(
    "CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.",
  );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// Random response arrays for different scenarios
const RANDOM_RESPONSES = {
  FINANCIAL_ADVISOR_FIRST: [
    "Hi {{username}}! I'm ready to help you build a clear path to your financial goals.\n\nTo begin, please complete your financial health assessment by clicking the ``QUESTIONNAIRE`` button below. Your answers will allow me to create a truly personalized plan that's right for you.",
    "Hello {{username}}! Welcome to your personal financial journey.\n\nLet's start by understanding your unique financial situation. Click the ``QUESTIONNAIRE`` button below to complete your assessment and unlock personalized guidance tailored specifically for you.",
    "Great to meet you, {{username}}! I'm here to help you achieve your financial dreams.\n\nTo provide you with the most relevant advice, I need to learn about your goals and current situation. Please click the ``QUESTIONNAIRE`` button below to get started with your personalized financial assessment.",
    "Welcome {{username}}! I'm excited to be your financial guide on this journey.\n\nEvery great financial plan starts with understanding where you are today. Click the ``QUESTIONNAIRE`` button below to complete your assessment and let's build your personalized roadmap to success.",
    "Hi there, {{username}}! Ready to take control of your financial future?\n\nThe first step is understanding your unique situation and goals. Click the ``QUESTIONNAIRE`` button below to complete your financial health assessment and unlock personalized strategies designed just for you."
  ],
  EDUCATOR_FIRST: [
    "Welcome, {{username}}! I'm here to help you build your financial knowledge with lessons tailored just for you.\n\nTo get started, please tell me a bit about your learning goals by clicking the ``QUESTIONNAIRE`` button below. This will help me create a personalized learning plan to boost your financial literacy.",
    "Hello {{username}}! I'm excited to be your financial education companion.\n\nLet's discover the best way for you to learn about money and investing. Click the ``QUESTIONNAIRE`` button below to share your learning preferences and I'll create a customized educational journey just for you.",
    "Great to see you, {{username}}! Ready to master the world of personal finance?\n\nEvery learner is unique, and I want to make sure your educational experience is perfectly suited to your style. Click the ``QUESTIONNAIRE`` button below to help me understand how you learn best.",
    "Welcome to your financial education journey, {{username}}!\n\nI'm here to make learning about money engaging and effective for you. To create the most impactful learning experience, please click the ``QUESTIONNAIRE`` button below and tell me about your goals and preferences.",
    "Hi {{username}}! I'm thrilled to help you become financially savvy.\n\nLet's start by understanding what you want to learn and how you prefer to absorb new information. Click the ``QUESTIONNAIRE`` button below to begin your personalized financial education assessment."
  ],
  FINANCIAL_ADVISOR_FOLLOWUP: [
    "To provide you with the most personalized financial guidance, I recommend completing your financial health assessment. Click the ``QUESTIONNAIRE`` button below to get started and unlock tailored advice for your unique situation.",
    "I'd love to give you specific financial advice, but I need to understand your situation first. Please complete your financial assessment by clicking the ``QUESTIONNAIRE`` button below to unlock personalized recommendations.",
    "For the best financial guidance tailored to your needs, let's start with your assessment. Click the ``QUESTIONNAIRE`` button below to share your financial goals and current situation with me.",
    "To create a financial plan that truly works for you, I need to know more about your goals and circumstances. Please click the ``QUESTIONNAIRE`` button below to complete your personalized assessment.",
    "Every great financial strategy starts with understanding your unique situation. Click the ``QUESTIONNAIRE`` button below to complete your assessment and I'll provide guidance specifically designed for your goals."
  ],
  EDUCATOR_FOLLOWUP: [
    "I can create personalized lessons to help you master the concepts of money.\n\nTo discover your unique learning path, start by answering a few questions. Click the ``QUESTIONNAIRE`` button below to begin!",
    "I'm ready to design a learning experience that matches your style and goals.\n\nLet me understand how you learn best by completing a quick assessment. Click the ``QUESTIONNAIRE`` button below to get started with your personalized education plan!",
    "Your financial education journey awaits! I can tailor lessons specifically for your learning preferences.\n\nTo create the perfect curriculum for you, please click the ``QUESTIONNAIRE`` button below and share your learning goals with me.",
    "I have so many great lessons to share with you, but I want to make sure they're perfectly suited to your needs.\n\nClick the ``QUESTIONNAIRE`` button below to tell me about your learning style and goals, and I'll create a customized educational experience just for you.",
    "Ready to dive deep into financial knowledge? I can craft lessons that match exactly how you learn best.\n\nTo get started with your personalized learning journey, click the ``QUESTIONNAIRE`` button below and complete your educational assessment."
  ]
};

// Helper function to get a random response from an array
function getRandomResponse(responses: string[]): string {
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // No content
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
    let rawBody: string = await req.text();
    let requestData;
    try {
      if (!rawBody || rawBody.trim() === "") {
        requestData = {};
      } else {
        requestData = JSON.parse(rawBody);
      }
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
    let history = requestData.history;
    console.log("requestData", requestData)
    
    // Initialize Supabase client with service role for database operations
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase credentials");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    if (userProfile) {
      console.log("User profile provided for personalized response");
    }
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    
    // Fetch recent conversation history (sliding window - last 20 messages)
    // Also verify the session has the correct model to prevent cross-contamination
    const { data: recentMessages, error: fetchError } = await supabase
      .from('chat_messages')
      .select('content, role, chat_sessions!inner(model)')
      .eq('chat_session_id', currentConversationId)
      .eq('chat_sessions.model', chatModel)
      .order('timestamp', { ascending: true })
      .limit(20);
      
    if (fetchError) {
      console.error('Error fetching conversation history:', fetchError);
      // Continue with empty history rather than failing
    }
    
    // Use recent messages as history instead of passed history
    history = recentMessages || [];
    console.log(`Using sliding window of ${history.length} recent messages for session ${currentConversationId}`);
    
    // Note: User message will be saved to database after AI response is generated

    let aiResponse: string;

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
  
    
    // Check if user is authenticated but has no profile
    if (userId && !userProfile) {
      // Check if this is the first message by looking at conversation history
      const isFirstMessage = !history || history.length <=1;
      
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
    } else {
      // User has profile, generate AI response using Gemini
      
      // Check if this is a Financial Advisor request that might need goal tracking
      if (chatModel === AI_ROLES.FINANCIAL_ADVISOR && goalContext) {
        // Check if message contains goal-related keywords or patterns
        const goalKeywords = [
          /(?:saved?|add(?:ed)?|put in|deposit(?:ed)?|contributed?).*\$\d+/i,
          /(?:create|make|set up).*goal/i,
          /(?:how.*doing|show.*progress|analyze.*progress)/i,
          /(?:milestone|deadline|timeline|target date)/i,
          /(?:retirement|emergency|house|debt|invest)/i
        ];
        
        const hasGoalKeywords = goalKeywords.some(pattern => pattern.test(message));
        
        // If goal-related request, try goal tracking first
        if (hasGoalKeywords) {
          console.log('Attempting goal tracking for Financial Advisor request');
          
          try {
            const goalTrackingResult = await processGoalTrackingRequest(
              {
                message,
                userId: userId || '',
                goalContext,
                isGlobalMode: isGlobalMode || false,
                goalId,
                goal,
                conversationHistory: []
              },
              supabase,
              genAI
            );
            
            // If goal tracking was successful and a function was executed, return that response
            if (goalTrackingResult.function_executed) {
              console.log('Goal tracking function executed:', goalTrackingResult.function_executed);
              
              // Save both user and AI messages to database
              if (currentConversationId) {
                const messagesToInsert = [
                  {
                    chat_session_id: currentConversationId,
                    content: message,
                    role: 'user',
                    metadata: null,
                    timestamp: new Date().toISOString()
                  },
                  {
                    chat_session_id: currentConversationId,
                    content: goalTrackingResult.response,
                    role: 'assistant',
                    metadata: { 
                      function_executed: goalTrackingResult.function_executed,
                      function_result: goalTrackingResult.function_result 
                    },
                    timestamp: new Date().toISOString()
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
            }
            
            // If no function was executed but we got a response, fall through to normal processing
            console.log('Goal tracking processed but no function executed, continuing with normal flow');
          } catch (goalError) {
            console.error('Goal tracking error, falling back to normal processing:', goalError);
            // Fall through to normal processing
          }
        }
      }
      
      // Format conversation history for Gemini: support both {role, parts} and {role, content}
      const formattedHistory = (history || [])
        .filter((msg: any) => {
          // Accept only messages with valid text
          if (
            msg.parts &&
            Array.isArray(msg.parts) &&
            typeof msg.parts[0]?.text === "string" &&
            msg.parts[0].text.trim() !== ""
          )
            return true;
          if (typeof msg.content === "string" && msg.content.trim() !== "")
            return true;
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
        
      // Append the current user message
      const contents = [
        ...formattedHistory,
        {
          role: "user",
          parts: [{ text: message }],
        },
      ];
      
      // Initialize model with function calling for Financial Advisor if goals are available
      let model;
      
      if (chatModel === AI_ROLES.FINANCIAL_ADVISOR && goalContext) {
        // Add function calling capabilities for Financial Advisor with goals
        const functionDeclarations = getGeminiFunctionDeclarations();
        model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash-lite",
          tools: [{
            function_declarations: functionDeclarations
          }]
        });
        console.log('Financial Advisor model initialized with goal tracking functions');
      } else {
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      }
      const generationConfig = {
        responseMimeType: "text/plain",
        maxOutputTokens: 8000,
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
        systemInstruction = `${systemInstruction}\n\n=== USER'S CURRENT GOALS ===\n${JSON.stringify(goalContext, null, 2)}`;
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
      const MAX_ATTEMPTS = 5;

      // If JSON is incomplete, keep requesting more content
      while (!isJsonComplete(responseText) && attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`JSON incomplete, attempt ${attempts} to get more content`);

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
        if (isJsonComplete(responseText) || attempts >= MAX_ATTEMPTS) {
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
      console.log("wellFormedJsonString", wellFormedJsonString);
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
        console.log("No valid course JSON detected in AI response.");
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
    
    // Save both user and AI messages to database in a single batch for all users (authenticated and guests)
    if (currentConversationId) {
      const messagesToInsert = [
        {
          chat_session_id: currentConversationId,
          content: message,
          role: 'user',
          metadata: null,
          timestamp: new Date().toISOString()
        },
        {
          chat_session_id: currentConversationId,
          content: finalResponse,
          role: 'assistant',
          metadata: extractedCourse ? { courseRecommendation: extractedCourse } : null,
          timestamp: new Date().toISOString()
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Internal Server Error:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
