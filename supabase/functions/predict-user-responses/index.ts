// supabase/functions/gemini-structured-stream/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.11.0";
import { corsHeaders } from "../shared/cors.ts";
import { CHAT_SUGGESTION_PROMPT_INSTRUCTIONS } from "./prompt.ts";

// We'll define the AI_PROMPT directly in this file for clarity
// or you could keep it in a separate prompt.ts if preferred.

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY"); // Using GEMINI_API_KEY as per your original file
if (!GEMINI_API_KEY) {
  console.error(
    "CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.",
  );
  // In a production environment, you might want to throw an error or exit here.
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
    const { message, history } = requestData;
    console.log("requestData", requestData)

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format conversation history for Gemini (if you decide to use it for context)
    const formattedHistory = (history || [])
      .filter((msg: any) => {
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
          return {
            role: msg.role === "assistant" ? "model" : msg.role,
            parts: msg.parts,
          };
        }
        return {
          role: msg.role === "assistant" ? "model" : msg.role,
          parts: [{ text: msg.content }],
        };
      });

    // Append the current user message as the final piece of content for the AI to analyze
    const contents = [
      ...formattedHistory, // Include history if it helps the AI understand context
      {
        role: "user",
        parts: [{ text: `User Message: "${message}"` }], // Frame the user's message clearly
      },
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const generationConfig = {
      responseMimeType: "text/plain", // We expect plain text containing JSON
      maxOutputTokens: 500, // Reduced max tokens as suggestions are short
    };

    // --- Direct Generation Call (no continuation loop) ---
    const result = await model.generateContent(
      {
        contents,
        systemInstruction: CHAT_SUGGESTION_PROMPT_INSTRUCTIONS,
      },
      generationConfig,
    );

    // --- Core Logic for Chat Suggestions ---
    let responseText = result.response.text();
    let finalResponsePayload: string[];
    
    try {
      // First try to parse as direct JSON
      finalResponsePayload = JSON.parse(responseText);
    } catch (directParseError) {
      try {
        // If that fails, try to extract JSON from markdown code blocks
        const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
        const match = responseText.match(jsonBlockRegex);
        
        if (match && match[1]) {
          finalResponsePayload = JSON.parse(match[1].trim());
        } else {
          // If no markdown block found, try to find raw JSON array in the text
          const arrayRegex = /\[([\s\S]*?)\]/;
          const arrayMatch = responseText.match(arrayRegex);
          
          if (arrayMatch) {
            finalResponsePayload = JSON.parse(arrayMatch[0]);
          } else {
            throw new Error("No valid JSON found in response");
          }
        }
      } catch (extractError) {
        console.warn("Failed to parse AI response as JSON:", responseText);
        // Use fallback suggestions
        finalResponsePayload = [
          "How can I grow my money?",
          "What are some ways to earn passive income?",
          "How can I learn about investing?"
        ];
      }
    }
    // --- End Core Logic ---

    // Return the final AI-generated (or fallback) JSON response
    return new Response(JSON.stringify(finalResponsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

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