// supabase/functions/gemini-structured-stream/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { corsHeaders } from "../shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

if (!GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // No content
      headers: corsHeaders
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
      if (!rawBody || rawBody.trim() === '') {
        requestData = {};
      } else {
        requestData = JSON.parse(rawBody);
      }
      console.log('chat_stream rawBody:', rawBody);
      console.log('chat_stream requestData:', JSON.stringify(requestData));
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body", details: { rawBody } }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { message, history } = requestData;
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Inject system prompt from env.AI_PROMPT as first message in history
    const AI_PROMPT = Deno.env.get("AI_PROMPT");
    // Format conversation history for Gemini: support both {role, parts} and {role, content}
    const formattedHistory = (history || [])
      .filter((msg: any) => {
        // Accept only messages with valid text
        if (msg.parts && Array.isArray(msg.parts) && typeof msg.parts[0]?.text === "string" && msg.parts[0].text.trim() !== "") return true;
        if (typeof msg.content === "string" && msg.content.trim() !== "") return true;
        return false;
      })
      .map((msg: any) => {
        if (msg.parts && Array.isArray(msg.parts) && typeof msg.parts[0]?.text === "string") {
          // Already Gemini format, just fix role if needed
          return {
            role: msg.role === "assistant" ? "model" : msg.role,
            parts: msg.parts
          };
        }
        // Legacy: convert from { role, content }
        return {
          role: msg.role === "assistant" ? "model" : msg.role,
          parts: [{ text: msg.content }]
        };
      });
    // Append the current user message
    const contents = [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];
    // Log the final contents sent to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const generationConfig = {
      responseMimeType: "text/plain",
      maxOutputTokens: 4000,
    };
    // Helper function to check if JSON is complete
    function isJsonComplete(text: string): boolean {
      // If we find ```json but don't find a closing ```, it's incomplete
      const jsonStart = text.indexOf('```json');
      if (jsonStart === -1) return true; // No JSON code block found, considered complete
      
      // Look for closing ``` after the start of ```json
      const jsonEnd = text.indexOf('```', jsonStart + 7);
      return jsonEnd !== -1;
    }
    
    // Initial generation
    let result = await model.generateContent({
      contents,
      systemInstruction: AI_PROMPT,
    }, generationConfig);
    
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
          parts: [{ text: responseText }]
        },
        {
          role: "user",
          parts: [{ text: "Please continue and send the rest of the JSON code block without any additional text." }]
        }
      ];
      
      // Generate continuation
      const continuationResult = await model.generateContent({
        contents: continuationContents,
        systemInstruction: AI_PROMPT,
      }, generationConfig);
      
      // Append continuation to response
      const continuationText = continuationResult.response.text();
      responseText += "\n" + continuationText;
      
      // If the combined response now has complete JSON, or we've reached max attempts, exit
      if (isJsonComplete(responseText) || attempts >= MAX_ATTEMPTS) {
        break;
      }
    }
    
    // Clean up the response - if we have multiple ```json markers from continuations, fix it
    let cleanedResponse = responseText;
    const jsonStartMarker = '```json';
    const firstJsonStart = cleanedResponse.indexOf(jsonStartMarker);
    
    if (firstJsonStart !== -1) {
      // Find duplicate ```json markers after the first one
      let restOfString = cleanedResponse.substring(firstJsonStart + jsonStartMarker.length);
      restOfString = restOfString.replace(/```json/g, '');
      
      // Remove any extra closing ``` markers except the last one
      const lastClosingMarker = restOfString.lastIndexOf('```');
      if (lastClosingMarker !== -1) {
        const beforeLast = restOfString.substring(0, lastClosingMarker);
        const afterLast = restOfString.substring(lastClosingMarker);
        restOfString = beforeLast.replace(/```/g, '') + afterLast;
      }
      
      cleanedResponse = cleanedResponse.substring(0, firstJsonStart) + jsonStartMarker + restOfString;
    }
    
    return new Response(JSON.stringify({ response: cleanedResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
