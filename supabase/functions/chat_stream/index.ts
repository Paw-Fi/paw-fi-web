// supabase/functions/gemini-structured-stream/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { corsHeaders } from "../shared/cors.ts";
import { parse } from "https://esm.sh/partial-json@0.1.7";
import { tryExtractCourseJson } from "./utils.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AI_PROMPT } from "./prompt.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error(
    "CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.",
  );
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

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
    const { message, userProfile, userId, conversationId, model: chatModel } = requestData;
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
    const { data: recentMessages, error: fetchError } = await supabase
      .from('chat_messages')
      .select('content, role')
      .eq('chat_session_id', currentConversationId)
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
    
    // Check if user is authenticated but has no profile
    if (userId && !userProfile) {
      // Check if this is the first message by looking at conversation history
      const isFirstMessage = !history || history.length <=1;
      
      if (isFirstMessage) {
        // First message - welcome message
        aiResponse = "Hi {{username}}! I'm ready to help you build a clear path to your financial goals.\n\nTo begin, please complete your financial health assessment by clicking the ``QUESTIONNAIRE`` button below. Your answers will allow me to create a truly personalized plan that's right for you.";
      } else {
        // Has conversation history - encourage completing assessment
        aiResponse = "To provide you with the most personalized financial guidance, I recommend completing your financial health assessment. Click the ``QUESTIONNAIRE`` button below to get started and unlock tailored advice for your unique situation.";
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
      
      // Log the final contents sent to Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const generationConfig = {
        responseMimeType: "text/plain",
        maxOutputTokens: 4000,
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

      // Construct system instruction with user profile if available
      let systemInstruction = AI_PROMPT;
      if (userProfile) {
        systemInstruction = `${AI_PROMPT}\n\n${userProfile}`;
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
      // --- Course Extraction & Async Storage ---
      // Attempt to extract a valid course object using Zod
      const extractedCourse = wellFormedJsonString
      if (extractedCourse) {
        // Fire-and-forget async storage
        (async () => {
          try {
            // Replace with actual user_id extraction if available
            const user_id = requestData.userId || null;
            if (!user_id) {
              console.error("No user_id provided for course storage.");
              return;
            }
            // Ensure course is an object, not a string
            let parsedCourse;
            try {
              parsedCourse = typeof extractedCourse === "string" ? JSON.parse(extractedCourse) : extractedCourse;
            } catch (err) {
              console.error("Failed to parse extractedCourse as JSON", err);
              return;
            }
            const client = createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            );
            const { error } = await client.functions.invoke(
              "store-course-from-ai",
              {
                body: { user_id, course: parsedCourse },
              },
            );
            if (error) {
              console.error("Error invoking store-course-from-ai:", error);
            }
          } catch (err) {
            console.error("Async course storage error:", err);
          }
        })();
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
        generatedLessons: extractedCourse
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
