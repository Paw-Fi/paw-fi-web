// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { corsHeaders } from '../shared/cors.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  // Handle CORS preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { userId, courseId, lessonId } = await req.json();
    
    // Validate required parameters
    if (!userId || !courseId || !lessonId) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameters: userId, courseId, and lessonId are required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch the course to get all lessons
    const { data: course, error: courseError } = await supabase
      .from("user_courses")
      .select("*")
      .eq("id", courseId)
      .eq("user_id", userId)
      .single();

    if (courseError) {
      console.error("[unlock-next-lesson] Error fetching course:", courseError);
      throw courseError;
    }

    if (!course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch all lessons for this course
    const { data: lessons, error: lessonError } = await supabase
      .from("user_lessons")
      .select("*")
      .eq("course_id", courseId)

    if (lessonError) {
      console.error("[unlock-next-lesson] Error fetching lessons:", lessonError);
      throw lessonError;
    }

    if (!lessons || lessons.length === 0) {
      return new Response(JSON.stringify({ error: "No lessons found for this course" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Find the current lesson's index
    const currentLessonIndex = lessons.findIndex((lesson: any) => lesson.id === lessonId);
    console.log(`[unlock-next-lesson] Found lesson at index: ${currentLessonIndex}`);

    // 4. Check if there's a next lesson to unlock
    if (currentLessonIndex === -1 || currentLessonIndex >= lessons.length - 1) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Cannot unlock next lesson: either current lesson not found or it is the last lesson" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Get the next lesson
    const nextLesson = lessons[currentLessonIndex + 1];
    console.log(`[unlock-next-lesson] Next lesson to unlock: ${nextLesson.title} (ID: ${nextLesson.id})`);

    // 6. Check if it's already unlocked
    if (nextLesson.unlocked) {
      console.log('[unlock-next-lesson] Next lesson is already unlocked');
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Next lesson is already unlocked",
        nextLessonId: nextLesson.id
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Unlock the next lesson
    const { data: updateResult, error: updateError } = await supabase
      .from("user_lessons")
      .update({ unlocked: true })
      .eq("id", nextLesson.id)
      .select();

    if (updateError) {
      console.error("[unlock-next-lesson] Error unlocking next lesson:", updateError);
      throw updateError;
    }

    console.log(`[unlock-next-lesson] Successfully unlocked next lesson: ${nextLesson.title}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully unlocked next lesson: ${nextLesson.title}`,
      nextLessonId: nextLesson.id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[unlock-next-lesson] Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
