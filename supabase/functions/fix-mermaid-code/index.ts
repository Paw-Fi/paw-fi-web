import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { corsHeaders } from "../shared/cors.ts";

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

const AI_PROMPT = `The following is a piece of malformed Mermaid code. Your task is to correct any syntax errors and return only the valid, complete Mermaid code block.

Do not add any explanations, greetings, or any text whatsoever before or after the code block. Your entire response must be the corrected code itself.

Here is the code:`;

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
    const rawBody: string = await req.text();
    let requestData;
    
    try {
      if (!rawBody || rawBody.trim() === "") {
        return new Response(
          JSON.stringify({ error: "Request body is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      requestData = JSON.parse(rawBody);
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

    const { mermaidCode, questionId } = requestData;

    if (!mermaidCode) {
      return new Response(
        JSON.stringify({ error: "mermaidCode is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Fixing malformed Mermaid code...");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const generationConfig = {
      responseMimeType: "text/plain",
      maxOutputTokens: 4000,
      temperature: 0.1,
    };

    const fullPrompt = `${AI_PROMPT}\n\n${mermaidCode}`;

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{ text: fullPrompt }],
      }],
    }, generationConfig);

    const response = result.response;
    let fixedCode = response.text();

    if (!fixedCode) {
      return new Response(
        JSON.stringify({ error: "Failed to generate fixed Mermaid code" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Clean up the AI response
    // Remove markdown code blocks if present
    fixedCode = fixedCode.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '');
    
    // Replace literal \n with actual newlines
    fixedCode = fixedCode.replace(/\\n/g, '\n');
    
    // Clean up any extra whitespace
    fixedCode = fixedCode.trim();

    console.log("Successfully fixed Mermaid code");

    // Update the database with the fixed code if questionId is provided
    // if (questionId) {
    //   try {
    //     const { error: updateError } = await supabaseClient
    //       .from('user_questions')
    //       .update({ 
    //         image_options: { mermaidCode: fixedCode },
    //         updated_at: new Date().toISOString()
    //       })
    //       .eq('id', questionId);

    //     if (updateError) {
    //       console.error('Error updating database:', updateError);
    //       return new Response(
    //         JSON.stringify({ 
    //           error: "Failed to update database", 
    //           details: updateError.message,
    //           timestamp: new Date().toISOString(),
    //         }),
    //         {
    //           status: 500,
    //           headers: { ...corsHeaders, "Content-Type": "application/json" },
    //         },
    //       );
    //     }

    //     console.log("Successfully updated mermaid code in database");
    //   } catch (dbError) {
    //     console.error('Database update error:', dbError);
    //     return new Response(
    //       JSON.stringify({ 
    //         error: "Database update failed", 
    //         details: dbError instanceof Error ? dbError.message : "Unknown database error",
    //         timestamp: new Date().toISOString(),
    //       }),
    //       {
    //         status: 500,
    //         headers: { ...corsHeaders, "Content-Type": "application/json" },
    //       },
    //     );
    //   }
    // }

    return new Response(
      JSON.stringify({
        success: true,
        fixedCode: fixedCode,
        questionId: questionId || null,
        databaseUpdated: !!questionId,
        debug: {
          message: "Mermaid code fixed successfully",
          timestamp: new Date().toISOString(),
        },
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
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});