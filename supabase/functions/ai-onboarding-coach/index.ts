import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { corsHeaders } from "../shared/cors.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not set in Supabase Edge Function secrets.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

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
    const requestData = await req.json();
    const { message, isFirstMessage = false, withWelcomeAndResponse = false } = requestData;

    if (!message && !isFirstMessage && !withWelcomeAndResponse) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const welcomeMessage = `### Hey! I'm Moneko—your AI money coach 👋

I know that talking about money can feel overwhelming, but you're in a safe, judgment-free space. My entire purpose is to help you feel clear and confident about your financial future, one step at a time

### Here's how it works:
- 1. **Tell me your goal** - Share what you're saving for
- 2. **Quick financial snapshot** - I'll get to know your situation  
- 3. **Personalized plan** - I'll build a strategy just for you

**Ready to get started?** Just tell me what financial goal you'd like to work on!`;

    // Handle special case: return both welcome message and response to user message
    if (withWelcomeAndResponse && message) {
      // Process user's goal using Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const generationConfig = {
        responseMimeType: "text/plain",
        maxOutputTokens: 1000,
      };

      const result = await model.generateContent(
        {
          contents: [
            {
              role: "user",
              parts: [{ text: message }],
            },
          ],
          systemInstruction: SYSTEM_PROMPT,
        },
        generationConfig,
      );

      const aiResponse = result.response.text();

      return new Response(
        JSON.stringify({ 
          welcome: welcomeMessage,
          response: aiResponse,
          coach: "moneko"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let aiResponse: string;

    // Handle first message - welcome message only
    if (isFirstMessage || !message) {
      aiResponse = welcomeMessage;
    } else {
      // Process user's goal using Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const generationConfig = {
        responseMimeType: "text/plain",
        maxOutputTokens: 1000,
      };

      const result = await model.generateContent(
        {
          contents: [
            {
              role: "user",
              parts: [{ text: message }],
            },
          ],
          systemInstruction: SYSTEM_PROMPT,
        },
        generationConfig,
      );

      aiResponse = result.response.text();
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        coach: "moneko"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown internal server error";
    console.error("Internal Server Error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});