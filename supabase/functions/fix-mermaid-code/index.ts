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

const AI_PROMPT = `You will be given a piece of Mermaid code that may contain syntax errors or stylistic inconsistencies. Your task is to fix the code and return a valid, well-formed, and complete Mermaid code block.

Follow these specific rules for the correction:

1.  **Diagram Definition:** The code must begin with a valid diagram definition (e.g., \`graph TD\`, \`flowchart LR\`). Remove any extraneous text before it.

2.  **Node Syntax:**
    * **Shape:** Standardize all nodes to use rounded corners. All node text must be enclosed in parentheses and double quotes. Example: \`nodeId("Display Text")\`.
    * **IDs:** Ensure node IDs are simple alphanumeric strings without spaces or special characters (e.g., \`nodeA\`, \`process1\`).

3.  **Link/Edge Syntax:** Use only valid link styles. The standard arrow is \`-->\`. For text on a link, use the format \`-- "link text" -->\`.

4.  **Structural Integrity:**
    * **Subgraphs:** Ensure any \`subgraph\` is correctly formatted with a title and is properly closed with an \`end\` statement.
    * **Ordering:** Define all nodes, edges, and subgraphs first. Place all styling commands (like \`style\`, \`classDef\`, \`linkStyle\`) at the end of the code block.

5.  **Comments:** Preserve any existing comments, which start with \`%%\`.

Your entire response must be ONLY the corrected, complete Mermaid code block. Do not include markdown language specifiers (like \`\`\`mermaid), explanations, greetings, or any other text before or after the code.

Here is the code:`


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

    const { mermaidCode, questionId, imageOptionId } = requestData;

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

    // Update the database with the fixed code if questionId and imageOptionId are provided
    let databaseUpdated = false;
    if (questionId && imageOptionId) {
      try {
        // First, fetch the current question to get the existing image_options
        const { data: currentQuestion, error: fetchError } = await supabaseClient
          .from('user_questions')
          .select('image_options')
          .eq('id', questionId)
          .single();

        if (fetchError) {
          console.error('Error fetching current question:', fetchError);
          // Don't fail the entire request, just log the error
        } else if (currentQuestion && currentQuestion.image_options) {
          // Update the specific imagePrompt in the image_options array
          const updatedImageOptions = currentQuestion.image_options.map((option: any) => {
            if (option.id === imageOptionId) {
              return {
                ...option,
                imagePrompt: fixedCode
              };
            }
            return option;
          });

          // Update the question with the modified image_options
          const { error: updateError } = await supabaseClient
            .from('user_questions')
            .update({ 
              image_options: updatedImageOptions,
              updated_at: new Date().toISOString()
            })
            .eq('id', questionId);

          if (updateError) {
            console.error('Error updating database:', updateError);
            // Don't fail the entire request, just log the error
          } else {
            console.log(`Successfully updated imagePrompt for option ${imageOptionId} in question ${questionId}`);
            databaseUpdated = true;
          }
        }
      } catch (dbError) {
        console.error('Database update error:', dbError);
        // Don't fail the entire request, just log the error
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fixedCode: fixedCode,
        questionId: questionId || null,
        databaseUpdated: databaseUpdated,
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