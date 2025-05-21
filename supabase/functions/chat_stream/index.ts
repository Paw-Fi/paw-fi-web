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
    console.log("Final contents sent to Gemini:", JSON.stringify(contents, null, 2));
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const generationConfig = {
      responseMimeType: "text/plain",
      maxOutputTokens: 4000,
    };
    const result = await model.generateContent({
      contents,
      systemInstruction: AI_PROMPT,
    }, generationConfig);
    const text = result.response.text();
    return new Response(JSON.stringify({ response: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
