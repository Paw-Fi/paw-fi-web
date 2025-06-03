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

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch all user_courses
    const { data: courses, error: courseError } = await supabase
      .from("user_courses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (courseError) throw courseError;

    // 2. Fetch all user_lessons for these courses
    const courseIds = courses.map((course: any) => course.id);
    const { data: lessons, error: lessonError } = await supabase
      .from("user_lessons")
      .select("*")
      .in("course_id", courseIds);

    if (lessonError) throw lessonError;

    // 3. Fetch all user_questions for these lessons
    const lessonIds = lessons.map((lesson: any) => lesson.id);
    const { data: questions, error: questionError } = await supabase
      .from("user_questions")
      .select("*")
      .in("lesson_id", lessonIds);

    if (questionError) throw questionError;

    // 4. Fetch all user_tutorials for these lessons
    const tutorialLessonIds = lessons.map((lesson: any) => lesson.id);
    console.log("[get-user-courses] Lesson IDs for tutorials:", tutorialLessonIds);
    
    const { data: tutorials, error: tutorialError } = await supabase
      .from("user_tutorials")
      .select("*")
      .in("lesson_id", tutorialLessonIds);

    if (tutorialError) {
      console.error("[get-user-courses] Error fetching tutorials:", tutorialError);
      throw tutorialError;
    }
    
    console.log(`[get-user-courses] Tutorials fetched: ${tutorials?.length || 0}`);
    if (tutorials && tutorials.length > 0) {
      console.log("[get-user-courses] Sample tutorial:", tutorials[0]);
    }

    // 5. Assemble structure
    const lessonsByCourse = new Map();
    for (const lesson of lessons) {
      if (!lessonsByCourse.has(lesson.course_id)) lessonsByCourse.set(lesson.course_id, []);
      lessonsByCourse.get(lesson.course_id).push(lesson);
    }

    const tutorialsByLesson = new Map();
    for (const tutorial of tutorials) {
      if (!tutorialsByLesson.has(tutorial.lesson_id)) tutorialsByLesson.set(tutorial.lesson_id, []);
      tutorialsByLesson.get(tutorial.lesson_id).push(tutorial);
    }
    
    console.log("[get-user-courses] Tutorial map size:", tutorialsByLesson.size);
    console.log("[get-user-courses] Lesson IDs with tutorials:", Array.from(tutorialsByLesson.keys()));
    
    const questionsByLesson = new Map();
    for (const question of questions) {
      if (!questionsByLesson.has(question.lesson_id)) questionsByLesson.set(question.lesson_id, []);
      questionsByLesson.get(question.lesson_id).push(question);
    }

    const result = Array.isArray(courses)
      ? courses.map((course: any) => {
          const courseLessons = (lessonsByCourse.get(course.id) || []).map((lesson: any) => {
            const lessonTutorials = tutorialsByLesson.get(lesson.id) || [];
            const lessonQuestions = questionsByLesson.get(lesson.id) || [];
            
            console.log(`[get-user-courses] Lesson ${lesson.id} has ${lessonTutorials.length} tutorials and ${lessonQuestions.length} questions`);
            
            return {
              ...lesson,
              tutorials: lessonTutorials,
              questions: lessonQuestions,
            };
          });
          return {
            ...course,
            lessons: courseLessons,
          };
        })
      : [];
      
    if (result.length > 0) {
      console.log("[get-user-courses] First course structure (truncated):", 
        JSON.stringify({
          id: result[0].id,
          title: result[0].title,
          lessons: result[0].lessons.map((l: any) => ({
            id: l.id,
            title: l.title,
            tutorialsCount: l.tutorials?.length || 0,
            questionsCount: l.questions?.length || 0
          }))
        }, null, 2));
    }

    return new Response(JSON.stringify({ courses: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});