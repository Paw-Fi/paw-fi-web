// supabase/functions/fa-chat/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.11.0";
import { corsHeaders } from "../shared/cors.ts";
import { prompt } from "./prompt.ts";

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

    const { message, history, userProfile } = requestData;
    console.log("requestData", requestData);

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format conversation history for Gemini
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

    // Build the system instruction with user profile if provided
    let systemInstruction = prompt;
    if (userProfile) {
      systemInstruction += `\n\nUser's Financial Health Profile:\n${JSON.stringify(userProfile, null, 2)}`;
    }

    // Prepare content for the AI
    const contents = [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const generationConfig = {
      maxOutputTokens: 2048,
      temperature: 0.7,
    };

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await model.generateContentStream(
            {
              contents,
              systemInstruction,
            },
            generationConfig,
          );

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const data = `data: ${JSON.stringify({ content: text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          // Send the final completion marker
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown streaming error";
          console.error("Streaming Error:", errorMessage);
          
          const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
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